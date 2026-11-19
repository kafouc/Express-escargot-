/** Défi du jour : série de jours consécutifs et texte de partage (docs/brief.md §6.5 et §6.7). */
import { plural, t, GAME_NAME, type Lang } from './i18n.ts';

/** Ajoute `days` jours à une date « AAAA-MM-JJ » (UTC). */
export function shiftDate(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Nombre de jours consécutifs réussis se terminant aujourd'hui,
 * ou hier si le défi d'aujourd'hui n'est pas encore fait (la série n'est pas perdue avant minuit).
 */
export function currentStreak(doneDates: readonly string[], today: string): number {
  const done = new Set(doneDates);
  let day = done.has(today) ? today : shiftDate(today, -1);
  let streak = 0;
  while (done.has(day)) {
    streak++;
    day = shiftDate(day, -1);
  }
  return streak;
}

export interface ShareInput {
  mode: 'campaign' | 'daily';
  /** Numéro du niveau de campagne, ou numéro du défi (1 = premier défi). */
  number: number;
  seconds: number;
  hints: number;
  /** Série en cours (défi du jour uniquement). */
  streak: number;
  url: string;
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Texte partageable, sans jamais révéler la solution. */
export function buildShareText(input: ShareInput): string {
  const title = t(input.mode === 'daily' ? 'share.daily' : 'share.campaign', { n: input.number });
  const parts = [t('share.time', { time: formatTime(input.seconds) })];
  if (input.mode === 'daily' && input.streak > 0) parts.push(plural(input.streak, 'share.streakOne', 'share.streakMany'));
  parts.push(input.hints === 0 ? t('share.noHint') : plural(input.hints, 'share.hintsOne', 'share.hintsMany'));
  return [title, parts.join(' · '), input.url].filter(Boolean).join('\n');
}

export type ShareOutcome = 'shared' | 'copied' | 'failed';

/** Partage natif (mobile) si possible, sinon copie dans le presse-papiers. */
export async function shareText(text: string, lang: Lang): Promise<ShareOutcome> {
  try {
    if (navigator.share) {
      await navigator.share({ title: GAME_NAME[lang], text });
      return 'shared';
    }
  } catch (error) {
    // L'utilisateur a fermé la feuille de partage : pas une erreur.
    if (error instanceof DOMException && error.name === 'AbortError') return 'shared';
  }
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'failed';
  }
}
