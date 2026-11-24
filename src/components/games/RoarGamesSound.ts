// Lightweight Web Audio API synthesizer for ROAR Play & Win mini-games
class RoarGameSoundEngine {
  private ctx: AudioContext | null = null;
  public muted = false;

  private ensureContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return null;
      this.ctx = new Ctx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private playTone(freq: number, duration: number, type: OscillatorType = 'sine', gainVal = 0.08, delay = 0) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(gainVal, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  tick() {
    this.playTone(720, 0.04, 'triangle', 0.045);
  }

  flip() {
    this.playTone(520, 0.07, 'sine', 0.05);
  }

  match() {
    this.playTone(587.33, 0.09, 'sine', 0.07, 0);
    this.playTone(880, 0.14, 'sine', 0.07, 0.07);
  }

  catchGood() {
    this.playTone(660, 0.07, 'triangle', 0.06, 0);
    this.playTone(990, 0.11, 'triangle', 0.06, 0.05);
  }

  catchGolden() {
    this.playTone(784, 0.08, 'sine', 0.08, 0);
    this.playTone(1046.5, 0.09, 'sine', 0.08, 0.06);
    this.playTone(1318.5, 0.16, 'sine', 0.08, 0.12);
  }

  catchBad() {
    this.playTone(190, 0.16, 'sawtooth', 0.055, 0);
    this.playTone(135, 0.2, 'sawtooth', 0.055, 0.08);
  }

  rattle() {
    this.playTone(320, 0.035, 'triangle', 0.04, 0);
    this.playTone(460, 0.035, 'triangle', 0.035, 0.04);
  }

  fortuneReveal() {
    this.playTone(587.33, 0.14, 'sine', 0.07, 0);
    this.playTone(783.99, 0.18, 'sine', 0.07, 0.1);
    this.playTone(1174.66, 0.28, 'triangle', 0.08, 0.2);
  }

  pickupBlock() {
    this.playTone(540, 0.04, 'sine', 0.035, 0);
  }

  placeBlock() {
    this.playTone(210, 0.06, 'sine', 0.075, 0);
    this.playTone(480, 0.045, 'triangle', 0.045, 0.015);
  }

  clearLine(combo = 1, lineCount = 1) {
    const scaleStep = [523.25, 587.33, 659.25, 783.99, 880.0, 987.77, 1046.5, 1174.66];
    const base = scaleStep[Math.min(Math.max(combo - 1, 0), scaleStep.length - 1)];
    this.playTone(base, 0.1, 'triangle', 0.075, 0);
    this.playTone(base * 1.25, 0.12, 'sine', 0.07, 0.045);
    this.playTone(base * 1.5, 0.18, 'triangle', 0.08, 0.09);
    if (lineCount >= 2 || combo >= 3) {
      this.playTone(base * 2, 0.24, 'sine', 0.065, 0.14);
    }
  }

  gameOver() {
    this.playTone(330, 0.16, 'triangle', 0.06, 0);
    this.playTone(261.63, 0.22, 'triangle', 0.06, 0.12);
  }

  win() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      this.playTone(n, 0.22, 'triangle', 0.08, idx * 0.09);
    });
  }

  private lofiTimer: number | null = null;
  private lofiStep = 0;
  private noiseSource: AudioBufferSourceNode | null = null;
  private noiseGain: GainNode | null = null;
  public lofiActive = false;

  cubeWhoosh(combo = 1) {
    const base = 440 + Math.min(combo, 10) * 42;
    this.playTone(base, 0.075, 'sine', 0.055, 0);
    this.playTone(base * 1.45, 0.11, 'triangle', 0.05, 0.03);
  }

  cubeWhooshChill(combo = 1) {
    // Soft warm marimba / wooden ceramic ASMR tap
    const pentatonic = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33];
    const freq = pentatonic[(combo - 1) % pentatonic.length] || 329.63;
    this.playTone(freq, 0.14, 'sine', 0.048, 0);
    this.playTone(freq * 2, 0.09, 'sine', 0.018, 0.02);
  }

  chillBell() {
    this.playTone(528, 0.65, 'sine', 0.06, 0);
    this.playTone(792, 0.55, 'sine', 0.04, 0.12);
    this.playTone(1056, 0.75, 'sine', 0.035, 0.25);
  }

  cubeBlocked() {
    this.playTone(170, 0.09, 'sawtooth', 0.045, 0);
    this.playTone(125, 0.11, 'triangle', 0.05, 0.04);
  }

  cubeSmash() {
    this.playTone(260, 0.08, 'square', 0.06, 0);
    this.playTone(740, 0.12, 'triangle', 0.06, 0.03);
  }

  cubeShuffle() {
    [440, 554.37, 659.25, 880].forEach((f, idx) => {
      this.playTone(f, 0.07, 'sine', 0.045, idx * 0.045);
    });
  }

  coinClink() {
    this.playTone(987.77, 0.08, 'sine', 0.055, 0);
    this.playTone(1318.51, 0.14, 'sine', 0.06, 0.055);
  }

  private playLofiChord() {
    if (!this.lofiActive || this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    // Warm jazz progression: Cmaj9 -> Am9 -> Fmaj7 -> G6
    const chords = [
      [261.63, 329.63, 392.0, 493.88, 587.33],
      [220.0, 261.63, 329.63, 392.0, 493.88],
      [174.61, 220.0, 261.63, 329.63, 440.0],
      [196.0, 246.94, 293.66, 329.63, 440.0],
    ];
    const chord = chords[this.lofiStep % chords.length];
    this.lofiStep += 1;

    const now = ctx.currentTime;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(520, now);

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.linearRampToValueAtTime(0.032, now + 0.35);
    master.gain.exponentialRampToValueAtTime(0.001, now + 2.35);

    filter.connect(master);
    master.connect(ctx.destination);

    chord.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      osc.type = idx === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.04);
      osc.connect(filter);
      osc.start(now + idx * 0.04);
      osc.stop(now + 2.45);
    });
  }

  startLofi(): boolean {
    if (this.lofiActive) return true;
    const prevMuted = this.muted;
    if (prevMuted) this.muted = false;
    const ctx = this.ensureContext();
    if (!ctx) return false;

    this.lofiActive = true;
    this.lofiStep = 0;

    // Soft cafe rain / espresso ambient noise bed
    try {
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = output[i];
        output[i] *= 2.4;
      }
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer;
      src.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 680;
      filter.Q.value = 0.7;

      const nGain = ctx.createGain();
      nGain.gain.value = 0.015;

      src.connect(filter);
      filter.connect(nGain);
      nGain.connect(ctx.destination);
      src.start();
      this.noiseSource = src;
      this.noiseGain = nGain;
    } catch {
      // ignore noise fallback
    }

    this.playLofiChord();
    this.lofiTimer = window.setInterval(() => {
      this.playLofiChord();
    }, 2400);
    return true;
  }

  stopLofi() {
    this.lofiActive = false;
    if (this.lofiTimer !== null) {
      window.clearInterval(this.lofiTimer);
      this.lofiTimer = null;
    }
    if (this.noiseSource) {
      try {
        this.noiseSource.stop();
        this.noiseSource.disconnect();
      } catch {
        // ignore
      }
      this.noiseSource = null;
    }
    if (this.noiseGain) {
      try {
        this.noiseGain.disconnect();
      } catch {
        // ignore
      }
      this.noiseGain = null;
    }
  }

  toggleLofi(): boolean {
    if (this.lofiActive) {
      this.stopLofi();
      return false;
    }
    return this.startLofi();
  }
}

export const gameSound = new RoarGameSoundEngine();
