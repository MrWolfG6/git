/* ═══════════════════════════════════════════════════════════
   POWERTRAIN AUDIO
   Every engine here is synthesised in the browser from the car's
   own profile — cylinder count, idle, redline, how much turbo and
   how much electric whine. Nothing is sampled.

   Recordings of the real cars are licensed material and are not
   shipped with this site. Drop your own licensed loops into
   assets/audio/<car-id>.mp3 and this module will prefer them —
   see loadSample() at the bottom.
   ═══════════════════════════════════════════════════════════ */

const TAU = Math.PI * 2;

/* how each engine family is voiced: [harmonic, gain] pairs over
   the firing frequency, plus the character of the filter */
const VOICES = {
  v12:      { parts: [[0.5, .32], [1, .55], [2, .34], [3, .16], [4.5, .07]], cutoff: [260, 3400], q: 3.2, drive: 0.22, sub: 0.55 },
  v8:       { parts: [[0.5, .60], [1, .52], [1.5, .22], [2, .30], [3, .14]],  cutoff: [190, 3100], q: 5.0, drive: 0.55, sub: 0.85 },
  'race-v8':{ parts: [[0.5, .40], [1, .58], [2, .44], [3, .30], [4, .18], [6, .08]], cutoff: [320, 6200], q: 6.0, drive: 0.72, sub: 0.5 },
  i4:       { parts: [[1, .60], [2, .38], [3, .20], [4, .10]],               cutoff: [240, 3600], q: 4.0, drive: 0.42, sub: 0.35 },
  f1:       { parts: [[1, .42], [2, .40], [3, .34], [4, .26], [6, .16], [8, .09]], cutoff: [520, 9500], q: 7.0, drive: 0.6, sub: 0.25 },
  ev:       { parts: [[1, .18], [2, .10]],                                   cutoff: [400, 5200], q: 1.4, drive: 0.05, sub: 0.1 }
};

export class EngineAudio {
  constructor(profile) {
    this.p = profile;
    this.voice = VOICES[profile.kind] || VOICES.v8;
    this.ready = false;
    this.muted = false;
    this.volume = 0.8;
    this.osc = [];
  }

  async start() {
    if (this.ready) return true;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return false;
    const ctx = new Ctx();
    if (ctx.state === 'suspended') await ctx.resume();
    this.ctx = ctx;

    /* master */
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12; comp.knee.value = 22; comp.ratio.value = 7;
    comp.attack.value = 0.004; comp.release.value = 0.18;
    this.master.connect(comp).connect(ctx.destination);

    this.buildEngine();
    this.buildTurbo();
    this.buildRoad();
    this.buildWind();

    /* fade in, and give a combustion engine a proper start-up */
    this.master.gain.setTargetAtTime(this.volume, ctx.currentTime, 0.4);
    if (this.p.kind !== 'ev') this.crank();

    this.ready = true;
    return true;
  }

  /* ── the engine itself ─────────────────────────────────── */
  buildEngine() {
    const ctx = this.ctx;
    this.engineGain = ctx.createGain();
    this.engineGain.gain.value = 0.0001;

    this.lp = ctx.createBiquadFilter();
    this.lp.type = 'lowpass';
    this.lp.frequency.value = this.voice.cutoff[0];
    this.lp.Q.value = this.voice.q * 0.18;

    const shaper = ctx.createWaveShaper();
    shaper.curve = this.driveCurve(this.voice.drive);
    shaper.oversample = '2x';
    this.shaper = shaper;

    /* a resonant peak gives the engine a body, like an exhaust box */
    this.body = ctx.createBiquadFilter();
    this.body.type = 'peaking';
    this.body.frequency.value = 190;
    this.body.Q.value = this.voice.q;
    this.body.gain.value = 9;

    this.engineGain.connect(shaper).connect(this.lp).connect(this.body).connect(this.master);

    for (const [mult, gain] of this.voice.parts) {
      const o = ctx.createOscillator();
      o.type = mult < 1 ? 'sine' : (this.p.kind === 'ev' ? 'triangle' : 'sawtooth');
      const g = ctx.createGain();
      g.gain.value = gain;
      /* a touch of detune per partial so it never sounds like one note */
      o.detune.value = (Math.random() - 0.5) * 14;
      o.connect(g).connect(this.engineGain);
      o.start();
      this.osc.push({ o, g, mult, base: gain });
    }

    /* the low thump under a big engine */
    if (this.voice.sub > 0.15) {
      const sub = ctx.createOscillator();
      sub.type = 'sine';
      const sg = ctx.createGain();
      sg.gain.value = this.voice.sub * 0.5;
      sub.connect(sg).connect(this.master);
      sub.start();
      this.sub = { o: sub, g: sg };
    }
  }

  driveCurve(amount) {
    const n = 1024, c = new Float32Array(n), k = amount * 60;
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      c[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
    }
    return c;
  }

  buildTurbo() {
    if (!this.p.turbo && !this.p.whine) return;
    const ctx = this.ctx;
    this.turboGain = ctx.createGain();
    this.turboGain.gain.value = 0;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 5200;
    bp.Q.value = 6;
    this.turboOsc = ctx.createOscillator();
    this.turboOsc.type = 'sawtooth';
    this.turboOsc.frequency.value = 3000;
    this.turboOsc.connect(this.turboGain).connect(bp).connect(this.master);
    this.turboOsc.start();
  }

  noiseBuffer(seconds = 2.2) {
    const ctx = this.ctx;
    const b = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;      // gently pink
      d[i] = last * 3.2;
    }
    return b;
  }

  buildRoad() {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer();
    src.loop = true;
    this.roadFilter = ctx.createBiquadFilter();
    this.roadFilter.type = 'lowpass';
    this.roadFilter.frequency.value = 500;
    this.roadGain = ctx.createGain();
    this.roadGain.gain.value = 0;
    src.connect(this.roadFilter).connect(this.roadGain).connect(this.master);
    src.start();
    this.roadSrc = src;
  }

  buildWind() {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer();
    src.loop = true;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 900;
    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0;
    src.connect(hp).connect(this.windGain).connect(this.master);
    src.start();
    this.windSrc = src;
  }

  /* starter motor, then catch */
  crank() {
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'square';
    const g = ctx.createGain();
    g.gain.value = 0;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = 420; f.Q.value = 4;
    o.connect(f).connect(g).connect(this.master);
    o.frequency.setValueAtTime(38, t);
    o.frequency.linearRampToValueAtTime(52, t + 0.9);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.24, t + 0.08);
    g.gain.setValueAtTime(0.24, t + 0.85);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.15);
    o.start(t); o.stop(t + 1.25);

    /* the flare as it fires */
    this.flare = 1.6;
  }

  /* a short cut and pop between gears */
  shiftBlip() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    this.engineGain.gain.cancelScheduledValues(t);
    this.engineGain.gain.setValueAtTime(this.engineGain.gain.value, t);
    this.engineGain.gain.linearRampToValueAtTime(0.12, t + 0.05);
    this.engineGain.gain.linearRampToValueAtTime(this._lastEngineGain || 0.5, t + 0.22);

    if (this.p.turbo > 0.2) {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(2400, t);
      o.frequency.exponentialRampToValueAtTime(600, t + 0.22);
      g.gain.setValueAtTime(0.14 * this.p.turbo, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
      o.connect(g).connect(this.master);
      o.start(t); o.stop(t + 0.26);
    }
  }

  /* ── per-frame ─────────────────────────────────────────── */
  update(dt, s) {
    if (!this.ready || this.muted) return;
    const ctx = this.ctx, t = ctx.currentTime, P = this.p;
    const rpm = Math.max(P.idle, s.rpm);
    const norm = s.rpmNorm;
    this.flare = Math.max(0, (this.flare || 0) - dt * 1.6);

    /* firing frequency of a four-stroke */
    const f0 = P.kind === 'ev'
      ? 90 + s.speedKmh * 7.5
      : (rpm / 60) * Math.max(1, P.cylinders / 2);

    for (const p of this.osc) {
      p.o.frequency.setTargetAtTime(Math.min(14000, f0 * p.mult), t, 0.02);
      const load = 0.34 + s.throttle * 0.66;
      p.g.gain.setTargetAtTime(p.base * load * (1 + this.flare * 0.4), t, 0.05);
    }
    if (this.sub) {
      this.sub.o.frequency.setTargetAtTime(Math.max(24, f0 * 0.5), t, 0.03);
      this.sub.g.gain.setTargetAtTime(this.voice.sub * (0.16 + s.throttle * 0.34), t, 0.06);
    }

    const gain = 0.22 + norm * 0.30 + s.throttle * 0.26;
    this._lastEngineGain = gain;
    this.engineGain.gain.setTargetAtTime(gain, t, 0.06);

    const [lo, hi] = this.voice.cutoff;
    this.lp.frequency.setTargetAtTime(lo + (hi - lo) * (norm * 0.7 + s.throttle * 0.4), t, 0.05);
    this.body.frequency.setTargetAtTime(120 + f0 * 0.9, t, 0.08);

    if (this.turboGain) {
      const spool = (P.turbo * s.throttle * norm) + (P.whine * (0.25 + norm * 0.75));
      this.turboOsc.frequency.setTargetAtTime(1800 + norm * 7200, t, 0.08);
      this.turboGain.gain.setTargetAtTime(Math.min(0.16, spool * 0.14), t, 0.12);
    }

    const v = Math.min(1, s.speedKmh / 190);
    this.roadGain.gain.setTargetAtTime(v * 0.20 + s.offTrack * 0.42, t, 0.08);
    this.roadFilter.frequency.setTargetAtTime(360 + v * 1800 + s.offTrack * 2200, t, 0.08);
    this.windGain.gain.setTargetAtTime(v * v * 0.16, t, 0.1);

    if (s.shifted) this.shiftBlip();
  }

  setMuted(m) {
    this.muted = m;
    if (this.ready) this.master.gain.setTargetAtTime(m ? 0 : this.volume, this.ctx.currentTime, 0.12);
  }

  setVolume(v) {
    this.volume = v;
    if (this.ready && !this.muted) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.1);
  }

  dispose() {
    if (!this.ready) return;
    try {
      for (const p of this.osc) p.o.stop();
      this.sub?.o.stop();
      this.turboOsc?.stop();
      this.roadSrc?.stop();
      this.windSrc?.stop();
      this.ctx.close();
    } catch (e) { /* already gone */ }
    this.ready = false;
  }
}

/* If you licence real recordings, drop them in as
   assets/audio/<car-id>-engine.mp3 (a seamless loop at a known rpm)
   and call this before start(); the synth stays as the fallback. */
export async function loadSample(carId) {
  try {
    const res = await fetch(`assets/audio/${carId}-engine.mp3`, { method: 'HEAD' });
    return res.ok ? `assets/audio/${carId}-engine.mp3` : null;
  } catch (e) { return null; }
}
