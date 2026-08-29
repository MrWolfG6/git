/* ═══════════════════════════════════════════════════════════
   THE COLLECTION
   One record per car: what the showroom shows, what the detail
   page reads, what the simulator drives and what it sounds like.

   `sketchfab` is the model shown in the showcase and on the detail
   page. `proto` is the runtime-built stand-in used by the driving
   simulator — a Sketchfab embed is a sandboxed iframe, so its
   geometry can never be handed to a physics loop.
   ═══════════════════════════════════════════════════════════ */

export const CARS = [
  {
    id: 'maybach',
    name: 'Mercedes-Maybach S 680',
    short: 'Maybach',
    year: '2022',
    line: 'The chauffeur’s bench, and the owner’s.',
    blurb: 'Two-tone by hand over eleven days. A V12 that never announces itself, executive rear seats with calf massage, and a champagne flute holder machined from solid.',
    sketchfab: '979f37a878f04b2a8d888b62ea6027e9',
    credit: { author: 'Mpgs.studio3DModels', authorUrl: 'https://sketchfab.com/mpgs.studio', modelUrl: 'https://sketchfab.com/3d-models/mercedes-benz-maybach-2022-979f37a878f04b2a8d888b62ea6027e9' },
    price: '£198,500',
    specs: [
      ['Engine', '6.0 V12 biturbo'], ['Power', '612 hp'], ['Torque', '900 Nm'],
      ['0 — 100 km/h', '4.5 s'], ['Top speed', '250 km/h'], ['Drive', '4MATIC']
    ],
    highlights: ['Hand-finished two-tone', 'Executive rear package', 'Burmester 4D · 31 speakers', 'Rear-axle steering'],
    paints: [
      { name: 'Obsidian Black',  code: 'MANUFAKTUR 197', hex: '#0a0a0c', metal: 0.92, rough: 0.16 },
      { name: 'Nautical Blue',   code: 'MANUFAKTUR 3590', hex: '#16365e', metal: 1.0,  rough: 0.18 },
      { name: 'Cirrus Silver',   code: 'METALLIC 775',   hex: '#b9bfc6', metal: 1.0,  rough: 0.20 },
      { name: 'Rubellite Red',   code: 'MANUFAKTUR 3892', hex: '#6d0f16', metal: 0.95, rough: 0.17 }
    ],
    audio: { kind: 'v12', cylinders: 12, idle: 520, redline: 6200, growl: 0.30, whine: 0.05, turbo: 0.18 },
    drive: { mass: 2380, power: 1.00, grip: 0.92, topSpeed: 250, world: 'chicago' },
    proto: 'limousine'
  },
  {
    id: 'g700',
    name: 'Mercedes-AMG BRABUS G700',
    short: 'G 700',
    year: '2023',
    line: 'A ladder frame, dressed for Mayfair.',
    blurb: 'Three differential locks and a box section chassis, unchanged where it matters since 1979. BRABUS take the twin-turbo V8 to 700 hp and widen the arches to suit.',
    sketchfab: 'c7ef22b3cb0945eba8675733c5d95b19',
    credit: { author: 'Echoo', authorUrl: 'https://sketchfab.com/echoo.', modelUrl: 'https://sketchfab.com/3d-models/mercedes-benz-amg-brabus-g700-the-obsidian-c7ef22b3cb0945eba8675733c5d95b19' },
    price: '£232,750',
    specs: [
      ['Engine', '4.0 V8 biturbo'], ['Power', '700 hp'], ['Torque', '950 Nm'],
      ['0 — 100 km/h', '4.1 s'], ['Top speed', '240 km/h'], ['Drive', '4MATIC · 3 locks']
    ],
    highlights: ['BRABUS widebody', 'Three locking differentials', 'Carbon bonnet scoop', 'Side-exit exhaust'],
    paints: [
      { name: 'Obsidian Black',  code: 'BRABUS SIGNATURE', hex: '#08080a', metal: 0.55, rough: 0.42 },
      { name: 'Designo Platinum',code: 'MAGNO 992',        hex: '#4d5257', metal: 0.7,  rough: 0.55 },
      { name: 'Desert Sand',     code: 'MANUFAKTUR 7756',  hex: '#9c8b6d', metal: 0.6,  rough: 0.5 },
      { name: 'Emerald Green',   code: 'MANUFAKTUR 6297',  hex: '#12352a', metal: 0.9,  rough: 0.2 }
    ],
    audio: { kind: 'v8', cylinders: 8, idle: 640, redline: 6800, growl: 0.72, whine: 0.08, turbo: 0.42 },
    drive: { mass: 2620, power: 1.12, grip: 0.78, topSpeed: 240, world: 'vegas' },
    proto: 'offroader'
  },
  {
    id: 'gt3',
    name: 'Mercedes-AMG GT3 Evo',
    short: 'GT3 Evo',
    year: '2020',
    line: 'Built to a rulebook, not a brochure.',
    blurb: 'A homologated GT3 racer. Flat-plane response from the M159 V8, a rear wing you can set to the tenth of a degree, and a cabin with one seat in it.',
    sketchfab: '39e77243109f4e5cb7134b6f31c8f619',
    credit: { author: 'vecarz', authorUrl: 'https://sketchfab.com/heynic', modelUrl: 'https://sketchfab.com/3d-models/mercedes-amg-gt3-evo-2020-wwwvecarzcom-39e77243109f4e5cb7134b6f31c8f619' },
    price: 'On application',
    specs: [
      ['Engine', '6.3 V8 naturally aspirated'], ['Power', '550 hp (BoP)'], ['Torque', '650 Nm'],
      ['0 — 100 km/h', '3.2 s'], ['Top speed', '310 km/h'], ['Drive', 'Rear · sequential 6']
    ],
    highlights: ['FIA GT3 homologated', 'Adjustable rear wing', 'Carbon monocoque cell', 'Air jack system'],
    paints: [
      { name: 'Race Silver',   code: 'AMG PETRONAS', hex: '#c6ccd2', metal: 1.0, rough: 0.22 },
      { name: 'Matte Black',   code: 'TEAM LIVERY',  hex: '#0c0c0e', metal: 0.4, rough: 0.6 },
      { name: 'Petronas Teal', code: 'AMG 2020',     hex: '#00a19b', metal: 0.9, rough: 0.25 },
      { name: 'Signal Yellow', code: 'CUSTOMER',     hex: '#e8b21a', metal: 0.85, rough: 0.24 }
    ],
    audio: { kind: 'race-v8', cylinders: 8, idle: 1100, redline: 7800, growl: 0.85, whine: 0.22, turbo: 0 },
    drive: { mass: 1285, power: 1.55, grip: 1.32, topSpeed: 310, world: 'circuit' },
    proto: 'gtracer'
  },
  {
    id: 'avtr',
    name: 'Mercedes-Benz VISION AVTR',
    short: 'VISION AVTR',
    year: '2020',
    line: 'A car that breathes.',
    blurb: 'A design study with no steering wheel, thirty-three bionic flaps across its back, and a graphene-based organic cell chemistry with no rare earths in it.',
    sketchfab: '706981d31f8a48dabcfee8e893101361',
    credit: { author: 'SQUIR3D', authorUrl: 'https://sketchfab.com/SQUIR3D', modelUrl: 'https://sketchfab.com/3d-models/mercedes-benz-vision-avtr-concept-2020-706981d31f8a48dabcfee8e893101361' },
    price: 'Not for sale',
    specs: [
      ['Drive', 'Four in-wheel motors'], ['Power', '469 hp'], ['Torque', 'Instant'],
      ['0 — 100 km/h', '≈ 5.0 s'], ['Range', '700 km'], ['Battery', '110 kWh organic cell']
    ],
    highlights: ['33 bionic rear flaps', 'Crab-walk all-wheel steering', 'Rare-earth-free chemistry', 'Fully recyclable cell'],
    paints: [
      { name: 'Bioluminescent', code: 'CONCEPT', hex: '#1d3f52', metal: 0.85, rough: 0.2 },
      { name: 'Deep Space',     code: 'CONCEPT', hex: '#0b1220', metal: 0.95, rough: 0.14 },
      { name: 'Pandora Blue',   code: 'CONCEPT', hex: '#1663a8', metal: 0.9,  rough: 0.18 },
      { name: 'Bone White',     code: 'CONCEPT', hex: '#e6e3dc', metal: 0.7,  rough: 0.26 }
    ],
    audio: { kind: 'ev', cylinders: 0, idle: 0, redline: 16000, growl: 0, whine: 0.9, turbo: 0 },
    drive: { mass: 2100, power: 0.95, grip: 1.05, topSpeed: 200, world: 'vegas' },
    proto: 'concept'
  },
  {
    id: 'w14',
    name: 'Mercedes-AMG F1 W14 E Performance',
    short: 'W14',
    year: '2023',
    line: 'Fifteen thousand revs, and a rule book.',
    blurb: 'A 2023-specification Formula 1 car. Ground-effect floor, 1.6-litre turbo hybrid, and an energy store that recovers under braking into the next straight.',
    sketchfab: 'b8c8db0f800f43eda7e2be07c8d7acbe',
    credit: { author: 'Excalibur', authorUrl: 'https://sketchfab.com/excalibur', modelUrl: 'https://sketchfab.com/3d-models/f1-2023-mercedes-w14-b8c8db0f800f43eda7e2be07c8d7acbe' },
    price: 'Not for sale',
    specs: [
      ['Engine', '1.6 V6 turbo hybrid'], ['Power', '≈ 1000 hp'], ['Weight', '798 kg'],
      ['0 — 100 km/h', '2.6 s'], ['Top speed', '340 km/h'], ['Downforce', '> 1000 kg']
    ],
    highlights: ['Ground-effect venturi floor', 'MGU-K + MGU-H recovery', 'Eight-speed seamless shift', 'Carbon monocoque'],
    paints: [
      { name: 'Petronas Black', code: 'W14 RACE',  hex: '#0a0c0e', metal: 0.6, rough: 0.3 },
      { name: 'Silver Arrow',   code: 'HERITAGE',  hex: '#c9ced3', metal: 1.0, rough: 0.2 },
      { name: 'Petronas Teal',  code: 'W14 TEST',  hex: '#00b0a5', metal: 0.85, rough: 0.26 }
    ],
    audio: { kind: 'f1', cylinders: 6, idle: 4200, redline: 15000, growl: 0.45, whine: 0.75, turbo: 0.6 },
    drive: { mass: 798, power: 2.35, grip: 1.85, topSpeed: 340, world: 'circuit' },
    proto: 'openwheel'
  },
  {
    id: 'lightning',
    name: 'Mercedes-Benz Silver Lightning',
    short: 'Silver Lightning',
    year: 'Concept',
    line: 'The Silver Arrow, taken literally.',
    blurb: 'A long-tail hypercar study drawn from the pre-war Silver Arrows: a cab-rearward canopy, a spine down the deck and wheels pushed to the four corners.',
    sketchfab: '875ac57f33264a0b8efcad9dda85ab4c',
    credit: { author: 'amogusstrikesback2', authorUrl: 'https://sketchfab.com/amogusstrikesback2', modelUrl: 'https://sketchfab.com/3d-models/mercedes-benz-silver-lightning-875ac57f33264a0b8efcad9dda85ab4c' },
    price: 'On application',
    specs: [
      ['Layout', 'Mid-engine'], ['Power', '1200 hp'], ['Torque', '1100 Nm'],
      ['0 — 100 km/h', '2.4 s'], ['Top speed', '350 km/h'], ['Body', 'Carbon fibre']
    ],
    highlights: ['Cab-rearward canopy', 'Active rear aerofoil', 'Centre-lock magnesium', 'Titanium exhaust'],
    paints: [
      { name: 'Silver Arrow',  code: 'HERITAGE',  hex: '#cfd4d9', metal: 1.0,  rough: 0.16 },
      { name: 'Graphite',      code: 'MAGNO',     hex: '#33383d', metal: 0.9,  rough: 0.42 },
      { name: 'Obsidian',      code: 'GLOSS',     hex: '#08080a', metal: 0.95, rough: 0.13 }
    ],
    audio: { kind: 'v8', cylinders: 8, idle: 900, redline: 8600, growl: 0.68, whine: 0.35, turbo: 0.5 },
    drive: { mass: 1420, power: 1.85, grip: 1.35, topSpeed: 350, world: 'vegas' },
    proto: 'hypercar'
  },
  {
    id: '190e',
    name: 'Mercedes-Benz 190E 2.5-16 Evolution II',
    short: '190E Evo II',
    year: '1990',
    line: 'Five hundred and two built, because the rules said so.',
    blurb: 'A homologation special for DTM. The wing was designed in the Stuttgart wind tunnel and, whatever anyone tells you, it works. Cosworth-developed sixteen valves.',
    sketchfab: '2cb59dfa2f104d1385b184916a93ad6c',
    credit: { author: 'OUTPISTON', authorUrl: 'https://sketchfab.com/outpiston', modelUrl: 'https://sketchfab.com/3d-models/1990-mercedes-benz-190e-25-16-evolution-ii-2cb59dfa2f104d1385b184916a93ad6c' },
    price: '£285,000',
    specs: [
      ['Engine', '2.5 inline-4 · 16v'], ['Power', '235 hp'], ['Torque', '245 Nm'],
      ['0 — 100 km/h', '7.1 s'], ['Top speed', '250 km/h'], ['Built', '502 cars']
    ],
    highlights: ['Cosworth 16-valve head', 'Adjustable Evo II aerofoil', 'Self-levelling suspension', 'Matching numbers'],
    paints: [
      { name: 'Blue-Black',   code: '199 METALLIC', hex: '#0d1117', metal: 0.9,  rough: 0.2 },
      { name: 'Astral Silver',code: '735 METALLIC', hex: '#b4bac0', metal: 1.0,  rough: 0.22 },
      { name: 'Signal Red',   code: '568 SOLID',    hex: '#8c1116', metal: 0.5,  rough: 0.3 }
    ],
    audio: { kind: 'i4', cylinders: 4, idle: 820, redline: 7200, growl: 0.5, whine: 0.12, turbo: 0 },
    drive: { mass: 1340, power: 0.62, grip: 0.95, topSpeed: 250, world: 'chicago' },
    proto: 'classic'
  },
  {
    id: 'gle63',
    name: 'Mercedes-AMG GLE 63 S Coupé',
    short: 'GLE 63 S',
    year: '2021',
    line: 'A coupé that carries five and a labrador.',
    blurb: 'The hand-built M177 V8 with an integrated starter-generator, active anti-roll on 48 volts, and a roofline that costs you boot space and is worth it.',
    sketchfab: '241dde009dac40339173c213deb37d46',
    credit: { author: 'SQUIR3D', authorUrl: 'https://sketchfab.com/SQUIR3D', modelUrl: 'https://sketchfab.com/3d-models/mercedes-benz-gle-63-amg-coupe-2021-241dde009dac40339173c213deb37d46' },
    price: '£116,400',
    specs: [
      ['Engine', '4.0 V8 biturbo + EQ Boost'], ['Power', '612 hp'], ['Torque', '850 Nm'],
      ['0 — 100 km/h', '3.8 s'], ['Top speed', '280 km/h'], ['Drive', '4MATIC+ · 9G']
    ],
    highlights: ['E-Active Body Control', 'AMG Ride Control+', '22-inch cross-spoke', 'Panoramic roof'],
    paints: [
      { name: 'Obsidian Black', code: '197 METALLIC', hex: '#0a0a0c', metal: 0.92, rough: 0.16 },
      { name: 'Selenite Grey',  code: '992 MAGNO',    hex: '#4d5257', metal: 0.8,  rough: 0.5 },
      { name: 'Diamond White',  code: '799 BRIGHT',   hex: '#e8e8e6', metal: 0.75, rough: 0.24 },
      { name: 'Cavansite Blue', code: '890 METALLIC', hex: '#16365e', metal: 1.0,  rough: 0.18 }
    ],
    audio: { kind: 'v8', cylinders: 8, idle: 620, redline: 7000, growl: 0.7, whine: 0.1, turbo: 0.4 },
    drive: { mass: 2380, power: 1.05, grip: 0.88, topSpeed: 280, world: 'chicago' },
    proto: 'suvcoupe'
  }
];

export const BY_ID = Object.fromEntries(CARS.map(c => [c.id, c]));

export const WORLDS = {
  chicago: {
    id: 'chicago', name: 'Chicago', sub: 'Lake Shore Drive',
    note: 'Eight lanes along the water, with the skyline on your right.'
  },
  vegas: {
    id: 'vegas', name: 'Las Vegas', sub: 'The Strip, northbound',
    note: 'Neon on both sides and desert the moment you leave it.'
  },
  circuit: {
    id: 'circuit', name: 'Grand Prix Circuit', sub: 'Race simulation',
    note: 'A full lap against a field of AI cars, with live timing.'
  }
};

/* The Sketchfab logo model that stands in for the marque throughout */
export const LOGO = {
  sketchfab: '06e06e5e779f4192bbe4b3056718f420',
  credit: { author: 'Mehdi101', authorUrl: 'https://sketchfab.com/Mehdi101', modelUrl: 'https://sketchfab.com/3d-models/mercedes-benz-logo-06e06e5e779f4192bbe4b3056718f420' }
};
