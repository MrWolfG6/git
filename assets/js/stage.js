/* ═══════════════════════════════════════════════════════════
   THE STAGE
   One fixed WebGL room behind the page: a dais, the car on it,
   the mark standing upstage as a monolith.

   Lighting is a room, not a light rig. A small scene of emissive
   strips is baked through PMREMGenerator into the environment,
   and that is where every highlight on a flank comes from.

   The dais top is the plane the car is cut against. Cars rise
   through it — a real clipping plane, so the body is genuinely
   sectioned by the surface as it emerges.
   ═══════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { buildCarModel, makeMaterials, setPaint } from './builder.js';
import { markGeometry, PALETTE } from './brand.js';
import { PAINTS } from './cars.js';
import { TIER, REDUCED, damp } from './common.js';

export const DAIS_TOP = 0.32;
const DAIS_R = 3.5;

/* a pose: camera in world space, aim in the car's own frame (so it
   turns with the car), the car's yaw, the exposure, the bloom, and how
   far the page dims the stage behind its copy. `aw` blends the aim from
   the car's frame (0) to world space (1), for shots of the monolith. */
export const pose = (cam, aim, rotY, exposure = 1, bloom = 0.35, scrim = 0, aw = 0) =>
  ({ cx: cam[0], cy: cam[1], cz: cam[2], ax: aim[0], ay: aim[1], az: aim[2], rotY, exposure, bloom, scrim, aw });
export const POSE_KEYS = ['cx', 'cy', 'cz', 'ax', 'ay', 'az', 'rotY', 'exposure', 'bloom', 'scrim', 'aw'];
const KEYS = POSE_KEYS;

function gradientTexture(stops, w = 256, h = 256, radial = true) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d');
  const g = radial
    ? x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2)
    : x.createLinearGradient(0, 0, 0, h);
  for (const [t, col] of stops) g.addColorStop(t, col);
  x.fillStyle = g;
  x.fillRect(0, 0, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class Stage {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.tier = TIER;
    this.cars = new Map();
    this.current = null;         // { car, model, materials }
    this.wanted = null;
    this.busy = false;
    this.turn = 0;               // the turntable: its own axis, summed with the pose at render
    this.spinRate = 0;
    this.lift = { y: 0 };        // the rise/sink: its own axis too
    this.pointer = { x: 0, y: 0 };
    this.target = pose([5.6, 1.6, 7.4], [0.2, 0.7, 0], -0.5, 1.0, 0.3, 0);
    this.now = { ...this.target };
    this.idle = !REDUCED && opts.idle !== false;
    this.onFrame = null;
    this.clock = new THREE.Clock();
    this.t = 0;
  }

  init() {
    const low = this.tier === 'low';
    const r = new THREE.WebGLRenderer({
      canvas: this.canvas, antialias: !low, powerPreference: 'high-performance'
    });
    r.setPixelRatio(Math.min(devicePixelRatio, low ? 1 : this.tier === 'mid' ? 1.5 : 2));
    r.setSize(innerWidth, innerHeight, false);
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1;
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.localClippingEnabled = true;
    r.shadowMap.enabled = this.tier === 'high';
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer = r;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(PALETTE.penumbra);
    scene.fog = new THREE.Fog(PALETTE.penumbra, 18, 46);
    this.scene = scene;
    this.camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.1, 120);
    this.camera.layers.enable(1);   // layer 1: additive light the mirror should not double

    this.clip = new THREE.Plane(new THREE.Vector3(0, 1, 0), -DAIS_TOP);

    this.buildRoom();
    this.buildFloor();
    this.buildDais();
    this.buildBeams();
    this.buildMonolith();
    this.buildPost();
    this.resize();
    addEventListener('resize', () => this.resize(), { passive: true });
    return this;
  }

  /* ── the room, baked ─────────────────────────────────────── */
  buildRoom() {
    const env = new THREE.Scene();
    env.background = new THREE.Color(0x020204);
    const strip = (w, h, d, x, y, z, color, power) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(power) }));
      m.position.set(x, y, z);
      env.add(m);
    };
    /* neutral-cool white for the room: the ground stays blue-black and
       the corona stays the only warm thing in it */
    const bone = 0xe6eaf2;
    /* two long softboxes overhead: the highlight down the shoulder */
    strip(16, 0.25, 1.6, 0, 7, 1.8, bone, 3.4);
    strip(16, 0.25, 0.8, 0, 7, -2.2, bone, 2.2);
    /* a big dim ceiling, so a roof reflects a gradient and not a void */
    strip(24, 0.1, 18, 0, 9, 0, 0x3a3f4c, 1);
    /* tall side strips: the vertical kicks on doors and wheels */
    strip(0.2, 5, 0.5, 7, 2.4, 4, bone, 2.2);
    strip(0.2, 5, 0.5, -7, 2.4, 4, bone, 1.6);
    strip(0.2, 5, 0.5, 7, 2.4, -5, bone, 1.2);
    /* a low horizon line all round: the reflection a car sits in */
    strip(40, 0.12, 0.12, 0, 0.9, -12, bone, 1.4);
    strip(40, 0.12, 0.12, 0, 0.9, 12, bone, 0.8);
    /* the one warm light in the room: low, behind — the rim */
    strip(8, 0.3, 0.3, 0, 1.4, -9, PALETTE.corona, 1.8);
    /* dim walls all round, the big one behind the camera: flanks that
       face the viewer reflect a soft gradient instead of black */
    strip(30, 7, 0.1, 0, 3, 15, 0x9aa2b4, 0.5);
    strip(0.1, 6, 30, -15, 3, 0, 0x9aa2b4, 0.28);
    strip(0.1, 6, 30, 15, 3, 0, 0x9aa2b4, 0.28);
    /* a dim floor so the lower body is not pure void */
    strip(40, 0.1, 40, 0, -2, 0, 0x0b0b11, 1);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(env, 0.035).texture;
    this.scene.environmentIntensity = 1.15;
    pmrem.dispose();
    env.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); });

    /* one key for the shadow on the dais; the room does the rest */
    const key = new THREE.DirectionalLight(0xdfe4ee, 0.8);
    key.position.set(2.5, 9, 4);
    if (this.tier === 'high') {
      key.castShadow = true;
      key.shadow.mapSize.set(1024, 1024);
      Object.assign(key.shadow.camera, { near: 2, far: 20, left: -4, right: 4, top: 4, bottom: -4 });
      /* a grazing key on a curved roof acnes badly: bias by the normal */
      key.shadow.bias = -0.0015;
      key.shadow.normalBias = 0.06;
    }
    this.scene.add(key);
    this.key = key;
  }

  buildFloor() {
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(40, 64),
      new THREE.MeshStandardMaterial({ color: 0x0c0c12, roughness: 0.62, metalness: 0.3 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    /* a pool of light round the dais, painted rather than lit */
    const pool = new THREE.Mesh(new THREE.CircleGeometry(10, 64), new THREE.MeshBasicMaterial({
      map: gradientTexture([[0, 'rgba(200,208,224,.11)'], [0.4, 'rgba(200,208,224,.035)'], [1, 'rgba(0,0,0,0)']]),
      transparent: true, depthWrite: false
    }));
    pool.rotation.x = -Math.PI / 2;
    pool.position.y = 0.003;
    this.scene.add(pool);
  }

  buildDais() {
    const g = new THREE.Group();
    this.scene.add(g);
    this.dais = g;
    const seg = this.tier === 'low' ? 48 : 96;

    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(DAIS_R, DAIS_R + 0.08, DAIS_TOP, seg),
      new THREE.MeshStandardMaterial({ color: PALETTE.umbra, metalness: 0.7, roughness: 0.4 })
    );
    body.position.y = DAIS_TOP / 2;
    body.receiveShadow = true;
    g.add(body);

    /* the top the car stands on: a Reflector, so the car is in it */
    if (this.tier !== 'low') {
      const res = this.tier === 'high' ? 1024 : 512;
      const mirror = new Reflector(new THREE.CircleGeometry(DAIS_R, seg), {
        textureWidth: res, textureHeight: res, color: 0x2a2a30, clipBias: 0.003
      });
      mirror.rotation.x = -Math.PI / 2;
      mirror.position.y = DAIS_TOP + 0.001;
      g.add(mirror);
      this.mirror = mirror;
    }
    /* smoked over it, so the reflection is a suggestion, not a mirror */
    const top = new THREE.Mesh(new THREE.CircleGeometry(DAIS_R, seg), new THREE.MeshStandardMaterial({
      color: 0x08080d, metalness: 0.6, roughness: 0.3,
      transparent: this.tier !== 'low', opacity: this.tier === 'low' ? 1 : 0.72
    }));
    top.rotation.x = -Math.PI / 2;
    top.position.y = DAIS_TOP + 0.002;
    top.receiveShadow = true;
    g.add(top);

    /* the lit rim: corona, the rim light */
    const rim = new THREE.Mesh(new THREE.TorusGeometry(DAIS_R + 0.01, 0.014, 8, seg * 2),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(PALETTE.corona).multiplyScalar(1.05) }));
    rim.rotation.x = Math.PI / 2;
    rim.position.y = DAIS_TOP + 0.003;
    g.add(rim);
    this.rim = rim;

    /* the contact shadow, which travels with the car */
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({
      map: gradientTexture([[0, 'rgba(0,0,0,.85)'], [0.55, 'rgba(0,0,0,.4)'], [1, 'rgba(0,0,0,0)']]),
      transparent: true, depthWrite: false, opacity: 0
    }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = DAIS_TOP + 0.006;
    shadow.renderOrder = 2;
    this.scene.add(shadow);
    this.contact = shadow;
  }

  buildBeams() {
    const tex = gradientTexture([[0, 'rgba(255,255,255,0)'], [0.3, 'rgba(255,255,255,.9)'],
      [0.75, 'rgba(255,255,255,.25)'], [1, 'rgba(255,255,255,0)']], 8, 128, false);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xc8d0e0, map: tex, transparent: true, opacity: 0.022,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false
    });
    this.beamMat = mat;
    this.beams = new THREE.Group();
    const n = this.tier === 'low' ? 3 : 6;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + 0.3;
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.5, 8, 24, 1, true), mat);
      cone.position.set(Math.cos(a) * 2.4, 4.3, Math.sin(a) * 2.4);
      cone.rotation.z = -Math.cos(a) * 0.22;
      cone.rotation.x = Math.sin(a) * 0.22;
      this.beams.add(cone);
    }
    this.beams.traverse(o => o.layers.set(1));
    this.scene.add(this.beams);
  }

  /* the mark, standing upstage, eclipsing its own corona */
  buildMonolith() {
    const g = new THREE.Group();
    g.position.set(-4, 3.3, -11);
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(9.5, 9.5), new THREE.MeshBasicMaterial({
      map: gradientTexture([[0, 'rgba(232,217,168,.0)'], [0.26, 'rgba(232,217,168,.0)'],
        [0.3, 'rgba(232,217,168,.55)'], [0.4, 'rgba(232,217,168,.16)'], [0.7, 'rgba(232,217,168,.03)'], [1, 'rgba(0,0,0,0)']], 512, 512),
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false
    }));
    glow.position.z = -0.3;
    glow.layers.set(1);           // seen by the camera, not by the dais mirror
    g.add(glow);
    this.glow = glow;
    const mark = new THREE.Mesh(
      markGeometry({ depth: 0.4, bevel: 0.03, segments: this.tier === 'low' ? 48 : 128 }),
      new THREE.MeshStandardMaterial({ color: 0x0d0d14, metalness: 0.8, roughness: 0.34, fog: false })
    );
    mark.scale.setScalar(2.2);
    g.add(mark);
    this.monolith = g;
    this.scene.add(g);
  }

  buildPost() {
    if (this.tier === 'low') return;
    const c = new EffectComposer(this.renderer);
    c.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.3, 0.5, 0.9);
    c.addPass(this.bloom);
    c.addPass(new OutputPass());
    this.composer = c;
  }

  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.composer?.setSize(w, h);
    this.composer?.setPixelRatio(this.renderer.getPixelRatio());
  }

  /* ── cars ────────────────────────────────────────────────── */
  getCar(car) {
    if (this.cars.has(car.id)) return this.cars.get(car.id);
    const materials = makeMaterials();
    for (const m of Object.values(materials)) {
      m.clippingPlanes = [this.clip];
      m.clipShadows = true;
    }
    materials.tail.emissiveIntensity = 0.03;   // parked: the brake light is off
    const model = buildCarModel(car.proto, { materials, tier: this.tier });
    model.visible = false;
    this.scene.add(model);
    setPaint(materials, PAINTS[car.paints[0]]);
    const entry = { car, model, materials, paint: PAINTS[car.paints[0]] };
    this.cars.set(car.id, entry);
    return entry;
  }

  /* sink whatever is up, raise the new one. Rapid requests collapse
     onto the last one asked for. */
  showCar(car, { instant = false } = {}) {
    this.wanted = car;
    if (this.busy) return;
    if (this.current && this.current.car.id === car.id) return;
    const next = this.getCar(car);
    const depth = (next.model.userData.dims.height || 1.4) + 0.4;
    const { gsap } = window;

    const raise = () => {
      this.current = next;
      next.model.visible = true;
      if (instant || REDUCED) {
        this.lift.y = 0;
        this.busy = false;
        return this.settle();
      }
      this.lift.y = -depth;
      gsap.to(this.lift, {
        y: 0, duration: 1.6, ease: 'expo.out',
        onComplete: () => { this.busy = false; this.settle(); }
      });
      gsap.fromTo(this.beamMat, { opacity: 0.1 }, { opacity: 0.022, duration: 1.8, ease: 'power2.out' });
    };

    this.busy = true;
    if (!this.current || instant || REDUCED) {
      if (this.current) this.current.model.visible = false;
      return raise();
    }
    const out = this.current;
    const outDepth = (out.model.userData.dims.height || 1.4) + 0.4;
    gsap.to(this.lift, {
      y: -outDepth, duration: 0.7, ease: 'power3.in',
      onComplete: () => { out.model.visible = false; raise(); }
    });
  }

  /* rebuild the current car with other wheels; same materials, so the
     paint carries over */
  setWheels(style) {
    const cur = this.current;
    if (!cur || cur.wheel === style) return;
    const model = buildCarModel(cur.car.proto, { materials: cur.materials, tier: this.tier, wheel: style });
    this.scene.remove(cur.model);
    cur.model.traverse(o => o.geometry?.dispose());
    this.scene.add(model);
    cur.model = model;
    cur.wheel = style;
  }

  settle() {
    if (this.wanted && this.current && this.wanted.id !== this.current.car.id) this.showCar(this.wanted);
  }

  setPaint(paint, instant = false) {
    if (!this.current) return;
    const cur = this.current;
    cur.paint = paint;
    const M = cur.materials.paint;
    const to = new THREE.Color(paint.hex);
    if (instant || REDUCED) return setPaint(cur.materials, paint);
    const from = M.color.clone();
    const o = { t: 0, m: M.metalness, r: M.roughness };
    window.gsap.to(o, {
      t: 1, m: paint.metal, r: paint.rough, duration: 0.9, ease: 'power2.inOut',
      onUpdate: () => { M.color.copy(from).lerp(to, o.t); M.metalness = o.m; M.roughness = o.r; }
    });
  }

  /* ── the loop ────────────────────────────────────────────── */
  start() {
    this.renderer.setAnimationLoop(() => this.frame());
  }

  frame() {
    const dt = Math.min(this.clock.getDelta(), 0.1);
    this.t += dt;
    this.onFrame?.(dt);

    for (const k of KEYS) this.now[k] = damp(this.now[k], this.target[k], 3.2, dt);
    const n = this.now;
    /* the turntable spins where a section asks for it, and unwinds to
       the nearest whole turn everywhere else, so the poses still land */
    if (this.idle && this.spinRate) this.turn += this.spinRate * dt;
    else this.turn = damp(this.turn, Math.round(this.turn / (Math.PI * 2)) * Math.PI * 2, 1.6, dt);

    const yaw = n.rotY + this.turn;
    const cur = this.current;
    if (cur) {
      const m = cur.model;
      m.position.set(0, DAIS_TOP + this.lift.y, 0);
      m.rotation.y = yaw;
      const d = m.userData.dims;
      this.contact.scale.set(d.length * 1.2, d.width * 1.5, 1);
      this.contact.rotation.z = yaw;
      this.contact.material.opacity = Math.max(0, 1 + this.lift.y / 0.6) * 0.9;
    }

    /* aim in the car's frame, turned with the car */
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const aim = new THREE.Vector3(n.ax * c + n.az * s, DAIS_TOP + n.ay, -n.ax * s + n.az * c)
      .lerp(new THREE.Vector3(n.ax, n.ay, n.az), n.aw);

    /* a fixed vertical FOV crops a car on a narrow screen: dolly back by aspect */
    const aspect = this.camera.aspect;
    const dolly = aspect < 1.5 ? Math.min(2.3, Math.pow(1.5 / aspect, 0.85)) : 1;
    const cam = new THREE.Vector3(n.cx, n.cy, n.cz).sub(aim).multiplyScalar(dolly).add(aim);
    if (this.idle) {
      cam.x += Math.sin(this.t * 0.21) * 0.12 + this.pointer.x * 0.25;
      cam.y += Math.sin(this.t * 0.17) * 0.05 + this.pointer.y * 0.12;
    }
    cam.y = Math.max(cam.y, 0.25);
    this.camera.position.copy(cam);
    this.camera.lookAt(aim);

    this.renderer.toneMappingExposure = n.exposure;
    if (this.bloom) this.bloom.strength = n.bloom;
    document.documentElement.style.setProperty('--scrim', n.scrim.toFixed(3));

    if (this.idle) this.glow.material.opacity = 0.9 + Math.sin(this.t * 0.6) * 0.1;

    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }

  /* compile everything once, so the first scroll does not hitch */
  warm() {
    this.renderer.compile(this.scene, this.camera);
    this.frame();
  }
}
