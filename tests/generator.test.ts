import { describe, expect, it } from 'vitest';
import { generateLevel } from '../src/core/generator.ts';
import { cellIndex, edgeId, wallToEdge } from '../src/core/grid.ts';
import { validateLevel } from '../src/core/validate.ts';
import { addDays, weekdayOf, CAMPAIGN } from '../tools/levelgen/plan.ts';

describe('générateur', () => {
  it('est déterministe : même configuration, même niveau', () => {
    const config = { id: 't-1', seed: 1234, size: 6, waypoints: [4, 7] as [number, number], walls: [0, 4] as [number, number] };
    expect(generateLevel(config)).toEqual(generateLevel(config));
  });

  for (const tranche of CAMPAIGN) {
    it(`produit des niveaux valides et uniques en ${tranche.size}×${tranche.size} (niveaux ${tranche.from}–${tranche.to})`, () => {
      for (let seed = 1; seed <= 4; seed++) {
        const level = generateLevel({ id: `t-${tranche.from}-${seed}`, seed, size: tranche.size, waypoints: tranche.waypoints, walls: tranche.walls });

        expect(validateLevel(level)).toEqual({ ok: true, errors: [] });
        expect(level.waypoints.length).toBeGreaterThanOrEqual(tranche.waypoints[0]);
        expect(level.waypoints.length).toBeLessThanOrEqual(tranche.waypoints[1]);
        expect(level.walls.length).toBeGreaterThanOrEqual(tranche.walls[0]);
        expect(level.walls.length).toBeLessThanOrEqual(tranche.walls[1]);

        // Feuille 1 au départ, dernière feuille à l'arrivée, numérotation continue.
        const first = level.solution[0] as [number, number];
        const last = level.solution[level.solution.length - 1] as [number, number];
        expect(level.waypoints[0]).toMatchObject({ n: 1, r: first[0], c: first[1] });
        expect(level.waypoints[level.waypoints.length - 1]).toMatchObject({ n: level.waypoints.length, r: last[0], c: last[1] });
        level.waypoints.forEach((w, i) => expect(w.n).toBe(i + 1));

        // Aucun mur ne coupe la solution.
        const path = level.solution.map(([r, c]) => cellIndex(level.size, r, c));
        const used = new Set(path.slice(1).map((cell, i) => edgeId(path[i] as number, cell)));
        for (const wall of level.walls) expect(used.has(wallToEdge(level.size, wall))).toBe(false);
      }
    }, 60_000);
  }

  it('génère un 8×8 en moins de 2 s', () => {
    const start = performance.now();
    generateLevel({ id: 't-speed', seed: 77, size: 8, waypoints: [6, 12], walls: [0, 10] });
    expect(performance.now() - start).toBeLessThan(2_000);
  });
});

describe('dates des défis quotidiens', () => {
  it('ajoute des jours en UTC, y compris au changement de mois et d’année', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-12-01', 0)).toBe('2026-12-01');
  });

  it('donne le bon jour de la semaine', () => {
    expect(weekdayOf('2026-12-01')).toBe(2); // mardi
    expect(weekdayOf('2026-12-06')).toBe(0); // dimanche
  });
});
