/** Dessin du plateau sur un canvas 2D. Aucune logique de jeu ici. */
import { cellRC, decodeEdge } from '../core/grid.ts';
import { nextWaypoint, type Game } from './rules.ts';

const COLORS = {
  board: '#ece5d5',
  cell: '#f8f4ea',
  wall: '#5b4a3a',
  trail: '#8db38b',
  trailEdge: '#6f9a6d',
  shine: 'rgba(255,255,255,0.45)',
  leaf: '#3e7d4f',
  leafDone: '#a9c9a4',
  leafNext: '#e8775b',
  text: '#ffffff',
};

export interface Layout {
  /** Taille du canvas en pixels CSS. */
  size: number;
  /** Marge autour de la grille. */
  pad: number;
  cell: number;
}

export interface RenderState {
  /** Horodatage (ms) du dernier refus, pour la secousse. */
  shakeAt: number;
  /** Direction horizontale de l'escargot : -1 = vers la gauche, 1 = vers la droite. */
  facing: -1 | 1;
  /** Horodatage du début de l'animation de victoire (0 = aucune). */
  winAt: number;
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

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, radius: number): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
}

/** Point situé à la fraction `t` (0–1) le long du chemin. */
function pointAlong(points: [number, number][], t: number): [number, number] {
  if (points.length === 1) return points[0] as [number, number];
  const f = Math.min(Math.max(t, 0), 1) * (points.length - 1);
  const i = Math.min(Math.floor(f), points.length - 2);
  const a = points[i] as [number, number];
  const b = points[i + 1] as [number, number];
  const k = f - i;
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
}

export function render(ctx: CanvasRenderingContext2D, game: Game, layout: Layout, state: RenderState, now: number): void {
  const { size } = game.puzzle;
  const { cell, pad } = layout;
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

  // Traînée de bave.
  const points = game.path.map((c) => center(layout, size, c));
  if (points.length > 0) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const stroke = (width: number, style: string) => {
      ctx.strokeStyle = style;
      ctx.lineWidth = width;
      ctx.beginPath();
      points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
      if (points.length === 1) ctx.lineTo(points[0]![0] + 0.01, points[0]![1]);
      ctx.stroke();
    };
    stroke(cell * 0.56, COLORS.trailEdge);
    stroke(cell * 0.48, COLORS.trail);
    stroke(cell * 0.14, COLORS.shine);

    // Victoire : un reflet lumineux parcourt toute la traînée en 0,8 s.
    if (state.winAt > 0) {
      const t = (now - state.winAt) / 800;
      if (t <= 1) {
        const [x, y] = pointAlong(points, t);
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
  const next = nextWaypoint(game);
  const visited = new Set(game.path);
  game.puzzle.waypointCells.forEach((wc, i) => {
    const n = i + 1;
    const [x, y] = center(layout, size, wc);
    const done = visited.has(wc);
    const radius = cell * 0.3;
    if (n === next && game.path.length > 0) {
      // Prochaine feuille : anneau qui respire.
      const pulse = 1 + 0.08 * Math.sin(now / 220);
      ctx.strokeStyle = COLORS.leafNext;
      ctx.lineWidth = Math.max(2, cell * 0.06);
      ctx.beginPath();
      ctx.arc(x, y, radius * 1.3 * pulse, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (n === 1 && game.path.length === 0) {
      const pulse = 1 + 0.12 * Math.sin(now / 200);
      ctx.fillStyle = 'rgba(232,119,91,0.25)';
      ctx.beginPath();
      ctx.arc(x, y, radius * 1.6 * pulse, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = done ? COLORS.leafDone : COLORS.leaf;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.text;
    ctx.font = `700 ${Math.round(cell * 0.3)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(n), x, y + 1);
  });

  // Escargot sur la tête du chemin.
  const headCell = game.path[game.path.length - 1];
  if (headCell !== undefined) {
    const [x, y] = center(layout, size, headCell);
    const elapsed = now - state.shakeAt;
    const shake = elapsed < 180 ? Math.sin(elapsed / 18) * cell * 0.08 * (1 - elapsed / 180) : 0;
    const bounce = Math.sin(now / 300) * cell * 0.02;
    ctx.save();
    ctx.translate(x + shake, y - cell * 0.08 + bounce);
    // L'emoji 🐌 regarde vers la gauche : on le retourne quand il avance vers la droite.
    ctx.scale(-state.facing, 1);
    ctx.font = `${Math.round(cell * 0.62)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🐌', 0, 0);
    ctx.restore();
  }
}
