import { cellIndex, neighborsOf } from './grid.ts';
import { pick, type Rng } from './rng.ts';

/** Chemin en serpentin (boustrophédon) : un chemin hamiltonien trivial qui couvre toute la grille. */
export function serpentine(size: number): number[] {
  const path: number[] = [];
  for (let r = 0; r < size; r++) {
    for (let k = 0; k < size; k++) {
      const c = r % 2 === 0 ? k : size - 1 - k;
      path.push(cellIndex(size, r, c));
    }
  }
  return path;
}

function reverseRange(path: number[], from: number, to: number): void {
  for (let i = from, j = to; i < j; i++, j--) {
    const tmp = path[i] as number;
    path[i] = path[j] as number;
    path[j] = tmp;
  }
}

/**
 * Chemin hamiltonien aléatoire par l'algorithme « backbite » :
 * on part d'un serpentin et on répète des mouvements qui reconnectent une extrémité
 * à une case voisine du chemin, en retournant une portion du chemin.
 * Chaque mouvement conserve un chemin hamiltonien valide.
 */
export function randomHamiltonianPath(size: number, rng: Rng, iterations = 60 * size * size): number[] {
  const neighbors = neighborsOf(size);
  const path = serpentine(size);
  const last = path.length - 1;
  const position = new Int32Array(path.length);
  const reindex = (from: number, to: number) => {
    for (let i = from; i <= to; i++) position[path[i] as number] = i;
  };
  reindex(0, last);

  for (let step = 0; step < iterations; step++) {
    if (rng() < 0.5) {
      // Extrémité de départ : relier path[0] à un voisin path[i], couper (path[i-1], path[i]).
      const head = path[0] as number;
      const target = pick(rng, neighbors[head] as number[]);
      const i = position[target] as number;
      if (i === 1) continue;
      reverseRange(path, 0, i - 1);
      reindex(0, i - 1);
    } else {
      // Extrémité d'arrivée : relier path[last] à un voisin path[i], couper (path[i], path[i+1]).
      const tail = path[last] as number;
      const target = pick(rng, neighbors[tail] as number[]);
      const i = position[target] as number;
      if (i === last - 1) continue;
      reverseRange(path, i + 1, last);
      reindex(i + 1, last);
    }
  }
  return path;
}
