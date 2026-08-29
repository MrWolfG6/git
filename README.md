# Meridian Autohaus — a 3D Mercedes-Benz retail experience

Three pages, one world: a scrolling **showroom**, a **car detail page** with a
live configurator, and a **driving simulator** you can actually drive.

Built with **Three.js**, **GSAP + ScrollTrigger** and **Lenis**, with the eight
requested Sketchfab models embedded through the **Sketchfab Viewer API**.
No build step, no bundler — it is a static site.

```
index.html            the showroom: hero, heritage, design, performance,
                      configurator, the podium collection, contact
car.html?car=<id>     one car: specification, finishes, test-drive routes
drive.html?car=<id>&world=<id>&time=<day|night>
                      the simulator

js/cars.js            the eight cars: specs, Sketchfab uid, paints, audio
                      profile, simulator tuning
js/carbuilder.js      eight runtime-built bodies, from side profiles
js/scene.js           the showroom hero stage
js/showcase.js        the lit podium + the Sketchfab layer
js/main.js            showroom loader, smooth scroll, scroll choreography
js/detail.js          the car page
js/drive/world.js     three spline circuits, dressed and lit, day and night
js/drive/vehicle.js   arcade vehicle model + the three-seat camera rig
js/drive/ai.js        city traffic and the Grand Prix field
js/drive/audio.js     the synthesised powertrain
js/drive/main.js      simulator boot, input, loop and HUD
```

## Running it

```bash
npm start                 # http://localhost:5173
# or: python3 -m http.server 5173
```

Serve it over `http://`, not `file://` — the pages use ES modules and an
import map.

---

## Read this first: three honest constraints

**1 — A Sketchfab embed cannot be driven.** The eight models you supplied are
Sketchfab embeds. An embed is a sandboxed iframe running Sketchfab's own
viewer; its geometry is never exposed to the host page, so it cannot be handed
to a physics loop, lit by our lights, or cast onto our podium.

So the site does both, and says which is which:

- **The showroom podium and the car pages show the real Sketchfab models**,
  composited over a podium rendered here. The embeds run transparent
  (`transparent: 1`), with the viewer chrome switched off, driven through the
  Viewer API.
- **The simulator drives a body built at runtime** by `js/carbuilder.js` —
  eight distinct silhouettes (limousine, off-roader, GT racer, concept pod,
  open-wheeler, hypercar, eighties saloon, SUV coupé), one per car, with that
  car's own dimensions, mass, power, grip and top speed. The car page states
  this in its credit line rather than implying the Sketchfab model is what you
  are driving.

If you later licence downloadable GLBs of these cars, drop them in and the
simulator will use them: load the GLB in `Vehicle`'s constructor instead of
`buildCarModel`, assign `materials.paint` to the body meshes so the
configurator still works, and put the four wheels in `model.parts.wheels`
each with a child group named `spin`.

**2 — The engine sounds are synthesised, not recordings.** Real recordings of
these cars are licensed material and are not shipped here. `js/drive/audio.js`
builds each powertrain in the Web Audio API from the car's own profile —
cylinder count, idle, redline, how much turbo, how much electric whine — so a
V12 idles and pulls differently from the AMG V8, the EV hums, and the F1 car
screams to fifteen thousand. There is a starter motor, a shift cut with a
blow-off chirp on the turbo cars, tyre roar that rises with speed, a kerb
rumble off-track, and wind noise.
If you licence real loops, put them in `assets/audio/<car-id>-engine.mp3` and
wire them up through `loadSample()`; the synth stays as the fallback.

**3 — Free Sketchfab embeds carry Sketchfab branding.** `ui_watermark: 0` is
requested but only honoured on a paid plan. Every model is credited by name
and author, linked back to Sketchfab, on the podium and on its car page — as
their licences require. Check each model's licence before going live.

---

## What the site does

### The showroom (`index.html`)

The loader draws the three-pointed star stroke by stroke while the counter
reports real progress — each step is a stage of the scene actually being built.
A 14-second watchdog hands the page over if the module pipeline never boots.

The hero car is built at runtime: a Bézier side profile extruded across the
width, bevelled, then crease-smoothed so the panels read as one surface. The
grille, lights and intakes are mounted on the sampled nose *curve* — anything
placed on a flat guess ends up buried inside the bodywork. Lighting is a black
room lined with emissive strips, baked through `PMREMGenerator`; the floor is
a `Reflector` under smoked glass.

Eight sections each own a camera pose in the `SCENES` table in `js/main.js` —
position, aim, car rotation, exposure, bloom, headlights, wheel spin, and how
far to dim the stage behind the copy. ScrollTrigger scrubs between them.

The **3D marque** in the hero is the Sketchfab Mercedes-Benz logo model
(`js/main.js` → `initLogo3d`), running transparent and auto-spinning behind the
headline, with the drawn star as its fallback.

### The podium (`#collection`)

A dais with a lit rim, a chasing ring and volumetric beams. Choosing a car
sinks the outgoing one into the podium and raises the new one out of it. The
runtime body genuinely emerges: a `THREE.Plane` clipping plane sits at the
podium surface, so the car is cut off by the dais as it rises. The Sketchfab
layer does the same, clipped in CSS at the same line.

Arrows, a rail of all eight, keyboard ←/→ and swipe. The stage only renders
while it is on screen, and only loads a model on approach.

### The car page (`car.html`)

Full specification, highlights, and a configurator: paint (applied to the
runtime body immediately, and pushed into the Sketchfab model through
`setMaterial` where that model exposes a body material), wheel finish and
caliper colour. Then three routes into the simulator.

### The simulator (`drive.html`)

- **Chicago** — Lake Shore Drive: skyline, lit windows after dark, street
  lighting, the lake, and traffic.
- **Las Vegas** — the Strip: neon on both sides, palms, casino towers, desert.
- **Grand Prix circuit** — kerbs, armco, grandstands, a start gantry and
  floodlights, with a full field of AI cars, a five-light start and live
  timing. This is where the W14 belongs, and any car can run there.

All three are closed spline circuits, so the road, the AI pathing and the lap
timing share one piece of maths and you can never reach an edge.

**Day and night** cross-fade the sky, fog, sun, ground, road, street lighting,
building windows, neon, floodlights and the car's own headlights, and swap the
baked environment map at the midpoint.

**Three seats** — chase, driver and passenger. The driver and passenger
cameras sit behind the windscreen base looking out over the bonnet.

**Controls** — `W`/`↑` throttle, `S`/`↓` brake and reverse, `A`/`D` steer,
`Space` handbrake, `C` seat, `N` time of day, `M` sound, `R` back to the road,
`Esc` pause. On touch, on-screen pedals and steering.

The vehicle model is an arcade bicycle model: a power band, aerodynamic drag,
a grip limit that gives you understeer when you ask too much, a handbrake that
steps the tail out, body roll and dive, an automatic gearbox, and a rougher,
slower surface off the road.

---

## Making it yours

| What | Where |
|---|---|
| The cars — specs, prices, copy, Sketchfab uids, paints, tuning, audio | `js/cars.js` |
| Dealership name and showroom copy | `index.html` |
| Colours, type scale, spacing | `:root` in `css/style.css` |
| Camera moves per showroom section | `SCENES` in `js/main.js` |
| Body shapes | `PROTOS` in `js/carbuilder.js` |
| Route shapes and dressing | `ROUTES` / `PALETTE` in `js/drive/world.js` |
| Engine voicing | `VOICES` in `js/drive/audio.js` |

The contact form has no backend — it validates and acknowledges in the page.
Point it at your CRM before going live.

## Performance and support

Quality is chosen at boot from viewport, device memory and pointer type. The
low tier drops reflections, bloom and antialiasing, halves the geometry detail
and thins the traffic. Because every shot is composed for a wide viewport, the
camera dollies back on narrow screens so the framing never crops into the
bodywork. `prefers-reduced-motion` disables smooth scroll, idle camera motion
and the marquee.

Needs WebGL 2, ES modules and Web Audio — every current browser. Three.js,
GSAP, Lenis and the Sketchfab viewer load from their CDNs; vendor them locally
if you would rather not depend on one.

## Trademarks and credits

Meridian Autohaus is a fictional retailer used to build this demonstration.
Mercedes-Benz, the three-pointed star, AMG, Maybach and Petronas are
trademarks of their respective owners. Specifications, prices, addresses and
driver names are illustrative. Replace them, confirm your own use of the marks
with the manufacturer, and check each Sketchfab model's licence before
publishing.

3D models, all on Sketchfab and credited in the page:
Mercedes-Benz Logo by Mehdi101 · Mercedes-Benz Maybach 2022 by
Mpgs.studio3DModels · AMG BRABUS G700 by Echoo · AMG GT3 Evo 2020 by vecarz ·
VISION AVTR by SQUIR3D · F1 2023 Mercedes W14 by Excalibur · Silver Lightning
by amogusstrikesback2 · 190E 2.5-16 Evolution II by OUTPISTON · GLE 63 AMG
Coupé 2021 by SQUIR3D.
