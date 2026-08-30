/* ═══════════════════════════════════════════════════════════
   THE WORLDS
   Three closed circuits described by a spline, dressed three
   different ways. Keeping them closed means the road, the AI
   pathing and the lap timing all share one piece of maths, and
   the driver can never reach an edge.
   ═══════════════════════════════════════════════════════════ */

import * as THREE from 'three';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

/* ── the three routes ───────────────────────────────────────── */
const ROUTES = {
  chicago: {
    width: 15, kerbs: false, lanes: 4, speedLimit: 200,
    points: [
      V(0,0,0), V(0,0,-260), V(20,0,-520), V(70,0,-720), V(180,0,-830),
      V(340,0,-860), V(470,0,-790), V(540,0,-620), V(560,0,-380),
      V(548,0,-120), V(500,0,110), V(390,0,250), V(220,0,300),
      V(60,0,255), V(-10,0,140)
    ]
  },
  vegas: {
    width: 18, kerbs: false, lanes: 4, speedLimit: 220,
    points: [
      V(0,0,0), V(0,0,-300), V(-40,0,-560), V(-140,0,-740), V(-320,0,-820),
      V(-520,0,-780), V(-640,0,-620), V(-660,0,-400), V(-620,0,-180),
      V(-500,0,-10), V(-330,0,80), V(-150,0,90), V(-40,0,50)
    ]
  },
  circuit: {
    width: 12, kerbs: true, lanes: 1, speedLimit: 340,
    points: [
      V(0,0,0), V(0,0,-420), V(30,0,-560), V(140,0,-620), V(250,0,-580),
      V(300,0,-460), V(280,0,-330), V(190,0,-270), V(120,0,-190),
      V(150,0,-70), V(280,0,-20), V(420,0,-40), V(520,0,-140),
      V(540,0,-290), V(470,0,-390), V(360,0,-370), V(330,0,-240),
      V(390,0,-120), V(430,0,60), V(360,0,190), V(210,0,240),
      V(60,0,215), V(-20,0,120)
    ]
  }
};

const PALETTE = {
  chicago: {
    day:   { sky: 0x9fc4e8, horizon: 0xd9e6f2, fog: 0xb9cfe4, fogD: 0.0016, sun: 0xfff4e2, sunI: 2.6, amb: 0x8fa9c4, ambI: 1.0, road: 0xffffff },
    night: { sky: 0x05070d, horizon: 0x141c2e, fog: 0x070a12, fogD: 0.0030, sun: 0x9bb6e8, sunI: 0.18, amb: 0x1a2436, ambI: 0.42, road: 0x6e747c }
  },
  vegas: {
    day:   { sky: 0x8fb6e0, horizon: 0xe9d9be, fog: 0xd8c8a8, fogD: 0.0014, sun: 0xfff0d0, sunI: 3.0, amb: 0xb09a78, ambI: 1.1, road: 0xfff6e8 },
    night: { sky: 0x06060c, horizon: 0x1d1226, fog: 0x0a0710, fogD: 0.0026, sun: 0xa090d0, sunI: 0.16, amb: 0x241a2e, ambI: 0.5, road: 0x6b6a72 }
  },
  circuit: {
    day:   { sky: 0x93bee6, horizon: 0xdbe9f5, fog: 0xbcd4e8, fogD: 0.0013, sun: 0xfff6e8, sunI: 3.2, amb: 0x9ab2cc, ambI: 1.15, road: 0xffffff },
    night: { sky: 0x04060b, horizon: 0x101827, fog: 0x06080f, fogD: 0.0022, sun: 0x8fa8d8, sunI: 0.2, amb: 0x18202e, ambI: 0.5, road: 0x70767e }
  }
};

export class World {
  constructor(id, quality = 'high') {
    this.id = ROUTES[id] ? id : 'chicago';
    this.quality = quality;
    this.def = ROUTES[this.id];
    this.night = false;
    this.blend = 0;                       // 0 day → 1 night
    this.group = new THREE.Group();
    this.emissives = [];                  // things that light up after dark
    this.curve = new THREE.CatmullRomCurve3(this.def.points, true, 'catmullrom', 0.5);
    this.length = this.curve.getLength();
    this.width = this.def.width;

    /* a lookup table so we can find our position along the lap cheaply */
    this.samples = Math.max(600, Math.round(this.length / 4));
    this.lut = [];
    for (let i = 0; i <= this.samples; i++) {
      const u = i / this.samples;
      this.lut.push(this.curve.getPointAt(u));
    }
  }

  /* position, direction and lateral axis at a point on the lap */
  frameAt(u) {
    u = ((u % 1) + 1) % 1;
    const pos = this.curve.getPointAt(u);
    const tan = this.curve.getTangentAt(u).normalize();
    const side = new THREE.Vector3().crossVectors(tan, new THREE.Vector3(0, 1, 0)).normalize();
    return { pos, tan, side };
  }

  /* how far along the lap a world position is, searched near a hint */
  progressNear(point, hintU = 0, span = 0.06) {
    let best = hintU, bestD = Infinity;
    const from = Math.round((hintU - span) * this.samples);
    const to = Math.round((hintU + span) * this.samples);
    for (let i = from; i <= to; i++) {
      const j = ((i % this.samples) + this.samples) % this.samples;
      const d = this.lut[j].distanceToSquared(point);
      if (d < bestD) { bestD = d; best = j / this.samples; }
    }
    return { u: best, dist: Math.sqrt(bestD) };
  }

  /* ─────────────────────────── build ─────────────────────── */
  build(scene, renderer) {
    this.scene = scene;
    scene.add(this.group);

    this.buildSky();
    this.buildIBL(renderer);
    this.buildGround();
    this.buildRoad();
    this.buildLights(renderer);
    if (this.id === 'circuit') this.buildCircuitDressing();
    else this.buildCityDressing();
    this.apply(0);
    return this;
  }

  buildSky() {
    const uniforms = {
      top:     { value: new THREE.Color(0x9fc4e8) },
      bottom:  { value: new THREE.Color(0xd9e6f2) },
      offset:  { value: 120 },
      exponent:{ value: 0.7 }
    };
    this.skyUniforms = uniforms;
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(3000, 32, 20),
      new THREE.ShaderMaterial({
        uniforms, side: THREE.BackSide, depthWrite: false,
        vertexShader: `varying vec3 vW; void main(){ vW = (modelMatrix*vec4(position,1.0)).xyz; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
        fragmentShader: `
          uniform vec3 top; uniform vec3 bottom; uniform float offset; uniform float exponent;
          varying vec3 vW;
          void main(){
            float h = normalize(vW + vec3(0.0, offset, 0.0)).y;
            gl_FragColor = vec4(mix(bottom, top, pow(max(h,0.0), exponent)), 1.0);
          }`
      })
    );
    sky.frustumCulled = false;
    this.group.add(sky);

    /* stars, faded in after dark */
    const n = this.quality === 'low' ? 500 : 1600;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(2400);
      v.y = Math.abs(v.y) * 0.9 + 60;
      pos.set([v.x, v.y, v.z], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.stars = new THREE.Points(g, new THREE.PointsMaterial({
      color: 0xffffff, size: 3.2, sizeAttenuation: false,
      transparent: true, opacity: 0, depthWrite: false
    }));
    this.stars.frustumCulled = false;
    this.group.add(this.stars);
  }

  /* A sky/ground gradient baked into an environment map. Without one,
     clearcoated metallic paint has nothing to reflect and reads black. */
  buildIBL(renderer) {
    const P = PALETTE[this.id];
    const make = (night) => {
      const p = night ? P.night : P.day;
      const c = document.createElement('canvas');
      c.width = 8; c.height = 128;
      const x = c.getContext('2d');
      const g = x.createLinearGradient(0, 0, 0, 128);
      const hex = v => '#' + v.toString(16).padStart(6, '0');
      g.addColorStop(0.00, hex(p.sky));
      g.addColorStop(0.46, hex(p.horizon));
      g.addColorStop(0.54, hex(night ? 0x0a0c10 : 0x6a6258));
      g.addColorStop(1.00, hex(night ? 0x040507 : 0x2a2620));
      x.fillStyle = g; x.fillRect(0, 0, 8, 128);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;

      const env = new THREE.Scene();
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(60, 24, 16),
        new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide })
      );
      env.add(dome);
      /* the sun, so there is something to catch a highlight on */
      const sunDisc = new THREE.Mesh(
        new THREE.SphereGeometry(5, 12, 8),
        new THREE.MeshBasicMaterial({ color: night ? 0x334466 : 0xffffff })
      );
      sunDisc.position.set(-34, 30, 26).multiplyScalar(night ? 0.6 : 1);
      env.add(sunDisc);

      const pmrem = new THREE.PMREMGenerator(renderer);
      const t = pmrem.fromScene(env, 0.03).texture;
      pmrem.dispose();
      dome.geometry.dispose(); dome.material.dispose();
      sunDisc.geometry.dispose(); sunDisc.material.dispose();
      return t;
    };
    this.envDay = make(false);
    this.envNight = make(true);
    this.scene.environment = this.envDay;
  }

  buildGround() {
    const mat = new THREE.MeshStandardMaterial({
      color: this.id === 'vegas' ? 0x4a3f30 : this.id === 'circuit' ? 0x24331f : 0x1b1e22,
      roughness: 1, metalness: 0
    });
    this.groundMat = mat;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), mat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.06;
    ground.receiveShadow = true;
    this.group.add(ground);

    /* Chicago gets the lake on the outside of the loop */
    if (this.id === 'chicago') {
      const water = new THREE.Mesh(
        new THREE.PlaneGeometry(2600, 2600),
        new THREE.MeshStandardMaterial({ color: 0x0d2233, roughness: 0.14, metalness: 0.8 })
      );
      water.rotation.x = -Math.PI / 2;
      water.position.set(1500, -0.04, -400);
      this.group.add(water);
      this.water = water;
    }
  }

  /* the road ribbon, its markings and (on the circuit) kerbs */
  buildRoad() {
    const N = this.quality === 'low' ? 480 : 900;
    const hw = this.width / 2;
    const pos = [], uv = [], idx = [];

    for (let i = 0; i <= N; i++) {
      const f = this.frameAt(i / N);
      const l = f.pos.clone().addScaledVector(f.side, -hw);
      const r = f.pos.clone().addScaledVector(f.side, hw);
      pos.push(l.x, 0.02, l.z, r.x, 0.02, r.z);
      const v = (i / N) * this.length / 8;
      uv.push(0, v, 1, v);
      if (i < N) {
        const a = i * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();

    const roadMat = new THREE.MeshStandardMaterial({
      map: this.roadTexture(), color: 0xffffff, roughness: 0.82, metalness: 0.02
    });
    this.roadMat = roadMat;
    const road = new THREE.Mesh(geo, roadMat);
    road.receiveShadow = true;
    this.group.add(road);

    /* verges — kerbs on the circuit, kerbstone shoulders in the cities */
    const edgeMat = new THREE.MeshStandardMaterial({ color: 0xd8dade, roughness: 0.7 });
    const kerbMat = new THREE.MeshStandardMaterial({ color: 0xd23a3a, roughness: 0.6 });
    const kerbMat2 = new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.6 });
    this.edgeMat = edgeMat;

    for (const s of [-1, 1]) {
      const ep = [], ei = [];
      for (let i = 0; i <= N; i++) {
        const f = this.frameAt(i / N);
        const a = f.pos.clone().addScaledVector(f.side, s * hw);
        const b = f.pos.clone().addScaledVector(f.side, s * (hw + (this.def.kerbs ? 1.5 : 0.45)));
        ep.push(a.x, 0.03, a.z, b.x, this.def.kerbs ? 0.09 : 0.035, b.z);
        if (i < N) { const k = i * 2; ei.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
      }
      const eg = new THREE.BufferGeometry();
      eg.setAttribute('position', new THREE.Float32BufferAttribute(ep, 3));
      eg.setIndex(ei);
      eg.computeVertexNormals();

      if (this.def.kerbs) {
        /* alternate red/white by splitting the strip into groups */
        eg.clearGroups();
        const per = 12;
        for (let i = 0; i < N; i++) eg.addGroup(i * 6, 6, Math.floor(i / per) % 2);
        this.group.add(new THREE.Mesh(eg, [kerbMat, kerbMat2]));
      } else {
        this.group.add(new THREE.Mesh(eg, edgeMat));
      }
    }
  }

  roadTexture() {
    const c = document.createElement('canvas');
    c.width = 128; c.height = 256;
    const x = c.getContext('2d');
    x.fillStyle = '#3a3d43'; x.fillRect(0, 0, 128, 256);
    /* asphalt grain */
    for (let i = 0; i < 2600; i++) {
      x.fillStyle = `rgba(255,255,255,${Math.random() * 0.045})`;
      x.fillRect(Math.random() * 128, Math.random() * 256, 1.4, 1.4);
    }
    if (this.def.lanes > 1) {
      x.strokeStyle = 'rgba(230,230,230,.55)';
      x.setLineDash([48, 44]); x.lineWidth = 3;
      for (let i = 1; i < this.def.lanes; i++) {
        const px = (i / this.def.lanes) * 128;
        x.beginPath(); x.moveTo(px, 0); x.lineTo(px, 256); x.stroke();
      }
    } else {
      x.strokeStyle = 'rgba(255,255,255,.5)';
      x.setLineDash([30, 60]); x.lineWidth = 2.5;
      x.beginPath(); x.moveTo(64, 0); x.lineTo(64, 256); x.stroke();
    }
    x.setLineDash([]);
    x.fillStyle = 'rgba(240,240,240,.8)';
    x.fillRect(2, 0, 3.5, 256); x.fillRect(122.5, 0, 3.5, 256);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1, 1);
    t.anisotropy = 8;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  buildLights(renderer) {
    const sun = new THREE.DirectionalLight(0xfff4e2, 2.6);
    sun.position.set(-320, 420, 260);
    if (this.quality !== 'low') {
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      const s = 60;
      Object.assign(sun.shadow.camera, { near: 10, far: 900, left: -s, right: s, top: s, bottom: -s });
      sun.shadow.camera.updateProjectionMatrix();
      sun.shadow.bias = -0.0009;
      sun.shadow.normalBias = 0.05;
    }
    this.scene.add(sun);
    this.scene.add(sun.target);
    this.sun = sun;

    this.hemi = new THREE.HemisphereLight(0xbcd4ea, 0x2a2620, 1.0);
    this.scene.add(this.hemi);
  }

  /* ── city dressing: towers, neon, lamps, palms ───────────── */
  buildCityDressing() {
    const vegas = this.id === 'vegas';
    const towers = this.quality === 'low' ? 90 : 190;
    const hw = this.width / 2;

    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: vegas ? 0x1a1620 : 0x14171c, roughness: 0.85, metalness: 0.15
    });
    const winMat = new THREE.MeshBasicMaterial({ map: this.windowTexture(vegas), transparent: true, opacity: 0 });
    this.windowMat = winMat;

    const bodies = new THREE.InstancedMesh(boxGeo, bodyMat, towers);
    const wins = new THREE.InstancedMesh(boxGeo, winMat, towers);
    bodies.castShadow = bodies.receiveShadow = this.quality !== 'low';
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3();

    for (let i = 0; i < towers; i++) {
      const u = i / towers + (Math.random() - 0.5) * 0.004;
      const f = this.frameAt(u);
      const side = Math.random() < 0.5 ? -1 : 1;
      /* Chicago keeps the lake side clear */
      const s = (this.id === 'chicago' && side > 0 && Math.random() < 0.72) ? -1 : side;
      const off = hw + 14 + Math.random() * 70;
      const h = vegas ? 18 + Math.pow(Math.random(), 2) * 120 : 26 + Math.pow(Math.random(), 1.7) * 190;
      const w = 14 + Math.random() * 26, d = 14 + Math.random() * 26;
      p.copy(f.pos).addScaledVector(f.side, s * off);
      p.y = h / 2;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(f.tan.x, f.tan.z) + (Math.random() - 0.5) * 0.3);
      sc.set(w, h, d);
      m.compose(p, q, sc);
      bodies.setMatrixAt(i, m);
      sc.set(w * 1.002, h * 0.995, d * 1.002);
      m.compose(p, q, sc);
      wins.setMatrixAt(i, m);
    }
    bodies.instanceMatrix.needsUpdate = true;
    wins.instanceMatrix.needsUpdate = true;
    this.group.add(bodies, wins);

    /* street lighting down both verges */
    const lampCount = this.quality === 'low' ? 60 : 140;
    const poleGeo = new THREE.CylinderGeometry(0.16, 0.2, 9, 6);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x1a1d21, roughness: 0.6, metalness: 0.6 });
    const headGeo = new THREE.BoxGeometry(2.2, 0.3, 0.8);
    const headMat = new THREE.MeshBasicMaterial({ color: 0xffd9a0 });
    this.lampMat = headMat;
    headMat.color.setHex(0x2a2620);

    const poles = new THREE.InstancedMesh(poleGeo, poleMat, lampCount);
    const heads = new THREE.InstancedMesh(headGeo, headMat, lampCount);
    for (let i = 0; i < lampCount; i++) {
      const f = this.frameAt(i / lampCount);
      const s = i % 2 ? 1 : -1;
      p.copy(f.pos).addScaledVector(f.side, s * (hw + 2.4));
      const yaw = Math.atan2(f.tan.x, f.tan.z);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
      m.compose(p.clone().setY(4.5), q, sc.set(1, 1, 1));
      poles.setMatrixAt(i, m);
      m.compose(p.clone().setY(9).addScaledVector(f.side, -s * 1.1), q, sc.set(1, 1, 1));
      heads.setMatrixAt(i, m);
    }
    poles.instanceMatrix.needsUpdate = true;
    heads.instanceMatrix.needsUpdate = true;
    this.group.add(poles, heads);

    this.buildOverpasses();
    if (vegas) this.buildNeon();
    if (vegas) this.buildPalms();
  }

  /* bridges over the road, and the odd sign gantry — the things that
     give a straight any sense of passing scale */
  buildOverpasses() {
    const hw = this.width / 2;
    const deck = new THREE.MeshStandardMaterial({ color: 0x191c20, roughness: 0.9, metalness: 0.1 });
    const pier = new THREE.MeshStandardMaterial({ color: 0x22262b, roughness: 0.95 });
    const signFace = new THREE.MeshStandardMaterial({ color: 0x123a22, roughness: 0.8 });

    const spots = this.quality === 'low' ? [0.16, 0.58] : [0.09, 0.30, 0.52, 0.74, 0.90];
    spots.forEach((u, i) => {
      const f = this.frameAt(u);
      const yaw = Math.atan2(f.tan.x, f.tan.z);

      if (i % 2 === 0) {
        /* a bridge */
        const g = new THREE.Group();
        g.position.copy(f.pos).setY(0);
        g.rotation.y = yaw;
        const span = new THREE.Mesh(new THREE.BoxGeometry(9, 1.1, this.width + 34), deck);
        span.position.y = 7.4;
        span.castShadow = this.quality !== 'low';
        g.add(span);
        const rail = new THREE.Mesh(new THREE.BoxGeometry(9, 0.9, 0.3), deck);
        for (const s of [-1, 1]) {
          const r = rail.clone();
          r.position.set(0, 8.4, s * (this.width / 2 + 17));
          g.add(r);
        }
        for (const s of [-1, 1]) {
          const p = new THREE.Mesh(new THREE.BoxGeometry(7, 7.4, 3.4), pier);
          p.position.set(0, 3.7, s * (hw + 6));
          p.castShadow = p.receiveShadow = this.quality !== 'low';
          g.add(p);
        }
        this.group.add(g);
      } else {
        /* a sign gantry */
        const g = new THREE.Group();
        g.position.copy(f.pos).setY(0);
        g.rotation.y = yaw;
        for (const s of [-1, 1]) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 7.2, 8), pier);
          leg.position.set(0, 3.6, s * (hw + 1.4));
          g.add(leg);
        }
        const beam = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, this.width + 3), pier);
        beam.position.y = 7.2;
        g.add(beam);
        const board = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.4, this.width * 0.62), signFace);
        board.position.set(0.2, 5.9, 0);
        g.add(board);
        this.group.add(g);
        this.emissives.push({ mat: signFace, day: 1, night: 1, colorDay: 0x123a22, colorNight: 0x0d2b19 });
      }
    });
  }

  windowTexture(vegas) {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const x = c.getContext('2d');
    x.clearRect(0, 0, 128, 128);
    for (let gy = 0; gy < 22; gy++) {
      for (let gx = 0; gx < 12; gx++) {
        if (Math.random() < 0.42) continue;
        const warm = Math.random();
        x.fillStyle = vegas
          ? `hsla(${Math.random() * 360},85%,${58 + Math.random() * 20}%,${0.5 + Math.random() * 0.5})`
          : `rgba(255,${205 + warm * 45},${150 + warm * 70},${0.45 + Math.random() * 0.5})`;
        x.fillRect(gx * 10 + 3, gy * 5.6 + 1.6, 5.5, 3);
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(3, 6);
    return t;
  }

  buildNeon() {
    const hw = this.width / 2;
    const hues = [0xff2d78, 0x18e0ff, 0xffd400, 0x8a2be2, 0x2bff88, 0xff6a00];
    const n = this.quality === 'low' ? 26 : 60;
    for (let i = 0; i < n; i++) {
      const f = this.frameAt(i / n + 0.004);
      const s = i % 2 ? 1 : -1;
      const col = hues[i % hues.length];
      const w = 6 + Math.random() * 12, h = 3 + Math.random() * 14;
      const mat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.25 });
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
      const p = f.pos.clone().addScaledVector(f.side, s * (hw + 11));
      p.y = 6 + Math.random() * 22;
      sign.position.copy(p);
      sign.lookAt(f.pos.clone().setY(p.y));
      this.group.add(sign);
      this.emissives.push({ mat, day: 0.18, night: 1 });

      const glow = new THREE.PointLight(col, 0, 42, 2);
      glow.position.copy(p);
      this.group.add(glow);
      this.emissives.push({ light: glow, day: 0, night: 26 });
    }
  }

  buildPalms() {
    const hw = this.width / 2;
    const n = this.quality === 'low' ? 40 : 110;
    const trunk = new THREE.CylinderGeometry(0.22, 0.34, 9, 6);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3d3226, roughness: 1 });
    const frond = new THREE.ConeGeometry(0.5, 4.2, 4, 1, true);
    const frondMat = new THREE.MeshStandardMaterial({ color: 0x2f4a26, roughness: 1, side: THREE.DoubleSide });
    const trunks = new THREE.InstancedMesh(trunk, trunkMat, n);
    const fronds = new THREE.InstancedMesh(frond, frondMat, n * 5);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
    let fi = 0;
    for (let i = 0; i < n; i++) {
      const f = this.frameAt(i / n + 0.5 / n);
      const s = i % 2 ? 1 : -1;
      p.copy(f.pos).addScaledVector(f.side, s * (hw + 5.5));
      m.compose(p.clone().setY(4.5), new THREE.Quaternion(), sc);
      trunks.setMatrixAt(i, m);
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        q.setFromEuler(new THREE.Euler(Math.cos(a) * 0.9, a, Math.sin(a) * 0.9));
        m.compose(p.clone().setY(9.6), q, sc);
        fronds.setMatrixAt(fi++, m);
      }
    }
    trunks.instanceMatrix.needsUpdate = true;
    fronds.instanceMatrix.needsUpdate = true;
    this.group.add(trunks, fronds);
  }

  /* ── circuit dressing: grandstands, barriers, gantry ─────── */
  buildCircuitDressing() {
    const hw = this.width / 2;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();

    /* armco both sides */
    const n = this.quality === 'low' ? 200 : 460;
    const barGeo = new THREE.BoxGeometry(0.28, 0.85, this.length / n + 1.2);
    const barMat = new THREE.MeshStandardMaterial({ color: 0xd6d9dd, roughness: 0.55, metalness: 0.5 });
    const bars = new THREE.InstancedMesh(barGeo, barMat, n * 2);
    let bi = 0;
    for (let i = 0; i < n; i++) {
      const f = this.frameAt(i / n);
      const yaw = Math.atan2(f.tan.x, f.tan.z);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
      for (const s of [-1, 1]) {
        p.copy(f.pos).addScaledVector(f.side, s * (hw + 3.2)).setY(0.55);
        m.compose(p, q, sc);
        bars.setMatrixAt(bi++, m);
      }
    }
    bars.instanceMatrix.needsUpdate = true;
    this.group.add(bars);

    /* grandstands on the long straights */
    const standMat = new THREE.MeshStandardMaterial({ color: 0x1b2027, roughness: 0.9 });
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x2b3a4d, roughness: 1 });
    for (const u of [0.02, 0.30, 0.62, 0.85]) {
      const f = this.frameAt(u);
      const yaw = Math.atan2(f.tan.x, f.tan.z);
      const g = new THREE.Group();
      g.position.copy(f.pos).addScaledVector(f.side, -(hw + 20)).setY(0);
      g.rotation.y = yaw;
      const base = new THREE.Mesh(new THREE.BoxGeometry(26, 9, 90), standMat);
      base.position.y = 4.5;
      base.castShadow = base.receiveShadow = this.quality !== 'low';
      g.add(base);
      const seats = new THREE.Mesh(new THREE.BoxGeometry(20, 0.6, 84), seatMat);
      seats.position.set(2, 9.3, 0);
      seats.rotation.z = 0.28;
      g.add(seats);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(28, 0.5, 94), standMat);
      roof.position.set(-1, 15, 0);
      g.add(roof);
      this.group.add(g);
    }

    /* start / finish gantry and line */
    const f0 = this.frameAt(0.001);
    const gantry = new THREE.Group();
    gantry.position.copy(f0.pos).setY(0);
    gantry.rotation.y = Math.atan2(f0.tan.x, f0.tan.z);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x15181c, roughness: 0.6, metalness: 0.7 });
    for (const s of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.8, 9, 0.8), legMat);
      leg.position.set(s * (hw + 1.6), 4.5, 0);
      gantry.add(leg);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(this.width + 5, 1.6, 1.1), legMat);
    beam.position.y = 9.4;
    gantry.add(beam);
    const lights = new THREE.Mesh(new THREE.BoxGeometry(6, 0.9, 0.3),
      new THREE.MeshBasicMaterial({ color: 0xff2020 }));
    lights.position.set(0, 8.4, 0.7);
    gantry.add(lights);
    this.startLights = lights;
    this.group.add(gantry);

    /* the line itself */
    const lineTex = document.createElement('canvas');
    lineTex.width = lineTex.height = 64;
    const lx = lineTex.getContext('2d');
    for (let a = 0; a < 8; a++) for (let b = 0; b < 8; b++) {
      lx.fillStyle = (a + b) % 2 ? '#fff' : '#111';
      lx.fillRect(a * 8, b * 8, 8, 8);
    }
    const line = new THREE.Mesh(
      new THREE.PlaneGeometry(this.width, 3),
      new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(lineTex), roughness: 0.8 })
    );
    line.rotation.x = -Math.PI / 2;
    line.rotation.z = Math.atan2(f0.tan.x, f0.tan.z);
    line.position.copy(f0.pos).setY(0.035);
    this.group.add(line);

    /* floodlights, for the night race */
    for (let i = 0; i < 10; i++) {
      const f = this.frameAt(i / 10 + 0.01);
      const pos = f.pos.clone().addScaledVector(f.side, (i % 2 ? 1 : -1) * (hw + 12)).setY(0);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.45, 24, 6), legMat);
      mast.position.copy(pos).setY(12);
      this.group.add(mast);
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(4, 1.2, 1),
        new THREE.MeshBasicMaterial({ color: 0x1a1c20 }));
      lamp.position.copy(pos).setY(23.6);
      this.group.add(lamp);
      this.emissives.push({ mat: lamp.material, day: 0, night: 1, colorDay: 0x1a1c20, colorNight: 0xdff0ff });
      const pl = new THREE.PointLight(0xdff0ff, 0, 120, 2);
      pl.position.copy(pos).setY(23);
      this.group.add(pl);
      this.emissives.push({ light: pl, day: 0, night: 60 });
    }
  }

  /* ── time of day ────────────────────────────────────────── */
  setNight(on) { this.night = on; }

  /* t is the blend, 0 day → 1 night */
  apply(t) {
    this.blend = t;
    const P = PALETTE[this.id];
    const lerpC = (a, b) => new THREE.Color(a).lerp(new THREE.Color(b), t);

    this.skyUniforms.top.value.copy(lerpC(P.day.sky, P.night.sky));
    this.skyUniforms.bottom.value.copy(lerpC(P.day.horizon, P.night.horizon));
    this.stars.material.opacity = Math.max(0, t * 1.25 - 0.25);

    if (!this.scene.fog) this.scene.fog = new THREE.FogExp2(0x000000, 0.002);
    this.scene.fog.color.copy(lerpC(P.day.fog, P.night.fog));
    this.scene.fog.density = P.day.fogD + (P.night.fogD - P.day.fogD) * t;

    this.sun.color.copy(lerpC(P.day.sun, P.night.sun));
    this.sun.intensity = P.day.sunI + (P.night.sunI - P.day.sunI) * t;
    this.sun.position.set(-320 + t * 480, 420 - t * 210, 260 - t * 520);
    this.hemi.intensity = P.day.ambI + (P.night.ambI - P.day.ambI) * t;
    this.hemi.color.copy(lerpC(P.day.amb, P.night.amb));

    this.roadMat.color.copy(lerpC(P.day.road, P.night.road));

    /* swap the baked environment across the middle of the transition */
    const wantNight = t > 0.5;
    if (this.envDay && this._envIsNight !== wantNight) {
      this._envIsNight = wantNight;
      this.scene.environment = wantNight ? this.envNight : this.envDay;
    }
    this.scene.environmentIntensity = 1 - t * 0.55;
    if (this.groundMat) this.groundMat.color.copy(
      lerpC(this.id === 'vegas' ? 0x4a3f30 : this.id === 'circuit' ? 0x24331f : 0x1b1e22,
            this.id === 'vegas' ? 0x14100c : this.id === 'circuit' ? 0x0b110a : 0x0a0c0e));
    if (this.edgeMat) this.edgeMat.color.copy(lerpC(0xd8dade, 0x6a7076));

    if (this.windowMat) this.windowMat.opacity = Math.max(0, t * 1.3 - 0.15);
    if (this.lampMat) this.lampMat.color.copy(lerpC(0x2a2620, 0xffd9a0));

    for (const e of this.emissives) {
      if (e.light) e.light.intensity = e.day + (e.night - e.day) * t;
      else if (e.mat) {
        e.mat.opacity = e.day + (e.night - e.day) * t;
        if (e.colorDay !== undefined) e.mat.color.copy(lerpC(e.colorDay, e.colorNight));
      }
    }
    if (this.water) this.water.material.color.copy(lerpC(0x0d2233, 0x03080e));
  }

  /* keep the shadow camera with the car */
  followSun(target) {
    this.sun.position.set(target.x - 320 + this.blend * 480, 420 - this.blend * 210, target.z + 260 - this.blend * 520);
    this.sun.target.position.copy(target);
    this.sun.target.updateMatrixWorld();
  }
}
