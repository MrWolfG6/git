/* ═══════════════════════════════════════════════════════════
   SCROLL → POSE
   Sections own camera poses. Every section after the first gets a
   ScrollTrigger that scrubs one number, 0 → 1, as it arrives. The
   stage's target is the SCENES table folded over those numbers,
   and the stage damps toward it frame-rate independently.

   No tween owns a pose property. A scrubbed tween at progress 0
   rewrites its start value on every update and silently pins
   whatever it touches; reading progress avoids owning anything.
   ═══════════════════════════════════════════════════════════ */

import { POSE_KEYS } from './stage.js';
import { $$ } from './common.js';

export function scrollPoses(stage, SCENES, SPIN = {}, onActive) {
  const { ScrollTrigger } = window;
  const sections = $$('[data-scene]');
  const names = sections.map(s => s.dataset.scene);
  const triggers = sections.map((sec, i) => i === 0 ? null : ScrollTrigger.create({
    trigger: sec, start: 'top bottom', end: 'top 25%'
  }));
  const smooth = t => t * t * (3 - 2 * t);
  const target = { ...SCENES[names[0]] };
  let last = null;

  stage.onFrame = () => {
    Object.assign(target, SCENES[names[0]]);
    let active = names[0];
    for (let i = 1; i < sections.length; i++) {
      const t = triggers[i].progress;
      if (t <= 0) break;
      const e = smooth(t), q = SCENES[names[i]];
      for (const k of POSE_KEYS) target[k] += (q[k] - target[k]) * e;
      if (t > 0.5) active = names[i];
    }
    stage.target = target;
    stage.spinRate = SPIN[active] || 0;
    if (active !== last) { last = active; onActive?.(active); }
  };
  return { sections, names };
}

/* nav link state, the backing, anchors through Lenis, the mobile menu */
export function bindNav(lenis, scrollToEl, $) {
  const { ScrollTrigger } = window;
  const links = new Map($$('.nav__links a[href^="#"]').map(a => [a.getAttribute('href').slice(1), a]));
  for (const sec of $$('main > section[id]')) {
    ScrollTrigger.create({
      trigger: sec, start: 'top 55%', end: 'bottom 55%',
      onToggle: self => links.get(sec.id)?.classList.toggle('is-on', self.isActive)
    });
  }
  ScrollTrigger.create({ start: 60, end: 'max', onToggle: self => $('#nav').classList.toggle('is-solid', self.isActive) });
  for (const a of $$('a[href^="#"]')) {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      const el = id.length > 1 && $(id);
      if (!el) return;
      e.preventDefault();
      $('#nav').classList.remove('is-open');
      $('#navMenu').setAttribute('aria-expanded', 'false');
      scrollToEl(lenis, el);
    });
  }
  $('#navMenu').addEventListener('click', () => {
    const open = $('#nav').classList.toggle('is-open');
    $('#navMenu').setAttribute('aria-expanded', String(open));
  });
}

export function bindReveals(REDUCED) {
  const { gsap, ScrollTrigger } = window;
  if (REDUCED) return;
  gsap.set('.reveal', { opacity: 0 });
  ScrollTrigger.batch('.reveal', {
    start: 'top 88%',
    onEnter: els => gsap.fromTo(els, { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 1.1, stagger: 0.08, ease: 'power3.out', overwrite: true })
  });
}
