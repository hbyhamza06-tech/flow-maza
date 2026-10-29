import { GameSettings } from '../types/game';

// Pentatonic frequencies in warm acoustic register (C4 major pentatonic across 2 octaves)
const PENTATONIC_NOTES = [
  261.63, // C4
  293.66, // D4
  329.63, // E4
  392.00, // G4
  440.00, // A4
  523.25, // C5
  587.33, // D5
  659.25, // E5
  783.99, // G5
  880.00, // A5
];

class SoundEngine {
  private ctx: AudioContext | null = null;
  private settings: GameSettings = {
    soundEnabled: true,
    musicEnabled: true,
    hapticsEnabled: true,
    sfxVolume: 0.75,
    musicVolume: 0.45,
  };
  private musicInterval: number | null = null;
  private isMusicPlaying = false;
  private isAppPaused = false;
  private chordIndex = 0;

  constructor() {
    if (typeof window !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.handleAppPause();
        } else {
          this.handleAppResume();
        }
      });
      window.addEventListener('blur', () => this.handleAppPause());
      window.addEventListener('focus', () => this.handleAppResume());
    }
  }

  public updateSettings(newSettings: GameSettings) {
    const prevMusic = this.settings.musicEnabled;
    this.settings = { ...newSettings };

    if (!this.settings.musicEnabled && this.isMusicPlaying) {
      this.stopAmbientMusic();
    } else if (this.settings.musicEnabled && !prevMusic && !this.isAppPaused) {
      this.startAmbientMusic();
    }
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended' && !this.isAppPaused) {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public unlockAudio() {
    const ctx = this.ensureContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    if (this.settings.musicEnabled && !this.isMusicPlaying && !this.isAppPaused) {
      this.startAmbientMusic();
    }
  }

  public triggerHaptic(pattern: number | number[] = 10) {
    if (!this.settings.hapticsEnabled) return;
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Ignore on unsupported devices
      }
    }
  }

  // Soft wooden/felt tap for buttons
  public playButtonTap() {
    this.triggerHaptic(8);
    if (!this.settings.soundEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.045);

    const vol = 0.14 * this.settings.sfxVolume;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  // Gentle marimba/kalimba-like note when drawing along the maze path
  public playPathStep(stepIndex: number, isBacktrack = false) {
    this.triggerHaptic(isBacktrack ? 4 : 6);
    if (!this.settings.soundEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    const noteIdx = Math.abs(stepIndex) % PENTATONIC_NOTES.length;
    const baseFreq = PENTATONIC_NOTES[noteIdx];
    const freq = isBacktrack ? baseFreq * 0.85 : baseFreq;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.992, now + 0.12);

    const vol = (isBacktrack ? 0.07 : 0.11) * this.settings.sfxVolume;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  // Soft chime when collecting a waypoint star or using a portal
  public playWaypointChime() {
    this.triggerHaptic([12, 30, 18]);
    if (!this.settings.soundEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.045);

      const vol = 0.12 * this.settings.sfxVolume;
      gain.gain.setValueAtTime(0.001, now + idx * 0.045);
      gain.gain.linearRampToValueAtTime(vol, now + idx * 0.045 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.045 + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.045);
      osc.stop(now + idx * 0.045 + 0.38);
    });
  }

  // Gentle shimmer when revealing a hint
  public playHintChime() {
    this.triggerHaptic(15);
    if (!this.settings.soundEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const start = now + i * 0.055;
      osc.frequency.setValueAtTime(freq, start);

      const vol = 0.09 * this.settings.sfxVolume;
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(vol, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.42);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.45);
    });
  }

  // Satisfying warm chord chime for completing a level
  public playVictoryChime(stars: number) {
    this.triggerHaptic([20, 45, 30, 50, 40]);
    if (!this.settings.soundEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Warm C major 9th arpeggio
    const chord = [261.63, 329.63, 392.00, 493.88, 587.33, 783.99];
    const count = Math.min(chord.length, 3 + stars);

    for (let i = 0; i < count; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + i * 0.075;

      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(chord[i], start);

      const vol = 0.14 * this.settings.sfxVolume;
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(vol, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.85);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + 0.9);
    }
  }

  // Calm generative ambient background music
  public startAmbientMusic() {
    if (!this.settings.musicEnabled || this.isMusicPlaying || this.isAppPaused) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    this.isMusicPlaying = true;
    const chords = [
      [130.81, 196.00, 246.94, 329.63], // Cmaj7
      [110.00, 164.81, 220.00, 293.66], // Am9
      [174.61, 220.00, 261.63, 349.23], // Fmaj7
      [146.83, 220.00, 293.66, 392.00], // Dm11 / G6
    ];

    const playAmbientPad = () => {
      if (!this.settings.musicEnabled || !this.isMusicPlaying || this.isAppPaused) return;
      const audioCtx = this.ensureContext();
      if (!audioCtx || audioCtx.state !== 'running') return;

      const now = audioCtx.currentTime;
      const notes = chords[this.chordIndex % chords.length];
      this.chordIndex++;

      notes.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        const maxGain = (idx === 0 ? 0.032 : 0.022) * this.settings.musicVolume;
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(maxGain, now + 1.8);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 5.6);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(now);
        osc.stop(now + 5.8);
      });
    };

    playAmbientPad();
    this.musicInterval = window.setInterval(playAmbientPad, 5200);
  }

  public stopAmbientMusic() {
    this.isMusicPlaying = false;
    if (this.musicInterval !== null) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }

  private handleAppPause() {
    this.isAppPaused = true;
    this.stopAmbientMusic();
    if (this.ctx && this.ctx.state === 'running') {
      this.ctx.suspend().catch(() => {});
    }
  }

  private handleAppResume() {
    this.isAppPaused = false;
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (this.settings.musicEnabled && !this.isMusicPlaying) {
      this.startAmbientMusic();
    }
  }
}

export const soundEngine = new SoundEngine();
