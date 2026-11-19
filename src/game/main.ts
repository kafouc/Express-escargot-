/** Écran de jeu : chargement des niveaux, entrées tactiles/souris, interface. */
import type { Level } from '../core/types.ts';
import { cellRC } from '../core/grid.ts';
import { applyHint, blockReason, createGame, head, isWon, moveTo, nextWaypoint, progress, reset, truncateAt, type Game } from './rules.ts';
import { cellAt, computeLayout, createRenderState, render, resetMotion, type Layout } from './render.ts';
import { CHARACTERS, LEAF_COLORS, characterById, isUnlocked, leafColorById } from './characters.ts';
import { load, save } from './storage.ts';

type Mode = 'campaign' | 'daily';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = $<HTMLCanvasElement>('board');
const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
const ui = {
  tabCampaign: $<HTMLButtonElement>('tab-campaign'),
  tabDaily: $<HTMLButtonElement>('tab-daily'),
  prev: $<HTMLButtonElement>('prev'),
  next: $<HTMLButtonElement>('next'),
  label: $('level-label'),
  meta: $('level-meta'),
  timer: $('timer'),
  progress: $('progress'),
  message: $('message'),
  reset: $<HTMLButtonElement>('reset'),
  hint: $<HTMLButtonElement>('hint'),
  win: $('win'),
  winTitle: $('win-title'),
  winText: $('win-text'),
  winNext: $<HTMLButtonElement>('win-next'),
  settingsOpen: $<HTMLButtonElement>('settings-open'),
  settings: $('settings'),
  settingsClose: $<HTMLButtonElement>('settings-close'),
  characterList: $('character-list'),
  leafList: $('leaf-list'),
  previewCanvas: $<HTMLCanvasElement>('preview'),
};

const params = new URLSearchParams(location.search);
/** `?all=1` débloque tous les niveaux (tests). */
const unlockAll = params.has('all');

const saveData = load();
let campaign: Level[] = [];
let daily: Record<string, Level> | null = null;
let mode: Mode = 'campaign';
let index = 0;
let dailyDate = '';
let game: Game;
let layout: Layout;
const renderState = createRenderState(characterById(saveData.character), leafColorById(saveData.leafColor));
let startedAt = 0;
let finishedSeconds: number | null = null;
let hintsUsed = 0;
let dragging = false;

// ---------- Niveaux ----------

async function loadCampaign(): Promise<void> {
  const module = await import('../../levels/campaign.json');
  campaign = module.default as unknown as Level[];
}

async function loadDaily(): Promise<Record<string, Level>> {
  if (!daily) {
    const module = await import('../../levels/daily.json');
    daily = module.default as unknown as Record<string, Level>;
  }
  return daily;
}

const todayUtc = () => new Date().toISOString().slice(0, 10);

function formatDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ---------- Partie ----------

function startLevel(level: Level): void {
  game = createGame(level);
  startedAt = 0;
  finishedSeconds = null;
  hintsUsed = 0;
  resetMotion(renderState);
  ui.win.classList.add('hidden');
  resize();
  updateUi();
  setMessage(
    mode === 'campaign' && index < 3
      ? 'Glisse depuis la feuille 1, passe par les feuilles dans l’ordre et remplis tout le jardin.'
      : '',
  );
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
  setMessage('Chargement du défi…');
  const all = await loadDaily();
  const dates = Object.keys(all).sort();
  const today = todayUtc();
  dailyDate = all[today] ? today : (dates.find((d) => d >= today) ?? (dates[dates.length - 1] as string));
  startLevel(all[dailyDate] as Level);
  if (dailyDate !== today) setMessage(`Aperçu : les défis commencent le ${formatDate(dailyDate)}.`);
}

function setMessage(text: string, warn = false): void {
  ui.message.textContent = text;
  ui.message.classList.toggle('warn', warn);
}

function updateUi(): void {
  const level = game.level;
  const isCampaign = mode === 'campaign';
  ui.tabCampaign.classList.toggle('active', isCampaign);
  ui.tabDaily.classList.toggle('active', !isCampaign);
  ui.tabCampaign.setAttribute('aria-selected', String(isCampaign));
  ui.tabDaily.setAttribute('aria-selected', String(!isCampaign));
  ui.prev.style.visibility = isCampaign ? 'visible' : 'hidden';
  ui.next.style.visibility = isCampaign ? 'visible' : 'hidden';
  if (isCampaign) {
    ui.label.textContent = `Niveau ${index + 1} / ${campaign.length}`;
    ui.prev.disabled = index === 0;
    ui.next.disabled = index >= campaign.length - 1 || (!unlockAll && index + 1 >= saveData.unlocked);
  } else {
    const label = formatDate(dailyDate);
    ui.label.textContent = label.charAt(0).toUpperCase() + label.slice(1);
  }
  const best = saveData.best[level.id];
  ui.meta.textContent = `${level.size}×${level.size} · ${level.waypoints.length} feuilles${best ? ` · record ${formatTime(best)}` : ''}`;
  ui.progress.textContent = `${Math.round(progress(game) * 100)} %`;
}

function onWin(): void {
  finishedSeconds = (performance.now() - startedAt) / 1000;
  renderState.winAt = performance.now();
  const id = game.level.id;
  const previous = saveData.best[id];
  const record = hintsUsed === 0 && (previous === undefined || finishedSeconds < previous);
  if (record) saveData.best[id] = finishedSeconds;

  if (mode === 'campaign') {
    saveData.unlocked = Math.max(saveData.unlocked, Math.min(index + 2, campaign.length));
    ui.winTitle.textContent = 'Bravo !';
    ui.winNext.textContent = index < campaign.length - 1 ? 'Niveau suivant' : 'Rejouer le niveau';
  } else {
    if (!saveData.dailyDone.includes(dailyDate)) saveData.dailyDone.push(dailyDate);
    ui.winTitle.textContent = 'Défi réussi !';
    ui.winNext.textContent = 'Retour à la campagne';
  }
  save(saveData);
  const hintText = hintsUsed > 0 ? ` · ${hintsUsed} indice${hintsUsed > 1 ? 's' : ''}` : '';
  ui.winText.textContent = `Temps : ${formatTime(finishedSeconds)}${hintText}${record && previous !== undefined ? ' · nouveau record !' : ''}`;
  setTimeout(() => ui.win.classList.remove('hidden'), 850);
  updateUi();
}

const BLOCK_MESSAGES: Record<string, (game: Game) => string> = {
  wall: () => 'Un mur bloque le passage.',
  order: (g) => `Il faut d’abord atteindre la feuille ${nextWaypoint(g)}.`,
  'end-too-early': () => 'La dernière feuille doit être la toute dernière case du jardin.',
  visited: () => 'L’escargot ne repasse jamais sur sa bave.',
};

/** Applique un déplacement et gère les retours visuels. Renvoie false si le geste doit s'arrêter. */
function step(cell: number): boolean {
  if (finishedSeconds !== null) return false;
  const before = head(game);
  const reason = before !== undefined ? blockReason(game, cell) : null;
  const result = moveTo(game, cell);
  if (result === 'blocked') {
    renderState.shakeAt = performance.now();
    setMessage(BLOCK_MESSAGES[reason ?? '']?.(game) ?? '', true);
    navigator.vibrate?.(30);
    return false;
  }
  if (result === 'ignored') return false;
  if (result === 'started' && startedAt === 0) startedAt = performance.now();
  if (result === 'extended') {
    const w = game.puzzle.waypointAt[cell] ?? 0;
    navigator.vibrate?.(w !== 0 ? 15 : 5);
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

// ---------- Entrées ----------

function pointerCell(event: PointerEvent): number {
  const rect = canvas.getBoundingClientRect();
  return cellAt(layout, game.puzzle.size, event.clientX - rect.left, event.clientY - rect.top);
}

canvas.addEventListener('pointerdown', (event) => {
  if (finishedSeconds !== null) return;
  const cell = pointerCell(event);
  if (cell < 0) return;
  if (game.path.length === 0) {
    if (!step(cell)) {
      setMessage('Commence sur la feuille 1.', true);
      renderState.shakeAt = performance.now();
      return;
    }
  } else if (cell !== head(game)) {
    if (!truncateAt(game, cell)) {
      // Appui ailleurs : on tente d'y aller depuis la tête.
      stepToward(cell);
    }
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

ui.reset.addEventListener('click', () => {
  reset(game);
  startedAt = 0;
  finishedSeconds = null;
  resetMotion(renderState);
  ui.win.classList.add('hidden');
  setMessage('');
  updateUi();
});

ui.hint.addEventListener('click', () => {
  if (finishedSeconds !== null) return;
  if (startedAt === 0) startedAt = performance.now();
  applyHint(game);
  hintsUsed++;
  setMessage('Indice : les 3 cases suivantes sont tracées.');
  updateUi();
  if (isWon(game)) onWin();
});

ui.prev.addEventListener('click', () => openCampaignLevel(index - 1));
ui.next.addEventListener('click', () => openCampaignLevel(index + 1));
ui.tabCampaign.addEventListener('click', () => openCampaignLevel(saveData.current - 1));
ui.tabDaily.addEventListener('click', () => void openDaily());
ui.winNext.addEventListener('click', () => {
  if (mode === 'daily') openCampaignLevel(saveData.current - 1);
  else openCampaignLevel(index < campaign.length - 1 ? index + 1 : index);
});

// ---------- Personnalisation (animal, couleur des feuilles) ----------

const isCharacterUnlocked = (id: string) => unlockAll || isUnlocked(characterById(id), saveData.unlocked);

function buildSettings(): void {
  ui.characterList.replaceChildren(
    ...CHARACTERS.map((character) => {
      const button = document.createElement('button');
      const unlocked = isCharacterUnlocked(character.id);
      button.className = 'choice';
      button.dataset.id = character.id;
      button.disabled = !unlocked;
      button.setAttribute('aria-pressed', String(character.id === renderState.character.id));
      button.innerHTML = `<span class="emoji">${unlocked ? character.emoji : '🔒'}</span><span class="name">${character.name}</span>` +
        `<span class="sub">${unlocked ? character.trailName : `niveau ${character.unlockLevel}`}</span>`;
      button.addEventListener('click', () => {
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
      button.style.setProperty('--swatch', leaf.fill);
      button.title = leaf.name;
      button.setAttribute('aria-label', `Feuilles ${leaf.name}`);
      button.setAttribute('aria-pressed', String(leaf.id === renderState.leaf.id));
      button.addEventListener('click', () => {
        renderState.leaf = leaf;
        saveData.leafColor = leaf.id;
        save(saveData);
        buildSettings();
      });
      return button;
    }),
  );
}

ui.settingsOpen.addEventListener('click', () => {
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
  const size = 3;
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
  render(previewCtx, previewGame, computeLayout(css, size), previewState, now);
}

// ---------- Affichage ----------

function resize(): void {
  const rect = canvas.getBoundingClientRect();
  const cssSize = Math.max(200, Math.floor(rect.width));
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  canvas.width = Math.round(cssSize * dpr);
  canvas.height = Math.round(cssSize * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  layout = computeLayout(cssSize, game.puzzle.size);
}

window.addEventListener('resize', () => {
  if (game) resize();
});

function frame(now: number): void {
  if (game) {
    render(ctx, game, layout, renderState, now);
    const seconds = finishedSeconds ?? (startedAt ? (now - startedAt) / 1000 : 0);
    ui.timer.textContent = `⏱ ${formatTime(seconds)}`;
  }
  renderPreview(now);
  requestAnimationFrame(frame);
}

async function boot(): Promise<void> {
  await loadCampaign();
  const requested = Number(params.get('level'));
  if (params.get('mode') === 'daily') await openDaily();
  else openCampaignLevel(requested > 0 ? requested - 1 : saveData.current - 1);
  requestAnimationFrame(frame);
}

void boot();
