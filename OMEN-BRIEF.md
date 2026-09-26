# OMEN — build brief

A paste-in brief for building the OMEN site from scratch in a new session.
It carries forward the architecture proven in the Meridian Autohaus build
and replaces the borrowed identity with an owned one.

Paste everything from **"THE BRIEF"** down.

---

## Why this is a rewrite, not a reskin

Three problems the old build had, all solved by one decision:

1. **Trademarks.** The star, "The Best or Nothing", AMG, Maybach, and eight
   Sketchfab models of real cars all belong to Mercedes-Benz Group AG.
2. **The models could not be driven.** A Sketchfab embed is a sandboxed
   iframe; its geometry never reaches the page, so the showroom showed one
   car and the simulator drove a different one.
3. **The embeds could be blocked.** School and corporate networks block
   `github.io` and third-party embeds; when they do, the centrepiece is gone.

**Decision: no third-party models anywhere. Every car is generated at
runtime from curves.** That was already how the simulator worked, and it was
the better half of the old build. One system, one car, no licences, nothing
to block, and the car you look at is the car you drive.

---

# THE BRIEF

## 1 — The marque

**OMEN.** An electric-first hypercar marque with no heritage and no interest
in pretending otherwise. Where a German marque sells you 140 years, OMEN
sells you the next four seconds.

The idea in the name: the car reads the road, the weather and your inputs and
tells you what is about to happen before it happens. Instrumentation as
prophecy. Every surface of the brand is about *reading a sign*.

**Voice.** Short, declarative, slightly cold. Technical nouns, no adjectives
of luxury. Never "bespoke", "curated", "crafted", "timeless", "elegance".
Never a founder story. Never a date of establishment.

- Line: **"It tells you first."**
- Secondary: "Read the road." / "Know before."

**What OMEN is not.** Do not reach for: chrome, a circular badge, a serif
italic, the word *heritage*, hand-stitched leather, a wood veneer, a
chauffeur, champagne, a crest, a founding year, or a tagline of the form
"The ___ or Nothing". If a decision would look at home on a German luxury
site, take the other one.

### The mark

An **eclipse**: the oldest omen there is.

A solid disc with a crescent bitten out of its upper-left by a second,
offset circle, and one hairline rule running vertically through the centre,
overshooting the disc top and bottom by a third of the radius.

Buildable the same way the old star was — 2D `THREE.Shape` with a hole, then
`ExtrudeGeometry` — so it works as an SVG in the nav, an extruded badge on
the car's nose, and a monolith upstage in the hero.

```
disc      circle r = 1
bite      circle r = 0.82, centre (-0.30, +0.30), as a hole
rule      rect  w = 0.04, h = 2.66, centred
```

Never enclose the mark in a ring. Never give it three of anything.

### Palette

Named for the parts of an eclipse. Blue-black ground, not pure black; a pale
gold that is the corona, not a neon accent.

```css
--penumbra: #0B0B11;  /* ground: blue-black, never #000 */
--umbra:    #05050A;  /* deepest wells, panel interiors */
--corona:   #E8D9A8;  /* the one warm light. Type accents, the mark, rim light */
--ash:      #6E6E7A;  /* labels, secondary type */
--bone:     #F2EFE9;  /* primary type — warm white, never pure #FFF */
--ember:    #B4462A;  /* rust. Warnings and brake lights ONLY. Never decorative */
```

Corona is the only warm note in the whole system. Spend it on the mark, on
rim lighting, and on one word per screen. Everything else is ground, bone and
ash. If a screen has two accent colours, one is wrong.

### Typography

No serif anywhere. The serif italic is the single strongest thing making the
old build read as German luxury — dropping it changes the feel more than any
colour choice.

- **Display / headings** — a grotesk with real character. *Bricolage
  Grotesque*, *Instrument Sans*, or *Archivo*. Weight 200–300 at large sizes,
  tight tracking (`-0.04em`).
- **Data, labels, readouts, HUD** — a monospace. *IBM Plex Mono* or *Martian
  Mono*. All specification numbers, lap times, speeds, paint codes and
  eyebrow labels are monospaced. This is the brand's second voice and it does
  the work the serif used to do.
- Do **not** use Inter, Space Grotesk, or a Cormorant/Playfair serif.

### The lineup

Eight cars. Five electric, three combustion — OMEN began as a combustion
skunkworks and is winding it down, which is why the last three exist and why
they sound different.

| Model | Type | Drivetrain | Note |
|---|---|---|---|
| **OMEN AUGUR** | Saloon | Quad motor, 1020 hp | The flagship. Reads the road 200 m ahead |
| **OMEN HERALD** | Grand tourer | Dual motor, 780 hp | Long-distance, 900 km |
| **OMEN VIGIL** | Off-roader | Quad motor, 850 hp | Torque-vectored, 3 locking modes |
| **OMEN CORVID** | Coupé | Rear motor, 600 hp | Light. 1380 kg |
| **OMEN ECLIPSE** | Hypercar | Quad motor, 1600 hp | The halo car |
| **OMEN PORTENT** | Concept | In-wheel, 900 hp | No steering wheel |
| **OMEN KESTREL** | Track car | 4.0 V8 NA, 620 hp | Combustion. Homologation special |
| **OMEN SEER** | Prototype racer | 3.0 V6 turbo hybrid, 940 hp | Combustion. The race car |

Give each one: a one-line thesis, a paragraph of copy in the voice above, six
specifications, four highlights, 3–4 paint options with codes, an audio
profile, and simulator tuning (mass, power, grip, top speed).

Paint codes are OMEN's own: `OM-` plus three digits. Never borrow a real
manufacturer's code.

---

## 2 — What to build

Three surfaces, the same as before, all static — no build step, ES modules
and an import map.

**The showroom** (`index.html`) — a scrolling page with a fixed WebGL stage
behind it. Loader, hero, and sections for the marque's thesis, the design
language, performance, a live paint configurator, the collection on a lit
podium, ownership, and contact.

**The car page** (`car.html?car=<id>`) — one car on its podium: full
specification, highlights, a configurator with a running build total, and
three routes into the simulator.

**The simulator** (`drive.html?car=<id>&world=<id>`) — drive it. Three
worlds, day and night, three camera seats, procedural audio, AI traffic, and
a race with a classification.

### Worlds

Rename away from real cities so nothing is owed to a real place:

- **THE SPINE** — a coastal motorway at the foot of a city. Traffic both ways.
- **SALT** — a desert strip, neon, at the edge of nothing.
- **THE CIRCUIT** — a Grand Prix track. AI grid, five-light start, live
  timing, selectable race length, chequered flag with classification.

---

## 3 — Architecture that is already proven

Do not re-derive these. They work.

**The car is a side profile, extruded.** Draw the silhouette as a Bézier
`THREE.Shape` in metres, extrude it across the width, bevel it, then
`BufferGeometryUtils.toCreasedNormals(geo, Math.PI/5)` so the panels read as
one surface instead of a stack of facets. The builder closes the bottom
itself: a wheel arch at each axle joined by a rocker.

**One parameterised builder, many cars.** A `PROTOS` table of profiles and
dimensions; one `buildCarModel(protoId)`. Eight silhouettes from one code
path.

**Lighting is a room, not a light rig.** Build a small scene of emissive
strips and bake it through `PMREMGenerator` into an environment map. That is
where every highlight down a car's flank comes from.

**Sections own camera poses.** A `SCENES` table: position, aim, car rotation,
exposure, bloom, and how far to dim the stage behind the copy.
ScrollTrigger scrubs between them; the render loop damps toward them
frame-rate independently.

**The podium.** A dais with a `Reflector` top, a lit rim, and volumetric
beams. Cars rise *through* the surface — a `THREE.Plane` clipping plane at
the podium height means the car is genuinely cut by the dais as it emerges.

**Vehicle model.** An arcade bicycle model: power band, drag, a grip limit
that produces understeer when you ask too much, a handbrake that steps the
tail out, body roll and dive, automatic gearbox, and a rougher, slower
surface off the road.

**Audio is synthesised.** Web Audio, from each car's own profile — cylinder
count, idle, redline, turbo, electric whine. The EVs get motor whine and
inverter tone; the two combustion cars get a starter, a shift cut and a
blow-off chirp. Never ship engine recordings you have not licensed.

---

## 4 — The bugs that will bite you

Every one of these cost real time. They are not hypothetical.

**`Object3D.clone()` destroys `userData`.** It JSON round-trips it, which
severs every object reference and throws outright on a circular one. Keep
only plain data in `userData`; name the parts and re-link them by name after
any clone.

**Author `display` beats the UA rule for `[hidden]`.** A panel styled
`display: grid` is *never* hidden by the `hidden` attribute. Ship
`[hidden] { display: none !important; }` or your pause menu will sit on top
of your intro screen, invisibly eating clicks.

**Details placed on a flat guess end up inside the bodywork.** The nose is a
curve. Sample the profile at the height you are mounting to and put the
grille, lamps and intakes on *that* x. Same for the tail.

**Check arch clearance against the beltline.** An arch radius plus the
extrude bevel can breach the shoulder line and split the body in two.

**Watch the axis when you rotate a torus or cylinder.** A flare and a side
exhaust rotated into the width axis once made a car 3.6 m wide.

**Metallic and clearcoat materials render pure black with no environment
map.** If a car looks like a silhouette, you forgot the IBL.

**A map tinted by a dark base colour is double-darkened.** Leave
`material.color` white and let the texture carry the tone.

**ScrollTrigger only hears Lenis.** Any scroll that bypasses it — keyboard,
find-in-page, browser scroll restoration — desyncs the whole choreography.
Add `addEventListener('scroll', () => ScrollTrigger.update(), {passive:true})`.

**A scrubbed tween at progress 0 writes its start value every update.** It
will silently pin a property another tween owns. Give each animation its own
axis: a section pose on `rotY`, a turntable on `turn`, summed at render.

**GSAP's lag smoothing freezes its clock under load.** Anything the
simulation depends on — a race countdown, a timer — must run on wall time,
not a tween.

**An early-return path must still produce what other systems read.** Holding
a car on the grid returned before computing its tyre contact points, and the
effects layer then dereferenced them every frame and killed the rest of the
frame with it.

**Never light a scene with one `PointLight` per emitter.** `numPointLights`
is compiled into *every* lit material's shader and walked for every fragment
— at intensity zero as much as at full. Sixty neon signs halved the frame
rate in daylight. Keep a pool of about six, re-pointed at the nearest
emitters each frame.

**`PointLight.intensity` is candela since three r155.** Irradiance is
`intensity / distance²`. A value of 60 on a 23 m mast delivers 0.11 and is
invisible. Work out what the distance needs and set that.

**Toggling `light.visible` changes `numPointLights`** and recompiles every
material. Know which side of that trade you are on and write it down.

**A descendant selector will match nested elements you did not mean.**
`.spec span` styled the *number* inside `<em>` as a label. Use `>`.

**World-space camera targets break when the subject rotates.** Rotate the
target with it, or keep the subject still and move the camera.

**A fixed vertical FOV crops into the subject on a narrow viewport.** Dolly
the camera back by aspect ratio so phones see the whole car.

**A pinned section must fit one viewport** or its lower half is unreachable.

---

## 5 — Budget and support

- Quality tier chosen at boot from viewport, `deviceMemory` and pointer type.
  The low tier drops reflections, bloom and antialiasing, halves geometry
  detail and thins traffic.
- Target 60 fps on a mid-range laptop, 30 on a phone.
- No model or texture files ship. Everything is generated.
- `prefers-reduced-motion` disables smooth scroll, idle camera motion and
  the marquee.
- Every path relative, so the site works from a subfolder.
- A watchdog that hands the page over if the module pipeline never boots —
  a visitor must never be stranded on a loading screen.

## 6 — Definition of done

- The eight cars are visibly distinct in silhouette at a glance.
- The car on the podium is the car you drive.
- Copy passes the voice test: no luxury adjectives, no heritage, no founding
  date.
- Nothing on any screen belongs to anyone else — no marks, no model names,
  no taglines, no third-party geometry.
- The showroom, a car page and a full race have each been driven end to end
  in a browser, with the console clean.
