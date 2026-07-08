/* ============================================================
   horizon.js — vanilla starfield + glowing horizon (no deps)
   Ambient deep-space layer that sits behind the node network:
   subtle twinkling, parallax stars drifting over a glowing
   horizon / planet limb. Pure canvas, no libraries.
   Exposes: window.HorizonFX = { setAccent, setMotion, setTheme }
   ============================================================ */
(function () {
  const canvas = document.getElementById('horizon-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let DPR = Math.min(2, window.devicePixelRatio || 1);
  let W = 0, H = 0;
  let stars = [];
  let motion = 'full';                 // 'full' | 'calm'
  let accent = '#4f8cff';
  let theme = document.documentElement.getAttribute('data-theme') || 'dark';
  let scrollY = window.scrollY;
  let mx = 0, my = 0;                   // pointer parallax, -1..1
  let lastT = performance.now();

  const HORIZON = 0.72;                 // horizon line as a fraction of height

  function starCount() {
    const w = window.innerWidth;
    if (w < 700) return 70;            // phones
    if (w < 1100) return 120;          // tablets / small laptops
    return 170;
  }

  function rand(a, b) { return a + Math.random() * (b - a); }

  function seed() {
    stars = [];
    const n = starCount();
    for (let i = 0; i < n; i++) {
      const z = Math.random();         // depth: 0 far … 1 near
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        z,
        r: rand(0.4, 1.6) * (0.5 + z),
        tw: Math.random() * Math.PI * 2,   // twinkle phase
        tws: rand(0.6, 1.8),               // twinkle speed
        drift: rand(3, 12) * (0.3 + z),    // upward drift, px/s
      });
    }
  }

  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    seed();
    if (reduce) requestAnimationFrame(frame);   // static redraw
  }

  function hexToRgb(hex) {
    const m = hex.replace('#', '').match(/.{1,2}/g);
    if (!m) return [79, 140, 255];
    return m.map(h => parseInt(h, 16));
  }

  function drawHorizon(ar, ag, ab) {
    const hy = H * HORIZON;

    // atmospheric glow rising from the horizon
    const glow = ctx.createRadialGradient(W / 2, hy, 0, W / 2, hy, Math.max(W, H) * 0.7);
    const a = theme === 'light' ? 0.10 : 0.22;
    glow.addColorStop(0, `rgba(${ar}, ${ag}, ${ab}, ${a})`);
    glow.addColorStop(0.35, `rgba(${ar}, ${ag}, ${ab}, ${a * 0.4})`);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // planet limb — a huge arc whose top edge rests on the horizon line,
    // brightest in the middle and fading toward the sides
    const R = W * 1.6;
    const cy = hy + R;                 // circle centre far below the screen
    const line = ctx.createLinearGradient(0, hy - 2, 0, hy + 40);
    line.addColorStop(0, `rgba(${ar}, ${ag}, ${ab}, ${theme === 'light' ? 0.5 : 0.9})`);
    line.addColorStop(1, `rgba(${ar}, ${ag}, ${ab}, 0)`);
    ctx.strokeStyle = line;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(W / 2, cy, R, -Math.PI / 2 - 0.5, -Math.PI / 2 + 0.5);
    ctx.stroke();
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    ctx.clearRect(0, 0, W, H);

    const [ar, ag, ab] = hexToRgb(accent);
    const spd = motion === 'calm' ? 0.4 : 1.0;
    const parScroll = scrollY * 0.06;
    const base = theme === 'light' ? [90, 110, 170] : [235, 240, 255];

    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      if (!reduce) {
        s.y -= s.drift * spd * dt;
        s.tw += s.tws * dt;
        if (s.y < -4) { s.y = H + 4; s.x = Math.random() * W; }
      }
      const px = s.x + mx * 14 * s.z;
      const py = s.y - parScroll * (0.4 + s.z) + my * 10 * s.z;
      const tw = reduce ? 0.8 : (0.6 + 0.4 * Math.sin(s.tw));
      const alpha = (0.25 + s.z * 0.6) * tw;
      const col = (i % 7 === 0) ? [ar, ag, ab] : base;   // some accent-tinted stars
      ctx.fillStyle = `rgba(${col[0]}, ${col[1]}, ${col[2]}, ${alpha})`;
      ctx.beginPath();
      ctx.arc(px, py, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    drawHorizon(ar, ag, ab);

    if (!reduce) requestAnimationFrame(frame);
  }

  window.addEventListener('resize', resize);
  window.addEventListener('scroll', () => { scrollY = window.scrollY; }, { passive: true });
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    mx = (e.clientX / W) * 2 - 1;
    my = (e.clientY / H) * 2 - 1;
  }, { passive: true });

  resize();
  requestAnimationFrame(frame);        // draws at least one frame (also covers reduced-motion)

  window.HorizonFX = {
    setAccent(a) { accent = a || '#4f8cff'; if (reduce) requestAnimationFrame(frame); },
    setMotion(m) { motion = m === 'calm' ? 'calm' : 'full'; },
    setTheme(t) { theme = t === 'light' ? 'light' : 'dark'; if (reduce) requestAnimationFrame(frame); },
  };
})();
