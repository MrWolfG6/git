/* ═══════════════════════════════════════════════════════════
   THE MARK
   One definition, three outputs: the nav SVG, the badge on every
   nose, and the monolith upstage.

     disc  circle r = 1
     bite  circle r = 0.82, centre (-0.30, +0.30)
     rule  rect   w = 0.04, h = 2.66, centred

   The bite crosses the edge of the disc (0.424 + 0.82 > 1), so it
   cannot be a literal hole: a hole that leaves its outline breaks
   triangulation. The shape is built as the boolean it describes —
   the disc's outer arc between the two intersection points, closed
   by the bite's inner arc. The result is exactly disc − bite.
   ═══════════════════════════════════════════════════════════ */

import * as THREE from 'three';

export const MARK = {
  disc: { r: 1 },
  bite: { r: 0.82, x: -0.30, y: 0.30 },
  rule: { w: 0.04, h: 2.66 }
};

export const PALETTE = {
  penumbra: 0x0B0B11,
  umbra:    0x05050A,
  corona:   0xE8D9A8,
  ash:      0x6E6E7A,
  bone:     0xF2EFE9,
  ember:    0xB4462A
};

/* where the bite circle cuts the disc */
function intersections() {
  const { r: R } = MARK.disc;
  const { r, x: cx, y: cy } = MARK.bite;
  const d = Math.hypot(cx, cy);
  const a = (R * R - r * r + d * d) / (2 * d);        // along the centre line
  const h = Math.sqrt(R * R - a * a);                  // off it
  const ux = cx / d, uy = cy / d;
  const px = ux * a, py = uy * a;
  const p1 = { x: px - uy * h, y: py + ux * h };
  const p2 = { x: px + uy * h, y: py - ux * h };
  return [p1, p2];
}

/* the crescent as angles, so the SVG and the Shape agree exactly */
function crescentArcs() {
  let [p1, p2] = intersections();
  const { x: cx, y: cy, r } = MARK.bite;
  /* order the points so that sweeping clockwise from p1 to p2 passes
     the point opposite the bite — the side of the disc that survives */
  const TAU = Math.PI * 2;
  const cw = (from, to) => (((from - to) % TAU) + TAU) % TAU;
  const away = Math.atan2(-cy, -cx);
  if (cw(Math.atan2(p1.y, p1.x), away) > cw(Math.atan2(p1.y, p1.x), Math.atan2(p2.y, p2.x))) [p1, p2] = [p2, p1];
  /* the disc keeps the arc that lies outside the bite: the one that
     passes through the point opposite the bite's centre */
  const outer = { a0: Math.atan2(p1.y, p1.x), a1: Math.atan2(p2.y, p2.x) };
  const inner = { a0: Math.atan2(p2.y - cy, p2.x - cx), a1: Math.atan2(p1.y - cy, p1.x - cx) };
  return { p1, p2, outer, inner, r, cx, cy };
}

/* two THREE.Shapes: the crescent and the rule */
export function markShapes() {
  const A = crescentArcs();
  const cres = new THREE.Shape();
  cres.moveTo(A.p1.x, A.p1.y);
  /* outer arc, clockwise from p1 round the far side to p2 */
  cres.absarc(0, 0, MARK.disc.r, A.outer.a0, A.outer.a1, true);
  /* inner arc of the bite, back to p1 */
  cres.absarc(A.cx, A.cy, A.r, A.inner.a0, A.inner.a1, false);

  const { w, h } = MARK.rule;
  const rule = new THREE.Shape();
  rule.moveTo(-w / 2, -h / 2);
  rule.lineTo(w / 2, -h / 2);
  rule.lineTo(w / 2, h / 2);
  rule.lineTo(-w / 2, h / 2);
  rule.closePath();
  return [cres, rule];
}

/* extruded mark, centred on its own depth */
export function markGeometry({ depth = 0.12, bevel = 0.02, segments = 64 } = {}) {
  const geo = new THREE.ExtrudeGeometry(markShapes(), {
    depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel * 0.6,
    bevelSegments: 3, curveSegments: segments
  });
  geo.translate(0, 0, -depth / 2);
  geo.computeBoundingBox();
  return geo;
}

/* SVG path data in a 0..size box, y flipped for the screen */
export function markSVGPath(size = 100) {
  const A = crescentArcs();
  const s = size / (MARK.rule.h + 0.02);
  const X = x => (size / 2 + x * s).toFixed(3);
  const Y = y => (size / 2 - y * s).toFixed(3);
  const R = MARK.disc.r * s, r = A.r * s;
  /* Y() flips the axis but not the picture, so a clockwise sweep stays
     clockwise on screen: sweep-flag 1. Both arcs pass 180°. */
  const d =
    `M${X(A.p1.x)} ${Y(A.p1.y)}` +
    `A${R.toFixed(3)} ${R.toFixed(3)} 0 1 1 ${X(A.p2.x)} ${Y(A.p2.y)}` +
    `A${r.toFixed(3)} ${r.toFixed(3)} 0 1 0 ${X(A.p1.x)} ${Y(A.p1.y)}Z`;
  const { w, h } = MARK.rule;
  const rule = `M${X(-w / 2)} ${Y(h / 2)}H${X(w / 2)}V${Y(-h / 2)}H${X(-w / 2)}Z`;
  return { crescent: d, rule, size };
}

export function markSVG(cls = '', title = 'OMEN') {
  const p = markSVGPath(100);
  return `<svg class="${cls}" viewBox="0 0 100 100" role="img" aria-label="${title}">` +
    `<path d="${p.crescent}"/><path d="${p.rule}"/></svg>`;
}

/* every .js-mark placeholder in the page gets the same drawing */
export function paintMarks(root = document) {
  for (const el of root.querySelectorAll('[data-mark]')) {
    if (el.dataset.markDone) continue;
    el.innerHTML = markSVG('mark', el.dataset.mark || 'OMEN');
    el.dataset.markDone = '1';
  }
}
