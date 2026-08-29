/* ═══════════════════════════════════════════════════════════
   MERIDIAN AUTOHAUS — interaction layer
   Loader · smooth scroll · scroll choreography · micro-detail
   ═══════════════════════════════════════════════════════════ */

import { Stage } from './scene.js';

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];

gsap.registerPlugin(ScrollTrigger);
gsap.defaults({ ease: 'power3.out' });

/* ═══════════════════════════════════════════════════════════
   1 · SMOOTH SCROLL
   ═══════════════════════════════════════════════════════════ */
let lenis = null;
function initLenis() {
  if (REDUCED || typeof Lenis === 'undefined') return;
  lenis = new Lenis({
    duration: 1.35,
    easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    lerp: 0.085,
    wheelMultiplier: 0.95,
    touchMultiplier: 1.6
  });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(time => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  /* backstop: anything that moves the page without going through Lenis
     (keyboard, find-in-page, browser scroll restoration) still has to
     reach ScrollTrigger, or the camera silently stops following */
  window.addEventListener('scroll', () => ScrollTrigger.update(), { passive: true });

  lenis.stop();
  window.__lenis = lenis;
}

function anchorScroll() {
  $$('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      const el = id === '#top' ? document.body : $(id);
      if (!el) return;
      e.preventDefault();
      document.body.classList.remove('menu-open');
      if (lenis) lenis.scrollTo(el, { offset: 0, duration: 1.8 });
      else el.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth' });
    });
  });
}

/* ═══════════════════════════════════════════════════════════
   2 · TYPE SPLITTING
   ═══════════════════════════════════════════════════════════ */
function prepareType() {
  $$('[data-reveal="line"]').forEach(el => {
    if (el.querySelector(':scope > span')) return;
    el.innerHTML = `<span>${el.innerHTML}</span>`;
  });
}

/* ═══════════════════════════════════════════════════════════
   3 · PRELOADER
   ═══════════════════════════════════════════════════════════ */
function drawLoaderStar() {
  $$('#loader .ls-ring, #loader .ls-spoke').forEach((el, i) => {
    const len = el.getTotalLength ? el.getTotalLength() : 300;
    el.style.strokeDasharray = len;
    el.style.strokeDashoffset = len;
    el.dataset.len = len;
    el.dataset.order = i;
  });
}

function loaderIntro() {
  const tl = gsap.timeline();
  tl.to('#loader .ls-ring', { strokeDashoffset: 0, duration: 1.5, ease: 'power2.inOut' })
    .to('#loader .ls-spoke', { strokeDashoffset: 0, duration: 0.85, stagger: 0.11, ease: 'power2.out' }, '-=0.85')
    .to('.loader__word span', { y: 0, opacity: 1, duration: 1.05, stagger: 0.055, ease: 'expo.out' }, '-=0.9')
    .to('.loader__sub', { opacity: 1, duration: 0.9 }, '-=0.6');
  return tl;
}

function setProgress(pct, label) {
  const counter = $('#loaderCount');
  const bar = $('#loaderBar');
  const status = $('#loaderStatus');
  if (label && status && status.textContent !== label) {
    gsap.fromTo(status, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.5, overwrite: true });
    status.textContent = label;
  }
  gsap.to({ v: parseFloat(counter.textContent) || 0 }, {
    v: pct, duration: 0.7, ease: 'power2.out', overwrite: true,
    onUpdate() { counter.textContent = Math.round(this.targets()[0].v); }
  });
  gsap.to(bar, { width: pct + '%', duration: 0.8, ease: 'power2.out', overwrite: true });
}

function revealSite(stage) {
  const tl = gsap.timeline({
    onComplete: () => {
      $('#loader').style.display = 'none';
      ScrollTrigger.refresh();
    }
  });

  tl.to('.loader__meta, .loader__bar', { opacity: 0, duration: 0.5 })
    .to('.loader__inner', { y: -50, opacity: 0, duration: 1.0, ease: 'power3.inOut' }, '-=0.25')
    .to('.loader__curtain', { y: '0%', duration: 0.9, ease: 'power4.inOut' }, '-=0.5')
    .add(() => {
      document.body.classList.remove('is-loading');
      lenis?.start();
      window.scrollTo(0, 0);
    })
    .set('#loader', { background: 'transparent' })
    .to('.loader__curtain', { y: '-100%', duration: 1.25, ease: 'power4.inOut' })

    /* the car arrives with the curtain */
    .fromTo(stage.cam, { z: 11.0, y: 3.0 }, { z: SCENES.hero.cam.z, y: SCENES.hero.cam.y, duration: 2.6, ease: 'power3.out' }, '<')
    .fromTo(stage.car, { rotY: -1.15 }, { rotY: SCENES.hero.car.rotY, duration: 2.8, ease: 'power3.out' }, '<')
    .fromTo(stage.fx, { exposure: 0, bloom: 1.5 }, { exposure: SCENES.hero.fx.exposure, bloom: SCENES.hero.fx.bloom, duration: 2.2, ease: 'power2.out' }, '<')

    .fromTo('.nav', { y: -60, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1 }, '-=1.9')
    .fromTo('#hero .eyebrow', { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 1 }, '-=1.7')
    .fromTo('#hero .line > span', { yPercent: 118 }, { yPercent: 0, duration: 1.5, stagger: 0.12, ease: 'expo.out' }, '-=1.5')
    .fromTo('#hero .hero__lede', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1 }, '-=1.0')
    .fromTo('#hero .hero__actions', { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: 1 }, '-=0.85')
    .fromTo('.hero__meta, .hero__scroll', { opacity: 0 }, { opacity: 1, duration: 1 }, '-=0.8');

  return tl;
}

/* ═══════════════════════════════════════════════════════════
   4 · SCROLL CHOREOGRAPHY
   Each section owns a camera position. The transition happens
   while the section scrolls into frame, scrubbed to the wheel.
   ═══════════════════════════════════════════════════════════ */
const SCENES = {
  hero: {
    cam:  { x: 5.0, y: 1.42, z: 6.3, fov: 38 },
    look: { x: -0.35, y: 0.34, z: 0 },
    car:  { rotY: -0.36, x: 0, y: 0, tilt: 0 },
    fx:   { exposure: 1.02, bloom: 0.36, lights: 0.15, spin: 0.5, dust: 0.5 },
    dim:  0
  },
  heritage: {                        /* side profile, held to the right of the copy */
    cam:  { x: 0.10, y: 0.86, z: 9.2, fov: 32 },
    look: { x: -1.30, y: 0.58, z: 0 },
    car:  { rotY: 0, x: 0, y: 0, tilt: 0 },
    fx:   { exposure: 1.06, bloom: 0.30, lights: 0.05, spin: 0.12, dust: 0.3 },
    dim:  0.20
  },
  design: {                          /* hard in on the grille and the star.
                                        the look target follows the grille through
                                        the car's own rotation, not the world axis */
    cam:  { x: 4.60, y: 1.25, z: 2.60, fov: 32 },
    look: { x: 1.50, y: 0.05, z: -0.20 },
    car:  { rotY: -0.18, x: 0, y: 0, tilt: 0 },
    fx:   { exposure: 1.12, bloom: 0.5, lights: 0.95, spin: 0.04, dust: 0.55 },
    dim:  0.38
  },
  performance: {                     /* the front wheel, wound up */
    cam:  { x: 2.45, y: 0.42, z: 2.35, fov: 34 },
    look: { x: 1.534, y: 0.35, z: 0.593 },
    car:  { rotY: 0.16, x: 0, y: 0, tilt: 0 },
    fx:   { exposure: 1.16, bloom: 0.6, lights: 0.45, spin: 9, dust: 0.85 },
    dim:  0.34
  },
  configure: {                       /* turntable, car held right of the swatches */
    cam:  { x: 5.3, y: 1.78, z: 7.4, fov: 36 },
    look: { x: -0.80, y: 0.48, z: 0 },
    car:  { rotY: -0.62, x: 0, y: 0, tilt: 0 },
    fx:   { exposure: 1.10, bloom: 0.42, lights: 0.55, spin: 0.08, dust: 0.4 },
    dim:  0.14
  },
  collection: {                      /* lifted overhead and out of the way */
    cam:  { x: 0.35, y: 4.3, z: 6.8, fov: 40 },
    look: { x: 0, y: 0.10, z: 0 },
    car:  { rotY: -0.95, x: 0, y: -0.35, tilt: 0.03 },
    fx:   { exposure: 0.8, bloom: 0.24, lights: 0.2, spin: 0.3, dust: 0.2 },
    dim:  0.70
  },
  experience: {                      /* rear three-quarter, lights lit */
    cam:  { x: -4.35, y: 1.02, z: 3.75, fov: 35 },
    look: { x: -1.30, y: 0.62, z: 0 },
    car:  { rotY: -0.34, x: 0, y: 0, tilt: 0 },
    fx:   { exposure: 1.0, bloom: 0.6, lights: 1.0, spin: 0.18, dust: 0.65 },
    dim:  0.44
  },
  contact: {                         /* the whole car, centred, far upstage */
    cam:  { x: 0.40, y: 1.55, z: 13.6, fov: 34 },
    look: { x: 0.15, y: 0.16, z: 0 },
    car:  { rotY: -0.42, x: 0, y: 0, tilt: 0 },
    fx:   { exposure: 0.92, bloom: 0.5, lights: 1.0, spin: 0.28, dust: 0.5 },
    dim:  0.46
  }
};

function initChoreography(stage) {
  $$('[data-scene]').forEach((section, i) => {
    const preset = SCENES[section.dataset.scene];
    if (!preset) return;

    if (i === 0) return;                 // the hero preset is the boot state

    /* the move happens while the section travels into frame */
    const st = { trigger: section, start: 'top bottom', end: 'top 28%', scrub: 1 };

    gsap.to(stage.cam,  { ...preset.cam,  ease: 'none', immediateRender: false, scrollTrigger: st });
    gsap.to(stage.look, { ...preset.look, ease: 'none', immediateRender: false, scrollTrigger: { ...st } });
    gsap.to(stage.car,  { ...preset.car,  ease: 'none', immediateRender: false, scrollTrigger: { ...st } });
    gsap.to(stage.fx,   { ...preset.fx,   ease: 'none', immediateRender: false, scrollTrigger: { ...st } });
    gsap.to('#stageDim', { opacity: preset.dim, ease: 'none', immediateRender: false, scrollTrigger: { ...st } });
  });

  /* hero content drifts away as you leave it */
  gsap.to('.hero__content', {
    y: -110, opacity: 0, ease: 'none',
    scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom 40%', scrub: 0.8 }
  });

  /* a slow continuous turntable through the configurator.
     It drives its own axis: a scrubbed tween holds its start value
     whenever it sits at progress 0, which would otherwise pin the
     section pose of every section above it. */
  gsap.fromTo(stage.car, { turn: 0 }, {
    turn: 1.35, ease: 'none', immediateRender: false,
    scrollTrigger: { trigger: '#configure', start: 'top 30%', end: 'bottom top', scrub: 1.4 }
  });
}

/* ═══════════════════════════════════════════════════════════
   5 · CONTENT REVEALS
   ═══════════════════════════════════════════════════════════ */
function initReveals() {
  $$('.section:not(#hero) [data-reveal="line"] > span').forEach(span => {
    gsap.fromTo(span, { yPercent: 115 }, {
      yPercent: 0, duration: 1.35, ease: 'expo.out',
      scrollTrigger: { trigger: span.parentElement, start: 'top 88%', once: true }
    });
  });

  $$('.section:not(#hero) [data-reveal="fade"]').forEach((el, i) => {
    gsap.fromTo(el, { y: 34, opacity: 0 }, {
      y: 0, opacity: 1, duration: 1.15, ease: 'power3.out', delay: (i % 4) * 0.06,
      scrollTrigger: { trigger: el, start: 'top 90%', once: true }
    });
  });

  /* feature grid: panels wipe in from the seam */
  $$('.feature, .spec, .pillar').forEach(el => {
    gsap.fromTo(el, { clipPath: 'inset(0 0 100% 0)', opacity: 0 }, {
      clipPath: 'inset(0 0 0% 0)', opacity: 1, duration: 1.4, ease: 'power4.out',
      scrollTrigger: { trigger: el, start: 'top 92%', once: true }
    });
  });
}

/* ═══════════════════════════════════════════════════════════
   6 · COUNTERS
   ═══════════════════════════════════════════════════════════ */
function initCounters() {
  $$('.count').forEach(el => {
    const target = parseFloat(el.dataset.count);
    const dec = parseInt(el.dataset.dec || '0', 10);
    const plain = el.dataset.plain === '1';
    const fmt = v => {
      const n = v.toFixed(dec);
      return plain ? n : Number(n).toLocaleString('en-GB', {
        minimumFractionDigits: dec, maximumFractionDigits: dec
      });
    };
    if (plain) { el.textContent = fmt(target); return; }
    el.textContent = fmt(0);
    ScrollTrigger.create({
      trigger: el, start: 'top 88%', once: true,
      onEnter: () => gsap.to({ v: 0 }, {
        v: target, duration: 2.4, ease: 'power3.out',
        onUpdate() { el.textContent = fmt(this.targets()[0].v); }
      })
    });
  });
}

/* ═══════════════════════════════════════════════════════════
   7 · HORIZONTAL COLLECTION
   ═══════════════════════════════════════════════════════════ */
function initHorizontal() {
  const section = $('#collection');
  const track = $('#hscrollTrack');
  if (!section || !track) return;

  const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);

  const tween = gsap.to(track, {
    x: () => -distance(), ease: 'none',
    scrollTrigger: {
      trigger: section,
      start: 'top top',
      end: () => '+=' + (distance() + window.innerHeight * 0.6),
      pin: true,
      scrub: 1,
      anticipatePin: 1,
      invalidateOnRefresh: true
    }
  });

  /* cards lean as they travel */
  $$('.card', track).forEach(card => {
    gsap.fromTo(card, { y: 60, opacity: 0.25 }, {
      y: 0, opacity: 1, duration: 1, ease: 'power2.out',
      scrollTrigger: {
        trigger: card, containerAnimation: tween,
        start: 'left 92%', end: 'left 55%', scrub: true
      }
    });
  });
}

/* ═══════════════════════════════════════════════════════════
   8 · MARQUEE
   ═══════════════════════════════════════════════════════════ */
function initMarquee() {
  const row = $('#marquee1');
  if (!row || REDUCED) return;
  gsap.to(row, { xPercent: -50, duration: 28, ease: 'none', repeat: -1 });
}

/* ═══════════════════════════════════════════════════════════
   9 · CONFIGURATOR
   ═══════════════════════════════════════════════════════════ */
function initConfigurator(stage) {
  const swatches = $$('#swatches .swatch');
  const name = $('#paintName');
  const code = $('#paintCode');

  swatches.forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('is-active')) return;
      swatches.forEach(s => s.classList.remove('is-active'));
      btn.classList.add('is-active');

      stage.setPaint(
        btn.dataset.color,
        parseFloat(btn.dataset.metal),
        parseFloat(btn.dataset.rough)
      );

      gsap.timeline()
        .to([name, code], { y: -14, opacity: 0, duration: 0.32, ease: 'power2.in' })
        .add(() => { name.textContent = btn.dataset.name; code.textContent = btn.dataset.code; })
        .fromTo([name, code], { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.05 });

      /* a flash of exposure as the new finish catches the light */
      gsap.timeline()
        .to(stage.fx, { exposure: 1.42, bloom: 0.95, duration: 0.28, ease: 'power2.out' })
        .to(stage.fx, { exposure: SCENES.configure.fx.exposure, bloom: SCENES.configure.fx.bloom, duration: 1.1, ease: 'power2.inOut' });
    });
  });
}

/* ═══════════════════════════════════════════════════════════
   10 · NAV / MENU / PROGRESS
   ═══════════════════════════════════════════════════════════ */
function initNav() {
  const nav = $('#nav');
  let last = 0;
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: self => {
      const y = self.scroll();
      nav.classList.toggle('is-stuck', y > 80);
      nav.classList.toggle('is-hidden', y > last && y > 420 && !document.body.classList.contains('menu-open'));
      last = y;
      $('#scrollBar').style.width = (self.progress * 100).toFixed(2) + '%';
    }
  });

  $('#burger')?.addEventListener('click', () => {
    document.body.classList.toggle('menu-open');
    const open = document.body.classList.contains('menu-open');
    if (open) {
      gsap.fromTo('.menu__grid a', { y: 40, opacity: 0 },
        { y: 0, opacity: 0.55, duration: 0.9, stagger: 0.07, delay: 0.25, ease: 'expo.out' });
    }
    lenis?.[open ? 'stop' : 'start']();
  });
}

/* ═══════════════════════════════════════════════════════════
   11 · CURSOR + MAGNETIC
   ═══════════════════════════════════════════════════════════ */
function initCursor() {
  if (window.matchMedia('(pointer:coarse)').matches) return;
  const ring = $('#cursor'), dot = $('#cursorDot');
  const p = { x: innerWidth / 2, y: innerHeight / 2 };
  const r = { ...p };

  window.addEventListener('pointermove', e => { p.x = e.clientX; p.y = e.clientY; }, { passive: true });
  gsap.ticker.add(() => {
    r.x += (p.x - r.x) * 0.16;
    r.y += (p.y - r.y) * 0.16;
    ring.style.transform = `translate3d(${r.x}px,${r.y}px,0)`;
    dot.style.transform = `translate3d(${p.x}px,${p.y}px,0)`;
  });

  $$('a, button, .swatch, .card').forEach(el => {
    el.addEventListener('pointerenter', () => ring.classList.add('is-hover'));
    el.addEventListener('pointerleave', () => ring.classList.remove('is-hover'));
  });

  $$('[data-magnetic]').forEach(el => {
    const strength = 0.34;
    el.addEventListener('pointermove', e => {
      const b = el.getBoundingClientRect();
      gsap.to(el, {
        x: (e.clientX - (b.left + b.width / 2)) * strength,
        y: (e.clientY - (b.top + b.height / 2)) * strength,
        duration: 0.7, ease: 'power3.out'
      });
    });
    el.addEventListener('pointerleave', () => {
      gsap.to(el, { x: 0, y: 0, duration: 1.1, ease: 'elastic.out(1,0.35)' });
    });
  });
}

/* ═══════════════════════════════════════════════════════════
   12 · FORM
   ═══════════════════════════════════════════════════════════ */
function initForm() {
  $$('.field input').forEach(input => {
    input.setAttribute('placeholder', ' ');
    const field = input.closest('.field');
    input.addEventListener('focus', () => field.classList.add('is-focus'));
    input.addEventListener('blur', () => {
      field.classList.remove('is-focus');
      field.classList.toggle('is-filled', input.value.trim() !== '');
    });
  });
  $$('.field select').forEach(sel => {
    const field = sel.closest('.field');
    sel.addEventListener('focus', () => field.classList.add('is-focus'));
    sel.addEventListener('blur', () => field.classList.remove('is-focus'));
  });

  $('#form')?.addEventListener('submit', e => {
    e.preventDefault();
    const note = $('#formNote');
    const name = $('#f-name').value.trim();
    const mail = $('#f-mail').value.trim();
    const ok = name && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail);

    note.textContent = ok
      ? `Thank you, ${name.split(' ')[0]} — our client team will be in touch within one working day.`
      : 'Please add your name and a valid email address.';
    gsap.fromTo(note, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.6 });
    if (ok) e.target.reset();
  });

  const y = $('#year');
  if (y) y.textContent = new Date().getFullYear();
}

/* ═══════════════════════════════════════════════════════════
   BOOT
   ═══════════════════════════════════════════════════════════ */
async function boot() {
  prepareType();
  drawLoaderStar();
  initLenis();
  const intro = loaderIntro();

  gsap.set('#hero .line > span', { yPercent: 118 });
  gsap.set('.nav, #hero .eyebrow, #hero .hero__lede, #hero .hero__actions, .hero__meta, .hero__scroll', { opacity: 0 });

  let stage;
  try {
    stage = new Stage($('#webgl'), { onProgress: setProgress });
    await stage.init();
  } catch (err) {
    console.error('[stage] WebGL unavailable —  falling back to flat presentation', err);
    document.body.classList.add('no-webgl');
    setProgress(100, 'Ready');
    stage = {
      cam:  { ...SCENES.hero.cam },
      look: { ...SCENES.hero.look },
      car:  { ...SCENES.hero.car, turn: 0 },
      fx:   { ...SCENES.hero.fx },
      setPaint() {}
    };
  }

  window.__stage = stage;

  initChoreography(stage);
  initReveals();
  initCounters();
  initHorizontal();
  initMarquee();
  initConfigurator(stage);
  initNav();
  initCursor();
  initForm();
  anchorScroll();

  /* never cut the intro short — the loader is part of the product */
  const minimum = new Promise(r => setTimeout(r, Math.max(0, 2600 - performance.now())));
  await Promise.all([intro.then(), minimum]);
  await revealSite(stage);

  ScrollTrigger.refresh();
  window.addEventListener('resize', () => ScrollTrigger.refresh());
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
