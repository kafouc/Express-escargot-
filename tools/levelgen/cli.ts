/**
 * Générateur de niveaux d'Escargot Express.
 *
 *   npm run gen                                   → levels/campaign.json + levels/daily.json
 *   npm run gen -- --campaign 200 --daily 730 --daily-start 2026-12-01
 *   npm run gen -- --size 6 --count 50 --seed 123 → levels/batch.json
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateLevel } from '../../src/core/generator.ts';
import { hashSeed } from '../../src/core/rng.ts';
import { validateLevel } from '../../src/core/validate.ts';
import type { Level } from '../../src/core/types.ts';
import { CAMPAIGN, DAILY_BY_WEEKDAY, DAILY_CANDIDATES, WEEKDAY_NAMES, addDays, defaultRangesForSize, weekdayOf } from './plan.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT_DIR = join(ROOT, 'levels');

interface Options {
  campaign: number;
  daily: number;
  dailyStart: string;
  size?: number;
  count: number;
  seed: number;
  out: string;
}

function parseArgs(argv: string[]): Options {
  const options: Options = { campaign: 200, daily: 730, dailyStart: '2026-12-01', count: 50, seed: 1, out: OUT_DIR };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const value = argv[i + 1];
    const need = (): string => {
      if (value === undefined) throw new Error(`Valeur manquante pour ${flag}`);
      i++;
      return value;
    };
    switch (flag) {
      case '--campaign': options.campaign = Number(need()); break;
      case '--daily': options.daily = Number(need()); break;
      case '--daily-start': options.dailyStart = need(); break;
      case '--size': options.size = Number(need()); break;
      case '--count': options.count = Number(need()); break;
      case '--seed': options.seed = Number(need()); break;
      case '--out': options.out = need(); break;
      default: throw new Error(`Option inconnue : ${flag}`);
    }
  }
  return options;
}

const timings = new Map<number, number[]>();

function timed(level: () => Level): Level {
  const start = performance.now();
  const result = level();
  const list = timings.get(result.size) ?? [];
  list.push(performance.now() - start);
  timings.set(result.size, list);
  return result;
}

/** Une ligne par niveau : lisible dans les diffs git, sans gonfler le fichier. */
function writeLevels(file: string, levels: Level[]): void {
  writeFileSync(file, `[\n${levels.map((l) => `  ${JSON.stringify(l)}`).join(',\n')}\n]\n`);
}

function writeDaily(file: string, entries: [string, Level][]): void {
  const body = entries.map(([date, l]) => `  ${JSON.stringify(date)}: ${JSON.stringify(l)}`).join(',\n');
  writeFileSync(file, `{\n${body}\n}\n`);
}

function mean(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length;
}

function generateCampaign(count: number): Level[] {
  const levels: Level[] = [];
  for (const tranche of CAMPAIGN) {
    if (tranche.from > count) break;
    const last = Math.min(tranche.to, count);
    const batch: Level[] = [];
    for (let n = tranche.from; n <= last; n++) {
      const id = `c-${String(n).padStart(4, '0')}`;
      batch.push(timed(() => generateLevel({ id, seed: hashSeed(id), size: tranche.size, waypoints: tranche.waypoints, walls: tranche.walls })));
    }
    // Difficulté croissante dans la tranche, puis renumérotation.
    batch.sort((a, b) => a.difficulty - b.difficulty || a.seed - b.seed);
    batch.forEach((level, i) => levels.push({ ...level, id: `c-${String(tranche.from + i).padStart(4, '0')}` }));
    console.log(`  campagne ${tranche.from}–${last} (${tranche.size}×${tranche.size}) : difficulté moyenne ${mean(batch.map((l) => l.difficulty)).toFixed(1)}`);
  }
  return levels;
}

function generateDaily(start: string, count: number): [string, Level][] {
  const entries: [string, Level][] = [];
  for (let d = 0; d < count; d++) {
    const date = addDays(start, d);
    const config = DAILY_BY_WEEKDAY[weekdayOf(date)];
    if (!config) throw new Error(`Pas de configuration pour ${date}`);
    const id = `d-${date}`;
    const { target, ...ranges } = config;
    // Plusieurs candidats, on garde le plus proche de la difficulté visée pour ce jour de la semaine.
    let best: Level | undefined;
    for (let k = 0; k < DAILY_CANDIDATES; k++) {
      const candidate = timed(() => generateLevel({ id, seed: hashSeed(`${id}#${k}`), ...ranges }));
      if (!best || (target !== undefined && Math.abs(candidate.difficulty - target) < Math.abs(best.difficulty - target))) {
        best = candidate;
      }
    }
    entries.push([date, best as Level]);
    if ((d + 1) % 100 === 0) console.log(`  défis quotidiens : ${d + 1}/${count}`);
  }
  return entries;
}

function validateAll(label: string, levels: Level[]): number {
  let failures = 0;
  for (const level of levels) {
    const result = validateLevel(level);
    if (!result.ok) {
      failures++;
      console.error(`  ✗ ${level.id} : ${result.errors.join(', ')}`);
    }
  }
  const ok = levels.length - failures;
  console.log(`  ${label} : ${ok}/${levels.length} niveaux validés (${((100 * ok) / Math.max(1, levels.length)).toFixed(1)} %)`);
  return failures;
}

function printTimings(): void {
  console.log('\nTemps de génération par taille :');
  for (const size of [...timings.keys()].sort()) {
    const list = timings.get(size) as number[];
    console.log(`  ${size}×${size} : moyenne ${mean(list).toFixed(0)} ms, max ${Math.max(...list).toFixed(0)} ms (${list.length} niveaux)`);
  }
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  mkdirSync(options.out, { recursive: true });
  const started = performance.now();
  let failures = 0;

  if (options.size !== undefined) {
    const ranges = defaultRangesForSize(options.size);
    console.log(`Lot libre : ${options.count} niveaux ${options.size}×${options.size}, graine ${options.seed}`);
    const levels: Level[] = [];
    for (let i = 0; i < options.count; i++) {
      const id = `b-${options.size}-${options.seed}-${String(i + 1).padStart(4, '0')}`;
      levels.push(timed(() => generateLevel({ id, seed: hashSeed(id), ...ranges })));
    }
    levels.sort((a, b) => a.difficulty - b.difficulty);
    failures += validateAll('lot', levels);
    writeLevels(join(options.out, 'batch.json'), levels);
  } else {
    console.log(`Campagne : ${options.campaign} niveaux`);
    const campaign = generateCampaign(options.campaign);
    console.log(`Défis quotidiens : ${options.daily} à partir du ${options.dailyStart}`);
    const daily = generateDaily(options.dailyStart, options.daily);

    console.log('\nDifficulté moyenne des défis par jour de la semaine :');
    for (const weekday of [1, 2, 3, 4, 5, 6, 0]) {
      const list = daily.filter(([date]) => weekdayOf(date) === weekday).map(([, l]) => l.difficulty);
      console.log(`  ${WEEKDAY_NAMES[weekday]} : ${mean(list).toFixed(1)}`);
    }

    console.log('\nValidation (solution unique, recherche complète) :');
    failures += validateAll('campagne', campaign);
    failures += validateAll('défis quotidiens', daily.map(([, l]) => l));

    writeLevels(join(options.out, 'campaign.json'), campaign);
    writeDaily(join(options.out, 'daily.json'), daily);
  }

  printTimings();
  console.log(`\nTerminé en ${((performance.now() - started) / 1000).toFixed(1)} s → ${options.out}`);
  if (failures > 0) {
    console.error(`${failures} niveau(x) invalide(s)`);
    process.exitCode = 1;
  }
}

main();
