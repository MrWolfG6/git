/* ═══════════════════════════════════════════════════════════
   THE POWERTRAIN, SEEN THROUGH THE BODY
   Built at runtime from the same PROTOS as the coachwork, so every
   part sits where that car's axles, track and floor actually are.

   Electric: a pack of modules under the floor, a motor per the
   drivetrain (quad: one per wheel; dual: one per axle; rear: one;
   in-wheel: in the hubs), inverters, half-shafts, and cables with
   energy running from the pack to each motor.

   Combustion: KESTREL's V8 behind the front axle with a transaxle;
   SEER's V6 twin-turbo behind the cockpit, a front motor and a
   hybrid cell. Cylinder heads light in firing order; pulses run the
   exhaust.

   Colours stay in the system: satin metals, bone light. No corona —
   the warm light is not spent on machinery.
   ═══════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { PROTOS } from './builder.js';

const BONE = 0xf2efe9;

function pulseTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,.45)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
}
let PULSE_TEX = null;

const kwOf = car => {
  const m = car.specs[0][1].match(/(\d+)\s*kW/);
  return m ? +m[1] : Math.round(car.drive.power * 0.7457);
};
/* pack sizes: OMEN's own figures, consistent with each car's range */
const PACK_KWH = { augur: 118, herald: 132, vigil: 124, corvid: 62, eclipse: 96, portent: 104 };

export function buildPowertrain(car, clip) {
  const P = PROTOS[car.proto];
  const g = new THREE.Group();
  g.name = 'powertrain';
  const mats = {
    metal: new THREE.MeshStandardMaterial({ color: 0x6a6d76, metalness: 0.9, roughness: 0.32 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x2a2c33, metalness: 0.7, roughness: 0.45 }),
    cell: new THREE.MeshStandardMaterial({ color: 0x3a3d46, metalness: 0.6, roughness: 0.4, emissive: BONE, emissiveIntensity: 0.04 }),
    cable: new THREE.MeshBasicMaterial({ color: BONE, transparent: true, opacity: 0.35 }),
    pulse: new THREE.SpriteMaterial({ map: PULSE_TEX ||= pulseTexture(), color: new THREE.Color(BONE).multiplyScalar(2), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
  };
  for (const m of Object.values(mats)) if (clip) m.clippingPlanes = [clip];

  const wheelR = Math.min(P.wheelR, P.archR - 0.035);
  const floor = P.rocker + 0.05;
  const anchors = [];        // { obj, label, value }
  const flows = [];          // { curve, sprites, speed }
  const heads = [];          // cylinder heads, lit in firing order
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); g.add(m); return m; };
  const anchor = (x, y, z, label, value) => {
    const o = new THREE.Object3D(); o.position.set(x, y, z); g.add(o);
    anchors.push({ obj: o, label, value });
  };
  const cable = (pts, pulses = 3, speed = 0.7) => {
    const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.011, 5), mats.cable));
    const sprites = [];
    for (let i = 0; i < pulses; i++) {
      const s = new THREE.Sprite(mats.pulse.clone());      // each pulse fades on its own
      s.scale.setScalar(0.09);
      g.add(s);
      sprites.push(s);
    }
    flows.push({ curve, sprites, speed });
  };
  /* a motor: a drum across the car (along z), with a bright end ring */
  const motor = (x, z, len = 0.32, r = 0.15) => {
    const m = add(new THREE.CylinderGeometry(r, r, len, 20), mats.metal, x, wheelR, z);
    m.rotation.x = Math.PI / 2;
    for (const s of [-1, 1]) {
      const ring = add(new THREE.TorusGeometry(r * 0.9, 0.008, 6, 28), mats.cable, x, wheelR, z + s * len / 2);
      ring.material = mats.cable;
    }
    return m;
  };
  const shaft = (x, z0, z1) => {
    const len = Math.abs(z1 - z0);
    const s = add(new THREE.CylinderGeometry(0.022, 0.022, len, 8), mats.dark, x, wheelR, (z0 + z1) / 2);
    s.rotation.x = Math.PI / 2;
  };
  const hub = P.trackZ - 0.1;

  const kind = car.drivetrain.toLowerCase();
  if (car.fuel === 'ev') {
    /* the pack: modules between the axles */
    const x0 = P.axleR + P.archR + 0.12, x1 = P.axleF - P.archR - 0.12;
    const len = x1 - x0, wid = Math.min(P.width - 0.34, 2 * (P.trackZ - 0.28));
    const nx = Math.max(4, Math.round(len / 0.3)), nz = 3;
    const cellGeo = new THREE.BoxGeometry(len / nx - 0.025, 0.1, wid / nz - 0.025);
    const cells = new THREE.InstancedMesh(cellGeo, mats.cell, nx * nz);
    const mtx = new THREE.Matrix4();
    let n = 0;
    for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) {
      mtx.makeTranslation(x0 + (i + 0.5) * len / nx, floor + 0.06, -wid / 2 + (k + 0.5) * wid / nz);
      cells.setMatrixAt(n++, mtx);
    }
    g.add(cells);
    add(new THREE.BoxGeometry(len + 0.06, 0.02, wid + 0.06), mats.dark, (x0 + x1) / 2, floor, 0);        // tray
    add(new THREE.BoxGeometry(len * 0.96, 0.006, 0.02), mats.cable, (x0 + x1) / 2, floor + 0.115, 0);     // the bus bar
    anchor((x0 + x1) / 2, floor + 0.12, wid * 0.25, 'Pack', `${PACK_KWH[car.id] || 100} kWh · 800 V`);

    const kw = kwOf(car);
    const motors = [];
    if (kind.includes('in-wheel')) {
      for (const ax of [P.axleF, P.axleR]) for (const s of [-1, 1]) {
        const m = add(new THREE.CylinderGeometry(wheelR * 0.52, wheelR * 0.52, 0.12, 22), mats.metal, ax, wheelR, s * (hub - 0.04));
        m.rotation.x = Math.PI / 2;
        motors.push([ax, s * (hub - 0.1)]);
      }
      anchor(P.axleF, wheelR + wheelR * 0.55, hub, 'Hub motor ×4', `${Math.round(kw / 4)} kW each`);
    } else if (kind.includes('quad')) {
      for (const ax of [P.axleF, P.axleR]) for (const s of [-1, 1]) {
        const z = s * 0.3;
        motor(ax, z, 0.28, 0.14);
        shaft(ax, s * 0.44, s * hub);
        motors.push([ax, z]);
      }
      anchor(P.axleF, wheelR + 0.18, 0.3, 'Motor ×4', `${Math.round(kw / 4)} kW each`);
    } else if (kind.includes('dual')) {
      for (const ax of [P.axleF, P.axleR]) { motor(ax, 0, 0.42, 0.16); shaft(ax, -hub, hub); motors.push([ax, 0]); }
      anchor(P.axleF, wheelR + 0.2, 0, 'Motor · front', `${Math.round(kw * 0.4)} kW`);
      anchor(P.axleR, wheelR + 0.2, 0, 'Motor · rear', `${Math.round(kw * 0.6)} kW`);
    } else {
      motor(P.axleR, 0, 0.46, 0.17); shaft(P.axleR, -hub, hub); motors.push([P.axleR, 0]);
      anchor(P.axleR, wheelR + 0.22, 0, 'Motor · rear', `${kw} kW`);
    }
    /* an inverter over each axle's motors, and energy from the pack to each motor */
    const axles = [...new Set(motors.map(m => m[0]))];
    for (const ax of axles) {
      const inward = ax > 0 ? -1 : 1;
      add(new THREE.BoxGeometry(0.24, 0.08, 0.34), mats.dark, ax + inward * 0.3, wheelR + 0.2, 0);
    }
    for (const [ax, z] of motors) {
      const inward = ax > 0 ? -1 : 1;
      const from = [ax > 0 ? x1 : x0, floor + 0.1, z * 0.4];
      cable([from, [ax + inward * 0.3, wheelR + 0.16, z * 0.5], [ax, wheelR + 0.02, z]], 2, 0.6 + Math.random() * 0.2);
    }
  } else {
    /* combustion: an engine, a gearbox, a way out for the exhaust */
    const v8 = kind.includes('v8');
    const perBank = v8 ? 4 : 3;
    const ex = v8 ? P.axleF - 0.78 : P.axleR + 0.95;                  // KESTREL front-mid, SEER mid
    const ey = wheelR + 0.1;
    const blockLen = perBank * 0.17 + 0.12;
    add(new THREE.BoxGeometry(blockLen, 0.26, 0.3), mats.metal, ex, ey, 0);
    for (const s of [-1, 1]) {
      const bank = add(new THREE.BoxGeometry(blockLen, 0.26, 0.12), mats.metal, ex, ey + 0.18, s * 0.15);
      bank.rotation.x = s * -0.62;
      for (let i = 0; i < perBank; i++) {
        const hm = new THREE.MeshStandardMaterial({ color: 0x44464e, metalness: 0.8, roughness: 0.35, emissive: BONE, emissiveIntensity: 0 });
        if (clip) hm.clippingPlanes = [clip];
        const h = add(new THREE.BoxGeometry(0.13, 0.05, 0.1), hm, ex - blockLen / 2 + 0.12 + i * 0.17, ey + 0.31, s * 0.26);
        h.rotation.x = s * -0.62;
        heads.push({ mesh: h, order: v8 ? [0, 7, 3, 4, 1, 6, 2, 5][heads.length] : [0, 3, 1, 4, 2, 5][heads.length] });
      }
    }
    add(new THREE.BoxGeometry(blockLen * 0.8, 0.08, 0.16), mats.dark, ex, ey + 0.36, 0);            // plenum
    anchor(ex, ey + 0.42, 0, v8 ? 'V8 · 4.0 NA' : 'V6 · 3.0 twin-turbo', v8 ? '620 hp · 9200 rpm' : '725 hp · 11 000 rpm');

    /* gearbox at the rear axle; KESTREL reaches it through a torque tube */
    const gx = v8 ? P.axleR + 0.05 : P.axleR - 0.18;
    add(new THREE.BoxGeometry(0.42, 0.26, 0.36), mats.dark, gx, wheelR, 0);
    if (v8) {
      const tubeLen = (ex - blockLen / 2) - (gx + 0.21);
      const tt = add(new THREE.CylinderGeometry(0.05, 0.05, tubeLen, 10), mats.dark, gx + 0.21 + tubeLen / 2, wheelR - 0.02, 0);
      tt.rotation.z = Math.PI / 2;
    }
    shaft(gx, -hub, hub);
    anchor(gx, wheelR + 0.2, 0, 'Gearbox', v8 ? '7-speed dog-ring' : '6-speed sequential');

    if (!v8) {
      /* turbos, the front motor and a hybrid cell */
      for (const s of [-1, 1]) {
        const t = add(new THREE.TorusGeometry(0.07, 0.035, 8, 16), mats.metal, ex - blockLen / 2 - 0.08, ey + 0.1, s * 0.28);
        t.rotation.y = Math.PI / 2;
      }
      motor(P.axleF, 0, 0.36, 0.14); shaft(P.axleF, -hub, hub);
      anchor(P.axleF, wheelR + 0.2, 0, 'Front motor', '160 kW');
      add(new THREE.BoxGeometry(0.5, 0.12, 0.5), mats.cell, -0.35, floor + 0.08, 0);
      cable([[-0.1, floor + 0.12, 0], [0.5, floor + 0.14, 0], [P.axleF, wheelR + 0.02, 0]], 3, 0.8);
    }
    /* the exhaust: from the heads to the tail, with pulses leaving */
    const tailX = Math.min(...PROTOS[car.proto].body.map(c => c[1])) + 0.05;
    for (const s of [-1, 1]) {
      const pts = [[ex, ey + 0.05, s * 0.3], [ex - blockLen / 2, P.rocker + 0.14, s * 0.3], [(ex + tailX) / 2, P.rocker + 0.12, s * 0.22], [tailX, P.rocker + 0.2, s * 0.09]];
      const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)));
      g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 30, 0.03, 8), mats.dark));
      const sprites = [];
      for (let i = 0; i < 3; i++) { const sp = new THREE.Sprite(mats.pulse.clone()); sp.scale.setScalar(0.08); g.add(sp); sprites.push(sp); }
      flows.push({ curve, sprites, speed: 0.9 });
    }
  }

  /* the part of the scene that moves: energy along cables, firing heads */
  function animate(t, x) {
    for (const f of flows) {
      f.sprites.forEach((s, i) => {
        const u = (t * f.speed + i / f.sprites.length) % 1;
        f.curve.getPointAt(u, s.position);
        s.material.opacity = x * Math.sin(u * Math.PI);
      });
    }
    if (heads.length) {
      const rate = 5;                                     // a slow, legible firing order
      const beat = (t * rate) % heads.length;
      for (const h of heads) {
        const d = (beat - h.order + heads.length) % heads.length;
        h.mesh.material.emissiveIntensity = x * 2.2 * Math.max(0, 1 - d / 1.2);
      }
    }
  }

  const all = [...Object.values(mats), ...heads.map(h => h.mesh.material)];
  return { group: g, anchors, animate, materials: all };
}
