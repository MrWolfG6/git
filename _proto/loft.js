import * as THREE from 'three';

/* A car is a loft of cross-sections, not an extruded side view.
   Every station along the length gets its own section, built from a
   handful of curves: underside, beltline, roof, plan-view width, cabin
   width. The surface is one smooth grid: no lids, no seams, no cracks. */

const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = t => Math.min(1, Math.max(0, t));
const smooth = t => { t = clamp01(t); return t * t * (3 - 2 * t); };

/* piecewise curve through [x, y] keys, smoothstepped between them */
function keys(pts) {
  return x => {
    if (x <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
      /* cubic Hermite with Catmull-Rom tangents: smooth through every key */
      const xm = pts[i - 2] || pts[i - 1], xp = pts[i + 1] || pts[i];
      const m0 = (y1 - xm[1]) / (x1 - xm[0] || 1) * (x1 - x0);
      const m1 = (xp[1] - y0) / (xp[0] - x0 || 1) * (x1 - x0);
      const t = (x - x0) / (x1 - x0), t2 = t * t, t3 = t2 * t;
      return (2 * t3 - 3 * t2 + 1) * y0 + (t3 - 2 * t2 + t) * m0 + (-2 * t3 + 3 * t2) * y1 + (t3 - t2) * m1;
    }
    return pts[pts.length - 1][1];
  };
}

export const CONCEPT = {
  xR: -2.22, xF: 2.30, noseLen: 0.42, tailLen: 0.26,
  axleF: 1.40, axleR: -1.20, wheelR: 0.35, archR: 0.40, trackZ: 0.86, tyreW: 0.30,
  bot:  [[-2.3, 0.30], [-1.9, 0.17], [-1.4, 0.14], [1.2, 0.14], [1.9, 0.17], [2.3, 0.26]],
  belt: [[-2.3, 0.80], [-1.9, 0.86], [-1.2, 0.89], [-0.4, 0.85], [0.6, 0.81], [1.35, 0.815], [1.85, 0.74], [2.15, 0.62], [2.3, 0.52]],
  /* the roof line: cabin from the windscreen base to the long fastback */
  top:  [[-2.3, 0.80], [-1.95, 0.87], [-1.3, 1.02], [-0.7, 1.20], [-0.1, 1.27], [0.35, 1.22], [0.95, 0.85], [1.35, 0.82], [2.15, 0.63], [2.3, 0.52]],
  /* plan view: haunches over the rear wheels, a waist at the doors */
  hw:   [[-2.3, 0.86], [-1.9, 0.97], [-1.25, 1.01], [-0.6, 0.955], [0.3, 0.94], [1.1, 0.965], [1.6, 0.95], [2.1, 0.86], [2.3, 0.74]],
  cabin: [-1.95, 0.98]              // the greenhouse runs between these
};

export function buildLoftBody(C, mats, nx = 260, ns = 72) {
  const bot = keys(C.bot), belt = keys(C.belt), top = keys(C.top), hw = keys(C.hw);
  const [c0, c1] = C.cabin;

  /* one half-section, bottom centre to roof centre, as control points */
  function section(x) {
    const yb = bot(x), yl = belt(x), yt = top(x), w = hw(x);
    const cab = Math.max(0, yt - yl);                      // greenhouse height here
    const yMax = lerp(yb, yl, 0.62);                         // widest point: low on the flank
    const cwBase = w * 0.80, cwTop = w * lerp(0.80, 0.66, smooth(cab / 0.3));
    /* the wings stand proud of the bonnet and the deck: dip the centre */
    const dip = 0.09 * smooth((x - 0.85) / 0.35) * (1 - smooth((x - 2.0) / 0.3))
              + 0.035 * smooth((-1.75 - x) / 0.25) * (1 - smooth((-2.1 - x) / 0.15));
    return [
      [0, yb], [w * 0.55, yb], [w * 0.9, yb + 0.02], [w * 0.985, yb + 0.1],
      [w, yMax], [w * 0.975, yl - 0.07], [w * 0.9, yl - 0.005],
      [cwBase, yl + 0.01 + cab * 0.02],
      [lerp(cwBase, cwTop, 0.55), yl + cab * 0.55],
      [cwTop, yl + cab * 0.92], [cwTop * 0.55, yt + 0.004 - dip * 0.8], [0, yt + 0.01 - dip]
    ];
  }

  const pos = [], cat = [], inArch = [], idx = [[], [], []];      // 0 paint · 1 glass
  const L = C.xF - C.xR;
  for (let i = 0; i <= nx; i++) {
    /* stations bunch toward the ends, where the nose and tail curl round */
    const s = i / nx, x = C.xR + L * (0.5 - 0.5 * Math.cos(Math.PI * s));
    const ctl = section(x).map(([z, y]) => new THREE.Vector3(z, y, 0));
    const curve = new THREE.CatmullRomCurve3(ctl, false, 'centripetal');

    /* the ends: the section shrinks to its centre on a superellipse,
       which rounds the nose and tail in plan and side at once */
    const un = clamp01((x - (C.xF - C.noseLen)) / C.noseLen), ut = clamp01(((C.xR + C.tailLen) - x) / C.tailLen);
    const u = Math.max(un, ut), p = un > ut ? 2.2 : 3.2;
    const f = Math.pow(1 - Math.pow(u, p), 1 / p);
    const yc = un > ut ? lerp(bot(x), belt(x), 0.5) : lerp(bot(x), belt(x), 0.62);

    const yl = belt(x), cab = x > c0 && x < c1 ? top(x) - yl : 0;
    for (let j = 0; j <= ns * 2; j++) {
      const t = j <= ns ? j / ns : (2 * ns - j) / ns;       // up one side, down the other
      const side = j <= ns ? 1 : -1;
      const p3 = curve.getPoint(t);
      let z = p3.x * f * side, y = yc + (p3.y - yc) * f;
      /* wheel openings: marked here, cut cleanly once the grid exists */
      let arch = -1;
      if (t < 0.56) for (const [k, ax] of [C.axleF, C.axleR].entries()) {
        const d = Math.hypot(x - ax, y - C.wheelR);
        if (d < C.archR) arch = k;
        else if (d < C.archR + 0.07) z *= 1 + 0.02 * Math.sin(Math.PI * (d - C.archR) / 0.07);   // a rolled lip
      }
      inArch.push(arch);
      pos.push(x, y, z);
      /* the windows, by where they sit on the section and along the car */
      const W = cab > 0.04 && (
        (t > 0.665 && t < 0.83 && x > -1.40 && x < 0.84 - (t - 0.665) * 2.2) ||   // side glass, raked at the A-pillar
        (t > 0.80 && x > 0.42 && x < C.cabin[1] - 0.03) ||                       // windscreen
        (t > 0.86 && x > -1.78 && x < -0.98));                                   // rear screen
      cat.push(W ? 1 : 0);
    }
  }
  const row = ns * 2 + 1;
  /* the arch cut: a vertex inside the opening that borders the body is
     pulled out onto the circle; quads left wholly inside are dropped.
     The edge is then the arc itself, not the grid's staircase. */
  const axles = [C.axleF, C.axleR];
  const n = pos.length / 3, onEdge = new Uint8Array(n);
  for (let i = 0; i <= nx; i++) for (let j = 0; j < row; j++) {
    const v = i * row + j;
    if (inArch[v] < 0) continue;
    const nb = [[i - 1, j], [i + 1, j], [i, j - 1], [i, j + 1], [i - 1, j - 1], [i + 1, j + 1], [i - 1, j + 1], [i + 1, j - 1]];
    if (!nb.some(([a, b]) => a >= 0 && a <= nx && b >= 0 && b < row && inArch[a * row + b] < 0)) continue;
    const ax = axles[inArch[v]], x = pos[v * 3], y = pos[v * 3 + 1];
    const d = Math.hypot(x - ax, y - C.wheelR) || 1;
    pos[v * 3] = ax + (x - ax) * C.archR / d;
    pos[v * 3 + 1] = C.wheelR + (y - C.wheelR) * C.archR / d;
    onEdge[v] = 1;
  }
  const gone = v => inArch[v] >= 0 && !onEdge[v];
  for (let i = 0; i < nx; i++) for (let j = 0; j < row - 1; j++) {
    const a = i * row + j, b = a + row;
    const q = [a, b, a + 1, b + 1];
    if (q.some(gone) || q.every(v => onEdge[v])) continue;
    idx[cat[a]].push(a, b, a + 1, a + 1, b, b + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex([...idx[0], ...idx[1], ...idx[2]]);
  geo.addGroup(0, idx[0].length, 0);
  geo.addGroup(idx[0].length, idx[1].length, 1);
  geo.computeVertexNormals();
  const group = new THREE.Group();
  const mesh = new THREE.Mesh(geo, mats);
  mesh.name = 'paintpart';
  group.add(mesh);
  /* arch liners: the inside of each opening, matte black */
  for (const ax of axles) for (const s of [-1, 1]) {
    const zo = hw(ax) - 0.012, zi = C.trackZ - C.tyreW / 2 - 0.06;
    const liner = new THREE.Mesh(
      new THREE.CylinderGeometry(C.archR - 0.005, C.archR - 0.005, zo - zi, 40, 1, true, Math.PI - 1.9, 3.8),
      mats[2]);
    liner.material.side = THREE.DoubleSide; liner.rotation.x = Math.PI / 2;
    liner.position.set(ax, C.wheelR, s * (zo + zi) / 2);
    group.add(liner);
  }
  return group;
}

/* The pieces that make the surface read as a car: lamps, a mirror,
   the door's shut line and handle. Placed on the loft by sampling it. */
export function buildLoftDetails(C, body, M) {
  const g = new THREE.Group();
  const mesh = body.children[0], P = mesh.geometry.attributes.position;
  /* the body's half-width at (x, y): the widest vertex near that point */
  const skin = (x, y) => {
    let best = 0;
    for (let i = 0; i < P.count; i++) {
      const px = P.getX(i), py = P.getY(i);
      if (Math.abs(px - x) < 0.03 && Math.abs(py - y) < 0.03) best = Math.max(best, Math.abs(P.getZ(i)));
    }
    return best;
  };
  /* a band that wraps the nose or tail at height y, following the skin */
  const band = (y, front, r, mat, span = 0.96) => {
    const bins = new Map();
    for (let i = 0; i < P.count; i++) {
      const px = P.getX(i), py = P.getY(i), pz = P.getZ(i);
      if (Math.abs(py - y) > 0.02 || (front ? px < 1.6 : px > -1.6)) continue;
      const k = Math.round(pz / 0.03);
      const cur = bins.get(k);
      if (!cur || (front ? px > cur.x : px < cur.x)) bins.set(k, new THREE.Vector3(px, y, pz));
    }
    const pts = [...bins.entries()].sort((a, b) => a[0] - b[0]).map(e => e[1]);
    const zMax = Math.max(...pts.map(p => Math.abs(p.z))) * span;
    const path = pts.filter(p => Math.abs(p.z) <= zMax).map(p => p.clone().add(new THREE.Vector3(front ? -0.004 : 0.004, 0, 0)));
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(path), 80, r, 8, false), mat);
    g.add(tube);
    return tube;
  };
  const line = (pts, mat) => { const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat); g.add(l); return l; };

  /* headlamps: a lens set into the leading edge of each wing */
  for (const s of [-1, 1]) {
    const lens = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 16), M.lensMat);
    lens.scale.set(0.17, 0.04, 0.12);
    const lx = 2.0, ly = 0.645;
    lens.position.set(lx, ly - 0.012, s * (skin(lx, ly) - 0.16));
    lens.rotation.set(0, 0, -0.45);
    g.add(lens);
  }
  /* tail: one bar across the full width, the car's signature */
  band(0.74, false, 0.011, M.tail, 0.93);
  /* the intake: a dark mouth across the lower nose, a slimmer one at the tail */
  for (const y of [0.30, 0.33, 0.36]) band(y, true, 0.02, M.trim, 0.72);
  for (const y of [0.3, 0.33]) band(y, false, 0.02, M.trim, 0.8);

  for (const s of [-1, 1]) {
    /* the door: shut lines front and rear, a flush handle */
    for (const xd of [0.78, -0.42]) {
      const pts = [];
      for (let y = 0.2; y <= 0.84; y += 0.02) {
        const dx = xd > 0 ? (y - 0.2) * 0.12 : 0;          // the front shut follows the rake of the wing
        pts.push(new THREE.Vector3(xd - dx, y, s * (skin(xd - dx, y) + 0.002)));
      }
      line(pts, M.shut);
    }
    const hy = 0.72, hx0 = -0.25, hx1 = -0.05;
    const hp = [];
    for (let x = hx0; x <= hx1 + 1e-6; x += 0.025) hp.push(new THREE.Vector3(x, hy, s * (skin(x, hy) + 0.003)));
    line(hp, M.shut);
    /* the mirror, on a slim arm from the door top */
    const mx = 0.62, my = 0.9, z0 = skin(mx, 0.83);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.14), M.trim);
    arm.position.set(mx, my - 0.02, s * (z0 + 0.04));
    g.add(arm);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 14), M.paint);
    cap.scale.set(0.12, 0.055, 0.09);
    cap.position.set(mx + 0.02, my + 0.02, s * (z0 + 0.14));
    g.add(cap);
  }
  return g;
}
