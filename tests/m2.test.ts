import { afterEach, describe, expect, it, vi } from 'vitest';
import { DICTIONARIES, detectLanguage, plural, setLanguage, t } from '../src/game/i18n.ts';
import { buildShareText, currentStreak, formatTime, shiftDate } from '../src/game/daily.ts';
import { INTERSTITIAL_RULES, StubAds, shouldShowInterstitial, type InterstitialContext } from '../src/monetization/ads.ts';
import { StubAnalytics } from '../src/analytics/track.ts';

afterEach(() => setLanguage('fr'));

describe('traductions', () => {
  it('ont exactement les mêmes clés en français et en anglais, sans texte vide', () => {
    const frKeys = Object.keys(DICTIONARIES.fr).sort();
    expect(Object.keys(DICTIONARIES.en).sort()).toEqual(frKeys);
    for (const lang of ['fr', 'en'] as const) {
      for (const [key, value] of Object.entries(DICTIONARIES[lang])) expect(value.trim(), `${lang}:${key}`).not.toBe('');
    }
  });

  it('gardent les mêmes {paramètres} dans les deux langues', () => {
    const params = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(',');
    for (const key of Object.keys(DICTIONARIES.fr) as (keyof typeof DICTIONARIES.fr)[]) {
      expect(params(DICTIONARIES.en[key]), key).toBe(params(DICTIONARIES.fr[key]));
    }
  });

  it('détectent la langue du navigateur', () => {
    expect(detectLanguage(['fr-FR', 'en'])).toBe('fr');
    expect(detectLanguage(['fr-CI'])).toBe('fr');
    expect(detectLanguage(['en-US'])).toBe('en');
    expect(detectLanguage(['de-DE'])).toBe('en');
    expect(detectLanguage([])).toBe('en');
  });

  it('remplacent les paramètres et gèrent le pluriel', () => {
    expect(t('level.label', { n: 3, total: 200 })).toBe('Niveau 3 / 200');
    setLanguage('en');
    expect(t('level.label', { n: 3, total: 200 })).toBe('Level 3 / 200');
    expect(plural(1, 'win.streakOne', 'win.streakMany')).toBe('Streak: 1 day');
    expect(plural(4, 'win.streakOne', 'win.streakMany')).toBe('Streak: 4 days');
  });
});

describe('série du défi du jour', () => {
  it('compte les jours consécutifs jusqu’à aujourd’hui', () => {
    expect(currentStreak(['2026-12-01', '2026-12-02', '2026-12-03'], '2026-12-03')).toBe(3);
  });

  it("n'est pas perdue tant que le défi du jour n'est pas fait", () => {
    expect(currentStreak(['2026-12-01', '2026-12-02'], '2026-12-03')).toBe(2);
  });

  it('repart de zéro après un jour manqué', () => {
    expect(currentStreak(['2026-12-01', '2026-12-03'], '2026-12-03')).toBe(1);
    expect(currentStreak(['2026-12-01'], '2026-12-04')).toBe(0);
    expect(currentStreak([], '2026-12-04')).toBe(0);
  });

  it('traverse les changements de mois et d’année', () => {
    expect(shiftDate('2027-01-01', -1)).toBe('2026-12-31');
    expect(currentStreak(['2026-12-30', '2026-12-31', '2027-01-01'], '2027-01-01')).toBe(3);
  });
});

describe('texte de partage', () => {
  it('résume le défi sans révéler la solution', () => {
    const text = buildShareText({ mode: 'daily', number: 12, seconds: 102, hints: 0, streak: 5, url: 'https://exemple.test/' });
    expect(text).toBe('Escargot Express · défi n°12\nTemps 1:42 · série de 5 jours · sans indice\nhttps://exemple.test/');
  });

  it('existe en anglais, et pour la campagne', () => {
    setLanguage('en');
    const text = buildShareText({ mode: 'campaign', number: 42, seconds: 65, hints: 2, streak: 0, url: '' });
    expect(text).toBe('Snail Trail · level 42\nTime 1:05 · 2 hints');
  });

  it('formate le temps', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(59.9)).toBe('0:59');
    expect(formatTime(600)).toBe('10:00');
  });
});

describe('règles des interstitiels', () => {
  const base: InterstitialContext = {
    mode: 'campaign', levelNumber: 20, noAds: false, winsSinceLast: 3, lastShownAt: -Infinity, now: 1_000_000,
  };

  it('s’affiche quand toutes les conditions sont réunies', () => {
    expect(shouldShowInterstitial(base)).toBe(true);
  });

  it('jamais sur le défi du jour, ni avant le niveau 10, ni avec « sans pub »', () => {
    expect(shouldShowInterstitial({ ...base, mode: 'daily' })).toBe(false);
    expect(shouldShowInterstitial({ ...base, levelNumber: INTERSTITIAL_RULES.fromLevel - 1 })).toBe(false);
    expect(shouldShowInterstitial({ ...base, noAds: true })).toBe(false);
  });

  it('au plus une toutes les 3 victoires et toutes les 90 s', () => {
    expect(shouldShowInterstitial({ ...base, winsSinceLast: 2 })).toBe(false);
    expect(shouldShowInterstitial({ ...base, lastShownAt: base.now - 89_000 })).toBe(false);
    expect(shouldShowInterstitial({ ...base, lastShownAt: base.now - 90_000 })).toBe(true);
  });
});

describe('pubs et analytics simulées', () => {
  it('une pub récompensée journalise l’événement puis accorde la récompense', async () => {
    vi.useFakeTimers();
    const analytics = new StubAnalytics(() => {});
    const notify = vi.fn();
    const ads = new StubAds(analytics, notify);
    const onReward = vi.fn();
    ads.showRewarded('hint', onReward);
    expect(onReward).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledWith('hint');
    vi.advanceTimersByTime(500);
    expect(onReward).toHaveBeenCalledOnce();
    ads.showInterstitial('between_levels');
    expect(analytics.events.map((e) => e.name)).toEqual(['ad_rewarded_shown', 'ad_interstitial_shown']);
    expect(analytics.events[0]?.params).toEqual({ placement: 'hint' });
    vi.useRealTimers();
  });
});
