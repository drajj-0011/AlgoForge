/**
 * Featherweight WebAudio synth. Every sound is bound to a visible event:
 * frontier ticks while the search floods, a chord when the path locks in,
 * a low thud when the goal is unreachable.
 */
class LabSound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private lastTick = 0;
  private unlocked = false;
  enabled = true;

  private ensure(): AudioContext | null {
    if (typeof window === "undefined" || !this.unlocked) return null;
    try {
      if (!this.ctx) {
        const Ctor =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (!Ctor) return null;
        this.ctx = new Ctor();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.055;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return this.ctx;
    } catch {
      return null;
    }
  }

  /** Call from a user gesture so the context is unlocked. */
  unlock(): void {
    this.unlocked = true;
    this.ensure();
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    if (on && this.unlocked) this.ensure();
  }

  tick(progress: number): void {
    if (!this.enabled) return;
    const now = performance.now();
    if (now - this.lastTick < 55) return;
    this.lastTick = now;
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 240 + progress * 520;
      gain.gain.setValueAtTime(0.16, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.connect(gain).connect(this.master);
      osc.start();
      osc.stop(ctx.currentTime + 0.06);
    } catch {
      /* audio is decorative — never break the lab */
    }
  }

  chime(): void {
    if (!this.enabled) return;
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    try {
      [523.25, 659.25, 783.99].forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.value = f;
        const t = ctx.currentTime + i * 0.07;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        osc.connect(gain).connect(this.master!);
        osc.start(t);
        osc.stop(t + 0.55);
      });
    } catch {
      /* noop */
    }
  }

  thud(): void {
    if (!this.enabled) return;
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(140, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(48, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain).connect(this.master);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch {
      /* noop */
    }
  }
}

export const labSound = new LabSound();