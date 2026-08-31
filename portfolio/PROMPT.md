# Class Register — build prompts for an anime data-science portfolio

Everything here is copy-paste ready. Section 2 builds the site, section 3 makes
your anime avatar from a photo, section 4 is the interaction spec, section 5 is
how to make it earn.

---

## 1. The concept, in one line

**An elite Japanese school's student register, printed on a silicon die.**

That's the whole idea, and it's why it doesn't look like every other anime
portfolio. Two worlds that shouldn't touch:

- *Classroom of the Elite* — cold institutional calm, overcast light, muted
  uniform navy, a school that reduces people to grades and merit points.
- Semiconductors — floorplans, standard-cell grids, area budgets, yield.

Both are systems that measure everything and reveal nothing. So the site grades
you the way the school grades students, and lays out your skills the way a chip
lays out blocks. Every section name comes from one world or the other:

| Section | In-universe name | What it really is |
|---|---|---|
| Hero | **Homeroom** | Name, one-line thesis, current status |
| Skills | **OAA Evaluation** | Six traits, honest letter grades |
| Projects | **Special Exams** | 4 projects, each with one hard constraint |
| Stack | **Floorplan / The Die** | Skills as silicon area you hover |
| History | **Semester Log** | Timeline |
| Contact | **End of Day** | Links |

**Do not** name sections "About / Projects / Skills / Contact". The naming *is*
the concept.

---

## 2. Master build prompt

> Paste this into Claude, v0, Cursor, Lovable — anything that writes a page.
> Replace the bracketed lines with your own facts first.

```
Build a single-page personal portfolio as one self-contained HTML file
(inline CSS and JS, no build step, no framework).

WHO IT'S FOR
A second-year university data science student. Obsessed with machine learning
systems and the silicon underneath them — Intel, AMD, NVIDIA accelerators.
Wants internships at chip and AI-infrastructure companies.
Name: [YOUR NAME]. Links: [GITHUB] [LINKEDIN] [EMAIL].

CONCEPT
"An elite Japanese school's student register, printed on a silicon die."
Visual register of Classroom of the Elite: cold, quiet, institutional, overcast.
Structural register of a chip floorplan: grids, area budgets, hairlines.
Section names come from those two worlds, never from the generic portfolio
vocabulary. Use: Homeroom / OAA Evaluation / Special Exams / Floorplan /
Semester Log / End of Day.

ART DIRECTION — restraint is the whole point
This must feel like a still frame from a quiet classroom scene at 4pm, not like
an action anime. Calm, subtle, a lot of empty space, hairline rules, nothing
glowing or neon. If a decision could be described as "flashy", make the other one.

COLOR — cold institutional light, NOT warm cream, NOT purple gradients
  ground     #e6e9ee   blue-biased grey paper
  surface    #f6f7f9
  ink        #151920   cold near-black
  ink-soft   #5a6373
  rule       #c7cdd7   hairlines
  navy       #2f4d6e   blazer navy, the primary accent
  window     #94a9bd   light through glass
  crimson    #9c2a2c   used EXACTLY ONCE on the whole page
  sun        #c2853c   only ever driven by scroll, never static
Dark theme is the same room at 9pm: ground #0e1218, surface #161b23,
ink #dee4ec, rule #28303c, navy lifts to #7ea9d2, crimson to #c9474a.
Define every colour as a CSS custom property on :root. Redefine ONLY the
properties inside `@media (prefers-color-scheme: dark){ :root:not([data-theme="light"]) }`
and `:root[data-theme="dark"]`. Never declare a colour whose only definition
lives inside a media query.

TYPE — three faces, from Google Fonts
  Display: Shippori Mincho B1   (a Japanese mincho serif — gives the light-novel
                                 register; use 600/800 weights, tight tracking)
  Body:    Zen Kaku Gothic New  (calm humanist gothic, 300/400/500)
  Data:    JetBrains Mono       (grades, labels, telemetry, 10-11px, uppercase,
                                 .14em letter-spacing)
Do not use Inter, Space Grotesk, Poppins, Playfair or Montserrat.
Headline scale clamp(44px, 8.2vw, 96px). Body 16px/1.75. Prose max 64ch.

LAYOUT
Fixed 74px left rail down the full height — a class-register spine. In it: a
seal glyph at top, six tick marks (one per section, the active one grows from
9px to 22px and the label slides out on hover), and a vertical clock at the
bottom. Content sits in a 1000px column to the right of the rail. Two full-bleed
moments only: the hero and the die. Everything else is hairline-ruled rows.
Below 880px the rail becomes a 52px top bar and labels hide.

THE SIGNATURE MOVE — scroll drives the sun
Set a CSS variable --sun from 0 to 1 based on scroll progress. It drives three
things at once:
  1. A fixed full-page warm gradient wash (multiply in light, screen in dark)
     that goes from neutral morning to amber afternoon to blue dusk.
  2. The rotation of the hero's light shafts (9deg to 22deg) — the sun moves
     across the window as you read.
  3. A clock in the rail counting 08:20 to 19:05.
Reading the page takes one school day. This is the one idea to get right.

SECTIONS
1. HOMEROOM (100svh). Full-bleed background: diagonal light shafts through a
   window (repeating-linear-gradient masked with a radial-gradient so it fades
   at the edges, blurred 1.4px), a faint horizontal blind pattern, and a canvas
   of ~80 slow-drifting dust motes. Foreground: a mono eyebrow with a small
   crimson dot, a huge mincho name, a 46ch tagline, and a four-cell status
   strip between two hairlines (Focus / Currently / Weather / Status).
   The name is contenteditable and persists to localStorage, so a visitor can
   type their own — wrap every localStorage call in try/catch.
2. OAA EVALUATION. Six rows, each: skill name, one-line honest description,
   a 2px bar that fills on scroll-into-view, and a big mincho letter grade
   right-aligned. Exactly one grade is crimson. Grades: A, A-, B+, B, A-, A+.
3. SPECIAL EXAMS. Four projects. Grid of [number | title+description+tool tags |
   a single result number]. On hover the row's background fades in from behind
   with a negative-inset pseudo-element — no lift, no shadow, no scale.
   Each project states the constraint it had to satisfy, not just the stack.
4. FLOORPLAN. A CSS grid of 22x12 small squares — a die. Eight named blocks each
   occupy a rectangle of cells. Hovering a legend row lights its cells in
   sequence with a 7ms stagger. The legend shows each block's area in "u²",
   so the page argues that skills compete for a fixed budget. Idle: one random
   cell dimly pulses every 260ms so the die is never fully still.
5. SEMESTER LOG. Vertical hairline, four entries, dot markers that fill crimson
   on hover.
6. END OF DAY. Contact links where the underline wipes left-to-right on hover
   (animate `right` from 100% to 0 on an ::after, 500ms).

CONTROLS (fixed top-right, two 34px squares)
  - "Room tone": WebAudio brown noise through a 620Hz lowpass at gain 0.05.
    Off by default, off-to-on ramped with setTargetAtTime. Never autoplay.
  - Theme toggle, persisted to localStorage.

MOTION
One easing curve everywhere: cubic-bezier(.16, 1, .3, 1).
Reveals: 14px rise + fade, 850ms, 55ms stagger, via IntersectionObserver,
unobserve after firing. Scroll handler must be rAF-throttled and passive.
Wrap all of it in `@media (prefers-reduced-motion: reduce)` — kill the motes
canvas entirely, set all durations to 0.01ms.

QUALITY BAR
Semantic HTML, visible :focus-visible states, tabular-nums on all figures,
no horizontal body scroll at any width, no library dependencies at all.
```

---

## 3. Your anime avatar, from your photo

**Nothing was attached to this request — no image came through.** Send the photo
and I'll write the prompt tuned to your actual face. Until then, here's the
full method.

### 3a. What to send

Four photos beats one, every time:

1. **Front, neutral, even light.** No filter, no flash, hair off the forehead.
2. **Three-quarter turn** (~30°) — this is what fixes your nose and cheekbone.
3. **Profile** — fixes jaw angle and brow projection.
4. **Half or full body, standing straight** — fixes proportion and shoulder line.

Plus one *candid* photo where you look like yourself, not posed. That one
carries the expression.

### 3b. The detail checklist

An image model will invent anything you don't name. Fill this in and paste it
into the prompt — these are the traits that make an anime face read as *you*:

```
Face shape      oval / round / square / heart / long   + jaw: soft or defined
Skin tone       describe in plain words + undertone (warm, neutral, cool)
Hairline        straight / widow's peak / receding at temples
Hair            length, texture (coily 4c, wavy, straight), how it's parted,
                how it sits when untouched, edges/lineup if you keep one
Eyebrows        thickness, arch or straight, distance from the eye, gap
Eyes            shape (almond/round/hooded/monolid), tilt (up or down at outer
                corner), iris colour, lash density, how much lid shows
Nose            bridge height, width at the base, nostril shape, tip
Lips            fullness upper vs lower, cupid's bow, natural resting line
Ears            size, whether they sit flat or stick out
Marks           moles, freckles, scar, dimples, birthmark — KEEP THESE, they are
                the single strongest identity signal in a stylised drawing
Facial hair     shape and density, or none
Glasses         frame shape, colour, thickness, where they sit
Build           height impression, shoulder width, slim/athletic/broad, posture
Hands           if visible — long fingers, etc.
Signature       the one thing friends would draw you with: a chain, a watch,
                a specific hoodie, headphones round the neck
```

**Rule:** name three things you will *not* let it change. Mine would be the mole,
the hairline, and the eye tilt. Anime stylisation eats those first.

### 3c. The image prompt

```
Anime character portrait in the visual style of the Classroom of the Elite
anime adaptation. Muted, restrained, realistic-proportioned anime — NOT
big-eyed moe, NOT shonen action art.

STYLE SPECIFICATION
Thin, precise, even-weight linework with no thick outer contour.
Soft two-tone cel shading with a single soft-edged shadow pass; no rim light,
no glow, no lens flare, no speed lines.
Desaturated cool palette: blue-grey shadows, cool neutral skin shading.
Realistic head-to-body proportion (about 1:7.5), realistic eye size — eyes
about one eye-width apart, detailed iris with a soft gradient and one small
highlight, thin restrained lashes.
Calm, closed-mouth, slightly detached expression. Eyes looking just past the
viewer, not at them. Composed, not smiling.
Flat, low-contrast background with soft depth-of-field falloff.

SUBJECT
[paste your filled-in checklist here]

WARDROBE
A university student, not a high-schooler: a dark navy overshirt or knit over a
plain white tee, or a charcoal quarter-zip. Neat but not a uniform.
Optional: a lanyard, a thin silver watch, headphones resting on the neck.

LIGHTING AND FRAMING
Late-afternoon light from a window at camera left, coming in at a low angle.
Cool ambient fill. Faint dust visible in the light. Upper-body framing,
three-quarter turn, head slightly lowered, eye level with the viewer.

DO NOT
Do not enlarge the eyes. Do not slim or reshape the jaw. Do not lighten the
skin tone. Do not remove moles, freckles or scars. Do not add a smile.
Do not add glow, sparkles, neon, or a busy background.
```

### 3d. Render the set, not one picture

The site needs a *character*, so generate a sheet in one session with the same
seed and reference:

| Asset | Use | Prompt add-on |
|---|---|---|
| **Hero portrait** | Homeroom, right side | as above, upper body, looking away |
| **Seated at a desk** | Hero alternate | side view, laptop, window light |
| **Neutral bust** | The "student ID" card | flat grey background, front-facing |
| **Three expressions** | Micro-reactions on hover | neutral / faint smile / thinking |
| **Silhouette, back turned** | End of Day section | walking away down a corridor |
| **Line-art only, no colour** | Loading state, watermark | flatten to strokes |

Export everything as **PNG with a transparent background** so you can composite
the character over your own light shafts and control the atmosphere in CSS
rather than baking it into the image.

Tools that hold a face consistent across a set, in order of how well they do it:
Midjourney with `--cref <your image URL> --cw 80` (highest likeness control),
NanoBanana / Gemini image editing (best at "keep this face, change the pose"),
Stable Diffusion with an IP-Adapter FaceID + a LoRA trained on ~20 of your
photos (most control, most work), Leonardo.ai Character Reference (easiest).

**A hard warning:** the character must be *you*, drawn. If the result looks like
a generic anime boy, the whole site loses its point — the recruiter's takeaway
becomes "nice template" instead of "I remember that person".

---

## 4. Interaction spec — calm but never inert

You asked for subtle, calm and interactive at once. Those pull against each
other, and the resolution is: **one thing moves at a time, and it always moves
slowly.**

Rules that produce it:

1. **One easing curve for the entire site.** `cubic-bezier(.16, 1, .3, 1)`.
   Shared easing is what makes separate animations feel like one hand made them.
2. **Nothing under 400ms.** Snappy reads as cheap here. Reveals 850ms, hovers
   450–500ms.
3. **Hover changes *one* property.** A line grows. A background fades in. A row
   shifts 11px right. Never lift + scale + shadow + colour together.
4. **No motion without cause.** Nothing loops except the dust and one dim cell
   on the die — both are *atmosphere*, both are nearly invisible.
5. **The page has a state, and scroll is the only control.** The sun, the clock,
   the rail. This is the difference between "animated" and "alive".

Additions worth building once the base is up:

- **Reading light.** A very faint radial gradient following the cursor at ~6%
  opacity — the room responds to where you're looking. Disable on touch.
- **Chapter cut.** When a new section crosses the top, the rail tick draws
  itself in over 450ms. A scene change, not a page transition.
- **A grade that changes.** One skill on the OAA panel updates from a JSON file
  with a `lastUpdated` date. It proves the site is maintained.
- **Rain mode.** Press `R` for overcast: shafts fade, a canvas rain layer, room
  tone shifts. Classroom of the Elite is half rain. Nobody will find it, and
  the one person who does will remember you.
- **The empty-seat easter egg.** Scroll to the very bottom, wait 4 seconds, and
  a single line fades in: a desk stays reserved until the student stops showing
  up. Undersell it. That's the register's voice.

---

## 5. How to make it rich

Two readings of "rich" — the site itself, and your bank account. Both matter.

### 5a. Make the site rich in substance

A beautiful shell over four thin projects is transparent to anyone hiring. Depth
is what converts.

- **Write up one project properly.** Not a README — a 1,500-word case study with
  the failed approach in it. "Here's what I tried that didn't work" is the
  single most credible thing a student can publish.
- **Put a live thing on the page.** A GPU price-per-TFLOP chart that updates
  weekly from your own scraper. It costs a cron job and it proves you ship
  something that stays running, which is rarer than any project.
- **Show a profiler screenshot.** For the kernel work, put the Nsight timeline
  on the page. Almost nobody does, and the people who hire for this notice.
- **Number every claim.** "3.4× over naive at 71% of theoretical bandwidth"
  beats "optimised CUDA kernels" by an enormous margin.
- **Keep an honest changelog.** A dated log of what you learned each month. It
  turns a static portfolio into evidence of slope, and slope is what juniors
  are actually hired on.
- **One page per project, at a real URL** you can paste into an application
  without sending someone to a homepage first.

### 5b. Make it earn

Ordered by how fast a second-year student can realistically start:

1. **Sell this template.** You'll have a genuinely distinctive anime-portfolio
   theme with a real design system. Gumroad at $19–39, or ThemeForest. The
   anime-dev-portfolio niche is crowded with the same three neon looks; a calm
   one has no competition. This is the fastest money on the list.
2. **Anime-fy other people's portfolios.** You will have built the pipeline —
   photo to consistent character set to deployed site. Charge $150–400. Your own
   site is the entire sales pitch, and every client site links back to you.
3. **Freelance data work.** Upwork/Contra: scraping, dashboards, cleaning. Start
   at $25–40/hr with the price-performance project as the proof.
4. **Write the semiconductor analysis publicly.** A newsletter doing honest
   $/TFLOP and earnings-language analysis on Intel/AMD/NVIDIA. There's real
   appetite and very few people writing it with actual statistics. Sponsors
   arrive around 1,000 subscribers; more importantly, this is what gets you
   noticed by the exact companies you named.
5. **Teach what you just learned.** "CUDA for people who only know Python" as a
   short paid course or a YouTube series. Being two months ahead of your
   audience is an advantage, not a disqualification — you still remember the
   confusion.
6. **Competitions with real prizes.** Kaggle, and specifically the vendor ones:
   NVIDIA's GTC contests, AMD's ROCm bounties, open-source kernel bounties.
   These pay *and* they're the most direct line into those companies.
7. **Open source with intent.** A small, genuinely useful tool — a profiler-log
   parser, a price tracker — with good docs. GitHub Sponsors is a trickle, but
   maintainership is a hiring signal that outranks any internship.

**The order that actually works:** ship the site → write one deep case study →
sell the template → let that fund the newsletter → let the newsletter get you
the internship. Each step pays for the next one.
