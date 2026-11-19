/** Côté d'une case sur lequel se trouve un mur. Seuls E (est) et S (sud) sont stockés. */
export type WallSide = 'E' | 'S';

/** Une case de la grille : ligne r, colonne c (0 = en haut à gauche). */
export interface Cell {
  r: number;
  c: number;
}

/** Feuille numérotée que l'escargot doit atteindre dans l'ordre (n = 1 … K). */
export interface Waypoint extends Cell {
  n: number;
}

/** Mur entre la case (r, c) et sa voisine à l'est (E) ou au sud (S). */
export interface Wall extends Cell {
  side: WallSide;
}

/** Format d'export d'un niveau (cf. docs/brief.md §5.6). */
export interface Level {
  id: string;
  size: number;
  waypoints: Waypoint[];
  walls: Wall[];
  /** Solution unique, case par case. Sert aux indices et aux tests : ne jamais l'afficher. */
  solution: [number, number][];
  /** Score de difficulté de 1 à 100. */
  difficulty: number;
  seed: number;
}
