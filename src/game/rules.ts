/**
 * Moteur de règles d'une partie (TypeScript pur, sans DOM) — docs/brief.md §3 et §6.1.
 * L'interface appelle ces fonctions ; elles ne dessinent rien.
 */
import { areAdjacent, cellIndex, isWallBetween, levelToPuzzle, type Puzzle } from '../core/grid.ts';
import type { Level } from '../core/types.ts';

export interface Game {
  level: Level;
  puzzle: Puzzle;
  /** Cases du chemin tracé, de la feuille 1 à la tête de l'escargot. */
  path: number[];
  /** Solution unique (indices de cases), pour les indices. */
  solution: number[];
}

/** Résultat d'une tentative de déplacement. */
export type MoveResult = 'started' | 'extended' | 'retracted' | 'blocked' | 'ignored';

/** Pourquoi un déplacement est refusé (pour le retour visuel). */
export type BlockReason = 'wall' | 'order' | 'end-too-early' | 'not-adjacent' | 'visited';

export function createGame(level: Level): Game {
  return {
    level,
    puzzle: levelToPuzzle(level),
    path: [],
    solution: level.solution.map(([r, c]) => cellIndex(level.size, r, c)),
  };
}

export const totalCells = (game: Game): number => game.puzzle.size * game.puzzle.size;
export const startCell = (game: Game): number => game.puzzle.waypointCells[0] as number;
export const endCell = (game: Game): number => game.puzzle.waypointCells[game.puzzle.waypointCells.length - 1] as number;
export const head = (game: Game): number | undefined => game.path[game.path.length - 1];

/** Numéro de la prochaine feuille à atteindre (K + 1 si toutes sont atteintes). */
export function nextWaypoint(game: Game): number {
  let reached = 0;
  for (const cell of game.path) if ((game.puzzle.waypointAt[cell] ?? 0) !== 0) reached++;
  return reached + 1;
}

/** Explique pourquoi la tête ne peut pas aller sur `cell`, ou renvoie null si c'est possible. */
export function blockReason(game: Game, cell: number): BlockReason | null {
  const h = head(game);
  if (h === undefined) return null;
  const { puzzle } = game;
  if (!areAdjacent(puzzle.size, h, cell)) return 'not-adjacent';
  if (game.path.includes(cell)) return 'visited';
  if (isWallBetween(puzzle, h, cell)) return 'wall';
  const w = puzzle.waypointAt[cell] ?? 0;
  if (w !== 0) {
    if (w !== nextWaypoint(game)) return 'order';
    const isLast = w === puzzle.waypointCells.length;
    if (isLast && game.path.length !== totalCells(game) - 1) return 'end-too-early';
  }
  return null;
}

/**
 * Tente d'amener la tête sur `cell` :
 * - chemin vide : on ne peut démarrer que sur la feuille 1 ;
 * - avant-dernière case du chemin : on recule d'une case ;
 * - case voisine libre et autorisée : on avance ;
 * - sinon : refus (`blocked`) ou rien (`ignored`).
 */
export function moveTo(game: Game, cell: number): MoveResult {
  if (game.path.length === 0) {
    if (cell !== startCell(game)) return 'ignored';
    game.path.push(cell);
    return 'started';
  }
  const h = head(game) as number;
  if (cell === h) return 'ignored';
  if (game.path.length >= 2 && cell === game.path[game.path.length - 2]) {
    game.path.pop();
    return 'retracted';
  }
  const reason = blockReason(game, cell);
  if (reason === null) {
    game.path.push(cell);
    return 'extended';
  }
  return reason === 'not-adjacent' ? 'ignored' : 'blocked';
}

/** Coupe le chemin juste après `cell` (appui sur une case déjà tracée). Renvoie false si la case n'est pas dans le chemin. */
export function truncateAt(game: Game, cell: number): boolean {
  const index = game.path.indexOf(cell);
  if (index === -1) return false;
  game.path.length = index + 1;
  return true;
}

export function reset(game: Game): void {
  game.path.length = 0;
}

export function isWon(game: Game): boolean {
  return game.path.length === totalCells(game) && head(game) === endCell(game);
}

/** Part de la grille couverte, de 0 à 1. */
export function progress(game: Game): number {
  return game.path.length / totalCells(game);
}

/**
 * Indice (docs/brief.md §7) : efface jusqu'à la première erreur, puis montre les
 * `steps` cases correctes suivantes. Renvoie les cases ajoutées.
 */
export function applyHint(game: Game, steps = 3): number[] {
  let correct = 0;
  while (correct < game.path.length && game.path[correct] === game.solution[correct]) correct++;
  game.path.length = correct;
  const added: number[] = [];
  for (let i = 0; i < steps && game.path.length < game.solution.length; i++) {
    const cell = game.solution[game.path.length] as number;
    game.path.push(cell);
    added.push(cell);
  }
  return added;
}
