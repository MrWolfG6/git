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
  muted: false, hintTimer: 0
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
let renderer, scene, camera, composer, bloom, world, vehicle, rig, field, audio;
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
    location.href = `drive.html?car=${car.id}&world=${b.dataset.world}&time=${t}`;
  });

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

  /* timing */
  if (S.raceState === 'racing' || S.raceState === 'free') {
    S.elapsed = performance.now() - S.lapStart;
    $('#tCur').textContent = fmtTime(S.elapsed);
  }
  $('#tLap').textContent = worldId === 'circuit' ? `${S.lap} / 3` : S.lap;
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
  if (t > 8000) {
    S.lastLap = t;
    if (S.best == null || t < S.best) {
      S.best = t;
      gsap.fromTo('#tBest', { color: '#7dffb0', scale: 1.18 }, { color: '#f4f5f6', scale: 1, duration: 1.1 });
    }
  }
  S.lapStart = performance.now();
  S.lap++;
  gsap.fromTo('#tLap', { scale: 1.4, color: '#fff' }, { scale: 1, color: '#f4f5f6', duration: 0.8 });
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
    vehicle.update(dt, input, locked);
    if (!locked) field.update(dt, { u: vehicle.u, lane: 0, speed: vehicle.speed, lap: S.lap - 1 });
    const bump = field.collide(vehicle);
    if (bump > 0.2) rig.shake = Math.max(rig.shake, bump);

    /* crossing the line */
    if (lastU > 0.85 && vehicle.u < 0.15) onLapComplete();
    lastU = vehicle.u;

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
    throttle: input.throttle
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
