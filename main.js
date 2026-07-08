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

  /* ---------- Hero title: one-time morphing text reveal ----------
     Ported from the 21st.dev "morphing text reveal": every character
     flickers through random glyphs, then pops into place (rise + scale)
     in a left-to-right wave, in monospace, before the title settles on
     its real font + gradient. Both lines share a reveal window so they
     finish together. Runs once, never loops. Skipped for
     reduced-motion / Calm so the copy just shows plain. */
  (function heroReveal() {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const calm = window.__TWEAKS__ && window.__TWEAKS__.motion === 'calm';
    if (reduce || calm) return; // leave the real words in place

    const GLYPHS = '0123456789abcdef/\\<>*#';
    const rand = () => GLYPHS[(Math.random() * GLYPHS.length) | 0];
    const SPAN = 750;  // reveal window per line — both lines share it, so a
                       // short line reveals slower and they finish together
    const START = 160; // ms hold on the scrambled text before revealing
    const POP = 400;   // per-character pop duration (matches morphChar in CSS)

    function reveal(el) {
      if (!el) return;
      const finalText = (el.textContent || '').trim();
      if (!finalText) return;
      const chars = finalText.split('');

      el.classList.add('cracking');
      el.textContent = '';
      const spans = chars.map((ch) => {
        const s = document.createElement('span');
        s.className = 'crk-char' + (ch === ' ' ? '' : ' scrambling');
        s.textContent = ch === ' ' ? ' ' : rand();
        el.appendChild(s);
        return s;
      });

      const stagger = SPAN / Math.max(1, chars.length);
      const revealed = new Array(chars.length).fill(false);
      let start = 0;

      function tick(now) {
        if (!start) start = now;
        const t = now - start;
        let pending = false;
        for (let i = 0; i < chars.length; i++) {
          if (revealed[i]) continue;
          if (chars[i] === ' ') { revealed[i] = true; continue; }
          if (t >= i * stagger) {
            revealed[i] = true;                 // lock this char in
            spans[i].textContent = chars[i];
            spans[i].classList.remove('scrambling');
            spans[i].classList.add('pop');      // rise + scale into place
          } else {
            pending = true;
            spans[i].textContent = rand();      // keep flickering
          }
        }
        if (pending) {
          requestAnimationFrame(tick);
        } else {
          // let the last pops finish, then restore the real markup so the
          // settled title regains its font + gradient
          setTimeout(() => {
            el.textContent = finalText;
            el.classList.remove('cracking');
          }, POP);
        }
      }
      setTimeout(() => requestAnimationFrame(tick), START);
    }

    reveal($('.hero-title .hero-l1'));
    reveal($('.hero-title .accent'));
  })();

  /* ---------- Count-up on Work metrics (on scroll into view) ----------
     Eases each number from 0 to its value the first time it enters the
     viewport, keeping any prefix/suffix (e.g. the "+") and comma grouping
     (1,000). Width is locked to the final size so the sentence around it
     doesn't reflow. Runs once per number; skipped for reduced-motion /
     Calm so the real values just show. */
  (function metricCounters() {
    const metrics = $$('.work-card .metric');
    if (!metrics.length) return;

    const fmt = (n, pre, suf) => pre + n.toLocaleString('en-US') + suf;

    // parse each metric and lock its width to the final rendered size
    const items = metrics.map(el => {
      const text = (el.textContent || '').trim();
      const m = text.match(/[\d,]+/);
      if (!m) return null;
      const target = parseInt(m[0].replace(/,/g, ''), 10);
      const pre = text.slice(0, m.index);
      const suf = text.slice(m.index + m[0].length);
      el.style.display = 'inline-block';
      el.style.fontVariantNumeric = 'tabular-nums';
      el.style.minWidth = el.offsetWidth + 'px'; // measured while showing final text
      return { el, target, pre, suf, done: false };
    }).filter(Boolean);

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const calm = window.__TWEAKS__ && window.__TWEAKS__.motion === 'calm';
    if (reduce || calm) return; // leave the real values in place

    items.forEach(it => { it.el.textContent = fmt(0, it.pre, it.suf); });

    const DURATION = 1200;
    const easeOut = t => 1 - Math.pow(1 - t, 3);

    function run(it) {
      if (it.done) return;
      it.done = true;
      let start = 0;
      function step(now) {
        if (!start) start = now;
        const p = Math.min(1, (now - start) / DURATION);
        it.el.textContent = fmt(Math.round(easeOut(p) * it.target), it.pre, it.suf);
        if (p < 1) requestAnimationFrame(step);
        else it.el.textContent = fmt(it.target, it.pre, it.suf);
      }
      requestAnimationFrame(step);
    }

    function check() {
      const vh = window.innerHeight;
      items.forEach(it => {
        if (it.done) return;
        const r = it.el.getBoundingClientRect();
        if (r.top < vh - 40 && r.bottom > 0) run(it);
      });
    }
    requestAnimationFrame(() => requestAnimationFrame(check));
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    // safety net: after 3s, finish anything still not triggered
    setTimeout(() => items.forEach(run), 3000);
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
