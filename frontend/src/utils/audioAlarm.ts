// Web Audio API Sound Synthesizer — High-Fidelity Soundscapes
// Generates realistic multi-oscillator sirens, crystal chords, and alerts.

class AudioSynthesizer {
  private ctx: AudioContext | null = null;
  private isSirenPlaying = false;
  private sirenStopFn: (() => void) | null = null;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // 1. High-Impact Multi-Tone Emergency Siren (Ambulance / Fire Alert)
  playEmergencySiren(durationSeconds = 6) {
    try {
      const ctx = this.initContext();
      if (!ctx || this.isSirenPlaying) return;

      this.isSirenPlaying = true;
      const now = ctx.currentTime;

      // Master gain
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.25, now);
      masterGain.gain.exponentialRampToValueAtTime(0.001, now + durationSeconds);
      masterGain.connect(ctx.destination);

      // Primary Siren Oscillator (Sweeping Sawtooth)
      const osc1 = ctx.createOscillator();
      osc1.type = 'sawtooth';

      // Harmonic Piercing Oscillator (Square wave for urgency)
      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';

      // Sub Bass Drone for rumble
      const sub = ctx.createOscillator();
      sub.type = 'triangle';
      sub.frequency.setValueAtTime(110, now);

      const cycle = 0.55; // 550ms per sweep cycle
      const cycles = Math.ceil(durationSeconds / cycle);

      for (let i = 0; i < cycles; i++) {
        const t = now + i * cycle;
        // Frequency sweep 650Hz <-> 1150Hz
        osc1.frequency.setValueAtTime(620, t);
        osc1.frequency.exponentialRampToValueAtTime(1180, t + cycle / 2);
        osc1.frequency.exponentialRampToValueAtTime(620, t + cycle);

        // Harmonic overtone 1240Hz <-> 2360Hz
        osc2.frequency.setValueAtTime(1240, t);
        osc2.frequency.exponentialRampToValueAtTime(2360, t + cycle / 2);
        osc2.frequency.exponentialRampToValueAtTime(1240, t + cycle);
      }

      osc1.connect(masterGain);
      osc2.connect(masterGain);
      sub.connect(masterGain);

      osc1.start(now);
      osc2.start(now);
      sub.start(now);

      osc1.stop(now + durationSeconds);
      osc2.stop(now + durationSeconds);
      sub.stop(now + durationSeconds);

      this.sirenStopFn = () => {
        try {
          masterGain.gain.setValueAtTime(0, ctx.currentTime);
          osc1.stop();
          osc2.stop();
          sub.stop();
        } catch (e) {}
        this.isSirenPlaying = false;
      };

      setTimeout(() => {
        this.isSirenPlaying = false;
      }, durationSeconds * 1000);
    } catch (e) {
      console.warn("Audio siren error:", e);
      this.isSirenPlaying = false;
    }
  }

  // 2. Crystal Success Chime (Played when raising a complaint)
  playComplaintSuccess() {
    try {
      const ctx = this.initContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // 4-Note Ascending Crystal Arpeggio: C5 (523Hz), E5 (659Hz), G5 (784Hz), C6 (1046Hz)
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, index) => {
        const noteTime = now + index * 0.08;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteTime);

        // Soft attack, sparkling decay
        gain.gain.setValueAtTime(0.001, noteTime);
        gain.gain.exponentialRampToValueAtTime(0.18, noteTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.6);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(noteTime);
        osc.stop(noteTime + 0.65);
      });
    } catch (e) {
      console.warn("Audio success chime error:", e);
    }
  }

  // 3. Status Notification / Chat Ping
  playChime() {
    try {
      const ctx = this.initContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(784, now); // G5
      osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.12); // C6

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.45);
    } catch (e) {
      console.warn("Audio chime error:", e);
    }
  }

  // 4. Dramatic Countdown Tick (for 3-second SOS)
  playCountdownTick(isFinal = false) {
    try {
      const ctx = this.initContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = isFinal ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(isFinal ? 1200 : 880, now);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.12);
    } catch (e) {}
  }

  // 5. Warning / Blocked / Error Thud
  playErrorWarning() {
    try {
      const ctx = this.initContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(70, now + 0.3);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {}
  }

  stopAll() {
    if (this.sirenStopFn) {
      this.sirenStopFn();
      this.sirenStopFn = null;
    }
    this.isSirenPlaying = false;
  }
}

export const audioSynth = typeof window !== 'undefined' ? new AudioSynthesizer() : null;
