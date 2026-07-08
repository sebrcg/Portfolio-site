/* ============================================================
   main.js — nav, theme, cursor, reveal, easter egg, tweaks
   ============================================================ */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  /* ---------- Reveal on scroll ----------
     IntersectionObserver is unreliable in some sandboxed iframes;
     use a scroll-driven check that always works, with an immediate
     pass at load. */
  const revealNodes = $$('.reveal');
  function checkReveal() {
    const vh = window.innerHeight;
    revealNodes.forEach(el => {
      if (el.classList.contains('in')) return;
      const r = el.getBoundingClientRect();
      if (r.top < vh - 40 && r.bottom > 0) el.classList.add('in');
    });
  }
  // Initial pass — let layout settle first
  requestAnimationFrame(() => requestAnimationFrame(checkReveal));
  window.addEventListener('scroll', checkReveal, { passive: true });
  window.addEventListener('resize', checkReveal);
  // Safety net: after 1.2s, force-reveal anything still hidden
  setTimeout(() => revealNodes.forEach(el => el.classList.add('in')), 1200);

  /* ---------- Hero accent: one-time "hash crack" scramble ----------
     Resolves the accent word left-to-right like a brute-forced hash,
     then settles exactly on the real text. Runs once, never loops.
     Skipped for reduced-motion / Calm so the copy just shows plain. */
  (function heroCrack() {
    const el = $('.hero-title .accent');
    if (!el) return;
    const finalText = (el.textContent || '').trim();
    if (!finalText) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const calm = window.__TWEAKS__ && window.__TWEAKS__.motion === 'calm';
    if (reduce || calm) return; // leave the real word in place

    const GLYPHS = '0123456789abcdef/\\<>*#';
    const rand = () => GLYPHS[(Math.random() * GLYPHS.length) | 0];
    const chars = finalText.split('');
    // render: real chars up to `locked`, random glyphs after (spaces kept)
    const frame = (locked) => chars
      .map((c, i) => (i < locked ? c : (c === ' ' ? ' ' : rand())))
      .join('');

    let locked = 0, last = 0;
    el.classList.add('cracking');
    el.textContent = frame(0);

    function tick(now) {
      if (!last) last = now;
      el.textContent = frame(locked); // flicker unlocked chars each frame
      if (now - last >= 85) {
        last = now;
        locked++;
        while (chars[locked] === ' ') locked++; // spaces are already correct
      }
      if (locked <= chars.length) {
        requestAnimationFrame(tick);
      } else {
        el.textContent = finalText; // settle exactly on the real word
        el.classList.remove('cracking');
      }
    }
    // brief hold on the fully-scrambled word, then resolve
    setTimeout(() => requestAnimationFrame(tick), 260);
  })();

  /* ---------- Active section in nav (scroll-driven) ---------- */
  const sections = $$('section[id]');
  const navLinks = $$('.nav a');
  function updateActiveSection() {
    const y = window.scrollY + 110;
    let current = sections[0] ? sections[0].id : '';
    sections.forEach(s => {
      if (s.offsetTop <= y) current = s.id;
    });
    navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + current));
  }
  window.addEventListener('scroll', updateActiveSection, { passive: true });
  updateActiveSection();

  /* ---------- Mobile menu ---------- */
  const menuToggle = $('#menu-toggle');
  const nav = $('#nav');
  if (menuToggle && nav) {
    menuToggle.addEventListener('click', () => nav.classList.toggle('open'));
    nav.addEventListener('click', e => {
      if (e.target.tagName === 'A') nav.classList.remove('open');
    });
  }

  /* ---------- Custom cursor (desktop only) ---------- */
  const dot = $('.cursor-dot');
  const ring = $('.cursor-ring');
  const isCoarse = window.matchMedia('(pointer: coarse)').matches;
  let mx = -100, my = -100, rx = -100, ry = -100;
  if (!isCoarse && dot && ring) {
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate3d(${mx - 3}px, ${my - 3}px, 0)`;
    }, { passive: true });
    function loop() {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      ring.style.transform = `translate3d(${rx - 17}px, ${ry - 17}px, 0)`;
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
    // hover state on interactive elements
    $$('a, button, .chip, .lab-card, .stack-node, .edge').forEach(el => {
      el.addEventListener('mouseenter', () => ring.classList.add('hover'));
      el.addEventListener('mouseleave', () => ring.classList.remove('hover'));
    });
  } else {
    dot && dot.remove();
    ring && ring.remove();
  }

  /* ---------- Theme toggle (icon, sun/moon) ---------- */
  const themeIcons = {
    dark: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
    light: '<circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>',
  };
  function setTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    const icon = $('#theme-icon');
    if (icon) icon.innerHTML = themeIcons[t === 'light' ? 'light' : 'dark'];
    // update tweaks panel segmented
    $$('#theme-seg button').forEach(b => b.classList.toggle('active', b.dataset.val === t));
    // re-tint canvas accent for contrast feel (canvas uses CSS var indirectly)
    if (window.NodesFX) window.NodesFX.setAccent(getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#4f8cff');
  }
  const themeToggle = $('#theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const cur = document.documentElement.getAttribute('data-theme') || 'dark';
      const next = cur === 'dark' ? 'light' : 'dark';
      applyTweak('theme', next);
    });
  }

  /* ---------- Tweaks panel ---------- */
  const TWEAKS = window.__TWEAKS__ || { accent: '#4f8cff', theme: 'dark', density: 120, motion: 'full' };

  const ACCENTS = [
    '#4f8cff', // AWS-ish blue (default)
    '#7c5cff', // purple
    '#22d39a', // mint
    '#f59e0b', // AWS orange
    '#ec4899', // hot pink
  ];

  // build swatches
  const swatchRow = $('#swatch-row');
  if (swatchRow) {
    ACCENTS.forEach(c => {
      const b = document.createElement('button');
      b.className = 'swatch';
      b.style.background = `linear-gradient(135deg, ${c}, ${shade(c, -25)})`;
      b.dataset.val = c;
      b.addEventListener('click', () => applyTweak('accent', c));
      swatchRow.appendChild(b);
    });
  }

  function shade(hex, pct) {
    const m = hex.replace('#','').match(/.{1,2}/g);
    if (!m) return hex;
    const rgb = m.map(h => parseInt(h, 16));
    return '#' + rgb.map(v => {
      const x = Math.max(0, Math.min(255, Math.round(v + (pct/100) * 255)));
      return x.toString(16).padStart(2, '0');
    }).join('');
  }

  function applyTweak(key, val) {
    TWEAKS[key] = val;
    persist();

    if (key === 'accent') {
      const root = document.documentElement.style;
      root.setProperty('--accent', val);
      root.setProperty('--accent-2', shade(val, 12));
      root.setProperty('--accent-soft', hexToRgba(val, 0.18));
      root.setProperty('--accent-glow', hexToRgba(val, 0.35));
      if (window.NodesFX) window.NodesFX.setAccent(val);
      $$('#swatch-row .swatch').forEach(s => s.classList.toggle('active', s.dataset.val === val));
    }
    if (key === 'theme') setTheme(val);
    if (key === 'density') {
      $('#density-val') && ($('#density-val').textContent = val);
      $('#density').value = val;
      if (window.NodesFX) window.NodesFX.setDensity(val);
    }
    if (key === 'motion') {
      $$('#motion-seg button').forEach(b => b.classList.toggle('active', b.dataset.val === val));
      if (window.NodesFX) window.NodesFX.setMotion(val);
    }
  }

  function hexToRgba(hex, a) {
    const m = hex.replace('#','').match(/.{1,2}/g);
    if (!m) return `rgba(79,140,255,${a})`;
    const [r,g,b] = m.map(h => parseInt(h, 16));
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  function persist() {
    try {
      window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { ...TWEAKS } }, '*');
    } catch {}
  }

  // initial application
  applyTweak('accent', TWEAKS.accent);
  applyTweak('theme', TWEAKS.theme);
  applyTweak('density', TWEAKS.density);
  applyTweak('motion', TWEAKS.motion);

  // bind controls
  $('#density') && $('#density').addEventListener('input', e => applyTweak('density', Number(e.target.value)));
  $$('#theme-seg button').forEach(b => b.addEventListener('click', () => applyTweak('theme', b.dataset.val)));
  $$('#motion-seg button').forEach(b => b.addEventListener('click', () => applyTweak('motion', b.dataset.val)));

  /* ---------- Tweaks panel open / close (host-driven OR self-driven) ---------- */
  const panel = $('#tweaks-panel');
  const toggleBtn = $('#tweaks-toggle');
  function openPanel() { panel && panel.classList.add('open'); }
  function closePanel() {
    panel && panel.classList.remove('open');
    try { window.parent.postMessage({ type: '__edit_mode_dismissed' }, '*'); } catch {}
  }
  if (toggleBtn) toggleBtn.addEventListener('click', () => {
    panel.classList.toggle('open');
    if (!panel.classList.contains('open')) {
      try { window.parent.postMessage({ type: '__edit_mode_dismissed' }, '*'); } catch {}
    }
  });
  document.addEventListener('click', (e) => {
    if (!panel || !panel.classList.contains('open')) return;
    if (panel.contains(e.target) || (toggleBtn && toggleBtn.contains(e.target))) return;
    closePanel();
  });

  // host integration — register listener BEFORE announcing
  window.addEventListener('message', (e) => {
    const d = e && e.data;
    if (!d || typeof d !== 'object') return;
    if (d.type === '__activate_edit_mode') openPanel();
    if (d.type === '__deactivate_edit_mode') closePanel();
  });
  try { window.parent.postMessage({ type: '__edit_mode_available' }, '*'); } catch {}

  /* ---------- Lab card pointer glow ---------- */
  $$('.lab-card').forEach(card => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
      card.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
    });
  });

  /* ---------- Easter egg: Konami code OR typing "sudo" ---------- */
  const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
  let kIdx = 0, buf = '';

  document.addEventListener('keydown', (e) => {
    // ignore when typing in inputs
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    const key = e.key;
    // Konami
    const expected = KONAMI[kIdx];
    if (key === expected || key.toLowerCase() === (expected || '').toLowerCase()) {
      kIdx++;
      if (kIdx === KONAMI.length) { triggerEgg(); kIdx = 0; }
    } else {
      kIdx = (key === KONAMI[0]) ? 1 : 0;
    }
    // type-buffer
    if (/^[a-z]$/i.test(key)) {
      buf = (buf + key.toLowerCase()).slice(-12);
      if (buf.endsWith('sudo')) triggerEgg();
    }
    if (e.key === 'Escape') hideEgg();
  });

  const egg = $('#egg-overlay');
  const eggBody = $('#egg-body');
  function triggerEgg() {
    if (!egg || !eggBody || egg.classList.contains('show')) return;
    egg.classList.add('show');
    const lines = [
      ['$ ', 'sudo -i'],
      ['', '<span class="ok">[ok]</span> elevation granted. welcome, recruiter.'],
      ['', ''],
      ['$ ', 'whoami'],
      ['', 'sebastian, it support → cloud / devops'],
      ['', 'location: Austin, Texas · open to remote'],
      ['', ''],
      ['$ ', 'cat ~/.intentions'],
      ['', 'goal: ship reliable infrastructure for a team that values'],
      ['', '       thoughtful troubleshooting and clean automation.'],
      ['', ''],
      ['$ ', 'wishlist'],
      ['', '  • <span class="key">devops</span> / <span class="key">platform</span> / <span class="key">cloud-eng</span> · junior or apprentice'],
      ['', '  • a team where I can pair on terraform &amp; CI/CD'],
      ['', '  • bonus: linux-leaning shop'],
      ['', ''],
      ['$ ', 'contact'],
      ['', '<a href="https://www.linkedin.com/in/sebastian-g-02361a3b8/" style="color:var(--accent-2)" target="_blank">linkedin.com/in/sebastian-g</a>'],
      ['', '<a href="mailto:seba@02f.pw" style="color:var(--accent-2)">seba@02f.pw</a>'],
      ['', ''],
      ['', '<span style="color:var(--muted)">[esc] to close</span>'],
    ];
    eggBody.innerHTML = '';
    lines.forEach((l, i) => {
      const div = document.createElement('div');
      div.className = 'line';
      div.style.animationDelay = (i * 0.08) + 's';
      div.innerHTML = '<span style="color:var(--muted)">' + l[0] + '</span>' + l[1];
      eggBody.appendChild(div);
    });
  }
  function hideEgg() { egg && egg.classList.remove('show'); }
  if (egg) egg.addEventListener('click', e => { if (e.target === egg) hideEgg(); });
})();
