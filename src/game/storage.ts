/** Progression sauvegardée dans le navigateur (localStorage). Toute erreur est ignorée : le jeu reste jouable. */

const KEY = 'escargot-express:v1';

export interface SaveData {
  /** Plus haut niveau de campagne débloqué (1-indexé). */
  unlocked: number;
  /** Dernier niveau de campagne ouvert. */
  current: number;
  /** Meilleur temps (secondes) par identifiant de niveau. */
  best: Record<string, number>;
  /** Dates (AAAA-MM-JJ) des défis du jour réussis. */
  dailyDone: string[];
}

const DEFAULT: SaveData = { unlocked: 1, current: 1, best: {}, dailyDone: [] };

export function load(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULT);
    return { ...structuredClone(DEFAULT), ...(JSON.parse(raw) as Partial<SaveData>) };
  } catch {
    return structuredClone(DEFAULT);
  }
}

export function save(data: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Stockage indisponible (navigation privée, iframe…) : on continue sans sauvegarde.
  }
}
