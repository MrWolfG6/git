/* ═══════════════════════════════════════════════════════════
   THE WORLDS
   Three closed routes on one spline each. A closed loop means the
   road, the traffic, the lap timing and the forward read all share
   one piece of maths, and there is no edge to fall off.

   THE SPINE    coastal motorway under a city, traffic both ways
   SALT         a desert strip, neon, at the edge of nothing
   THE CIRCUIT  a Grand Prix track
   ═══════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { markGeometry, PALETTE } from '../brand.js';

const V = (x, z) => new THREE.Vector3(x, 0, z);

const ROUTES = {
  spine: {
    width: 17, kerbs: false, lanes: 4, twoWay: true,
    points: [
      V(0, 0), V(0, -320), V(30, -640), V(120, -900), V(300, -1080), V(560, -1140),
      V(820, -1080), V(980, -900), V(1040, -620), V(1020, -300), V(940, -20),
      V(760, 170), V(500, 240), V(250, 210), V(70, 120)
    ]
  },
  salt: {
    width: 15, kerbs: false, lanes: 2, twoWay: true,
    points: [
      V(0, 0), V(0, -700), V(40, -1200), V(180, -1500), V(420, -1600), V(640, -1480),
      V(720, -1150), V(700, -600), V(660, -120), V(540, 180), V(300, 280), V(90, 190)
    ]
  },
  circuit: {
    width: 13, kerbs: true, lanes: 1, twoWay: false,
    points: [
      V(0, 0), V(0, -420), V(30, -560), V(140, -620), V(250, -580),
      V(300, -460), V(280, -330), V(190, -270), V(120, -190),
      V(150, -70), V(280, -20), V(420, -40), V(520, -140),
      V(540, -290), V(470, -390), V(360, -370), V(330, -240),
      V(390, -120), V(430, 60), V(360, 190), V(210, 240),
      V(60, 215), V(-20, 120)
    ]
  }
};

/* sky, fog, sun and ground, day and night */
const LOOK = {
  spine: {
    day:   { sky: 0x8fa9c6, horizon: 0xd6dde6, fog: 0xb8c4d2, fogD: 0.0014, sun: 0xfff6ea, sunI: 2.8, amb: 0x9aabc0, ambI: 1.0, ground: 0x2a2d33, road: 0xffffff, edge: 0xcfd3da },
    night: { sky: 0x05060c, horizon: 0x121726, fog: 0x080a12, fogD: 0.0022, sun: 0x8ea4d6, sunI: 0.16, amb: 0x1a2234, ambI: 0.4, ground: 0x08090c, road: 0x5a5f68, edge: 0x5a5f68 }
  },
  salt: {
    day:   { sky: 0x9fb4cc, horizon: 0xe8e4dc, fog: 0xe0dbd0, fogD: 0.0011, sun: 0xfff4e4, sunI: 3.2, amb: 0xc4bcae, ambI: 1.15, ground: 0xc8c2b6, road: 0xf2f0ec, edge: 0xe0dcd4 },
    night: { sky: 0x04050b, horizon: 0x10121e, fog: 0x06070d, fogD: 0.0017, sun: 0x8e9ccc, sunI: 0.14, amb: 0x1c2030, ambI: 0.45, ground: 0x15161b, road: 0x55575e, edge: 0x3c3e46 }
  },
  circuit: {
    day:   { sky: 0x8fb0d2, horizon: 0xdbe3ec, fog: 0xbfcad8, fogD: 0.0012, sun: 0xfff6e8, sunI: 3.0, amb: 0x9fb0c4, ambI: 1.1, ground: 0x28322a, road: 0xffffff, edge: 0xe8e6e0 },
    night: { sky: 0x04060b, horizon: 0x0f1522, fog: 0x06080f, fogD: 0.0018, sun: 0x8fa3d2, sunI: 0.18, amb: 0x18202e, ambI: 0.45, ground: 0x0a0e0b, road: 0x62666e, edge: 0x6a6c70 }
  }
};

/* Night lighting by design, not by feel. A PointLight's intensity is
   candela (three r155+); irradiance at the road is I / d². Each source
   declares the irradiance it should put on the tarmac under it and its
   geometry, and the candela is worked out from that. */
const candela = (irradiance, height, offset) => irradiance * (height * height + offset * offset);

export class World {
  constructor(id, tier = 'high') {
    this.id = ROUTES[id] ? id : 'spine';
    this.tier = tier;
    this.def = ROUTES[this.id];
    this.blend = 0;                      // 0 day → 1 night
    this.group = new THREE.Group();
    this.emissives = [];
    this.lightSpots = [];                // where light comes from after dark
    this.pool = [];                      // the few PointLights that actually cast it
    this.poolLit = false;
    this.curve = new THREE.CatmullRomCurve3(this.def.points, true, 'catmullrom', 0.5);
    this.length = this.curve.getLength();
    this.width = this.def.width;
    this.twoWay = this.def.twoWay;

    /* a lookup table: position along the lap without a curve solve */
    this.samples = Math.max(800, Math.round(this.length / 3));
    this.lut = [];
    this.tans = [];
    for (let i = 0; i <= this.samples; i++) {
      const u = i / this.samples;
      this.lut.push(this.curve.getPointAt(u));
      this.tans.push(this.curve.getTangentAt(u).normalize());
    }
  }

  /* position, direction and the right-hand axis at a point on the lap */
  frameAt(u) {
    u = ((u % 1) + 1) % 1;
    const f = u * this.samples, i = Math.floor(f), t = f - i;
    const pos = this.lut[i].clone().lerp(this.lut[Math.min(i + 1, this.samples)], t);
    const tan = this.tans[i].clone().lerp(this.tans[Math.min(i + 1, this.samples)], t).normalize();
    const side = new THREE.Vector3(-tan.z, 0, tan.x);      // tan × up: the right-hand side
    return { pos, tan, side };
  }

  /* how far along the lap a point is, searched near a hint */
  progressNear(point, hintU = 0, span = 0.05) {
    let best = hintU, bestD = Infinity;
    const from = Math.round((hintU - span) * this.samples), to = Math.round((hintU + span) * this.samples);
    for (let i = from; i <= to; i++) {
      const j = ((i % this.samples) + this.samples) % this.samples;
      const d = this.lut[j].distanceToSquared(point);
      if (d < bestD) { bestD = d; best = j / this.samples; }
    }
    /* which side of the centre line, signed, so traffic can tell lanes */
    const f = this.frameAt(best);
    const lateral = point.clone().sub(f.pos).dot(f.side);
    return { u: best, dist: Math.sqrt(bestD), lateral };
  }

  /* The forward read: the tightest bend in the next `range` metres, which
     way it goes, how far, and the speed the grip allows through it. */
  readAhead(u, range = 320, grip = 1.1) {
    const step = 6 / this.length;
    let best = { radius: Infinity, dist: 0, dir: 0 };
    const span = 0.012 * (1500 / this.length);
    for (let d = 12; d < range; d += 6) {
      const a = this.frameAt(u + d / this.length);
      const b = this.frameAt(u + d / this.length + span);
      const cross = a.tan.x * b.tan.z - a.tan.z * b.tan.x;
      const ang = Math.acos(Math.min(1, Math.max(-1, a.tan.dot(b.tan))));
      const r = ang < 1e-4 ? Infinity : (span * this.length) / ang;
      if (r < best.radius) best = { radius: r, dist: d, dir: cross > 0 ? 1 : -1 };
    }
    const v = Math.sqrt(grip * 9.81 * Math.min(best.radius, 4000)) * 3.6;
    return { ...best, speed: v };
  }

  /* ─────────────────────────── build ─────────────────────── */
  build(scene, renderer) {
    this.scene = scene;
    scene.add(this.group);
    this.buildSky();
    this.buildIBL(renderer);
    this.buildGround();
    this.buildRoad();
    this.buildSun();
    if (this.id === 'spine') this.buildSpine();
    if (this.id === 'salt') this.buildSalt();
    if (this.id === 'circuit') this.buildCircuit();
    this.buildLightPool();
    this.apply(0);
    return this;
  }

  buildSky() {
    const uniforms = { top: { value: new THREE.Color() }, bottom: { value: new THREE.Color() } };
    this.skyU = uniforms;
    const sky = new THREE.Mesh(new THREE.SphereGeometry(3200, 32, 16), new THREE.ShaderMaterial({
      uniforms, side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 vW; void main(){ vW = (modelMatrix*vec4(position,1.0)).xyz; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying vec3 vW; void main(){ float h = normalize(vW + vec3(0.0,140.0,0.0)).y; gl_FragColor = vec4(mix(bottom, top, pow(max(h,0.0),0.65)),1.0); }'
    }));
    sky.frustumCulled = false;
    this.sky = sky;
    this.group.add(sky);

    const n = this.tier === 'low' ? 500 : 1500;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(2600);
      v.y = Math.abs(v.y) * 0.9 + 80;
      pos.set([v.x, v.y, v.z], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.stars = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xe6eaf2, size: 2.4, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false }));
    this.stars.frustumCulled = false;
    this.group.add(this.stars);
  }

  /* A sky gradient baked to an environment. Clearcoated metallic paint
     with nothing to reflect renders black; this is what it reflects. */
  buildIBL(renderer) {
    const L = LOOK[this.id];
    const make = night => {
      const p = night ? L.night : L.day;
      const c = document.createElement('canvas');
      c.width = 8; c.height = 128;
      const x = c.getContext('2d');
      const hex = v => '#' + v.toString(16).padStart(6, '0');
      const g = x.createLinearGradient(0, 0, 0, 128);
      g.addColorStop(0, hex(p.sky)); g.addColorStop(0.47, hex(p.horizon));
      g.addColorStop(0.53, hex(p.ground)); g.addColorStop(1, hex(night ? 0x030306 : 0x1a1a1e));
      x.fillStyle = g; x.fillRect(0, 0, 8, 128);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      const env = new THREE.Scene();
      const dome = new THREE.Mesh(new THREE.SphereGeometry(60, 24, 16), new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide }));
      env.add(dome);
      const sun = new THREE.Mesh(new THREE.SphereGeometry(5, 12, 8), new THREE.MeshBasicMaterial({ color: night ? 0x2a3450 : 0xffffff }));
      sun.position.set(-34, 30, 26);
      env.add(sun);
      /* long strip lights down both sides: highlights run along a flank */
      for (const z of [-40, 40]) {
        const s = new THREE.Mesh(new THREE.BoxGeometry(80, 1.2, 0.5), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xdfe6f0).multiplyScalar(night ? 0.6 : 1.4) }));
        s.position.set(0, 10, z);
        env.add(s);
      }
      const pm = new THREE.PMREMGenerator(renderer);
      const t = pm.fromScene(env, 0.03).texture;
      pm.dispose();
      env.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); });
      tex.dispose();
      return t;
    };
    this.envDay = make(false);
    this.envNight = make(true);
    this.scene.environment = this.envDay;
  }

  buildGround() {
    const mat = new THREE.MeshStandardMaterial({ color: LOOK[this.id].day.ground, roughness: 1, metalness: 0 });
    this.groundMat = mat;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(7000, 7000), mat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    ground.receiveShadow = true;
    this.group.add(ground);
  }

  /* the road ribbon, its markings, and the verge or kerbs */
  buildRoad() {
    const N = this.tier === 'low' ? 600 : 1200;
    const hw = this.width / 2;
    const pos = [], uv = [], idx = [];
    for (let i = 0; i <= N; i++) {
      const f = this.frameAt(i / N);
      const l = f.pos.clone().addScaledVector(f.side, -hw), r = f.pos.clone().addScaledVector(f.side, hw);
      pos.push(l.x, 0.02, l.z, r.x, 0.02, r.z);
      const v = (i / N) * this.length / 10;
      uv.push(0, v, 1, v);
      if (i < N) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    if (geo.attributes.normal.getY(0) < 0) { geo.setIndex(idx.map((_, k) => idx[k - (k % 3) + [0, 2, 1][k % 3]])); geo.computeVertexNormals(); }

    /* A map tinted by a dark base colour is double-darkened: the colour
       stays white-ish and the texture carries the tone. */
    this.roadMat = new THREE.MeshStandardMaterial({ map: this.roadTexture(), color: 0xffffff, roughness: 0.84, metalness: 0.02 });
    const road = new THREE.Mesh(geo, this.roadMat);
    road.receiveShadow = true;
    this.group.add(road);

    this.edgeMat = new THREE.MeshStandardMaterial({ color: LOOK[this.id].day.edge, roughness: 0.8 });
    const kerbA = new THREE.MeshStandardMaterial({ color: PALETTE.ember, roughness: 0.6 });   // a kerb is a warning
    const kerbB = new THREE.MeshStandardMaterial({ color: PALETTE.bone, roughness: 0.6 });
    for (const s of [-1, 1]) {
      const ep = [], ei = [];
      const w = this.def.kerbs ? 1.4 : 0.5;
      for (let i = 0; i <= N; i++) {
        const f = this.frameAt(i / N);
        const a = f.pos.clone().addScaledVector(f.side, s * hw), b = f.pos.clone().addScaledVector(f.side, s * (hw + w));
        ep.push(a.x, 0.03, a.z, b.x, this.def.kerbs ? 0.08 : 0.04, b.z);
        if (i < N) { const k = i * 2; ei.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
      }
      const eg = new THREE.BufferGeometry();
      eg.setAttribute('position', new THREE.Float32BufferAttribute(ep, 3));
      eg.setIndex(ei);
      eg.computeVertexNormals();
      let mesh;
      if (this.def.kerbs) {
        eg.clearGroups();
        for (let i = 0; i < N; i++) eg.addGroup(i * 6, 6, Math.floor(i / 6) % 2);
        mesh = new THREE.Mesh(eg, [kerbA, kerbB]);
      } else mesh = new THREE.Mesh(eg, this.edgeMat);
      mesh.material.side = THREE.DoubleSide;
      if (Array.isArray(mesh.material)) mesh.material.forEach(m => { m.side = THREE.DoubleSide; });
      this.group.add(mesh);
    }
  }

  roadTexture() {
    const c = document.createElement('canvas');
    c.width = 128; c.height = 256;
    const x = c.getContext('2d');
    x.fillStyle = this.id === 'salt' ? '#46464b' : '#3b3d43';
    x.fillRect(0, 0, 128, 256);
    for (let i = 0; i < 2600; i++) {
      x.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`;
      x.fillRect(Math.random() * 128, Math.random() * 256, 1.3, 1.3);
    }
    const lanes = this.def.lanes;
    x.strokeStyle = 'rgba(236,236,236,.6)';
    x.lineWidth = 2.6;
    for (let i = 1; i < lanes; i++) {
      const px = (i / lanes) * 128;
      const centre = this.def.twoWay && i === lanes / 2;
      x.setLineDash(centre ? [] : [44, 52]);
      if (centre) { x.beginPath(); x.moveTo(px - 2.5, 0); x.lineTo(px - 2.5, 256); x.moveTo(px + 2.5, 0); x.lineTo(px + 2.5, 256); x.stroke(); }
      else { x.beginPath(); x.moveTo(px, 0); x.lineTo(px, 256); x.stroke(); }
    }
    x.setLineDash([]);
    x.fillStyle = 'rgba(240,240,240,.75)';
    x.fillRect(3, 0, 3, 256); x.fillRect(122, 0, 3, 256);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  buildSun() {
    const sun = new THREE.DirectionalLight(0xffffff, 3);
    sun.position.set(-300, 420, 260);
    if (this.tier !== 'low') {
      sun.castShadow = true;
      sun.shadow.mapSize.set(this.tier === 'high' ? 2048 : 1024, this.tier === 'high' ? 2048 : 1024);
      Object.assign(sun.shadow.camera, { near: 10, far: 1000, left: -50, right: 50, top: 50, bottom: -50 });
      sun.shadow.bias = -0.0008;
      sun.shadow.normalBias = 0.05;
    }
    this.scene.add(sun, sun.target);
    this.sun = sun;
    this.hemi = new THREE.HemisphereLight(0xbccce0, 0x2a2824, 1);
    this.scene.add(this.hemi);
  }

  /* instanced boxes along the route, either side */
  instancedAlong(count, geo, mat, place) {
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      place(i, p, q, s);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
    this.group.add(mesh);
    return mesh;
  }

  windowTexture(seed = 0) {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const x = c.getContext('2d');
    for (let gy = 0; gy < 22; gy++) for (let gx = 0; gx < 12; gx++) {
      if (Math.random() < 0.5) continue;
      const k = Math.random();
      x.fillStyle = `rgba(${200 + k * 40},${214 + k * 30},${236},${0.35 + Math.random() * 0.55})`;
      x.fillRect(gx * 10 + 3, gy * 5.6 + 1.6, 5.5, 3);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(3, 6);
    return t;
  }

  /* street lamps down a verge; their light joins the pool */
  streetLamps(count, off, h = 9, E = 0.9) {
    const hw = this.width / 2;
    const up = new THREE.Vector3(0, 1, 0);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x1a1c22, roughness: 0.6, metalness: 0.6 });
    const headMat = new THREE.MeshBasicMaterial({ color: 0x22242a });
    this.emissives.push({ mat: headMat, colorDay: 0x22242a, colorNight: 0xe6ecf6 });
    const place = (i, lamp) => (p, q, s) => {
      const f = this.frameAt(i / count);
      const side = i % 2 ? 1 : -1;
      p.copy(f.pos).addScaledVector(f.side, side * (hw + off));
      if (lamp) p.addScaledVector(f.side, -side * 1.2);
      p.y = lamp ? h : h / 2;
      q.setFromAxisAngle(up, Math.atan2(f.tan.x, f.tan.z));
      s.set(1, 1, 1);
    };
    const poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.14, 0.18, h, 6), poleMat, count);
    const heads = new THREE.InstancedMesh(new THREE.BoxGeometry(0.7, 0.18, 2.2), headMat, count);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      place(i, false)(p, q, s); m.compose(p, q, s); poles.setMatrixAt(i, m);
      place(i, true)(p, q, s); m.compose(p, q, s); heads.setMatrixAt(i, m);
      this.lightSpots.push({ pos: p.clone().setY(h - 0.4), color: 0xe6ecf6, intensity: candela(E, h, 1.5), distance: h * 4 });
    }
    this.group.add(poles, heads);
  }

  /* ── THE SPINE: the city on one side, the sea on the other ── */
  buildSpine() {
    const hw = this.width / 2;
    const n = this.tier === 'low' ? 110 : 240;
    const box = new THREE.BoxGeometry(1, 1, 1);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1a1d24, roughness: 0.8, metalness: 0.25 });
    const winMat = new THREE.MeshBasicMaterial({ map: this.windowTexture(), transparent: true, opacity: 0, depthWrite: false });
    this.windowMat = winMat;
    const up = new THREE.Vector3(0, 1, 0);
    const towers = [];
    for (let i = 0; i < n; i++) {
      const f = this.frameAt(i / n + (Math.random() - 0.5) * 0.003);
      const off = hw + 22 + Math.random() * 90;
      const h = 24 + Math.pow(Math.random(), 1.8) * 200 * (0.5 + 0.5 * Math.sin((i / n) * Math.PI * 2 + 1));
      towers.push({ p: f.pos.clone().addScaledVector(f.side, -off), yaw: Math.atan2(f.tan.x, f.tan.z) + (Math.random() - 0.5) * 0.2, w: 16 + Math.random() * 26, d: 16 + Math.random() * 26, h });
    }
    const bodies = this.instancedAlong(n, box, bodyMat, (i, p, q, s) => {
      const t = towers[i]; p.copy(t.p).setY(t.h / 2); q.setFromAxisAngle(up, t.yaw); s.set(t.w, t.h, t.d);
    });
    bodies.castShadow = this.tier === 'high';
    this.instancedAlong(n, box, winMat, (i, p, q, s) => {
      const t = towers[i]; p.copy(t.p).setY(t.h / 2); q.setFromAxisAngle(up, t.yaw); s.set(t.w + 0.1, t.h * 0.98, t.d + 0.1);
    });

    /* the sea: the bay the motorway wraps round, drawn from the route
       itself and pulled in past the sea wall, so it never meets the road */
    const bay = new THREE.Shape();
    const M = 200;
    for (let i = 0; i <= M; i++) {
      const f = this.frameAt(i / M);
      const p = f.pos.clone().addScaledVector(f.side, hw + 6);
      if (i === 0) bay.moveTo(p.x, -p.z); else bay.lineTo(p.x, -p.z);
    }
    const water = new THREE.Mesh(new THREE.ShapeGeometry(bay, 1),
      new THREE.MeshStandardMaterial({ color: 0x1a2c3e, roughness: 0.14, metalness: 0.8 }));
    water.rotation.x = -Math.PI / 2;        // shape y → world −z, hence the −p.z above
    water.position.y = -0.02;
    this.water = water;
    this.group.add(water);
    /* a sea wall between the road and the water */
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x3a3d44, roughness: 0.9 });
    this.edgeWall(wallMat, hw + 3, 1.1);

    /* bridges and gantries: the things that give a straight a sense of speed */
    this.overpasses([0.08, 0.27, 0.46, 0.63, 0.82]);
    this.streetLamps(this.tier === 'low' ? 70 : 150, 2.4);
  }

  edgeWall(mat, off, h) {
    const N = this.tier === 'low' ? 300 : 600;
    const up = new THREE.Vector3(0, 1, 0);
    const len = this.length / N + 0.6;
    this.instancedAlong(N, new THREE.BoxGeometry(0.5, h, len), mat, (i, p, q, s) => {
      const f = this.frameAt(i / N);
      p.copy(f.pos).addScaledVector(f.side, off).setY(h / 2);
      q.setFromAxisAngle(up, Math.atan2(f.tan.x, f.tan.z));
      s.set(1, 1, 1);
    });
  }

  overpasses(spots) {
    const hw = this.width / 2;
    const deck = new THREE.MeshStandardMaterial({ color: 0x1c1f25, roughness: 0.9, metalness: 0.1 });
    const board = new THREE.MeshStandardMaterial({ color: 0x1d2530, roughness: 0.7 });
    spots.forEach((u, i) => {
      const f = this.frameAt(u);
      const g = new THREE.Group();
      g.position.copy(f.pos).setY(0);
      g.rotation.y = Math.atan2(f.tan.x, f.tan.z);
      if (i % 2 === 0) {
        const span = new THREE.Mesh(new THREE.BoxGeometry(this.width + 40, 1.2, 10), deck);
        span.position.y = 7.6;
        span.castShadow = this.tier !== 'low';
        g.add(span);
        for (const s of [-1, 1]) {
          const pier = new THREE.Mesh(new THREE.BoxGeometry(3.2, 7.6, 7), deck);
          pier.position.set(s * (hw + 6), 3.8, 0);
          g.add(pier);
        }
      } else {
        for (const s of [-1, 1]) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 7.4, 8), deck);
          leg.position.set(s * (hw + 1.5), 3.7, 0);
          g.add(leg);
        }
        const beam = new THREE.Mesh(new THREE.BoxGeometry(this.width + 3, 0.4, 0.4), deck);
        beam.position.y = 7.3;
        g.add(beam);
        const b = new THREE.Mesh(new THREE.BoxGeometry(this.width * 0.6, 2.2, 0.2), board);
        b.position.set(0, 6, 0.25);
        g.add(b);
      }
      /* the group is turned to the heading: local z runs down the road,
         so everything above is laid across x */
      this.group.add(g);
    });
  }

  /* ── SALT: a pale flat, mesas on the horizon, neon out of nowhere ── */
  buildSalt() {
    const hw = this.width / 2;
    const up = new THREE.Vector3(0, 1, 0);
    /* mesas: distant, flat-topped, bone-grey */
    const mesaMat = new THREE.MeshStandardMaterial({ color: 0x8c8478, roughness: 1 });
    this.mesaMat = mesaMat;
    const n = 26;
    this.instancedAlong(n, new THREE.CylinderGeometry(1, 1.25, 1, 7), mesaMat, (i, p, q, s) => {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.2;
      const r = 1500 + Math.random() * 900;
      p.set(350 + Math.cos(a) * r, 0, -650 + Math.sin(a) * r);
      const h = 40 + Math.random() * 140, w = 90 + Math.random() * 220;
      p.y = h / 2;
      q.setFromAxisAngle(up, Math.random() * 3);
      s.set(w, h, w * (0.5 + Math.random()));
    });

    /* neon: cold tubes on frames, and the mark itself, in corona */
    const tubeMat = new THREE.MeshBasicMaterial({ color: 0x9aa4b8 });
    this.emissives.push({ mat: tubeMat, colorDay: 0x6c7282, colorNight: 0xdfe8ff });
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x2a2b30, roughness: 0.7, metalness: 0.6 });
    const markMat = new THREE.MeshBasicMaterial({ color: 0x5a5444 });
    this.emissives.push({ mat: markMat, colorDay: 0x5a5444, colorNight: new THREE.Color(PALETTE.corona).multiplyScalar(1.12) });
    const markGeo = markGeometry({ depth: 0.3, bevel: 0, segments: 48 });
    const count = this.tier === 'low' ? 18 : 36;
    for (let i = 0; i < count; i++) {
      const u = i / count + 0.01;
      const f = this.frameAt(u);
      const side = i % 2 ? 1 : -1;
      const g = new THREE.Group();
      g.position.copy(f.pos).addScaledVector(f.side, side * (hw + 10 + (i % 3) * 6));
      g.rotation.y = Math.atan2(f.tan.x, f.tan.z) + (side > 0 ? -Math.PI / 2 : Math.PI / 2);
      if (i % 4 === 0) {
        /* the eclipse, eight metres high */
        const m = new THREE.Mesh(markGeo, markMat);
        m.scale.setScalar(4);
        m.position.y = 7;
        g.add(m);
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2, 0.3), frameMat);
        post.position.y = 1;
        g.add(post);
        this.lightSpots.push({ pos: g.position.clone().setY(7), color: PALETTE.corona, intensity: candela(0.45, 7, 10), distance: 40 });
      } else {
        const w = 4 + Math.random() * 8, h = 6 + Math.random() * 9;
        const fr = new THREE.Mesh(new THREE.BoxGeometry(w, 0.25, 0.25), frameMat);
        for (const y of [h, h * 0.55]) {
          const bar = fr.clone(); bar.position.y = y; g.add(bar);
          const tube = new THREE.Mesh(new THREE.BoxGeometry(w * 0.94, 0.09, 0.09), tubeMat);
          tube.position.set(0, y - 0.3, 0.2);
          g.add(tube);
        }
        for (const s of [-1, 1]) {
          const leg = new THREE.Mesh(new THREE.BoxGeometry(0.22, h, 0.22), frameMat);
          leg.position.set(s * w / 2, h / 2, 0);
          g.add(leg);
          const vt = new THREE.Mesh(new THREE.BoxGeometry(0.09, h * 0.45, 0.09), tubeMat);
          vt.position.set(s * (w / 2 - 0.4), h * 0.78, 0.2);
          g.add(vt);
        }
        this.lightSpots.push({ pos: g.position.clone().setY(h * 0.8), color: 0xdfe8ff, intensity: candela(0.4, h, 11), distance: 42 });
      }
      this.group.add(g);
    }
    /* low reflector posts down both edges: the only other light out here */
    const postMat = new THREE.MeshBasicMaterial({ color: 0x3a3c44 });
    this.emissives.push({ mat: postMat, colorDay: 0x3a3c44, colorNight: 0xb8c0d0 });
    const N = this.tier === 'low' ? 200 : 420;
    this.instancedAlong(N * 2, new THREE.BoxGeometry(0.12, 0.9, 0.12), postMat, (i, p, q, s) => {
      const f = this.frameAt(Math.floor(i / 2) / N);
      p.copy(f.pos).addScaledVector(f.side, (i % 2 ? 1 : -1) * (hw + 1.8)).setY(0.45);
      q.identity(); s.set(1, 1, 1);
    });
  }

  /* ── THE CIRCUIT: barriers, stands, a gantry, floodlights ── */
  buildCircuit() {
    const hw = this.width / 2;
    const up = new THREE.Vector3(0, 1, 0);
    const n = this.tier === 'low' ? 240 : 520;
    const barMat = new THREE.MeshStandardMaterial({ color: 0xc9ccd2, roughness: 0.5, metalness: 0.6 });
    const len = this.length / n + 1;
    this.instancedAlong(n * 2, new THREE.BoxGeometry(0.28, 0.85, len), barMat, (i, p, q, s) => {
      const f = this.frameAt(Math.floor(i / 2) / n);
      p.copy(f.pos).addScaledVector(f.side, (i % 2 ? 1 : -1) * (hw + 4.5)).setY(0.5);
      q.setFromAxisAngle(up, Math.atan2(f.tan.x, f.tan.z));
      s.set(1, 1, 1);
    });

    const standMat = new THREE.MeshStandardMaterial({ color: 0x1c2027, roughness: 0.9 });
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x323846, roughness: 1 });
    for (const u of [0.015, 0.3, 0.62, 0.86]) {
      const f = this.frameAt(u);
      const g = new THREE.Group();
      g.position.copy(f.pos).addScaledVector(f.side, -(hw + 22));
      g.rotation.y = Math.atan2(f.tan.x, f.tan.z);
      const base = new THREE.Mesh(new THREE.BoxGeometry(26, 9, 90), standMat);
      base.position.y = 4.5;
      base.castShadow = base.receiveShadow = this.tier !== 'low';
      const seats = new THREE.Mesh(new THREE.BoxGeometry(20, 0.6, 84), seatMat);
      seats.position.set(-2, 9.3, 0);
      seats.rotation.z = -0.28;
      const roof = new THREE.Mesh(new THREE.BoxGeometry(28, 0.5, 94), standMat);
      roof.position.set(-1, 15, 0);
      g.add(base, seats, roof);
      /* the local frame runs along z: stands are built along z already */
      this.group.add(g);
    }

    /* the start gantry: five lights, and the line */
    const f0 = this.frameAt(0.0005);
    const gantry = new THREE.Group();
    gantry.position.copy(f0.pos);
    gantry.rotation.y = Math.atan2(f0.tan.x, f0.tan.z);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x16181d, roughness: 0.6, metalness: 0.7 });
    for (const s of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.8, 9, 0.8), legMat);
      leg.position.set(s * (hw + 1.6), 4.5, 0);
      gantry.add(leg);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(this.width + 5, 1.6, 1.1), legMat);
    beam.position.y = 9.4;
    gantry.add(beam);
    this.startBulbs = [];
    for (let i = 0; i < 5; i++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.2), new THREE.MeshBasicMaterial({ color: 0x1a0c0a }));
      b.position.set((i - 2) * 1.1, 8.3, -0.65);
      gantry.add(b);
      this.startBulbs.push(b);
    }
    this.group.add(gantry);

    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const x = c.getContext('2d');
    for (let a = 0; a < 8; a++) for (let b = 0; b < 8; b++) { x.fillStyle = (a + b) % 2 ? '#f2efe9' : '#111116'; x.fillRect(a * 8, b * 8, 8, 8); }
    const lineTex = new THREE.CanvasTexture(c);
    lineTex.colorSpace = THREE.SRGBColorSpace;
    const line = new THREE.Mesh(new THREE.PlaneGeometry(this.width, 2.4), new THREE.MeshStandardMaterial({ map: lineTex, roughness: 0.8 }));
    line.rotation.x = -Math.PI / 2;
    line.rotation.z = Math.atan2(f0.tan.x, f0.tan.z);
    line.position.copy(f0.pos).setY(0.03);
    this.group.add(line);

    /* floodlights: cheap masts, and only the nearest few are real lights */
    const masts = this.tier === 'low' ? 16 : 30;
    const lampMat = new THREE.MeshBasicMaterial({ color: 0x1a1c20 });
    this.emissives.push({ mat: lampMat, colorDay: 0x1a1c20, colorNight: 0xe6eeff });
    for (let i = 0; i < masts; i++) {
      const f = this.frameAt(i / masts + 0.01);
      const off = hw + 12;
      const p = f.pos.clone().addScaledVector(f.side, (i % 2 ? 1 : -1) * off);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.45, 24, 6), legMat);
      mast.position.copy(p).setY(12);
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(4, 1.2, 1), lampMat);
      lamp.position.copy(p).setY(23.6);
      this.group.add(mast, lamp);
      /* 23 m up and 12 m off the centre: 1.1 on the tarmac needs ~740 cd,
         where a guess of 60 would have delivered 0.09 */
      this.lightSpots.push({ pos: p.clone().setY(23), color: 0xe6eeff, intensity: candela(1.1, 23, off), distance: 110 });
    }
  }

  /* ── the light pool ──────────────────────────────────────
     numPointLights is compiled into every lit material's shader and
     walked for every fragment, at intensity zero as much as at full.
     So there are never more than six: re-pointed each frame at the
     sources nearest the car.

     The trade, written down: the pool is hidden by day (visible=false)
     rather than left at zero. Hiding changes numPointLights, so the
     first day→night switch of a session recompiles every lit material
     and drops a frame or two. Leaving six zero-intensity lights in the
     shader costs every daylight frame instead. Driving by day is the
     common case; one hitch on a deliberate keypress is the cheaper side. */
  buildLightPool() {
    const size = this.lightSpots.length ? (this.tier === 'low' ? 3 : 6) : 0;
    for (let i = 0; i < size; i++) {
      const l = new THREE.PointLight(0xffffff, 0, 50, 2);
      l.visible = false;
      this.group.add(l);
      this.pool.push(l);
    }
  }

  updateLightPool(focus) {
    if (!this.pool.length) return;
    const lit = this.blend >= 0.02;
    if (this.poolLit !== lit) {
      this.poolLit = lit;
      for (const l of this.pool) l.visible = lit;
    }
    if (!lit) return;
    const spots = this.lightSpots, near = [];
    for (let i = 0; i < spots.length; i++) {
      const d = spots[i].pos.distanceToSquared(focus);
      if (near.length < this.pool.length) {
        near.push({ i, d });
        if (near.length === this.pool.length) near.sort((a, b) => a.d - b.d);
      } else if (d < near[near.length - 1].d) {
        near[near.length - 1] = { i, d };
        near.sort((a, b) => a.d - b.d);
      }
    }
    for (let k = 0; k < this.pool.length; k++) {
      const l = this.pool[k], pick = near[k];
      if (!pick) { l.intensity = 0; continue; }
      const s = spots[pick.i];
      l.position.copy(s.pos);
      l.color.setHex(s.color);
      l.distance = s.distance;
      l.intensity = s.intensity * this.blend;
    }
  }

  /* ── time of day: t is the blend, 0 day → 1 night ── */
  apply(t) {
    this.blend = t;
    const L = LOOK[this.id];
    const mix = (a, b) => new THREE.Color(a).lerp(new THREE.Color(b), t);
    this.skyU.top.value.copy(mix(L.day.sky, L.night.sky));
    this.skyU.bottom.value.copy(mix(L.day.horizon, L.night.horizon));
    this.stars.material.opacity = Math.max(0, t * 1.25 - 0.25);
    if (!this.scene.fog) this.scene.fog = new THREE.FogExp2(0x000000, 0.002);
    this.scene.fog.color.copy(mix(L.day.fog, L.night.fog));
    this.scene.fog.density = L.day.fogD + (L.night.fogD - L.day.fogD) * t;
    this.sun.color.copy(mix(L.day.sun, L.night.sun));
    this.sun.intensity = L.day.sunI + (L.night.sunI - L.day.sunI) * t;
    this.hemi.color.copy(mix(L.day.amb, L.night.amb));
    this.hemi.intensity = L.day.ambI + (L.night.ambI - L.day.ambI) * t;
    this.roadMat.color.copy(mix(L.day.road, L.night.road));
    this.groundMat.color.copy(mix(L.day.ground, L.night.ground));
    this.edgeMat.color.copy(mix(L.day.edge, L.night.edge));
    const night = t > 0.5;
    if (this._envNight !== night) { this._envNight = night; this.scene.environment = night ? this.envNight : this.envDay; }
    this.scene.environmentIntensity = 1 - t * 0.5;
    if (this.windowMat) this.windowMat.opacity = Math.max(0, t * 1.3 - 0.15);
    if (this.water) this.water.material.color.copy(mix(0x1a2c3e, 0x04070c));
    if (this.mesaMat) this.mesaMat.color.copy(mix(0x9a9084, 0x14151a));
    for (const e of this.emissives) e.mat.color.copy(mix(e.colorDay, e.colorNight));
  }

  /* keep the shadow camera on the car */
  followSun(target) {
    const b = this.blend;
    this.sun.position.set(target.x - 300 + b * 480, 420 - b * 200, target.z + 260 - b * 520);
    this.sun.target.position.copy(target);
    this.sun.target.updateMatrixWorld();
  }

  /* the gantry's five lights: n lit, or -1 for all out */
  setStartLights(n) {
    if (!this.startBulbs) return;
    /* colour above 1 so the bloom catches it: set it, do not getHex() it */
    this.startBulbs.forEach((b, i) => {
      if (i < n) b.material.color.set(PALETTE.ember).multiplyScalar(2.4);
      else b.material.color.setHex(0x1a0c0a);
    });
  }
}
