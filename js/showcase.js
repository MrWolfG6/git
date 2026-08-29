/* ═══════════════════════════════════════════════════════════
   THE PODIUM
   A lit dais rendered here, with the Sketchfab model composited
   over it. Switching cars sinks the outgoing car into the podium
   and raises the incoming one out of it — a real clipping plane
   at the podium surface, so the car genuinely emerges rather
   than sliding past.

   If the Sketchfab viewer cannot be reached, the runtime-built
   body for that car takes the podium instead, with the same
   choreography. The section is never empty.
   ═══════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { buildCarModel, makeMaterials } from './carbuilder.js';
import { CARS } from './cars.js';

const VIEWER_API = 'https://static.sketchfab.com/api/sketchfab-viewer-1.12.1.js';
const DAIS_TOP = 0.36;
const READY_TIMEOUT = 9000;

export class Podium {
  constructor(root) {
    this.root = root;
    this.canvas = root.querySelector('#podiumCanvas');
    this.slot = root.querySelector('#podiumModel');
    this.index = 0;
    this.busy = false;
    this.live = false;              // is a Sketchfab viewer actually showing?
    this.quality = window.innerWidth < 820 ? 'low' : 'high';
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.cars = new Map();
    this.clock = new THREE.Clock();
    this.spin = 0;
    this.beamPulse = 0;
    /* how the stage is framed. The showroom section and the detail
       hero want very different compositions from the same dais. */
    this.framing = { camX: 0.18, camY: 2.15, camZ: 8.6, lookX: 0, lookY: 0.92 };
  }

  /* ─────────────────────────── stage ─────────────────────── */
  init() {
    const r = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: this.quality !== 'low', alpha: true });
    r.setPixelRatio(Math.min(devicePixelRatio, this.quality === 'low' ? 1.5 : 2));
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.22;
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.localClippingEnabled = true;
    r.shadowMap.enabled = this.quality !== 'low';
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer = r;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 90);
    this.camera.position.set(0.18, 2.15, 9.2);

    /* the plane everything on the podium is cut against */
    this.clip = new THREE.Plane(new THREE.Vector3(0, 1, 0), -DAIS_TOP);

    this.buildEnvironment();
    this.buildDais();
    this.buildBeams();
    this.resize();

    addEventListener('resize', () => this.resize(), { passive: true });
    r.setAnimationLoop(() => this.frame());
    return this;
  }

  buildEnvironment() {
    const env = new THREE.Scene();
    const bar = (w, h, d, x, y, z, p, tint = 0xffffff) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(tint).multiplyScalar(p) }));
      m.position.set(x, y, z); env.add(m);
    };
    bar(18, 0.4, 1.4, 0, 6.0, 1.6, 5.0);
    bar(18, 0.4, 1.4, 0, 6.0, -1.6, 4.0);
    bar(0.3, 4, 14, 6.4, 2.6, 0, 2.0, 0xdfe9ff);
    bar(0.3, 4, 14, -6.4, 2.6, 0, 1.6, 0xffeedd);
    bar(12, 2.4, 0.3, 0, 2.2, 8, 0.9, 0xcfe0ff);
    bar(12, 2.4, 0.3, 0, 2.2, -8, 1.5, 0xeaf2ff);
    bar(26, 0.3, 26, 0, -1.4, 0, 0.03);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(env, 0.02).texture;
    pmrem.dispose();
    env.traverse(o => { o.geometry?.dispose?.(); o.material?.dispose?.(); });

    const key = new THREE.DirectionalLight(0xffffff, 2.6);
    key.position.set(3.4, 7, 5);
    if (this.quality !== 'low') {
      key.castShadow = true;
      key.shadow.mapSize.set(1024, 1024);
      Object.assign(key.shadow.camera, { near: 1, far: 22, left: -5, right: 5, top: 5, bottom: -5 });
      key.shadow.camera.updateProjectionMatrix();
      key.shadow.bias = -0.0014;
      key.shadow.normalBias = 0.02;
    }
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0xcfe4ff, 1.9);
    rim.position.set(-3.6, 3.2, -5.4);
    this.scene.add(rim);
    const fill = new THREE.DirectionalLight(0xffffff, 0.7);
    fill.position.set(0.5, 1.8, 9);
    this.scene.add(fill);
    this.scene.add(new THREE.AmbientLight(0x2c333c, 0.9));

    const under = new THREE.PointLight(0x8fd4ff, 12, 9, 2);
    under.position.set(0, DAIS_TOP + 0.1, 0);
    this.scene.add(under);
    this.underLight = under;
  }

  buildDais() {
    const g = new THREE.Group();
    this.scene.add(g);

    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(3.5, 3.7, DAIS_TOP, 72),
      new THREE.MeshStandardMaterial({ color: 0x08090b, metalness: 0.8, roughness: 0.36, envMapIntensity: 0.45 })
    );
    body.position.y = DAIS_TOP / 2;
    body.receiveShadow = true;
    g.add(body);

    /* the polished top the car stands on */
    const top = new THREE.Mesh(
      new THREE.CircleGeometry(3.5, 72),
      new THREE.MeshStandardMaterial({ color: 0x0c0e11, metalness: 0.9, roughness: 0.30, envMapIntensity: 0.42 })
    );
    top.rotation.x = -Math.PI / 2;
    top.position.y = DAIS_TOP + 0.001;
    top.receiveShadow = true;
    g.add(top);

    /* the lit rim, and a second ring that chases around it */
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(3.52, 0.022, 10, 140),
      new THREE.MeshBasicMaterial({ color: 0xbfe6ff })
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = DAIS_TOP + 0.004;
    g.add(rim);
    this.rim = rim;

    const chase = new THREE.Mesh(
      new THREE.TorusGeometry(3.24, 0.012, 8, 120, Math.PI * 0.5),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 })
    );
    chase.rotation.x = Math.PI / 2;
    chase.position.y = DAIS_TOP + 0.006;
    g.add(chase);
    this.chase = chase;

    /* light pool on the floor around the dais */
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const ctx = c.getContext('2d');
    const grd = ctx.createRadialGradient(128, 128, 20, 128, 128, 128);
    grd.addColorStop(0, 'rgba(150,200,255,.30)');
    grd.addColorStop(0.5, 'rgba(90,130,190,.10)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, 256, 256);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const pool = new THREE.Mesh(new THREE.CircleGeometry(11, 64),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
    pool.rotation.x = -Math.PI / 2;
    pool.position.y = 0.002;
    this.scene.add(pool);

    /* contact shadow that travels with whichever car is up */
    const sc = document.createElement('canvas');
    sc.width = sc.height = 256;
    const sx = sc.getContext('2d');
    const sg = sx.createRadialGradient(128, 128, 6, 128, 128, 126);
    sg.addColorStop(0, 'rgba(0,0,0,.9)');
    sg.addColorStop(0.5, 'rgba(0,0,0,.45)');
    sg.addColorStop(1, 'rgba(0,0,0,0)');
    sx.fillStyle = sg; sx.fillRect(0, 0, 256, 256);
    const stex = new THREE.CanvasTexture(sc);
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 3.2),
      new THREE.MeshBasicMaterial({ map: stex, transparent: true, opacity: 0, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = DAIS_TOP + 0.008;
    this.scene.add(shadow);
    this.contact = shadow;
  }

  buildBeams() {
    this.beams = new THREE.Group();
    this.scene.add(this.beams);
    /* a vertical falloff so each beam fades out before it lands,
       instead of reading as a hard translucent cone */
    const c = document.createElement('canvas');
    c.width = 8; c.height = 128;
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0.00, 'rgba(255,255,255,0)');
    g.addColorStop(0.30, 'rgba(255,255,255,.85)');
    g.addColorStop(0.72, 'rgba(255,255,255,.30)');
    g.addColorStop(1.00, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 8, 128);
    const tex = new THREE.CanvasTexture(c);

    const mat = new THREE.MeshBasicMaterial({
      color: 0x9fd2ff, transparent: true, opacity: 0.05, map: tex,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
    });
    this.beamMat = mat;
    const n = this.quality === 'low' ? 4 : 8;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.62, 6.4, 20, 1, true), mat);
      cone.position.set(Math.cos(a) * 3.2, 3.4, Math.sin(a) * 3.2);
      cone.rotation.z = -Math.cos(a) * 0.30;
      cone.rotation.x = Math.sin(a) * 0.30;
      this.beams.add(cone);
    }
  }

  /* ───────────────────── the runtime bodies ───────────────── */
  getCar(car) {
    if (this.cars.has(car.id)) return this.cars.get(car.id);
    const materials = makeMaterials(1.25);
    for (const m of Object.values(materials)) {
      if (m.isMaterial) { m.clippingPlanes = [this.clip]; m.clipShadows = true; }
    }
    const model = buildCarModel(car.proto, { materials, quality: this.quality });
    model.traverse(o => { if (o.isMesh) { o.castShadow = true; } });
    model.position.y = -3;
    model.visible = false;
    this.scene.add(model);
    const paint = new THREE.Color(car.paints[0].hex);
    materials.paint.color.copy(paint);
    materials.paint.metalness = car.paints[0].metal;
    materials.paint.roughness = car.paints[0].rough;
    const rec = { model, materials };
    this.cars.set(car.id, rec);
    return rec;
  }

  setPaint(carId, paint) {
    const rec = this.cars.get(carId);
    if (!rec) return;
    const target = new THREE.Color(paint.hex);
    const from = rec.materials.paint.color.clone();
    const t0 = performance.now();
    const run = () => {
      const t = Math.min((performance.now() - t0) / 900, 1);
      const e = 1 - Math.pow(1 - t, 3);
      rec.materials.paint.color.copy(from).lerp(target, e);
      rec.materials.paint.metalness = paint.metal;
      rec.materials.paint.roughness = paint.rough;
      if (t < 1) requestAnimationFrame(run);
    };
    run();
  }

  /* ───────────────────── Sketchfab layer ──────────────────── */
  loadViewerApi() {
    if (this._apiPromise) return this._apiPromise;
    this._apiPromise = new Promise(resolve => {
      if (window.Sketchfab) return resolve(true);
      const s = document.createElement('script');
      s.src = VIEWER_API;
      s.async = true;
      s.onload = () => resolve(!!window.Sketchfab);
      s.onerror = () => resolve(false);
      document.head.appendChild(s);
      setTimeout(() => resolve(!!window.Sketchfab), 6000);
    });
    return this._apiPromise;
  }

  /* Bring up one Sketchfab model. Resolves with an api handle, or
     null if the viewer is unavailable or too slow — in which case
     the runtime body takes the podium. */
  async mountSketchfab(car) {
    const ok = await this.loadViewerApi();
    if (!ok) return null;

    const frame = document.createElement('iframe');
    frame.className = 'podium__frame';
    frame.title = car.name;
    frame.setAttribute('allow', 'autoplay; fullscreen; xr-spatial-tracking');
    frame.setAttribute('allowfullscreen', '');
    frame.setAttribute('execution-while-out-of-viewport', '');
    frame.setAttribute('execution-while-not-rendered', '');
    this.slot.appendChild(frame);

    return new Promise(resolve => {
      let settled = false;
      const done = v => { if (!settled) { settled = true; resolve(v); } };
      const timer = setTimeout(() => { frame.remove(); done(null); }, READY_TIMEOUT);

      try {
        new window.Sketchfab(frame).init(car.sketchfab, {
          /* a transparent viewer so our own podium reads behind it */
          transparent: 1, autostart: 1, preload: 1, dnt: 1,
          ui_infos: 0, ui_controls: 0, ui_stop: 0, ui_help: 0, ui_hint: 0,
          ui_settings: 0, ui_inspector: 0, ui_annotations: 0, ui_ar: 0,
          ui_vr: 0, ui_fullscreen: 0, ui_theme: 'dark', ui_watermark: 0,
          scrollwheel: 0, double_click: 0, orbit_constraint_pan: 1,
          autospin: this.reduced ? 0 : 0.08, camera: 0,
          success: api => {
            api.start();
            api.addEventListener('viewerready', () => {
              clearTimeout(timer);
              done({ api, frame });
            });
          },
          error: () => { clearTimeout(timer); frame.remove(); done(null); }
        });
      } catch (e) {
        clearTimeout(timer);
        frame.remove();
        done(null);
      }
    });
  }

  /* Try to recolour the Sketchfab model's body material.
     Third-party models name their materials however they like, so this
     is a heuristic: match the usual paint names, and fall back to
     leaving the model in its factory finish. Returns true if applied. */
  setSketchfabPaint(paint) {
    const api = this.active?.api;
    if (!api || !api.getMaterialList) return false;
    const want = /(body|paint|carpaint|car_paint|lack|karosserie|exterior|shell|coat|bodywork)/i;
    api.getMaterialList((err, materials) => {
      if (err || !materials) return;
      const hex = new THREE.Color(paint.hex);
      const targets = materials.filter(m => want.test(m.name || ''));
      for (const m of targets) {
        if (m.channels?.AlbedoPBR) {
          m.channels.AlbedoPBR.color = [hex.r, hex.g, hex.b];
          m.channels.AlbedoPBR.enable = true;
        }
        if (m.channels?.DiffuseColor) {
          m.channels.DiffuseColor.color = [hex.r, hex.g, hex.b];
          m.channels.DiffuseColor.enable = true;
        }
        if (m.channels?.GlossinessPBR) m.channels.GlossinessPBR.factor = 1 - paint.rough;
        if (m.channels?.RoughnessPBR) m.channels.RoughnessPBR.factor = paint.rough;
        if (m.channels?.MetalnessPBR) m.channels.MetalnessPBR.factor = paint.metal;
        api.setMaterial(m);
      }
      this.root.dispatchEvent(new CustomEvent('podium:paint', {
        detail: { applied: targets.length > 0, count: targets.length }
      }));
    });
    return true;
  }

  /* ──────────────────────── switching ─────────────────────── */
  async show(index, { instant = false } = {}) {
    if (this.busy) return;
    const car = CARS[(index + CARS.length) % CARS.length];
    this.index = CARS.indexOf(car);
    this.busy = true;
    this.root.dispatchEvent(new CustomEvent('podium:change', { detail: { car, index: this.index } }));

    /* 1 — sink whatever is standing there */
    await this.lower(instant);

    /* 2 — bring up the replacement */
    this.root.classList.add('is-loading-model');
    const mounted = await this.mountSketchfab(car);
    this.root.classList.remove('is-loading-model');

    if (mounted) {
      this.active = mounted;
      this.live = true;
      this.slot.classList.add('is-live');
      this.current = null;
      await this.raiseFrame(mounted.frame, instant);
    } else {
      this.live = false;
      this.slot.classList.remove('is-live');
      const rec = this.getCar(car);
      this.current = rec.model;
      rec.model.visible = true;
      await this.raiseModel(rec.model, instant);
    }

    this.busy = false;
    this.root.dispatchEvent(new CustomEvent('podium:ready', { detail: { car, live: this.live } }));
  }

  lower(instant) {
    const outFrame = this.active?.frame;
    const outModel = this.current;
    this.active = null;
    this.current = null;
    if (!outFrame && !outModel) return Promise.resolve();

    return new Promise(res => {
      const ms = instant || this.reduced ? 0 : 620;
      const t0 = performance.now();
      const step = () => {
        const t = ms ? Math.min((performance.now() - t0) / ms, 1) : 1;
        const e = t * t;
        if (outModel) {
          outModel.position.y = -3.4 * e;
          outModel.rotation.y += 0.006;
        }
        if (outFrame) {
          outFrame.style.transform = `translate3d(0,${e * 34}%,0) scale(${1 - e * 0.06})`;
          outFrame.style.opacity = String(1 - e);
        }
        this.beamPulse = Math.max(this.beamPulse, 1 - t);
        if (t < 1) requestAnimationFrame(step);
        else {
          if (outModel) outModel.visible = false;
          if (outFrame) outFrame.remove();
          res();
        }
      };
      step();
    });
  }

  /* the runtime body rises through the podium surface — the clipping
     plane at DAIS_TOP means it is genuinely emerging, not sliding past */
  raiseModel(model, instant) {
    return new Promise(res => {
      const ms = instant || this.reduced ? 0 : 1500;
      const t0 = performance.now();
      model.rotation.y = -0.5;
      const step = () => {
        const t = ms ? Math.min((performance.now() - t0) / ms, 1) : 1;
        const e = 1 - Math.pow(1 - t, 4);
        model.position.y = DAIS_TOP - 3.4 * (1 - e);
        model.rotation.y = -0.5 + e * 0.5;
        this.beamPulse = Math.max(this.beamPulse, 1 - t);
        if (t < 1) requestAnimationFrame(step);
        else { model.position.y = DAIS_TOP; res(); }
      };
      step();
    });
  }

  /* the Sketchfab layer rises the same way. The wrapper is clipped at
     the podium line in CSS, so the car climbs out of the dais. */
  raiseFrame(frame, instant) {
    return new Promise(res => {
      const ms = instant || this.reduced ? 0 : 1500;
      const t0 = performance.now();
      const step = () => {
        const t = ms ? Math.min((performance.now() - t0) / ms, 1) : 1;
        const e = 1 - Math.pow(1 - t, 4);
        frame.style.transform = `translate3d(0,${(1 - e) * 42}%,0) scale(${0.94 + e * 0.06})`;
        frame.style.opacity = String(Math.min(1, e * 1.6));
        this.beamPulse = Math.max(this.beamPulse, 1 - t);
        if (t < 1) requestAnimationFrame(step);
        else { frame.style.transform = 'none'; res(); }
      };
      step();
    });
  }

  next() { this.show(this.index + 1); }
  prev() { this.show(this.index - 1); }

  setFraming(f) { Object.assign(this.framing, f); return this; }

  /* ────────────────────────── loop ────────────────────────── */
  resize() {
    const r = this.canvas.getBoundingClientRect();
    const w = Math.max(1, r.width), h = Math.max(1, r.height);
    this.camera.aspect = w / h;
    /* hold the subject width on narrow screens, as the main stage does */
    const dolly = this.camera.aspect >= 1.4 ? 1 : Math.min(2.1, 1.4 / Math.max(this.camera.aspect, 0.45));
    this.dolly = dolly;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  frame() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const t = this.clock.elapsedTime;
    if (!this.visible) { return; }

    const d = this.dolly || 1;
    const F = this.framing;
    const look = new THREE.Vector3(F.lookX, F.lookY, 0);
    this.camera.position.set(
      look.x + (F.camX - look.x) * d,
      look.y + (F.camY - look.y) * d,
      F.camZ * d
    );
    this.camera.lookAt(look);

    if (this.current) this.current.rotation.y += dt * (this.reduced ? 0 : 0.16);

    this.beamPulse = Math.max(0, this.beamPulse - dt * 1.5);
    const pulse = this.beamPulse * this.beamPulse;
    this.beamMat.opacity = 0.035 + pulse * 0.2;
    this.beams.rotation.y = t * 0.06;
    this.rim.material.color.setRGB(0.75 + pulse * 0.25, 0.9 + pulse * 0.1, 1);
    this.underLight.intensity = 10 + pulse * 46;
    this.chase.rotation.z = -t * 0.6;
    this.contact.material.opacity = (this.current && this.current.visible)
      ? 0.75 * THREE.MathUtils.clamp(1 - Math.abs(this.current.position.y - DAIS_TOP) * 1.2, 0, 1)
      : (this.live ? 0.55 : 0);

    this.renderer.render(this.scene, this.camera);
  }
}
