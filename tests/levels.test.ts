/**
 * Critères d'acceptation M0 (docs/brief.md §5) vérifiés sur les fichiers générés.
 * À relancer après chaque `npm run gen`.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { validateLevel } from '../src/core/validate.ts';
import type { Level } from '../src/core/types.ts';
import { CAMPAIGN, addDays, weekdayOf } from '../tools/levelgen/plan.ts';

const campaign = JSON.parse(readFileSync(new URL('../levels/campaign.json', import.meta.url), 'utf8')) as Level[];
const daily = JSON.parse(readFileSync(new URL('../levels/daily.json', import.meta.url), 'utf8')) as Record<string, Level>;

const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;

describe('campagne', () => {
  it('contient 200 niveaux numérotés c-0001 … c-0200', () => {
    expect(campaign).toHaveLength(200);
    campaign.forEach((level, i) => expect(level.id).toBe(`c-${String(i + 1).padStart(4, '0')}`));
  });

  it('respecte la taille de grille et une difficulté croissante dans chaque tranche', () => {
    for (const tranche of CAMPAIGN) {
      const slice = campaign.slice(tranche.from - 1, tranche.to);
      slice.forEach((level) => expect(level.size).toBe(tranche.size));
      for (let i = 1; i < slice.length; i++) {
        expect(slice[i]!.difficulty).toBeGreaterThanOrEqual(slice[i - 1]!.difficulty);
      }
    }
  });

  it('a une difficulté moyenne qui augmente avec la taille de grille', () => {
    const bySize = [5, 6, 7, 8].map((size) => mean(campaign.filter((l) => l.size === size).map((l) => l.difficulty)));
    for (let i = 1; i < bySize.length; i++) expect(bySize[i]).toBeGreaterThan(bySize[i - 1] as number);
  });

  it('a 100 % de niveaux à solution unique', () => {
    const failures = campaign.filter((level) => !validateLevel(level).ok).map((l) => l.id);
    expect(failures).toEqual([]);
  }, 120_000);
});

describe('défis quotidiens', () => {
  const dates = Object.keys(daily);

  it('couvre 730 jours consécutifs', () => {
    expect(dates).toHaveLength(730);
    dates.forEach((date, i) => {
      expect(date).toBe(addDays(dates[0] as string, i));
      expect(daily[date]!.id).toBe(`d-${date}`);
    });
  });

  it('va du lundi (le plus facile) au dimanche (le plus difficile) en moyenne', () => {
    const order = [1, 2, 3, 4, 5, 6, 0];
    const means = order.map((weekday) => mean(dates.filter((d) => weekdayOf(d) === weekday).map((d) => daily[d]!.difficulty)));
    for (let i = 1; i < means.length; i++) expect(means[i]).toBeGreaterThan(means[i - 1] as number);
  });

  it('a 100 % de niveaux à solution unique', () => {
    const failures = dates.filter((d) => !validateLevel(daily[d] as Level).ok);
    expect(failures).toEqual([]);
  }, 300_000);
});
