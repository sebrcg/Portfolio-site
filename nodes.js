/* ============================================================
   nodes.js — animated cloud-node particle network
   Canvas constellation with mouse parallax / repulsion.
   Exposes: window.NodesFX = { setDensity, setMotion, setAccent }
   ============================================================ */
(function () {
  const canvas = document.getElementById('nodes-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let DPR = Math.min(2, window.devicePixelRatio || 1);
  let W = 0, H = 0;
  let particles = [];
  let count = 120;
  let motion = 'full'; // 'full' | 'calm'
  let accent = '#4f8cff';
  let mouse = { x: -9999, y: -9999, active: false };
  let scrollY = window.scrollY;
  let lastT = performance.now();

  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    seed();
  }

  function rand(a, b) { return a + Math.random() * (b - a); }

  function seed() {
    particles = [];
    for (let i = 0; i < count; i++) {
      const layer = Math.random();
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: rand(-0.18, 0.18),
        vy: rand(-0.14, 0.14),
        r: rand(0.6, 2.0),
        layer: layer, // 0..1 -> depth (smaller = farther)
      });
    }
  }

  function hexToRgb(hex) {
    const m = hex.replace('#','').match(/.{1,2}/g);
    if (!m) return [79,140,255];
    return m.map(h => parseInt(h, 16));
  }

  function step(t) {
    const dt = Math.min(0.05, (t - lastT) / 1000);
    lastT = t;

    ctx.clearRect(0, 0, W, H);

    const speed = motion === 'calm' ? 0.35 : 1.0;
    const linkDist = motion === 'calm' ? 110 : 145;
    const [ar, ag, ab] = hexToRgb(accent);

    // parallax based on scroll
    const parY = -scrollY * 0.04;

    // physics
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      // mouse repulsion (only for desktop / when active)
      if (mouse.active) {
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const d2 = dx*dx + dy*dy;
        if (d2 < 22000) {
          const f = (1 - d2 / 22000) * 0.6;
          const inv = 1 / Math.max(20, Math.sqrt(d2));
          p.vx += dx * inv * f * 0.6;
          p.vy += dy * inv * f * 0.6;
        }
      }

      p.x += p.vx * speed * 60 * dt;
      p.y += p.vy * speed * 60 * dt;

      // damping
      p.vx *= 0.985;
      p.vy *= 0.985;

      // slow drift floor
      const driftScale = motion === 'calm' ? 0.04 : 0.08;
      if (Math.hypot(p.vx, p.vy) < 0.05) {
        p.vx += rand(-driftScale, driftScale);
        p.vy += rand(-driftScale, driftScale);
      }

      // wrap
      if (p.x < -20) p.x = W + 20;
      if (p.x > W + 20) p.x = -20;
      if (p.y < -20) p.y = H + 20;
      if (p.y > H + 20) p.y = -20;
    }

    // links
    ctx.lineWidth = 1;
    for (let i = 0; i < particles.length; i++) {
      const a = particles[i];
      for (let j = i + 1; j < particles.length; j++) {
        const b = particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d2 = dx*dx + dy*dy;
        if (d2 < linkDist * linkDist) {
          const alpha = (1 - Math.sqrt(d2) / linkDist) * 0.32;
          ctx.strokeStyle = `rgba(${ar}, ${ag}, ${ab}, ${alpha})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y + parY * a.layer);
          ctx.lineTo(b.x, b.y + parY * b.layer);
          ctx.stroke();
        }
      }
    }

    // dots
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const y = p.y + parY * p.layer;
      const r = p.r * (0.5 + p.layer * 0.9);
      const alpha = 0.35 + p.layer * 0.55;
      ctx.fillStyle = `rgba(${ar}, ${ag}, ${ab}, ${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    requestAnimationFrame(step);
  }

  // pointer
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.active = true;
  }, { passive: true });
  window.addEventListener('pointerleave', () => { mouse.active = false; });
  window.addEventListener('scroll', () => { scrollY = window.scrollY; }, { passive: true });
  window.addEventListener('resize', resize);

  resize();
  requestAnimationFrame(step);

  window.NodesFX = {
    setDensity(n) {
      count = Math.max(0, Math.min(300, Number(n) || 0));
      seed();
    },
    setMotion(m) { motion = m === 'calm' ? 'calm' : 'full'; },
    setAccent(a) { accent = a || '#4f8cff'; },
  };
})();
