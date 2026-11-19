export interface DifficultyInput {
  /** size, waypointCount et wallCount sont conservés pour une future recalibration. */
  size: number;
  waypointCount: number;
  wallCount: number;
  /** Nœuds explorés par le solveur pour prouver l'unicité (recherche complète, limite 2). */
  solverNodes: number;
}

/**
 * Bornes de calibration de l'effort de recherche, en log2(1 + nœuds).
 * Mesuré sur 20 niveaux par taille (nov. 2026) :
 *   5×5 ≈ 5–9 · 6×6 ≈ 7–11 · 7×7 ≈ 8–14 · 8×8 ≈ 9–15.
 */
const LOG_NODES_EASY = 4;
const LOG_NODES_HARD = 16;

/**
 * Score de difficulté de 1 à 100.
 *
 * Formule : 100 × (log2(1 + nœuds du solveur) − 4) / (16 − 4), bornée à [1, 100].
 *
 * L'effort du solveur résume à la fois la taille de la grille (plus de cases)
 * et la rareté des feuilles et des murs (moins de contraintes, plus d'impasses à éliminer).
 * C'est une approximation de la difficulté perçue : à recalibrer avec les temps
 * de résolution réels des joueurs (événement analytics `level_complete`).
 */
export function difficultyScore(input: DifficultyInput): number {
  const effort = Math.log2(1 + Math.max(0, input.solverNodes));
  const normalized = (effort - LOG_NODES_EASY) / (LOG_NODES_HARD - LOG_NODES_EASY);
  return Math.max(1, Math.min(100, Math.round(normalized * 100)));
}
