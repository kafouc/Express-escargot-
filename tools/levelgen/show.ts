/**
 * Affiche un niveau dans le terminal (sans la solution, ou avec `--solution`).
 *
 *   npm run show -- c-0042
 *   npm run show -- 2026-12-06 --solution
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cellIndex, wallToEdge, edgeId } from '../../src/core/grid.ts';
import type { Level } from '../../src/core/types.ts';

const LEVELS = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'levels');

function findLevel(key: string): Level {
  const campaign = JSON.parse(readFileSync(join(LEVELS, 'campaign.json'), 'utf8')) as Level[];
  const daily = JSON.parse(readFileSync(join(LEVELS, 'daily.json'), 'utf8')) as Record<string, Level>;
  const level = campaign.find((l) => l.id === key) ?? daily[key] ?? daily[key.replace(/^d-/, '')];
  if (!level) throw new Error(`Niveau introuvable : ${key}`);
  return level;
}

export function render(level: Level, withSolution: boolean): string {
  const { size } = level;
  const walls = new Set(level.walls.map((w) => wallToEdge(size, w)));
  const label = new Map<number, string>();
  for (const w of level.waypoints) label.set(cellIndex(size, w.r, w.c), String(w.n));
  const order = new Map<number, number>();
  level.solution.forEach(([r, c], i) => order.set(cellIndex(size, r, c), i + 1));

  const cellText = (cell: number) => {
    const text = label.get(cell) ?? (withSolution ? '·' : ' ');
    return text.padStart(2, ' ').padEnd(3, ' ');
  };

  const lines: string[] = [`+${'---+'.repeat(size)}`];
  for (let r = 0; r < size; r++) {
    let row = '|';
    let below = '+';
    for (let c = 0; c < size; c++) {
      const cell = cellIndex(size, r, c);
      row += cellText(cell);
      const east = c < size - 1 && walls.has(edgeId(cell, cell + 1));
      row += c === size - 1 || east ? '|' : ' ';
      const south = r < size - 1 && walls.has(edgeId(cell, cell + size));
      below += r === size - 1 || south ? '---+' : '   +';
    }
    lines.push(row, below);
  }
  if (withSolution) {
    lines.push('', 'Ordre de passage :');
    for (let r = 0; r < size; r++) {
      lines.push(Array.from({ length: size }, (_, c) => String(order.get(cellIndex(size, r, c))).padStart(3)).join(''));
    }
  }
  return lines.join('\n');
}

const [key, flag] = process.argv.slice(2);
if (!key) {
  console.error('Usage : npm run show -- <id ou date> [--solution]');
  process.exit(1);
}
const level = findLevel(key);
console.log(`${level.id} · ${level.size}×${level.size} · ${level.waypoints.length} feuilles · ${level.walls.length} murs · difficulté ${level.difficulty}\n`);
console.log(render(level, flag === '--solution'));
