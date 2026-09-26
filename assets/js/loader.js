/* ═══════════════════════════════════════════════════════════
   THE LOADER: AN ECLIPSE, IN REAL TIME
   A classic script, so it runs before the module graph has even
   started to fetch. Loading progress drives the moon across the
   sun; the readout forecasts the moment of totality from how fast
   the page is actually loading — it tells you first.

   At 100 % the sun goes out and the corona stands up. Then the
   diamond ring, and the moon settles at the bite: what is left of
   the sun is the OMEN crescent, the hairline draws through it, and
   the page opens.

     OMENLoader.progress(0‥1, label)
     OMENLoader.finish()  → Promise, resolved when the mark has formed
     OMENLoader.hide()    → fades the loader away over the live page

   Canvas 2D only. The geometry is the mark's own: bite r 0.82 at
   (−0.30, +0.30), rule 2.66 tall.
   ═══════════════════════════════════════════════════════════ */
(function () {
  var root = document.getElementById('loader');
  if (!root) return;
  var canvas = root.querySelector('.loader__sky');
  var ctx = canvas && canvas.getContext('2d');
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var seen = false;
  try { seen = sessionStorage.getItem('omen:eclipse') === '1'; sessionStorage.setItem('omen:eclipse', '1'); } catch (e) { /* storage off */ }

  var $ = function (id) { return document.getElementById(id); };
  var elStatus = $('loadStatus'), elPct = $('loadPct'), elBar = $('loadBar'), elCast = $('loadCast');

  /* palette */
  var CORONA = [232, 217, 168], BONE = [242, 239, 233];
  var rgba = function (c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; };

  /* state */
  var target = 0, shown = 0, moonRate = 0, velocity = 0, lastTarget = 0, lastTargetT = 0;
  var phase = 'contact';        // contact → totality → ring → mark → out
  var phaseT = 0, t = 0, speed = 1;
  var finishing = null, resolveFinish = null;
  var W = 0, H = 0, R = 0, cx = 0, cy = 0, dpr = 1;

  /* the corona: streamers, fixed at boot, breathing slowly */
  var streamers = [];
  for (var i = 0; i < 170; i++) {
    var a = Math.random() * Math.PI * 2;
    /* long helmet streamers cluster near the equator, as they do */
    var eq = Math.pow(Math.abs(Math.cos(a - 0.35)), 3);
    streamers.push({
      a: a, w: 0.02 + Math.random() * 0.06,
      len: 0.25 + Math.random() * 0.55 + eq * (0.6 + Math.random() * 1.1),
      ph: Math.random() * 6.28, alpha: 0.05 + Math.random() * 0.1
    });
  }
  var stars = [];
  for (var s = 0; s < 220; s++) stars.push({ x: Math.random(), y: Math.random(), r: Math.random() * 1.1 + 0.2, tw: Math.random() * 6.28 });

  function resize() {
    /* 1.5 is past what a soft glow can show, and a full-screen canvas at
       2× is four times the fill for nothing */
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = innerWidth; H = innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    R = Math.min(W, H) * (W < 700 ? 0.2 : 0.15);
    cx = W / 2; cy = H * 0.46;
    root.style.setProperty('--r', R + 'px');
    root.style.setProperty('--cy', cy + 'px');
    buildCorona();
  }

  /* The corona is drawn once, into its own canvas, and then only placed,
     faded and turned each frame. Rebuilding 170 gradients a frame is what
     made the sky stutter on a high-density screen. */
  var sprite = document.createElement('canvas'), SR = 0;
  function buildCorona() {
    SR = R * 3.2;
    var px = Math.ceil(SR * 2 * dpr);
    sprite.width = sprite.height = px;
    var c = sprite.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.globalCompositeOperation = 'lighter';
    var o = SR;
    var halo = c.createRadialGradient(o, o, R * 0.98, o, o, SR);
    halo.addColorStop(0, rgba(BONE, 0.55));
    halo.addColorStop(0.08, rgba(CORONA, 0.35));
    halo.addColorStop(0.35, rgba(CORONA, 0.08));
    halo.addColorStop(1, rgba(CORONA, 0));
    c.fillStyle = halo;
    c.beginPath(); c.arc(o, o, SR, 0, 6.2832); c.fill();
    for (var k = 0; k < streamers.length; k++) {
      var sm = streamers[k], a0 = sm.a, len = Math.min(R * sm.len, SR - R - 2);
      var x0 = o + Math.cos(a0) * R * 0.99, y0 = o + Math.sin(a0) * R * 0.99;
      var x1 = o + Math.cos(a0) * (R + len), y1 = o + Math.sin(a0) * (R + len);
      var gr = c.createLinearGradient(x0, y0, x1, y1);
      gr.addColorStop(0, rgba(CORONA, sm.alpha * 2.2));
      gr.addColorStop(1, rgba(CORONA, 0));
      c.fillStyle = gr;
      var wv = sm.w * R, nx = -Math.sin(a0), ny = Math.cos(a0);
      var mx = o + Math.cos(a0) * (R + len * 0.45), my = o + Math.sin(a0) * (R + len * 0.45);
      c.beginPath();
      c.moveTo(x0 + nx * wv, y0 + ny * wv);
      c.quadraticCurveTo(mx + nx * wv * 0.5, my + ny * wv * 0.5, x1, y1);
      c.quadraticCurveTo(mx - nx * wv * 0.5, my - ny * wv * 0.5, x0 - nx * wv, y0 - ny * wv);
      c.closePath();
      c.fill();
    }
  }

  var ease = function (x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  var clamp = function (x, a, b) { return Math.max(a, Math.min(b, x)); };
  var smooth = function (x) { return x * x * (3 - 2 * x); };

  /* moon position and radius, in units of R, screen space (y down) */
  function moon() {
    if (phase === 'contact') {
      var k = ease(shown);
      return { x: -2.35 * (1 - k), y: -2.35 * (1 - k), r: 1.03 };
    }
    if (phase === 'totality') return { x: 0, y: 0, r: 1.03 };
    var m = phase === 'ring' ? ease(clamp(phaseT / 1.35, 0, 1)) : 1;
    /* to the bite: (−0.30, +0.30) in the mark's y-up space */
    return { x: -0.3 * m, y: -0.3 * m, r: 1.03 - 0.21 * m };
  }

  function coverage(m) {
    /* how much of the sun is hidden, roughly, for the sky and corona */
    var d = Math.hypot(m.x, m.y);
    return clamp(1 - (d - (m.r - 1)) / 2, 0, 1);
  }

  function draw() {
    var m = moon();
    var cov = coverage(m);
    var total = phase === 'totality' ? 1 : phase === 'ring' ? 1 - smooth(clamp(phaseT / 1.0, 0, 1)) : phase === 'contact' ? Math.pow(cov, 6) : 0;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    /* the sky: a faint daylight wash that dies as the moon covers the sun */
    ctx.fillStyle = '#0B0B11';
    ctx.fillRect(0, 0, W, H);
    var day = (1 - cov) * (phase === 'contact' ? 1 : 0);
    if (day > 0.01) {
      var g0 = ctx.createRadialGradient(cx, cy, R, cx, cy, Math.max(W, H) * 0.8);
      g0.addColorStop(0, rgba([60, 64, 80], 0.5 * day));
      g0.addColorStop(1, 'rgba(11,11,17,0)');
      ctx.fillStyle = g0;
      ctx.fillRect(0, 0, W, H);
    }
    /* stars come out at totality */
    var starA = clamp(total * 1.2 - 0.2, 0, 1) * 0.9 + (phase === 'mark' ? 0.25 : 0);
    if (starA > 0.02) {
      for (var i = 0; i < stars.length; i++) {
        var st = stars[i];
        ctx.fillStyle = rgba(BONE, starA * (0.35 + 0.35 * Math.sin(t * 1.3 + st.tw)));
        ctx.fillRect(st.x * W, st.y * H, st.r, st.r);
      }
    }

    ctx.globalCompositeOperation = 'lighter';
    /* the corona: a halo and streamers, only really visible near totality */
    var cor = total;
    if (cor > 0.01) {
      /* placed, faded, breathing and turning very slowly */
      var sc = (0.9 + 0.1 * cor) * (1 + 0.012 * Math.sin(t * 0.8));
      ctx.save();
      ctx.globalAlpha = cor;
      ctx.translate(cx, cy);
      ctx.rotate(t * 0.012);
      ctx.drawImage(sprite, -SR * sc, -SR * sc, SR * 2 * sc, SR * 2 * sc);
      ctx.restore();
    }
    /* a glow round the visible sun while it is partial */
    var lit = 1 - total;
    if (lit > 0.02) {
      var gl = ctx.createRadialGradient(cx, cy, R * 0.8, cx, cy, R * 2.4);
      gl.addColorStop(0, rgba(CORONA, 0.22 * lit * (phase === 'mark' ? 0.6 : 1)));
      gl.addColorStop(1, rgba(CORONA, 0));
      ctx.fillStyle = gl;
      ctx.beginPath(); ctx.arc(cx, cy, R * 2.4, 0, 6.2832); ctx.fill();
    }

    /* the sun, then the moon over it, both clipped to the sun's disc:
       what is left lit is exactly disc − moon */
    ctx.globalCompositeOperation = 'source-over';
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, 6.2832);
    ctx.clip();
    var sun = ctx.createRadialGradient(cx - R * 0.2, cy - R * 0.2, R * 0.1, cx, cy, R);
    sun.addColorStop(0, rgba(BONE, 1));
    sun.addColorStop(0.7, rgba(CORONA, 1));
    sun.addColorStop(1, rgba([198, 182, 136], 1));     // limb darkening
    ctx.fillStyle = sun;
    ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    /* the moon: the deepest dark there is, with the faintest earthshine rim */
    ctx.beginPath();
    ctx.arc(cx + m.x * R, cy + m.y * R, m.r * R, 0, 6.2832);
    ctx.fillStyle = '#05050A';
    ctx.fill();
    ctx.restore();
    /* the earthshine rim: gone once the moon settles, so the last frame
       is the mark and nothing else */
    var rim = phase === 'mark' ? 0 : phase === 'ring' ? clamp(1 - phaseT / 0.6, 0, 1) : 1;
    if (rim > 0 && (phase !== 'contact' || cov > 0.2)) {
      ctx.beginPath();
      ctx.arc(cx + m.x * R, cy + m.y * R, m.r * R, 0, 6.2832);
      ctx.strokeStyle = rgba(BONE, (0.05 + total * 0.08) * rim);
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    /* the diamond ring: light breaking through at the lower right */
    if (phase === 'ring' || phase === 'mark') {
      var f = phase === 'ring' ? Math.exp(-Math.pow((phaseT - 0.26) / 0.21, 2)) : 0;
      if (f > 0.01) {
        var dx = cx + R * 0.7071, dy = cy + R * 0.7071;
        ctx.globalCompositeOperation = 'lighter';
        var dg = ctx.createRadialGradient(dx, dy, 0, dx, dy, R * 1.2);
        dg.addColorStop(0, rgba(BONE, 0.95 * f));
        dg.addColorStop(0.08, rgba(BONE, 0.5 * f));
        dg.addColorStop(0.3, rgba(CORONA, 0.12 * f));
        dg.addColorStop(1, rgba(CORONA, 0));
        ctx.fillStyle = dg;
        ctx.beginPath(); ctx.arc(dx, dy, R * 1.2, 0, 6.2832); ctx.fill();
        /* four spikes, never three */
        ctx.strokeStyle = rgba(BONE, 0.7 * f);
        ctx.lineWidth = 1;
        for (var q = 0; q < 4; q++) {
          var aq = q * Math.PI / 2 + Math.PI / 4;
          var L = R * (q % 2 ? 1.6 : 2.4) * f;
          ctx.beginPath();
          ctx.moveTo(dx - Math.cos(aq) * L, dy - Math.sin(aq) * L);
          ctx.lineTo(dx + Math.cos(aq) * L, dy + Math.sin(aq) * L);
          ctx.stroke();
        }
      }
    }

    /* the hairline rule: drawn out from the centre, overshooting by R/3 */
    if (phase === 'mark' || (phase === 'ring' && phaseT > 0.9)) {
      var rt = phase === 'mark' ? clamp((phaseT + 0.6) / 0.6, 0, 1) : clamp((phaseT - 0.9) / 0.6, 0, 1);
      var half = 1.33 * R * ease(rt);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = rgba(CORONA, 1);
      ctx.fillRect(cx - 0.02 * R, cy - half, 0.04 * R, half * 2);
    }
  }

  function setText(el, s) { if (el && el.textContent !== s) el.textContent = s; }

  function forecast() {
    if (phase !== 'contact') return;
    if (shown > 0.985) return setText(elCast, 'Totality');
    var v = Math.max(velocity, 0.04);
    var eta = Math.max(0.1, Math.min(9.9, (1 - shown) / Math.min(v, 0.55)));
    setText(elCast, 'Totality in ' + eta.toFixed(1) + ' s');
  }

  var last = performance.now();
  function frame(now) {
    /* a stalled frame (the page is busy loading) resumes where it left
       off instead of jumping to catch up */
    var dt = Math.min(1 / 30, (now - last) / 1000) * speed;
    last = now;
    t += dt;
    /* The moon glides: its speed eases toward what the remaining distance
       asks for, capped, so it accelerates away from a stop and settles
       into totality instead of lurching as each chunk of loading lands. */
    /* quick across open sky, then a crawl for the last sliver: the
       wait before totality is the part the audience should feel */
    var maxRate = seen ? 1.6 : 0.85;
    var wantRate = Math.min(maxRate, (target - shown) * (seen ? 3.2 : 2.1));
    moonRate += (wantRate - moonRate) * (1 - Math.exp(-dt * 5));
    shown = Math.min(target, shown + Math.max(0, moonRate) * dt);
    if (target >= 1 && 1 - shown < 0.003) shown = 1;
    velocity += ((target - lastTarget) / Math.max(0.05, (now - lastTargetT) / 1000) - velocity) * 0.02;
    if (elBar) elBar.style.transform = 'scaleX(' + shown.toFixed(4) + ')';
    setText(elPct, String(Math.round(shown * 100)).padStart(3, '0'));
    forecast();

    if (phase === 'contact' && finishing && shown >= 0.999) { phase = 'totality'; phaseT = 0; setText(elCast, 'Totality'); root.classList.add('is-total'); if (meteors) setTimeout(meteors.spawn, 250); }
    else if (phase === 'totality' && (phaseT += dt) > (seen ? 0.3 : 1.2)) { phase = 'ring'; phaseT = 0; setText(elCast, 'Third contact'); root.classList.remove('is-total'); }
    else if (phase === 'ring' && (phaseT += dt) > (seen ? 1.2 : 1.5)) { phase = 'mark'; phaseT = 0; setText(elCast, 'It tells you first.'); root.classList.add('is-mark'); }
    else if (phase === 'mark' && (phaseT += dt) > (seen ? 0.3 : 0.8) && resolveFinish) { var r = resolveFinish; resolveFinish = null; r(); }

    draw();
    if (phase !== 'out') requestAnimationFrame(frame);
  }

  var api = {
    progress: function (p, label) {
      var now = performance.now();
      lastTarget = target; lastTargetT = now;
      target = clamp(p, target, 1);
      if (label) setText(elStatus, label);
    },
    finish: function () {
      target = 1;
      if (!finishing) finishing = new Promise(function (res) { resolveFinish = res; if (reduced || !ctx) res(); });
      return finishing;
    },
    hide: function () {
      root.classList.add('is-out');
      if (meteors) meteors.stop();
      setTimeout(function () { phase = 'out'; root.hidden = true; }, reduced ? 0 : 1100);
    }
  };
  window.OMENLoader = api;

  if (!ctx) return;
  root.classList.add('is-live');
  /* shooting stars over the sky: one early, more once totality has put
     the stars out */
  var meteorCanvas = root.querySelector('.loader__meteors');
  var meteors = meteorCanvas && window.OMENMeteors
    ? window.OMENMeteors(meteorCanvas, { every: seen ? [9, 9] : [0.8, 1.6], band: 0.55, pair: 0.3,
        avoid: function () { return { x: cx, y: cy, r: R * 1.04 }; } }).start(seen ? 60 : 0.7)
    : null;
  resize();
  addEventListener('resize', function () { resize(); if (reduced) draw(); }, { passive: true });
  /* anyone in a hurry: a click or a key runs the sky at four times */
  var hurry = function () { speed = 4; };
  root.addEventListener('pointerdown', hurry);
  addEventListener('keydown', hurry, { once: true });

  if (reduced) {
    /* no transit: the mark, formed, and nothing moving */
    phase = 'mark'; phaseT = 10; shown = 1;
    root.classList.add('is-mark');
    draw();
    return;
  }
  requestAnimationFrame(frame);
})();
