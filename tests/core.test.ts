import { describe, expect, it } from 'vitest';
import { createRng, hashSeed } from '../src/core/rng.ts';
import { areAdjacent, cellIndex, createPuzzle, edgeId, edgeToWall, isValidSolution, wallToEdge } from '../src/core/grid.ts';
import { randomHamiltonianPath, serpentine } from '../src/core/hamiltonian.ts';
import { solve, hasUniqueSolution } from '../src/core/solver.ts';
import { difficultyScore } from '../src/core/difficulty.ts';

function isHamiltonianPath(size: number, path: number[]): boolean {
  if (path.length !== size * size) return false;
  if (new Set(path).size !== path.length) return false;
  if (path.some((c) => c < 0 || c >= size * size)) return false;
  for (let i = 1; i < path.length; i++) {
    if (!areAdjacent(size, path[i - 1] as number, path[i] as number)) return false;
  }
  return true;
}

describe('rng', () => {
  it('est déterministe pour une même graine', () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 10 }, () => a());
    const seqB = Array.from({ length: 10 }, () => b());
    expect(seqA).toEqual(seqB);
    expect(seqA.every((x) => x >= 0 && x < 1)).toBe(true);
  });

  it('donne des suites différentes pour des graines différentes', () => {
    expect(createRng(1)()).not.toBe(createRng(2)());
  });

  it('hache une date de façon stable', () => {
    expect(hashSeed('d-2026-12-01')).toBe(hashSeed('d-2026-12-01'));
    expect(hashSeed('d-2026-12-01')).not.toBe(hashSeed('d-2026-12-02'));
  });
});

describe('grille', () => {
  it('convertit murs et arêtes dans les deux sens', () => {
    const size = 6;
    for (const wall of [{ r: 2, c: 3, side: 'E' as const }, { r: 4, c: 0, side: 'S' as const }]) {
      const edge = wallToEdge(size, wall);
      const a = Math.floor(edge / 4096);
      const b = edge % 4096;
      expect(edgeToWall(size, b, a)).toEqual(wall);
    }
  });

  it('refuse deux feuilles sur la même case', () => {
    expect(() => createPuzzle(3, [0, 0])).toThrow();
  });
});

describe('chemin hamiltonien', () => {
  it('le serpentin couvre toute la grille', () => {
    for (let size = 2; size <= 8; size++) expect(isHamiltonianPath(size, serpentine(size))).toBe(true);
  });

  it('le backbite produit toujours un chemin valide et déterministe', () => {
    for (let size = 2; size <= 8; size++) {
      for (let seed = 0; seed < 15; seed++) {
        const path = randomHamiltonianPath(size, createRng(seed));
        expect(isHamiltonianPath(size, path)).toBe(true);
        expect(randomHamiltonianPath(size, createRng(seed))).toEqual(path);
      }
    }
  });

  it('mélange réellement (pas toujours le serpentin)', () => {
    const paths = new Set(Array.from({ length: 10 }, (_, s) => randomHamiltonianPath(6, createRng(s)).join(',')));
    expect(paths.size).toBeGreaterThan(5);
  });
});

describe('solveur (cas faits à la main)', () => {
  // Grille 3×3, cases numérotées :
  //   0 1 2
  //   3 4 5
  //   6 7 8
  const rowSnake = [0, 1, 2, 5, 4, 3, 6, 7, 8];
  const columnSnake = [0, 3, 6, 7, 4, 1, 2, 5, 8];

  it('0 solution : départ et arrivée de couleurs incompatibles (parité)', () => {
    const result = solve(createPuzzle(3, [0, 1]));
    expect(result.count).toBe(0);
    expect(result.aborted).toBe(false);
  });

  it('0 solution : un mur isole une case', () => {
    // La case 2 (coin) n'a plus aucun voisin accessible.
    const puzzle = createPuzzle(3, [0, 8], [edgeId(1, 2), edgeId(2, 5)]);
    expect(solve(puzzle).count).toBe(0);
  });

  it('2+ solutions : coin à coin opposé sans contrainte', () => {
    const result = solve(createPuzzle(3, [0, 8]), { limit: 10 });
    expect(result.count).toBe(2);
    const found = result.solutions.map((s) => s.join(','));
    expect(found).toContain(rowSnake.join(','));
    expect(found).toContain(columnSnake.join(','));
  });

  it('1 solution : un mur élimine le serpentin vertical', () => {
    const puzzle = createPuzzle(3, [0, 8], [edgeId(0, 3)]);
    const result = solve(puzzle);
    expect(result.count).toBe(1);
    expect(result.solutions[0]).toEqual(rowSnake);
    expect(hasUniqueSolution(puzzle)).toBe(true);
  });

  it("1 solution : l'ordre des feuilles élimine le serpentin vertical", () => {
    // Feuilles : 1 = case 0, 2 = case 1, 3 = case 3, 4 = case 8.
    const puzzle = createPuzzle(3, [0, 1, 3, 8]);
    const result = solve(puzzle);
    expect(result.count).toBe(1);
    expect(result.solutions[0]).toEqual(rowSnake);
  });

  it('2×2 : une seule façon de relier deux coins voisins', () => {
    const result = solve(createPuzzle(2, [0, 1]));
    expect(result.count).toBe(1);
    expect(result.solutions[0]).toEqual([0, 2, 3, 1]);
  });

  it("s'interrompt proprement quand le budget de nœuds est dépassé", () => {
    const result = solve(createPuzzle(8, [0, 63]), { limit: 1_000_000, maxNodes: 50 });
    expect(result.aborted).toBe(true);
  });
});

describe('isValidSolution', () => {
  const puzzle = createPuzzle(3, [0, 1, 3, 8]);

  it('accepte la bonne solution', () => {
    expect(isValidSolution(puzzle, [0, 1, 2, 5, 4, 3, 6, 7, 8])).toBe(true);
  });

  it('refuse les feuilles dans le désordre', () => {
    expect(isValidSolution(puzzle, [0, 3, 6, 7, 4, 1, 2, 5, 8])).toBe(false);
  });

  it('refuse un saut non adjacent, une case manquante ou un mur traversé', () => {
    expect(isValidSolution(puzzle, [0, 1, 2, 4, 5, 3, 6, 7, 8])).toBe(false);
    expect(isValidSolution(puzzle, [0, 1, 2, 5, 4, 3, 6, 7])).toBe(false);
    const walled = createPuzzle(3, [0, 1, 3, 8], [edgeId(4, 3)]);
    expect(isValidSolution(walled, [0, 1, 2, 5, 4, 3, 6, 7, 8])).toBe(false);
  });

  it('refuse un chemin qui ne finit pas sur la dernière feuille', () => {
    const p = createPuzzle(3, [0, cellIndex(3, 2, 2)]);
    expect(isValidSolution(p, [0, 1, 2, 5, 8, 7, 4, 3, 6])).toBe(false);
  });
});

describe('difficulté', () => {
  it('reste dans [1, 100] et croît avec l’effort du solveur', () => {
    const base = { size: 6, waypointCount: 6, wallCount: 2 };
    const scores = [0, 10, 100, 1_000, 10_000, 100_000, 10_000_000].map((n) => difficultyScore({ ...base, solverNodes: n }));
    expect(scores.every((s) => s >= 1 && s <= 100)).toBe(true);
    for (let i = 1; i < scores.length; i++) expect(scores[i]).toBeGreaterThanOrEqual(scores[i - 1] as number);
    expect(scores[0]).toBe(1);
    expect(scores[scores.length - 1]).toBe(100);
  });
});
