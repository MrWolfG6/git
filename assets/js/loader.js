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
  var target = 0, shown = 0, velocity = 0, lastTarget = 0, lastTargetT = 0;
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
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    R = Math.min(W, H) * (W < 700 ? 0.2 : 0.15);
    cx = W / 2; cy = H * 0.46;
    root.style.setProperty('--r', R + 'px');
    root.style.setProperty('--cy', cy + 'px');
  }

  var ease = function (x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  var clamp = function (x, a, b) { return Math.max(a, Math.min(b, x)); };

  /* moon position and radius, in units of R, screen space (y down) */
  function moon() {
    if (phase === 'contact') {
      var k = ease(shown);
      return { x: -2.35 * (1 - k), y: -2.35 * (1 - k), r: 1.03 };
    }
    if (phase === 'totality') return { x: 0, y: 0, r: 1.03 };
    var m = phase === 'ring' ? ease(clamp(phaseT / 1.5, 0, 1)) : 1;
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
    var total = phase === 'totality' ? 1 : phase === 'ring' ? clamp(1 - phaseT / 1.1, 0, 1) : phase === 'contact' ? Math.pow(cov, 6) : 0;

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
      var halo = ctx.createRadialGradient(cx, cy, R * 0.98, cx, cy, R * 3.2);
      halo.addColorStop(0, rgba(BONE, 0.55 * cor));
      halo.addColorStop(0.08, rgba(CORONA, 0.35 * cor));
      halo.addColorStop(0.35, rgba(CORONA, 0.08 * cor));
      halo.addColorStop(1, rgba(CORONA, 0));
      ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(cx, cy, R * 3.2, 0, 6.2832); ctx.fill();
      for (var k = 0; k < streamers.length; k++) {
        var sm = streamers[k];
        var len = R * sm.len * (0.9 + 0.12 * Math.sin(t * 0.7 + sm.ph)) * (0.6 + 0.4 * cor);
        var a0 = sm.a + Math.sin(t * 0.05 + sm.ph) * 0.02;
        var x0 = cx + Math.cos(a0) * R * 0.99, y0 = cy + Math.sin(a0) * R * 0.99;
        var x1 = cx + Math.cos(a0) * (R + len), y1 = cy + Math.sin(a0) * (R + len);
        var gr = ctx.createLinearGradient(x0, y0, x1, y1);
        gr.addColorStop(0, rgba(CORONA, sm.alpha * 2.2 * cor));
        gr.addColorStop(1, rgba(CORONA, 0));
        ctx.fillStyle = gr;
        var wv = sm.w * R;
        var nx = -Math.sin(a0), ny = Math.cos(a0);
        ctx.beginPath();
        ctx.moveTo(x0 + nx * wv, y0 + ny * wv);
        ctx.quadraticCurveTo(cx + Math.cos(a0) * (R + len * 0.45) + nx * wv * 0.5, cy + Math.sin(a0) * (R + len * 0.45) + ny * wv * 0.5, x1, y1);
        ctx.quadraticCurveTo(cx + Math.cos(a0) * (R + len * 0.45) - nx * wv * 0.5, cy + Math.sin(a0) * (R + len * 0.45) - ny * wv * 0.5, x0 - nx * wv, y0 - ny * wv);
        ctx.closePath();
        ctx.fill();
      }
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
    var rim = phase === 'mark' ? 0 : phase === 'ring' ? clamp(1 - phaseT / 0.8, 0, 1) : 1;
    if (rim > 0 && (phase !== 'contact' || cov > 0.2)) {
      ctx.beginPath();
      ctx.arc(cx + m.x * R, cy + m.y * R, m.r * R, 0, 6.2832);
      ctx.strokeStyle = rgba(BONE, (0.05 + total * 0.08) * rim);
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    /* the diamond ring: light breaking through at the lower right */
    if (phase === 'ring' || phase === 'mark') {
      var f = phase === 'ring' ? Math.exp(-Math.pow((phaseT - 0.22) / 0.2, 2)) : 0;
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
    if (phase === 'mark' || (phase === 'ring' && phaseT > 1.0)) {
      var rt = phase === 'mark' ? clamp((phaseT + 0.5) / 0.7, 0, 1) : clamp((phaseT - 1.0) / 0.7, 0, 1);
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
    var dt = Math.min(0.05, (now - last) / 1000) * speed;
    last = now;
    t += dt;
    /* the moon never outruns 0.55 of a transit a second, so even an
       instant load still reads as an eclipse, not a cut */
    var maxRate = seen ? 1.2 : 0.55;
    shown += clamp(target - shown, 0, maxRate * dt);
    velocity += ((target - lastTarget) / Math.max(0.05, (now - lastTargetT) / 1000) - velocity) * 0.02;
    if (elBar) elBar.style.transform = 'scaleX(' + shown.toFixed(4) + ')';
    setText(elPct, String(Math.round(shown * 100)).padStart(3, '0'));
    forecast();

    if (phase === 'contact' && finishing && shown >= 0.999) { phase = 'totality'; phaseT = 0; setText(elCast, 'Totality'); root.classList.add('is-total'); }
    else if (phase === 'totality' && (phaseT += dt) > (seen ? 0.35 : 1.1)) { phase = 'ring'; phaseT = 0; setText(elCast, 'Third contact'); root.classList.remove('is-total'); }
    else if (phase === 'ring' && (phaseT += dt) > 1.7) { phase = 'mark'; phaseT = 0; setText(elCast, 'It tells you first.'); root.classList.add('is-mark'); }
    else if (phase === 'mark' && (phaseT += dt) > (seen ? 0.35 : 0.9) && resolveFinish) { var r = resolveFinish; resolveFinish = null; r(); }

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
      setTimeout(function () { phase = 'out'; root.hidden = true; }, reduced ? 0 : 1100);
    }
  };
  window.OMENLoader = api;

  if (!ctx) return;
  root.classList.add('is-live');
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
