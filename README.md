# Meridian Autohaus — a 3D Mercedes-Benz retail experience

A single-page showroom built with **Three.js**, **GSAP + ScrollTrigger** and **Lenis**.
The car is not a downloaded model — the whole automobile is generated at runtime from
curves, so the site ships as four small text files and has no asset pipeline.

```
index.html          markup, import map, CDN tags
css/style.css       the design system
js/scene.js         the WebGL stage: car, studio, floor, grading
js/main.js          loader, smooth scroll, scroll choreography, micro-detail
```

## Running it

It is a static site — any web server will do.

```bash
npm start            # serves on http://localhost:5173
# or
python3 -m http.server 5173
```

Open it over `http://`, not `file://`: the page uses ES modules and an import map.

## What is happening

**The loading experience.** The three-pointed star draws itself stroke by stroke while
the wordmark rises, and the counter reports real progress — each percentage step is a
stage of the scene actually being built (environment, bodywork, wheels, floor, grading),
not a fake timer. The stage renders three frames before the curtain lifts so nothing
pops in. There is a 14-second watchdog in `index.html`: if the module pipeline never
boots (blocked CDN, no WebGL), the page hands itself over rather than stranding a
visitor on the loader.

**The car.** A side-profile silhouette is drawn as a Bézier `THREE.Shape`, extruded
across the width, bevelled, then crease-smoothed with `toCreasedNormals` so the panels
read as one continuous surface. The greenhouse is a second extrusion in black glass.
The grille, lights and intakes are mounted on the nose *curve* — the surface x-values
are sampled in a comment beside them, because anything placed on a flat guess ends up
buried inside the bodywork. Paint is a clearcoated `MeshPhysicalMaterial`; the
configurator tweens its colour, metalness and roughness live.

**The light.** There is no HDRI. A black room lined with emissive strips is rendered
through `PMREMGenerator` into an environment map — that room is where every highlight
running down the car's flank comes from. Two `RectAreaLight`s, a shadow-casting key and
a soft front fill sit on top of it. The floor is a `Reflector` under a sheet of smoked
glass, plus a painted contact shadow so the car never floats.

**The choreography.** Every section owns a camera pose in the `SCENES` table in
`js/main.js` — position, aim, car rotation, exposure, bloom, headlights, wheel spin and
how far to dim the stage behind the copy. ScrollTrigger scrubs between them while the
section travels into frame; the render loop damps toward those values frame-rate
independently, so scrubbing feels weighted rather than twitchy. The configurator's
turntable drives its own `turn` axis, kept separate from the section pose so the two
tweens cannot fight each other.

## Making it yours

| What | Where |
|---|---|
| Dealership name, copy, models, prices | `index.html` |
| Colours, type scale, spacing | the `:root` block in `css/style.css` |
| Paint options | the `.swatch` buttons — `data-color`, `data-metal`, `data-rough`, `data-name`, `data-code` |
| Camera moves per section | the `SCENES` table in `js/main.js` |
| Body shape | the `body` and `house` shapes in `buildCar()` in `js/scene.js` |

To swap in a real GLB later, load it in `buildCar()` and keep the rest: assign
`mats.paint` to the body meshes so the configurator still works, push them onto
`this.paintMeshes`, and put the four wheels in `this.wheels` with a `userData.spin`
group so they still turn.

The contact form has no backend — `initForm()` validates and acknowledges in the page.
Point it at your CRM or a form service before going live.

## Performance and support

Quality is chosen at boot from viewport, device memory and pointer type. The low tier
(phones, ≤4 GB) drops the reflector, bloom and antialiasing, and halves the geometry
detail. Because the shots are composed for a wide viewport, the camera dollies back on
narrow screens so the framing never crops into the bodywork. `prefers-reduced-motion`
disables the smooth scroll, the idle camera breathing and the marquee.

Needs WebGL 2 and ES modules — every current browser. Three.js, GSAP and Lenis load from
jsDelivr; vendor them locally if you would rather not depend on a CDN.

## Trademarks

Meridian Autohaus is a fictional retailer used to build this demonstration.
Mercedes-Benz, the three-pointed star, AMG and Maybach are trademarks of
Mercedes-Benz Group AG. The specifications, prices and addresses in the page are
illustrative. Replace them, and confirm your own use of the marks with the
manufacturer, before publishing.
