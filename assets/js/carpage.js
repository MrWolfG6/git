/* ═══════════════════════════════════════════════════════════
   ONE CAR
   car.html?car=<id>[&paint=OM-xxx&wheel=<style>&interior=<id>&packs=a,b]

   The build lives in the URL, so a build can be sent, and the
   simulator is handed exactly the car on the dais.
   ═══════════════════════════════════════════════════════════ */

import { Stage, pose } from './stage.js';
import { PROTOS } from './builder.js';
import { CARS, BY_ID, PAINTS, OPTIONS, WORLDS, paintsFor, wheelsFor } from './cars.js';
import { paintMarks } from './brand.js';
import { scrollPoses, bindNav, bindReveals } from './choreo.js';
import { $, $$, REDUCED, initSmoothScroll, markBooted, fmtMoney, scrollToEl } from './common.js';

const { gsap } = window;

const params = new URLSearchParams(location.search);
const car = BY_ID[params.get('car')] || CARS[0];
const protoWheel = PROTOS[car.proto].wheel;
const WHEEL_OPTS = wheelsFor(car, protoWheel);

const build = {
  paint: car.paints.includes(params.get('paint')) ? PAINTS[params.get('paint')] : PAINTS[car.paints[0]],
  wheel: WHEEL_OPTS.find(w => w.id === params.get('wheel')) || WHEEL_OPTS[0],
  interior: OPTIONS.interior.find(o => o.id === params.get('interior')) || OPTIONS.interior[0],
  packs: new Set((params.get('packs') || '').split(',').filter(id => OPTIONS.packs.some(p => p.id === id)))
};

/*             camera              aim                yaw    exp   bloom scrim */
const SCENES = {
  hero:       pose([5.0, 1.5, 8.8],   [0.3, 0.6, 0],    -0.5,  1.00, 0.30, 0.12),
  overview:   pose([3.0, 0.7, 8.2],   [-2.3, 0.8, 0],   -0.22, 0.88, 0.30, 0.70, 1),
  spec:       pose([0.0, 1.3, 13.0],  [0.0, -0.75, 0],  0.0,   0.95, 0.26, 0.55, 1),
  highlights: pose([4.2, 0.6, 3.4],   [1.9, 0.5, 0],    -1.2,  0.84, 0.40, 0.84),
  configure:  pose([-5.8, 2.1, 7.2],  [0.8, 0.55, 0],   -0.5,  1.08, 0.28, 0.10),
  routes:     pose([-6.0, 0.8, 4.6],  [-1.4, 0.55, 0],  -0.3,  0.80, 0.50, 0.72)
};
const SPIN = { configure: 0.12 };

let stage, lenis;
const frame = () => new Promise(r => requestAnimationFrame(() => r()));
function progress(p, label) {
  $('#loadPct').textContent = String(Math.round(p)).padStart(3, '0');
  gsap.to('#loadBar', { scaleX: p / 100, duration: 0.4 });
  if (label) $('#loadStatus').textContent = label;
}

async function boot() {
  document.title = `${car.name} — OMEN`;
  $('#loadName').textContent = car.name;
  paintMarks();
  progress(10, 'Sampling surface');
  await frame();
  stage = new Stage($('#stage')).init();
  progress(50, `Drawing ${car.name}`);
  await frame();
  stage.getCar(car);
  stage.showCar(car, { instant: true });
  stage.setPaint(build.paint, true);
  stage.setWheels(build.wheel.id);
  stage.lift.y = -2.2;
  stage.target = { ...SCENES.hero };
  stage.now = { ...SCENES.hero, cx: 8, cy: 3, cz: 14, exposure: 0 };
  fill();
  progress(85, 'Compiling light');
  stage.warm();
  await frame();

  lenis = initSmoothScroll();
  scrollPoses(stage, SCENES, SPIN);
  bindNav(lenis, scrollToEl, $);
  bindReveals(REDUCED);
  if (!REDUCED) addEventListener('pointermove', e => {
    stage.pointer.x = (e.clientX / innerWidth - 0.5) * 2;
    stage.pointer.y = (e.clientY / innerHeight - 0.5) * -2;
  }, { passive: true });

  progress(100, 'Ready');
  markBooted();
  stage.start();
  document.documentElement.classList.remove('is-loading');
  gsap.to('#loader', { opacity: 0, duration: REDUCED ? 0.01 : 0.8, onComplete: () => { $('#loader').hidden = true; } });
  if (REDUCED) stage.lift.y = 0;
  else {
    gsap.to(stage.lift, { y: 0, duration: 2.2, ease: 'expo.out', delay: 0.2 });
    gsap.from('.chero__name', { yPercent: 40, opacity: 0, duration: 1.4, ease: 'expo.out', delay: 0.4 });
  }
  if (location.hash) { const el = $(location.hash); if (el) setTimeout(() => scrollToEl(lenis, el), 300); }
  window.ScrollTrigger.refresh();
}

function fill() {
  const i = CARS.indexOf(car);
  $('#cIdx').textContent = String(i + 1).padStart(2, '0');
  $('#cType').textContent = `${car.type} · ${car.fuel === 'ev' ? 'Electric' : 'Combustion'}`;
  $('#cName').textContent = car.name;
  $('#cThesis').textContent = car.thesis;
  $('#cPrice').textContent = fmtMoney(car.price);
  $('#cDrive').textContent = car.drivetrain;
  $('#cBody').textContent = car.body;
  const prev = CARS[(i - 1 + CARS.length) % CARS.length], next = CARS[(i + 1) % CARS.length];
  $('#cPrev').href = `car.html?car=${prev.id}`; $('#cPrev').setAttribute('aria-label', prev.name);
  $('#cNext').href = `car.html?car=${next.id}`; $('#cNext').setAttribute('aria-label', next.name);

  $('#cSpecs').innerHTML = car.specs.map(([k, v]) => `<div class="reveal"><dt>${k}</dt><dd>${v}</dd></div>`).join('');
  $('#cHighs').innerHTML = car.highlights.map(([h, p], k) =>
    `<li class="reveal"><span class="mono">${String(k + 1).padStart(2, '0')}</span><h3>${h}</h3><p>${p}</p></li>`).join('');

  /* configurator */
  $('#optPaint').innerHTML = paintsFor(car).map(p =>
    `<li><button class="paint" role="radio" data-code="${p.code}" style="--c:${p.hex}" aria-label="${p.name}, ${p.code}">` +
    `<i></i><span class="mono">${p.code}</span></button></li>`).join('');
  const optRow = (o, attr, role) =>
    `<li><button class="opt" ${role ? `role="${role}"` : ''} data-${attr}="${o.id}"><span>${o.name}</span>` +
    `<span class="mono">${o.price ? '+ ' + fmtMoney(o.price) : 'Included'}</span></button></li>`;
  $('#optWheel').innerHTML = WHEEL_OPTS.map(o => optRow(o, 'wheel', 'radio')).join('');
  $('#optInterior').innerHTML = OPTIONS.interior.map(o => optRow(o, 'interior', 'radio')).join('');
  $('#optPacks').innerHTML = OPTIONS.packs.map(o => optRow(o, 'pack')).join('');

  $('#optPaint').addEventListener('click', e => {
    const b = e.target.closest('[data-code]'); if (!b) return;
    build.paint = PAINTS[b.dataset.code]; stage.setPaint(build.paint); update();
  });
  $('#optWheel').addEventListener('click', e => {
    const b = e.target.closest('[data-wheel]'); if (!b) return;
    build.wheel = WHEEL_OPTS.find(w => w.id === b.dataset.wheel); stage.setWheels(build.wheel.id); update();
  });
  $('#optInterior').addEventListener('click', e => {
    const b = e.target.closest('[data-interior]'); if (!b) return;
    build.interior = OPTIONS.interior.find(o => o.id === b.dataset.interior); update();
  });
  $('#optPacks').addEventListener('click', e => {
    const b = e.target.closest('[data-pack]'); if (!b) return;
    const id = b.dataset.pack;
    build.packs.has(id) ? build.packs.delete(id) : build.packs.add(id); update();
  });
  $('#copyBuild').addEventListener('click', async () => {
    const label = $('#copyBuild span');
    try { await navigator.clipboard.writeText(location.href); label.textContent = 'Link copied'; }
    catch { label.textContent = 'Copy the address bar'; }
    setTimeout(() => { label.textContent = 'Copy build link'; }, 2200);
  });

  update();
}

function query() {
  const q = new URLSearchParams({ car: car.id, paint: build.paint.code, wheel: build.wheel.id });
  if (build.interior.id !== OPTIONS.interior[0].id) q.set('interior', build.interior.id);
  if (build.packs.size) q.set('packs', [...build.packs].join(','));
  return q;
}

/* the running total, the build code, and the routes that drive it */
function update() {
  for (const b of $$('#optPaint .paint')) b.setAttribute('aria-checked', String(b.dataset.code === build.paint.code));
  for (const b of $$('#optWheel .opt')) b.setAttribute('aria-checked', String(b.dataset.wheel === build.wheel.id));
  for (const b of $$('#optInterior .opt')) b.setAttribute('aria-checked', String(b.dataset.interior === build.interior.id));
  for (const b of $$('#optPacks .opt')) b.setAttribute('aria-pressed', String(build.packs.has(b.dataset.pack)));
  $('#selPaint').textContent = `${build.paint.code} · ${build.paint.name}`;

  const packs = OPTIONS.packs.filter(p => build.packs.has(p.id));
  const lines = [
    [car.name, car.price], [`${build.paint.code} ${build.paint.name}`, build.paint.price],
    [build.wheel.name, build.wheel.price], [build.interior.name, build.interior.price],
    ...packs.map(p => [p.name, p.price])
  ];
  $('#totalLines').innerHTML = lines.map(([k, v]) => `<li><span>${k}</span><b>${v ? fmtMoney(v) : '—'}</b></li>`).join('');
  const sum = lines.reduce((a, [, v]) => a + v, 0);
  const el = $('#totalSum');
  const from = +(el.dataset.v || sum);
  el.dataset.v = sum;
  if (REDUCED || from === sum) el.textContent = fmtMoney(sum);
  else {
    const o = { v: from };
    gsap.to(o, { v: sum, duration: 0.6, ease: 'power2.out', onUpdate: () => { el.textContent = fmtMoney(o.v); } });
  }
  $('#buildCode').textContent = [car.name, build.paint.code, `W-${build.wheel.id.toUpperCase()}`,
    `I-${build.interior.id.toUpperCase()}`, ...packs.map(p => `P-${p.id.toUpperCase()}`)].join(' / ');

  const q = query();
  history.replaceState(null, '', `${location.pathname}?${q}${location.hash}`);

  /* the simulator gets the build: paint and wheels */
  const dq = new URLSearchParams({ car: car.id, paint: build.paint.code, wheel: build.wheel.id });
  $('#routesList').innerHTML = Object.values(WORLDS).map(w => {
    const home = w.id === car.drive.world;
    return `<li><a class="route" href="drive.html?${dq}&world=${w.id}">` +
      `<div><span class="mono">${home ? '<span class="route__default">Suggested</span>' : 'Route'}</span><h3>${w.name}</h3><p>${w.sub}</p></div>` +
      `<span class="route__go">Drive ${car.name} <i>→</i></span></a></li>`;
  }).join('');
  $('#driveBuild').href = `drive.html?${dq}&world=${car.drive.world}`;
  $('#navDrive').href = `drive.html?${dq}&world=${car.drive.world}`;
}

boot().catch(err => {
  console.error('[omen] the car page could not start', err);
  window.__omenHandOver?.();
});
