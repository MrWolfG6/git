/* ═══════════════════════════════════════════════════════════
   THE LINEUP
   Six electric, two combustion. The combustion cars are what is
   left of the skunkworks OMEN started as; they are being wound
   down, and they sound like it.

   Paint codes are OMEN's own: OM- and three digits, one library,
   shared across the range so a code means the same thing on
   every car.
   ═══════════════════════════════════════════════════════════ */

export const PAINTS = {
  'OM-010': { code: 'OM-010', name: 'Umbra',        hex: '#15151d', metal: 0.55, rough: 0.30, price: 0 },
  'OM-024': { code: 'OM-024', name: 'Penumbra',     hex: '#2c2d36', metal: 0.75, rough: 0.26, price: 0 },
  'OM-037': { code: 'OM-037', name: 'Ash',          hex: '#6f707a', metal: 0.82, rough: 0.30, price: 3200 },
  'OM-041': { code: 'OM-041', name: 'Bone',         hex: '#e4dfd4', metal: 0.05, rough: 0.34, price: 3200 },
  'OM-058': { code: 'OM-058', name: 'Low Tide',     hex: '#1c2c36', metal: 0.78, rough: 0.22, price: 6400 },
  'OM-066': { code: 'OM-066', name: 'Graphite, satin', hex: '#2e2f35', metal: 0.35, rough: 0.66, price: 12800 },
  'OM-072': { code: 'OM-072', name: 'Salt',         hex: '#c9c6bf', metal: 0.55, rough: 0.26, price: 6400 },
  'OM-089': { code: 'OM-089', name: 'Deep Field',   hex: '#161c2e', metal: 0.72, rough: 0.20, price: 6400 },
  'OM-093': { code: 'OM-093', name: 'Signal White', hex: '#eeece6', metal: 0.00, rough: 0.40, price: 0 },
  'OM-105': { code: 'OM-105', name: 'Bare Weave',   hex: '#1d1e23', metal: 0.40, rough: 0.52, price: 38000 },
  'OM-118': { code: 'OM-118', name: 'Overcast',     hex: '#8f929a', metal: 0.60, rough: 0.34, price: 3200 }
};

/* wheel styles the builder knows; each car offers its own first */
export const WHEELS = {
  aero:    { id: 'aero',    name: 'Aero disc, umbra',        price: 5400 },
  spoke:   { id: 'spoke',   name: 'Forged, open spoke',      price: 5400 },
  race:    { id: 'race',    name: 'Centre-lock, magnesium',  price: 14200 },
  terrain: { id: 'terrain', name: 'Forged, terrain',         price: 5400 },
  cover:   { id: 'cover',   name: 'Flush cover, body colour', price: 5400 }
};

export const OPTIONS = {
  interior: [
    { id: 'felt',  name: 'Wool felt, penumbra',      price: 0 },
    { id: 'micro', name: 'Recycled microfibre, ash', price: 2900 },
    { id: 'knit',  name: 'Technical knit, bone',     price: 4100 }
  ],
  packs: [
    { id: 'night', name: 'Night read — thermal forward camera', price: 7600 },
    { id: 'telem', name: 'Track telemetry, 1 kHz logging',      price: 4200 },
    { id: 'roof',  name: 'Electrochromic roof',                 price: 3900 }
  ]
};

export const WORLDS = {
  spine:   { id: 'spine',   name: 'THE SPINE',   sub: 'Coastal motorway. Traffic both ways.' },
  salt:    { id: 'salt',    name: 'SALT',        sub: 'Desert strip. Neon at the edge of nothing.' },
  circuit: { id: 'circuit', name: 'THE CIRCUIT', sub: 'Grand Prix. Full grid, five lights.' }
};

export const CARS = [
  {
    id: 'augur', name: 'AUGUR', type: 'Saloon', proto: 'augur',
    drivetrain: 'Quad motor, 1020 hp', fuel: 'ev', price: 214000,
    thesis: 'Reads the road 200 metres ahead.',
    body: 'Four doors, four motors, one forward sensor array. AUGUR samples the surface 200 m ahead — camber, standing water, a change of grip — and sets damping and torque split before the tyres arrive. The forecast is drawn as a single hairline across the base of the windscreen. When the line moves, something is coming.',
    specs: [['Power', '1020 hp · 750 kW'], ['0–100 km/h', '2.3 s'], ['Top speed', '305 km/h'], ['Mass', '2240 kg'], ['Range, WLTP', '640 km'], ['Read distance', '200 m']],
    highlights: [
      ['Forward read', 'Lidar and a surface camera sample the road at 2 kHz. Dampers are set 0.6 s before contact.'],
      ['Four motors', 'One per wheel. Torque crosses an axle in 4 ms.'],
      ['The line', 'One hairline at the base of the windscreen. It tilts before the car does.'],
      ['800 V', '10–80 % in 18 minutes on a 350 kW charger.']
    ],
    paints: ['OM-037', 'OM-010', 'OM-058', 'OM-041'],
    audio: { kind: 'ev', idle: 0, redline: 18000, whine: 0.9, inverter: 0.55, pitch: 1.0 },
    drive: { mass: 2240, power: 1020, grip: 1.18, topSpeed: 305, world: 'spine' }
  },
  {
    id: 'herald', name: 'HERALD', type: 'Grand tourer', proto: 'herald',
    drivetrain: 'Dual motor, 780 hp', fuel: 'ev', price: 188000,
    thesis: '900 km. It tells you where to stop before you need to.',
    body: 'HERALD is built for distance. Wind, gradient and air temperature along the route are read in advance, so the range it shows is the range you arrive with. Rain is read from radar and wiper data together; traction settings change before the first drop reaches the glass.',
    specs: [['Power', '780 hp · 574 kW'], ['0–100 km/h', '3.1 s'], ['Top speed', '290 km/h'], ['Mass', '2080 kg'], ['Range, WLTP', '900 km'], ['Charge 10–80 %', '21 min']],
    highlights: [
      ['Range forecast', 'Route, wind and temperature, read ahead. Error at arrival: under 2 %.'],
      ['Weather read', 'Radar and wiper data fused. Traction maps change before the rain does.'],
      ['Two motors', 'Rear-biased. The front motor decouples above 130 km/h.'],
      ['Load', 'Two seats, two occasional. 480 L of luggage.']
    ],
    paints: ['OM-089', 'OM-024', 'OM-072', 'OM-118'],
    audio: { kind: 'ev', idle: 0, redline: 16000, whine: 0.7, inverter: 0.35, pitch: 0.82 },
    drive: { mass: 2080, power: 780, grip: 1.10, topSpeed: 290, world: 'spine' }
  },
  {
    id: 'vigil', name: 'VIGIL', type: 'Off-roader', proto: 'vigil',
    drivetrain: 'Quad motor, 850 hp', fuel: 'ev', price: 176000,
    thesis: 'It reads the ground under the ground.',
    body: 'A downward radar classifies the surface 30 m ahead: sand, mud, rock, ice. VIGIL chooses one of three locking modes from that and from its own slip history, and torque-vectors across each axle to hold a line. You can override it. It will show you what it would have done.',
    specs: [['Power', '850 hp · 625 kW'], ['0–100 km/h', '3.4 s'], ['Top speed', '250 km/h'], ['Mass', '2610 kg'], ['Wading depth', '900 mm'], ['Ground clearance', '310 mm']],
    highlights: [
      ['Three locks', 'OPEN, BIAS, LOCKED. Chosen from surface read and slip history. Overridable.'],
      ['Torque vectoring', 'Four motors, no mechanical differentials. Each wheel is told separately.'],
      ['Surface read', 'Downward radar at 30 m. Sand, mud, rock and ice classified at 50 Hz.'],
      ['Wading', '900 mm. Sealed cells, sealed inverters.']
    ],
    paints: ['OM-066', 'OM-072', 'OM-010', 'OM-118'],
    audio: { kind: 'ev', idle: 0, redline: 15000, whine: 0.6, inverter: 0.7, pitch: 0.7 },
    drive: { mass: 2610, power: 850, grip: 1.0, topSpeed: 250, world: 'salt' }
  },
  {
    id: 'corvid', name: 'CORVID', type: 'Coupé', proto: 'corvid',
    drivetrain: 'Rear motor, 600 hp', fuel: 'ev', price: 124000,
    thesis: 'Light. 1380 kg.',
    body: 'One motor, at the back. A carbon tub, a structural pack of 62 kWh and nothing else that is not needed. CORVID is the smallest OMEN and the one that reads you rather than the road: steering rate, brake pressure, where you look. It adjusts to the driver you are that day.',
    specs: [['Power', '600 hp · 441 kW'], ['0–100 km/h', '3.2 s'], ['Top speed', '280 km/h'], ['Mass', '1380 kg'], ['Range, WLTP', '420 km'], ['Weight split', '44 / 56']],
    highlights: [
      ['1380 kg', 'Carbon tub, structural battery, aluminium subframes.'],
      ['Rear motor', 'Single motor, rear axle, e-differential.'],
      ['Driver read', 'Steering rate and brake pressure are logged. The car calibrates to them.'],
      ['4.28 m', 'Short overhangs. Wheelbase 2.50 m.']
    ],
    paints: ['OM-041', 'OM-024', 'OM-058'],
    audio: { kind: 'ev', idle: 0, redline: 20000, whine: 1.0, inverter: 0.45, pitch: 1.2 },
    drive: { mass: 1380, power: 600, grip: 1.28, topSpeed: 280, world: 'circuit' }
  },
  {
    id: 'eclipse', name: 'ECLIPSE', type: 'Hypercar', proto: 'eclipse',
    drivetrain: 'Quad motor, 1600 hp', fuel: 'ev', price: 2400000,
    thesis: 'Everything OMEN knows, at once.',
    body: 'The halo car. Every system in the range, run together and run harder: forward read at 300 m, active aerodynamics that move before the load arrives, and four motors with 1600 hp between them. Sixty-four will be built. Each is registered to a driver, not a buyer.',
    specs: [['Power', '1600 hp · 1177 kW'], ['0–100 km/h', '1.9 s'], ['Top speed', '400 km/h'], ['Mass', '1780 kg'], ['Downforce', '1100 kg at 300 km/h'], ['Build', '64 units']],
    highlights: [
      ['Forward read, 300 m', 'The longest read in the range. Aero trims to the corner before turn-in.'],
      ['Active surfaces', 'Front flaps and rear plane, set 0.4 s ahead of load.'],
      ['Four motors', '1600 hp. Torque vectored per wheel at 1 kHz.'],
      ['64', 'Numbered. Registered to the person who drives it.']
    ],
    paints: ['OM-010', 'OM-105', 'OM-093', 'OM-089'],
    audio: { kind: 'ev', idle: 0, redline: 24000, whine: 1.25, inverter: 0.8, pitch: 1.4 },
    drive: { mass: 1780, power: 1600, grip: 1.55, topSpeed: 400, world: 'circuit' }
  },
  {
    id: 'portent', name: 'PORTENT', type: 'Concept', proto: 'portent',
    drivetrain: 'In-wheel, 900 hp', fuel: 'ev', price: 1150000,
    thesis: 'No steering wheel. It already knows.',
    body: 'Four in-wheel motors, no driveshafts, no steering column. PORTENT is steered through two grips by wire, and most of the time it is not steered at all: it reads the route and holds it. The cabin is a single volume with the forecast projected across the glass.',
    specs: [['Power', '900 hp · 662 kW'], ['0–100 km/h', '2.9 s'], ['Top speed', '260 km/h'], ['Mass', '1950 kg'], ['Motors', '4, in-wheel'], ['Controls', 'Two grips, by wire']],
    highlights: [
      ['No column', 'Steer-by-wire through two grips. No wheel, no rack.'],
      ['In-wheel', 'Four hub motors. The floor is flat end to end.'],
      ['Glass forecast', 'The route ahead, projected across the windscreen.'],
      ['Series', 'Forty cars. Delivered with the software that learns the owner.']
    ],
    paints: ['OM-093', 'OM-072', 'OM-089'],
    audio: { kind: 'ev', idle: 0, redline: 17000, whine: 0.5, inverter: 1.0, pitch: 1.6 },
    drive: { mass: 1950, power: 900, grip: 1.12, topSpeed: 260, world: 'salt' }
  },
  {
    id: 'kestrel', name: 'KESTREL', type: 'Track car', proto: 'kestrel',
    drivetrain: '4.0 V8 NA, 620 hp', fuel: 'ice', price: 395000,
    thesis: 'Combustion. The last of it that revs.',
    body: 'KESTREL is a homologation special from the skunkworks OMEN began as: a naturally aspirated 4.0 V8 to 9200 rpm, a dog-ring gearbox and a wing that exists for one reason. It is the only OMEN that reads nothing for you. The instrument is the engine note.',
    specs: [['Power', '620 hp at 9000 rpm'], ['0–100 km/h', '3.0 s'], ['Top speed', '318 km/h'], ['Mass', '1290 kg'], ['Engine', '4.0 V8, flat-plane'], ['Redline', '9200 rpm']],
    highlights: [
      ['Flat-plane V8', 'Naturally aspirated. 155 hp per litre.'],
      ['Homologation', '250 road cars, built so the race car could exist.'],
      ['Swan-neck wing', 'Mounted from above. The underside stays clean.'],
      ['Dog-ring box', 'Seven speeds, 40 ms shifts.']
    ],
    paints: ['OM-093', 'OM-037', 'OM-010'],
    audio: { kind: 'v8', cylinders: 8, idle: 1050, redline: 9200, turbo: 0, whine: 0.08 },
    drive: { mass: 1290, power: 620, grip: 1.42, topSpeed: 318, world: 'circuit' }
  },
  {
    id: 'seer', name: 'SEER', type: 'Prototype racer', proto: 'seer',
    drivetrain: '3.0 V6 turbo hybrid, 940 hp', fuel: 'ice', price: 1900000,
    thesis: 'The race car. It reads the race.',
    body: 'SEER is the prototype OMEN runs in endurance racing: a 3.0 V6 twin-turbo with a 160 kW motor on the front axle. Its strategy software reads tyre wear, fuel and traffic and calls the stint before the engineer does. Supplied with a season of trackside support. Not road legal.',
    specs: [['Power', '940 hp combined'], ['0–100 km/h', '2.4 s'], ['Top speed', '340 km/h'], ['Mass', '1030 kg'], ['Engine', '3.0 V6 twin-turbo'], ['Hybrid', '160 kW, front axle']],
    highlights: [
      ['Stint read', 'Tyre, fuel and traffic modelled live. The call arrives a lap early.'],
      ['Hybrid', '160 kW front motor. Deploys out of every corner.'],
      ['1030 kg', 'Carbon monocoque. Ballast to regulation.'],
      ['Aero', 'Full-width rear plane, central fin.']
    ],
    paints: ['OM-093', 'OM-010', 'OM-058'],
    audio: { kind: 'v6t', cylinders: 6, idle: 1400, redline: 11000, turbo: 0.95, whine: 0.35 },
    drive: { mass: 1030, power: 940, grip: 1.72, topSpeed: 340, world: 'circuit' }
  }
];

export const BY_ID = Object.fromEntries(CARS.map(c => [c.id, c]));
export const paintsFor = car => car.paints.map(code => PAINTS[code]);

/* the car's own wheel first, at no cost, then two alternatives */
export function wheelsFor(car, protoWheel) {
  const others = ['aero', 'spoke', 'race'].filter(w => w !== protoWheel).slice(0, 2);
  return [{ ...WHEELS[protoWheel], price: 0 }, ...others.map(w => WHEELS[w])];
}
