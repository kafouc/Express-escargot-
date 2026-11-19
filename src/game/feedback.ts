/**
 * Sons et vibrations (docs/brief.md §4). Les sons sont synthétisés avec Web Audio :
 * aucun fichier, aucune licence à gérer, quelques octets de code.
 * Tout est désactivable dans les réglages.
 */

export interface FeedbackSettings {
  sound: boolean;
  vibration: boolean;
}

type Wave = OscillatorType;

export class Feedback {
  private audio: AudioContext | null = null;
  settings: FeedbackSettings;

  constructor(settings: FeedbackSettings) {
    this.settings = settings;
  }

  /** Les navigateurs n'autorisent le son qu'après un geste de l'utilisateur. */
  unlock(): void {
    if (!this.settings.sound) return;
    try {
      this.audio ??= new AudioContext();
      if (this.audio.state === 'suspended') void this.audio.resume();
    } catch {
      this.audio = null;
    }
  }

  private tone(from: number, to: number, duration: number, wave: Wave, volume: number, delay = 0): void {
    if (!this.settings.sound || !this.audio || this.audio.state !== 'running') return;
    const ctx = this.audio;
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(from, start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(to, 1), start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  private vibrate(pattern: number | number[]): void {
    if (!this.settings.vibration) return;
    try {
      navigator.vibrate?.(pattern);
    } catch {
      // Vibration non disponible : on ignore.
    }
  }

  /** Une case de plus : petit « tic » très léger. */
  step(): void {
    this.tone(1300, 950, 0.035, 'sine', 0.035);
  }

  /** Vibration d'un pas (au moment du geste). */
  stepHaptic(): void {
    this.vibrate(5);
  }

  /** Feuille atteinte : l'animal croque (« cr-unch »). */
  leaf(): void {
    this.tone(520, 780, 0.07, 'triangle', 0.09);
    this.tone(700, 1050, 0.08, 'triangle', 0.08, 0.06);
  }

  leafHaptic(): void {
    this.vibrate(15);
  }

  /** Refus (mur, mauvais ordre) : son sourd + vibration. */
  blocked(): void {
    this.tone(190, 120, 0.13, 'triangle', 0.1);
    this.vibrate(30);
  }

  /** Victoire : petit arpège montant. */
  win(): void {
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, f * 1.01, 0.18, 'sine', 0.08, i * 0.09));
    this.vibrate([20, 40, 20, 40, 40]);
  }

  /** Clic d'interface. */
  click(): void {
    this.tone(880, 660, 0.03, 'sine', 0.03);
  }
}
