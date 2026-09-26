/* ═══════════════════════════════════════════════════════════
   SHARED: quality tier, reduced motion, smooth scroll, boot flag
   ═══════════════════════════════════════════════════════════ */

export const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const COARSE = matchMedia('(pointer: coarse)').matches;

/* Picked once at boot. Low drops reflections, bloom and antialiasing,
   halves geometry detail and thins traffic. */
export const TIER = (() => {
  const q = new URLSearchParams(location.search).get('tier');
  if (q === 'low' || q === 'mid' || q === 'high') return q;
  const w = Math.min(innerWidth, screen.width || innerWidth);
  const mem = navigator.deviceMemory || 8;          // Safari/Firefox do not report: assume capable
  const lowMem = mem <= 4 && COARSE;              // a 4 GB phone, not a 4 GB laptop
  const cores = navigator.hardwareConcurrency || 8;
  if (mem <= 2 || lowMem || cores <= 2 || (COARSE && w < 900) || w < 700) return 'low';
  if (w >= 1400 && mem >= 8 && !COARSE) return 'high';
  return 'mid';
})();
document.documentElement.dataset.tier = TIER;

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* the watchdog in each page's <head> reads this */
export function markBooted() { window.__OMEN_BOOTED = true; }

/* frame-rate independent damping: the same result at 30 and 144 fps */
export const damp = (a, b, lambda, dt) => a + (b - a) * (1 - Math.exp(-lambda * dt));

export const fmtMoney = n => 'EUR ' + Math.round(n).toLocaleString('en-GB').replace(/,/g, ' ');

/* Lenis drives the scroll; ScrollTrigger only hears what it is told.
   Anything that moves the page without Lenis — keyboard, find-in-page,
   scroll restoration — still fires a native scroll, so that is
   forwarded too, or the choreography desyncs. */
export function initSmoothScroll() {
  const { gsap, ScrollTrigger } = window;
  gsap.registerPlugin(ScrollTrigger);
  addEventListener('scroll', () => ScrollTrigger.update(), { passive: true });
  if (REDUCED || !window.Lenis) return null;
  const lenis = new window.Lenis({ duration: 1.15, smoothWheel: true, wheelMultiplier: 0.95 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  return lenis;
}

export function scrollToEl(lenis, el, offset = 0) {
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { offset, duration: 1.4 });
  else el.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth' });
}
