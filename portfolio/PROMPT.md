# Class Register — build prompts for an anime data-science portfolio

Built around the **11.11.23 cobalt poster** (photography by ak.merchant). That
poster is the design system; everything here extends it rather than replacing it.

- §1 the concept · §2 the site prompt · §3 **your avatar, from your photos**
- §4 the interaction spec · §5 how to make it rich

---

## 1. The concept

**An elite Japanese school's student register, printed on a silicon die.**

Two systems that measure everything and reveal nothing: *Classroom of the Elite*'s
cold institutional grading, and a chip floorplan. So the site grades you the way
the school grades students, and lays your skills out as silicon area.

The section names are the concept. Do not replace them with About / Projects /
Skills / Contact.

| Section | In-universe name | What it is |
|---|---|---|
| 01 Hero | **Homeroom** | Name, thesis, current status |
| 02 Skills | **OAA Evaluation** | Six traits, honest letter grades |
| 03 Projects | **Special Exams** | Four projects, each with its constraint |
| 04 Gallery | **Contact Sheet** | The poster grid, rebuilt as your lookbook |
| 05 Stack | **Floorplan** | Skills as silicon area you hover |
| 06 History | **Semester Log** | Timeline |
| 07 Contact | **End of Day** | Links |

### What the poster dictates

| Element | Taken from the poster |
|---|---|
| Palette | Cobalt, true black, pure white. **Nothing else.** |
| Display type | Heavy condensed caps — Anton on Google Fonts is the closest free match |
| Frame | A 1px black rule inset 14px from the viewport edge, fixed |
| Grid | Modular cells, white gutters, hard rectangles, no rounded corners |
| Date stamp | `11 / 11 / 23` stacked, set large, sitting left of the name |

The one thing the site adds that the poster can't: **the light moves.**

---

## 2. Master build prompt

> Paste into Claude, v0, Cursor or Lovable. Replace the bracketed values first.

```
Build a single-page personal portfolio as one self-contained HTML file
(inline CSS and JS, no framework, no build step).

WHO IT'S FOR
A second-year university data science student focused on machine learning
systems and the silicon underneath them — Intel, AMD, NVIDIA accelerators.
Seeking internships at chip and AI-infrastructure companies.
Name: Panam Williams Mballos. Links: [GITHUB] [LINKEDIN] [EMAIL].

CONCEPT
"An elite Japanese school's student register, printed on a silicon die."
Visual restraint of Classroom of the Elite; structural logic of a chip
floorplan. Section names: Homeroom / OAA Evaluation / Special Exams /
Contact Sheet / Floorplan / Semester Log / End of Day.

ART DIRECTION
A still frame from a quiet classroom at 4pm, not an action anime. Calm, a lot
of white space, hairline rules, hard rectangles, no rounded corners, nothing
glowing. If a choice could be called "flashy", make the other one.

COLOR — three colours, and one of them only arrives by scrolling
  ground     #ffffff
  surface    #f5f6f8
  ink        #0d0d0f      true black
  ink-soft   #54585f
  rule       #d2d5da      hairlines
  cobalt     #1b3eae      THE accent — the subject's own blue
  sun        #c2853c      never static, only ever driven by scroll
Dark theme is the same room at 9pm: ground #0b0c0f, surface #141519,
ink #eef0f4, rule #282b32, cobalt lifts to #5b7fe0.
Declare every colour as a CSS custom property on :root. Redefine ONLY those
properties inside `@media (prefers-color-scheme: dark){ :root:not([data-theme="light"]) }`
and again inside `:root[data-theme="dark"]`. Never declare a colour whose only
definition lives inside a media query — that is the classic unreadable bug.
Be generous with the cobalt; it is the identity. Introduce no fourth hue.

TYPE — four faces, four jobs, all from Google Fonts
  Anton                — the poster face. The name, the 11/11/23 stamp, project
                         numbers. All caps, tight, never below 24px.
  Shippori Mincho B1   — a Japanese mincho serif for section headlines. This is
                         what supplies the light-novel register.
  Zen Kaku Gothic New  — body, 300/400/500, 16px/1.75, max 64ch.
  JetBrains Mono       — labels, grades, telemetry. 10-11px, uppercase, .14em.
Anton against a mincho serif is the whole tension: fashion poster meets quiet
classroom. Do not use Inter, Space Grotesk, Poppins, Playfair or Montserrat.
Headline scale clamp(42px, 7.4vw, 88px).

LAYOUT
A 1px black frame fixed at inset 14px — the poster's border.
Inside it, a fixed 74px left rail: a seal glyph, seven tick marks (the active
one grows 9px to 22px and its label slides out on hover), a vertical clock at
the bottom. Content in a 1000px column right of the rail.
Below 880px the frame insets to 8px and the rail becomes a top bar.

THE SIGNATURE MOVE — scroll drives the sun
One CSS variable --sun, 0 to 1, from scroll progress, driving three things:
  1. a fixed full-page warm gradient wash (multiply in light, screen in dark),
  2. the rotation of the hero's light shafts, 9deg to 22deg,
  3. a clock in the rail counting 08:20 to 19:05.
Reading the page takes one school day. This is the idea to get right.

SECTIONS
1. HOMEROOM (100svh). Two columns: the stacked 11/11/23 stamp in Anton, then
   the text. Background: diagonal light shafts (a repeating-linear-gradient in
   cobalt at 5% alpha, radial-masked so it fades at the edges, blurred 1.4px),
   a faint blind pattern, and a canvas of ~80 drifting dust motes. The name is
   contenteditable and persists to localStorage — wrap every call in try/catch.
   A four-cell status strip between hairlines closes the section.
2. OAA EVALUATION. Six rows: skill, an honest one-line description, a 2px bar
   that fills on scroll-into-view, a large mincho letter grade right-aligned.
3. SPECIAL EXAMS. Four projects, grid of [number | title + description + tool
   tags | one result figure]. On hover the row background fades in from a
   negative-inset pseudo-element. No lift, no shadow, no scale.
   Each project names the constraint it had to satisfy, not just its stack.
4. CONTACT SHEET. Rebuild the poster's collage grid — 6 columns, 74px rows,
   9px gutters, nine cells at fixed grid positions. Each cell is a slot for one
   character render, showing a mono asset label over a faint 45deg cobalt hatch.
   On hover the cell floods cobalt and the shot description appears in white.
   The gallery doubles as the shot list until the renders exist.
5. FLOORPLAN. A 22x12 grid of small squares — a die. Eight named blocks each
   occupy a rectangle. Hovering a legend row lights its cells with a 7ms
   stagger. The legend gives each block's area in "u²", so the page argues that
   skills compete for a fixed budget. Idle: one random cell dimly pulses every
   260ms, so the die is never fully still.
6. SEMESTER LOG. Vertical hairline, four entries, dots that fill cobalt on hover.
7. END OF DAY. Links whose underline wipes left to right (animate `right` from
   100% to 0 on an ::after, 500ms).

CONTROLS — two 34px squares, fixed top right
  Room tone: WebAudio brown noise through a 620Hz lowpass at gain 0.05, off by
  default, ramped with setTargetAtTime. Never autoplay.
  Theme toggle, persisted to localStorage.

MOTION
One easing curve throughout: cubic-bezier(.16, 1, .3, 1).
Reveals: 14px rise and fade, 850ms, 55ms stagger, via IntersectionObserver,
unobserved after firing. Scroll handler rAF-throttled and passive.
Under `prefers-reduced-motion: reduce`, kill the motes canvas entirely and set
every duration to 0.01ms.

QUALITY BAR
Semantic HTML, visible :focus-visible states, tabular-nums on every figure,
no horizontal body scroll at any width, zero dependencies.
```

---
## 3. Your avatar — built from your six photos

**I cannot generate the image.** This session has no image tool, so what follows
is the prompt, written against your actual face rather than a template. Paste it
into a generator with your photos attached as reference.

### 3a. What your photos actually show

Read from the graduation shot, the blue-suit shot, the two selfies, the
black-and-white one, and the desk shot.

| Feature | What to draw |
|---|---|
| Face shape | Long oval, narrow through the cheeks. The lower third is long — a genuinely long face, not a round one. Tapered chin, defined but slim jaw with no heaviness |
| Skin | Deep brown, warm undertone, even. Takes a hard specular highlight on the forehead, nose bridge and cheekbones — that sheen is part of the likeness, do not matte it out |
| Hairline | **The single strongest marker.** A very sharp, straight, squared lineup across the forehead with crisp right-angled corners at the temples. Barber-clean. Get this wrong and it stops being you |
| Hair | Very short black coils, low taper at the sides, almost no height |
| Forehead | Tall and broad, which the squared lineup emphasises |
| Eyebrows | Dark, moderate thickness, close to the eye, near-straight with only a gentle arch, clear gap between them |
| Eyes | Almond, **hooded upper lids**, dark brown, outer corners tilting slightly down. Level, unhurried gaze. Faintly asymmetric — the left reads a touch more open |
| Nose | Medium-wide base, moderately flared nostrils, rounded tip, low-to-medium bridge |
| Lips | Fuller lower lip, defined cupid's bow, neutral resting line, lip border a shade darker than the surrounding skin |
| Facial hair | Sparse and light — faint moustache shadow, light stubble along the chin and jaw edge. Do not draw a full beard |
| Ears | Medium, sitting close to the head |
| Neck & build | Long slim neck, lean build, narrow shoulders, tall impression |
| Signature | **Wireless earbuds.** They appear in three of six photos. Keep one visible |

**Three things that must not change.** Stylisation eats these first:

1. The squared, razor-straight lineup.
2. The hooded, slightly downturned eye shape.
3. The depth of the skin tone.

One free observation: your resting expression across every photo is already
composed, level and faintly detached. That is Ayanokouji's entire register. Do
not let a generator add a smile — you are closer to the character as you are.

### 3b. The uniform, sampled from your reference

Colours pulled from the pixels of the Ayanokouji image, not remembered:

| Piece | Hex | Notes |
|---|---|---|
| Blazer | `#A5414B` | Brick-wine red. Notched lapels, single-breasted, **worn open** |
| Lapel piping | `#C4A47C` | Soft antique gold, a thin line along the lapel edge and pocket flaps; gold buttons at the cuff |
| Shirt | `#FFFFFF` | White, top button undone |
| Necktie | `#2D4B91` | Royal blue, **worn loose**, knot pulled well down |
| Trousers | `#377369` | Pine-teal green, straight leg, slight break |
| Loafers | `#734155` | Oxblood |

The way he wears it matters as much as the colours: blazer open, tie loosened,
one hand in a pocket, posture relaxed to the point of slouching.

### 3c. The prompt

```
Anime character portrait in the style of the Classroom of the Elite anime
adaptation. Muted, restrained, realistic proportions — NOT big-eyed moe, NOT
shonen action art.

SUBJECT — a Nigerian university student, late teens / early twenties.
Long oval face, narrow through the cheeks, with a noticeably long lower third,
a tapered chin and a defined but slim jaw. Deep brown skin with a warm
undertone, even in tone, catching a bright specular highlight on the forehead,
nose bridge and cheekbones. Very short black tightly-coiled hair, low taper at
the sides, with a SHARP STRAIGHT SQUARED LINEUP across the forehead — crisp
right-angled corners at the temples, barber-clean. Tall broad forehead. Dark
near-straight eyebrows of moderate thickness sitting close to the eye. Almond
eyes with hooded upper lids, dark brown irises, outer corners tilting slightly
downward, gaze level and unhurried. Medium-wide nose with a rounded tip and
moderately flared nostrils. Fuller lower lip, defined cupid's bow, lip border
slightly darker than the surrounding skin. Sparse light stubble on the chin and
along the jaw edge only. Long slim neck, lean build, narrow shoulders.
One wireless earbud visible in the ear.
Expression: calm, composed, closed-mouth, faintly detached. Not smiling.

WARDROBE — the Advanced Nurturing High School uniform.
Brick-wine red blazer #A5414B with notched lapels, worn OPEN, thin antique-gold
piping #C4A47C along the lapel edges and pocket flaps and gold buttons at the
cuffs. White shirt, top button undone. Royal blue necktie #2D4B91 worn loose
with the knot pulled well down. Pine-teal green trousers #377369, straight leg.
Oxblood loafers #734155.

STYLE — thin precise even-weight linework with no heavy outer contour. Soft
two-tone cel shading, one soft-edged shadow pass. No rim light, no glow, no
lens flare, no speed lines. Desaturated cool palette with blue-grey shadows.
Realistic head-to-body proportion near 1:7.5. Realistic eye size, detailed iris
with a soft gradient and one small highlight, thin restrained lashes.
Flat low-contrast background with soft depth-of-field falloff.

LIGHTING — late-afternoon light from a window at camera left, low angle, cool
ambient fill, faint dust visible in the beam.

DO NOT enlarge the eyes. DO NOT slim or reshape the jaw. DO NOT lighten the
skin tone. DO NOT straighten or soften the squared hairline. DO NOT remove the
hooded eyelids. DO NOT add a smile, glow, sparkles, or a busy background.
```

### 3d. Getting it into the site

The hero already has a slot waiting. Save the render as a **transparent PNG** at:

```
portfolio/img/avatar.png
```

Commit it and it appears automatically — the page checks for the file and lays
out around it. Until the file exists the hero simply renders without it, so
nothing breaks in the meantime. Full-body works best; the frame is portrait.

### 3e. The rest of the set

Once one render looks like you, keep the same seed and reference and pull:
a seated-at-a-desk three-quarter, a neutral bust for the student ID, three
expressions (neutral / faint smile / thinking), a back-turned silhouette, and a
line-art-only version. Transparent PNGs throughout, so atmosphere stays in CSS.

Tools that hold a face across a set, best first: Midjourney with
`--cref <image url> --cw 80`; NanoBanana or Gemini image editing for
"keep this face, change the pose"; Stable Diffusion with IP-Adapter FaceID plus
a LoRA trained on ~20 of your photos; Leonardo.ai Character Reference for the
least setup.

## 4. Interaction spec — calm but never inert

Subtle and interactive pull against each other. The resolution is: **one thing
moves at a time, and it always moves slowly.**

1. **One easing curve site-wide.** `cubic-bezier(.16, 1, .3, 1)`. Shared easing
   is what makes separate animations feel like one hand made them.
2. **Nothing under 400ms.** Snappy reads as cheap here. Reveals 850ms, hovers 500ms.
3. **Hover changes exactly one property.** A line grows. A cell floods cobalt.
   A row shifts 11px. Never lift + scale + shadow + colour at once.
4. **No motion without cause.** Nothing loops but the dust and one dim die cell —
   both atmosphere, both nearly invisible.
5. **The page has a state, and scroll is its only control.** Sun, clock, rail.
   That's the difference between "animated" and "alive".

Worth building once the base is up:

- **Reading light.** A faint radial gradient trailing the cursor at ~6% opacity.
  Disable on touch.
- **The eyeline strip.** Slot 03 sits as a thin band across the Contact Sheet.
  Parallax it a few pixels against scroll — the one place the character moves.
- **A grade that changes.** One OAA row reads from a JSON file with a
  `lastUpdated` date. Proof the site is maintained.
- **Rain mode.** Press `R`: shafts fade, a canvas rain layer, the room tone drops
  in pitch. Classroom of the Elite is half rain. Almost nobody will find it.
- **The empty-seat line.** At the very bottom, after four seconds, one line fades
  in: a desk stays reserved until the student stops showing up. Undersell it.

---

## 5. How to make it rich

### 5a. Rich in substance

A beautiful shell over four thin projects is transparent to anyone hiring.

- **One project written up properly** — 1,500 words *including the approach that
  failed*. The most credible thing a student can publish.
- **One live thing on the page.** A GPU price-per-TFLOP chart updating weekly
  from your own scraper. Proving something you built stays running is rarer than
  any project.
- **Show the profiler output.** Put the Nsight timeline on the page. The people
  who hire for this notice, and almost nobody does it.
- **Number every claim.** "3.4× over naive at 71% of theoretical bandwidth" beats
  "optimised CUDA kernels" enormously.
- **A dated changelog** of what you learned each month. Turns a static portfolio
  into evidence of slope — and slope is what juniors get hired on.
- **One page per project at a real URL** you can paste straight into an
  application without routing someone through a homepage.

### 5b. Rich in the other sense

Ordered by how fast a second-year can start:

1. **Sell this template.** You'll have a genuinely distinctive anime-portfolio
   theme with a real design system. Gumroad at $19–39, or ThemeForest. That niche
   is saturated with the same three neon looks; a calm one has no competition.
   Fastest money on this list, and your own site is the entire product demo.
2. **Anime-fy other people's portfolios.** You'll own the whole pipeline — photos
   to a consistent character set to a deployed site. $150–400 each. Every client
   site links back to you.
3. **Freelance data work.** Upwork or Contra: scraping, dashboards, cleaning.
   $25–40/hr, with the price-performance project as proof.
4. **Publish the semiconductor analysis.** A newsletter doing honest $/TFLOP and
   earnings-language work on Intel, AMD and NVIDIA. Real appetite, very few people
   doing it with actual statistics. Sponsors arrive around 1,000 subscribers —
   but the real return is being noticed by the exact companies you named.
5. **Teach what you just learned.** "CUDA for people who only know Python."
   Being two months ahead of your audience is an advantage: you still remember
   the confusion.
6. **Competitions with real prizes.** Kaggle, and specifically the vendor ones —
   NVIDIA GTC contests, AMD ROCm bounties, open-source kernel bounties. These pay
   *and* they're the most direct line into those companies.
7. **Open source with intent.** One small genuinely useful tool with good docs.
   Sponsors are a trickle; maintainership outranks most internships as a signal.

**The order that compounds:** ship the site → write one deep case study → sell
the template → let that fund the newsletter → let the newsletter get you the
internship. Each step pays for the next.
