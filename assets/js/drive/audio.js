/* ═══════════════════════════════════════════════════════════
   THE SOUND
   Synthesised with Web Audio from each car's own profile. Nothing
   is sampled, nothing is recorded, nothing is licensed from anyone.

   Electric: motor whine on harmonics of the motor's speed, and the
   inverter's switching tone — stepped, the way a real inverter
   sings as it changes pattern.

   Combustion: firing-frequency harmonics through a waveshaper and
   an exhaust resonance; a starter before it catches; a cut on each
   shift; and on the turbo car a blow-off chirp when the throttle
   closes.
   ═══════════════════════════════════════════════════════════ */

const VOICE = {
  v8:  { parts: [[0.5, .5], [1, .55], [1.5, .2], [2, .34], [3, .16], [4, .08]], cutoff: [320, 5200], q: 5.5, drive: 0.62, sub: 0.6 },
  v6t: { parts: [[0.5, .3], [1, .5], [1.5, .3], [2, .4], [3, .24], [4.5, .12]], cutoff: [380, 6800], q: 6.5, drive: 0.5, sub: 0.35 }
};

export class Powertrain {
  constructor(profile) {
    this.p = profile;
    this.ev = profile.kind === 'ev';
    this.voice = VOICE[profile.kind] || VOICE.v8;
    this.ready = false;
    this.muted = false;
    this.volume = 0.8;
    this.osc = [];
    this.lastThrottle = 0;
  }

  async start() {
    if (this.ready) return true;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return false;
    const ctx = new Ctx();
    if (ctx.state === 'suspended') await ctx.resume();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 20; comp.ratio.value = 6;
    comp.attack.value = 0.004; comp.release.value = 0.2;
    this.master.connect(comp).connect(ctx.destination);

    if (this.ev) this.buildMotor(); else this.buildEngine();
    this.buildNoise();
    this.master.gain.setTargetAtTime(this.volume, ctx.currentTime, 0.3);
    if (!this.ev) this.crank(); else this.wake();
    this.ready = true;
    return true;
  }

  /* ── electric ── */
  buildMotor() {
    const ctx = this.ctx, P = this.p;
    this.motorGain = ctx.createGain();
    this.motorGain.gain.value = 0;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 90;
    this.motorGain.connect(hp).connect(this.master);
    for (const [mult, g, type] of [[1, 0.5, 'sine'], [2.01, 0.22, 'sine'], [3.02, 0.12, 'triangle'], [0.5, 0.18, 'sine']]) {
      const o = ctx.createOscillator();
      o.type = type;
      const gn = ctx.createGain();
      gn.gain.value = g * P.whine;
      o.connect(gn).connect(this.motorGain);
      o.start();
      this.osc.push({ o, mult });
    }
    /* the inverter: a square through a narrow band, stepped in pitch */
    this.invOsc = ctx.createOscillator();
    this.invOsc.type = 'square';
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.Q.value = 9; bp.frequency.value = 1200;
    this.invBP = bp;
    this.invGain = ctx.createGain();
    this.invGain.gain.value = 0;
    this.invOsc.connect(bp).connect(this.invGain).connect(this.master);
    this.invOsc.start();
  }

  /* an EV has no starter: a short rising tone as the inverter arms */
  wake() {
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(220 * this.p.pitch, t);
    o.frequency.exponentialRampToValueAtTime(880 * this.p.pitch, t + 0.5);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.08, t + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    o.connect(g).connect(this.master);
    o.start(t); o.stop(t + 0.75);
  }

  /* ── combustion ── */
  buildEngine() {
    const ctx = this.ctx, V = this.voice;
    this.engineGain = ctx.createGain();
    this.engineGain.gain.value = 0.0001;
    const shaper = ctx.createWaveShaper();
    const n = 1024, curve = new Float32Array(n), k = V.drive * 60;
    for (let i = 0; i < n; i++) { const x = (i * 2) / n - 1; curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x)); }
    shaper.curve = curve;
    shaper.oversample = '2x';
    this.lp = ctx.createBiquadFilter();
    this.lp.type = 'lowpass'; this.lp.frequency.value = V.cutoff[0]; this.lp.Q.value = V.q * 0.16;
    this.body = ctx.createBiquadFilter();
    this.body.type = 'peaking'; this.body.frequency.value = 200; this.body.Q.value = V.q; this.body.gain.value = 8;
    this.engineGain.connect(shaper).connect(this.lp).connect(this.body).connect(this.master);
    for (const [mult, gain] of V.parts) {
      const o = ctx.createOscillator();
      o.type = mult < 1 ? 'sine' : 'sawtooth';
      o.detune.value = (Math.random() - 0.5) * 12;
      const g = ctx.createGain();
      g.gain.value = gain;
      o.connect(g).connect(this.engineGain);
      o.start();
      this.osc.push({ o, g, mult, base: gain });
    }
    const sub = ctx.createOscillator(), sg = ctx.createGain();
    sub.type = 'sine'; sg.gain.value = 0;
    sub.connect(sg).connect(this.master);
    sub.start();
    this.sub = { o: sub, g: sg };

    /* turbo whistle, or the hybrid motor's whine under the engine */
    if (this.p.turbo || this.p.whine) {
      const o = ctx.createOscillator(), g = ctx.createGain(), bp = ctx.createBiquadFilter();
      o.type = 'sawtooth'; bp.type = 'bandpass'; bp.Q.value = 7; bp.frequency.value = 4800;
      g.gain.value = 0;
      o.connect(bp).connect(g).connect(this.master);
      o.start();
      this.whistle = { o, g };
    }
  }

  crank() {
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = 'square'; f.type = 'bandpass'; f.frequency.value = 380; f.Q.value = 4;
    o.frequency.setValueAtTime(34, t);
    o.frequency.linearRampToValueAtTime(48, t + 0.9);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.22, t + 0.08);
    g.gain.setValueAtTime(0.22, t + 0.85);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
    o.connect(f).connect(g).connect(this.master);
    o.start(t); o.stop(t + 1.2);
    this.catchAt = t + 0.95;
    this.flare = 0;
  }

  shiftCut() {
    if (!this.engineGain) return;
    const t = this.ctx.currentTime, g = this.engineGain.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(0.08, t + 0.04);
    g.linearRampToValueAtTime(this.lastGain || 0.5, t + 0.2);
    if (this.p.turbo > 0.2) this.chirp(0.6);
  }

  /* the blow-off: a falling, breathy chirp */
  chirp(amount) {
    const ctx = this.ctx, t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.Q.value = 3;
    bp.frequency.setValueAtTime(3600, t);
    bp.frequency.exponentialRampToValueAtTime(900, t + 0.3);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.35 * amount * this.p.turbo, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    src.connect(bp).connect(g).connect(this.master);
    src.start(t, Math.random()); src.stop(t + 0.35);
  }

  /* ── tyres and wind ── */
  buildNoise() {
    const ctx = this.ctx;
    const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.4; }
    this.noiseBuf = b;
    const loop = (type, freq) => {
      const s = ctx.createBufferSource(); s.buffer = b; s.loop = true;
      const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq;
      const g = ctx.createGain(); g.gain.value = 0;
      s.connect(f).connect(g).connect(this.master);
      s.start();
      return { s, f, g };
    };
    this.road = loop('lowpass', 500);
    this.wind = loop('highpass', 900);
    this.scrub = loop('bandpass', 1600);
    this.scrub.f.Q.value = 2;
  }

  /* ── per frame ── */
  update(dt, s) {
    if (!this.ready || this.muted) return;
    const ctx = this.ctx, t = ctx.currentTime, P = this.p;
    const spd = Math.min(1, s.kmh / 300);

    if (this.ev) {
      /* the motor turns with the wheels: pitch is speed, load is throttle */
      const f0 = (40 + s.rpmNorm * 1500) * P.pitch;
      for (const o of this.osc) o.o.frequency.setTargetAtTime(f0 * o.mult, t, 0.03);
      const load = 0.25 + s.throttle * 0.75 + s.brake * 0.4;      // regen sings too
      this.motorGain.gain.setTargetAtTime(Math.min(0.3, (0.04 + s.rpmNorm * 0.3) * load), t, 0.08);
      /* inverter: four switching patterns, stepping up with speed */
      const step = Math.min(3, Math.floor(s.kmh / 38));
      const fi = [520, 780, 1040, 1560][step] * P.pitch + (s.kmh % 38) * 3;
      this.invOsc.frequency.setTargetAtTime(fi, t, 0.02);
      this.invBP.frequency.setTargetAtTime(fi * 2, t, 0.05);
      const inv = P.inverter * (s.throttle * 0.8 + s.brake * 0.5) * (1 - spd * 0.6);
      this.invGain.gain.setTargetAtTime(Math.min(0.05, inv * 0.05), t, 0.06);
      if (s.shifted) this.motorGain.gain.setTargetAtTime(0.02, t, 0.02);
    } else {
      const caught = t >= (this.catchAt || 0);
      if (caught && !this.flared) { this.flared = true; this.flare = 1.4; }
      this.flare = Math.max(0, (this.flare || 0) - dt * 1.5);
      const rpm = caught ? Math.max(P.idle, s.rpm) * (1 + this.flare * 0.5) : 0;
      const f0 = (rpm / 60) * (P.cylinders / 2);
      for (const o of this.osc) {
        o.o.frequency.setTargetAtTime(Math.max(20, Math.min(14000, f0 * o.mult)), t, 0.02);
        o.g.gain.setTargetAtTime(o.base * (0.35 + s.throttle * 0.65), t, 0.05);
      }
      const gain = caught ? 0.22 + s.rpmNorm * 0.3 + s.throttle * 0.24 : 0.0001;
      this.lastGain = gain;
      this.engineGain.gain.setTargetAtTime(gain, t, 0.05);
      const [lo, hi] = this.voice.cutoff;
      this.lp.frequency.setTargetAtTime(lo + (hi - lo) * (s.rpmNorm * 0.7 + s.throttle * 0.35), t, 0.05);
      this.body.frequency.setTargetAtTime(130 + f0 * 0.9, t, 0.08);
      this.sub.o.frequency.setTargetAtTime(Math.max(22, f0 * 0.5), t, 0.03);
      this.sub.g.gain.setTargetAtTime(caught ? this.voice.sub * (0.1 + s.throttle * 0.3) : 0, t, 0.06);
      if (this.whistle) {
        const spool = (P.turbo || 0) * s.throttle * s.rpmNorm + (P.whine || 0) * (0.3 + s.rpmNorm * 0.7);
        this.whistle.o.frequency.setTargetAtTime(1600 + s.rpmNorm * 6400, t, 0.1);
        this.whistle.g.gain.setTargetAtTime(Math.min(0.1, spool * 0.09), t, 0.12);
      }
      if (s.shifted) this.shiftCut();
      /* lift off after boost: the valve dumps */
      if (P.turbo > 0.2 && this.lastThrottle > 0.8 && s.throttle < 0.2 && s.rpmNorm > 0.4) this.chirp(1);
    }
    this.lastThrottle = s.throttle;

    this.road.g.gain.setTargetAtTime(spd * 0.2 + s.offTrack * 0.4, t, 0.08);
    this.road.f.frequency.setTargetAtTime(300 + spd * 1600 + s.offTrack * 2000, t, 0.08);
    this.wind.g.gain.setTargetAtTime(spd * spd * 0.2, t, 0.1);
    this.scrub.g.gain.setTargetAtTime(Math.min(0.25, Math.max(0, s.slip - 0.35) * 0.3), t, 0.05);
  }

  setMuted(m) {
    this.muted = m;
    if (this.ready) this.master.gain.setTargetAtTime(m ? 0 : this.volume, this.ctx.currentTime, 0.1);
  }
  setVolume(v) {
    this.volume = v;
    if (this.ready && !this.muted) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.1);
  }
}
