/**
 * Animaux dessinés en vectoriel sur canvas, tous tournés vers +x (la droite),
 * centrés sur l'origine, le sol vers y = +0.22 case. Chaque partie est animée
 * à partir de la pose : pas (stride), mouvement, temps.
 */

export interface AnimalPose {
  /** Taille d'une case en pixels : toutes les cotes sont en fractions de case. */
  cell: number;
  /** Temps en millisecondes. */
  time: number;
  /** 0 = immobile, 1 = en mouvement. */
  moving: number;
  /** Phase du pas (distance parcourue, en cases). */
  stride: number;
}

export type AnimalDrawer = (ctx: CanvasRenderingContext2D, pose: AnimalPose) => void;

const TAU = Math.PI * 2;

// ---------- Petits outils de dessin ----------

type Paint = string | CanvasGradient;

function ellipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rotation: number, fill: Paint, stroke?: string, line = 0): void {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(rx, 0.1), Math.max(ry, 0.1), rotation, 0, TAU);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = line;
    ctx.stroke();
  }
}

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: Paint, stroke?: string, line = 0): void {
  ellipse(ctx, x, y, r, r, 0, fill, stroke, line);
}

function line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string, width: number): void {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.stroke();
}

/** Les yeux clignent brièvement toutes les ~3,5 s (décalé selon `offset`). */
function isBlinking(time: number, offset = 0): boolean {
  return (time + offset) % 3600 < 110;
}

/** Œil : blanc, pupille, reflet ; trait fermé pendant un clignement. */
function eye(ctx: CanvasRenderingContext2D, u: number, x: number, y: number, r: number, time: number, offset = 0): void {
  if (isBlinking(time, offset)) {
    line(ctx, x - r, y, x + r, y, '#2d2620', u * 0.02);
    return;
  }
  circle(ctx, x, y, r, '#ffffff');
  circle(ctx, x + r * 0.25, y + r * 0.05, r * 0.6, '#2d2620');
  circle(ctx, x + r * 0.45, y - r * 0.25, r * 0.22, '#ffffff');
}

function blush(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  circle(ctx, x, y, r, 'rgba(240,120,110,0.35)');
}

function smile(ctx: CanvasRenderingContext2D, u: number, x: number, y: number, r: number, color = '#5a3e2b'): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0.25, Math.PI - 0.5);
  ctx.strokeStyle = color;
  ctx.lineWidth = u * 0.018;
  ctx.lineCap = 'round';
  ctx.stroke();
}

/** Balancement d'une patte : alterne selon `phase` (0 ou 0.5), amplifié en mouvement. */
const swing = (pose: AnimalPose, phase: number, amplitude: number) =>
  Math.sin((pose.stride + phase) * TAU) * amplitude * pose.moving;

// ---------- Escargot ----------

export const drawSnail: AnimalDrawer = (ctx, pose) => {
  const u = pose.cell;
  const t = pose.time;
  const wave = Math.sin(pose.stride * TAU);
  const front = 0.34 + 0.04 * pose.moving;

  // Corps : une limace arrondie, plus longue quand il avance.
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
  stalks.forEach(([x, y, s], i) => {
    const tipX = (x + s) * u;
    const tipY = y * u;
    ctx.strokeStyle = '#c99e6c';
    ctx.lineWidth = u * 0.03;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0.24 * u, 0);
    ctx.quadraticCurveTo((x - 0.02) * u, (y + 0.08) * u, tipX, tipY);
    ctx.stroke();
    eye(ctx, u, tipX, tipY, u * 0.04, t, i * 40);
  });

  blush(ctx, 0.27 * u, 0.06 * u, u * 0.03);
  smile(ctx, u, 0.29 * u, 0.03 * u, u * 0.035, '#8b6a45');

  // Coquille qui roule légèrement en avançant.
  const bob = Math.sin(pose.stride * TAU + 1) * 0.015 * u * pose.moving + Math.sin(t / 500) * 0.006 * u;
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
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#9b5534';
  ctx.lineWidth = u * 0.022;
  ctx.beginPath();
  for (let a = 0; a <= Math.PI * 4.2; a += 0.15) {
    const rr = r * 0.82 * (1 - a / (Math.PI * 4.6));
    if (a === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.stroke();
  ellipse(ctx, -r * 0.35, -r * 0.45, r * 0.25, r * 0.12, -0.6, 'rgba(255,255,255,0.35)');
  ctx.restore();
};

// ---------- Chenille ----------

export const drawCaterpillar: AnimalDrawer = (ctx, pose) => {
  const u = pose.cell;
  const segments = 5;
  // Ondulation qui parcourt le corps de l'arrière vers l'avant.
  const hump = (i: number) => Math.max(0, Math.sin(pose.stride * TAU * 1.5 - i * 0.9)) * 0.07 * u * pose.moving
    + Math.sin(pose.time / 380 + i) * 0.006 * u;

  for (let i = 0; i < segments; i++) {
    const x = (-0.32 + i * 0.12) * u;
    const y = 0.11 * u - hump(i);
    const r = (0.085 + i * 0.006) * u;
    // Petites pattes.
    line(ctx, x - r * 0.3, y + r * 0.6, x - r * 0.3, 0.21 * u, '#4f7d26', u * 0.025);
    line(ctx, x + r * 0.3, y + r * 0.6, x + r * 0.3, 0.21 * u, '#4f7d26', u * 0.025);
    circle(ctx, x, y, r, i % 2 === 0 ? '#8bc34a' : '#9ccc65', '#5b8f2e', u * 0.022);
    circle(ctx, x - r * 0.25, y - r * 0.35, r * 0.25, 'rgba(255,255,255,0.35)');
  }

  // Tête.
  const hx = 0.27 * u;
  const hy = 0.0 * u - hump(segments) * 0.6;
  const antennaSway = Math.sin(pose.time / (pose.moving > 0.2 ? 110 : 300)) * 0.03 * u;
  line(ctx, hx - 0.03 * u, hy - 0.1 * u, hx - 0.06 * u + antennaSway, hy - 0.22 * u, '#5b8f2e', u * 0.022);
  line(ctx, hx + 0.04 * u, hy - 0.1 * u, hx + 0.07 * u + antennaSway, hy - 0.21 * u, '#5b8f2e', u * 0.022);
  circle(ctx, hx - 0.06 * u + antennaSway, hy - 0.22 * u, u * 0.025, '#e8775b');
  circle(ctx, hx + 0.07 * u + antennaSway, hy - 0.21 * u, u * 0.025, '#e8775b');
  circle(ctx, hx, hy, 0.13 * u, '#aed581', '#5b8f2e', u * 0.025);
  eye(ctx, u, hx + 0.04 * u, hy - 0.03 * u, u * 0.04, pose.time, 300);
  blush(ctx, hx + 0.02 * u, hy + 0.05 * u, u * 0.03);
  smile(ctx, u, hx + 0.07 * u, hy + 0.02 * u, u * 0.035, '#3f6a1d');
};

// ---------- Tortue ----------

export const drawTurtle: AnimalDrawer = (ctx, pose) => {
  const u = pose.cell;
  const skin = '#9fcf6e';
  const skinDark = '#5f8f3a';

  // Pattes (diagonales opposées ensemble).
  const legs: [number, number][] = [
    [-0.17, 0],
    [-0.05, 0.5],
    [0.07, 0.5],
    [0.17, 0],
  ];
  for (const [x, phase] of legs) {
    const dx = swing(pose, phase, 0.04) * u;
    ellipse(ctx, x * u + dx, 0.17 * u, 0.045 * u, 0.06 * u, 0, skin, skinDark, u * 0.02);
  }
  // Queue.
  ctx.beginPath();
  ctx.moveTo(-0.27 * u, 0.1 * u);
  ctx.lineTo(-0.36 * u, 0.13 * u);
  ctx.lineTo(-0.27 * u, 0.15 * u);
  ctx.fillStyle = skin;
  ctx.fill();

  // Tête au bout du cou, qui avance et recule avec le pas.
  const reach = Math.sin(pose.stride * TAU * 2) * 0.02 * u * pose.moving;
  const hx = 0.3 * u + reach;
  const hy = 0.02 * u;
  ellipse(ctx, 0.22 * u, 0.07 * u, 0.08 * u, 0.05 * u, -0.3, skin, skinDark, u * 0.02);
  circle(ctx, hx, hy, 0.1 * u, skin, skinDark, u * 0.022);
  eye(ctx, u, hx + 0.03 * u, hy - 0.025 * u, u * 0.035, pose.time, 700);
  blush(ctx, hx + 0.01 * u, hy + 0.04 * u, u * 0.025);
  smile(ctx, u, hx + 0.05 * u, hy + 0.015 * u, u * 0.03, '#3f6a1d');

  // Carapace : dôme avec bordure et écailles.
  const sy = Math.sin(pose.stride * TAU * 2) * 0.008 * u * pose.moving;
  ctx.save();
  ctx.translate(-0.02 * u, sy);
  ctx.beginPath();
  ctx.ellipse(0, 0.11 * u, 0.27 * u, 0.25 * u, 0, Math.PI, TAU);
  ctx.closePath();
  const grad = ctx.createLinearGradient(0, -0.14 * u, 0, 0.11 * u);
  grad.addColorStop(0, '#7fb35a');
  grad.addColorStop(1, '#5a8a3c');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = '#3f6a2a';
  ctx.lineWidth = u * 0.025;
  ctx.stroke();
  // Écailles.
  ctx.strokeStyle = 'rgba(40,70,25,0.55)';
  ctx.lineWidth = u * 0.018;
  ctx.beginPath();
  ctx.moveTo(-0.08 * u, 0.1 * u);
  ctx.lineTo(-0.06 * u, -0.04 * u);
  ctx.lineTo(0.06 * u, -0.04 * u);
  ctx.lineTo(0.08 * u, 0.1 * u);
  ctx.moveTo(-0.06 * u, -0.04 * u);
  ctx.lineTo(-0.13 * u, -0.08 * u);
  ctx.moveTo(0.06 * u, -0.04 * u);
  ctx.lineTo(0.13 * u, -0.08 * u);
  ctx.moveTo(-0.07 * u, 0.03 * u);
  ctx.lineTo(-0.22 * u, 0.04 * u);
  ctx.moveTo(0.07 * u, 0.03 * u);
  ctx.lineTo(0.22 * u, 0.04 * u);
  ctx.stroke();
  ellipse(ctx, -0.08 * u, -0.07 * u, 0.07 * u, 0.03 * u, -0.3, 'rgba(255,255,255,0.3)');
  // Bordure.
  ctx.beginPath();
  ctx.roundRect(-0.29 * u, 0.09 * u, 0.58 * u, 0.05 * u, 0.025 * u);
  ctx.fillStyle = '#c9a66b';
  ctx.fill();
  ctx.strokeStyle = '#8f7244';
  ctx.lineWidth = u * 0.018;
  ctx.stroke();
  ctx.restore();
};

// ---------- Coccinelle ----------

export const drawLadybug: AnimalDrawer = (ctx, pose) => {
  const u = pose.cell;
  // Six pattes fines, par trois en alternance.
  for (let i = 0; i < 3; i++) {
    const x = (-0.12 + i * 0.11) * u;
    const dx = swing(pose, i % 2 === 0 ? 0 : 0.5, 0.04) * u;
    line(ctx, x, 0.1 * u, x + dx - 0.02 * u, 0.21 * u, '#2d2620', u * 0.025);
    line(ctx, x + 0.03 * u, 0.1 * u, x - dx + 0.04 * u, 0.21 * u, '#2d2620', u * 0.02);
  }

  // Tête et antennes.
  const hx = 0.24 * u;
  const hy = 0.06 * u;
  const sway = Math.sin(pose.time / (pose.moving > 0.2 ? 100 : 320)) * 0.025 * u;
  line(ctx, hx, hy - 0.06 * u, hx + 0.05 * u + sway, hy - 0.17 * u, '#2d2620', u * 0.02);
  line(ctx, hx + 0.04 * u, hy - 0.05 * u, hx + 0.11 * u + sway, hy - 0.14 * u, '#2d2620', u * 0.02);
  circle(ctx, hx + 0.05 * u + sway, hy - 0.17 * u, u * 0.022, '#2d2620');
  circle(ctx, hx + 0.11 * u + sway, hy - 0.14 * u, u * 0.022, '#2d2620');
  circle(ctx, hx, hy, 0.1 * u, '#2d2620');
  eye(ctx, u, hx + 0.04 * u, hy - 0.02 * u, u * 0.035, pose.time, 1200);
  smile(ctx, u, hx + 0.05 * u, hy + 0.02 * u, u * 0.03, '#ffffff');

  // Élytres : dôme rouge qui s'entrouvre légèrement en marchant.
  const open = (Math.sin(pose.stride * TAU) * 0.5 + 0.5) * 0.08 * pose.moving;
  const bob = Math.sin(pose.stride * TAU * 2) * 0.008 * u * pose.moving;
  for (const side of [-1, 1] as const) {
    ctx.save();
    ctx.translate(0.0, 0.1 * u + bob);
    ctx.rotate(side * open);
    ctx.beginPath();
    if (side === -1) ctx.ellipse(0, 0, 0.25 * u, 0.24 * u, 0, Math.PI, Math.PI * 1.5);
    else ctx.ellipse(0, 0, 0.25 * u, 0.24 * u, 0, Math.PI * 1.5, TAU);
    ctx.lineTo(0, 0);
    ctx.closePath();
    const grad = ctx.createRadialGradient(-0.05 * u, -0.15 * u, 0.02 * u, 0, -0.05 * u, 0.28 * u);
    grad.addColorStop(0, '#ff6b5e');
    grad.addColorStop(1, '#d32f2f');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = '#8e1c1c';
    ctx.lineWidth = u * 0.022;
    ctx.stroke();
    // Points noirs.
    const spots: [number, number, number][] = side === -1
      ? [[-0.15, -0.07, 0.045], [-0.07, -0.17, 0.04], [-0.19, -0.01, 0.03]]
      : [[0.13, -0.08, 0.045], [0.06, -0.17, 0.035], [0.18, -0.02, 0.03]];
    for (const [x, y, r] of spots) circle(ctx, x * u, y * u, r * u, '#2d2620');
    ctx.restore();
  }
  ellipse(ctx, -0.08 * u, -0.06 * u + bob, 0.06 * u, 0.025 * u, -0.4, 'rgba(255,255,255,0.4)');
};

// ---------- Hérisson ----------

export const drawHedgehog: AnimalDrawer = (ctx, pose) => {
  const u = pose.cell;
  const body = '#d9b48f';
  const spikes = '#6d4c3d';

  // Piquants : rangée de pointes le long du dos, qui frémissent en marchant.
  const quiver = Math.sin(pose.time / 70) * 0.04 * pose.moving;
  ctx.fillStyle = spikes;
  ctx.strokeStyle = '#4e342e';
  ctx.lineWidth = u * 0.015;
  for (let i = 0; i < 9; i++) {
    const a = Math.PI * (1.05 + i * 0.105);
    const bx = Math.cos(a) * 0.22 * u - 0.04 * u;
    const by = Math.sin(a) * 0.18 * u + 0.08 * u;
    const len = (0.12 + (i % 2) * 0.03) * u;
    const da = a + quiver * (i % 2 === 0 ? 1 : -1);
    ctx.beginPath();
    ctx.moveTo(bx + Math.cos(a - 0.35) * 0.04 * u, by + Math.sin(a - 0.35) * 0.04 * u);
    ctx.lineTo(bx + Math.cos(da) * len, by + Math.sin(da) * len);
    ctx.lineTo(bx + Math.cos(a + 0.35) * 0.04 * u, by + Math.sin(a + 0.35) * 0.04 * u);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  // Dos (masse de piquants).
  ellipse(ctx, -0.04 * u, 0.06 * u, 0.23 * u, 0.15 * u, 0, '#7b5646', '#4e342e', u * 0.02);

  // Pattes, devant le corps.
  for (const [x, phase] of [[-0.14, 0], [-0.03, 0.5], [0.08, 0.5], [0.16, 0]] as [number, number][]) {
    const dx = swing(pose, phase, 0.035) * u;
    ellipse(ctx, x * u + dx, 0.19 * u, 0.035 * u, 0.04 * u, 0, '#a1887f', '#6d4c41', u * 0.015);
  }

  // Visage : museau pointu clair.
  const sniff = Math.sin(pose.time / 160) * 0.006 * u;
  ctx.beginPath();
  ctx.moveTo(0.1 * u, -0.04 * u);
  ctx.quadraticCurveTo(0.28 * u, -0.02 * u, 0.36 * u + sniff, 0.08 * u);
  ctx.quadraticCurveTo(0.26 * u, 0.18 * u, 0.1 * u, 0.17 * u);
  ctx.closePath();
  ctx.fillStyle = body;
  ctx.fill();
  ctx.strokeStyle = '#a07e5f';
  ctx.lineWidth = u * 0.02;
  ctx.stroke();
  circle(ctx, 0.36 * u + sniff, 0.08 * u, 0.028 * u, '#2d2620');
  eye(ctx, u, 0.2 * u, 0.04 * u, u * 0.032, pose.time, 1700);
  blush(ctx, 0.2 * u, 0.11 * u, u * 0.028);
  // Oreille.
  circle(ctx, 0.12 * u, -0.03 * u, 0.035 * u, '#c79f7b', '#a07e5f', u * 0.015);
};

// ---------- Lapin ----------

export const drawRabbit: AnimalDrawer = (ctx, pose) => {
  const u = pose.cell;
  const fur = '#f4f1ec';
  const furDark = '#c9c2b8';
  // Phase du bond : 0 au sol, 1 en l'air.
  const air = Math.abs(Math.sin(pose.stride * Math.PI)) * pose.moving;

  // Queue en pompon.
  circle(ctx, -0.25 * u, 0.04 * u, 0.06 * u, '#ffffff', furDark, u * 0.015);
  // Patte arrière : repliée au sol, tendue en l'air.
  ellipse(ctx, -0.12 * u - air * 0.04 * u, 0.17 * u, 0.1 * u, 0.045 * u, air * 0.5, fur, furDark, u * 0.02);
  // Corps.
  ellipse(ctx, -0.05 * u, 0.06 * u, 0.2 * u, 0.15 * u, -0.15 - air * 0.15, fur, furDark, u * 0.022);
  // Patte avant.
  ellipse(ctx, 0.1 * u + air * 0.04 * u, 0.18 * u, 0.04 * u, 0.04 * u, 0, fur, furDark, u * 0.018);

  // Oreilles : elles se rabattent en arrière pendant le bond.
  const earBack = -0.35 - air * 0.6 + Math.sin(pose.time / 600) * 0.05;
  for (const [ox, extra] of [[0.1, 0], [0.16, 0.15]] as [number, number][]) {
    ctx.save();
    ctx.translate(ox * u, -0.12 * u);
    ctx.rotate(earBack + extra);
    ellipse(ctx, 0, -0.13 * u, 0.045 * u, 0.14 * u, 0, fur, furDark, u * 0.02);
    ellipse(ctx, 0, -0.13 * u, 0.022 * u, 0.1 * u, 0, '#f6b8c4');
    ctx.restore();
  }

  // Tête.
  const hx = 0.17 * u;
  const hy = -0.05 * u;
  circle(ctx, hx, hy, 0.12 * u, fur, furDark, u * 0.022);
  eye(ctx, u, hx + 0.04 * u, hy - 0.025 * u, u * 0.035, pose.time, 2100);
  blush(ctx, hx + 0.03 * u, hy + 0.05 * u, u * 0.03);
  // Nez qui frétille et moustaches.
  const twitch = Math.sin(pose.time / 120) * 0.006 * u;
  circle(ctx, hx + 0.11 * u, hy + 0.02 * u + twitch, 0.018 * u, '#e88a9a');
  for (const dy of [-0.01, 0.02]) line(ctx, hx + 0.09 * u, hy + 0.03 * u, hx + 0.17 * u, hy + (0.03 + dy) * u, furDark, u * 0.01);
};

// ---------- Poussin ----------

export const drawChick: AnimalDrawer = (ctx, pose) => {
  const u = pose.cell;
  const yellow = '#ffd54f';
  const outline = '#d9a300';
  const air = Math.abs(Math.sin(pose.stride * Math.PI)) * pose.moving;

  // Pattes orange qui trottinent.
  for (const [x, phase] of [[-0.04, 0], [0.06, 0.5]] as [number, number][]) {
    const dx = swing(pose, phase, 0.04) * u;
    line(ctx, x * u, 0.1 * u, x * u + dx, 0.21 * u, '#f08c2b', u * 0.025);
    line(ctx, x * u + dx, 0.21 * u, x * u + dx + 0.04 * u, 0.21 * u, '#f08c2b', u * 0.022);
  }

  // Le haut du corps est surélevé pour laisser voir les pattes.
  ctx.save();
  ctx.translate(0, -0.05 * u);

  // Corps rond.
  const grad = ctx.createRadialGradient(-0.05 * u, -0.05 * u, 0.03 * u, 0, 0.03 * u, 0.24 * u);
  grad.addColorStop(0, '#fff3b0');
  grad.addColorStop(1, yellow);
  circle(ctx, 0, 0.03 * u, 0.2 * u, grad, outline, u * 0.022);

  // Aile qui bat (plus vite en l'air).
  const flap = Math.sin(pose.time / (air > 0.2 ? 45 : 400)) * (0.25 + air * 0.5);
  ctx.save();
  ctx.translate(-0.05 * u, 0.04 * u);
  ctx.rotate(-0.4 + flap);
  ellipse(ctx, -0.06 * u, 0, 0.09 * u, 0.055 * u, 0, '#ffca28', outline, u * 0.018);
  ctx.restore();

  // Houppette sur la tête.
  for (const [dx, a] of [[0.0, -0.4], [0.04, 0], [0.08, 0.4]] as [number, number][]) {
    ctx.save();
    ctx.translate((0.06 + dx) * u, -0.15 * u);
    ctx.rotate(a + Math.sin(pose.time / 300 + dx * 20) * 0.1);
    ellipse(ctx, 0, -0.03 * u, 0.018 * u, 0.04 * u, 0, yellow, outline, u * 0.012);
    ctx.restore();
  }

  // Visage.
  eye(ctx, u, 0.1 * u, -0.04 * u, u * 0.035, pose.time, 2500);
  blush(ctx, 0.09 * u, 0.03 * u, u * 0.03);
  // Bec qui s'ouvre de temps en temps (piou !).
  const chirp = (pose.time % 2400) < 220 ? 0.025 * u : 0.006 * u;
  ctx.fillStyle = '#f08c2b';
  ctx.beginPath();
  ctx.moveTo(0.17 * u, -0.02 * u);
  ctx.lineTo(0.26 * u, 0.0 - chirp * 0.3);
  ctx.lineTo(0.17 * u, 0.015 * u);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0.17 * u, 0.015 * u);
  ctx.lineTo(0.24 * u, 0.02 * u + chirp);
  ctx.lineTo(0.17 * u, 0.035 * u);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
};

export const ANIMAL_DRAWERS: Record<string, AnimalDrawer> = {
  escargot: drawSnail,
  chenille: drawCaterpillar,
  tortue: drawTurtle,
  coccinelle: drawLadybug,
  herisson: drawHedgehog,
  lapin: drawRabbit,
  poussin: drawChick,
};
