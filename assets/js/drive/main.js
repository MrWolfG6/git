/* ═══════════════════════════════════════════════════════════
   THE SIMULATOR
   drive.html?car=<id>&world=<spine|salt|circuit>
             [&time=day|night&seat=chase|driver|passenger&laps=n&paint=OM-xxx&wheel=<style>]

   Boot, input, the loop, the HUD, the race.
   ═══════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { CARS, BY_ID, WORLDS, PAINTS } from '../cars.js';
import { PROTOS } from '../builder.js';
import { TIER, COARSE, markBooted, $, $$ } from '../common.js';
import { World } from './world.js';
import { Vehicle, CameraRig, VIEW_LABELS } from './vehicle.js';
import { AIField } from './ai.js';
import { Powertrain } from './audio.js';
import { Particles, Skids } from './particles.js';

const { gsap } = window;
/* GSAP smooths its clock across long frames. Nothing the simulation
   depends on runs on it: the lights, the lap timer and the loop all
   read wall time. */
gsap.ticker.lagSmoothing(0);

const q = new URLSearchParams(location.search);
const car = BY_ID[q.get('car')] || CARS[0];
const worldId = WORLDS[q.get('world')] ? q.get('world') : car.drive.world;
const paint = car.paints.includes(q.get('paint')) ? PAINTS[q.get('paint')] : PAINTS[car.paints[0]];
const wheel = ['aero', 'spoke', 'race', 'terrain', 'cover'].includes(q.get('wheel')) ? q.get('wheel') : PROTOS[car.proto].wheel;
const LAPS = [1, 3, 5, 10];
/* dev only: the car drives itself (&autopilot=1) and the simulation
   can take several steps per frame (&warp=n), so a whole race can be
   run end to end in a slow test browser */
const AUTO = q.get('autopilot') === '1';
const WARP = Math.max(1, Math.min(24, Math.round(+q.get('warp') || 1)));
const race = worldId === 'circuit';

const S = {
  started: false, paused: false, running: false,
  night: q.get('time') === 'night' ? 1 : 0, nightTarget: q.get('time') === 'night' ? 1 : 0,
  seat: ['chase', 'driver', 'passenger'].includes(q.get('seat')) ? q.get('seat') : 'chase',
  laps: LAPS.includes(+q.get('laps')) ? +q.get('laps') : 3,
  state: 'idle',            // idle · countdown · racing · free · finished
  crossings: 0, lapStart: 0, raceStart: 0, best: null, last: null,
  muted: false,
  /* The simulation clock, in ms: the sum of the frame deltas the
     physics actually stepped by, read from performance.now(). The
     lights and lap timer run on this, never on GSAP's ticker, and it
     simply does not advance while paused. */
  clock: 0
};

/* ═══════════ INPUT ═══════════ */
const keys = new Set();
const input = { throttle: 0, brake: 0, steer: 0, handbrake: 0 };
const touch = { throttle: 0, brake: 0, left: 0, right: 0 };

addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
  if (e.repeat) return;
  keys.add(k);
  if (k === 'c') cycleSeat();
  if (k === 'n') toggleNight();
  if (k === 'm') toggleSound();
  if (k === 'r') respawn();
  if (k === 'escape' || k === 'p') togglePause();
});
addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
addEventListener('blur', () => keys.clear());

function readInput(dt) {
  const up = keys.has('w') || keys.has('arrowup'), down = keys.has('s') || keys.has('arrowdown');
  const left = keys.has('a') || keys.has('arrowleft') || touch.left, right = keys.has('d') || keys.has('arrowright') || touch.right;
  input.throttle += (Math.max(up ? 1 : 0, touch.throttle) - input.throttle) * Math.min(1, dt * 9);
  input.brake += (Math.max(down ? 1 : 0, touch.brake) - input.brake) * Math.min(1, dt * 12);
  const want = (right ? 1 : 0) - (left ? 1 : 0);
  input.steer += (want - input.steer) * Math.min(1, dt * (want ? 6 : 10));
  input.handbrake = keys.has(' ') ? 1 : 0;
}

function bindTouch() {
  if (!COARSE) return;
  $('#touch').hidden = false;
  $('#hint').hidden = true;
  for (const b of $$('.touch button')) {
    const k = b.dataset.key;
    const on = e => { e.preventDefault(); touch[k] = 1; b.classList.add('is-down'); };
    const off = e => { e.preventDefault(); touch[k] = 0; b.classList.remove('is-down'); };
    b.addEventListener('pointerdown', on);
    b.addEventListener('pointerup', off);
    b.addEventListener('pointercancel', off);
    b.addEventListener('pointerleave', off);
  }
}

/* ═══════════ BOOT ═══════════ */
let renderer, scene, camera, composer, bloom, world, vehicle, rig, field, audio, dust, skids;
let lastT = performance.now();

function progress(p, label) {
  gsap.to('#loadBar', { scaleX: p / 100, duration: 0.4 });
  if (label) $('#loadStatus').textContent = label;
}
const frame = () => new Promise(r => requestAnimationFrame(() => r()));

async function build() {
  $('#loadCar').textContent = car.name;
  $('#loadWhere').textContent = WORLDS[worldId].name;
  progress(6, 'Warming the renderer'); await frame();

  renderer = new THREE.WebGLRenderer({ canvas: $('#view'), antialias: TIER !== 'low', powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, TIER === 'high' ? 2 : TIER === 'mid' ? 1.4 : 1));
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = TIER !== 'low';
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 4500);

  progress(24, 'Laying the road'); await frame();
  world = new World(worldId, TIER).build(scene, renderer);

  progress(50, `Building ${car.name}`); await frame();
  vehicle = new Vehicle(car, world, { tier: TIER, paint, wheel });
  scene.add(vehicle.model);
  rig = new CameraRig(camera, vehicle);

  progress(66, race ? 'Assembling the grid' : 'Letting the traffic out'); await frame();
  field = new AIField(world, race ? 'race' : 'traffic', TIER, vehicle).build(scene);
  vehicle.placeOnGrid(race ? field.playerSlot : 0);

  if (TIER !== 'low') {
    dust = new Particles(scene, TIER === 'high' ? 340 : 200);
    skids = new Skids(scene, TIER === 'high' ? 280 : 160);
  }
  buildMinimap();

  progress(84, 'Grading the image'); await frame();
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  if (TIER !== 'low') {
    bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.3, 0.6, 0.9);
    composer.addPass(bloom);
  }
  composer.addPass(new OutputPass());

  applyNight(S.night);
  rig.set(S.seat);
  rig.update(0.016);
  world.followSun(vehicle.pos);
  world.updateLightPool(vehicle.pos);
  renderer.compile(scene, camera);
  render();
  progress(100, 'Ready');
  markBooted();
  await new Promise(r => setTimeout(r, 300));
  intro();
}

/* ═══════════ INTRO ═══════════ */
function hrefWith(changes) {
  const p = new URLSearchParams(location.search);
  for (const [k, v] of Object.entries(changes)) p.set(k, v);
  p.set('car', car.id); p.set('paint', paint.code); p.set('wheel', wheel);
  return `${location.pathname}?${p}`;
}

function intro() {
  $('#introWhere').textContent = `${WORLDS[worldId].name} · ${WORLDS[worldId].sub}`;
  $('#introCar').textContent = car.name;
  $('#introLine').textContent = race
    ? `${car.thesis} A one-make grid. Five lights; when they go out, go.`
    : car.thesis;
  $('#introBack').href = `car.html?car=${car.id}&paint=${paint.code}&wheel=${wheel}`;

  $('#introWorlds').innerHTML = Object.values(WORLDS).map(w =>
    `<button class="choice${w.id === worldId ? ' is-on' : ''}" data-world="${w.id}">${w.name}</button>`).join('');
  $('#introWorlds').addEventListener('click', e => {
    const b = e.target.closest('[data-world]');
    if (b && b.dataset.world !== worldId) location.href = hrefWith({ world: b.dataset.world, time: S.nightTarget ? 'night' : 'day', seat: S.seat });
  });

  const mark = (sel, attr, val) => $$(`${sel} .choice`).forEach(b => b.classList.toggle('is-on', b.dataset[attr] === String(val)));
  mark('#introTime', 'time', S.nightTarget ? 'night' : 'day');
  $('#introTime').addEventListener('click', e => {
    const b = e.target.closest('[data-time]'); if (!b) return;
    S.nightTarget = b.dataset.time === 'night' ? 1 : 0;
    mark('#introTime', 'time', b.dataset.time);
  });
  mark('#introSeat', 'seat', S.seat);
  $('#introSeat').addEventListener('click', e => {
    const b = e.target.closest('[data-seat]'); if (!b) return;
    S.seat = b.dataset.seat; rig.set(S.seat);
    mark('#introSeat', 'seat', S.seat);
  });
  if (race) {
    $('#lapGroup').hidden = false;
    $('#introLaps').innerHTML = LAPS.map(n => `<button class="choice" data-laps="${n}">${n} lap${n > 1 ? 's' : ''}</button>`).join('');
    mark('#introLaps', 'laps', S.laps);
    $('#introLaps').addEventListener('click', e => {
      const b = e.target.closest('[data-laps]'); if (!b) return;
      S.laps = +b.dataset.laps; mark('#introLaps', 'laps', S.laps);
    });
  }

  gsap.to('#dLoad', { opacity: 0, duration: 0.6, onComplete: () => { $('#dLoad').hidden = true; } });
  $('#dIntro').hidden = false;
  gsap.fromTo('.dintro__panel', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: 'expo.out' });
  S.running = true;
  requestAnimationFrame(loop);
  $('#introGo').addEventListener('click', begin, { once: true });
}

async function begin() {
  audio = new Powertrain(car.audio);
  try { await audio.start(); } catch { /* no audio device: drive in silence */ }
  gsap.to('#dIntro', { opacity: 0, duration: 0.5, onComplete: () => { $('#dIntro').hidden = true; } });
  $('#hud').hidden = false;
  $('#hudCar').textContent = car.name;
  $('#hudWhere').textContent = WORLDS[worldId].name;
  $('#pauseCar').textContent = car.name;
  $('#pauseWhere').textContent = WORLDS[worldId].name;
  $('#pauseCarLink').href = `car.html?car=${car.id}&paint=${paint.code}&wheel=${wheel}`;
  $('#viewLabel').textContent = VIEW_LABELS[rig.view];
  $('#timeLabel').textContent = S.nightTarget ? 'Night' : 'Day';
  gsap.fromTo('.hud__tl, .hud__tr, .hud__bl, .hud__br, .read', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.06, delay: 0.3 });
  document.body.classList.add('is-driving');
  bindTouch();
  S.started = true;
  S.hintUntil = S.clock + 7000;
  if (race) startLights();
  else { S.state = 'free'; S.lapStart = S.clock; }
}

/* ═══════════ FIVE LIGHTS ═══════════
   Stepped by the loop on wall time, never by a tween: the grid must
   never be left held because a clock was smoothed away. */
function startLights() {
  S.state = 'countdown';
  const now = S.clock;
  S.lightsFrom = now + 600;
  S.lightsOut = S.lightsFrom + 5 * 1000 + 400 + Math.random() * 1400;   // five on, then a random hold
  $('#lights').hidden = false;
  $('#standings').hidden = false;
  S.bulbs = [...$('#lights').children];
}

function stepLights(now) {
  const lit = now < S.lightsFrom ? 0 : Math.min(5, 1 + Math.floor((now - S.lightsFrom) / 1000));
  S.bulbs.forEach((b, i) => b.classList.toggle('on', i < lit));
  world.setStartLights(lit);
  if (now >= S.lightsOut) {
    S.bulbs.forEach(b => b.classList.remove('on'));
    world.setStartLights(0);
    S.state = 'racing';
    S.raceStart = S.lapStart = now;
    gsap.to('#lights', { opacity: 0, duration: 0.4, delay: 0.8, onComplete: () => { $('#lights').hidden = true; } });
  }
}

/* ═══════════ CONTROLS ═══════════ */
function cycleSeat() {
  if (!S.started) return;
  S.seat = rig.cycle();
  $('#viewLabel').textContent = VIEW_LABELS[S.seat];
}
function toggleNight() {
  S.nightTarget = S.nightTarget >= 0.5 ? 0 : 1;
  $('#timeLabel').textContent = S.nightTarget ? 'Night' : 'Day';
}
function toggleSound() {
  S.muted = !S.muted;
  audio?.setMuted(S.muted || S.paused);
  $('#soundLabel').textContent = S.muted ? 'Sound off' : 'Sound on';
}
function respawn() {
  if (!S.started || S.state === 'countdown') return;
  const f = world.frameAt(vehicle.u);
  const lane = world.twoWay ? world.width * 0.3 : 0;
  vehicle.pos.copy(f.pos).addScaledVector(f.side, lane).setY(0);
  vehicle.heading = Math.atan2(f.tan.x, f.tan.z);
  vehicle.speed = Math.min(Math.abs(vehicle.speed), 10);
  vehicle.lateral = 0;
  rig.snap = true;
}
function togglePause() {
  if (!S.started || S.state === 'finished') return;
  S.paused = !S.paused;
  $('#dPause').hidden = !S.paused;
  document.body.classList.toggle('is-driving', !S.paused);
  audio?.setMuted(S.paused || S.muted);
  lastT = performance.now();
}
$('#btnView').addEventListener('click', cycleSeat);
$('#btnTime').addEventListener('click', toggleNight);
$('#btnSound').addEventListener('click', toggleSound);
$('#btnPause').addEventListener('click', togglePause);
$('#pauseResume').addEventListener('click', togglePause);
$('#pauseReset').addEventListener('click', () => { togglePause(); respawn(); });
$('#resultAgain').addEventListener('click', () => { location.href = hrefWith({ world: worldId, laps: S.laps, time: S.nightTarget ? 'night' : 'day', seat: S.seat }); });
document.addEventListener('visibilitychange', () => { if (document.hidden && S.started && !S.paused) togglePause(); });
addEventListener('resize', () => {
  if (!renderer) return;
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
}, { passive: true });

/* ═══════════ DAY / NIGHT ═══════════ */
function applyNight(t) {
  S.night = t;
  world.apply(t);
  vehicle.setNight(t);
  renderer.toneMappingExposure = 1 + t * 0.35;
  if (bloom) bloom.strength = 0.25 + t * 0.55;
}

/* ═══════════ MINIMAP ═══════════ */
let project = null, mapDots = [];
function buildMinimap() {
  const pts = [];
  for (let i = 0; i < 240; i++) pts.push(world.curve.getPointAt(i / 240));
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const p of pts) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z); }
  const span = Math.max(x1 - x0, z1 - z0), sc = 84 / span;
  const ox = 8 + (span - (x1 - x0)) * sc / 2, oz = 8 + (span - (z1 - z0)) * sc / 2;
  project = p => [ox + (p.x - x0) * sc, oz + (p.z - z0) * sc];
  const d = pts.map((p, i) => { const [x, y] = project(p); return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`; }).join('') + 'Z';
  $('#mapTrack').setAttribute('d', d);
  $('#mapLine').setAttribute('d', d);
  const [sx, sy] = project(world.curve.getPointAt(0));
  $('#mapStart').setAttribute('x', sx - 0.6); $('#mapStart').setAttribute('y', sy - 2.5);
  $('#mapAI').innerHTML = field.cars.map(() => '<circle r="1.7" fill="rgba(242,239,233,.45)"/>').join('');
  mapDots = [...$('#mapAI').children];
}
function updateMinimap() {
  const [mx, my] = project(vehicle.pos);
  $('#mapMe').setAttribute('cx', mx.toFixed(1)); $('#mapMe').setAttribute('cy', my.toFixed(1));
  field.cars.forEach((c, i) => { const [x, y] = project(c.pos); mapDots[i].setAttribute('cx', x.toFixed(1)); mapDots[i].setAttribute('cy', y.toFixed(1)); });
}

/* ═══════════ HUD ═══════════ */
const fmt = ms => {
  if (ms == null) return '—';
  const s = ms / 1000, m = Math.floor(s / 60);
  return `${m}:${(s - m * 60).toFixed(2).padStart(5, '0')}`;
};
let toastTl;
function toast(title, body, best) {
  const el = $('#toast');
  el.hidden = false;
  el.classList.toggle('is-best', !!best);
  $('#toastTitle').textContent = title;
  $('#toastBody').textContent = body;
  toastTl?.kill();
  toastTl = gsap.timeline()
    .fromTo(el, { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.4 })
    .to(el, { opacity: 0, duration: 0.5, delay: 2.2, onComplete: () => { el.hidden = true; } });
}

let readTimer = 0;
function updateHud(dt, now) {
  $('#spd').textContent = Math.round(vehicle.kmh);
  $('#gear').textContent = vehicle.gearLabel;
  $('#revFill').style.transform = `scaleX(${vehicle.rpmNorm.toFixed(3)})`;
  $('.rev').classList.toggle('is-red', vehicle.ice && vehicle.rpmNorm > 0.9);
  updateMinimap();

  if (S.state === 'racing' || S.state === 'free') $('#tCur').textContent = fmt(S.crossings ? now - S.lapStart : null);
  $('#tLap').textContent = race ? `${Math.min(Math.max(S.crossings, 1), S.laps)} / ${S.laps}` : String(Math.max(1, S.crossings));
  $('#tBest').textContent = fmt(S.best);
  $('#tLast').textContent = fmt(S.last);

  /* the forward read, ten times a second */
  readTimer -= dt;
  if (readTimer <= 0) {
    readTimer = 0.1;
    const r = world.readAhead(vehicle.u, 320, car.drive.grip);
    const straight = r.radius > 900;
    $('#readDir').textContent = straight ? 'Straight' : (r.dir > 0 ? 'Right' : 'Left') + (r.radius < 60 ? ' · tight' : '');
    $('#readDist').textContent = straight ? '320+ m' : `${Math.round(r.dist)} m`;
    const adv = straight ? car.drive.topSpeed : Math.min(car.drive.topSpeed, r.speed);
    $('#readSpeed').textContent = `${Math.round(adv / 5) * 5} km/h`;
    $('#readBar').style.transform = `scaleX(${straight ? 0 : (1 - r.dist / 320).toFixed(3)})`;
    const over = !straight && r.dist < 160 && vehicle.kmh > adv * 1.1;
    $('#read').classList.toggle('is-over', over);

    const heading = Math.cos(vehicle.heading - vehicle.trackHeading);
    const warn = vehicle.offTrack > 0.25 ? 'OFF TRACK' : over ? 'LIFT' : (race && heading < -0.3 && vehicle.kmh > 10) ? 'WRONG WAY' : vehicle.onLimiter ? 'LIMITER' : '';
    $('#warn').hidden = !warn;
    if (warn) $('#warn').textContent = warn;
  }

  if (race) {
    const rows = field.standings(S.crossings);
    const me = rows.findIndex(r => r.isPlayer);
    const from = Math.max(0, Math.min(me - 2, rows.length - 5));
    $('#standings').innerHTML = rows.slice(from, from + 5).map((r, i) =>
      `<li class="${r.isPlayer ? 'is-you' : ''}"><b>${String(from + i + 1).padStart(2, '0')}</b>${r.name}<span>${i + from === 0 ? 'LEAD' : '+' + r.gapS.toFixed(1)}</span></li>`).join('');
  }
  if (S.hintUntil && now > S.hintUntil) { $('#hint').classList.add('is-gone'); S.hintUntil = 0; }
}

/* ═══════════ LAPS ═══════════ */
function onCrossing(now) {
  S.crossings++;
  if (S.crossings > 1) {
    const t = now - S.lapStart;
    S.last = t;
    const best = S.best == null || t < S.best;
    if (best) S.best = t;
    toast(best ? 'Best lap' : `Lap ${S.crossings - 1}`, fmt(t), best);
  }
  S.lapStart = now;
  if (race && S.crossings > S.laps && S.state === 'racing') finish(now);
}

/* ═══════════ CHEQUERED FLAG ═══════════ */
function finish(now) {
  S.state = 'finished';
  const total = now - S.raceStart;
  const rows = field.standings(S.crossings);
  const place = rows.findIndex(r => r.isPlayer) + 1;
  const ord = n => (n % 100 >= 11 && n % 100 <= 13) ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th');
  $('#resultPlace').innerHTML = `${place}<sup>${ord(place)}</sup>`;
  $('#resultSub').textContent = `${car.name} · ${S.laps} lap${S.laps > 1 ? 's' : ''} · ${fmt(total)} · best ${fmt(S.best)}`;
  /* the leader's time, then gaps to the leader; laps down where they are */
  const me = rows[place - 1];
  const leaderTotal = total - me.gapS * 1000;
  $('#resultTable').innerHTML = rows.map((r, i) => {
    const down = Math.floor(r.gapM / world.length + 1e-6);
    const gap = i === 0 ? fmt(leaderTotal) : down >= 1 ? `+${down} lap${down > 1 ? 's' : ''}` : `+${r.gapS.toFixed(1)} s`;
    const laps = Math.min(S.laps, Math.max(0, r.lap - 1));
    return `<tr class="${r.isPlayer ? 'is-you' : ''}"><td>${String(i + 1).padStart(2, '0')}</td><td>${r.name}</td><td>${laps}</td><td>${gap}</td></tr>`;
  }).join('');
  $('#resultCar').href = `car.html?car=${car.id}&paint=${paint.code}&wheel=${wheel}`;
  $('#dResult').hidden = false;
  gsap.fromTo('.dresult__panel', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: 'expo.out' });
  gsap.fromTo('#resultTable tr', { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.5, stagger: 0.04, delay: 0.3 });
  document.body.classList.remove('is-driving');
  audio?.setVolume(0.3);
}

/* ═══════════ TYRES ═══════════ */
const DUST = { spine: new THREE.Color(0.7, 0.72, 0.76), salt: new THREE.Color(0.86, 0.84, 0.78), circuit: new THREE.Color(0.66, 0.68, 0.64) };
const SMOKE = new THREE.Color(0.8, 0.8, 0.83);
let lastContact = null;
function effects(dt) {
  if (!dust) return;
  const slip = vehicle.slip, kmh = vehicle.kmh;
  if (slip > 0.4 && kmh > 12) {
    const col = vehicle.offTrack > 0.1 ? DUST[worldId] : SMOKE;
    const drift = { x: -Math.sin(vehicle.heading) * 1.5, z: -Math.cos(vehicle.heading) * 1.5 };
    for (let i = 0; i < (slip > 0.9 ? 2 : 1); i++) {
      dust.emit(vehicle.contactL, 0.3, 0.34 + slip * 0.26, col, drift, 1.1 + Math.random() * 0.7);
      dust.emit(vehicle.contactR, 0.3, 0.34 + slip * 0.26, col, drift, 1.1 + Math.random() * 0.7);
    }
  }
  dust.update(dt);
  if (slip > 0.35 && kmh > 12 && vehicle.offTrack < 0.15 && lastContact)
    skids.lay({ a: lastContact.l, b: vehicle.contactL }, { a: lastContact.r, b: vehicle.contactR }, Math.min(1, (slip - 0.35) * 1.5));
  skids.fade(dt);
  lastContact = { l: vehicle.contactL.clone(), r: vehicle.contactR.clone() };
}

/* ═══════════ LOOP ═══════════ */
let lastU = 0;
function loop() {
  if (!S.running) return;
  requestAnimationFrame(loop);
  const wall = performance.now();
  const dt = Math.min((wall - lastT) / 1000, 0.05);
  lastT = wall;
  if (S.paused) return;

  if (Math.abs(S.night - S.nightTarget) > 0.001) applyNight(S.night + (S.nightTarget - S.night) * Math.min(1, dt * 1.8));

  if (S.started) {
    for (let k = 0; k < WARP; k++) step(dt);
    rig.update(dt * WARP);
    updateHud(dt, S.clock);
    document.documentElement.style.setProperty('--speed', Math.min(1, vehicle.kmh / (car.drive.topSpeed * 0.9)).toFixed(3));
  } else {
    /* a slow orbit behind the intro panel, so the stage never looks frozen */
    const t = wall * 0.00012, p = vehicle.pos;
    camera.position.set(p.x + Math.sin(t) * 9, 2.6 + Math.sin(t * 0.7) * 0.5, p.z + Math.cos(t) * 9);
    camera.lookAt(p.x, 0.8, p.z);
    field.update(0, true);
  }

  world.followSun(vehicle.pos);
  world.updateLightPool(vehicle.pos);
  window.__dbg = {
    kmh: vehicle.kmh, u: vehicle.u, gear: vehicle.gear, off: vehicle.offTrack, state: S.state,
    crossings: S.crossings, laps: S.laps, view: rig.view, night: S.night, lane: vehicle.lane,
    heading: vehicle.heading, track: vehicle.trackHeading, ai: field.cars.length, clock: S.clock, best: S.best,
    slip: vehicle.slip, lat: vehicle.lateral, under: vehicle.understeer
  };
  render();
}

/* one step of the simulation */
function step(dt) {
  S.clock += dt * 1000;
  const now = S.clock;
  readInput(dt);
  if (AUTO) autopilot();
  if (S.state === 'countdown') stepLights(now);
  const held = S.state === 'countdown';
  /* after the flag the car coasts down; a brake held at a standstill
     would engage reverse, so it lets go once the car has stopped */
  const drive = S.state === 'finished'
    ? { throttle: 0, brake: vehicle.speed > 1 ? 0.3 : 0, steer: input.steer * 0.5, handbrake: 0 }
    : input;
  vehicle.update(dt, drive, held);
  field.update(dt, held);
  const bump = Math.max(field.collide(vehicle), vehicle.wallHit || 0);
  if (bump > 0.15) rig.shake = Math.max(rig.shake, bump);

  /* the line, crossed going forward */
  if (lastU > 0.9 && vehicle.u < 0.1 && !held) onCrossing(now);
  lastU = vehicle.u;

  effects(dt);
  vehicle.updateLights();
  audio?.update(dt, {
    rpm: vehicle.rpm, rpmNorm: vehicle.rpmNorm, throttle: drive.throttle, brake: drive.brake,
    kmh: vehicle.kmh, offTrack: vehicle.offTrack, slip: vehicle.slip, shifted: vehicle.justShifted
  });
  vehicle.justShifted = 0;
}

/* dev: follow the line, and brake for what the forward read says */
function autopilot() {
  const lane = world.twoWay ? world.width * 0.3 : 0;
  const f = world.frameAt(vehicle.u + 22 / world.length);
  const target = f.pos.clone().addScaledVector(f.side, lane);
  const want = Math.atan2(target.x - vehicle.pos.x, target.z - vehicle.pos.z);
  let err = want - vehicle.heading;
  err = Math.atan2(Math.sin(err), Math.cos(err));
  input.steer = Math.max(-1, Math.min(1, -err * 3));
  const r = world.readAhead(vehicle.u, 260, car.drive.grip);
  const v = Math.abs(vehicle.speed), vc = r.radius > 900 ? 999 : r.speed / 3.6 * 0.97;
  const need = v > vc ? (v * v - vc * vc) / (2 * Math.max(4, r.dist - 8)) : 0;   // decel to arrive at vc
  const brake = need > car.drive.grip * 9.81 * 0.8;
  input.brake = brake ? 1 : 0;
  input.throttle = brake ? 0 : (r.dist < 30 && v > vc ? 0.3 : 1);
  input.handbrake = 0;
}

function render() { composer.render(); }

build().catch(err => {
  console.error('[omen] the simulator could not start', err);
  $('#dLoad').classList.add('is-failed');
  $('#loadStatus').textContent = 'Could not start';
});
