import { describe, expect, it } from 'vitest';
import { applyHint, createGame, isWon, moveTo, nextWaypoint, reset, truncateAt, blockReason } from '../src/game/rules.ts';
import type { Level } from '../src/core/types.ts';

// Grille 3×3 :  0 1 2 / 3 4 5 / 6 7 8
// Feuilles : 1 = case 0, 2 = case 1, 3 = case 3, 4 = case 8 ; mur entre 7 et 4.
// Solution unique : 0 1 2 5 4 3 6 7 8.
const level: Level = {
  id: 'test',
  size: 3,
  waypoints: [
    { n: 1, r: 0, c: 0 },
    { n: 2, r: 0, c: 1 },
    { n: 3, r: 1, c: 0 },
    { n: 4, r: 2, c: 2 },
  ],
  walls: [{ r: 1, c: 1, side: 'S' }],
  solution: [[0, 0], [0, 1], [0, 2], [1, 2], [1, 1], [1, 0], [2, 0], [2, 1], [2, 2]],
  difficulty: 1,
  seed: 0,
};

const play = (cells: number[]) => {
  const game = createGame(level);
  const results = cells.map((c) => moveTo(game, c));
  return { game, results };
};

describe('règles', () => {
  it('ne démarre que sur la feuille 1', () => {
    const game = createGame(level);
    expect(moveTo(game, 4)).toBe('ignored');
    expect(game.path).toEqual([]);
    expect(moveTo(game, 0)).toBe('started');
    expect(game.path).toEqual([0]);
  });

  it('avance case par case et gagne avec la solution', () => {
    const { game, results } = play([0, 1, 2, 5, 4, 3, 6, 7, 8]);
    expect(results.slice(1).every((r) => r === 'extended')).toBe(true);
    expect(isWon(game)).toBe(true);
  });

  it('ignore une case non voisine', () => {
    const { game, results } = play([0, 2]);
    expect(results[1]).toBe('ignored');
    expect(game.path).toEqual([0]);
  });

  it('refuse une feuille hors ordre', () => {
    const { game, results } = play([0, 3]);
    expect(results[1]).toBe('blocked');
    expect(blockReason(game, 3)).toBe('order');
    expect(game.path).toEqual([0]);
  });

  it('refuse de traverser un mur', () => {
    const { game, results } = play([0, 1, 2, 5, 4, 7]);
    expect(results[5]).toBe('blocked');
    expect(blockReason(game, 7)).toBe('wall');
  });

  it("refuse la dernière feuille tant que la grille n'est pas couverte", () => {
    // Feuilles 1, 2, 3 atteintes, mais les cases 2 et 5 restent vides.
    const { game, results } = play([0, 1, 4, 3, 6, 7, 8]);
    expect(results.slice(1, 6).every((r) => r === 'extended')).toBe(true);
    expect(results[6]).toBe('blocked');
    expect(blockReason(game, 8)).toBe('end-too-early');
  });

  it('recule en revenant sur la case précédente', () => {
    const { game, results } = play([0, 1, 2, 1]);
    expect(results[3]).toBe('retracted');
    expect(game.path).toEqual([0, 1]);
    expect(nextWaypoint(game)).toBe(3);
  });

  it('coupe le chemin sur une case déjà tracée, et se réinitialise', () => {
    const { game } = play([0, 1, 2, 5, 4]);
    expect(truncateAt(game, 2)).toBe(true);
    expect(game.path).toEqual([0, 1, 2]);
    expect(truncateAt(game, 8)).toBe(false);
    reset(game);
    expect(game.path).toEqual([]);
  });

  it("l'indice efface jusqu'à la première erreur puis montre 3 cases correctes", () => {
    // Début correct : l'indice prolonge simplement de 3 cases.
    const game = createGame(level);
    game.path.push(0, 1, 2, 5, 4);
    expect(applyHint(game)).toEqual([3, 6, 7]);
    expect(game.path).toEqual([0, 1, 2, 5, 4, 3, 6, 7]);

    const wrong = createGame(level);
    wrong.path.push(0, 1, 4);
    expect(applyHint(wrong)).toEqual([2, 5, 4]);
    expect(wrong.path).toEqual([0, 1, 2, 5, 4]);
  });
});
