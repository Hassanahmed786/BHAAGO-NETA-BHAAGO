// ─── SoundEngine — Web Audio API programmatic sounds ─────────────────────────
// No audio files needed. All sounds synthesized in real-time.

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private muted: boolean = false;

  constructor() {
    // Lazy-init to avoid autoplay restrictions
  }

  private _ensureCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.35;
      this.masterGain.connect(this.ctx.destination);
    }
    // Resume if suspended (Chrome autoplay policy)
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return this.ctx;
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.masterGain) {
      this.masterGain.gain.value = m ? 0 : 0.35;
    }
  }

  // ─── Coin collect: short high-pitched beep ────────────────────────────────
  playCoinCollect() {
    if (this.muted) return;
    try {
      const ctx   = this._ensureCtx();
      const osc   = ctx.createOscillator();
      const gain  = ctx.createGain();
      osc.type    = "sine";
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(1600, ctx.currentTime + 0.06);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.12);
    } catch (_) {}
  }

  // ─── Jump: whoosh (frequency sweep) ──────────────────────────────────────
  playJump() {
    if (this.muted) return;
    try {
      const ctx  = this._ensureCtx();
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type   = "sawtooth";
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    } catch (_) {}
  }

  // ─── Whoosh: lane switch ──────────────────────────────────────────────────
  playWhoosh(volume: number = 0.2) {
    if (this.muted) return;
    try {
      const ctx   = this._ensureCtx();
      const noise = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain  = ctx.createGain();
      noise.type  = "sawtooth";
      noise.frequency.setValueAtTime(400, ctx.currentTime);
      noise.frequency.linearRampToValueAtTime(200, ctx.currentTime + 0.1);
      filter.type      = "bandpass";
      filter.frequency.value = 800;
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain!);
      noise.start(ctx.currentTime);
      noise.stop(ctx.currentTime + 0.1);
    } catch (_) {}
  }

  // ─── Death: descending tone ───────────────────────────────────────────────
  playDeath() {
    if (this.muted) return;
    try {
      const ctx  = this._ensureCtx();
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type   = "square";
      osc.frequency.setValueAtTime(660, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(110, ctx.currentTime + 0.6);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.7);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.7);
    } catch (_) {}
  }

  // ─── TX confirmed: success chime ─────────────────────────────────────────
  playTxConfirmed() {
    if (this.muted) return;
    try {
      const ctx = this._ensureCtx();
      const now = ctx.currentTime;
      const notes = [523, 659, 784, 1047]; // C E G C
      notes.forEach((freq, i) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type   = "sine";
        osc.frequency.value = freq;
        const t = now + i * 0.08;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.3, t + 0.02);
        gain.gain.linearRampToValueAtTime(0, t + 0.18);
        osc.connect(gain);
        gain.connect(this.masterGain!);
        osc.start(t);
        osc.stop(t + 0.2);
      });
    } catch (_) {}
  }

  // ─── Power activate: epic swell ──────────────────────────────────────────
  playPowerActivate() {
    if (this.muted) return;
    try {
      const ctx  = this._ensureCtx();
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type   = "sine";
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } catch (_) {}
  }

  // ─── Menu music: ambient loop ─────────────────────────────────────────────
  private _menuOscillators: OscillatorNode[] = [];

  playMenuAmbience() {
    if (this.muted) return;
    try {
      const ctx   = this._ensureCtx();
      const freqs = [110, 165, 220, 330];
      for (const freq of freqs) {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type   = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        osc.connect(gain);
        gain.connect(this.masterGain!);
        osc.start();
        this._menuOscillators.push(osc);
      }
    } catch (_) {}
  }

  stopMenuAmbience() {
    for (const osc of this._menuOscillators) {
      try { osc.stop(); } catch (_) {}
    }
    this._menuOscillators = [];
  }
}
