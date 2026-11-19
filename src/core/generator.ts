import { cellRC, createPuzzle, edgeId, edgeToWall, neighborsOf, decodeEdge } from './grid.ts';
import { randomHamiltonianPath } from './hamiltonian.ts';
import { createRng, randInt, shuffle, pick, type Rng } from './rng.ts';
import { solve } from './solver.ts';
import { difficultyScore } from './difficulty.ts';
import type { Level } from './types.ts';

export interface GenerateConfig {
  id: string;
  seed: number;
  size: number;
  /** Nombre de feuilles autorisé, bornes incluses (départ et arrivée compris). */
  waypoints: [number, number];
  /** Nombre de murs autorisé, bornes incluses. */
  walls: [number, number];
  /** Nombre maximal de chemins tirés avant d'abandonner. */
  maxAttempts?: number;
  /** Garde-fou du solveur pour chaque vérification. */
  maxNodes?: number;
}

export interface GenerateStats {
  attempts: number;
  fixSteps: number;
  solverNodes: number;
}

/** Écart minimal (en cases le long du chemin) entre deux feuilles. */
const MIN_WAYPOINT_GAP = 2;

function pathEdges(path: readonly number[]): Set<number> {
  const edges = new Set<number>();
  for (let i = 1; i < path.length; i++) edges.add(edgeId(path[i - 1] as number, path[i] as number));
  return edges;
}

function allEdges(size: number): number[] {
  const neighbors = neighborsOf(size);
  const edges: number[] = [];
  neighbors.forEach((list, a) => {
    for (const b of list) if (a < b) edges.push(edgeId(a, b));
  });
  return edges;
}

function canPlaceWaypoint(index: number, chosen: ReadonlySet<number>, gap: number): boolean {
  for (const other of chosen) if (Math.abs(other - index) < gap) return false;
  return true;
}

/**
 * Indices du vrai chemin où une nouvelle feuille éliminerait à coup sûr la solution alternative :
 * l'alternative visite cette case hors de l'intervalle formé par les feuilles qui l'encadrent.
 */
function waypointKillers(
  path: readonly number[],
  alternative: readonly number[],
  waypointIndices: ReadonlySet<number>,
): number[] {
  const altPosition = new Map<number, number>();
  alternative.forEach((cell, i) => altPosition.set(cell, i));
  const sorted = [...waypointIndices].sort((a, b) => a - b);
  const killers: number[] = [];
  for (let k = 0; k < sorted.length - 1; k++) {
    const from = sorted[k] as number;
    const to = sorted[k + 1] as number;
    const low = altPosition.get(path[from] as number) as number;
    const high = altPosition.get(path[to] as number) as number;
    for (let i = from + 1; i < to; i++) {
      const pos = altPosition.get(path[i] as number) as number;
      if (pos < low || pos > high) killers.push(i);
    }
  }
  return killers;
}

/** Indices (le long du chemin) des feuilles : 0, la fin, et `count - 2` indices intermédiaires. */
function pickWaypointIndices(rng: Rng, length: number, count: number): Set<number> {
  const chosen = new Set<number>([0, length - 1]);
  const candidates = shuffle(rng, Array.from({ length: length - 2 }, (_, i) => i + 1));
  for (const index of candidates) {
    if (chosen.size >= count) break;
    if (canPlaceWaypoint(index, chosen, MIN_WAYPOINT_GAP)) chosen.add(index);
  }
  return chosen;
}

function toLevel(
  config: GenerateConfig,
  path: readonly number[],
  waypointIndices: ReadonlySet<number>,
  walls: ReadonlySet<number>,
  nodes: number,
): Level {
  const { size } = config;
  const ordered = [...waypointIndices].sort((a, b) => a - b);
  return {
    id: config.id,
    size,
    waypoints: ordered.map((index, i) => {
      const [r, c] = cellRC(size, path[index] as number);
      return { n: i + 1, r, c };
    }),
    walls: [...walls]
      .sort((a, b) => a - b)
      .map((edge) => {
        const [a, b] = decodeEdge(edge);
        return edgeToWall(size, a, b);
      }),
    solution: path.map((cell) => cellRC(size, cell)),
    difficulty: difficultyScore({ size, waypointCount: ordered.length, wallCount: walls.size, solverNodes: nodes }),
    seed: config.seed,
  };
}

/**
 * Génère un niveau à solution unique :
 * 1. tire un chemin hamiltonien aléatoire (la future solution) ;
 * 2. place les feuilles le long de ce chemin et quelques murs hors du chemin ;
 * 3. tant que le solveur trouve une autre solution, ajoute un mur ou une feuille
 *    qui l'élimine ; si les limites sont atteintes, recommence avec un autre chemin.
 * Déterministe : même configuration (dont la graine) = même niveau.
 */
export function generateLevel(config: GenerateConfig, stats?: GenerateStats): Level {
  const { size, seed } = config;
  const [minWaypoints, maxWaypoints] = config.waypoints;
  const [minWalls, maxWalls] = config.walls;
  const maxAttempts = config.maxAttempts ?? 300;
  const maxNodes = config.maxNodes ?? 80_000;
  const total = size * size;
  if (minWaypoints < 2 || maxWaypoints < minWaypoints) throw new Error('Bornes de feuilles invalides');
  if (minWalls < 0 || maxWalls < minWalls) throw new Error('Bornes de murs invalides');

  const rng = createRng(seed);
  const edges = allEdges(size);
  const local: GenerateStats = { attempts: 0, fixSteps: 0, solverNodes: 0 };

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    local.attempts++;
    const path = randomHamiltonianPath(size, rng);
    const truePathEdges = pathEdges(path);

    const waypointIndices = pickWaypointIndices(rng, total, randInt(rng, minWaypoints, maxWaypoints));
    if (waypointIndices.size < minWaypoints) continue;

    // On commence avec peu de murs pour garder de la marge à la phase de correction.
    const walls = new Set<number>();
    const freeEdges = shuffle(rng, edges.filter((e) => !truePathEdges.has(e)));
    const initialWalls = randInt(rng, minWalls, Math.floor((minWalls + maxWalls) / 2));
    for (const e of freeEdges) {
      if (walls.size >= initialWalls) break;
      walls.add(e);
    }

    for (;;) {
      const waypointCells = [...waypointIndices].sort((a, b) => a - b).map((i) => path[i] as number);
      const result = solve(createPuzzle(size, waypointCells, walls), { limit: 2, maxNodes });
      local.solverNodes += result.nodes;
      if (result.aborted || result.count === 0) break;

      if (result.count === 1) {
        if (walls.size < minWalls) break;
        if (stats) Object.assign(stats, local);
        return toLevel(config, path, waypointIndices, walls, result.nodes);
      }

      // Plusieurs solutions : éliminer une solution alternative.
      local.fixSteps++;
      const alternative = result.solutions.find((s) => s.some((cell, i) => cell !== path[i]));
      if (!alternative) break;

      // Un mur sur une arête empruntée par l'alternative (et pas par la vraie solution) l'élimine.
      const wallCandidates = [...pathEdges(alternative)].filter((e) => !truePathEdges.has(e) && !walls.has(e));
      // Une feuille l'élimine si l'alternative ne la visite pas entre les feuilles qui l'encadrent.
      const killers = waypointKillers(path, alternative, waypointIndices);
      const spacedKillers = killers.filter((i) => canPlaceWaypoint(i, waypointIndices, MIN_WAYPOINT_GAP));

      const canAddWall = walls.size < maxWalls && wallCandidates.length > 0;
      const canAddWaypoint = waypointIndices.size < maxWaypoints && killers.length > 0;
      if (!canAddWall && !canAddWaypoint) break;

      if (canAddWall && (!canAddWaypoint || rng() < 0.5)) {
        walls.add(pick(rng, wallCandidates));
      } else {
        waypointIndices.add(pick(rng, spacedKillers.length > 0 ? spacedKillers : killers));
      }
    }
  }

  throw new Error(`Impossible de générer ${config.id} (taille ${size}) en ${maxAttempts} tentatives`);
}
