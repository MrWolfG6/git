/* ═══════════════════════════════════════════════════════════
   SHOOTING STARS
   A meteor is one of the oldest omens there is, so they belong
   here — on the brand's terms:
     · bone hairlines with a fading tail, never corona (the one warm
       light stays the only one)
     · rare, and never more than two in the sky at once
     · they run the moon's path, upper left to lower right
   The canvas is only drawn while a meteor is alive; between them it
   costs nothing. Reduced motion: none.

     var m = OMENMeteors(canvas, { every: [min, max] s, band: 0.45 })
     m.start(); m.stop(); m.spawn();
   ═══════════════════════════════════════════════════════════ */
(function () {
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  window.OMENMeteors = function (canvas, opts) {
    opts = opts || {};
    var every = opts.every || [4, 9];         // seconds between arrivals
    var band = opts.band == null ? 0.45 : opts.band;   // share of the height they start in
    var pairChance = opts.pair == null ? 0.25 : opts.pair;
    var avoid = opts.avoid || null;            // () => { x, y, r }: a disc they pass behind
    var ctx = canvas.getContext('2d');
    var W = 0, H = 0, dpr = 1;
    var live = [], running = false, raf = 0, last = 0, timer = 0;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      W = canvas.clientWidth || innerWidth; H = canvas.clientHeight || innerHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    }

    function spawn() {
      if (reduced || live.length >= 2) return;
      /* the moon's path, give or take */
      var a = (18 + Math.random() * 26) * Math.PI / 180;   // 18–44° below the horizon
      var speed = 700 + Math.random() * 500;             // px / s
      var len = 110 + Math.random() * 170;               // tail
      var life = 0.65 + Math.random() * 0.5;
      live.push({
        x: -40 + Math.random() * W * 0.8, y: Math.random() * H * band,
        vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
        len: len, life: life, t: 0, w: 0.8 + Math.random() * 0.6
      });
      if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
    }

    function frame(now) {
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.save();
      var hole = avoid && avoid();
      if (hole) {
        /* everything but the disc: they cross the sky behind the eclipse */
        ctx.beginPath();
        ctx.rect(0, 0, W, H);
        ctx.arc(hole.x, hole.y, hole.r, 0, 6.2832, true);
        ctx.clip('evenodd');
      }
      for (var i = live.length - 1; i >= 0; i--) {
        var m = live[i];
        m.t += dt;
        m.x += m.vx * dt; m.y += m.vy * dt;
        var k = m.t / m.life;
        if (k >= 1) { live.splice(i, 1); continue; }
        /* in fast, out slow */
        var a = Math.min(1, k * 6) * Math.pow(1 - k, 1.4);
        var sp = Math.hypot(m.vx, m.vy), ux = m.vx / sp, uy = m.vy / sp;
        var tail = m.len * Math.min(1, k * 3);
        var tx = m.x - ux * tail, ty = m.y - uy * tail;
        var g = ctx.createLinearGradient(tx, ty, m.x, m.y);
        g.addColorStop(0, 'rgba(242,239,233,0)');
        g.addColorStop(1, 'rgba(242,239,233,' + (0.85 * a).toFixed(3) + ')');
        ctx.strokeStyle = g;
        ctx.lineWidth = m.w;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(m.x, m.y); ctx.stroke();
        /* the head: a point of light, softly haloed */
        var h = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, 6);
        h.addColorStop(0, 'rgba(242,239,233,' + (0.9 * a).toFixed(3) + ')');
        h.addColorStop(1, 'rgba(242,239,233,0)');
        ctx.fillStyle = h;
        ctx.beginPath(); ctx.arc(m.x, m.y, 6, 0, 6.2832); ctx.fill();
      }
      ctx.restore();
      raf = live.length ? requestAnimationFrame(frame) : 0;
      if (!raf) ctx.clearRect(0, 0, W, H);
    }

    function schedule() {
      if (!running) return;
      var s = every[0] + Math.random() * (every[1] - every[0]);
      timer = setTimeout(function () {
        if (!document.hidden) {
          spawn();
          if (Math.random() < pairChance) setTimeout(spawn, 180 + Math.random() * 380);
        }
        schedule();
      }, s * 1000);
    }

    resize();
    addEventListener('resize', resize, { passive: true });
    return {
      spawn: spawn,
      start: function (delay) {
        if (reduced || running) return this;
        running = true;
        timer = setTimeout(function () { spawn(); schedule(); }, (delay == null ? 1.5 : delay) * 1000);
        return this;
      },
      stop: function () { running = false; clearTimeout(timer); return this; }
    };
  };
})();
