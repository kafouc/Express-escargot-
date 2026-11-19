/** Progression et réglages sauvegardés dans le navigateur (localStorage). Toute erreur est ignorée : le jeu reste jouable. */

const KEY = 'escargot-express:v1';

export interface DailyResult {
  /** Temps du premier succès du jour (le « résultat officiel »). */
  seconds: number;
  hints: number;
}

export interface SaveData {
  /** Plus haut niveau de campagne débloqué (1-indexé). */
  unlocked: number;
  /** Dernier niveau de campagne ouvert. */
  current: number;
  /** Meilleur temps (secondes) par identifiant de niveau. */
  best: Record<string, number>;
  /** Dates (AAAA-MM-JJ) des défis du jour réussis. */
  dailyDone: string[];
  /** Résultat officiel de chaque défi du jour (premier succès). */
  dailyResults: Record<string, DailyResult>;
  /** Personnage choisi (cf. characters.ts). */
  character: string;
  /** Couleur des feuilles choisie (cf. characters.ts). */
  leafColor: string;
  sound: boolean;
  vibration: boolean;
  showTimer: boolean;
  /** Langue choisie ; vide = langue du navigateur. */
  language: '' | 'fr' | 'en';
  /** Achat « sans pub » (prévu, sans écran d'achat pour l'instant — brief §7). */
  noAds: boolean;
}

const DEFAULT: SaveData = {
  unlocked: 1,
  current: 1,
  best: {},
  dailyDone: [],
  dailyResults: {},
  character: 'escargot',
  leafColor: 'vert',
  sound: true,
  vibration: true,
  showTimer: true,
  language: '',
  noAds: false,
};

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
