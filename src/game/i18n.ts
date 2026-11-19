/** Textes du jeu en français et en anglais (docs/brief.md §6.9). Aucune chaîne en dur ailleurs. */

export type Lang = 'fr' | 'en';

const fr = {
  'tab.campaign': 'Campagne',
  'tab.daily': 'Défi du jour',
  'level.label': 'Niveau {n} / {total}',
  'level.meta': '{size}×{size} · {leaves} feuilles',
  'level.record': ' · record {time}',
  'btn.reset': 'Recommencer',
  'btn.hint': 'Indice',
  'btn.hintAd': 'Indice (pub)',
  'btn.skip': 'Passer ce niveau (pub)',
  'btn.share': 'Partager',
  'btn.next': 'Niveau suivant',
  'btn.replay': 'Rejouer le niveau',
  'btn.backCampaign': 'Retour à la campagne',
  'aria.prev': 'Niveau précédent',
  'aria.next': 'Niveau suivant',
  'aria.settings': 'Réglages',
  'aria.close': 'Fermer',
  'aria.board': 'Plateau de jeu',
  'msg.tutorial': 'Glisse depuis la feuille 1, passe par les feuilles dans l’ordre et remplis tout le jardin.',
  'msg.startOnOne': 'Commence sur la feuille 1.',
  'msg.wall': 'Un mur bloque le passage.',
  'msg.order': 'Il faut d’abord atteindre la feuille {n}.',
  'msg.endTooEarly': 'La dernière feuille doit être la toute dernière case du jardin.',
  'msg.visited': 'On ne repasse jamais sur sa propre trace.',
  'msg.hint': 'Indice : les 3 cases suivantes sont tracées.',
  'msg.loading': 'Chargement…',
  'msg.dailyPreview': 'Aperçu : les défis commencent le {date}.',
  'msg.dailyDone': 'Défi du jour déjà réussi : tu peux le rejouer pour le plaisir.',
  'msg.copied': 'Résultat copié : colle-le où tu veux !',
  'msg.shareFailed': 'Impossible de partager sur cet appareil.',
  'msg.skipped': 'Niveau passé. Le suivant est débloqué.',
  'win.title': 'Bravo !',
  'win.dailyTitle': 'Défi réussi !',
  'win.time': 'Temps : {time}',
  'win.hintsOne': ' · 1 indice',
  'win.hintsMany': ' · {n} indices',
  'win.record': ' · nouveau record !',
  'win.streakOne': 'Série : 1 jour',
  'win.streakMany': 'Série : {n} jours',
  'settings.title': 'Réglages',
  'settings.animal': 'Ton animal',
  'settings.leaves': 'Couleur des feuilles',
  'settings.options': 'Options',
  'settings.locked': 'Débloqué au niveau {n}',
  'opt.sound': 'Sons',
  'opt.vibration': 'Vibrations',
  'opt.timer': 'Afficher le chrono',
  'opt.language': 'Langue',
  'ad.simulated': 'Publicité simulée : {placement}',
  'ad.hint': 'indice',
  'ad.skip_level': 'passer le niveau',
  'ad.between_levels': 'entre deux niveaux',
  'share.daily': 'Escargot Express · défi n°{n}',
  'share.campaign': 'Escargot Express · niveau {n}',
  'share.time': 'Temps {time}',
  'share.streakOne': 'série de 1 jour',
  'share.streakMany': 'série de {n} jours',
  'share.noHint': 'sans indice',
  'share.hintsOne': '1 indice',
  'share.hintsMany': '{n} indices',
  'animal.escargot': 'Escargot',
  'animal.chenille': 'Chenille',
  'animal.tortue': 'Tortue',
  'animal.coccinelle': 'Coccinelle',
  'animal.herisson': 'Hérisson',
  'animal.lapin': 'Lapin',
  'animal.poussin': 'Poussin',
  'trail.escargot': 'bave brillante',
  'trail.chenille': 'feuilles grignotées',
  'trail.tortue': 'sable',
  'trail.coccinelle': 'pétales',
  'trail.herisson': 'feuilles mortes',
  'trail.lapin': 'trèfles',
  'trail.poussin': 'plumes',
  'leaf.vert': 'Vert',
  'leaf.corail': 'Corail',
  'leaf.bleu': 'Bleu',
  'leaf.violet': 'Violet',
  'leaf.or': 'Or',
  'leaf.rose': 'Rose',
  'leaf.nuit': 'Nuit',
};

export type Key = keyof typeof fr;

const en: Record<Key, string> = {
  'tab.campaign': 'Levels',
  'tab.daily': 'Daily puzzle',
  'level.label': 'Level {n} / {total}',
  'level.meta': '{size}×{size} · {leaves} leaves',
  'level.record': ' · best {time}',
  'btn.reset': 'Restart',
  'btn.hint': 'Hint',
  'btn.hintAd': 'Hint (ad)',
  'btn.skip': 'Skip this level (ad)',
  'btn.share': 'Share',
  'btn.next': 'Next level',
  'btn.replay': 'Play again',
  'btn.backCampaign': 'Back to levels',
  'aria.prev': 'Previous level',
  'aria.next': 'Next level',
  'aria.settings': 'Settings',
  'aria.close': 'Close',
  'aria.board': 'Game board',
  'msg.tutorial': 'Drag from leaf 1, visit the leaves in order and fill the whole garden.',
  'msg.startOnOne': 'Start on leaf 1.',
  'msg.wall': 'A wall is in the way.',
  'msg.order': 'Reach leaf {n} first.',
  'msg.endTooEarly': 'The last leaf must be the very last square of the garden.',
  'msg.visited': 'You can never cross your own trail.',
  'msg.hint': 'Hint: the next 3 squares are drawn.',
  'msg.loading': 'Loading…',
  'msg.dailyPreview': 'Preview: daily puzzles start on {date}.',
  'msg.dailyDone': 'Today’s puzzle is already solved: replay it just for fun.',
  'msg.copied': 'Result copied: paste it anywhere!',
  'msg.shareFailed': 'Sharing is not available on this device.',
  'msg.skipped': 'Level skipped. The next one is unlocked.',
  'win.title': 'Well done!',
  'win.dailyTitle': 'Puzzle solved!',
  'win.time': 'Time: {time}',
  'win.hintsOne': ' · 1 hint',
  'win.hintsMany': ' · {n} hints',
  'win.record': ' · new best!',
  'win.streakOne': 'Streak: 1 day',
  'win.streakMany': 'Streak: {n} days',
  'settings.title': 'Settings',
  'settings.animal': 'Your animal',
  'settings.leaves': 'Leaf colour',
  'settings.options': 'Options',
  'settings.locked': 'Unlocks at level {n}',
  'opt.sound': 'Sound',
  'opt.vibration': 'Vibration',
  'opt.timer': 'Show timer',
  'opt.language': 'Language',
  'ad.simulated': 'Simulated ad: {placement}',
  'ad.hint': 'hint',
  'ad.skip_level': 'skip level',
  'ad.between_levels': 'between levels',
  'share.daily': 'Snail Trail · puzzle #{n}',
  'share.campaign': 'Snail Trail · level {n}',
  'share.time': 'Time {time}',
  'share.streakOne': '1-day streak',
  'share.streakMany': '{n}-day streak',
  'share.noHint': 'no hints',
  'share.hintsOne': '1 hint',
  'share.hintsMany': '{n} hints',
  'animal.escargot': 'Snail',
  'animal.chenille': 'Caterpillar',
  'animal.tortue': 'Turtle',
  'animal.coccinelle': 'Ladybug',
  'animal.herisson': 'Hedgehog',
  'animal.lapin': 'Rabbit',
  'animal.poussin': 'Chick',
  'trail.escargot': 'shiny slime',
  'trail.chenille': 'nibbled leaves',
  'trail.tortue': 'sand',
  'trail.coccinelle': 'petals',
  'trail.herisson': 'autumn leaves',
  'trail.lapin': 'clovers',
  'trail.poussin': 'feathers',
  'leaf.vert': 'Green',
  'leaf.corail': 'Coral',
  'leaf.bleu': 'Blue',
  'leaf.violet': 'Purple',
  'leaf.or': 'Gold',
  'leaf.rose': 'Pink',
  'leaf.nuit': 'Night',
};

export const DICTIONARIES: Record<Lang, Record<Key, string>> = { fr, en };

/** Nom du jeu affiché selon la langue (titre provisoire anglais : « Snail Trail »). */
export const GAME_NAME: Record<Lang, string> = { fr: 'Escargot Express', en: 'Snail Trail' };

let current: Lang = 'fr';

/** Français si la langue du navigateur est le français, anglais sinon. */
export function detectLanguage(languages: readonly string[] = typeof navigator !== 'undefined' ? navigator.languages ?? [navigator.language] : []): Lang {
  const first = (languages[0] ?? '').toLowerCase();
  return first.startsWith('fr') ? 'fr' : 'en';
}

export function setLanguage(lang: Lang): void {
  current = lang;
  if (typeof document !== 'undefined') document.documentElement.lang = lang;
}

export function getLanguage(): Lang {
  return current;
}

/** Traduit une clé et remplace les {paramètres}. */
export function t(key: Key, params: Record<string, string | number> = {}): string {
  const template = DICTIONARIES[current][key] ?? DICTIONARIES.fr[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? `{${name}}`));
}

/** Choisit la forme au singulier ou au pluriel. */
export function plural(n: number, one: Key, many: Key): string {
  return t(n <= 1 ? one : many, { n });
}

export function locale(): string {
  return current === 'fr' ? 'fr-FR' : 'en-US';
}

/** Applique les traductions aux éléments statiques marqués data-i18n / data-i18n-aria. */
export function translateDom(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n as Key);
  });
  root.querySelectorAll<HTMLElement>('[data-i18n-aria]').forEach((el) => {
    el.setAttribute('aria-label', t(el.dataset.i18nAria as Key));
  });
  if (typeof document !== 'undefined') document.title = GAME_NAME[current];
}
