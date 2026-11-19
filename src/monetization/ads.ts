/**
 * Publicités (docs/brief.md §7) : interface unique + implémentation stub.
 * Le vrai SDK (CrazyGames, Playgama, AdMob…) sera branché au lancement derrière la même interface.
 */
import type { Analytics } from '../analytics/track.ts';

export type RewardedPlacement = 'hint' | 'skip_level';
export type InterstitialPlacement = 'between_levels';

export interface Ads {
  showRewarded(placement: RewardedPlacement, onReward: () => void, onClose?: () => void): void;
  showInterstitial(placement: InterstitialPlacement): void;
}

/** Pub simulée : journalise, prévient l'interface, et accorde la récompense après 500 ms. */
export class StubAds implements Ads {
  private readonly analytics: Analytics;
  private readonly notify: (placement: string) => void;

  constructor(analytics: Analytics, notify: (placement: string) => void = () => {}) {
    this.analytics = analytics;
    this.notify = notify;
  }

  showRewarded(placement: RewardedPlacement, onReward: () => void, onClose?: () => void): void {
    this.analytics.track('ad_rewarded_shown', { placement });
    console.info('[ads] rewarded', placement);
    this.notify(placement);
    setTimeout(() => {
      onReward();
      onClose?.();
    }, 500);
  }

  showInterstitial(placement: InterstitialPlacement): void {
    this.analytics.track('ad_interstitial_shown', { placement });
    console.info('[ads] interstitial', placement);
    this.notify(placement);
  }
}

/** Règles d'affichage des interstitiels (brief §7). */
export const INTERSTITIAL_RULES = {
  /** Pas d'interstitiel avant ce niveau de campagne. */
  fromLevel: 10,
  /** Au plus un toutes les N victoires. */
  everyWins: 3,
  /** Au plus un toutes les N millisecondes. */
  minIntervalMs: 90_000,
} as const;

export interface InterstitialContext {
  mode: 'campaign' | 'daily';
  /** Numéro (1-indexé) du niveau de campagne qui vient d'être gagné. */
  levelNumber: number;
  noAds: boolean;
  /** Victoires de campagne depuis le dernier interstitiel (celle-ci comprise). */
  winsSinceLast: number;
  /** Horodatage (ms) du dernier interstitiel, ou -Infinity. */
  lastShownAt: number;
  now: number;
}

/** Jamais sur le défi du jour, jamais avant le niveau 10, au plus 1 toutes les 3 victoires et 1 toutes les 90 s. */
export function shouldShowInterstitial(c: InterstitialContext): boolean {
  return (
    c.mode === 'campaign' &&
    !c.noAds &&
    c.levelNumber >= INTERSTITIAL_RULES.fromLevel &&
    c.winsSinceLast >= INTERSTITIAL_RULES.everyWins &&
    c.now - c.lastShownAt >= INTERSTITIAL_RULES.minIntervalMs
  );
}

/** Indices : le premier est gratuit sur chaque niveau, les suivants passent par une pub récompensée. */
export const FREE_HINTS_PER_LEVEL = 1;

/** Proposer de passer le niveau après ce temps de jeu (campagne uniquement). */
export const SKIP_OFFER_AFTER_MS = 3 * 60 * 1000;
