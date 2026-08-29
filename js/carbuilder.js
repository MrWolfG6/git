/* ═══════════════════════════════════════════════════════════
   RUNTIME COACHWORK
   Eight silhouettes built from side profiles at load time.

   These are the cars the simulator drives. The showcase and the
   detail page show the real Sketchfab models; those live inside a
   sandboxed iframe and their geometry can never reach a physics
   loop, so the simulator needs bodies of its own.

   A profile is the upper outline only, drawn rear-to-front in
   metres. The builder closes the bottom itself: wheel arches at
   each axle joined by a rocker.
   ═══════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

/* ─────────────────────────── the protos ────────────────────── */
export const PROTOS = {

  /* long-bonnet three-box saloon, formal roof */
  limousine: {
    label: 'Saloon', width: 1.92, wheelR: 0.37, archR: 0.45,
    axleF: 1.66, axleR: -1.62, trackZ: 0.82, tyreW: 0.28,
    sill: 0.37, rocker: 0.24, bevel: 0.05,
    body: [
      ['M', -2.72, 0.44], ['Q', -2.82, 0.74, -2.68, 0.92], ['L', -2.05, 0.99],
      ['C', -1.20, 1.06, 0.70, 1.07, 1.52, 1.02],
      ['C', 2.06, 0.99, 2.46, 0.95, 2.66, 0.86],
      ['Q', 2.82, 0.72, 2.74, 0.44]
    ],
    house: [
      ['M', -2.10, 0.96], ['Q', -1.72, 1.06, -1.42, 1.42],
      ['C', -0.95, 1.54, 0.32, 1.54, 0.76, 1.40],
      ['Q', 1.12, 1.26, 1.60, 1.00], ['L', -2.10, 0.96]
    ],
    houseW: 1.62, grille: { x: 2.74, y: 0.68, w: 0.13, h: 0.46, d: 1.16, slats: 15, star: 0.16, rake: -0.12 },
    lamps: [[2.68, 0.86, 0.62, 0.11, 0.10, 0.42], [2.75, 0.75, 0.60, 0.05, 0.03, 0.36]],
    tail: [-2.76, 0.86, 0.10, 0.12, 1.52],
    extras: ['chrome-sill', 'exhaust-quad']
  },

  /* box-section off-roader: upright, flat glass, wide arches */
  offroader: {
    label: 'Off-roader', width: 2.02, wheelR: 0.44, archR: 0.53,
    axleF: 1.44, axleR: -1.42, trackZ: 0.86, tyreW: 0.34,
    sill: 0.46, rocker: 0.36, bevel: 0.035,
    body: [
      ['M', -2.44, 0.52], ['L', -2.48, 1.72], ['L', -2.10, 1.80],
      ['L', 0.42, 1.82], ['L', 0.56, 1.26], ['L', 2.28, 1.24],
      ['Q', 2.46, 1.20, 2.48, 1.02], ['L', 2.48, 0.52]
    ],
    house: [
      ['M', -2.04, 1.20], ['L', -2.04, 1.74], ['L', 0.38, 1.74],
      ['L', 0.52, 1.22], ['L', -2.04, 1.20]
    ],
    houseW: 1.80, grille: { x: 2.48, y: 0.90, w: 0.10, h: 0.40, d: 1.32, slats: 3, star: 0.20, rake: 0 },
    lamps: [[2.49, 1.12, 0.74, 0.12, 0.20, 0.22], [2.49, 0.70, 0.68, 0.09, 0.12, 0.24]],
    tail: [-2.50, 1.24, 0.10, 0.30, 1.62],
    extras: ['roof-rack', 'spare-wheel', 'side-exhaust', 'flares']
  },

  /* homologated GT racer: low, wide, swan-neck wing */
  gtracer: {
    label: 'GT racer', width: 2.05, wheelR: 0.35, archR: 0.44,
    axleF: 1.44, axleR: -1.34, trackZ: 0.90, tyreW: 0.36,
    sill: 0.34, rocker: 0.14, bevel: 0.04,
    body: [
      ['M', -2.30, 0.30], ['L', -2.34, 0.86], ['L', -1.78, 0.90],
      ['C', -1.10, 0.94, 0.44, 0.92, 1.16, 0.84],
      ['C', 1.76, 0.78, 2.26, 0.70, 2.48, 0.56],
      ['Q', 2.60, 0.44, 2.54, 0.26]
    ],
    house: [
      ['M', -1.72, 0.88], ['Q', -1.38, 0.98, -1.06, 1.24],
      ['C', -0.66, 1.34, 0.24, 1.32, 0.62, 1.18],
      ['Q', 0.94, 1.04, 1.30, 0.84], ['L', -1.72, 0.88]
    ],
    houseW: 1.60, grille: { x: 2.545, y: 0.42, w: 0.10, h: 0.26, d: 1.30, slats: 11, star: 0.12, rake: -0.28 },
    lamps: [[2.46, 0.63, 0.70, 0.09, 0.09, 0.34]],
    tail: [-2.36, 0.72, 0.08, 0.10, 1.60],
    extras: ['rear-wing', 'splitter', 'diffuser-race', 'canards', 'roof-scoop']
  },

  /* concept pod: one unbroken surface, wheels at the corners */
  concept: {
    label: 'Concept', width: 2.00, wheelR: 0.44, archR: 0.50,
    axleF: 1.56, axleR: -1.56, trackZ: 0.88, tyreW: 0.30,
    sill: 0.44, rocker: 0.30, bevel: 0.09,
    body: [
      ['M', -2.36, 0.48], ['C', -2.52, 0.86, -2.30, 1.16, -1.90, 1.24],
      ['C', -1.10, 1.40, 0.60, 1.42, 1.30, 1.24],
      ['C', 1.94, 1.08, 2.40, 0.92, 2.50, 0.70],
      ['Q', 2.58, 0.56, 2.46, 0.48]
    ],
    house: [
      ['M', -1.44, 1.16], ['Q', -1.00, 1.36, -0.50, 1.50],
      ['C', -0.10, 1.58, 0.50, 1.54, 0.86, 1.40],
      ['Q', 1.18, 1.26, 1.44, 1.10], ['L', -1.44, 1.16]
    ],
    houseW: 1.66, grille: null,
    lamps: [[2.47, 0.80, 0, 0.07, 0.05, 1.42]],
    tail: [-2.42, 1.02, 0.08, 0.06, 1.60],
    extras: ['glow-ring', 'bio-flaps', 'lightline']
  },

  /* open-wheel single seater */
  openwheel: {
    label: 'Formula 1', width: 0.86, wheelR: 0.36, archR: 0,
    axleF: 1.72, axleR: -1.66, trackZ: 0.88, tyreW: 0.38,
    sill: 0.24, rocker: 0.14, bevel: 0.035, arches: false,
    body: [
      ['M', -2.62, 0.16], ['L', -2.30, 0.52], ['L', -1.30, 0.58],
      ['C', -0.90, 0.86, -0.70, 0.92, -0.40, 0.90],
      ['L', 0.10, 0.72], ['C', 0.60, 0.66, 1.20, 0.54, 1.80, 0.42],
      ['L', 2.66, 0.30], ['Q', 2.86, 0.26, 2.84, 0.16]
    ],
    house: null, houseW: 0,
    grille: null, lamps: [], tail: [-2.60, 0.30, 0.10, 0.10, 0.34],
    extras: ['front-wing', 'rear-wing-f1', 'airbox', 'halo', 'sidepods', 'suspension-arms', 'floor']
  },

  /* cab-rearward long-tail hypercar */
  hypercar: {
    label: 'Hypercar', width: 1.98, wheelR: 0.36, archR: 0.44,
    axleF: 1.62, axleR: -1.40, trackZ: 0.86, tyreW: 0.34,
    sill: 0.34, rocker: 0.16, bevel: 0.055,
    body: [
      ['M', -2.66, 0.30], ['Q', -2.78, 0.60, -2.60, 0.78], ['L', -1.90, 0.84],
      ['C', -1.20, 0.90, 0.20, 0.88, 0.90, 0.80],
      ['C', 1.66, 0.72, 2.36, 0.62, 2.66, 0.46],
      ['Q', 2.82, 0.36, 2.72, 0.24]
    ],
    house: [
      ['M', -1.30, 0.84], ['Q', -1.02, 1.02, -0.72, 1.20],
      ['C', -0.36, 1.30, 0.24, 1.26, 0.58, 1.10],
      ['Q', 0.88, 0.96, 1.24, 0.78], ['L', -1.30, 0.84]
    ],
    houseW: 1.44, grille: { x: 2.74, y: 0.38, w: 0.10, h: 0.22, d: 1.10, slats: 9, star: 0.13, rake: -0.34 },
    lamps: [[2.62, 0.57, 0.66, 0.08, 0.07, 0.36]],
    tail: [-2.70, 0.66, 0.08, 0.09, 1.46],
    extras: ['active-wing', 'spine', 'diffuser-race', 'exhaust-centre']
  },

  /* eighties homologation saloon with the famous aerofoil */
  classic: {
    label: 'Saloon', width: 1.74, wheelR: 0.33, archR: 0.41,
    axleF: 1.30, axleR: -1.32, trackZ: 0.78, tyreW: 0.26,
    sill: 0.33, rocker: 0.22, bevel: 0.035,
    body: [
      ['M', -2.20, 0.42], ['L', -2.24, 0.92], ['L', -1.62, 0.96],
      ['L', 0.92, 0.98], ['L', 1.26, 0.94], ['L', 2.16, 0.92],
      ['Q', 2.32, 0.88, 2.30, 0.44]
    ],
    house: [
      ['M', -1.58, 0.94], ['L', -1.22, 1.36], ['L', 0.36, 1.38],
      ['L', 0.92, 0.96], ['L', -1.58, 0.94]
    ],
    houseW: 1.52, grille: { x: 2.28, y: 0.66, w: 0.10, h: 0.30, d: 1.06, slats: 5, star: 0.13, rake: -0.08 },
    lamps: [[2.27, 0.78, 0.60, 0.09, 0.16, 0.40]],
    tail: [-2.26, 0.72, 0.08, 0.20, 1.44],
    extras: ['evo-wing', 'box-flares', 'chrome-bumpers']
  },

  /* tall body, sloping coupé roofline */
  suvcoupe: {
    label: 'SUV coupé', width: 1.98, wheelR: 0.42, archR: 0.50,
    axleF: 1.52, axleR: -1.50, trackZ: 0.84, tyreW: 0.31,
    sill: 0.44, rocker: 0.30, bevel: 0.05,
    body: [
      ['M', -2.46, 0.52], ['Q', -2.56, 0.88, -2.40, 1.14], ['L', -1.90, 1.20],
      ['C', -1.10, 1.28, 0.60, 1.28, 1.36, 1.20],
      ['C', 1.94, 1.14, 2.36, 1.06, 2.54, 0.94],
      ['Q', 2.68, 0.80, 2.58, 0.52]
    ],
    house: [
      ['M', -1.96, 1.16], ['Q', -1.70, 1.30, -1.30, 1.66],
      ['C', -0.80, 1.80, 0.30, 1.78, 0.76, 1.58],
      ['Q', 1.10, 1.42, 1.50, 1.16], ['L', -1.96, 1.16]
    ],
    houseW: 1.68, grille: { x: 2.61, y: 0.76, w: 0.12, h: 0.44, d: 1.24, slats: 13, star: 0.17, rake: -0.16 },
    lamps: [[2.56, 0.93, 0.66, 0.10, 0.11, 0.42], [2.61, 0.82, 0.64, 0.05, 0.03, 0.38]],
    tail: [-2.50, 1.02, 0.09, 0.11, 1.56],
    extras: ['roof-rails', 'chrome-sill', 'exhaust-quad', 'skidplate']
  }
};

/* ─────────────────────── materials ─────────────────────────── */
export function makeMaterials(envIntensity = 1.3) {
  return {
    paint: new THREE.MeshPhysicalMaterial({
      color: 0x0a0a0c, metalness: 0.92, roughness: 0.16,
      clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: envIntensity
    }),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0x07090b, metalness: 0.3, roughness: 0.10,
      clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: envIntensity * 0.9
    }),
    chrome: new THREE.MeshStandardMaterial({
      color: 0xc9d1d9, metalness: 1, roughness: 0.10, envMapIntensity: envIntensity * 1.15
    }),
    darkChrome: new THREE.MeshStandardMaterial({
      color: 0x1d2126, metalness: 1, roughness: 0.22, envMapIntensity: envIntensity * 0.9
    }),
    carbon: new THREE.MeshStandardMaterial({
      color: 0x121417, metalness: 0.65, roughness: 0.34, envMapIntensity: envIntensity * 0.8
    }),
    trim: new THREE.MeshStandardMaterial({
      color: 0x0c0e10, metalness: 0.5, roughness: 0.5, envMapIntensity: envIntensity * 0.7
    }),
    tyre: new THREE.MeshStandardMaterial({
      color: 0x0b0b0c, metalness: 0, roughness: 0.88, envMapIntensity: 0.5
    }),
    head: new THREE.MeshStandardMaterial({
      color: 0xdfe9ff, emissive: 0xbcd6ff, emissiveIntensity: 1.6, metalness: 0.4, roughness: 0.12
    }),
    tail: new THREE.MeshStandardMaterial({
      color: 0x3a0b0e, emissive: 0xff1a1a, emissiveIntensity: 0.35, metalness: 0.2, roughness: 0.3
    }),
    glow: new THREE.MeshBasicMaterial({ color: 0x39c8ff })
  };
}

/* ─────────────────────── path → shape ──────────────────────── */
function traceProfile(cmds, shape) {
  for (const c of cmds) {
    if (c[0] === 'M') shape.moveTo(c[1], c[2]);
    else if (c[0] === 'L') shape.lineTo(c[1], c[2]);
    else if (c[0] === 'Q') shape.quadraticCurveTo(c[1], c[2], c[3], c[4]);
    else if (c[0] === 'C') shape.bezierCurveTo(c[1], c[2], c[3], c[4], c[5], c[6]);
  }
  return shape;
}

function extrude(shape, depth, bevel, quality) {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: bevel > 0,
    bevelThickness: bevel, bevelSize: bevel,
    bevelSegments: quality === 'low' ? 2 : 5,
    curveSegments: quality === 'low' ? 12 : 26
  });
  geo.translate(0, 0, -depth / 2);
  const merged = BufferGeometryUtils.mergeVertices(geo, 1e-4);
  const creased = BufferGeometryUtils.toCreasedNormals(merged, Math.PI / 5);
  geo.dispose();
  if (merged !== creased) merged.dispose();
  return creased;
}

/* the three-pointed star, extruded */
export function buildStar(radius, material) {
  const g = new THREE.Group();
  const opt = { depth: 0.09, bevelEnabled: true, bevelThickness: 0.018, bevelSize: 0.018, bevelSegments: 2, curveSegments: 40 };

  const ring = new THREE.Shape();
  ring.absarc(0, 0, 1, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, 0.87, 0, Math.PI * 2, true);
  ring.holes.push(hole);
  g.add(new THREE.Mesh(new THREE.ExtrudeGeometry(ring, opt), material));

  for (let i = 0; i < 3; i++) {
    const a = Math.PI / 2 + (i * Math.PI * 2) / 3;
    const dx = Math.cos(a), dy = Math.sin(a), nx = -dy, ny = dx;
    const s = new THREE.Shape();
    s.moveTo(nx * 0.085, ny * 0.085);
    s.lineTo(dx * 0.9 + nx * 0.052, dy * 0.9 + ny * 0.052);
    s.lineTo(dx * 0.9 - nx * 0.052, dy * 0.9 - ny * 0.052);
    s.lineTo(-nx * 0.085, -ny * 0.085);
    s.closePath();
    g.add(new THREE.Mesh(new THREE.ExtrudeGeometry(s, opt), material));
  }
  const hub = new THREE.Shape();
  hub.absarc(0, 0, 0.11, 0, Math.PI * 2, false);
  g.add(new THREE.Mesh(new THREE.ExtrudeGeometry(hub, opt), material));

  g.scale.setScalar(radius);
  return g;
}

/* ───────────────────────── wheels ──────────────────────────── */
function buildWheel(M, R, W, spokes, outward, quality, style) {
  const seg = quality === 'low' ? 16 : 34;
  const shoulder = Math.min(0.075, R * 0.2);
  const rimR = R - shoulder - 0.02;

  const hub = new THREE.Group();
  hub.name = 'wheel';
  const spin = new THREE.Group();
  spin.name = 'spin';
  hub.add(spin);

  const add = (geo, mat, z, rot) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.z = z;
    if (rot) m.rotation.x = Math.PI / 2;
    spin.add(m);
    return m;
  };

  add(new THREE.CylinderGeometry(R, R, W - shoulder * 2, seg, 1, true), M.tyre, 0, true).castShadow = true;
  add(new THREE.TorusGeometry(R - shoulder, shoulder, 10, seg), M.tyre, W / 2 - shoulder);
  add(new THREE.TorusGeometry(R - shoulder, shoulder, 10, seg), M.tyre, -(W / 2 - shoulder));
  add(new THREE.CylinderGeometry(rimR, rimR, W - 0.02, seg, 1, true), M.darkChrome, 0, true);

  const faceZ = outward * (W / 2 - 0.05);
  const rimMat = style === 'race' ? M.darkChrome : M.chrome;
  add(new THREE.CylinderGeometry(rimR, rimR - 0.02, 0.03, seg), M.darkChrome, faceZ, true);
  add(new THREE.TorusGeometry(rimR - 0.012, 0.016, 8, seg), rimMat, faceZ + outward * 0.012);

  const spokeGeo = new THREE.BoxGeometry(rimR * 0.13, rimR - 0.06, rimR * 0.14);
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2;
    const m = new THREE.Mesh(spokeGeo, rimMat);
    const rad = (rimR - 0.06) / 2 + 0.03;
    m.position.set(Math.cos(a) * rad, Math.sin(a) * rad, faceZ + outward * 0.016);
    m.rotation.z = a - Math.PI / 2;
    spin.add(m);
  }
  add(new THREE.CylinderGeometry(rimR * 0.2, rimR * 0.2, 0.035, 20), rimMat, faceZ + outward * 0.032, true);
  add(new THREE.CylinderGeometry(rimR - 0.05, rimR - 0.05, 0.025, seg), M.darkChrome, -outward * 0.03, true);

  const cal = new THREE.Mesh(new THREE.BoxGeometry(0.06, R * 0.5, 0.06), style === 'race' ? M.head : M.trim);
  cal.position.set(-R * 0.6, R * 0.28, -outward * 0.03);
  hub.add(cal);

  return hub;
}

/* Object3D.clone() JSON-copies userData, which severs every object
   reference in it (and throws outright on a circular one). So the
   parts of a car are found again by name after any clone. */
export function relink(model) {
  const wheels = [], headlights = [], paintMeshes = [];
  let taillight = null;
  model.traverse(o => {
    if (o.name === 'wheel') { o.spin = o.getObjectByName('spin'); wheels.push(o); }
    else if (o.name === 'headlight') headlights.push(o);
    else if (o.name === 'taillight') taillight = o;
    if (o.name === 'paintpart') paintMeshes.push(o);
  });
  model.parts = { wheels, headlights, taillight, paintMeshes };
  return model.parts;
}

/* ─────────────────────── the whole car ─────────────────────── */
export function buildCarModel(protoId, opts = {}) {
  const P = PROTOS[protoId] || PROTOS.limousine;
  const quality = opts.quality || 'high';
  const M = opts.materials || makeMaterials(opts.envIntensity);
  const wheelStyle = (protoId === 'gtracer' || protoId === 'openwheel') ? 'race' : 'road';

  const car = new THREE.Group();
  const shell = new THREE.Group();
  car.add(shell);
  const paintMeshes = [];

  const put = (geo, mat, x, y, z, paint) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    shell.add(m);
    if (paint) { paintMeshes.push(m); m.name = 'paintpart'; }
    return m;
  };

  /* ── the body ── */
  const shape = new THREE.Shape();
  traceProfile(P.body, shape);
  if (P.arches === false) {
    /* an open-wheeler has no arches: close the tub straight along the floor */
    const first = P.body[0];
    shape.lineTo(P.body[P.body.length - 1].slice(-2)[0], P.rocker);
    shape.lineTo(first[1], P.rocker);
    shape.lineTo(first[1], first[2]);
  } else {
    shape.lineTo(P.axleF + P.archR, P.sill);
    shape.absarc(P.axleF, P.sill, P.archR, 0, Math.PI, false);
    shape.lineTo(P.axleF - P.archR - 0.10, P.rocker);
    shape.lineTo(P.axleR + P.archR + 0.10, P.rocker);
    shape.lineTo(P.axleR + P.archR, P.sill);
    shape.absarc(P.axleR, P.sill, P.archR, 0, Math.PI, false);
    shape.lineTo(P.body[0][1], P.body[0][2]);
  }

  const bodyMesh = new THREE.Mesh(extrude(shape, P.width, P.bevel, quality), M.paint);
  bodyMesh.name = 'paintpart';
  bodyMesh.castShadow = bodyMesh.receiveShadow = true;
  shell.add(bodyMesh);
  paintMeshes.push(bodyMesh);

  /* ── greenhouse ── */
  if (P.house) {
    const h = new THREE.Shape();
    traceProfile(P.house, h);
    const glass = new THREE.Mesh(extrude(h, P.houseW, 0.02, quality), M.glass);
    glass.castShadow = true;
    shell.add(glass);
    const rim = new THREE.Mesh(extrude(h, P.houseW - 0.02, 0.01, quality), M.chrome);
    rim.scale.set(1.003, 1.005, 1);
    rim.position.y = -0.004;
    shell.add(rim);
  }

  /* ── the face ── */
  if (P.grille) {
    const G = P.grille;
    const grille = new THREE.Group();
    grille.position.set(G.x, G.y, 0);
    grille.rotation.z = G.rake;
    shell.add(grille);
    grille.add(new THREE.Mesh(new THREE.BoxGeometry(G.w, G.h, G.d), M.trim));
    for (let i = 0; i < G.slats; i++) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(G.w * 0.46, G.h * 0.86, G.d * 0.022), M.chrome);
      slat.position.set(G.w * 0.46, 0, -G.d * 0.44 + i * (G.d * 0.88 / Math.max(1, G.slats - 1)));
      grille.add(slat);
    }
    const badge = buildStar(G.star, M.chrome);
    badge.rotation.y = Math.PI / 2;
    badge.position.set(G.w * 0.9, 0.01, 0);
    grille.add(badge);
  }

  const headlights = [];
  for (const L of P.lamps) {
    const [x, y, z, dx, dy, dz] = L;
    const mk = (zz) => {
      const m = put(new THREE.BoxGeometry(dx, dy, dz), M.head, x, y, zz);
      m.name = 'headlight';
      headlights.push(m);
    };
    if (z === 0) mk(0); else { mk(z); mk(-z); }
  }
  const [tx, ty, tdx, tdy, tdz] = P.tail;
  const taillight = put(new THREE.BoxGeometry(tdx, tdy, tdz), M.tail, tx, ty, 0);
  taillight.name = 'taillight';

  /* ── the extras that give each car its character ── */
  const E = new Set(P.extras || []);
  const halfW = P.width / 2;

  if (E.has('chrome-sill')) put(new THREE.BoxGeometry((P.axleF - P.axleR) * 0.95, 0.05, P.width - 0.04), M.darkChrome, 0, P.rocker - 0.02, 0);
  if (E.has('skidplate')) put(new THREE.BoxGeometry(0.5, 0.05, P.width * 0.62), M.chrome, P.axleF + P.archR + 0.35, P.rocker + 0.02, 0);
  if (E.has('exhaust-quad')) for (const s of [-1, 1]) for (const o of [0, 0.2]) {
    const p = put(new THREE.CylinderGeometry(0.06, 0.06, 0.16, 14, 1, true), M.chrome, P.body[0][1] - 0.06, P.rocker + 0.10, s * (0.42 + o));
    p.rotation.z = Math.PI / 2;
  }
  if (E.has('exhaust-centre')) {
    const p = put(new THREE.CylinderGeometry(0.09, 0.09, 0.2, 16, 1, true), M.chrome, P.body[0][1] - 0.06, P.rocker + 0.14, 0);
    p.rotation.z = Math.PI / 2;
  }
  if (E.has('side-exhaust')) for (const s of [-1, 1]) {
    const p = put(new THREE.CylinderGeometry(0.055, 0.055, 1.5, 12, 1, true), M.chrome, -0.4, P.rocker + 0.06, s * (halfW + 0.03));
    p.rotation.z = Math.PI / 2;   // runs fore-aft along the sill, not across the car
  }
  if (E.has('flares') || E.has('box-flares')) for (const s of [-1, 1]) for (const ax of [P.axleF, P.axleR]) {
    /* the flare hugs the arch in the fore-aft plane — its axis is already Z */
    put(new THREE.TorusGeometry(P.archR - 0.02, 0.055, 8, 20, Math.PI), M.carbon, ax, P.sill, s * (halfW + 0.02));
  }
  if (E.has('roof-rack') || E.has('roof-rails')) for (const s of [-1, 1])
    put(new THREE.BoxGeometry((P.axleF - P.axleR) * 0.8, 0.05, 0.07), M.darkChrome, -0.2, P.house[1][2] + 0.06, s * (P.houseW / 2 - 0.12));
  if (E.has('spare-wheel')) {
    const w = buildWheel(M, P.wheelR * 0.92, 0.22, 5, 1, quality, 'road');
    w.position.set(P.body[0][1] - 0.24, 1.14, 0.12);
    w.rotation.y = Math.PI / 2;
    shell.add(w);
  }
  if (E.has('rear-wing') || E.has('active-wing') || E.has('evo-wing')) {
    const wingY = E.has('evo-wing') ? 1.30 : (E.has('active-wing') ? 1.00 : 1.24);
    const wingX = P.body[0][1] + 0.22;
    const span = E.has('evo-wing') ? P.width * 0.92 : P.width * 0.98;
    const plane = put(new THREE.BoxGeometry(0.42, 0.035, span), M.carbon, wingX, wingY, 0);
    plane.rotation.z = 0.16;
    for (const s of [-1, 1]) put(new THREE.BoxGeometry(0.10, wingY - P.body[0][2] - 0.1, 0.05), M.carbon, wingX + 0.06, (wingY + P.body[0][2]) / 2, s * span * 0.42);
    if (E.has('evo-wing')) for (const s of [-1, 1]) put(new THREE.BoxGeometry(0.24, 0.03, span * 0.5), M.carbon, wingX - 0.05, wingY - 0.16, s * span * 0.2);
  }
  if (E.has('splitter')) put(new THREE.BoxGeometry(0.5, 0.04, P.width + 0.06), M.carbon, P.axleF + P.archR + 0.5, P.rocker - 0.06, 0);
  if (E.has('canards')) for (const s of [-1, 1]) for (const i of [0, 1]) {
    const c = put(new THREE.BoxGeometry(0.22, 0.02, 0.16), M.carbon, P.axleF + P.archR + 0.36, 0.36 + i * 0.10, s * (halfW - 0.05));
    c.rotation.x = 0.3 * s;
  }
  if (E.has('diffuser-race')) {
    const d = put(new THREE.BoxGeometry(0.6, 0.16, P.width * 0.86), M.carbon, P.body[0][1] + 0.2, P.rocker - 0.02, 0);
    d.rotation.z = -0.22;
  }
  if (E.has('roof-scoop')) put(new THREE.BoxGeometry(0.7, 0.09, 0.24), M.carbon, -0.3, P.house[2][4] !== undefined ? 1.36 : 1.3, 0);
  if (E.has('spine')) put(new THREE.BoxGeometry(2.0, 0.05, 0.09), M.carbon, -0.9, P.body[3] ? 0.92 : 0.9, 0);
  if (E.has('chrome-bumpers')) for (const s of [1, -1])
    put(new THREE.BoxGeometry(0.14, 0.10, P.width - 0.06), M.chrome, s > 0 ? P.axleF + P.archR + 0.5 : P.body[0][1] - 0.02, P.rocker + 0.12, 0);

  /* concept lighting jewellery */
  if (E.has('glow-ring')) {
    const ring = put(new THREE.TorusGeometry(0.24, 0.018, 8, 40), M.glow, 0, 1.34, 0);
    ring.rotation.x = Math.PI / 2;
  }
  if (E.has('lightline')) for (const s of [-1, 1])
    put(new THREE.BoxGeometry(3.4, 0.02, 0.02), M.glow, -0.2, 0.72, s * (halfW + 0.01));
  if (E.has('bio-flaps')) for (let i = 0; i < 9; i++) for (const s of [-1, 1]) {
    const f = put(new THREE.BoxGeometry(0.22, 0.012, 0.16), M.carbon, -1.5 + i * 0.11, 1.24 - i * 0.02, s * (0.18 + i * 0.06));
    f.rotation.z = 0.4;
  }

  /* ── open-wheel architecture ── */
  if (protoId === 'openwheel') {
    put(new THREE.BoxGeometry(0.62, 0.03, 1.62), M.carbon, P.axleF + 0.86, 0.10, 0);                    // front wing
    for (const s of [-1, 1]) put(new THREE.BoxGeometry(0.16, 0.30, 0.03), M.carbon, P.axleF + 1.12, 0.22, s * 0.80);
    const rw = put(new THREE.BoxGeometry(0.46, 0.03, 1.05), M.carbon, P.axleR - 0.86, 0.86, 0);          // rear wing
    rw.rotation.z = 0.2;
    put(new THREE.BoxGeometry(0.4, 0.20, 1.0), M.carbon, P.axleR - 0.86, 0.66, 0);
    for (const s of [-1, 1]) put(new THREE.BoxGeometry(0.06, 0.42, 0.03), M.carbon, P.axleR - 0.86, 0.66, s * 0.5);
    const airbox = put(new THREE.BoxGeometry(0.42, 0.30, 0.26), M.paint, -0.85, 1.06, 0, true);          // airbox
    airbox.rotation.z = 0.1;
    put(new THREE.BoxGeometry(3.2, 0.03, 1.5), M.carbon, -0.2, 0.10, 0);                                 // floor
    for (const s of [-1, 1]) put(new THREE.BoxGeometry(1.5, 0.34, 0.34), M.paint, -0.35, 0.40, s * 0.62, true); // sidepods
    const halo = put(new THREE.TorusGeometry(0.34, 0.028, 8, 24, Math.PI), M.carbon, -0.28, 0.92, 0);     // halo
    halo.rotation.y = Math.PI / 2;
    put(new THREE.BoxGeometry(0.5, 0.03, 0.05), M.carbon, 0.1, 0.98, 0);
    for (const s of [-1, 1]) for (const ax of [P.axleF, P.axleR]) {                                      // suspension
      for (const dy of [-0.06, 0.14]) {
        const arm = put(new THREE.BoxGeometry(0.06, 0.03, 0.62), M.carbon, ax, P.wheelR + dy, s * 0.46);
        arm.rotation.x = s * 0.06;
      }
    }
  }

  /* ── wheels ── */
  const wheels = [];
  const spokes = wheelStyle === 'race' ? 5 : 10;
  for (const [x, z] of [[P.axleF, P.trackZ], [P.axleF, -P.trackZ], [P.axleR, P.trackZ], [P.axleR, -P.trackZ]]) {
    const w = buildWheel(M, P.wheelR, P.tyreW, spokes, Math.sign(z), quality, wheelStyle);
    w.position.set(x, P.wheelR, z);
    shell.add(w);
    wheels.push(w);
  }

  /* userData holds plain data only, so a clone survives the JSON copy;
     live object references live on `parts`, rebuilt by relink() */
  /* the windscreen base: the end point of the last curve in the
     greenhouse profile, which is where the glass meets the bonnet */
  const ws = P.house ? P.house[P.house.length - 2] : null;
  const seat = ws ? [ws[ws.length - 2], ws[ws.length - 1]] : [];
  const seatZ = Math.min(0.36, P.width * 0.19);

  car.materials = M;
  car.userData = {
    proto: protoId,
    dims: {
      wheelR: P.wheelR, axleF: P.axleF, axleR: P.axleR, trackZ: P.trackZ,
      width: P.width, wheelbase: P.axleF - P.axleR,
      length: (P.body[P.body.length - 1].slice(-2)[0] || 2.5) - P.body[0][1],
      /* Seats. There is no cabin interior to sit inside, so the driver
         and passenger cameras sit just behind the windscreen base and
         look out over the bonnet — a dash-cam, not a floating eye. */
      driver: seat[0] !== undefined ? [seat[0] - 0.42, seat[1] + 0.20, -seatZ] : [-0.25, 0.98, 0],
      passenger: seat[0] !== undefined ? [seat[0] - 0.42, seat[1] + 0.20, seatZ] : [-0.25, 0.98, 0.001],
      chase: [-6.2, 2.05, 0]
    }
  };
  relink(car);              // the same path a clone takes, so both agree
  return car;
}
