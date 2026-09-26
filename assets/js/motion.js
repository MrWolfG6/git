/* ═══════════════════════════════════════════════════════════
   MOTION — how copy arrives
   Every transition is a reading being taken, never a template fade:

   · headings   each word rises out of its own masked line
   · mono type  decodes: glyphs cycle and settle, left to right, the way
                an instrument locks on
   · paragraphs a hairline scans across and uncovers them as it passes
   · rows       their rule draws across first, then the row settles

   And the page forecasts itself: a rail on the left is the mark's
   hairline, filling as you read, and a readout says what is next and
   how far — it tells you first.
   ═══════════════════════════════════════════════════════════ */

const GLYPHS = '0123456789ABCDEFGHJKLMNPRSTUVWXYZ·/—';

/* wrap each word of a heading in a mask; an <em> travels as one word */
export function splitWords(el) {
  if (el.dataset.split) return [...el.querySelectorAll('.wi')];
  const out = [];
  const wrap = node => {
    const w = document.createElement('span'); w.className = 'w';
    const i = document.createElement('span'); i.className = 'wi';
    w.appendChild(i);
    if (typeof node === 'string') i.textContent = node; else i.appendChild(node);
    out.push(i);
    return w;
  };
  for (const node of [...el.childNodes]) {
    if (node.nodeType === 3) {
      const frag = document.createDocumentFragment();
      for (const part of node.textContent.split(/(\s+)/)) {
        if (!part) continue;
        frag.appendChild(/\s/.test(part) ? document.createTextNode(part) : wrap(part));
      }
      el.replaceChild(frag, node);
    } else if (node.nodeType === 1) {
      const holder = document.createElement('span');
      el.replaceChild(holder, node);
      holder.replaceWith(wrap(node));
    }
  }
  el.dataset.split = '1';
  return out;
}

/* glyphs cycle and settle, left to right */
export function decode(el, duration = 0.7) {
  const { gsap } = window;
  const nodes = [];
  const walk = n => {
    if (n.nodeType === 3 && n.textContent.trim()) nodes.push({ n, text: n.__final ?? n.textContent });
    else n.childNodes && n.childNodes.forEach(walk);
  };
  walk(el);
  if (!nodes.length) return;
  for (const o of nodes) o.n.__final = o.text;
  const total = nodes.reduce((a, o) => a + o.text.length, 0);
  const p = { v: 0 };
  gsap.killTweensOf(el.__decode || {});
  el.__decode = p;
  gsap.to(p, {
    v: 1, duration, ease: 'power2.out',
    onUpdate() {
      let seen = 0;
      const lock = p.v * total;
      for (const o of nodes) {
        let s = '';
        for (let i = 0; i < o.text.length; i++, seen++) {
          const c = o.text[i];
          s += (seen < lock || c === ' ') ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0];
        }
        o.n.textContent = s;
      }
    },
    onComplete() { for (const o of nodes) o.n.textContent = o.text; }
  });
}

/* a hairline scans across a block and uncovers it as it passes */
function scan(el, delay = 0) {
  const { gsap } = window;
  let line = el.querySelector(':scope > .scanline');
  if (!line) {
    line = document.createElement('i');
    line.className = 'scanline';
    line.setAttribute('aria-hidden', 'true');
    el.appendChild(line);
  }
  gsap.timeline({ delay, onComplete: () => gsap.set(el, { clearProps: 'clipPath' }) })
    .fromTo(el, { clipPath: 'inset(-2px 100% -2px 0)' }, { clipPath: 'inset(-2px 0% -2px 0)', duration: 1.15, ease: 'power3.inOut' }, 0)
    .fromTo(line, { left: '0%', opacity: 1 }, { left: '100%', duration: 1.15, ease: 'power3.inOut' }, 0)
    .to(line, { opacity: 0, duration: 0.3 }, 1.0);
}

/* a row's rule draws across, then its content settles */
function row(el, i) {
  const { gsap } = window;
  let rule = el.querySelector(':scope > .rowline');
  if (!rule) {
    rule = document.createElement('i');
    rule.className = 'rowline';
    rule.setAttribute('aria-hidden', 'true');
    el.appendChild(rule);
  }
  const d = i * 0.09;
  gsap.fromTo(rule, { scaleX: 0, opacity: 1 }, { scaleX: 1, duration: 1.1, ease: 'expo.out', delay: d });
  gsap.to(rule, { opacity: 0, duration: 0.9, delay: d + 1.0 });
  gsap.fromTo([...el.children].filter(c => c !== rule), { opacity: 0, x: -10 },
    { opacity: 1, x: 0, duration: 0.9, ease: 'power3.out', delay: d + 0.18, stagger: 0.06 });
}

const ROWS = '.reads > li, .terms > div, .stats > .stat, .spec > div, .highs > li';
const BLOCKS = '.reveal:not(.h2):not(li):not(.stat):not(.terms > div):not(.spec > div):not(.highs > li)';

export function initMotion(REDUCED) {
  const { gsap, ScrollTrigger } = window;
  document.querySelectorAll('.reveal').forEach(el => el.classList.remove('reveal'));   // the old fade is retired
  if (REDUCED) return;

  /* headings */
  for (const h of document.querySelectorAll('main .h2')) {
    const words = splitWords(h);
    gsap.set(words, { yPercent: 115 });
    ScrollTrigger.create({
      trigger: h, start: 'top 86%', once: true,
      onEnter: () => gsap.to(words, { yPercent: 0, duration: 1.2, stagger: 0.055, ease: 'expo.out' })
    });
  }
  /* eyebrows and mono labels */
  for (const e of document.querySelectorAll('main .eyebrow, main .coll__type, main .note')) {
    ScrollTrigger.create({ trigger: e, start: 'top 90%', once: true, onEnter: () => decode(e, 0.8) });
  }
  /* blocks */
  const blocks = [...document.querySelectorAll('main :is(.lead, .body, .coda, .geo, .swatches, .perf__table, .cover__drive, .chero__thesis, .form)')];
  gsap.set(blocks, { clipPath: 'inset(-2px 100% -2px 0)' });
  for (const b of blocks) ScrollTrigger.create({ trigger: b, start: 'top 88%', once: true, onEnter: () => scan(b) });
  /* rows, in the order they are read */
  const groups = new Map();
  for (const r of document.querySelectorAll(ROWS)) {
    const g = r.parentElement;
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(r);
    gsap.set([...r.children], { opacity: 0 });
  }
  for (const [g, rows] of groups) {
    ScrollTrigger.create({ trigger: g, start: 'top 85%', once: true, onEnter: () => rows.forEach(row) });
  }
}

/* ── the rail and the forecast ─────────────────────────────── */
export function initRail(sections, REDUCED) {
  const { ScrollTrigger } = window;
  const rail = document.createElement('div');
  rail.className = 'rail';
  rail.setAttribute('aria-hidden', 'true');
  rail.innerHTML = `<span class="mono rail__n" id="railNow">01</span><i class="rail__track"><b id="railFill"></b>${
    sections.map((_, i) => `<em style="top:${(i / (sections.length - 1)) * 100}%"></em>`).join('')
  }</i><span class="mono rail__n">${String(sections.length).padStart(2, '0')}</span>`;
  const cast = document.createElement('p');
  cast.className = 'forecast mono';
  cast.setAttribute('aria-hidden', 'true');
  cast.innerHTML = '<span>Next</span> <b id="castName">—</b> <em id="castIn">—</em>';
  document.body.append(rail, cast);

  const fill = rail.querySelector('#railFill'), now = rail.querySelector('#railNow');
  const name = cast.querySelector('#castName'), inEl = cast.querySelector('#castIn');
  const label = s => s.querySelector('.eyebrow')?.textContent.replace(/\s+/g, ' ').trim().replace(/^(\d+)\s*/, '$1 · ') || s.id;
  let lastNext = -1;

  const update = () => {
    const y = scrollY, vh = innerHeight;
    const max = document.documentElement.scrollHeight - vh;
    fill.style.transform = `scaleY(${Math.min(1, y / Math.max(1, max)).toFixed(4)})`;
    let cur = 0;
    for (let i = 0; i < sections.length; i++) if (sections[i].getBoundingClientRect().top <= vh * 0.5) cur = i;
    now.textContent = String(cur + 1).padStart(2, '0');
    const next = sections[cur + 1];
    document.body.classList.toggle('has-forecast', !!next && cur > 0);
    if (!next) return;
    const screens = Math.max(0, next.getBoundingClientRect().top / vh);
    inEl.textContent = screens < 0.05 ? 'Now' : `In ${screens.toFixed(1)} screens`;
    if (cur + 1 !== lastNext) {
      lastNext = cur + 1;
      name.textContent = label(next).toUpperCase();
      if (!REDUCED) decode(name, 0.6);
    }
  };
  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: update, onRefresh: update });
  update();
}
