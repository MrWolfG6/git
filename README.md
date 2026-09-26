# OMEN

**It tells you first.**

A 3D site for OMEN, an electric-first hypercar marque. Three pages, one car
system: a scrolling **showroom**, a **car page** with a configurator, and a
**simulator** you can drive. Three.js, GSAP + ScrollTrigger, Lenis. Static —
ES modules and an import map, no build step, no model or texture files. Every
car, every mark, every sound is generated at runtime.

```
index.html                         the showroom
car.html?car=<id>                  one car on its dais
drive.html?car=<id>&world=<id>     the simulator
    [&time=day|night &seat=chase|driver|passenger &laps=1|3|5|10
     &paint=OM-xxx &wheel=aero|spoke|race|terrain|cover]
```

Car ids: `augur herald vigil corvid eclipse portent kestrel seer`.
Worlds: `spine` (THE SPINE), `salt` (SALT), `circuit` (THE CIRCUIT).

## Running it

```bash
npm start                      # http://localhost:5173
# or: python3 -m http.server 5173
```

Serve over `http://`, not `file://` — ES modules need it. Every path is
relative, so the site works from a subfolder (GitHub Pages project sites
included). Add `?tier=low|mid|high` to any page to force a quality tier.

## Layout

```
assets/js/brand.js        the mark: one definition → THREE.Shapes, extruded geometry, SVG
assets/js/cars.js         the lineup, the OM- paint library, options, worlds
assets/js/builder.js      PROTOS + buildCarModel(): eight silhouettes, one code path
assets/js/stage.js        the room, the dais, the monolith, poses, rise/sink
assets/js/choreo.js       scroll → pose: sections own camera poses
assets/js/showroom.js     index.html
assets/js/carpage.js      car.html
assets/js/common.js       quality tier, reduced motion, Lenis, damping
assets/js/drive/          world, vehicle + camera rig, AI, audio, particles, main loop
assets/css/               omen.css (shared), showroom.css, car.css, drive.css
```

## Architecture, briefly

- **The mark** is disc − bite + rule. The bite (r 0.82 at −0.30, +0.30)
  crosses the disc's edge, so it cannot be a literal `holes` entry — a hole
  that leaves its outline breaks triangulation. `brand.js` builds the boolean
  it describes: the disc's outer arc between the two intersection points,
  closed by the bite's inner arc. The same function feeds the nav SVG, the
  badge on every nose and the monolith upstage.
- **Cars** are side profiles in metres, extruded, bevelled, then given
  `toCreasedNormals(geo, π/5)`. Before the normals, vertices get a plan taper
  toward nose and tail and tumblehome up the flank, so an extrusion reads as a
  body and not a slab. ExtrudeGeometry's lids are rebuilt with interior
  Steiner points so the sculpted flank has vertices to bend on (earcut's
  nose-to-tail slivers streak otherwise). Arch radius is checked against the
  beltline and clamped; lamps, badge and tail bar are mounted on x sampled
  from the profile at their height.
- **Lighting is a room**: emissive strips baked through `PMREMGenerator`. One
  warm strip, low and behind, is the corona rim.
- **Poses**: each section has a pose in a `SCENES` table (camera, aim in the
  car's frame, yaw, exposure, bloom, scrim). Each section's ScrollTrigger
  scrubs one number; the target is the table folded over those numbers and the
  stage damps toward it frame-rate independently. No tween owns a pose
  property. The turntable is its own axis, summed at render.
- **The dais** is a `Reflector` under smoked glass, with a clipping plane at
  its surface: cars rise through it and are genuinely cut as they emerge.
- **The simulator** drives the same `buildCarModel()` with the car's own
  mass, power, grip and top speed — the car on the podium is the car you
  drive, paint and wheels included. Night lights are a pool of six
  `PointLight`s re-pointed at the nearest emitters, with candela worked out
  from each source's height (`I = E · d²`).
- **Audio** is Web Audio synthesis from each car's profile: motor whine and
  stepped inverter tone for the EVs; starter, shift cut and (on SEER) a
  blow-off chirp for the two combustion cars. No recordings.
- **Watchdog**: an inline script in every page hands the page over if the
  module graph fails or never boots. The showroom falls back to a static
  eclipse with all copy readable.

## Dev hooks

`drive.html?…&autopilot=1&warp=12` — the car follows the line and brakes
for the forward read, and the simulation takes several steps per frame. It
exists so a full race can be run end to end in a slow headless browser.

## Housekeeping

The Meridian build this replaced (`js/`, `css/`) is no longer referenced by
any page. Remove it with `git rm -r js css`.

The contact form posts JSON to `data-endpoint` on `#form` if you set one; with
none set it says so rather than pretending to send.
