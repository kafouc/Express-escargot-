/** Écran de jeu : chargement des niveaux, entrées tactiles/souris, interface, réglages. */
import type { Level } from '../core/types.ts';
import { cellRC } from '../core/grid.ts';
import { applyHint, blockReason, createGame, head, isWon, moveTo, nextWaypoint, progress, reset, truncateAt, type Game } from './rules.ts';
import { cellAt, computeLayout, createRenderState, render, resetMotion, type Layout } from './render.ts';
import { CHARACTERS, LEAF_COLORS, characterById, drawCharacter, isUnlocked, leafColorById, type Character } from './characters.ts';
import { load, save } from './storage.ts';
import { GAME_NAME, detectLanguage, getLanguage, locale, plural, setLanguage, t, translateDom, type Key, type Lang } from './i18n.ts';
import { Feedback } from './feedback.ts';
import { buildShareText, currentStreak, formatTime, shareText } from './daily.ts';
import { StubAnalytics } from '../analytics/track.ts';
import { FREE_HINTS_PER_LEVEL, SKIP_OFFER_AFTER_MS, StubAds, shouldShowInterstitial, type Ads } from '../monetization/ads.ts';

type Mode = 'campaign' | 'daily';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = $<HTMLCanvasElement>('board');
const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
const ui = {
  gameName: $('game-name'),
  tabCampaign: $<HTMLButtonElement>('tab-campaign'),
  tabDaily: $<HTMLButtonElement>('tab-daily'),
  prev: $<HTMLButtonElement>('prev'),
  next: $<HTMLButtonElement>('next'),
  label: $('level-label'),
  meta: $('level-meta'),
  timerWrap: $('timer-wrap'),
  timer: $('timer'),
  progress: $('progress'),
  message: $('message'),
  reset: $<HTMLButtonElement>('reset'),
  hint: $<HTMLButtonElement>('hint'),
  hintLabel: $('hint-label'),
  skip: $<HTMLButtonElement>('skip'),
  win: $('win'),
  winTitle: $('win-title'),
  winText: $('win-text'),
  winStreak: $('win-streak'),
  winShare: $<HTMLButtonElement>('win-share'),
  winNext: $<HTMLButtonElement>('win-next'),
  toast: $('toast'),
  settingsOpen: $<HTMLButtonElement>('settings-open'),
  settings: $('settings'),
  settingsClose: $<HTMLButtonElement>('settings-close'),
  characterList: $('character-list'),
  leafList: $('leaf-list'),
  previewCanvas: $<HTMLCanvasElement>('preview'),
  logo: $<HTMLCanvasElement>('logo'),
  winArt: $<HTMLCanvasElement>('win-art'),
  optSound: $<HTMLInputElement>('opt-sound'),
  optVibration: $<HTMLInputElement>('opt-vibration'),
  optTimer: $<HTMLInputElement>('opt-timer'),
  langFr: $<HTMLButtonElement>('lang-fr'),
  langEn: $<HTMLButtonElement>('lang-en'),
};

const params = new URLSearchParams(location.search);
/** `?all=1` débloque tous les niveaux et animaux (tests). */
const unlockAll = params.has('all');
/** `?fast=1` propose « Passer ce niveau » au bout de 5 s au lieu de 3 min (tests). */
const skipAfterMs = params.has('fast') ? 5_000 : SKIP_OFFER_AFTER_MS;

const saveData = load();
setLanguage(saveData.language || detectLanguage());

// ---------- Services : analytics, pubs, sons ----------

const analytics = new StubAnalytics();
// Accessible depuis la console du navigateur : __analytics.events
(window as unknown as { __analytics: StubAnalytics }).__analytics = analytics;
const ads: Ads = new StubAds(analytics, (placement) => toast(t('ad.simulated', { placement: t(`ad.${placement}` as Key) })));
const feedback = new Feedback({ sound: saveData.sound, vibration: saveData.vibration });

let sessionStartedAt = performance.now();
analytics.track('session_start');
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    analytics.track('session_end', { duration_s: Math.round((performance.now() - sessionStartedAt) / 1000) });
  } else {
    sessionStartedAt = performance.now();
    analytics.track('session_start');
  }
});

// ---------- État ----------

let campaign: Level[] = [];
let daily: Record<string, Level> | null = null;
let dailyDates: string[] = [];
let mode: Mode = 'campaign';
let index = 0;
let dailyDate = '';
let game: Game | undefined;
let layout: Layout;
const renderState = createRenderState(characterById(saveData.character), leafColorById(saveData.leafColor));
renderState.onArrive = (_cell, isWaypoint) => (isWaypoint ? feedback.leaf() : feedback.step());
let startedAt = 0;
let finishedSeconds: number | null = null;
let hintsUsed = 0;
let dragging = false;
/** Le niveau en cours a été clos (gagné, passé) : pas de `level_fail` en le quittant. */
let levelClosed = false;
let campaignWinsSinceInterstitial = 0;
let lastInterstitialAt = -Infinity;
let toastTimer = 0;

// ---------- Utilitaires ----------

async function loadCampaign(): Promise<void> {
  const module = await import('../../levels/campaign.json');
  campaign = module.default as unknown as Level[];
}

async function loadDaily(): Promise<Record<string, Level>> {
  if (!daily) {
    const module = await import('../../levels/daily.json');
    daily = module.default as unknown as Record<string, Level>;
    dailyDates = Object.keys(daily).sort();
  }
  return daily;
}

const todayUtc = () => new Date().toISOString().slice(0, 10);

function formatDate(iso: string, capitalize = true): string {
  const text = new Date(`${iso}T12:00:00Z`).toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long' });
  return capitalize ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

function setMessage(text: string, warn = false): void {
  ui.message.textContent = text;
  ui.message.classList.toggle('warn', warn);
}

function toast(text: string): void {
  ui.toast.textContent = text;
  ui.toast.classList.remove('hidden');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => ui.toast.classList.add('hidden'), 2200);
}

const shareUrl = () => `${location.origin}${location.pathname}`;

// ---------- Partie ----------

/** Si le niveau quitté avait été commencé sans être fini, on le compte comme abandonné. */
function closeCurrentLevel(reason: 'quit' | 'reset'): void {
  if (!game || levelClosed || startedAt === 0) return;
  analytics.track('level_fail', {
    level_id: game.level.id,
    mode,
    time_s: Math.round((performance.now() - startedAt) / 100) / 10,
    reason,
  });
}

function startLevel(level: Level): void {
  closeCurrentLevel('quit');
  game = createGame(level);
  startedAt = 0;
  finishedSeconds = null;
  hintsUsed = 0;
  levelClosed = false;
  resetMotion(renderState);
  ui.win.classList.add('hidden');
  ui.skip.classList.add('hidden');
  resize();
  updateUi();
  setMessage(mode === 'campaign' && index < 3 ? t('msg.tutorial') : '');
  analytics.track('level_start', { level_id: level.id, mode, size: level.size });
}

function openCampaignLevel(i: number): void {
  mode = 'campaign';
  index = Math.max(0, Math.min(i, campaign.length - 1));
  saveData.current = index + 1;
  save(saveData);
  startLevel(campaign[index] as Level);
}

async function openDaily(): Promise<void> {
  mode = 'daily';
  setMessage(t('msg.loading'));
  const all = await loadDaily();
  const today = todayUtc();
  dailyDate = all[today] ? today : (dailyDates.find((d) => d >= today) ?? (dailyDates[dailyDates.length - 1] as string));
  startLevel(all[dailyDate] as Level);
  if (dailyDate !== today) setMessage(t('msg.dailyPreview', { date: formatDate(dailyDate, getLanguage() === 'en') }));
  else if (saveData.dailyResults[dailyDate]) setMessage(t('msg.dailyDone'));
}

function updateHintLabel(): void {
  ui.hintLabel.textContent = t(hintsUsed < FREE_HINTS_PER_LEVEL ? 'btn.hint' : 'btn.hintAd');
}

function updateUi(): void {
  if (!game) return;
  const level = game.level;
  const isCampaign = mode === 'campaign';
  ui.gameName.textContent = GAME_NAME[getLanguage()];
  ui.tabCampaign.classList.toggle('active', isCampaign);
  ui.tabDaily.classList.toggle('active', !isCampaign);
  ui.tabCampaign.setAttribute('aria-selected', String(isCampaign));
  ui.tabDaily.setAttribute('aria-selected', String(!isCampaign));
  ui.prev.style.visibility = isCampaign ? 'visible' : 'hidden';
  ui.next.style.visibility = isCampaign ? 'visible' : 'hidden';
  if (isCampaign) {
    ui.label.textContent = t('level.label', { n: index + 1, total: campaign.length });
    ui.prev.disabled = index === 0;
    ui.next.disabled = index >= campaign.length - 1 || (!unlockAll && index + 1 >= saveData.unlocked);
  } else {
    ui.label.textContent = formatDate(dailyDate);
  }
  const best = saveData.best[level.id];
  ui.meta.textContent = t('level.meta', { size: level.size, leaves: level.waypoints.length }) + (best ? t('level.record', { time: formatTime(best) }) : '');
  ui.progress.textContent = `${Math.round(progress(game) * 100)} %`;
  ui.timerWrap.style.visibility = saveData.showTimer ? 'visible' : 'hidden';
  updateHintLabel();
}

function onWin(): void {
  if (!game) return;
  finishedSeconds = (performance.now() - startedAt) / 1000;
  levelClosed = true;
  renderState.winAt = performance.now();
  feedback.win();
  ui.skip.classList.add('hidden');
  const id = game.level.id;
  analytics.track('level_complete', { level_id: id, mode, time_s: Math.round(finishedSeconds * 10) / 10, hints_used: hintsUsed });

  const previous = saveData.best[id];
  const record = hintsUsed === 0 && (previous === undefined || finishedSeconds < previous);
  if (record) saveData.best[id] = finishedSeconds;

  if (mode === 'campaign') {
    saveData.unlocked = Math.max(saveData.unlocked, Math.min(index + 2, campaign.length));
    campaignWinsSinceInterstitial++;
    ui.winTitle.textContent = t('win.title');
    ui.winNext.textContent = t(index < campaign.length - 1 ? 'btn.next' : 'btn.replay');
    ui.winStreak.classList.add('hidden');
  } else {
    if (!saveData.dailyDone.includes(dailyDate)) saveData.dailyDone.push(dailyDate);
    // Résultat officiel : uniquement le premier succès du jour.
    saveData.dailyResults[dailyDate] ??= { seconds: finishedSeconds, hints: hintsUsed };
    ui.winTitle.textContent = t('win.dailyTitle');
    ui.winNext.textContent = t('btn.backCampaign');
    ui.winStreak.textContent = plural(currentStreak(saveData.dailyDone, dailyDate), 'win.streakOne', 'win.streakMany');
    ui.winStreak.classList.remove('hidden');
  }
  save(saveData);
  const hintText = hintsUsed > 0 ? plural(hintsUsed, 'win.hintsOne', 'win.hintsMany') : '';
  ui.winText.textContent = t('win.time', { time: formatTime(finishedSeconds) }) + hintText + (record && previous !== undefined ? t('win.record') : '');
  setTimeout(() => ui.win.classList.remove('hidden'), 900);
  updateUi();
}

const BLOCK_MESSAGES: Record<string, (g: Game) => string> = {
  wall: () => t('msg.wall'),
  order: (g) => t('msg.order', { n: nextWaypoint(g) }),
  'end-too-early': () => t('msg.endTooEarly'),
  visited: () => t('msg.visited'),
};

/** Applique un déplacement et gère les retours. Renvoie false si le geste doit s'arrêter. */
function step(cell: number): boolean {
  if (!game || finishedSeconds !== null) return false;
  const before = head(game);
  const reason = before !== undefined ? blockReason(game, cell) : null;
  const result = moveTo(game, cell);
  if (result === 'blocked') {
    renderState.shakeAt = performance.now();
    setMessage(BLOCK_MESSAGES[reason ?? '']?.(game) ?? '', true);
    feedback.blocked();
    return false;
  }
  if (result === 'ignored') return false;
  if (result === 'started' && startedAt === 0) startedAt = performance.now();
  if (result === 'extended') {
    if ((game.puzzle.waypointAt[cell] ?? 0) !== 0) feedback.leafHaptic();
    else feedback.stepHaptic();
  }
  if (ui.message.classList.contains('warn')) setMessage('');
  updateUi();
  if (isWon(game)) {
    onWin();
    return false;
  }
  return true;
}

/** Fait avancer la tête case par case vers `target` (un glissement rapide peut sauter des cases). */
function stepToward(target: number): void {
  if (!game) return;
  const size = game.puzzle.size;
  for (let guard = 0; guard < size * 2; guard++) {
    const h = head(game);
    if (h === undefined || h === target) return;
    const [hr, hc] = cellRC(size, h);
    const [tr, tc] = cellRC(size, target);
    const dr = tr - hr;
    const dc = tc - hc;
    const next = Math.abs(dr) >= Math.abs(dc) ? (hr + Math.sign(dr)) * size + hc : hr * size + hc + Math.sign(dc);
    if (!step(next)) return;
  }
}

// ---------- Entrées sur le plateau ----------

function pointerCell(event: PointerEvent): number {
  if (!game) return -1;
  const rect = canvas.getBoundingClientRect();
  return cellAt(layout, game.puzzle.size, event.clientX - rect.left, event.clientY - rect.top);
}

canvas.addEventListener('pointerdown', (event) => {
  feedback.unlock();
  if (!game || finishedSeconds !== null) return;
  const cell = pointerCell(event);
  if (cell < 0) return;
  if (game.path.length === 0) {
    if (!step(cell)) {
      setMessage(t('msg.startOnOne'), true);
      renderState.shakeAt = performance.now();
      return;
    }
  } else if (cell !== head(game)) {
    if (!truncateAt(game, cell)) stepToward(cell);
    updateUi();
  }
  dragging = true;
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener('pointermove', (event) => {
  if (!dragging) return;
  const cell = pointerCell(event);
  if (cell >= 0) stepToward(cell);
});

const endDrag = () => {
  dragging = false;
};
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);

// ---------- Boutons ----------

ui.reset.addEventListener('click', () => {
  if (!game) return;
  feedback.unlock();
  closeCurrentLevel('reset');
  reset(game);
  startedAt = 0;
  finishedSeconds = null;
  hintsUsed = 0;
  levelClosed = false;
  resetMotion(renderState);
  ui.win.classList.add('hidden');
  ui.skip.classList.add('hidden');
  setMessage('');
  updateUi();
  analytics.track('level_start', { level_id: game.level.id, mode, size: game.level.size });
});

function giveHint(): void {
  if (!game || finishedSeconds !== null) return;
  if (startedAt === 0) startedAt = performance.now();
  applyHint(game);
  hintsUsed++;
  analytics.track('booster_used', { type: 'hint', level_id: game.level.id });
  setMessage(t('msg.hint'));
  updateUi();
  if (isWon(game)) onWin();
}

ui.hint.addEventListener('click', () => {
  feedback.unlock();
  if (!game || finishedSeconds !== null) return;
  if (hintsUsed < FREE_HINTS_PER_LEVEL) giveHint();
  else ads.showRewarded('hint', giveHint);
});

ui.skip.addEventListener('click', () => {
  if (!game || mode !== 'campaign' || finishedSeconds !== null) return;
  ads.showRewarded('skip_level', () => {
    if (!game) return;
    analytics.track('level_fail', {
      level_id: game.level.id,
      mode,
      time_s: Math.round((performance.now() - startedAt) / 100) / 10,
      reason: 'skip',
    });
    levelClosed = true;
    saveData.unlocked = Math.max(saveData.unlocked, Math.min(index + 2, campaign.length));
    save(saveData);
    openCampaignLevel(index + 1);
    setMessage(t('msg.skipped'));
  });
});

ui.prev.addEventListener('click', () => openCampaignLevel(index - 1));
ui.next.addEventListener('click', () => openCampaignLevel(index + 1));
ui.tabCampaign.addEventListener('click', () => openCampaignLevel(saveData.current - 1));
ui.tabDaily.addEventListener('click', () => void openDaily());

ui.winNext.addEventListener('click', () => {
  if (mode === 'daily') {
    openCampaignLevel(saveData.current - 1);
    return;
  }
  const levelNumber = index + 1;
  const now = performance.now();
  if (shouldShowInterstitial({ mode, levelNumber, noAds: saveData.noAds, winsSinceLast: campaignWinsSinceInterstitial, lastShownAt: lastInterstitialAt, now })) {
    ads.showInterstitial('between_levels');
    campaignWinsSinceInterstitial = 0;
    lastInterstitialAt = now;
  }
  openCampaignLevel(index < campaign.length - 1 ? index + 1 : index);
});

ui.winShare.addEventListener('click', async () => {
  if (!game || finishedSeconds === null) return;
  const official = mode === 'daily' ? saveData.dailyResults[dailyDate] : undefined;
  const text = buildShareText({
    mode,
    number: mode === 'daily' ? dailyDates.indexOf(dailyDate) + 1 : index + 1,
    seconds: official?.seconds ?? finishedSeconds,
    hints: official?.hints ?? hintsUsed,
    streak: mode === 'daily' ? currentStreak(saveData.dailyDone, dailyDate) : 0,
    url: shareUrl(),
  });
  analytics.track('share_clicked', { mode, level_id: game.level.id });
  const outcome = await shareText(text, getLanguage());
  if (outcome === 'copied') toast(t('msg.copied'));
  else if (outcome === 'failed') toast(t('msg.shareFailed'));
});

// ---------- Réglages (animal, feuilles, options, langue) ----------

const isCharacterUnlocked = (id: string) => unlockAll || isUnlocked(characterById(id), saveData.unlocked);

/** Prépare un canvas net (écran Retina) et renvoie son contexte et sa taille CSS. */
function prepareCanvas(target: HTMLCanvasElement, fallback: number): [CanvasRenderingContext2D, number] {
  const css = target.clientWidth || fallback;
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const px = Math.round(css * dpr);
  if (target.width !== px) {
    target.width = px;
    target.height = px;
  }
  const context = target.getContext('2d') as CanvasRenderingContext2D;
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, css, css);
  return [context, css];
}

/** Dessine un animal centré dans un canvas carré ; en silhouette s'il est verrouillé. */
function drawPortrait(
  target: HTMLCanvasElement,
  character: Character,
  options: { locked?: boolean; time?: number; joy?: number; scale?: number; lift?: number } = {},
): void {
  const [c, css] = prepareCanvas(target, 64);
  c.save();
  c.translate(css / 2, css / 2 + css * (options.lift ?? 0.04));
  drawCharacter(c, character, {
    cell: css * (options.scale ?? 1.05),
    time: options.time ?? 1000,
    moving: 0,
    stride: 0,
    facing: 1,
    tilt: 0,
    joy: options.joy ?? 0,
    shake: 0,
  });
  c.restore();
  if (options.locked) {
    c.globalCompositeOperation = 'source-atop';
    c.fillStyle = 'rgba(90,80,68,0.92)';
    c.fillRect(0, 0, css, css);
    c.globalCompositeOperation = 'source-over';
  }
}

function buildSettings(): void {
  ui.characterList.replaceChildren(
    ...CHARACTERS.map((character) => {
      const button = document.createElement('button');
      const unlocked = isCharacterUnlocked(character.id);
      button.className = 'choice';
      button.dataset.id = character.id;
      button.disabled = !unlocked;
      button.setAttribute('aria-pressed', String(character.id === renderState.character.id));
      const thumb = document.createElement('canvas');
      thumb.className = 'thumb';
      const name = document.createElement('span');
      name.className = 'name';
      name.textContent = unlocked ? t(`animal.${character.id}` as Key) : '???';
      const sub = document.createElement('span');
      sub.className = 'sub';
      sub.textContent = unlocked ? t(`trail.${character.id}` as Key) : t('settings.locked', { n: character.unlockLevel });
      button.append(thumb, name, sub);
      requestAnimationFrame(() => drawPortrait(thumb, character, { locked: !unlocked }));
      button.addEventListener('click', () => {
        feedback.click();
        renderState.character = character;
        saveData.character = character.id;
        save(saveData);
        buildSettings();
      });
      return button;
    }),
  );
  ui.leafList.replaceChildren(
    ...LEAF_COLORS.map((leaf) => {
      const button = document.createElement('button');
      button.className = 'swatch';
      button.dataset.id = leaf.id;
      button.style.setProperty('--swatch', leaf.fill);
      const label = t(`leaf.${leaf.id}` as Key);
      button.title = label;
      button.setAttribute('aria-label', `${t('settings.leaves')} : ${label}`);
      button.setAttribute('aria-pressed', String(leaf.id === renderState.leaf.id));
      button.addEventListener('click', () => {
        feedback.click();
        renderState.leaf = leaf;
        saveData.leafColor = leaf.id;
        save(saveData);
        buildSettings();
      });
      return button;
    }),
  );
  ui.optSound.checked = saveData.sound;
  ui.optVibration.checked = saveData.vibration;
  ui.optTimer.checked = saveData.showTimer;
  ui.langFr.setAttribute('aria-pressed', String(getLanguage() === 'fr'));
  ui.langEn.setAttribute('aria-pressed', String(getLanguage() === 'en'));
}

ui.optSound.addEventListener('change', () => {
  saveData.sound = ui.optSound.checked;
  feedback.settings.sound = saveData.sound;
  feedback.unlock();
  feedback.click();
  save(saveData);
});
ui.optVibration.addEventListener('change', () => {
  saveData.vibration = ui.optVibration.checked;
  feedback.settings.vibration = saveData.vibration;
  save(saveData);
});
ui.optTimer.addEventListener('change', () => {
  saveData.showTimer = ui.optTimer.checked;
  save(saveData);
  updateUi();
});

function changeLanguage(lang: Lang): void {
  saveData.language = lang;
  save(saveData);
  setLanguage(lang);
  translateDom();
  buildSettings();
  updateUi();
  if (game && finishedSeconds === null) setMessage(mode === 'campaign' && index < 3 ? t('msg.tutorial') : '');
}
ui.langFr.addEventListener('click', () => changeLanguage('fr'));
ui.langEn.addEventListener('click', () => changeLanguage('en'));

ui.settingsOpen.addEventListener('click', () => {
  feedback.unlock();
  buildSettings();
  ui.settings.classList.remove('hidden');
});
ui.settingsClose.addEventListener('click', () => ui.settings.classList.add('hidden'));
ui.settings.addEventListener('click', (event) => {
  if (event.target === ui.settings) ui.settings.classList.add('hidden');
});

// Aperçu animé du personnage choisi dans le menu.
const previewCtx = ui.previewCanvas.getContext('2d') as CanvasRenderingContext2D;
const previewGame = createGame({
  id: 'apercu', size: 3, difficulty: 1, seed: 0, walls: [],
  waypoints: [{ n: 1, r: 1, c: 0 }, { n: 2, r: 1, c: 2 }],
  solution: [[1, 0], [0, 0], [0, 1], [0, 2], [1, 2], [2, 2], [2, 1], [1, 1], [2, 0]],
});
const previewState = createRenderState(renderState.character, renderState.leaf);
let previewStep = 0;

function renderPreview(now: number): void {
  if (ui.settings.classList.contains('hidden')) return;
  const css = ui.previewCanvas.clientWidth || 180;
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  if (ui.previewCanvas.width !== Math.round(css * dpr)) {
    ui.previewCanvas.width = Math.round(css * dpr);
    ui.previewCanvas.height = Math.round(css * dpr);
  }
  previewCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  previewState.character = renderState.character;
  previewState.leaf = renderState.leaf;
  // Promenade en boucle sur un petit chemin : une case toutes les 450 ms.
  const wanted = Math.floor(now / 450) % 8;
  if (wanted !== previewStep) {
    previewStep = wanted;
    previewGame.path = [3, 0, 1, 2, 5, 8, 7, 4].slice(0, wanted + 2);
  }
  render(previewCtx, previewGame, computeLayout(css, 3), previewState, now);
}

// ---------- Affichage ----------

function resize(): void {
  if (!game) return;
  const rect = canvas.getBoundingClientRect();
  const cssSize = Math.max(200, Math.floor(rect.width));
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  canvas.width = Math.round(cssSize * dpr);
  canvas.height = Math.round(cssSize * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  layout = computeLayout(cssSize, game.puzzle.size);
}

window.addEventListener('resize', resize);

function frame(now: number): void {
  if (game) {
    render(ctx, game, layout, renderState, now);
    const elapsed = startedAt ? now - startedAt : 0;
    ui.timer.textContent = formatTime(finishedSeconds ?? elapsed / 1000);
    // Proposer de passer un niveau de campagne sur lequel on bloque.
    if (mode === 'campaign' && finishedSeconds === null && startedAt && elapsed > skipAfterMs && index < campaign.length - 1) {
      ui.skip.classList.remove('hidden');
    }
  }
  renderPreview(now);
  drawPortrait(ui.logo, characterById('escargot'), { time: now });
  if (!ui.win.classList.contains('hidden')) {
    const loop = (now % 1400) / 700;
    drawPortrait(ui.winArt, renderState.character, { time: now, joy: loop < 1 ? loop : 0, scale: 0.75, lift: 0.2 });
  }
  requestAnimationFrame(frame);
}

async function boot(): Promise<void> {
  translateDom();
  await loadCampaign();
  const requested = Number(params.get('level'));
  if (params.get('mode') === 'daily') await openDaily();
  else openCampaignLevel(requested > 0 ? requested - 1 : saveData.current - 1);
  requestAnimationFrame(frame);
}

void boot();
