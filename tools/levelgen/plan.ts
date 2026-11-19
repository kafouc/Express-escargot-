/** Plan de contenu : tranches de la campagne et difficulté des défis quotidiens (docs/brief.md §5.4–5.5). */

export interface Tranche {
  /** Premier et dernier numéro de niveau (1-indexés, inclus). */
  from: number;
  to: number;
  size: number;
  waypoints: [number, number];
  walls: [number, number];
}

/**
 * Campagne de 200 niveaux. La tranche 4–30 du brief (5×5 / 6×6) est coupée en deux
 * pour que la taille de grille ne fasse pas de va-et-vient.
 */
export const CAMPAIGN: Tranche[] = [
  { from: 1, to: 3, size: 5, waypoints: [6, 8], walls: [0, 0] },
  { from: 4, to: 17, size: 5, waypoints: [5, 8], walls: [0, 2] },
  { from: 18, to: 30, size: 6, waypoints: [5, 8], walls: [0, 2] },
  { from: 31, to: 80, size: 6, waypoints: [4, 7], walls: [0, 4] },
  { from: 81, to: 140, size: 7, waypoints: [4, 8], walls: [0, 6] },
  { from: 141, to: 200, size: 8, waypoints: [6, 12], walls: [0, 10] },
];

export interface DailyConfig {
  size: number;
  waypoints: [number, number];
  walls: [number, number];
  /** Difficulté visée : parmi plusieurs candidats, on garde le plus proche. */
  target?: number;
}

/** Nombre de candidats générés par défi quotidien pour viser la difficulté du jour. */
export const DAILY_CANDIDATES = 4;

/** Configuration par jour de la semaine (0 = dimanche … 6 = samedi) : lundi le plus facile, dimanche le plus dur. */
export const DAILY_BY_WEEKDAY: Record<number, DailyConfig> = {
  1: { size: 5, waypoints: [6, 8], walls: [0, 2], target: 15 },
  2: { size: 6, waypoints: [6, 8], walls: [0, 3], target: 28 },
  3: { size: 6, waypoints: [4, 6], walls: [0, 4], target: 40 },
  4: { size: 7, waypoints: [6, 9], walls: [0, 5], target: 47 },
  5: { size: 7, waypoints: [4, 7], walls: [0, 6], target: 54 },
  6: { size: 8, waypoints: [7, 12], walls: [0, 10], target: 60 },
  0: { size: 8, waypoints: [6, 12], walls: [0, 10], target: 70 },
};

export const WEEKDAY_NAMES = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

/** Plages par défaut pour un lot libre (`--size`). */
export function defaultRangesForSize(size: number): DailyConfig {
  const tranche = [...CAMPAIGN].reverse().find((t) => t.size === size);
  if (tranche) return { size, waypoints: tranche.waypoints, walls: tranche.walls };
  return { size, waypoints: [Math.max(3, size), Math.min(12, size * 2)], walls: [0, size] };
}

/** Ajoute `days` jours à une date ISO « AAAA-MM-JJ » (calcul en UTC). */
export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) throw new Error(`Date invalide : ${isoDate}`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function weekdayOf(isoDate: string): number {
  return new Date(`${isoDate}T00:00:00Z`).getUTCDay();
}
