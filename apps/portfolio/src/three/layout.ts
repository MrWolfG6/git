import { PLOT, structures } from "../content/site";

/**
 * One plot, generated once, expressed as instances of a single unit box.
 *
 * This is the load-bearing decision of the whole build. The die and the campus
 * are not two models cross-faded — they are this one instance field, read at
 * two camera distances. A standard-cell row at 1m is a paved courtyard at 60m;
 * a power rail is a footpath; a bond pad is a boundary wall. Nothing is ever
 * swapped under the viewer's eye, because there is only ever one thing there.
 */

export const KIND = { CELL: 0, RAIL: 1, PAD: 2, STRUCTURE: 3 } as const;

export type Instance = {
  /** Centre position, plot-space, already offset so the plot straddles origin. */
  p: [number, number, number];
  /** Box scale. */
  s: [number, number, number];
  kind: number;
  seed: number;
};

const OX = -PLOT.w / 2;
const OZ = -PLOT.d / 2;

/** Deterministic RNG — the plot must be identical on every load and every machine. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const footprints = structures.map((b) => ({
  x0: b.x - 1, x1: b.x + b.w + 1,
  z0: b.z - 1, z1: b.z + b.d + 1
}));

function underStructure(x: number, z: number, w: number) {
  for (const f of footprints) {
    if (x + w > f.x0 && x < f.x1 && z + 1 > f.z0 && z < f.z1) return true;
  }
  return false;
}

export function buildPlot() {
  const r = rng(20260901);
  const cells: Instance[] = [];

  // Standard-cell rows. Contiguous runs of varying width with routing channels
  // between the rows — which is exactly what paving looks like from above.
  for (let z = 1; z < PLOT.d - 1; z += 2) {
    let x = 1;
    while (x < PLOT.w - 1) {
      const w = 1 + Math.floor(r() * 3);
      if (!underStructure(x, z, w)) {
        cells.push({
          p: [OX + x + w / 2, 0.03, OZ + z + 0.7],
          s: [w - 0.14, 0.06, 1.4],
          kind: KIND.CELL,
          seed: r()
        });
      }
      x += w;
    }
  }

  // Power rails, which are the footpaths.
  for (let z = 4; z < PLOT.d - 2; z += 7) {
    cells.push({
      p: [OX + PLOT.w / 2, 0.055, OZ + z],
      s: [PLOT.w - 4, 0.11, 0.42],
      kind: KIND.RAIL,
      seed: r()
    });
  }
  for (let x = 8; x < PLOT.w - 4; x += 12) {
    cells.push({
      p: [OX + x, 0.055, OZ + PLOT.d / 2],
      s: [0.42, 0.11, PLOT.d - 5],
      kind: KIND.RAIL,
      seed: r()
    });
  }

  // Bond pads, which are the boundary wall.
  const ring = (n: number, fx: (i: number) => [number, number]) => {
    for (let i = 0; i < n; i++) {
      const [x, z] = fx(i);
      cells.push({
        p: [OX + x, 0.22, OZ + z],
        s: [1.1, 0.45, 1.1],
        kind: KIND.PAD,
        seed: r()
      });
    }
  };
  const nx = Math.floor(PLOT.w / 2.2), nz = Math.floor(PLOT.d / 2.2);
  ring(nx, (i) => [1 + (i * (PLOT.w - 2)) / (nx - 1), 0.2]);
  ring(nx, (i) => [1 + (i * (PLOT.w - 2)) / (nx - 1), PLOT.d - 0.2]);
  ring(nz, (i) => [0.2, 1 + (i * (PLOT.d - 2)) / (nz - 1)]);
  ring(nz, (i) => [PLOT.w - 0.2, 1 + (i * (PLOT.d - 2)) / (nz - 1)]);

  // The ten structures. Same box, taller, and the only pickable things.
  const built: Instance[] = structures.map((b, i) => ({
    p: [OX + b.x + b.w / 2, b.h / 2, OZ + b.z + b.d / 2],
    s: [b.w, b.h, b.d],
    kind: KIND.STRUCTURE,
    seed: i / structures.length
  }));

  return { cells, built };
}

/** Where the camera should sit to frame a given structure, and what to look at. */
export function framing(i: number) {
  const b = structures[i];
  const cx = OX + b.x + b.w / 2;
  const cz = OZ + b.z + b.d / 2;
  const reach = Math.max(b.w, b.d) * 1.5 + 9;
  return {
    target: [cx, b.h * 0.45, cz] as [number, number, number],
    position: [cx + reach * 0.62, b.h + reach * 0.42, cz + reach * 0.78] as [number, number, number]
  };
}

export const PLOT_CENTER: [number, number, number] = [0, 0, 0];
