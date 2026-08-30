/* ═══════════════════════════════════════════════════════════
   CAR DETAIL
   One car, on its own podium: specification, finishes, and the
   way through to the simulator.
   ═══════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { Podium } from './showcase.js';
import { CARS, BY_ID, WORLDS } from './cars.js';

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];

gsap.registerPlugin(ScrollTrigger);
gsap.defaults({ ease: 'power3.out' });

const params = new URLSearchParams(location.search);
const car = BY_ID[params.get('car')] || CARS[0];
const index = CARS.indexOf(car);

/* ─────────────────────────── copy ──────────────────────────── */
function paintPage() {
  document.title = `${car.name} — Meridian Autohaus`;

  $('#dYear').textContent = `${car.year} · ${car.line}`;
  $('#dName').textContent = car.name;
  $('#dLine').textContent = car.blurb;
  $('#dPrice').textContent = car.price;
  $('#dProto').textContent = car.specs[0][1];
  $('#dWorld').textContent = WORLDS[car.drive.world].name;
  $('#dBlurb').textContent = car.blurb;

  const driveHref = `drive.html?car=${car.id}&world=${car.drive.world}`;
  $('#dDrive').href = driveHref;
  $('#topDrive').href = driveHref;

  $('#dSpecs').innerHTML = car.specs
    .map(([k, v]) => `<li><em>${k}</em><span>${v}</span></li>`).join('');
  $('#dHighlights').innerHTML = car.highlights.map(h => `<li>${h}</li>`).join('');

  $('#dPaints').innerHTML = car.paints.map((p, i) => `
    <button class="swatch${i === 0 ? ' is-active' : ''}" data-i="${i}">
      <i style="--c:${p.hex}"></i><span>${p.name}</span>
    </button>`).join('');
  $('#dPaintName').textContent = car.paints[0].name;
  $('#dPaintCode').textContent = car.paints[0].code;

  $('#dDriveLede').textContent = car.drive.world === 'circuit'
    ? 'This one runs on a Grand Prix circuit against a full field, with live timing and a flying lap.'
    : `Drive it yourself — traffic, time of day and three camera positions. ${WORLDS[car.drive.world].note}`;

  /* the three simulator settings, with this car's own one marked */
  $('#dWorlds').innerHTML = Object.values(WORLDS).map(w => `
    <a class="drive-card${w.id === car.drive.world ? ' is-native' : ''}"
       href="drive.html?car=${car.id}&world=${w.id}"
       style="--g1:${w.id === 'vegas' ? '#241a12' : w.id === 'circuit' ? '#101d19' : '#111820'};--g2:#040405">
      <div>
        <em>${w.id === car.drive.world ? 'Recommended' : 'Also available'}</em>
        <h3>${w.name}</h3>
        <p>${w.note}</p>
      </div>
      <span class="drive-card__go">${w.sub}
        <svg viewBox="0 0 24 24"><path d="M4 12 H19 M13 6 L19 12 L13 18" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>
      </span>
    </a>`).join('');

  $('#dCredit').innerHTML =
    `The 3D model on this page is <a href="${car.credit.modelUrl}" target="_blank" rel="noopener nofollow">${car.name}</a> ` +
    `by <a href="${car.credit.authorUrl}" target="_blank" rel="noopener nofollow">${car.credit.author}</a>, published on Sketchfab. ` +
    `The car in the driving simulator is built at runtime by this site and is a stand-in, not the model shown here.`;

  const prev = CARS[(index - 1 + CARS.length) % CARS.length];
  const next = CARS[(index + 1) % CARS.length];
  $('#dPrev').href = `car.html?car=${prev.id}`;
  $('#dPrev').querySelector('span').textContent = prev.name;
  $('#dNext').href = `car.html?car=${next.id}`;
  $('#dNext').querySelector('span').textContent = next.name;
}

/* ─────────────────────── the stage ─────────────────────────── */
function initStage() {
  const root = $('#detailStage');
  const podium = new Podium(root).init();
  /* the hero is a full viewport: stand further back and hold the car
     up and to the right, clear of the copy in the lower left */
  podium.setFraming({ camX: 1.05, camY: 2.6, camZ: 12.4, lookX: -1.35, lookY: 0.30 });
  podium.visible = true;
  window.__podium = podium;

  podium.show(index);

  /* whether the Sketchfab layer or the runtime body took the podium
     decides what the configurator can promise */
  root.addEventListener('podium:ready', e => {
    $('#dPaintNote').textContent = e.detail.live
      ? 'Finishes are applied to the model above where its materials expose a body colour. Some third-party models ship with a baked finish and will not change.'
      : 'The Sketchfab model could not be reached, so the runtime body is on the podium. Finishes apply to it directly.';
  });

  return podium;
}

/* ───────────────────── the configurator ────────────────────── */
/* what each option adds, so the summary is not decorative */
const WHEEL_OPTIONS = {
  chrome: { label: 'Polished cross-spoke', add: 0 },
  dark:   { label: 'Matt black forged', add: 3400 },
  race:   { label: 'Centre-lock race', add: 6900 }
};
const CALIPER_OPTIONS = {
  '#8d0f14': { label: 'Signal red', add: 0 },
  '#c9a227': { label: 'Gold', add: 890 },
  '#1c1f22': { label: 'Anthracite', add: 640 },
  '#d8dde2': { label: 'Silver', add: 640 }
};

const build = { paint: null, wheels: 'chrome', caliper: '#8d0f14' };

function basePrice() {
  const n = parseInt(String(car.price).replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function renderBuild() {
  $('#bModel').textContent = car.short;
  $('#bPaint').textContent = build.paint ? build.paint.name : car.paints[0].name;
  $('#bWheels').textContent = WHEEL_OPTIONS[build.wheels].label;
  $('#bCal').textContent = CALIPER_OPTIONS[build.caliper].label;

  const base = basePrice();
  const el = $('#bTotal');
  if (base == null) {
    el.textContent = car.price;               // "On application", "Not for sale"
    return;
  }
  const total = base + WHEEL_OPTIONS[build.wheels].add + CALIPER_OPTIONS[build.caliper].add;
  const from = parseInt(el.dataset.v || String(base), 10);
  el.dataset.v = String(total);
  gsap.to({ v: from }, {
    v: total, duration: 0.7, ease: 'power2.out',
    onUpdate() {
      el.textContent = '£' + Math.round(this.targets()[0].v).toLocaleString('en-GB');
    }
  });
}

function initConfigurator(podium) {
  const swatches = $$('#dPaints .swatch');
  build.paint = car.paints[0];
  renderBuild();

  swatches.forEach(btn => btn.addEventListener('click', () => {
    if (btn.classList.contains('is-active')) return;
    swatches.forEach(s => s.classList.remove('is-active'));
    btn.classList.add('is-active');

    const paint = car.paints[+btn.dataset.i];
    build.paint = paint;
    renderBuild();
    podium.setPaint(car.id, paint);
    podium.setSketchfabPaint(paint);

    const name = $('#dPaintName'), code = $('#dPaintCode');
    gsap.timeline()
      .to([name, code], { y: -14, opacity: 0, duration: 0.3, ease: 'power2.in' })
      .add(() => { name.textContent = paint.name; code.textContent = paint.code; })
      .fromTo([name, code], { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.05 });

    /* the podium answers the change */
    podium.beamPulse = 1;
  }));

  /* wheels and calipers act on the runtime body, which is always there */
  $$('#dWheels .opt').forEach(b => b.addEventListener('click', () => {
    $$('#dWheels .opt').forEach(o => o.classList.remove('is-active'));
    b.classList.add('is-active');
    const rec = podium.cars.get(car.id);
    if (!rec) return;
    const M = rec.materials;
    const look = b.dataset.wheel;
    build.wheels = look;
    renderBuild();
    const c = look === 'dark' ? 0x1a1c1f : look === 'race' ? 0x3a3f45 : 0xc9d1d9;
    gsap.to(M.chrome.color, { r: ((c >> 16) & 255) / 255, g: ((c >> 8) & 255) / 255, b: (c & 255) / 255, duration: 0.7 });
    gsap.to(M.chrome, { roughness: look === 'dark' ? 0.5 : look === 'race' ? 0.32 : 0.10, duration: 0.7 });
    podium.beamPulse = 0.7;
  }));

  $$('#dCalipers .opt').forEach(b => b.addEventListener('click', () => {
    $$('#dCalipers .opt').forEach(o => o.classList.remove('is-active'));
    b.classList.add('is-active');
    build.caliper = b.dataset.cal;
    renderBuild();
    const rec = podium.cars.get(car.id);
    if (!rec) return;
    const col = new THREE.Color(b.dataset.cal);
    gsap.to(rec.materials.trim.color, { r: col.r, g: col.g, b: col.b, duration: 0.7 });
  }));
}

/* ───────────────────── page furniture ──────────────────────── */
function initChrome() {
  /* smooth scroll */
  if (!REDUCED && typeof Lenis !== 'undefined') {
    const lenis = new Lenis({ duration: 1.3, lerp: 0.09, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    addEventListener('scroll', () => ScrollTrigger.update(), { passive: true });
    window.__lenis = lenis;
  }

  /* line + fade reveals, same language as the showroom */
  $$('[data-reveal="line"]').forEach(el => {
    if (!el.querySelector(':scope > span')) el.innerHTML = `<span>${el.innerHTML}</span>`;
    gsap.fromTo(el.firstElementChild, { yPercent: 115 }, {
      yPercent: 0, duration: 1.3, ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 90%', once: true }
    });
  });
  $$('[data-reveal="fade"]').forEach(el => {
    gsap.fromTo(el, { y: 30, opacity: 0 }, {
      y: 0, opacity: 1, duration: 1.1,
      scrollTrigger: { trigger: el, start: 'top 92%', once: true }
    });
  });
  $$('.spec-table li, .highlights li, .drive-card').forEach((el, i) => {
    gsap.fromTo(el, { y: 26, opacity: 0 }, {
      y: 0, opacity: 1, duration: 0.9, delay: (i % 6) * 0.05,
      scrollTrigger: { trigger: el, start: 'top 94%', once: true }
    });
  });

  /* custom cursor + magnetic buttons */
  if (!matchMedia('(pointer:coarse)').matches) {
    const ring = $('#cursor'), dot = $('#cursorDot');
    const p = { x: innerWidth / 2, y: innerHeight / 2 }, r = { ...p };
    addEventListener('pointermove', e => { p.x = e.clientX; p.y = e.clientY; }, { passive: true });
    gsap.ticker.add(() => {
      r.x += (p.x - r.x) * 0.16; r.y += (p.y - r.y) * 0.16;
      ring.style.transform = `translate3d(${r.x}px,${r.y}px,0)`;
      dot.style.transform = `translate3d(${p.x}px,${p.y}px,0)`;
    });
    $$('a, button, .swatch, .opt').forEach(el => {
      el.addEventListener('pointerenter', () => ring.classList.add('is-hover'));
      el.addEventListener('pointerleave', () => ring.classList.remove('is-hover'));
    });
    $$('[data-magnetic]').forEach(el => {
      el.addEventListener('pointermove', e => {
        const b = el.getBoundingClientRect();
        gsap.to(el, { x: (e.clientX - (b.left + b.width / 2)) * 0.3, y: (e.clientY - (b.top + b.height / 2)) * 0.3, duration: 0.7 });
      });
      el.addEventListener('pointerleave', () => gsap.to(el, { x: 0, y: 0, duration: 1, ease: 'elastic.out(1,.35)' }));
    });
  }

  /* the wipe that covers every navigation between pages */
  const wipe = $('#wipe');
  gsap.timeline()
    .add(() => wipe.classList.add('is-done'), 0.35)
    .to(wipe, { yPercent: -100, duration: 0.95, ease: 'power4.inOut', delay: 0.15 })
    .set(wipe, { yPercent: 100 });

  $$('a[href]').forEach(a => {
    const url = a.getAttribute('href');
    if (!url || url.startsWith('#') || a.target === '_blank') return;
    a.addEventListener('click', e => {
      e.preventDefault();
      wipe.classList.remove('is-done');
      gsap.to(wipe, {
        yPercent: 0, duration: 0.7, ease: 'power4.inOut',
        onComplete: () => { location.href = url; }
      });
    });
  });
}

/* ─────────────────────────── boot ──────────────────────────── */
paintPage();
const podium = initStage();
initConfigurator(podium);
initChrome();

/* hero copy arrives after the car */
gsap.from('.detail-hero__copy > *', {
  y: 40, opacity: 0, duration: 1.2, stagger: 0.09, delay: 0.9, ease: 'expo.out'
});
