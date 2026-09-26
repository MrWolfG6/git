/* ═══════════════════════════════════════════════════════════
   THE SHOWROOM
   Loader, scroll choreography, configurator, collection.
   The camera, the car and the exposure all move together: every
   section owns a pose in SCENES, and choreo.js scrubs between them.
   ═══════════════════════════════════════════════════════════ */

import { Stage, pose } from './stage.js';
import { scrollPoses, bindNav, bindReveals } from './choreo.js';
import { CARS, BY_ID, PAINTS, paintsFor } from './cars.js';
import { paintMarks } from './brand.js';
import { $, $$, REDUCED, initSmoothScroll, markBooted, fmtMoney, scrollToEl } from './common.js';

const { gsap, ScrollTrigger } = window;

/*             camera            aim                 yaw    exp   bloom scrim aim-in-world */
const SCENES = {
  hero:        pose([4.2, 1.45, 9.0], [0.0, 0.62, 0],   -0.42, 1.00, 0.30, 0.10),
  thesis:      pose([3.2, 0.72, 8.4], [-2.3, 0.8, 0],   -0.22, 0.86, 0.30, 0.70, 1),
  design:      pose([-1.2, 1.9, 5.8], [-4.4, 3.1, -11], 1.35,  0.88, 0.55, 0.55, 1),
  performance: pose([-4.8, 0.62, 5.2],[-1.6, 0.50, 0],  -0.25, 0.74, 0.62, 0.70),
  configure:   pose([-5.2, 2.2, 7.4], [0.6, 0.55, 0],   -0.55, 1.08, 0.28, 0.08),
  collection:  pose([0.0, 2.35, 11.2],[0.0, 0.55, 0],   -0.52, 1.04, 0.36, 0.22),
  ownership:   pose([-3.4, 4.6, 7.6], [0.4, 0.3, 0],    -1.9,  0.72, 0.30, 0.72),
  contact:     pose([1.0, 1.3, 14.0], [-4.0, 3.2, -11], -1.57, 0.62, 0.50, 0.70, 1)
};
/* the sections where the turntable turns */
const SPIN = { configure: 0.14, collection: 0.1 };

const S = { car: CARS[0], paint: PAINTS[CARS[0].paints[0]], lenis: null };
let stage;

/* ═══════════ LOADER ═══════════ */
const frame = () => new Promise(r => requestAnimationFrame(() => r()));
function progress(p, label) {
  $('#loadPct').textContent = String(Math.round(p)).padStart(3, '0');
  gsap.to('#loadBar', { scaleX: p / 100, duration: 0.5, ease: 'power2.out' });
  if (label) $('#loadStatus').textContent = label;
}
function drawLoaderMark() {
  const paths = $$('.loader__mark path');
  for (const p of paths) {
    const len = p.getTotalLength();
    p.style.strokeDasharray = len;
    p.style.strokeDashoffset = REDUCED ? 0 : len;
  }
  if (!REDUCED) gsap.to(paths, { strokeDashoffset: 0, duration: 1.8, stagger: 0.25, ease: 'power2.inOut' });
}

async function boot() {
  drawLoaderMark();
  paintMarks();
  progress(6, 'Sampling surface');
  await frame();

  stage = new Stage($('#stage')).init();
  progress(28, 'Baking the room');
  await frame();

  /* build every car now, so choosing one later never hitches */
  for (let i = 0; i < CARS.length; i++) {
    stage.getCar(CARS[i]);
    progress(28 + (i + 1) / CARS.length * 52, `Drawing ${CARS[i].name}`);
    await frame();
  }

  buildDOM();
  progress(88, 'Compiling light');
  stage.showCar(S.car, { instant: true });
  stage.lift.y = -2.2;                         // below the dais, ready to rise
  stage.target = { ...SCENES.hero };
  stage.now = { ...SCENES.hero, cx: 9, cy: 3.4, cz: 15, exposure: 0, bloom: 1.2 };
  stage.warm();
  await frame();

  S.lenis = initSmoothScroll();
  choreograph();
  progress(100, 'Ready');
  markBooted();
  await new Promise(r => setTimeout(r, REDUCED ? 0 : 420));
  reveal();
}

function reveal() {
  stage.start();
  document.documentElement.classList.remove('is-loading');
  const tl = gsap.timeline();
  tl.to('#loader', { opacity: 0, duration: REDUCED ? 0.01 : 0.9, ease: 'power2.inOut', onComplete: () => { $('#loader').hidden = true; } });
  if (REDUCED) { stage.lift.y = 0; return; }
  tl.to(stage.lift, { y: 0, duration: 2.4, ease: 'expo.out' }, 0.2)
    .from('.hero__title .line > span', { yPercent: 110, duration: 1.4, stagger: 0.1, ease: 'expo.out' }, 0.5)
    .from('.hero__top, .hero__foot, .nav', { opacity: 0, y: 16, duration: 1.1, stagger: 0.08, ease: 'power3.out' }, 0.9);
  ScrollTrigger.refresh();
}

/* ═══════════ CHOREOGRAPHY ═══════════ */
function choreograph() {
  scrollPoses(stage, SCENES, SPIN, active => { S.active = active; });
  bindNav(S.lenis, scrollToEl, $);
  bindReveals(REDUCED);

  /* counters, in the mono, when they are read */
  for (const el of $$('[data-count]')) {
    const to = +el.dataset.count, dec = +(el.dataset.dec || 0);
    const write = v => { el.textContent = dec ? v.toFixed(dec) : Math.round(v).toLocaleString('en-GB').replace(/,/g, ' '); };
    if (REDUCED) { write(to); continue; }
    const o = { v: 0 };
    ScrollTrigger.create({
      trigger: el, start: 'top 85%', once: true,
      onEnter: () => gsap.to(o, { v: to, duration: 1.8, ease: 'power3.out', onUpdate: () => write(o.v) })
    });
  }
  $$('.perf__table td.bar i').forEach(i => {
    if (REDUCED) return;
    gsap.from(i, { scaleX: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '#perfTable', start: 'top 80%', once: true } });
  });

  addEventListener('keydown', e => {
    if (S.active !== 'collection' || e.target.closest('input, textarea, select')) return;
    if (e.key === 'ArrowRight') step(1);
    if (e.key === 'ArrowLeft') step(-1);
  });

  if (!REDUCED) addEventListener('pointermove', e => {
    stage.pointer.x = (e.clientX / innerWidth - 0.5) * 2;
    stage.pointer.y = (e.clientY / innerHeight - 0.5) * -2;
  }, { passive: true });

  readout();
}

/* the hero readout: a forecast, updating */
function readout() {
  const surfaces = ['DRY · 1.18 μ', 'DAMP · 0.94 μ', 'STANDING WATER · 0.61 μ', 'COLD · 1.02 μ', 'DRY · 1.21 μ'];
  const calls = ['Lift at 140 m', 'Hold line', 'Brake bias +4 %', 'Torque rear 62 %', 'Damping firm, 0.6 s'];
  let i = 0, next = 4.2;
  if (REDUCED) return;
  setInterval(() => {
    next -= 0.1;
    if (next <= 0) {
      i = (i + 1) % surfaces.length;
      next = 3 + Math.random() * 3;
      $('#roSurface').textContent = surfaces[i];
      $('#roCall').textContent = calls[i];
      $('#roRead').textContent = `${S.car.id === 'eclipse' ? 300 : 200} m`;
    }
    $('#roNext').textContent = next.toFixed(1) + ' s';
  }, 100);
}

/* ═══════════ DOM ═══════════ */
function buildDOM() {
  /* the range, by power */
  const rows = [...CARS].sort((a, b) => b.drive.power - a.drive.power);
  $('#perfTable').innerHTML = '<tbody>' + rows.map(c =>
    `<tr><td>${c.name}</td><td class="bar"><i style="transform:scaleX(${(c.drive.power / 1600).toFixed(3)})"></i></td>` +
    `<td class="num">${c.drive.power} hp</td><td class="num">${c.specs[1][1]}</td></tr>`).join('') + '</tbody>';

  /* the collection */
  $('#collList').innerHTML = CARS.map((c, i) =>
    `<li><button class="coll__item" role="option" data-car="${c.id}" aria-selected="${i === 0}">` +
    `<span class="mono">${String(i + 1).padStart(2, '0')}</span><b>${c.name}</b><em class="mono">${c.type}</em></button></li>`).join('');
  $('#collList').addEventListener('click', e => {
    const b = e.target.closest('[data-car]');
    if (b) select(BY_ID[b.dataset.car]);
  });
  $('#collPrev').addEventListener('click', () => step(-1));
  $('#collNext').addEventListener('click', () => step(1));

  $('#formCar').innerHTML = CARS.map(c => `<option value="${c.id}">${c.name} — ${c.type}</option>`).join('');
  bindForm();
  select(S.car, true);
}

function step(d) {
  const i = CARS.indexOf(S.car);
  select(CARS[(i + d + CARS.length) % CARS.length]);
}

function select(car, first = false) {
  const changed = car !== S.car;
  S.car = car;
  S.paint = PAINTS[car.paints[0]];
  if (!first) stage.showCar(car);

  for (const b of $$('.coll__item')) b.setAttribute('aria-selected', String(b.dataset.car === car.id));
  const i = CARS.indexOf(car);
  $('#collIdx').textContent = `${String(i + 1).padStart(2, '0')} / ${String(CARS.length).padStart(2, '0')}`;
  $('#collType').textContent = `${car.type} · ${car.drivetrain}`;
  $('#collName').textContent = car.name;
  $('#collThesis').textContent = car.thesis;
  $('#collSpecs').innerHTML = car.specs.slice(0, 3).map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
  $('#collOpen').href = `car.html?car=${car.id}`;
  $('#collDrive').href = `drive.html?car=${car.id}&world=${car.drive.world}`;
  $('#navDrive').href = `drive.html?car=${car.id}&world=${car.drive.world}`;
  $('#heroCar').textContent = car.name;
  $('#formCar').value = car.id;
  if (changed && !REDUCED) gsap.fromTo('#collDetail > *', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.04, ease: 'power3.out' });

  /* the configurator follows the car on the dais */
  $('#cfgCar').textContent = car.name;
  $('#cfgType').textContent = car.type;
  $('#cfgPaints').innerHTML = paintsFor(car).map((p, k) =>
    `<li><button class="paint" role="radio" aria-checked="${k === 0}" data-code="${p.code}" style="--c:${p.hex}" aria-label="${p.name}, ${p.code}">` +
    `<i></i><span class="mono">${p.code}</span></button></li>`).join('');
  for (const b of $$('#cfgPaints .paint')) b.addEventListener('click', () => choosePaint(PAINTS[b.dataset.code]));
  choosePaint(S.paint, true);
}

function choosePaint(p, quiet = false) {
  S.paint = p;
  for (const b of $$('#cfgPaints .paint')) b.setAttribute('aria-checked', String(b.dataset.code === p.code));
  $('#cfgCode').textContent = p.code;
  $('#cfgName').textContent = p.name;
  $('#cfgPrice').textContent = fmtMoney(S.car.price + p.price);
  $('#cfgOpen').href = `car.html?car=${S.car.id}&paint=${p.code}#configure`;
  if (!quiet) stage.setPaint(p);
}

/* No server ships with a static build. If data-endpoint is set the form
   posts there; if not, it says so rather than pretending to send. */
function bindForm() {
  const form = $('#form'), msg = $('#formMsg');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    let bad = false;
    for (const el of form.querySelectorAll('[required]')) {
      const ok = el.type === 'checkbox' ? el.checked : el.checkValidity() && el.value.trim() !== '';
      el.closest('.field, .check')?.classList.toggle('is-bad', !ok);
      bad ||= !ok;
    }
    msg.classList.toggle('is-bad', bad);
    if (bad) { msg.textContent = 'Name, a valid email and consent are required.'; return; }
    const data = Object.fromEntries(new FormData(form));
    const endpoint = form.dataset.endpoint;
    if (endpoint) {
      try {
        const r = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
        msg.textContent = r.ok ? 'Received. A reply within two working days.' : 'Not sent. Try again.';
      } catch { msg.textContent = 'Not sent. Try again.'; }
      return;
    }
    try { localStorage.setItem('omen:request', JSON.stringify({ ...data, at: Date.now() })); } catch { /* storage may be off */ }
    msg.textContent = 'Held on this device. No endpoint is configured for this build.';
  });
}

boot().catch(err => {
  console.error('[omen] the stage could not start', err);
  window.__omenHandOver?.();
});
