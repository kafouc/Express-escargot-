/**
 * Analytics (docs/brief.md §8) : interface unique, implémentation stub (console + tampon en mémoire).
 * Le vrai fournisseur sera branché au lancement, sans toucher au reste du code.
 */

export type EventName =
  | 'session_start'
  | 'session_end'
  | 'level_start'
  | 'level_complete'
  | 'level_fail'
  | 'booster_used'
  | 'ad_rewarded_shown'
  | 'ad_interstitial_shown'
  | 'share_clicked';

export type EventParams = Record<string, string | number>;

export interface TrackedEvent {
  name: EventName;
  params: EventParams;
  /** Horodatage ISO. */
  at: string;
}

export interface Analytics {
  track(name: EventName, params?: EventParams): void;
}

const MAX_BUFFER = 500;

export class StubAnalytics implements Analytics {
  readonly events: TrackedEvent[] = [];
  private readonly log: (...args: unknown[]) => void;

  constructor(log: (...args: unknown[]) => void = console.info) {
    this.log = log;
  }

  track(name: EventName, params: EventParams = {}): void {
    this.events.push({ name, params, at: new Date().toISOString() });
    if (this.events.length > MAX_BUFFER) this.events.shift();
    this.log('[analytics]', name, params);
  }
}
