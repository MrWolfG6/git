/* ═══════════════════════════════════════════════════════════
   TEST DRIVE
   Boot, input, loop and HUD.
   ═══════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { CARS, BY_ID, WORLDS } from '../cars.js';
import { World } from './world.js';
import { Vehicle, CameraRig, VIEW_LABELS } from './vehicle.js';
import { AIField } from './ai.js';
import { EngineAudio } from './audio.js';
import { Particles, Skids } from './particles.js';

/* GSAP smooths its clock over long frames, which would stall anything
   the simulation depends on. Here real time is the only time. */
gsap.ticker.lagSmoothing(0);

const $ = s => document.querySelector(s);
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const TOUCH = matchMedia('(pointer:coarse)').matches;

const params = new URLSearchParams(location.search);
const car = BY_ID[params.get('car')] || CARS[0];
let worldId = WORLDS[params.get('world')] ? params.get('world') : car.drive.world;
let startNight = params.get('time') === 'night';
const LAP_CHOICES = [1, 3, 5, 10];
let laps = LAP_CHOICES.includes(+params.get('laps')) ? +params.get('laps') : 3;

const quality = (() => {
  const w = innerWidth, mem = navigator.deviceMemory || 8;
  if (w < 820 || mem <= 4 || TOUCH) return 'low';
  if (w < 1500) return 'mid';
  return 'high';
})();

const S = {
  running: false, paused: false, started: false,
  night: startNight ? 1 : 0, nightTarget: startNight ? 1 : 0,
  raceState: 'idle', countdown: 0,
  lapStart: 0, best: null, lastLap: null, lap: 1, elapsed: 0,
  muted: false, hintTimer: 0,
  totalLaps: laps, finished: false, lapTimes: []
};

/* ═══════════════════════════════════════════════════════════
   INPUT
   ═══════════════════════════════════════════════════════════ */
const keys = new Set();
const input = { throttle: 0, brake: 0, steer: 0, handbrake: 0 };
const touchState = { throttle: 0, brake: 0, left: 0, right: 0 };

addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
  if (keys.has(k)) return;
  keys.add(k);
  if (k === 'c') cycleView();
  if (k === 'n') toggleNight();
  if (k === 'm') toggleSound();
  if (k === 'r') respawn();
  if (k === 'escape' || k === 'p') togglePause();
});
addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
addEventListener('blur', () => keys.clear());

function readInput(dt) {
  const up = keys.has('w') || keys.has('arrowup');
  const down = keys.has('s') || keys.has('arrowdown');
  const left = keys.has('a') || keys.has('arrowleft') || touchState.left;
  const right = keys.has('d') || keys.has('arrowright') || touchState.right;

  const tThr = Math.max(up ? 1 : 0, touchState.throttle);
  const tBrk = Math.max(down ? 1 : 0, touchState.brake);

  /* pedals travel rather than snap, so the car never feels binary */
  input.throttle += (tThr - input.throttle) * Math.min(1, dt * 9);
  input.brake += (tBrk - input.brake) * Math.min(1, dt * 12);
  const wanted = (right ? 1 : 0) - (left ? 1 : 0);
  input.steer += (wanted - input.steer) * Math.min(1, dt * (wanted ? 7 : 11));
  input.handbrake = keys.has(' ') ? 1 : 0;
}

function bindTouch() {
  if (!TOUCH) return;
  $('#touch').hidden = false;
  for (const b of document.querySelectorAll('.touch button')) {
    const key = b.dataset.key;
    const on = e => { e.preventDefault(); touchState[key] = 1; b.classList.add('is-down'); };
    const off = e => { e.preventDefault(); touchState[key] = 0; b.classList.remove('is-down'); };
    b.addEventListener('touchstart', on, { passive: false });
    b.addEventListener('touchend', off, { passive: false });
    b.addEventListener('touchcancel', off, { passive: false });
  }
}

/* ═══════════════════════════════════════════════════════════
   BOOT
   ═══════════════════════════════════════════════════════════ */
let renderer, scene, camera, composer, bloom, world, vehicle, rig, field, audio, dust, skids;
const clock = new THREE.Clock();

function setProgress(pct, label) {
  $('#loadPct').textContent = Math.round(pct);
  $('#loadBar').style.width = pct + '%';
  if (label) $('#loadStatus').textContent = label;
}

async function build() {
  const frame = () => new Promise(r => requestAnimationFrame(() => r()));
  $('#loadCar').textContent = car.short;
  $('#loadWhere').textContent = WORLDS[worldId].name + ' · ' + WORLDS[worldId].sub;
  gsap.to('.dload__car, .dload__where', { opacity: 1, duration: 1, stagger: 0.15 });
  gsap.fromTo('.dload__star circle, .dload__star path',
    { strokeDasharray: 600, strokeDashoffset: 600 },
    { strokeDashoffset: 0, duration: 1.6, stagger: 0.12, ease: 'power2.inOut' });

  setProgress(5, 'Warming the renderer'); await frame();
  renderer = new THREE.WebGLRenderer({
    canvas: $('#driveCanvas'), antialias: quality !== 'low', powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, quality === 'high' ? 2 : 1.4));
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = quality !== 'low';
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.3, 4000);

  setProgress(22, 'Laying the road'); await frame();
  world = new World(worldId, quality).build(scene, renderer);

  setProgress(52, 'Preparing the car'); await frame();
  vehicle = new Vehicle(car, world, { quality });
  scene.add(vehicle.model);
  rig = new CameraRig(camera, vehicle);

  setProgress(70, worldId === 'circuit' ? 'Assembling the grid' : 'Letting the traffic out'); await frame();
  field = new AIField(world, worldId === 'circuit' ? 'race' : 'traffic', quality).build(scene);

  if (quality !== 'low') {
    dust = new Particles(scene, quality === 'high' ? 340 : 200);
    skids = new Skids(scene, quality === 'high' ? 280 : 160);
  }
  buildMinimap();

  setProgress(86, 'Grading the image'); await frame();
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  if (quality !== 'low') {
    bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.34, 0.7, 0.92);
    composer.addPass(bloom);
  }
  composer.addPass(new OutputPass());
  composer.setSize(innerWidth, innerHeight);
  composer.setPixelRatio(renderer.getPixelRatio());

  setProgress(95, 'Checking the mirrors'); await frame();
  applyNight(S.night, true);
  placeAll();
  for (let i = 0; i < 3; i++) { render(0.016); await frame(); }

  setProgress(100, 'Ready');
  await new Promise(r => setTimeout(r, 380));
  showIntro();
}

function placeAll() {
  vehicle.placeOnGrid(worldId === 'circuit' ? field.cars.length : 0);
  rig.snap = true;
  rig.update(0.016, input);
  world.followSun(vehicle.pos);
}

/* ═══════════════════════════════════════════════════════════
   INTRO
   ═══════════════════════════════════════════════════════════ */
function showIntro() {
  $('#introWhere').textContent = `${WORLDS[worldId].name} · ${WORLDS[worldId].sub}`;
  $('#introCar').textContent = car.name;
  $('#introLine').textContent = worldId === 'circuit'
    ? 'A full lap against the field. The lights go out when the last one does.'
    : car.blurb;
  $('#introBack').href = `car.html?car=${car.id}`;

  $('#introWorlds').innerHTML = Object.values(WORLDS).map(w =>
    `<button class="opt${w.id === worldId ? ' is-active' : ''}" data-world="${w.id}">${w.name}</button>`).join('');
  $('#introWorlds').addEventListener('click', e => {
    const b = e.target.closest('[data-world]');
    if (!b || b.dataset.world === worldId) return;
    const t = S.nightTarget >= 0.5 ? 'night' : 'day';
    location.href = `${location.pathname}?car=${car.id}&world=${b.dataset.world}&time=${t}`;
  });

  const lapBox = $('#introLaps');
  if (worldId === 'circuit') {
    lapBox.closest('.opt-group').hidden = false;
    lapBox.innerHTML = LAP_CHOICES.map(n =>
      `<button class="opt${n === S.totalLaps ? ' is-active' : ''}" data-laps="${n}">${n} lap${n > 1 ? 's' : ''}</button>`).join('');
    lapBox.addEventListener('click', e => {
      const b = e.target.closest('[data-laps]');
      if (!b) return;
      for (const o of lapBox.children) o.classList.remove('is-active');
      b.classList.add('is-active');
      S.totalLaps = +b.dataset.laps;
    });
  } else {
    lapBox.closest('.opt-group').hidden = true;
  }

  for (const b of document.querySelectorAll('#introTime .opt')) {
    b.classList.toggle('is-active', (b.dataset.time === 'night') === (S.nightTarget >= 0.5));
    b.addEventListener('click', () => {
      for (const o of document.querySelectorAll('#introTime .opt')) o.classList.remove('is-active');
      b.classList.add('is-active');
      S.nightTarget = b.dataset.time === 'night' ? 1 : 0;
      applyNight(S.nightTarget, true);
      $('#timeLabel').textContent = S.nightTarget ? 'Night' : 'Day';
    });
  }

  gsap.to('#dLoad', {
    opacity: 0, duration: 0.7, ease: 'power2.inOut',
    onComplete: () => { $('#dLoad').hidden = true; $('#dLoad').style.display = 'none'; }
  });
  $('#dIntro').hidden = false;
  gsap.fromTo('.dintro__panel', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: 'expo.out' });

  /* the stage idles behind the panel so it never looks frozen */
  S.running = true;
  loop();

  $('#introGo').addEventListener('click', begin, { once: true });
}

async function begin() {
  audio = new EngineAudio(car.audio);
  await audio.start().catch(() => {});
  updateSoundLabel();

  gsap.to('.dintro__panel', { y: -30, opacity: 0, duration: 0.5, ease: 'power2.in' });
  gsap.to('#dIntro', {
    opacity: 0, duration: 0.6, delay: 0.2,
    onComplete: () => { $('#dIntro').hidden = true; }
  });

  $('#hud').hidden = false;
  $('#hudCar').textContent = car.short;
  $('#hudWhere').textContent = WORLDS[worldId].name;
  $('#pauseCar').textContent = car.name;
  $('#pauseCarLink').href = `car.html?car=${car.id}`;
  gsap.fromTo('.hud__tl, .hud__tr, .hud__bl, .hud__br',
    { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.9, stagger: 0.07, delay: 0.35, ease: 'power3.out' });

  document.body.classList.add('is-driving');
  bindTouch();
  S.started = true;
  S.hintTimer = 7;
  S.lapStart = performance.now();

  if (worldId === 'circuit') startRace();
  else S.raceState = 'free';
}

/* ═══════════════════════════════════════════════════════════
   RACE START
   ═══════════════════════════════════════════════════════════ */
/* The start sequence is stepped by the render loop rather than a
   tween: a tween's clock can be smoothed away under load, and the
   grid must never be left held. */
const COUNTDOWN_MS = 5350;

function startRace() {
  S.raceState = 'countdown';
  /* wall time, not simulated time: the lights take five seconds
     whatever the frame rate is doing */
  S.countdownEnd = performance.now() + COUNTDOWN_MS;
  S.countdown = COUNTDOWN_MS / 1000;
  $('#standings').hidden = false;
  $('#lights').hidden = false;
  S.bulbs = [...$('#lights').children];
}

function stepCountdown() {
  S.countdown = (S.countdownEnd - performance.now()) / 1000;
  const lit = Math.min(S.bulbs.length, Math.floor((COUNTDOWN_MS / 1000 - S.countdown) / 0.85));
  for (let i = 0; i < S.bulbs.length; i++) S.bulbs[i].classList.toggle('on', i < lit);

  if (S.countdown <= 0) {
    for (const b of S.bulbs) { b.classList.remove('on'); b.classList.add('go'); }
    S.raceState = 'racing';
    S.lapStart = performance.now();
    gsap.fromTo('#flash', { opacity: 0.5 }, { opacity: 0, duration: 0.5 });
    gsap.to('#lights', { opacity: 0, duration: 0.5, delay: 0.7, onComplete: () => { $('#lights').hidden = true; } });
  }
}

/* ═══════════════════════════════════════════════════════════
   CONTROLS
   ═══════════════════════════════════════════════════════════ */
function cycleView() {
  if (!S.started) return;
  $('#viewLabel').textContent = VIEW_LABELS[rig.cycle()];
  gsap.fromTo('#driveCanvas', { opacity: 0.55 }, { opacity: 1, duration: 0.4 });
}
function toggleNight() {
  S.nightTarget = S.nightTarget >= 0.5 ? 0 : 1;
  $('#timeLabel').textContent = S.nightTarget ? 'Night' : 'Day';
}
function toggleSound() {
  S.muted = !S.muted;
  audio?.setMuted(S.muted);
  updateSoundLabel();
}
function updateSoundLabel() {
  $('#soundLabel').textContent = S.muted ? 'Sound off' : 'Sound on';
}
function respawn() {
  const f = world.frameAt(vehicle.u);
  vehicle.pos.copy(f.pos).setY(0);
  vehicle.heading = Math.atan2(f.tan.x, f.tan.z);
  vehicle.speed = Math.min(vehicle.speed, 12);
  vehicle.lateral = 0;
  rig.snap = true;
}
function togglePause() {
  if (!S.started) return;
  S.paused = !S.paused;
  $('#dPause').hidden = !S.paused;
  document.body.classList.toggle('is-driving', !S.paused);
  audio?.setMuted(S.paused || S.muted);
  if (!S.paused) clock.getDelta();
}

$('#btnView').addEventListener('click', cycleView);
$('#btnTime').addEventListener('click', toggleNight);
$('#btnSound').addEventListener('click', toggleSound);
$('#pauseResume').addEventListener('click', togglePause);
$('#pauseReset').addEventListener('click', () => { respawn(); togglePause(); });

addEventListener('resize', () => {
  if (!renderer) return;
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer?.setSize(innerWidth, innerHeight);
  bloom?.setSize(innerWidth, innerHeight);
}, { passive: true });

document.addEventListener('visibilitychange', () => {
  if (document.hidden && S.started && !S.paused) togglePause();
});

/* ═══════════════════════════════════════════════════════════
   TIME OF DAY
   ═══════════════════════════════════════════════════════════ */
function applyNight(t, immediate) {
  S.night = t;
  world.apply(t);
  vehicle?.setNight(t);
  vehicle && (vehicle.nightBlend = t);
  if (renderer) renderer.toneMappingExposure = 1.0 + t * 0.32;
  if (bloom) bloom.strength = 0.3 + t * 0.5;
  if (immediate) S.nightTarget = t;
}

/* ═══════════════════════════════════════════════════════════
   MINIMAP
   The route drawn once from the spline, with everyone's dot
   moved along it each frame.
   ═══════════════════════════════════════════════════════════ */
let mapProject = null;

function buildMinimap() {
  const n = 220;
  const pts = [];
  for (let i = 0; i < n; i++) pts.push(world.curve.getPointAt(i / n));

  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z);
  }
  const pad = 9;
  const span = Math.max(maxX - minX, maxZ - minZ) || 1;
  const scale = (100 - pad * 2) / span;
  const ox = pad + ((maxX - minX) < span ? (span - (maxX - minX)) * scale / 2 : 0);
  const oz = pad + ((maxZ - minZ) < span ? (span - (maxZ - minZ)) * scale / 2 : 0);

  mapProject = p => [ox + (p.x - minX) * scale, oz + (p.z - minZ) * scale];

  const d = pts.map((p, i) => {
    const [x, y] = mapProject(p);
    return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ') + ' Z';
  $('#mapTrack').setAttribute('d', d);
  $('#mapLine').setAttribute('d', d);

  const [sx, sy] = mapProject(world.curve.getPointAt(0));
  $('#mapStart').setAttribute('cx', sx);
  $('#mapStart').setAttribute('cy', sy);

  /* one dot per AI car */
  $('#mapAI').innerHTML = field.cars.map(() =>
    '<circle r="2" fill="rgba(255,255,255,.42)"/>').join('');
  mapDots = [...$('#mapAI').children];
}

let mapDots = [];

function updateMinimap() {
  if (!mapProject) return;
  const me = $('#mapMe');
  const [mx, my] = mapProject(vehicle.pos);
  me.setAttribute('cx', mx.toFixed(1));
  me.setAttribute('cy', my.toFixed(1));
  for (let i = 0; i < mapDots.length; i++) {
    const c = field.cars[i];
    if (!c.pos) continue;
    const [x, y] = mapProject(c.pos);
    mapDots[i].setAttribute('cx', x.toFixed(1));
    mapDots[i].setAttribute('cy', y.toFixed(1));
  }
}

/* ═══════════════════════════════════════════════════════════
   TOASTS
   ═══════════════════════════════════════════════════════════ */
let toastTl;
function toast(title, body, best = false) {
  const el = $('#toast');
  el.hidden = false;
  el.classList.toggle('is-best', best);
  $('#toastTitle').textContent = title;
  $('#toastBody').textContent = body;
  toastTl?.kill();
  toastTl = gsap.timeline()
    .fromTo(el, { opacity: 0, y: -16 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' })
    .to(el, { opacity: 0, y: -12, duration: 0.6, delay: 2.4, ease: 'power2.in' })
    .set(el, { onComplete: () => { el.hidden = true; } });
}

/* ═══════════════════════════════════════════════════════════
   HUD
   ═══════════════════════════════════════════════════════════ */
const DIAL_LEN = 434;   // path length of the arc, measured once below
let dialPath;

function fmtTime(ms) {
  if (ms == null) return '—:—';
  const s = ms / 1000;
  const m = Math.floor(s / 60);
  const r = (s - m * 60).toFixed(2).padStart(5, '0');
  return `${m}:${r}`;
}

function updateHud(dt) {
  if (!S.started) return;

  const kmh = vehicle.kmh;
  $('#spd').textContent = Math.round(kmh);
  $('#gear').textContent = vehicle.reverse ? 'R' : (Math.abs(vehicle.speed) < 0.4 ? 'N' : vehicle.gear);

  if (!dialPath) { dialPath = $('#dialFill'); dialPath.style.strokeDasharray = DIAL_LEN; }
  const frac = Math.min(1, kmh / (car.drive.topSpeed * 1.02));
  dialPath.style.strokeDashoffset = DIAL_LEN * (1 - frac);

  const rev = vehicle.rpmNorm;
  $('#revFill').style.width = (rev * 100).toFixed(1) + '%';
  const red = rev > 0.88;
  $('.dial').classList.toggle('is-red', red);
  $('.rev').classList.toggle('is-red', red);
  $('.rev').classList.toggle('is-limit', vehicle.onLimiter);
  $('.dial').classList.toggle('is-shift', vehicle.shiftFlash > 0);

  updateMinimap();

  /* timing */
  if (S.raceState === 'racing' || S.raceState === 'free') {
    S.elapsed = performance.now() - S.lapStart;
    $('#tCur').textContent = fmtTime(S.elapsed);
  }
  $('#tLap').textContent = worldId === 'circuit' ? `${Math.min(S.lap, S.totalLaps)} / ${S.totalLaps}` : S.lap;
  $('#tBest').textContent = fmtTime(S.best);

  /* standings on the circuit */
  if (worldId === 'circuit' && S.started) {
    const rows = field.standings({ lap: S.lap - 1, u: vehicle.u, lane: 0, speed: vehicle.speed });
    const me = rows.findIndex(r => r.isPlayer);
    const from = Math.max(0, Math.min(me - 2, rows.length - 5));
    $('#standings').innerHTML = rows.slice(from, from + 5).map((r, i) =>
      `<li class="${r.isPlayer ? 'is-you' : ''}"><b>${String(from + i + 1).padStart(2, '0')}</b>${r.name}<span></span></li>`).join('');
  }

  if (S.hintTimer > 0) {
    S.hintTimer -= dt;
    if (S.hintTimer <= 0) $('#hint').classList.add('is-gone');
  }
}

function onLapComplete() {
  const t = performance.now() - S.lapStart;
  let isBest = false;
  if (t > 8000) {
    S.lastLap = t;
    S.lapTimes.push(t);
    if (S.best == null || t < S.best) { S.best = t; isBest = true; }
    if (isBest) gsap.fromTo('#tBest', { color: '#7dffb0', scale: 1.18 }, { color: '#f4f5f6', scale: 1, duration: 1.1 });
    toast(isBest ? 'Personal best' : `Lap ${S.lap}`, fmtTime(t), isBest);
  }
  S.lapStart = performance.now();
  S.lap++;
  gsap.fromTo('#tLap', { scale: 1.4, color: '#fff' }, { scale: 1, color: '#f4f5f6', duration: 0.8 });

  if (worldId === 'circuit' && S.lap > S.totalLaps && !S.finished) finishRace();
}

/* ═══════════════════════════════════════════════════════════
   CHEQUERED FLAG
   ═══════════════════════════════════════════════════════════ */
function finishRace() {
  S.finished = true;
  S.raceState = 'finished';

  const rows = field.standings({ lap: S.lap - 1, u: vehicle.u, lane: 0, speed: vehicle.speed });
  const place = rows.findIndex(r => r.isPlayer) + 1;
  const ord = ['th', 'st', 'nd', 'rd'][(place % 100 - 20) % 10] || ['th', 'st', 'nd', 'rd'][place] || 'th';

  $('#resultPlace').innerHTML = `${place}<sup>${ord}</sup>`;
  $('#resultSub').textContent = S.best
    ? `${car.name} · best lap ${fmtTime(S.best)}`
    : `${car.name} · ${WORLDS[worldId].name}`;
  $('#resultTable').innerHTML = rows.map((r, i) =>
    `<li class="${r.isPlayer ? 'is-you' : ''}"><b>${String(i + 1).padStart(2, '0')}</b>${r.name}` +
    `<span>${r.isPlayer && S.best ? fmtTime(S.best) : ''}</span></li>`).join('');
  $('#resultCar').href = `car.html?car=${car.id}`;

  gsap.fromTo('#flash', { opacity: 0.35 }, { opacity: 0, duration: 0.8 });
  $('#dResult').hidden = false;
  gsap.fromTo('.dresult__panel', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: 'expo.out' });
  gsap.fromTo('.dresult__table li', { x: -18, opacity: 0 },
    { x: 0, opacity: 1, duration: 0.6, stagger: 0.05, delay: 0.35 });
  document.body.classList.remove('is-driving');
  audio?.setVolume(0.28);
}

$('#resultAgain').addEventListener('click', () => location.reload());

/* ═══════════════════════════════════════════════════════════
   WHAT THE TYRES LEAVE BEHIND
   ═══════════════════════════════════════════════════════════ */
const DUST_COLOUR = {
  chicago: new THREE.Color(0.72, 0.74, 0.78),
  vegas:   new THREE.Color(0.82, 0.74, 0.58),
  circuit: new THREE.Color(0.70, 0.72, 0.75)
};
let lastContact = null;

function updateEffects(dt) {
  if (!dust || !vehicle.contactL) return;
  const slip = vehicle.slip || 0;
  const kmh = vehicle.kmh;

  /* smoke off the driven wheels, dust when you put a wheel off */
  if (slip > 0.40 && kmh > 14) {
    const colour = vehicle.offTrack > 0.1 ? DUST_COLOUR[worldId] : new THREE.Color(0.76, 0.76, 0.79);
    const drift = { x: -Math.sin(vehicle.heading) * 1.6, z: -Math.cos(vehicle.heading) * 1.6 };
    const n = slip > 0.9 ? 2 : 1;
    for (let i = 0; i < n; i++) {
      dust.emit(vehicle.contactL, 0.28, 0.34 + slip * 0.26, colour, drift, 1.1 + Math.random() * 0.7);
      dust.emit(vehicle.contactR, 0.28, 0.34 + slip * 0.26, colour, drift, 1.1 + Math.random() * 0.7);
    }
  }
  dust.update(dt);

  /* rubber, only on the road and only when it is actually sliding */
  if (skids) {
    if (slip > 0.3 && kmh > 12 && vehicle.offTrack < 0.15 && lastContact) {
      skids.lay(
        { a: lastContact.l, b: vehicle.contactL },
        { a: lastContact.r, b: vehicle.contactR },
        Math.min(1, (slip - 0.3) * 1.5)
      );
    }
    skids.fade(dt);
  }
  lastContact = { l: vehicle.contactL.clone(), r: vehicle.contactR.clone() };

  /* the sense of speed: the frame closes in as the car gets on with it */
  const v = Math.min(1, kmh / (car.drive.topSpeed * 0.92));
  document.documentElement.style.setProperty('--speed', v.toFixed(3));
}

/* ═══════════════════════════════════════════════════════════
   LOOP
   ═══════════════════════════════════════════════════════════ */
let lastU = 0;

function loop() {
  if (!S.running) return;
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (S.paused) return;

  /* ease between day and night rather than cutting */
  if (Math.abs(S.night - S.nightTarget) > 0.001) {
    applyNight(S.night + (S.nightTarget - S.night) * Math.min(1, dt * 1.8));
  }

  if (S.started) {
    readInput(dt);
    if (S.raceState === 'countdown') stepCountdown();
    const locked = S.raceState === 'countdown';
    /* after the flag the car coasts in rather than stopping dead */
    const drive = S.finished
      ? { throttle: 0, brake: 0.25, steer: input.steer * 0.5, handbrake: 0 }
      : input;
    vehicle.update(dt, drive, locked);
    if (!locked) field.update(dt, { u: vehicle.u, lane: 0, speed: vehicle.speed, lap: S.lap - 1 });
    const bump = Math.max(field.collide(vehicle), vehicle.wallHit || 0);
    if (bump > 0.15) {
      rig.shake = Math.max(rig.shake, bump);
      if (dust && vehicle.contactL) {
        const grey = new THREE.Color(0.72, 0.72, 0.74);
        for (let i = 0; i < 3; i++) {
          dust.emit(vehicle.contactL, 0.6, 0.5 + bump * 0.5, grey, { x: 0, z: 0 }, 1.1);
        }
      }
    }

    /* crossing the line */
    if (lastU > 0.85 && vehicle.u < 0.15) onLapComplete();
    lastU = vehicle.u;

    updateEffects(dt);
    vehicle.updateLights(input);
    audio?.update(dt, {
      rpm: vehicle.rpm, rpmNorm: vehicle.rpmNorm, throttle: input.throttle,
      speedKmh: vehicle.kmh, offTrack: vehicle.offTrack,
      shifted: vehicle.justShifted
    });
    vehicle.justShifted = 0;
  } else {
    /* idle orbit behind the intro panel */
    const t = clock.elapsedTime * 0.12;
    const f = world.frameAt(vehicle.u);
    camera.position.set(
      vehicle.pos.x + Math.sin(t) * 11, 3.4 + Math.sin(t * 0.7) * 0.7, vehicle.pos.z + Math.cos(t) * 11);
    camera.lookAt(vehicle.pos.x, 0.9, vehicle.pos.z);
  }

  if (S.started) rig.update(dt, input);

  /* a small window onto the state, for the console */
  window.__dbg = {
    kmh: vehicle.kmh, lap: S.lap, u: vehicle.u, off: vehicle.offTrack,
    gear: vehicle.gear, rpm: vehicle.rpm, view: rig.view, night: S.night,
    started: S.started, ai: field.cars.length, race: S.raceState,
    throttle: input.throttle, heading: vehicle.heading, trackHeading: vehicle.trackHeading
  };
  world.followSun(vehicle.pos);
  updateHud(dt);
  render(dt);
}

function render() {
  composer ? composer.render() : renderer.render(scene, camera);
}

/* ═══════════════════════════════════════════════════════════ */
build().catch(err => {
  console.error('[drive] could not start', err);
  $('#loadStatus').textContent = 'This browser could not start the simulator';
  $('#dLoad').classList.add('is-failed');
});
