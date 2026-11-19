import { neighborsOf, edgeId, type Puzzle } from './grid.ts';

export interface SolveOptions {
  /** Arrête la recherche dès que ce nombre de solutions est trouvé (2 suffit pour tester l'unicité). */
  limit?: number;
  /** Garde-fou : nombre maximal de nœuds explorés avant abandon. */
  maxNodes?: number;
}

export interface SolveResult {
  /** Nombre de solutions trouvées (plafonné à `limit`). */
  count: number;
  /** Les solutions trouvées, chacune sous forme de liste d'indices de cases. */
  solutions: number[][];
  /** Nombre de nœuds explorés (sert à la mesure de difficulté). */
  nodes: number;
  /** Vrai si la recherche a atteint `maxNodes` : le résultat n'est alors pas fiable. */
  aborted: boolean;
}

/** Voisins accessibles (sans mur) de chaque case. */
export function openNeighbors(puzzle: Puzzle): number[][] {
  const base = neighborsOf(puzzle.size);
  return base.map((list, cell) => list.filter((n) => !puzzle.walls.has(edgeId(cell, n))));
}

/**
 * Compte les solutions d'un puzzle par recherche en profondeur avec élagage :
 * - ordre des feuilles (on refuse une feuille hors ordre, et la dernière avant la fin) ;
 * - parité (la grille est un damier : les couleurs restantes doivent alterner) ;
 * - degrés (une case restante a besoin d'une entrée et d'une sortie, sauf l'arrivée) ;
 * - connexité (toutes les cases restantes doivent rester atteignables).
 */
export function solve(puzzle: Puzzle, options: SolveOptions = {}): SolveResult {
  const limit = options.limit ?? 2;
  const maxNodes = options.maxNodes ?? 20_000_000;
  const { size, waypointAt, waypointCells } = puzzle;
  const total = size * size;
  const open = openNeighbors(puzzle);
  const lastWaypoint = waypointCells.length;
  const startCell = waypointCells[0] as number;
  const endCell = waypointCells[lastWaypoint - 1] as number;

  const color = new Uint8Array(total);
  for (let i = 0; i < total; i++) color[i] = (Math.floor(i / size) + (i % size)) % 2;

  const visited = new Uint8Array(total);
  const path: number[] = [startCell];
  const solutions: number[][] = [];
  const queue = new Int32Array(total);
  const seen = new Uint8Array(total);

  visited[startCell] = 1;
  let remaining = total - 1;
  const remainingByColor = [0, 0];
  for (let i = 0; i < total; i++) if (i !== startCell) remainingByColor[color[i] as number]!++;

  let nextWaypoint = 2;
  let nodes = 0;
  let aborted = false;

  function feasible(head: number): boolean {
    // Parité : les cases restantes alternent en commençant par la couleur opposée à la tête.
    const headColor = color[head] as number;
    const other = 1 - headColor;
    if (remainingByColor[other] !== Math.ceil(remaining / 2)) return false;
    if (remainingByColor[headColor] !== Math.floor(remaining / 2)) return false;

    // Degrés.
    for (let u = 0; u < total; u++) {
      if (visited[u]) continue;
      let degree = 0;
      for (const v of open[u] as number[]) {
        if (!visited[v] || v === head) degree++;
      }
      if (degree < (u === endCell ? 1 : 2)) return false;
    }

    // Connexité depuis la tête.
    seen.fill(0);
    let qHead = 0;
    let qTail = 0;
    queue[qTail++] = head;
    seen[head] = 1;
    let reached = 0;
    while (qHead < qTail) {
      const u = queue[qHead++] as number;
      for (const v of open[u] as number[]) {
        if (seen[v] || visited[v]) continue;
        seen[v] = 1;
        reached++;
        queue[qTail++] = v;
      }
    }
    return reached === remaining;
  }

  function dfs(head: number): void {
    nodes++;
    if (nodes > maxNodes) {
      aborted = true;
      return;
    }
    if (remaining === 0) {
      if (head === endCell) solutions.push([...path]);
      return;
    }
    if (!feasible(head)) return;

    for (const v of open[head] as number[]) {
      if (visited[v]) continue;
      const w = waypointAt[v] as number;
      if (w !== 0) {
        if (w !== nextWaypoint) continue;
        if (w === lastWaypoint && remaining !== 1) continue;
      }

      visited[v] = 1;
      remaining--;
      remainingByColor[color[v] as number]!--;
      if (w !== 0) nextWaypoint++;
      path.push(v);

      dfs(v);

      path.pop();
      if (w !== 0) nextWaypoint--;
      remainingByColor[color[v] as number]!++;
      remaining++;
      visited[v] = 0;

      if (solutions.length >= limit || aborted) return;
    }
  }

  dfs(startCell);
  return { count: solutions.length, solutions, nodes, aborted };
}

/** Vrai si le puzzle a exactement une solution (recherche complète, non interrompue). */
export function hasUniqueSolution(puzzle: Puzzle, maxNodes?: number): boolean {
  const result = solve(puzzle, { limit: 2, maxNodes });
  return !result.aborted && result.count === 1;
}
