# Die to Campus

A 3D portfolio for Panam Williams Mballos. One idea: **a chip and an elite
school are the same object — a system that sorts.**

## Run it

    npm install
    npm run dev      # http://localhost:5173/git/portfolio/
    npm run build    # -> dist/

## The load-bearing decision

The die and the campus are **not two models cross-faded**. They are one
procedural field of instanced unit boxes, read at two camera distances. A
standard-cell row at 1m is a paved courtyard at 60m; a power rail is a
footpath; a bond pad is a boundary wall. A single uniform, `uZoom`, derived
from camera distance, decides which reading the material gives — nothing is
ever swapped under the viewer's eye, because there is only ever one thing there.

Generating the plot in code rather than loading a `.glb` is what makes the
seamlessness structural instead of a trick, and it is why the whole site ships
with **no model or texture files at all**.

- `src/three/layout.ts` — the plot generator
- `src/three/BlockMaterial.ts` — the die-or-campus shader
- `src/three/CameraRig.tsx` — the pull-back and the fly-to

## Changing the content

Everything — every word, every number, the ten structures and their footprints
— lives in `src/content/site.ts`. Components hold no strings. Editing that one
file re-points the whole portfolio.

## Budget

Measured on the production build:

| Limit | Target | Actual |
|---|---|---|
| Download to first interaction | under 4 MB | ~307 kB gzipped |
| Model files | under 1.5 MB | none — the plot is generated |
| Draw calls, campus scene | under 150 | 3 (two instanced meshes + ground) |
| Textures | 2048px max | none |

## Two deliberate departures from the brief

1. **The sun is driven by reading progress, not page scroll.** A hub with orbit
   controls has no spare scroll axis — the wheel is zoom. Opening sections
   advances the day instead, which is the same idea by the only means available.
2. **Interiors are a camera move and a panel, not modelled rooms.** This is the
   rough version of the whole path, as the build order asks for; modelled
   interiors are the next pass, not a prerequisite for shipping.

`@react-three/postprocessing` is not installed. The one permitted glow — the
magenta rim on the selected building — is done in the block shader by isolating
box edges, which costs nothing and avoids a full-screen pass.
