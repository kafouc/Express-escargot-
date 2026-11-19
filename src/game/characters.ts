/**
 * Personnages jouables et couleurs de feuilles.
 * L'escargot est dessiné en vectoriel (animé partie par partie) ; les autres animaux
 * utilisent l'emoji du système, animé selon leur façon de se déplacer.
 */

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
  /** Emoji affiché dans le menu (et en jeu, sauf pour l'escargot dessiné). */
  emoji: string;
  /** Niveau de campagne à débloquer pour l'utiliser. */
  unlockLevel: number;
  motion: Motion;
  trail: TrailStyle;
  /** Nom de la traînée affiché dans le menu. */
  trailName: string;
  /** Dessiné en vectoriel plutôt qu'avec l'emoji. */
  drawn?: boolean;
}

export const CHARACTERS: Character[] = [
  {
    id: 'escargot', name: 'Escargot', emoji: '🐌', unlockLevel: 1, motion: 'slide', drawn: true,
    trailName: 'bave brillante',
    trail: { edge: '#6f9a6d', fill: '#8db38b', shine: 'rgba(255,255,255,0.45)' },
  },
  {
    id: 'chenille', name: 'Chenille', emoji: '🐛', unlockLevel: 10, motion: 'slide',
    trailName: 'feuilles grignotées',
    trail: { edge: '#7aa63a', fill: '#a6cf5f', shine: 'rgba(255,255,220,0.45)' },
  },
  {
    id: 'tortue', name: 'Tortue', emoji: '🐢', unlockLevel: 25, motion: 'waddle',
    trailName: 'sable',
    trail: { edge: '#c9a66b', fill: '#e6cf9c', shine: 'rgba(255,255,255,0.4)' },
  },
  {
    id: 'coccinelle', name: 'Coccinelle', emoji: '🐞', unlockLevel: 50, motion: 'waddle',
    trailName: 'pétales',
    trail: { edge: '#e08a8a', fill: '#f4b9b2', shine: 'rgba(255,255,255,0.5)' },
  },
  {
    id: 'herisson', name: 'Hérisson', emoji: '🦔', unlockLevel: 80, motion: 'waddle',
    trailName: 'feuilles mortes',
    trail: { edge: '#b07a4a', fill: '#d9a877', shine: 'rgba(255,240,210,0.45)' },
  },
  {
    id: 'lapin', name: 'Lapin', emoji: '🐇', unlockLevel: 120, motion: 'hop',
    trailName: 'trèfles',
    trail: { edge: '#8fb7c9', fill: '#bfdbe6', shine: 'rgba(255,255,255,0.5)' },
  },
  {
    id: 'poussin', name: 'Poussin', emoji: '🐥', unlockLevel: 160, motion: 'hop',
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

  if (character.drawn) drawSnail(ctx, pose);
  else drawEmoji(ctx, character.emoji, cell);
  ctx.restore();
}

function drawEmoji(ctx: CanvasRenderingContext2D, emoji: string, cell: number): void {
  // La plupart des emojis d'animaux regardent vers la gauche : on les retourne pour qu'ils regardent vers +x.
  ctx.scale(-1, 1);
  // Les emojis couleur héritent de l'opacité de fillStyle : on repart d'une couleur opaque.
  ctx.fillStyle = '#000000';
  ctx.font = `${Math.round(cell * 0.62)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, 0, -cell * 0.04);
}

/** Escargot vectoriel, tourné vers +x : corps qui ondule, coquille qui roule, antennes qui oscillent. */
function drawSnail(ctx: CanvasRenderingContext2D, pose: Pose): void {
  const u = pose.cell;
  const t = pose.time;
  const wave = Math.sin(pose.stride * Math.PI * 2);

  // Corps : une limace arrondie, plus longue quand il avance.
  const front = 0.34 + 0.04 * pose.moving;
  ctx.fillStyle = '#efcfa3';
  ctx.strokeStyle = '#c99e6c';
  ctx.lineWidth = u * 0.025;
  ctx.beginPath();
  ctx.moveTo(-0.36 * u, 0.2 * u);
  ctx.quadraticCurveTo(-0.38 * u, 0.1 * u, -0.22 * u, 0.1 * u);
  ctx.lineTo(0.16 * u, 0.1 * u + wave * 0.01 * u);
  ctx.quadraticCurveTo(front * u, 0.06 * u, front * u, -0.04 * u);
  ctx.quadraticCurveTo((front + 0.03) * u, 0.2 * u, 0.2 * u, 0.2 * u);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Antennes qui oscillent, plus vite en mouvement.
  const sway = Math.sin(t / (pose.moving > 0.2 ? 90 : 260)) * 0.06;
  const stalks: [number, number, number][] = [
    [0.25, -0.17, sway],
    [0.33, -0.13, -sway * 0.8],
  ];
  for (const [x, y, s] of stalks) {
    const tipX = (x + s) * u;
    const tipY = y * u;
    ctx.strokeStyle = '#c99e6c';
    ctx.lineWidth = u * 0.03;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0.24 * u, 0.0);
    ctx.quadraticCurveTo((x - 0.02) * u, (y + 0.08) * u, tipX, tipY);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(tipX, tipY, u * 0.04, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2d2620';
    ctx.beginPath();
    ctx.arc(tipX + u * 0.012, tipY, u * 0.02, 0, Math.PI * 2);
    ctx.fill();
  }

  // Joue rosée et sourire.
  ctx.fillStyle = 'rgba(232,119,91,0.35)';
  ctx.beginPath();
  ctx.arc(0.27 * u, 0.06 * u, u * 0.03, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#8b6a45';
  ctx.lineWidth = u * 0.018;
  ctx.beginPath();
  ctx.arc(0.29 * u, 0.03 * u, u * 0.035, 0.2, Math.PI - 0.6);
  ctx.stroke();

  // Coquille qui roule légèrement en avançant.
  const bob = Math.sin(pose.stride * Math.PI * 2 + 1) * 0.015 * u * pose.moving + Math.sin(t / 500) * 0.006 * u;
  ctx.save();
  ctx.translate(-0.08 * u, -0.06 * u + bob);
  ctx.rotate(pose.stride * 0.6 * pose.moving);
  const r = 0.21 * u;
  const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
  grad.addColorStop(0, '#f0a274');
  grad.addColorStop(1, '#c4673f');
  ctx.fillStyle = grad;
  ctx.strokeStyle = '#8e4a2e';
  ctx.lineWidth = u * 0.025;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Spirale.
  ctx.strokeStyle = '#9b5534';
  ctx.lineWidth = u * 0.022;
  ctx.beginPath();
  for (let a = 0; a <= Math.PI * 4.2; a += 0.15) {
    const rr = r * 0.82 * (1 - a / (Math.PI * 4.6));
    const x = Math.cos(a) * rr;
    const y = Math.sin(a) * rr;
    if (a === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  // Reflet.
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.35, -r * 0.45, r * 0.25, r * 0.12, -0.6, 0, Math.PI * 2);
  ctx.fill();
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
