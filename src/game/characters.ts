/**
 * Personnages jouables et couleurs de feuilles.
 * Tous les animaux sont dessinés en vectoriel (cf. animals.ts) et animés partie par partie.
 */
import { ANIMAL_DRAWERS } from './animals.ts';

/** Façon de se déplacer : glisser (étirement), sautiller, se dandiner. */
export type Motion = 'slide' | 'hop' | 'waddle';

export interface TrailStyle {
  edge: string;
  fill: string;
  shine: string;
}

export interface Character {
  id: string;
  name: string;
  /** Niveau de campagne à débloquer pour l'utiliser. */
  unlockLevel: number;
  motion: Motion;
  trail: TrailStyle;
  /** Nom de la traînée affiché dans le menu. */
  trailName: string;
}

export const CHARACTERS: Character[] = [
  {
    id: 'escargot', name: 'Escargot', unlockLevel: 1, motion: 'slide',
    trailName: 'bave brillante',
    trail: { edge: '#6f9a6d', fill: '#8db38b', shine: 'rgba(255,255,255,0.45)' },
  },
  {
    id: 'chenille', name: 'Chenille', unlockLevel: 10, motion: 'slide',
    trailName: 'feuilles grignotées',
    trail: { edge: '#7aa63a', fill: '#a6cf5f', shine: 'rgba(255,255,220,0.45)' },
  },
  {
    id: 'tortue', name: 'Tortue', unlockLevel: 25, motion: 'waddle',
    trailName: 'sable',
    trail: { edge: '#c9a66b', fill: '#e6cf9c', shine: 'rgba(255,255,255,0.4)' },
  },
  {
    id: 'coccinelle', name: 'Coccinelle', unlockLevel: 50, motion: 'waddle',
    trailName: 'pétales',
    trail: { edge: '#e08a8a', fill: '#f4b9b2', shine: 'rgba(255,255,255,0.5)' },
  },
  {
    id: 'herisson', name: 'Hérisson', unlockLevel: 80, motion: 'waddle',
    trailName: 'feuilles mortes',
    trail: { edge: '#b07a4a', fill: '#d9a877', shine: 'rgba(255,240,210,0.45)' },
  },
  {
    id: 'lapin', name: 'Lapin', unlockLevel: 120, motion: 'hop',
    trailName: 'trèfles',
    trail: { edge: '#8fb7c9', fill: '#bfdbe6', shine: 'rgba(255,255,255,0.5)' },
  },
  {
    id: 'poussin', name: 'Poussin', unlockLevel: 160, motion: 'hop',
    trailName: 'plumes',
    trail: { edge: '#e3bd3d', fill: '#f6dd84', shine: 'rgba(255,255,255,0.5)' },
  },
];

export interface LeafColor {
  id: string;
  name: string;
  /** Feuille pas encore atteinte. */
  fill: string;
  /** Feuille déjà atteinte. */
  done: string;
  /** Nervure. */
  vein: string;
  /** Anneau autour de la prochaine feuille. */
  ring: string;
}

export const LEAF_COLORS: LeafColor[] = [
  { id: 'vert', name: 'Vert', fill: '#3e7d4f', done: '#a9c9a4', vein: '#2c5c39', ring: '#e8775b' },
  { id: 'corail', name: 'Corail', fill: '#d9573a', done: '#f0b3a3', vein: '#a63f27', ring: '#3e7d4f' },
  { id: 'bleu', name: 'Bleu', fill: '#2f6fb3', done: '#a9c6e8', vein: '#22507f', ring: '#e8775b' },
  { id: 'violet', name: 'Violet', fill: '#7b4fb0', done: '#cbb6e5', vein: '#5a3784', ring: '#e8775b' },
  { id: 'or', name: 'Or', fill: '#c48f12', done: '#ead69c', vein: '#8f680c', ring: '#3e7d4f' },
  { id: 'rose', name: 'Rose', fill: '#cf4d88', done: '#f1b8d1', vein: '#9b3664', ring: '#3e7d4f' },
  { id: 'nuit', name: 'Nuit', fill: '#2e3a4a', done: '#aab3bf', vein: '#1c2530', ring: '#e8775b' },
];

export const characterById = (id: string): Character =>
  CHARACTERS.find((c) => c.id === id) ?? (CHARACTERS[0] as Character);

export const leafColorById = (id: string): LeafColor =>
  LEAF_COLORS.find((c) => c.id === id) ?? (LEAF_COLORS[0] as LeafColor);

export const isUnlocked = (character: Character, unlockedLevel: number): boolean =>
  unlockedLevel >= character.unlockLevel;

// ---------------------------------------------------------------------------
// Dessin des personnages
// ---------------------------------------------------------------------------

export interface Pose {
  /** Taille d'une case en pixels. */
  cell: number;
  /** Temps en millisecondes (pour les animations en boucle). */
  time: number;
  /** 0 = immobile, 1 = en pleine course. */
  moving: number;
  /** Phase du pas (augmente avec la distance parcourue, en cases). */
  stride: number;
  /** 1 = regarde à droite, -1 = à gauche. */
  facing: 1 | -1;
  /** Inclinaison (radians) vers le haut ou le bas quand il monte ou descend. */
  tilt: number;
  /** 0 → 1 pendant le saut de joie de la victoire, sinon 0. */
  joy: number;
  /** 0 → 1 pendant la secousse d'un refus, sinon 0. */
  shake: number;
}

/** Dessine le personnage centré sur l'origine du contexte (déjà translaté au centre de la case). */
export function drawCharacter(ctx: CanvasRenderingContext2D, character: Character, pose: Pose): void {
  const { cell } = pose;
  ctx.save();

  // Secousse latérale (refus) et saut de joie (victoire).
  if (pose.shake > 0) ctx.translate(Math.sin(pose.shake * Math.PI * 6) * cell * 0.09 * (1 - pose.shake), 0);
  if (pose.joy > 0) {
    ctx.translate(0, -Math.sin(pose.joy * Math.PI) * cell * 0.45);
    ctx.rotate(pose.joy * Math.PI * 2 * pose.facing);
  }

  // Ombre portée.
  ctx.fillStyle = 'rgba(60,45,30,0.16)';
  ctx.beginPath();
  ctx.ellipse(0, cell * 0.22, cell * 0.26, cell * 0.06, 0, 0, Math.PI * 2);
  ctx.fill();

  let lift = 0;
  let squash = 1;
  let wobble = 0;
  const breathe = 1 + Math.sin(pose.time / 450) * 0.025 * (1 - pose.moving);
  switch (character.motion) {
    case 'slide':
      // S'étire vers l'avant et se tasse en rythme avec le pas.
      squash = 1 + Math.sin(pose.stride * Math.PI * 2) * 0.1 * pose.moving + 0.06 * pose.moving;
      break;
    case 'hop':
      lift = Math.abs(Math.sin(pose.stride * Math.PI)) * cell * 0.22 * pose.moving;
      squash = 1 - (lift / cell) * 0.4;
      break;
    case 'waddle':
      wobble = Math.sin(pose.stride * Math.PI * 2) * 0.16 * pose.moving;
      break;
  }

  ctx.translate(0, -lift);
  ctx.rotate(wobble + pose.tilt * pose.facing);
  ctx.scale(pose.facing * squash * breathe, (1 / squash) * breathe);

  const draw = ANIMAL_DRAWERS[character.id] ?? ANIMAL_DRAWERS.escargot;
  draw?.(ctx, pose);
  ctx.restore();
}

/** Dessine une feuille (forme pointue avec nervure) centrée sur l'origine, avec son numéro. */
export function drawLeaf(ctx: CanvasRenderingContext2D, size: number, color: string, vein: string, label: string, angle = -0.5): void {
  const w = size * 1.15;
  const h = size * 0.78;
  ctx.save();
  ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-w, 0);
  ctx.quadraticCurveTo(0, -h * 1.35, w, 0);
  ctx.quadraticCurveTo(0, h * 1.35, -w, 0);
  ctx.closePath();
  ctx.fill();
  // Petite tige et nervure centrale.
  ctx.strokeStyle = vein;
  ctx.lineWidth = Math.max(1, size * 0.07);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-w * 1.18, 0);
  ctx.lineTo(w * 0.8, 0);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = vein;
  ctx.lineWidth = Math.max(2, size * 0.12);
  ctx.lineJoin = 'round';
  ctx.font = `800 ${Math.round(size * 0.95)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.strokeText(label, 0, size * 0.04);
  ctx.fillText(label, 0, size * 0.04);
}
