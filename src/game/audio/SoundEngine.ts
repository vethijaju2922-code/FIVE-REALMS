import { GameSettings, WorldId } from '../../types/game';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicTimer: number | null = null;
  private currentWorld: WorldId | null = null;
  private stepIndex = 0;

  private settings: GameSettings = {
    musicEnabled: true,
    sfxEnabled: true,
    musicVolume: 0.45,
    sfxVolume: 0.7,
    performanceMode: false,
  };

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.musicGain.connect(this.ctx.destination);
      this.sfxGain.connect(this.ctx.destination);
      this.applyVolumes();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public unlock(): void {
    this.ensureContext();
  }

  public updateSettings(settings: GameSettings): void {
    this.settings = settings;
    this.applyVolumes();
    if (!settings.musicEnabled) {
      this.stopMusic();
    } else if (this.currentWorld && this.musicTimer === null) {
      this.startWorldMusic(this.currentWorld);
    }
  }

  private applyVolumes(): void {
    if (!this.ctx || !this.musicGain || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    this.musicGain.gain.setTargetAtTime(
      this.settings.musicEnabled ? this.settings.musicVolume * 0.28 : 0,
      now,
      0.08
    );
    this.sfxGain.gain.setTargetAtTime(
      this.settings.sfxEnabled ? this.settings.sfxVolume * 0.45 : 0,
      now,
      0.05
    );
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    target: 'sfx' | 'music',
    freqEnd?: number,
    delay = 0
  ): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (target === 'sfx' && !this.settings.sfxEnabled) return;
    if (target === 'music' && !this.settings.musicEnabled) return;

    const gainNode = target === 'sfx' ? this.sfxGain : this.musicGain;
    if (!gainNode) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (freqEnd !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + duration);
    }

    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(volume, now + Math.min(0.025, duration * 0.2));
    env.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(env);
    env.connect(gainNode);

    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  public playUiClick(): void {
    this.playTone(620, 0.06, 'triangle', 0.28, 'sfx', 880);
  }

  public playFootstep(worldId: WorldId): void {
    const base = worldId === 'frozen' ? 180 : worldId === 'sunken' ? 95 : 130;
    this.playTone(base + Math.random() * 25, 0.05, 'triangle', 0.14, 'sfx', 55);
  }

  public playJump(): void {
    this.playTone(220, 0.18, 'sine', 0.35, 'sfx', 540);
  }

  public playSlide(): void {
    this.playTone(300, 0.16, 'sawtooth', 0.14, 'sfx', 110);
  }

  public playLaneSwitch(): void {
    this.playTone(340, 0.07, 'sine', 0.15, 'sfx', 440);
  }

  public playCoin(): void {
    this.playTone(987.77, 0.09, 'sine', 0.28, 'sfx');
    this.playTone(1318.5, 0.14, 'triangle', 0.25, 'sfx', undefined, 0.045);
  }

  public playGemOrClue(): void {
    this.playTone(587.33, 0.12, 'triangle', 0.32, 'sfx');
    this.playTone(880, 0.14, 'sine', 0.32, 'sfx', undefined, 0.07);
    this.playTone(1174.66, 0.24, 'sine', 0.34, 'sfx', undefined, 0.14);
  }

  public playEquipment(): void {
    this.playTone(440, 0.14, 'triangle', 0.3, 'sfx', 880);
    this.playTone(660, 0.22, 'sine', 0.28, 'sfx', 1100, 0.06);
  }

  public playRopeLatch(): void {
    this.playTone(320, 0.12, 'triangle', 0.26, 'sfx', 720);
  }

  public playOxygenBubble(): void {
    this.playTone(380, 0.12, 'sine', 0.28, 'sfx', 760);
  }

  public playCollision(shieldBlocked = false): void {
    if (shieldBlocked) {
      this.playTone(520, 0.25, 'sine', 0.35, 'sfx', 240);
      return;
    }
    this.playTone(160, 0.28, 'sawtooth', 0.42, 'sfx', 45);
    this.playTone(95, 0.32, 'square', 0.22, 'sfx', 38, 0.02);
  }

  public playVictory(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      this.playTone(n, 0.35, 'triangle', 0.34, 'sfx', undefined, idx * 0.09);
    });
  }

  public startWorldMusic(worldId: WorldId): void {
    this.currentWorld = worldId;
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    if (!this.settings.musicEnabled) return;

    const scales: Record<WorldId, { notes: number[]; wave: OscillatorType; tempoMs: number }> = {
      jungle: {
        // Warm pentatonic marimba adventure
        notes: [261.63, 293.66, 329.63, 392.0, 440.0, 392.0, 329.63, 523.25],
        wave: 'triangle',
        tempoMs: 320,
      },
      desert: {
        // Phrygian dominant desert motif
        notes: [220.0, 233.08, 277.18, 293.66, 329.63, 293.66, 277.18, 233.08],
        wave: 'sine',
        tempoMs: 360,
      },
      frozen: {
        // Crystalline Dorian bells
        notes: [293.66, 329.63, 349.23, 440.0, 493.88, 523.25, 440.0, 349.23],
        wave: 'sine',
        tempoMs: 380,
      },
      sunken: {
        // Deep aquatic lydian pulse
        notes: [196.0, 246.94, 293.66, 369.99, 392.0, 369.99, 293.66, 246.94],
        wave: 'sine',
        tempoMs: 420,
      },
      celestial: {
        // Ethereal cosmic arpeggio
        notes: [329.63, 415.3, 493.88, 659.25, 587.33, 493.88, 415.3, 739.99],
        wave: 'triangle',
        tempoMs: 300,
      },
    };

    const config = scales[worldId];
    this.stepIndex = 0;

    this.musicTimer = window.setInterval(() => {
      if (!this.settings.musicEnabled || !this.ctx || this.ctx.state !== 'running') return;
      const note = config.notes[this.stepIndex % config.notes.length];
      this.playTone(note, 0.34, config.wave, 0.24, 'music');
      if (this.stepIndex % 4 === 0) {
        this.playTone(note * 0.5, 0.65, 'sine', 0.22, 'music');
      }
      this.stepIndex++;
    }, config.tempoMs);
  }

  public stopMusic(): void {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}

export const soundEngine = new SoundEngine();
