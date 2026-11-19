import { cellIndex, isValidSolution, levelToPuzzle } from './grid.ts';
import { solve } from './solver.ts';
import type { Level } from './types.ts';

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

/**
 * Vérifie un niveau exporté de bout en bout :
 * format, solution fournie valide, et solution unique (recherche complète du solveur).
 */
export function validateLevel(level: Level, maxNodes = 5_000_000): ValidationResult {
  const errors: string[] = [];
  try {
    if (!Number.isInteger(level.size)) errors.push('taille non entière');
    if (level.difficulty < 1 || level.difficulty > 100) errors.push(`difficulté hors bornes : ${level.difficulty}`);
    if (level.solution.length !== level.size * level.size) errors.push('solution de longueur incorrecte');

    const puzzle = levelToPuzzle(level);
    const path = level.solution.map(([r, c]) => cellIndex(level.size, r, c));
    if (!isValidSolution(puzzle, path)) errors.push('la solution fournie ne respecte pas les règles');

    const result = solve(puzzle, { limit: 2, maxNodes });
    if (result.aborted) errors.push('recherche interrompue (trop de nœuds)');
    else if (result.count === 0) errors.push('aucune solution');
    else if (result.count > 1) errors.push('plusieurs solutions');
    else if (result.solutions[0]?.some((cell, i) => cell !== path[i])) {
      errors.push('la solution trouvée diffère de la solution exportée');
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  return { ok: errors.length === 0, errors };
}
