/* ═══════════════════════════════════════════════════════════
   MERIDIAN AUTOHAUS — WebGL stage
   A luxury coupé sculpted at runtime inside a virtual light studio.
   No model files: every surface here is generated from curves.
   Units are metres, so the proportions match a real car.
   ═══════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

const WHEEL_R  = 0.35;    // 20" rim + tyre
const ARCH_R   = 0.40;
const AXLE_F   =  1.42;   // wheelbase 2.84 m
const AXLE_R   = -1.42;
const BODY_W   = 1.92;
const TRACK_Z  = 0.83;
const TYRE_W   = 0.28;

export class Stage {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.onProgress = opts.onProgress || (() => {});
    this.quality = this.pickQuality();

    /* live state — GSAP/ScrollTrigger writes straight into these */
    this.cam  = { x: 5.0, y: 1.30, z: 6.2, fov: 38 };
    this.look = { x: 0, y: 0.62, z: 0 };
    this.car  = { rotY: -0.36, turn: 0, x: 0, y: 0, tilt: 0 };
    this.fx   = { exposure: 1.02, bloom: 0.42, lights: 0.15, spin: 0.5, dust: 0.5 };

    this._cam  = { ...this.cam };
    this._look = { ...this.look };
    this._car  = { ...this.car };
    this.pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    this.clock = new THREE.Clock();
    this.paused = false;
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  pickQuality() {
    const w = window.innerWidth;
    const mem = navigator.deviceMemory || 8;
    const coarse = window.matchMedia('(pointer:coarse)').matches;
    if (w < 820 || mem <= 4) return 'low';
    if (coarse || w < 1400) return 'mid';
    return 'high';
  }

  /* ─────────────────────────── boot ─────────────────────────── */
  async init() {
    const frame = () => new Promise(r => requestAnimationFrame(() => r()));
    const step = async (pct, label, fn) => {
      this.onProgress(pct, label);
      await frame();
      if (fn) fn();
    };

    await step(6,  'Warming the renderer',       () => this.buildRenderer());
    await step(20, 'Building the light studio',  () => this.buildEnvironment());
    await step(40, 'Sculpting the bodywork',     () => this.buildCar());
    await step(58, 'Turning the wheels',         () => this.buildWheels());
    await step(72, 'Laying the showroom floor',  () => this.buildFloor());
    await step(84, 'Settling the atmosphere',    () => this.buildAtmosphere());
    await step(93, 'Grading the image',          () => this.buildComposer());

    /* pre-render a few frames so nothing pops in on reveal */
    for (let i = 0; i < 3; i++) { this.renderFrame(0.016); await frame(); }
    await step(100, 'Opening the doors');

    this.bindEvents();
    this.renderer.setAnimationLoop(() => this.tick());
    return this;
  }

  /* ─────────────────────── renderer / scene ─────────────────── */
  buildRenderer() {
    const r = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: this.quality !== 'low',
      alpha: true,
      powerPreference: 'high-performance',
      stencil: false
    });
    r.setPixelRatio(Math.min(window.devicePixelRatio, this.quality === 'high' ? 2 : 1.5));
    r.setSize(window.innerWidth, window.innerHeight);
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = this.fx.exposure;
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.shadowMap.enabled = this.quality !== 'low';
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer = r;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x000000, 0.055);

    this.camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.05, 200);
    this.camera.position.set(this.cam.x, this.cam.y, this.cam.z);

    this.world = new THREE.Group();
    this.scene.add(this.world);
  }

  /* ── a black room lined with light strips. This is where every
        highlight running down the car's flank comes from ────── */
  buildEnvironment() {
    const env = new THREE.Scene();
    env.background = new THREE.Color(0x000000);

    const bar = (w, h, d, x, y, z, power, tint = 0xffffff) => {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(tint).multiplyScalar(power) })
      );
      m.position.set(x, y, z);
      env.add(m);
    };

    /* overhead softboxes — long strips give the signature streak */
    bar(24, 0.4, 1.6,  0, 5.6,  1.9, 3.0);
    bar(24, 0.4, 1.6,  0, 5.6, -1.9, 2.3);
    bar(24, 0.3, 0.8,  0, 4.6,  0.0, 1.4);
    /* walls, one cool one warm, so the flanks separate */
    bar(0.3, 5, 18,  7.5, 2.4, 0, 1.0, 0xdfe9ff);
    bar(0.3, 5, 18, -7.5, 2.4, 0, 0.8, 0xfff0dd);
    /* front and rear kickers */
    bar(14, 2.6, 0.3, 0, 2.0,  9, 0.6, 0xcfe0ff);
    bar(14, 2.6, 0.3, 0, 2.0, -9, 0.5);
    /* dark floor keeps the underside grounded */
    bar(34, 0.3, 34, 0, -1.0, 0, 0.04);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    pmrem.compileEquirectangularShader();
    this.envMap = pmrem.fromScene(env, 0.02).texture;
    this.scene.environment = this.envMap;
    pmrem.dispose();
    env.traverse(o => { o.geometry?.dispose?.(); o.material?.dispose?.(); });

    /* real lights on top of the IBL, for shadow and specular punch */
    RectAreaLightUniformsLib.init();

    const key = new THREE.RectAreaLight(0xffffff, 8, 7, 1.3);
    key.position.set(0.4, 3.9, 2.6);
    key.lookAt(0, 0.55, 0);
    this.world.add(key);

    const rim = new THREE.RectAreaLight(0xd7e6ff, 6, 6, 1.2);
    rim.position.set(-2.6, 3.2, -3.4);
    rim.lookAt(0, 0.6, 0);
    this.world.add(rim);

    const dir = new THREE.DirectionalLight(0xffffff, 1.5);
    dir.position.set(3.6, 6.4, 4.2);
    if (this.quality !== 'low') {
      dir.castShadow = true;
      dir.shadow.mapSize.set(1024, 1024);
      const cam = dir.shadow.camera;
      cam.near = 1; cam.far = 20;
      cam.left = -4.5; cam.right = 4.5; cam.top = 4.5; cam.bottom = -4.5;
      cam.updateProjectionMatrix();
      dir.shadow.bias = -0.0012;
      dir.shadow.normalBias = 0.02;
    }
    this.world.add(dir);

    /* a soft fill from the camera side: without it the profile shots
       collapse into pure silhouette */
    const fill = new THREE.DirectionalLight(0xc8d6e8, 0.55);
    fill.position.set(0.5, 1.6, 8);
    this.world.add(fill);

    this.world.add(new THREE.AmbientLight(0x2a3038, 0.6));
  }

  /* ───────────────────────── materials ──────────────────────── */
  get mats() {
    if (this._mats) return this._mats;
    this._mats = {
      paint: new THREE.MeshPhysicalMaterial({
        color: 0x0a0a0c, metalness: 0.92, roughness: 0.16,
        clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.3
      }),
      glass: new THREE.MeshPhysicalMaterial({
        color: 0x07090b, metalness: 0.3, roughness: 0.10,
        clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.15
      }),
      chrome: new THREE.MeshStandardMaterial({
        color: 0xc9d1d9, metalness: 1, roughness: 0.10, envMapIntensity: 1.5
      }),
      darkChrome: new THREE.MeshStandardMaterial({
        color: 0x1d2126, metalness: 1, roughness: 0.22, envMapIntensity: 1.5
      }),
      trim: new THREE.MeshStandardMaterial({
        color: 0x0c0e10, metalness: 0.5, roughness: 0.5, envMapIntensity: 1
      }),
      tyre: new THREE.MeshStandardMaterial({
        color: 0x0b0b0c, metalness: 0, roughness: 0.88, envMapIntensity: 0.6
      }),
      head: new THREE.MeshStandardMaterial({
        color: 0xdfe9ff, emissive: 0xbcd6ff, emissiveIntensity: 1.4,
        metalness: 0.4, roughness: 0.12
      }),
      tail: new THREE.MeshStandardMaterial({
        color: 0x5a0f12, emissive: 0xff1a1a, emissiveIntensity: 1.4,
        metalness: 0.2, roughness: 0.25
      })
    };
    return this._mats;
  }

  /* ─────────────────────── the automobile ───────────────────── */
  buildCar() {
    const M = this.mats;
    this.carGroup = new THREE.Group();
    this.world.add(this.carGroup);
    this.shell = new THREE.Group();
    this.carGroup.add(this.shell);
    this.paintMeshes = [];

    /* ── Bodywork.
          A side-profile silhouette, extruded across the width,
          bevelled, then crease-smoothed so the panels read as one
          continuous surface instead of a stack of facets. ── */
    const body = new THREE.Shape();
    body.moveTo(-2.36, 0.42);                                     // rear valance
    body.quadraticCurveTo(-2.44, 0.68, -2.30, 0.84);              // rear haunch
    body.lineTo(-1.86, 0.90);                                     // boot lid
    body.bezierCurveTo(-1.10, 0.99, 0.55, 1.00, 1.30, 0.96);      // shoulder line
    body.bezierCurveTo(1.80, 0.93, 2.14, 0.88, 2.32, 0.78);       // bonnet fall
    body.quadraticCurveTo(2.48, 0.64, 2.38, 0.40);                // nose
    body.lineTo(AXLE_F + ARCH_R, 0.35);
    body.absarc(AXLE_F, 0.35, ARCH_R, 0, Math.PI, false);         // front arch
    body.lineTo(AXLE_F - ARCH_R - 0.10, 0.23);                    // step down to the rocker
    body.lineTo(AXLE_R + ARCH_R + 0.10, 0.23);                    // rocker
    body.lineTo(AXLE_R + ARCH_R, 0.35);
    body.absarc(AXLE_R, 0.35, ARCH_R, 0, Math.PI, false);         // rear arch
    body.lineTo(-2.36, 0.42);

    const shellMesh = new THREE.Mesh(this.extrude(body, BODY_W, 0.045), M.paint);
    shellMesh.castShadow = shellMesh.receiveShadow = true;
    this.shell.add(shellMesh);
    this.paintMeshes.push(shellMesh);

    /* ── Greenhouse: one uninterrupted panel of black glass ── */
    const house = new THREE.Shape();
    house.moveTo(-1.90, 0.88);
    house.quadraticCurveTo(-1.50, 0.99, -1.12, 1.29);             // rear screen
    house.bezierCurveTo(-0.70, 1.41, 0.20, 1.41, 0.62, 1.27);     // roof
    house.quadraticCurveTo(0.96, 1.13, 1.42, 0.92);               // windscreen
    house.lineTo(-1.90, 0.88);

    const glass = new THREE.Mesh(this.extrude(house, 1.62, 0.03), M.glass);
    glass.castShadow = true;
    this.shell.add(glass);

    /* chrome surround peeking out from behind the glass */
    const surround = new THREE.Mesh(this.extrude(house, 1.645, 0.012), M.chrome);
    surround.scale.set(1.002, 1.004, 1);
    surround.position.y = -0.004;
    this.shell.add(surround);

    /* ── Lower architecture: rocker blade, splitter, diffuser ── */
    const add = (geo, mat, x, y, z, paint) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      this.shell.add(m);
      if (paint) this.paintMeshes.push(m);
      return m;
    };

    add(new THREE.BoxGeometry(2.5, 0.05, 1.90), M.darkChrome, 0, 0.205, 0);
    add(new THREE.BoxGeometry(0.40, 0.05, 1.78), M.darkChrome, 2.06, 0.31, 0);
    add(new THREE.BoxGeometry(0.34, 0.22, 1.60), M.darkChrome, -2.32, 0.40, 0);

    for (const z of [-0.42, 0.42]) {
      const pipe = new THREE.Mesh(
        new THREE.CylinderGeometry(0.065, 0.065, 0.18, 20, 1, true), M.chrome);
      pipe.rotation.z = Math.PI / 2;
      pipe.position.set(-2.42, 0.44, z);
      this.shell.add(pipe);
    }

    /* ── The face.
          The nose is a curve, not a wall, so everything mounted on it has
          to sit on that curve or it disappears inside the bodywork. These
          are the surface x-values sampled off the profile above:
             y 0.82 → 2.31    y 0.755 → 2.35    y 0.67 → 2.40
             y 0.60 → 2.41    y 0.50  → 2.41    y 0.40 → 2.38          ── */

    /* the grille, raked back with the nose, Panamericana slats around the star */
    const grille = new THREE.Group();
    grille.position.set(2.355, 0.565, 0);
    grille.rotation.z = -0.16;
    this.shell.add(grille);
    grille.add(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.38, 1.10), M.trim));
    for (let i = 0; i < 13; i++) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.33, 0.022), M.chrome);
      slat.position.set(0.055, 0, -0.48 + i * (0.96 / 12));
      grille.add(slat);
    }
    const badge = this.buildStar(0.135);
    badge.rotation.y = Math.PI / 2;
    badge.position.set(0.105, 0.01, 0);
    grille.add(badge);

    /* air intakes flanking the grille */
    for (const z of [-0.66, 0.66]) {
      add(new THREE.BoxGeometry(0.09, 0.16, 0.40), M.trim, 2.365, 0.40, z);
    }

    /* ── Lighting signature ── */
    this.headlights = [];
    for (const z of [-0.60, 0.60]) {
      this.headlights.push(add(new THREE.BoxGeometry(0.10, 0.10, 0.38), M.head, 2.335, 0.755, z));
      this.headlights.push(add(new THREE.BoxGeometry(0.05, 0.028, 0.34), M.head, 2.385, 0.672, z * 0.97));
    }
    /* the rear face sits at x ≈ -2.33 at this height */
    this.taillight = add(new THREE.BoxGeometry(0.09, 0.115, 1.52), M.tail, -2.345, 0.795, 0);

    /* ── Mirrors, handles, the crease down the flank ── */
    for (const s of [-1, 1]) {
      add(new THREE.BoxGeometry(0.10, 0.04, 0.12), M.trim, 1.22, 0.955, s * 0.90);
      add(new THREE.BoxGeometry(0.24, 0.095, 0.075), M.paint, 1.14, 0.985, s * 0.99, true);
      add(new THREE.BoxGeometry(0.22, 0.038, 0.022), M.chrome, 0.10, 0.80, s * 0.968);
      add(new THREE.BoxGeometry(3.5, 0.014, 0.010), M.darkChrome, -0.10, 0.665, s * 0.966);
    }

    /* ── A monumental star far upstage, as a backdrop ── */
    this.backdropStar = this.buildStar(3.1);
    this.backdropStar.position.set(0, 2.7, -19);
    this.backdropStar.traverse(o => { if (o.isMesh) { o.material = M.darkChrome; o.castShadow = false; } });
    this.world.add(this.backdropStar);
  }

  extrude(shape, depth, bevel) {
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: this.quality === 'low' ? 3 : 6,
      curveSegments: this.quality === 'low' ? 16 : 34
    });
    geo.translate(0, 0, -depth / 2);
    const merged = BufferGeometryUtils.mergeVertices(geo, 1e-4);
    const creased = BufferGeometryUtils.toCreasedNormals(merged, Math.PI / 5);
    geo.dispose();
    if (merged !== creased) merged.dispose();
    return creased;
  }

  /* three points: land, sea and air */
  buildStar(radius) {
    const g = new THREE.Group();
    const opt = {
      depth: 0.09, bevelEnabled: true, bevelThickness: 0.018,
      bevelSize: 0.018, bevelSegments: 3, curveSegments: 48
    };

    const ring = new THREE.Shape();
    ring.absarc(0, 0, 1, 0, Math.PI * 2, false);
    const hole = new THREE.Path();
    hole.absarc(0, 0, 0.87, 0, Math.PI * 2, true);
    ring.holes.push(hole);
    g.add(new THREE.Mesh(new THREE.ExtrudeGeometry(ring, opt), this.mats.chrome));

    for (let i = 0; i < 3; i++) {
      const a = Math.PI / 2 + (i * Math.PI * 2) / 3;
      const dx = Math.cos(a), dy = Math.sin(a);
      const nx = -dy, ny = dx;
      const wIn = 0.085, wOut = 0.052, len = 0.9;
      const s = new THREE.Shape();
      s.moveTo(nx * wIn, ny * wIn);
      s.lineTo(dx * len + nx * wOut, dy * len + ny * wOut);
      s.lineTo(dx * len - nx * wOut, dy * len - ny * wOut);
      s.lineTo(-nx * wIn, -ny * wIn);
      s.closePath();
      g.add(new THREE.Mesh(new THREE.ExtrudeGeometry(s, opt), this.mats.chrome));
    }

    const hub = new THREE.Shape();
    hub.absarc(0, 0, 0.11, 0, Math.PI * 2, false);
    g.add(new THREE.Mesh(new THREE.ExtrudeGeometry(hub, opt), this.mats.chrome));

    g.scale.setScalar(radius);
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    return g;
  }

  /* ─────────────────────────── wheels ───────────────────────── */
  buildWheels() {
    const M = this.mats;
    const seg = this.quality === 'low' ? 20 : 42;
    const halfW = TYRE_W / 2;                 // 0.14
    const shoulder = 0.055;
    const rimR = WHEEL_R - 0.075;             // where the alloy starts

    /* geometry is authored once and shared by all four corners */
    const G = {
      tread:  new THREE.CylinderGeometry(WHEEL_R, WHEEL_R, TYRE_W - shoulder * 2, seg, 1, true),
      shoulder: new THREE.TorusGeometry(WHEEL_R - shoulder, shoulder, 12, seg),
      barrel: new THREE.CylinderGeometry(rimR, rimR, TYRE_W - 0.02, seg, 1, true),
      face:   new THREE.CylinderGeometry(rimR, rimR - 0.02, 0.03, seg),
      lip:    new THREE.TorusGeometry(rimR - 0.012, 0.016, 10, seg),
      spoke:  new THREE.BoxGeometry(0.042, rimR - 0.085, 0.045),
      cap:    new THREE.CylinderGeometry(0.055, 0.055, 0.035, 24),
      disc:   new THREE.CylinderGeometry(rimR - 0.05, rimR - 0.05, 0.025, seg),
      cal:    new THREE.BoxGeometry(0.06, 0.16, 0.06)
    };

    this.wheels = [];

    for (const [x, z] of [[AXLE_F, TRACK_Z], [AXLE_F, -TRACK_Z], [AXLE_R, TRACK_Z], [AXLE_R, -TRACK_Z]]) {
      const hub = new THREE.Group();
      hub.position.set(x, WHEEL_R, z);
      this.shell.add(hub);

      /* only the spinner turns — the caliper stays where it belongs */
      const spin = new THREE.Group();
      hub.add(spin);
      const out = Math.sign(z);               // +1 = left flank, -1 = right flank

      const push = (geo, mat, zPos, rotX, shadow) => {
        const m = new THREE.Mesh(geo, mat);
        m.position.z = zPos;
        if (rotX) m.rotation.x = Math.PI / 2;
        if (shadow) m.castShadow = true;
        spin.add(m);
        return m;
      };

      /* tyre: an open tread band closed by two rounded shoulders,
         so the alloy behind it is never covered up */
      push(G.tread, M.tyre, 0, true, true);
      push(G.shoulder, M.tyre, halfW - shoulder, false, true);
      push(G.shoulder, M.tyre, -(halfW - shoulder), false, true);
      push(G.barrel, M.darkChrome, 0, true, false);

      /* the alloy sits just inside the outboard shoulder */
      const faceZ = out * (halfW - 0.045);
      push(G.face, M.darkChrome, faceZ, true, false);
      push(G.lip, M.chrome, faceZ + out * 0.012, false, false);

      /* ten cross-spokes */
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        const m = new THREE.Mesh(G.spoke, M.chrome);
        const rad = (rimR - 0.085) / 2 + 0.04;
        m.position.set(Math.cos(a) * rad, Math.sin(a) * rad, faceZ + out * 0.016);
        m.rotation.z = a - Math.PI / 2;
        m.castShadow = true;
        spin.add(m);
      }

      push(G.cap, M.chrome, faceZ + out * 0.032, true, false);
      push(G.disc, M.darkChrome, -out * 0.03, true, false);

      const cal = new THREE.Mesh(G.cal, M.trim);
      cal.position.set(-0.20, 0.09, -out * 0.03);
      hub.add(cal);

      hub.userData.spin = spin;
      this.wheels.push(hub);
    }
  }

  /* ─────────────────────── floor & shadow ───────────────────── */
  buildFloor() {
    if (this.quality !== 'low') {
      const mirror = new Reflector(new THREE.PlaneGeometry(46, 46), {
        textureWidth: 1024, textureHeight: 1024,
        color: 0x0e1013, clipBias: 0.003
      });
      mirror.rotation.x = -Math.PI / 2;
      this.world.add(mirror);
      this.mirror = mirror;
    }

    /* smoked glass over the mirror keeps the reflection whisper-quiet */
    const veil = new THREE.Mesh(
      new THREE.PlaneGeometry(46, 46),
      new THREE.MeshStandardMaterial({
        color: 0x000000, roughness: 0.62, metalness: 0.15,
        transparent: true, opacity: this.quality === 'low' ? 1 : 0.84,
        envMapIntensity: 0.10
      })
    );
    veil.rotation.x = -Math.PI / 2;
    veil.position.y = 0.001;
    veil.receiveShadow = true;
    this.world.add(veil);

    /* a soft contact shadow so the car never floats */
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const ctx = c.getContext('2d');
    const grd = ctx.createRadialGradient(128, 128, 6, 128, 128, 126);
    grd.addColorStop(0, 'rgba(0,0,0,.95)');
    grd.addColorStop(0.45, 'rgba(0,0,0,.55)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 256, 256);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;

    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(6.2, 3.1),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.92, depthWrite: false })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.004;
    this.carGroup.add(shadow);
    this.contactShadow = shadow;
  }

  /* ───────────────────── atmosphere / dust ──────────────────── */
  buildAtmosphere() {
    const count = this.quality === 'low' ? 260 : 900;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 26;
      pos[i * 3 + 1] = Math.random() * 8;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 26;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

    this.dust = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 0.026, color: 0xdfe9ff, transparent: true, opacity: 0.4,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true
    }));
    this.world.add(this.dust);
  }

  buildComposer() {
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    if (this.quality !== 'low') {
      this.bloom = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight), 0.35, 0.62, 0.92);
      this.composer.addPass(this.bloom);
    }
    this.composer.addPass(new OutputPass());
    this.composer.setSize(window.innerWidth, window.innerHeight);
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
  }

  /* ─────────────────────────── events ───────────────────────── */
  bindEvents() {
    window.addEventListener('resize', () => this.resize(), { passive: true });
    window.addEventListener('pointermove', e => {
      this.pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
      this.pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
    }, { passive: true });
    document.addEventListener('visibilitychange', () => { this.paused = document.hidden; });
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.quality === 'high' ? 2 : 1.5));
    this.renderer.setSize(w, h);
    this.composer?.setSize(w, h);
    this.bloom?.setSize(w, h);
  }

  /* ─────────────────────── paint changing ───────────────────── */
  setPaint(hex, metalness = 0.92, roughness = 0.16, duration = 1.15) {
    const mat = this.mats.paint;
    const target = new THREE.Color(hex);
    const from = mat.color.clone();
    const fromM = mat.metalness, fromR = mat.roughness;
    const start = performance.now();
    const ms = duration * 1000;

    const run = () => {
      const t = Math.min((performance.now() - start) / ms, 1);
      const e = 1 - Math.pow(1 - t, 3);
      mat.color.copy(from).lerp(target, e);
      mat.metalness = fromM + (metalness - fromM) * e;
      mat.roughness = fromR + (roughness - fromR) * e;
      if (t < 1) requestAnimationFrame(run);
    };
    run();
  }

  /* ───────────────────────── render loop ────────────────────── */
  tick() {
    if (this.paused) return;
    this.renderFrame(Math.min(this.clock.getDelta(), 0.05));
  }

  renderFrame(dt) {
    const t = this.clock.elapsedTime;
    const k = this.reduced ? 1 : 1 - Math.pow(0.0015, dt);   // frame-rate independent damping

    /* pointer parallax — a hint of head movement, never a swivel */
    this.pointer.x += (this.pointer.tx - this.pointer.x) * k * 0.5;
    this.pointer.y += (this.pointer.ty - this.pointer.y) * k * 0.5;

    for (const key of ['x', 'y', 'z']) {
      this._cam[key]  += (this.cam[key]  - this._cam[key])  * k;
      this._look[key] += (this.look[key] - this._look[key]) * k;
    }
    for (const key of ['rotY', 'turn', 'x', 'y', 'tilt']) {
      this._car[key] += (this.car[key] - this._car[key]) * k;
    }

    const breathe = this.reduced ? 0 : Math.sin(t * 0.42) * 0.035;

    /* Every shot is composed for a wide viewport. A phone keeps the same
       vertical field of view but loses most of the horizontal one, so the
       framing would crop into the bodywork. Dolly back along the camera's
       own axis to hold roughly the same subject width. */
    const a = this.camera.aspect;
    const dolly = a >= 1.5 ? 1 : Math.min(2.3, 1.5 / Math.max(a, 0.42));

    /* and aim a little lower on a tall screen, which lifts the car into
       the empty upper half instead of leaving it behind the copy */
    const lookY = this._look.y - (a >= 1.3 ? 0 : (1.3 - a) * 0.42);

    this.camera.position.set(
      this._look.x + (this._cam.x - this._look.x) * dolly + this.pointer.x * 0.34,
      lookY + (this._cam.y - lookY) * dolly - this.pointer.y * 0.18 + breathe,
      this._look.z + (this._cam.z - this._look.z) * dolly
    );
    this.camera.lookAt(this._look.x, lookY, this._look.z);
    if (Math.abs(this.camera.fov - this.cam.fov) > 0.01) {
      this.camera.fov += (this.cam.fov - this.camera.fov) * k;
      this.camera.updateProjectionMatrix();
    }

    if (this.carGroup) {
      /* rotY is the section pose, turn is the configurator turntable —
         they are kept apart so neither tween can clobber the other */
      this.carGroup.rotation.y = this._car.rotY + this._car.turn;
      this.carGroup.rotation.z = this._car.tilt;
      this.carGroup.position.x = this._car.x;
      this.carGroup.position.y = this._car.y;
      if (this.contactShadow) {
        this.contactShadow.material.opacity = 0.92 * Math.max(0, 1 - Math.abs(this._car.y) * 1.4);
      }
    }

    if (this.wheels) {
      const spin = this.fx.spin * dt * 7;
      for (const w of this.wheels) w.userData.spin.rotation.z -= spin;
    }

    if (this.headlights) {
      const on = 0.4 + this.fx.lights * 3.2;
      for (const l of this.headlights) l.material.emissiveIntensity = on;
      if (this.taillight) this.taillight.material.emissiveIntensity = 0.8 + this.fx.lights * 3.4;
    }

    if (this.dust) {
      this.dust.rotation.y = t * 0.012;
      this.dust.material.opacity = 0.1 + this.fx.dust * 0.36;
    }
    if (this.backdropStar) {
      this.backdropStar.rotation.y = Math.sin(t * 0.09) * 0.4;
      this.backdropStar.rotation.z = t * 0.024;
    }

    this.renderer.toneMappingExposure += (this.fx.exposure - this.renderer.toneMappingExposure) * k;
    if (this.bloom) this.bloom.strength += (this.fx.bloom - this.bloom.strength) * k;

    this.composer ? this.composer.render() : this.renderer.render(this.scene, this.camera);
  }
}
