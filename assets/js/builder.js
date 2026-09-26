/* ═══════════════════════════════════════════════════════════
   COACHWORK
   Every OMEN is a side profile, extruded.

   A profile is the upper outline only, drawn rear-to-front in
   metres, x forward, y up. The builder closes the bottom itself:
   a wheel arch at each axle joined by a rocker. The outline is
   extruded across the width, bevelled, and given creased normals
   so the panels read as one surface rather than a stack of facets.

   One builder, eight PROTOS, eight silhouettes.
   ═══════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { markGeometry, PALETTE } from './brand.js';

/* ─────────────────────────── the protos ────────────────────── */
/* lampY / tailY / badgeY are heights; the builder finds the x on the
   curve at that height, so nothing is mounted on a guess */
export const PROTOS = {

  /* four-door fastback: long, low roof falling all the way to the tail */
  augur: {
    width: 1.98, wheelR: 0.37, archR: 0.42, axleF: 1.62, axleR: -1.43,
    trackZ: 0.84, tyreW: 0.29, sill: 0.36, rocker: 0.20, bevel: 0.045,
    body: [
      ['M', -2.52, 0.32], ['Q', -2.62, 0.66, -2.46, 0.86], ['L', -2.10, 0.93],
      ['C', -1.20, 0.99, 0.60, 0.99, 1.40, 0.91],
      ['C', 2.00, 0.87, 2.42, 0.77, 2.56, 0.58], ['Q', 2.62, 0.44, 2.56, 0.30]
    ],
    house: [
      ['M', -2.24, 0.91], ['Q', -1.30, 1.18, -0.62, 1.39],
      ['C', -0.20, 1.46, 0.30, 1.45, 0.60, 1.36], ['Q', 1.00, 1.14, 1.46, 0.90], ['L', -2.24, 0.91]
    ],
    houseW: 1.58, lampY: 0.70, tailY: 0.84, badgeY: 0.56,
    wheel: 'aero', extras: ['blade', 'diffuser']
  },

  /* grand tourer as a shooting brake: long bonnet, a roof that runs
     flat to a chopped tail — 900 km of luggage space */
  herald: {
    width: 1.96, wheelR: 0.36, archR: 0.41, axleF: 1.70, axleR: -1.26,
    trackZ: 0.83, tyreW: 0.29, sill: 0.35, rocker: 0.18, bevel: 0.045,
    body: [
      ['M', -2.26, 0.32], ['L', -2.34, 0.88], ['L', -2.22, 0.94],
      ['C', -1.00, 0.98, 0.90, 0.97, 1.80, 0.90],
      ['C', 2.30, 0.86, 2.55, 0.72, 2.64, 0.54], ['Q', 2.68, 0.40, 2.60, 0.28]
    ],
    house: [
      ['M', -2.28, 0.92], ['L', -2.18, 1.30], ['L', -1.90, 1.34],
      ['C', -1.00, 1.36, -0.30, 1.35, 0.05, 1.28], ['Q', 0.45, 1.12, 0.88, 0.92], ['L', -2.28, 0.92]
    ],
    houseW: 1.52, lampY: 0.72, tailY: 0.82, badgeY: 0.56,
    wheel: 'spoke', extras: ['blade', 'vents', 'roof-rack']
  },

  /* off-roader: tall chamfered slab, upright glass, big tyres */
  vigil: {
    width: 2.04, wheelR: 0.43, archR: 0.51, axleF: 1.48, axleR: -1.46,
    trackZ: 0.87, tyreW: 0.34, sill: 0.50, rocker: 0.40, bevel: 0.04,
    body: [
      ['M', -2.30, 0.50], ['L', -2.36, 1.18], ['L', -2.22, 1.30], ['L', 1.30, 1.31],
      ['L', 2.22, 1.17], ['L', 2.36, 0.98], ['L', 2.36, 0.50]
    ],
    house: [
      ['M', -2.26, 1.27], ['L', -2.20, 1.84], ['L', 0.28, 1.86], ['L', 0.96, 1.29], ['L', -2.26, 1.27]
    ],
    houseW: 1.80, lampY: 1.08, tailY: 1.10, badgeY: 0.86,
    sculpt: { taperF: 0.05, taperR: 0.03, tumble: 0.03, houseTumble: 0.08 },
    wheel: 'terrain', extras: ['cladding', 'roof-rack', 'skid', 'flares']
  },

  /* coupé: short, tall-shouldered, bubble cabin, ducktail */
  corvid: {
    width: 1.90, wheelR: 0.34, archR: 0.39, axleF: 1.30, axleR: -1.20,
    trackZ: 0.80, tyreW: 0.28, sill: 0.34, rocker: 0.17, bevel: 0.05,
    body: [
      ['M', -2.00, 0.30], ['Q', -2.10, 0.62, -1.98, 0.82], ['L', -1.80, 0.91],
      ['C', -1.20, 0.90, 0.40, 0.93, 1.30, 0.87],
      ['C', 1.80, 0.82, 2.14, 0.66, 2.24, 0.48], ['Q', 2.30, 0.36, 2.22, 0.27]
    ],
    house: [
      ['M', -1.76, 0.88], ['C', -1.30, 1.02, -0.90, 1.24, -0.50, 1.27],
      ['C', 0.00, 1.31, 0.30, 1.21, 0.55, 1.07], ['Q', 0.80, 0.95, 1.05, 0.88], ['L', -1.76, 0.88]
    ],
    houseW: 1.40, lampY: 0.66, tailY: 0.80, badgeY: 0.52,
    wheel: 'spoke', extras: ['blade']
  },

  /* hypercar: cab-forward, very low, long tail with a fin */
  eclipse: {
    width: 2.04, wheelR: 0.35, archR: 0.39, axleF: 1.50, axleR: -1.35,
    trackZ: 0.88, tyreW: 0.34, sill: 0.28, rocker: 0.11, bevel: 0.05,
    body: [
      ['M', -2.45, 0.28], ['L', -2.52, 0.76], ['L', -2.30, 0.83],
      ['C', -1.20, 0.87, 0.20, 0.87, 1.10, 0.85],
      ['C', 1.70, 0.83, 2.15, 0.62, 2.30, 0.40], ['Q', 2.34, 0.26, 2.24, 0.19]
    ],
    house: [
      ['M', -1.10, 0.85], ['Q', -0.60, 1.03, -0.30, 1.12],
      ['C', 0.00, 1.16, 0.40, 1.12, 0.70, 1.02], ['Q', 0.95, 0.92, 1.25, 0.84], ['L', -1.10, 0.85]
    ],
    houseW: 1.30, lampY: 0.52, tailY: 0.70, badgeY: 0.40,
    wheel: 'race', extras: ['fin', 'wing-low', 'diffuser', 'intake', 'canards']
  },

  /* concept: one unbroken pod, a glass canopy the length of the cabin */
  portent: {
    width: 2.00, wheelR: 0.40, archR: 0.44, axleF: 1.62, axleR: -1.62,
    trackZ: 0.86, tyreW: 0.30, sill: 0.42, rocker: 0.26, bevel: 0.08,
    body: [
      ['M', -2.20, 0.42], ['C', -2.36, 0.80, -2.20, 1.04, -1.80, 1.08],
      ['C', -1.00, 1.15, 0.80, 1.15, 1.60, 1.08],
      ['C', 2.10, 0.98, 2.34, 0.80, 2.36, 0.60], ['Q', 2.36, 0.46, 2.26, 0.40]
    ],
    house: [
      ['M', -1.70, 1.07], ['C', -1.20, 1.30, -0.60, 1.46, 0.00, 1.48],
      ['C', 0.60, 1.48, 1.10, 1.34, 1.50, 1.09], ['L', -1.70, 1.07]
    ],
    houseW: 1.62, lampY: 0.84, tailY: 0.92, badgeY: 0.68,
    sculpt: { taperF: 0.2, taperR: 0.16, tumble: 0.1, len: 1.2, houseTumble: 0.26 },
    wheel: 'cover', extras: ['lightline']
  },

  /* track car: low, wide, swan-neck wing, splitter, roof scoop */
  kestrel: {
    width: 2.06, wheelR: 0.35, archR: 0.41, axleF: 1.42, axleR: -1.30,
    trackZ: 0.89, tyreW: 0.34, sill: 0.30, rocker: 0.12, bevel: 0.04,
    body: [
      ['M', -2.20, 0.26], ['L', -2.26, 0.84], ['L', -1.90, 0.89],
      ['C', -1.10, 0.93, 0.40, 0.93, 1.10, 0.87],
      ['C', 1.70, 0.82, 2.20, 0.63, 2.34, 0.44], ['Q', 2.40, 0.30, 2.32, 0.20]
    ],
    house: [
      ['M', -1.60, 0.89], ['Q', -1.25, 1.00, -0.95, 1.16],
      ['C', -0.60, 1.24, 0.10, 1.22, 0.40, 1.12], ['Q', 0.70, 1.00, 1.05, 0.87], ['L', -1.60, 0.89]
    ],
    houseW: 1.46, lampY: 0.60, tailY: 0.76, badgeY: 0.44,
    wheel: 'race', extras: ['wing-swan', 'splitter', 'canards', 'scoop', 'diffuser', 'exhaust']
  },

  /* prototype racer: fender humps front and rear, a narrow canopy, a fin */
  seer: {
    width: 1.98, wheelR: 0.36, archR: 0.41, axleF: 1.52, axleR: -1.48,
    trackZ: 0.84, tyreW: 0.34, sill: 0.30, rocker: 0.08, bevel: 0.035,
    body: [
      ['M', -2.44, 0.22], ['L', -2.52, 0.82], ['L', -1.40, 0.85],
      ['C', -0.90, 0.85, -0.40, 0.63, 0.20, 0.63],
      ['C', 0.80, 0.63, 1.10, 0.87, 1.60, 0.87],
      ['C', 2.10, 0.87, 2.36, 0.52, 2.46, 0.20]
    ],
    house: [
      ['M', -1.30, 0.66], ['Q', -0.90, 0.92, -0.50, 1.06],
      ['C', -0.20, 1.10, 0.30, 1.06, 0.55, 0.92], ['Q', 0.75, 0.76, 0.95, 0.64], ['L', -1.30, 0.66]
    ],
    houseW: 0.96, lampY: 0.66, tailY: 0.74, badgeY: 0.50,
    sculpt: { taperF: 0.16, taperR: 0.04, tumble: 0.04, houseTumble: 0.3 },
    wheel: 'race', extras: ['fin', 'wing-lmp', 'splitter', 'diffuser']
  }
};

/* ─────────────────────── materials ─────────────────────────── */
/* Metallic and clearcoat surfaces render black without an environment
   map. Every scene that shows a car must set scene.environment. */
export function makeMaterials() {
  const trim = PALETTE.umbra;
  return {
    paint: new THREE.MeshPhysicalMaterial({
      color: 0x15151d, metalness: 0.6, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.04
    }),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0x06070b, metalness: 0.2, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.02,
      transparent: true, opacity: 0.86
    }),
    trim: new THREE.MeshStandardMaterial({ color: trim, metalness: 0.4, roughness: 0.55 }),
    satin: new THREE.MeshStandardMaterial({ color: 0x4a4c55, metalness: 0.9, roughness: 0.3 }),
    carbon: new THREE.MeshStandardMaterial({ color: 0x131419, metalness: 0.5, roughness: 0.42 }),
    tyre: new THREE.MeshStandardMaterial({ color: 0x0c0c0f, metalness: 0, roughness: 0.9 }),
    lamp: new THREE.MeshStandardMaterial({
      color: PALETTE.bone, emissive: PALETTE.bone, emissiveIntensity: 1.6, roughness: 0.2
    }),
    tail: new THREE.MeshStandardMaterial({
      color: 0x2a0d08, emissive: PALETTE.ember, emissiveIntensity: 0.6, roughness: 0.3
    }),
    badge: new THREE.MeshStandardMaterial({
      color: PALETTE.corona, emissive: PALETTE.corona, emissiveIntensity: 0.25, metalness: 0.7, roughness: 0.32
    })
  };
}

/* ─────────────────────── path → shape ──────────────────────── */
function trace(cmds, path) {
  for (const c of cmds) {
    if (c[0] === 'M') path.moveTo(c[1], c[2]);
    else if (c[0] === 'L') path.lineTo(c[1], c[2]);
    else if (c[0] === 'Q') path.quadraticCurveTo(c[1], c[2], c[3], c[4]);
    else if (c[0] === 'C') path.bezierCurveTo(c[1], c[2], c[3], c[4], c[5], c[6]);
  }
  return path;
}

const lastXY = cmds => cmds[cmds.length - 1].slice(-2);

/* Sample a polyline: the extreme x where it crosses height y. The nose
   and tail are curves, so a lamp or badge is mounted on this x, never
   on a guess. */
function extremeXAt(pts, y, front) {
  let best = front ? -Infinity : Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    if ((a.y - y) * (b.y - y) > 0 || a.y === b.y) continue;
    const x = a.x + (b.x - a.x) * (y - a.y) / (b.y - a.y);
    best = front ? Math.max(best, x) : Math.min(best, x);
  }
  return best;
}
/* the highest point of the profile above a given x */
function topAt(pts, x) {
  let best = -Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    if ((a.x - x) * (b.x - x) > 0 || a.x === b.x) continue;
    best = Math.max(best, a.y + (b.y - a.y) * (x - a.x) / (b.x - a.x));
  }
  return best;
}

/* A side profile extruded straight across is a slab: from the front it
   reads as a tube. So before the normals are creased, the vertices are
   pulled in — a plan taper toward the nose and tail, and tumblehome up
   the flank — and the extrusion becomes a body. */
function shapeVertices(geo, S) {
  const pos = geo.attributes.position;
  const smooth = t => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    let k = 1;
    if (S.taperF) k *= 1 - S.taperF * Math.pow(smooth((x - (S.xF - S.len)) / S.len), 2);
    if (S.taperR) k *= 1 - S.taperR * Math.pow(smooth(((S.xR + S.len) - x) / S.len), 2);
    if (S.tumble) k *= 1 - S.tumble * Math.pow(smooth((y - S.y0) / (S.y1 - S.y0)), 1.3);
    pos.setZ(i, pos.getZ(i) * k);
  }
}

/* Earcut fills a lid with long slivers from nose to tail and no
   interior vertices; once the side is sculpted those slivers bend and
   the shading streaks. So the lids ExtrudeGeometry builds are thrown
   away and rebuilt with a grid of interior points (earcut takes each
   as a one-point hole: a Steiner point), giving the curved flank
   vertices to bend on. */
function inside(pts, x, y) {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i], b = pts[j];
    if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) c = !c;
  }
  return c;
}
function edgeDistance(pts, x, y) {
  let d = Infinity;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[j], b = pts[i];
    const dx = b.x - a.x, dy = b.y - a.y, L = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / L));
    d = Math.min(d, Math.hypot(a.x + t * dx - x, a.y + t * dy - y));
  }
  return d;
}
function lidTriangles(shape, curveSegments, spacing) {
  let contour = shape.extractPoints(curveSegments).shape;
  if (contour.length > 1 && contour[0].equals(contour[contour.length - 1])) contour = contour.slice(0, -1);
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of contour) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); }
  const steiner = [];
  for (let x = minX + spacing / 2; x < maxX; x += spacing)
    for (let y = minY + spacing / 2; y < maxY; y += spacing)
      if (inside(contour, x, y) && edgeDistance(contour, x, y) > spacing * 0.45) steiner.push(new THREE.Vector2(x, y));
  const faces = THREE.ShapeUtils.triangulateShape(contour, steiner.map(p => [p]));
  return { pts: [...contour, ...steiner], faces };
}

function extrude(shape, width, bevel, detail, sculpt) {
  const depth = Math.max(0.05, width - bevel * 2);      // the bevel adds to the width on both sides
  const curveSegments = Math.round(28 * detail);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: bevel > 0,
    bevelThickness: bevel, bevelSize: bevel,
    bevelSegments: detail > 0.6 ? 5 : 2,
    curveSegments
  });
  geo.translate(0, 0, -depth / 2);

  /* keep the walls and bevels (group 1), rebuild the lids (group 0) */
  const lid = geo.groups.find(g => g.materialIndex === 0);
  const src = geo.attributes.position.array;
  const walls = src.slice(lid.start * 3 + lid.count * 3);
  const before = src.slice(0, lid.start * 3);
  const { pts, faces } = lidTriangles(shape, curveSegments, detail > 0.6 ? 0.11 : 0.22);
  const zLid = depth / 2 + bevel;
  const lids = [];
  for (const side of [-1, 1]) {
    for (const [a, b, c] of faces) {
      const A = pts[a], B = pts[b], C = pts[c];
      /* wind each triangle to face out of its own side */
      const cross = (B.x - A.x) * (C.y - A.y) - (B.y - A.y) * (C.x - A.x);
      const [p, q] = (cross > 0) === (side > 0) ? [B, C] : [C, B];
      lids.push(A.x, A.y, side * zLid, p.x, p.y, side * zLid, q.x, q.y, side * zLid);
    }
  }
  geo.dispose();
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute([...before, ...walls, ...lids], 3));
  if (sculpt) shapeVertices(out, sculpt);
  const creased = BufferGeometryUtils.toCreasedNormals(out, Math.PI / 5);
  if (creased !== out) out.dispose();
  return creased;
}

/* ───────────────────────── wheels ──────────────────────────── */
function buildWheel(M, R, W, style, outward, detail) {
  const seg = Math.max(14, Math.round(36 * detail));
  const wall = style === 'terrain' ? R * 0.28 : R * 0.19;
  const rimR = R - wall;
  const hub = new THREE.Group();
  hub.name = 'wheel';
  const spin = new THREE.Group();
  spin.name = 'spin';
  hub.add(spin);

  /* CylinderGeometry and TorusGeometry: axis along Y and Z respectively.
     A wheel's axle runs across the car, along Z. Rotate the cylinder
     by x = π/2; leave the torus alone. */
  const cyl = (r1, r2, h, mat, z, open = false) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg, 1, open), mat);
    m.rotation.x = Math.PI / 2;
    m.position.z = z;
    spin.add(m);
    return m;
  };
  const shoulder = Math.min(wall * 0.55, W * 0.3);
  cyl(R, R, W - shoulder * 2, M.tyre, 0, true);
  for (const s of [-1, 1]) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(R - shoulder, shoulder, 8, seg), M.tyre);
    t.position.z = s * (W / 2 - shoulder);
    spin.add(t);
  }
  const face = outward * (W / 2 - 0.03);
  /* the sidewall is a ring, not a disc: a disc here hides the rim */
  const wallRing = new THREE.Mesh(new THREE.RingGeometry(rimR, R - shoulder * 0.6, seg), M.tyre);
  wallRing.position.z = outward * (W / 2 - shoulder * 0.4);
  if (outward < 0) wallRing.rotation.y = Math.PI;       // RingGeometry faces +z
  spin.add(wallRing);
  cyl(rimR, rimR, W * 0.8, M.satin, 0, true);                                                         // barrel
  cyl(rimR * 0.98, rimR * 0.98, 0.02, M.trim, face - outward * 0.04);                                 // back plate

  if (style === 'aero' || style === 'cover') {
    /* a near-flush disc; the cover is fully flush, the aero has slots */
    const disc = cyl(rimR * 0.97, rimR * 0.97, 0.03, style === 'cover' ? M.paint : M.satin, face);
    if (style === 'cover') disc.name = 'paintpart';
    if (style === 'aero') {
      const slot = new THREE.BoxGeometry(rimR * 0.34, rimR * 0.07, 0.035);
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        const m = new THREE.Mesh(slot, M.trim);
        m.position.set(Math.cos(a) * rimR * 0.62, Math.sin(a) * rimR * 0.62, face + outward * 0.008);
        m.rotation.z = a;
        spin.add(m);
      }
    }
  } else {
    const n = style === 'race' ? 5 : style === 'terrain' ? 6 : 10;
    const thick = style === 'terrain' ? 0.2 : style === 'race' ? 0.16 : 0.09;
    const spoke = new THREE.BoxGeometry(rimR * thick, rimR * 0.9, 0.05);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const m = new THREE.Mesh(spoke, M.satin);
      m.position.set(Math.cos(a) * rimR * 0.46, Math.sin(a) * rimR * 0.46, face);
      m.rotation.z = a - Math.PI / 2;
      spin.add(m);
    }
  }
  cyl(rimR * 0.2, rimR * 0.2, 0.05, style === 'race' ? M.satin : M.trim, face + outward * 0.02);     // centre

  /* the brake caliper does not spin */
  const cal = new THREE.Mesh(new THREE.BoxGeometry(R * 0.36, R * 0.5, 0.07), M.trim);
  cal.position.set(-R * 0.52, R * 0.2, face - outward * 0.09);
  hub.add(cal);
  return hub;
}

/* the mark, as a badge, facing +x */
export function buildBadge(size, material) {
  const m = new THREE.Mesh(markGeometry({ depth: 0.2, bevel: 0.04, segments: 40 }), material);
  m.scale.setScalar(size);
  m.rotation.y = Math.PI / 2;
  m.name = 'badge';
  return m;
}

/* Object3D.clone() JSON round-trips userData: every object reference in
   it is severed, and a circular one throws. So userData holds plain
   numbers only, and the live parts are found again by name. */
export function relink(model) {
  const wheels = [], lamps = [], paintMeshes = [];
  let tail = null, cabin = null;
  model.traverse(o => {
    if (o.name === 'wheel') wheels.push({ hub: o, spin: o.getObjectByName('spin') });
    else if (o.name === 'lamp') lamps.push(o);
    else if (o.name === 'tail') tail = o;
    else if (o.name === 'cabin') cabin = o;
    if (o.name === 'paintpart') paintMeshes.push(o);
  });
  model.parts = { wheels, lamps, tail, cabin, paintMeshes };
  return model.parts;
}

/* ─────────────────────── the whole car ─────────────────────── */
export function buildCarModel(protoId, opts = {}) {
  const P = PROTOS[protoId] || PROTOS.augur;
  const detail = opts.tier === 'low' ? 0.5 : 1;          // the low tier halves geometry detail
  const M = opts.materials || makeMaterials();

  const car = new THREE.Group();
  car.name = 'car';
  const shell = new THREE.Group();
  shell.name = 'shell';
  car.add(shell);

  const put = (geo, mat, x, y, z, name) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    if (name) m.name = name;
    shell.add(m);
    return m;
  };

  /* ── sample the upper profile before closing it ── */
  const profilePts = trace(P.body, new THREE.Path()).getPoints(24);
  const [xFrontEnd] = lastXY(P.body);
  const xRearEnd = P.body[0][1];

  /* Arch clearance against the beltline. The arch plus the bevel must
     leave a wall under the shoulder, or the outline self-intersects and
     the body splits in two. Checked at both axles and at the arch edges. */
  const minWall = 0.07;
  let archR = P.archR;
  for (const ax of [P.axleF, P.axleR]) {
    for (const dx of [-archR * 0.5, 0, archR * 0.5]) {
      const belt = topAt(profilePts, ax + dx);
      const archTop = P.sill + Math.sqrt(Math.max(0, archR * archR - dx * dx));
      if (belt - archTop < minWall) archR = Math.min(archR, belt - P.sill - minWall);
    }
  }
  const wheelR = Math.min(P.wheelR, archR - 0.035);

  /* ── the body ── */
  const shape = new THREE.Shape();
  trace(P.body, shape);
  shape.lineTo(P.axleF + archR, P.sill);
  shape.absarc(P.axleF, P.sill, archR, 0, Math.PI, false);
  shape.lineTo(P.axleF - archR - 0.10, P.rocker);
  shape.lineTo(P.axleR + archR + 0.10, P.rocker);
  shape.lineTo(P.axleR + archR, P.sill);
  shape.absarc(P.axleR, P.sill, archR, 0, Math.PI, false);
  shape.lineTo(xRearEnd, P.body[0][2]);

  const bodyTop = Math.max(...profilePts.map(p => p.y));
  const sc = P.sculpt || {};
  const body = new THREE.Mesh(extrude(shape, P.width, P.bevel, detail, {
    xF: xFrontEnd + P.bevel, xR: xRearEnd - P.bevel, len: sc.len ?? 0.95,
    taperF: sc.taperF ?? 0.13, taperR: sc.taperR ?? 0.08,
    tumble: sc.tumble ?? 0.06, y0: bodyTop * 0.5, y1: bodyTop + P.bevel
  }), M.paint);
  body.name = 'paintpart';
  shell.add(body);

  /* the extruded side surface sits one bevel outside the outline */
  const outline = shape.getPoints(24);
  const noseX = y => extremeXAt(outline, y, true) + P.bevel;
  const tailX = y => extremeXAt(outline, y, false) - P.bevel;
  const roofAt = x => topAt(profilePts, x) + P.bevel;
  const halfW = P.width / 2;

  /* ── greenhouse ── */
  let houseTopX = 0, windscreen = [0.8, 1.0];
  if (P.house) {
    const h = trace(P.house, new THREE.Shape());
    const hp = h.getPoints(16);
    const ys = hp.map(p => p.y), xs = hp.map(p => p.x);
    const glass = new THREE.Mesh(extrude(h, P.houseW, 0.03, detail, {
      xF: Math.max(...xs), xR: Math.min(...xs), len: 0.5, taperF: 0.1, taperR: 0.06,
      tumble: sc.houseTumble ?? 0.2, y0: Math.min(...ys), y1: Math.max(...ys)
    }), M.glass);
    glass.name = 'glass';
    shell.add(glass);
    let top = -Infinity;
    for (const p of hp) if (p.y > top) { top = p.y; houseTopX = p.x; }
    /* the windscreen base is the last curve's end: where glass meets bonnet */
    const ws = P.house[P.house.length - 2];
    windscreen = ws.slice(-2);
  }

  /* ── the face: a hairline lamp across the nose, the mark above it ── */
  const lx = noseX(P.lampY);
  const lamp = put(new THREE.BoxGeometry(0.035, 0.028, P.width * 0.72), M.lamp, lx - 0.012, P.lampY, 0, 'lamp');
  lamp.userData.kind = 'head';
  const bx = noseX(P.badgeY);
  const badge = buildBadge(0.07, M.badge);
  badge.position.set(bx + 0.004, P.badgeY, 0);
  shell.add(badge);

  /* the tail: one ember bar, full width — brake lights are what ember is for */
  const tx = tailX(P.tailY);
  put(new THREE.BoxGeometry(0.035, 0.04, P.width * 0.8), M.tail, tx + 0.012, P.tailY, 0, 'tail');

  /* ── the extras that give each car its character ── */
  const E = new Set(P.extras || []);
  const bodyLen = xFrontEnd - xRearEnd;

  if (E.has('blade')) for (const s of [-1, 1])
    put(new THREE.BoxGeometry(P.axleF - P.axleR - archR * 2 - 0.14, 0.09, 0.02), M.satin, (P.axleF + P.axleR) / 2, P.rocker + 0.08, s * (halfW + 0.002));
  if (E.has('cladding')) for (const s of [-1, 1]) {
    put(new THREE.BoxGeometry(P.axleF - P.axleR - archR * 2 - 0.1, 0.2, 0.03), M.trim, (P.axleF + P.axleR) / 2, P.rocker + 0.1, s * (halfW + 0.005));
  }
  if (E.has('flares')) for (const s of [-1, 1]) for (const ax of [P.axleF, P.axleR]) {
    /* the torus lies in XY, the side plane, as a flare must: no rotation */
    put(new THREE.TorusGeometry(archR + 0.01, 0.045, 6, Math.round(22 * detail), Math.PI), M.trim, ax, P.sill, s * (halfW + 0.012));
  }
  if (E.has('skid')) {
    put(new THREE.BoxGeometry(0.5, 0.05, P.width * 0.6), M.satin, xFrontEnd - 0.12, P.rocker + 0.04, 0);
    put(new THREE.BoxGeometry(0.4, 0.05, P.width * 0.6), M.satin, xRearEnd + 0.1, P.rocker + 0.04, 0);
  }
  if (E.has('roof-rack') && P.house) {
    const hp = trace(P.house, new THREE.Path()).getPoints(16);
    const len = protoId === 'vigil' ? 2.1 : 1.7, cx = protoId === 'vigil' ? -0.9 : -1.2;
    const y = topAt(hp, cx) + 0.05;
    for (const s of [-1, 1]) put(new THREE.BoxGeometry(len, 0.03, 0.04), M.satin, cx, y, s * (P.houseW / 2 - 0.12));
  }
  if (E.has('vents')) for (const s of [-1, 1])
    put(new THREE.BoxGeometry(0.42, 0.012, 0.16), M.trim, P.axleF - 0.28, roofAt(P.axleF - 0.28) - 0.003, s * 0.42);
  if (E.has('diffuser')) for (let i = -2; i <= 2; i++) {
    const f = put(new THREE.BoxGeometry(0.34, 0.09, 0.018), M.carbon, xRearEnd + 0.26, P.rocker + 0.03, i * P.width * 0.15);
    f.rotation.z = -0.16;
  }
  if (E.has('splitter'))
    put(new THREE.BoxGeometry(0.34, 0.03, P.width * 0.94), M.carbon, noseX(P.rocker + 0.1) - 0.05, P.rocker - 0.02, 0);
  if (E.has('canards')) for (const s of [-1, 1]) {
    const y = P.lampY - 0.14;
    const c = put(new THREE.BoxGeometry(0.2, 0.016, 0.12), M.carbon, noseX(y) - 0.12, y, s * (halfW - 0.03));
    c.rotation.z = 0.2;
  }
  if (E.has('intake')) for (const s of [-1, 1])
    put(new THREE.BoxGeometry(0.62, 0.2, 0.02), M.trim, P.axleR + archR + 0.4, 0.56, s * (halfW + 0.002));
  if (E.has('scoop'))
    put(new THREE.BoxGeometry(0.6, 0.1, 0.26), M.carbon, houseTopX - 0.25, 1.23, 0);
  if (E.has('exhaust')) for (const s of [-1, 1]) {
    const e = put(new THREE.CylinderGeometry(0.05, 0.05, 0.12, 12, 1, true), M.satin, xRearEnd - 0.02, P.rocker + 0.2, s * 0.09);
    e.rotation.z = Math.PI / 2;      // the pipe points backwards, along X
  }
  if (E.has('fin')) {
    /* a blade along the centreline from the roof to the tail */
    const fin = new THREE.Shape();
    const x0 = houseTopX - 0.3, x1 = xRearEnd + 0.08;
    const yTop = (P.house ? roofAt(houseTopX) : 1) + 0.04;
    fin.moveTo(x0, yTop - 0.12);
    fin.lineTo(x0 + 0.15, yTop);
    fin.lineTo(x1 + 0.1, yTop - 0.04);
    fin.lineTo(x1, roofAt(x1 + 0.1) - 0.04);
    fin.lineTo(x0 + 0.4, roofAt(x0 + 0.4) - 0.1);
    fin.closePath();
    const g = new THREE.ExtrudeGeometry(fin, { depth: 0.022, bevelEnabled: false });
    g.translate(0, 0, -0.011);
    const finMesh = new THREE.Mesh(g, M.paint);
    finMesh.name = 'paintpart';
    shell.add(finMesh);
  }
  const wing = (x, y, span, chord, endplates) => {
    const plane = put(new THREE.BoxGeometry(chord, 0.03, span), M.carbon, x, y, 0);
    plane.rotation.z = 0.12;
    if (endplates) for (const s of [-1, 1])
      put(new THREE.BoxGeometry(chord * 1.2, 0.26, 0.018), M.carbon, x, y - 0.08, s * span / 2);
    const deck = roofAt(x);
    for (const s of [-1, 1]) {
      const h = y - deck + 0.02;
      put(new THREE.BoxGeometry(0.1, h, 0.03), M.carbon, x + 0.02, deck + h / 2 - 0.02, s * span * 0.3);
    }
  };
  if (E.has('wing-swan')) wing(xRearEnd + 0.24, 1.26, P.width * 0.92, 0.36, true);
  if (E.has('wing-low')) wing(xRearEnd + 0.26, roofAt(xRearEnd + 0.26) + 0.16, P.width * 0.9, 0.3, false);
  if (E.has('wing-lmp')) wing(xRearEnd + 0.18, 1.02, P.width * 0.98, 0.34, true);

  if (E.has('lightline')) for (const s of [-1, 1])
    put(new THREE.BoxGeometry(bodyLen * 0.8, 0.012, 0.012), M.lamp, 0, 0.74, s * (halfW + 0.004), 'lamp');

  /* ── wheels ── */
  const tyreW = P.tyreW;
  for (const [x, z] of [[P.axleF, P.trackZ], [P.axleF, -P.trackZ], [P.axleR, P.trackZ], [P.axleR, -P.trackZ]]) {
    const w = buildWheel(M, wheelR, tyreW, opts.wheel || P.wheel, Math.sign(z), detail);
    w.position.set(x, wheelR, z);
    w.userData.front = x > 0;
    shell.add(w);
  }

  /* ── a cabin, for the seats. The simulator's first-person view looks
       over a dash with a single corona hairline: the forecast line. ── */
  if (opts.cabin && P.house) {
    const cabin = new THREE.Group();
    cabin.name = 'cabin';
    const [wx, wy] = windscreen;
    const dash = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.05, P.houseW - 0.16), M.trim);
    dash.position.set(wx - 0.22, wy + 0.03, 0);
    cabin.add(dash);
    const line = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.003, P.houseW * 0.5), M.badge);
    line.position.set(wx - 0.08, wy + 0.057, 0);
    cabin.add(line);
    shell.add(cabin);
  }

  for (const o of shell.children) o.traverse(m => { if (m.isMesh && m.material !== M.glass) m.castShadow = true; });
  body.receiveShadow = true;

  /* userData: plain numbers only, so it survives clone() */
  const [wx, wy] = windscreen;
  const seatZ = Math.min(0.36, P.houseW * 0.23);
  car.userData = {
    proto: protoId,
    dims: {
      wheelR, axleF: P.axleF, axleR: P.axleR, trackZ: P.trackZ, width: P.width,
      wheelbase: P.axleF - P.axleR, length: bodyLen, front: xFrontEnd, rear: xRearEnd,
      height: P.house ? roofAt(houseTopX) : 1,
      /* left-hand drive: the driver sits on -z, the passenger on +z */
      driver: [wx - 0.95, wy + 0.4, -seatZ],
      passenger: [wx - 0.95, wy + 0.38, seatZ]
    }
  };
  car.materials = M;
  relink(car);
  return car;
}

export function setPaint(materials, paint) {
  materials.paint.color.set(paint.hex);
  materials.paint.metalness = paint.metal;
  materials.paint.roughness = paint.rough;
}
