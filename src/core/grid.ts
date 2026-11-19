import type { Level, Wall } from './types.ts';

/**
 * Représentation interne d'un puzzle, par indices de cases (index = r * size + c).
 * Partagée par le solveur, le générateur et (plus tard) le moteur de règles du jeu.
 */
export interface Puzzle {
  size: number;
  /** Indices des cases des feuilles : waypointCells[0] = feuille 1, …, waypointCells[K-1] = feuille K. */
  waypointCells: number[];
  /** waypointAt[case] = numéro de la feuille (1 … K), ou 0 s'il n'y en a pas. */
  waypointAt: Int8Array;
  /** Arêtes bloquées par un mur (cf. edgeId). */
  walls: Set<number>;
}

export const MIN_SIZE = 2;
export const MAX_SIZE = 8;

export function cellIndex(size: number, r: number, c: number): number {
  return r * size + c;
}

export function cellRC(size: number, index: number): [number, number] {
  return [Math.floor(index / size), index % size];
}

/** Identifiant unique et non orienté de l'arête entre deux cases adjacentes. */
export function edgeId(a: number, b: number): number {
  return a < b ? a * 4096 + b : b * 4096 + a;
}

const neighborCache = new Map<number, number[][]>();

/** Voisins orthogonaux de chaque case (ordre fixe : haut, droite, bas, gauche). */
export function neighborsOf(size: number): number[][] {
  const cached = neighborCache.get(size);
  if (cached) return cached;
  const list: number[][] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const n: number[] = [];
      if (r > 0) n.push(cellIndex(size, r - 1, c));
      if (c < size - 1) n.push(cellIndex(size, r, c + 1));
      if (r < size - 1) n.push(cellIndex(size, r + 1, c));
      if (c > 0) n.push(cellIndex(size, r, c - 1));
      list.push(n);
    }
  }
  neighborCache.set(size, list);
  return list;
}

export function areAdjacent(size: number, a: number, b: number): boolean {
  const [ra, ca] = cellRC(size, a);
  const [rb, cb] = cellRC(size, b);
  return Math.abs(ra - rb) + Math.abs(ca - cb) === 1;
}

/** Convertit un mur exporté (r, c, E|S) en identifiant d'arête. */
export function wallToEdge(size: number, wall: Wall): number {
  const a = cellIndex(size, wall.r, wall.c);
  const b = wall.side === 'E' ? cellIndex(size, wall.r, wall.c + 1) : cellIndex(size, wall.r + 1, wall.c);
  return edgeId(a, b);
}

/** Convertit une arête entre deux cases adjacentes en mur exportable (toujours côté E ou S). */
export function edgeToWall(size: number, a: number, b: number): Wall {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  const [r, c] = cellRC(size, lo);
  return { r, c, side: hi - lo === 1 ? 'E' : 'S' };
}

export function decodeEdge(edge: number): [number, number] {
  return [Math.floor(edge / 4096), edge % 4096];
}

export function createPuzzle(size: number, waypointCells: number[], walls: Iterable<number> = []): Puzzle {
  if (size < MIN_SIZE || size > MAX_SIZE) throw new Error(`Taille de grille invalide : ${size}`);
  if (waypointCells.length < 2) throw new Error('Il faut au moins 2 feuilles (départ et arrivée)');
  const waypointAt = new Int8Array(size * size);
  waypointCells.forEach((cell, i) => {
    if (cell < 0 || cell >= size * size) throw new Error(`Feuille hors grille : ${cell}`);
    if (waypointAt[cell] !== 0) throw new Error(`Deux feuilles sur la même case : ${cell}`);
    waypointAt[cell] = i + 1;
  });
  return { size, waypointCells: [...waypointCells], waypointAt, walls: new Set(walls) };
}

export function levelToPuzzle(level: Level): Puzzle {
  const sorted = [...level.waypoints].sort((x, y) => x.n - y.n);
  sorted.forEach((w, i) => {
    if (w.n !== i + 1) throw new Error(`Numérotation des feuilles invalide dans ${level.id}`);
  });
  return createPuzzle(
    level.size,
    sorted.map((w) => cellIndex(level.size, w.r, w.c)),
    level.walls.map((w) => wallToEdge(level.size, w)),
  );
}

export function isWallBetween(puzzle: Puzzle, a: number, b: number): boolean {
  return puzzle.walls.has(edgeId(a, b));
}

/**
 * Vérifie qu'un chemin complet est une solution valide du puzzle :
 * couvre chaque case une fois, pas orthogonaux, pas de mur, feuilles dans l'ordre,
 * départ sur la feuille 1 et arrivée sur la dernière feuille.
 */
export function isValidSolution(puzzle: Puzzle, path: readonly number[]): boolean {
  const { size, waypointAt, waypointCells } = puzzle;
  const total = size * size;
  if (path.length !== total) return false;
  if (path[0] !== waypointCells[0] || path[total - 1] !== waypointCells[waypointCells.length - 1]) return false;
  const seen = new Uint8Array(total);
  let nextWaypoint = 1;
  for (let i = 0; i < total; i++) {
    const cell = path[i];
    if (cell === undefined || cell < 0 || cell >= total || seen[cell]) return false;
    seen[cell] = 1;
    if (i > 0) {
      const prev = path[i - 1] as number;
      if (!areAdjacent(size, prev, cell) || isWallBetween(puzzle, prev, cell)) return false;
    }
    const w = waypointAt[cell] ?? 0;
    if (w !== 0) {
      if (w !== nextWaypoint) return false;
      nextWaypoint++;
    }
  }
  return nextWaypoint === waypointCells.length + 1;
}
