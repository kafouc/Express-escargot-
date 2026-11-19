/** Dessin du plateau sur un canvas 2D. Aucune logique de jeu ici. */
import { cellRC, decodeEdge } from '../core/grid.ts';
import { nextWaypoint, type Game } from './rules.ts';
import { drawCharacter, drawLeaf, type Character, type LeafColor } from './characters.ts';

const COLORS = {
  board: '#ece5d5',
  cell: '#f8f4ea',
  wall: '#5b4a3a',
};

export interface Layout {
  /** Taille du canvas en pixels CSS. */
  size: number;
  /** Marge autour de la grille. */
  pad: number;
  cell: number;
}

export interface RenderState {
  character: Character;
  leaf: LeafColor;
  /** Horodatage (ms) du dernier refus, pour la secousse. */
  shakeAt: number;
  /** Horodatage du début de l'animation de victoire (0 = aucune). */
  winAt: number;
  /** Position affichée du personnage le long du chemin (indice fractionnaire, -1 = pas encore posé). */
  display: number;
  /** Distance totale parcourue (en cases), qui rythme les pas. */
  distance: number;
  /** 0 = immobile, 1 = en mouvement (lissé). */
  moving: number;
  facing: 1 | -1;
  tilt: number;
  lastTime: number;
  /** Dernier indice du chemin atteint visuellement par le personnage. */
  reached: number;
  /** Feuilles croquées : case → horodatage du « pop ». */
  pops: Map<number, number>;
  /** Appelé quand le personnage arrive visuellement sur une case (sons synchronisés avec l'animation). */
  onArrive?: (cell: number, isWaypoint: boolean) => void;
}

export function createRenderState(character: Character, leaf: LeafColor): RenderState {
  return {
    character, leaf, shakeAt: -1e9, winAt: 0, display: -1, distance: 0, moving: 0, facing: 1, tilt: 0, lastTime: 0,
    reached: -1, pops: new Map(),
  };
}

/** Remet le personnage au départ (nouveau niveau ou « Recommencer »). */
export function resetMotion(state: RenderState): void {
  state.display = -1;
  state.moving = 0;
  state.tilt = 0;
  state.facing = 1;
  state.winAt = 0;
  state.reached = -1;
  state.pops.clear();
}

export function computeLayout(cssSize: number, gridSize: number): Layout {
  const pad = Math.round(cssSize * 0.03);
  return { size: cssSize, pad, cell: (cssSize - 2 * pad) / gridSize };
}

function center(layout: Layout, size: number, cell: number): [number, number] {
  const [r, c] = cellRC(size, cell);
  return [layout.pad + (c + 0.5) * layout.cell, layout.pad + (r + 0.5) * layout.cell];
}

/** Case sous un point (coordonnées CSS dans le canvas), ou -1. */
export function cellAt(layout: Layout, size: number, x: number, y: number): number {
  const c = Math.floor((x - layout.pad) / layout.cell);
  const r = Math.floor((y - layout.pad) / layout.cell);
  if (r < 0 || c < 0 || r >= size || c >= size) return -1;
  return r * size + c;
}

/** Point à l'indice fractionnaire `d` le long d'une liste de points. */
function pointAt(points: [number, number][], d: number): [number, number] {
  const last = points.length - 1;
  const clamped = Math.min(Math.max(d, 0), last);
  const i = Math.min(Math.floor(clamped), Math.max(last - 1, 0));
  const a = points[i] as [number, number];
  const b = (points[i + 1] ?? a) as [number, number];
  const k = clamped - i;
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
}

const clamp01 = (x: number) => Math.min(Math.max(x, 0), 1);

/** Fait glisser la position affichée vers la tête réelle du chemin, et met à jour l'orientation. */
function updateMotion(state: RenderState, game: Game, points: [number, number][], now: number): void {
  const dt = state.lastTime ? Math.min(now - state.lastTime, 50) / 1000 : 0;
  state.lastTime = now;
  const target = points.length - 1;
  if (target < 0) {
    state.display = -1;
    state.reached = -1;
    return;
  }
  if (state.display < 0) state.display = 0;

  const gap = target - state.display;
  // Vitesse de base de 7 cases/s, plus rapide quand le doigt est loin devant (pas de retard ressenti).
  const speed = 7 + 6 * Math.abs(gap);
  const move = Math.sign(gap) * Math.min(Math.abs(gap), speed * dt);
  state.display += move;
  state.distance += Math.abs(move);
  state.moving += ((Math.abs(gap) > 0.02 ? 1 : 0) - state.moving) * Math.min(1, dt * 10);

  // Arrivées sur de nouvelles cases : « pop » des feuilles et sons synchronisés.
  const arrived = Math.min(Math.floor(state.display + 0.35), target);
  if (arrived < state.reached) state.reached = arrived;
  while (state.reached < arrived) {
    state.reached++;
    const cell = game.path[state.reached] as number;
    const isWaypoint = (game.puzzle.waypointAt[cell] ?? 0) !== 0;
    if (isWaypoint) state.pops.set(cell, now);
    state.onArrive?.(cell, isWaypoint);
  }

  // Direction du segment parcouru.
  if (points.length >= 2) {
    const i = Math.min(Math.floor(state.display), points.length - 2);
    const a = points[i] as [number, number];
    const b = points[i + 1] as [number, number];
    let dx = b[0] - a[0];
    let dy = b[1] - a[1];
    if (move < 0) {
      dx = -dx;
      dy = -dy;
    }
    if (Math.abs(dx) > 0.5) state.facing = dx > 0 ? 1 : -1;
    const tiltTarget = Math.abs(dy) > Math.abs(dx) && Math.abs(move) > 0 ? Math.sign(dy) * 0.35 : 0;
    state.tilt += (tiltTarget - state.tilt) * Math.min(1, dt * 12);
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, radius: number): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
}

export function render(ctx: CanvasRenderingContext2D, game: Game, layout: Layout, state: RenderState, now: number): void {
  const { size } = game.puzzle;
  const { cell, pad } = layout;
  const points = game.path.map((c) => center(layout, size, c));
  updateMotion(state, game, points, now);
  ctx.clearRect(0, 0, layout.size, layout.size);

  // Plateau et cases.
  ctx.fillStyle = COLORS.board;
  roundRect(ctx, 0, 0, layout.size, layout.size, 18);
  ctx.fill();
  ctx.fillStyle = COLORS.cell;
  const gap = Math.max(1.5, cell * 0.04);
  for (let i = 0; i < size * size; i++) {
    const [r, c] = cellRC(size, i);
    roundRect(ctx, pad + c * cell + gap, pad + r * cell + gap, cell - 2 * gap, cell - 2 * gap, cell * 0.16);
    ctx.fill();
  }

  // Traînée, dessinée jusqu'à la position du personnage (elle « pousse » derrière lui).
  if (state.display >= 0 && points.length > 0) {
    const shown = points.slice(0, Math.floor(state.display) + 1);
    shown.push(pointAt(points, state.display));
    const { trail } = state.character;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const stroke = (width: number, style: string) => {
      ctx.strokeStyle = style;
      ctx.lineWidth = width;
      ctx.beginPath();
      shown.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
      if (shown.length === 1) ctx.lineTo(shown[0]![0] + 0.01, shown[0]![1]);
      ctx.stroke();
    };
    stroke(cell * 0.56, trail.edge);
    stroke(cell * 0.48, trail.fill);
    stroke(cell * 0.14, trail.shine);

    // Victoire : un reflet lumineux parcourt toute la traînée en 0,8 s.
    if (state.winAt > 0) {
      const t = (now - state.winAt) / 800;
      if (t <= 1) {
        const [x, y] = pointAt(points, t * (points.length - 1));
        const glow = ctx.createRadialGradient(x, y, 0, x, y, cell * 0.9);
        glow.addColorStop(0, 'rgba(255,255,240,0.95)');
        glow.addColorStop(1, 'rgba(255,255,240,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, cell * 0.9, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Murs.
  ctx.strokeStyle = COLORS.wall;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(4, cell * 0.12);
  for (const edge of game.puzzle.walls) {
    const [a, b] = decodeEdge(edge);
    const [ra, ca] = cellRC(size, a);
    ctx.beginPath();
    if (b - a === 1) {
      const x = pad + (ca + 1) * cell;
      ctx.moveTo(x, pad + ra * cell + gap);
      ctx.lineTo(x, pad + (ra + 1) * cell - gap);
    } else {
      const y = pad + (ra + 1) * cell;
      ctx.moveTo(pad + ca * cell + gap, y);
      ctx.lineTo(pad + (ca + 1) * cell - gap, y);
    }
    ctx.stroke();
  }

  // Feuilles numérotées.
  const { leaf } = state;
  const next = nextWaypoint(game);
  const visited = new Set(game.path);
  game.puzzle.waypointCells.forEach((wc, i) => {
    const n = i + 1;
    const [x, y] = center(layout, size, wc);
    const done = visited.has(wc);
    const radius = cell * 0.3;
    ctx.save();
    ctx.translate(x, y);
    if (n === next && game.path.length > 0) {
      const pulse = 1 + 0.08 * Math.sin(now / 220);
      ctx.strokeStyle = leaf.ring;
      ctx.lineWidth = Math.max(2, cell * 0.06);
      ctx.beginPath();
      ctx.arc(0, 0, radius * 1.35 * pulse, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (n === 1 && game.path.length === 0) {
      const pulse = 1 + 0.12 * Math.sin(now / 200);
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = leaf.ring;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 1.6 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    // Feuille croquée : 1 → 1,35 → 1 en 280 ms.
    const popAt = state.pops.get(wc);
    if (popAt !== undefined && now - popAt < 280) {
      const k = 1 + 0.35 * Math.sin(Math.PI * ((now - popAt) / 280));
      ctx.scale(k, k);
    }
    // Petite oscillation de la feuille, comme dans le vent.
    const sway = -0.5 + Math.sin(now / 900 + wc) * 0.06;
    drawLeaf(ctx, radius, done ? leaf.done : leaf.fill, leaf.vein, String(n), sway);
    ctx.restore();
  });

  drawConfetti(ctx, layout, state, now);

  // Personnage.
  if (state.display >= 0 && points.length > 0) {
    const [x, y] = pointAt(points, state.display);
    const joyT = state.winAt > 0 ? (now - state.winAt - 150) / 700 : -1;
    const shakeT = (now - state.shakeAt) / 220;
    ctx.save();
    ctx.translate(x, y - cell * 0.04);
    drawCharacter(ctx, state.character, {
      cell,
      time: now,
      moving: state.moving,
      stride: state.distance,
      facing: state.facing,
      tilt: state.tilt,
      joy: joyT > 0 && joyT < 1 ? joyT : 0,
      shake: shakeT > 0 && shakeT < 1 ? shakeT : 0,
    });
    ctx.restore();
  }
}

/** Nombre pseudo-aléatoire stable dans [0, 1) pour l'indice i (pas d'état à conserver entre les images). */
function noise(i: number): number {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/** Victoire : une pluie de petites feuilles tombe en virevoltant pendant ~2,5 s. */
function drawConfetti(ctx: CanvasRenderingContext2D, layout: Layout, state: RenderState, now: number): void {
  if (state.winAt <= 0) return;
  const elapsed = now - state.winAt;
  if (elapsed > 2800) return;
  const { cell, size } = layout;
  const colors = [state.leaf.fill, state.leaf.done, state.character.trail.fill];
  for (let i = 0; i < 28; i++) {
    const delay = noise(i) * 500;
    const t = (elapsed - delay) / 1000;
    if (t < 0) continue;
    const x = noise(i + 100) * size + Math.sin(t * 2.6 + i) * cell * 0.35;
    const y = -cell * 0.4 + t * size * 0.3 + t * t * size * 0.16;
    if (y > size + cell) continue;
    ctx.save();
    ctx.globalAlpha = t > 1.8 ? Math.max(0, 1 - (t - 1.8) / 0.6) : 1;
    ctx.translate(x, y);
    ctx.rotate(t * (noise(i + 200) - 0.5) * 9);
    drawLeaf(ctx, cell * (0.12 + noise(i + 300) * 0.08), colors[i % colors.length] as string, state.leaf.vein, '', 0);
    ctx.restore();
  }
}
