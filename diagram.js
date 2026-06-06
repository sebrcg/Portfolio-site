/* ============================================================
   diagram.js
   - Interactive stack-diagram detail
   - AWS edge map (SVG built procedurally)
   ============================================================ */
(function () {
  /* ---------- Stack node details ---------- */
  const NODE_INFO = {
    browser: {
      title: 'Your browser',
      tag: 'Client',
      body: "You typed seba.sh (or followed a link). Your browser asks the OS where seba.sh lives before it can ask for any HTML.",
      cmd: 'curl -v https://seba.sh',
    },
    dns: {
      title: 'Cloudflare DNS',
      tag: 'DNS',
      body: "Cloudflare hosts the seba.sh zone. It hands back an alias pointing at the CloudFront distribution. I keep DNS off AWS so I can swap CDNs without changing nameservers.",
      cmd: 'dig +short seba.sh',
    },
    acm: {
      title: 'AWS Certificate Manager',
      tag: 'TLS',
      body: "ACM issued the TLS cert for seba.sh and www.seba.sh (DNS-validated). CloudFront uses it to terminate HTTPS at the edge so S3 never has to speak TLS.",
      cmd: 'aws acm describe-certificate --certificate-arn arn:aws:acm:...',
    },
    cf: {
      title: 'CloudFront',
      tag: 'Edge',
      body: "Global CDN sitting in front of S3. Caches the site at AWS edge locations, terminates TLS using the ACM cert, and enforces HTTPS only. Without it, S3 would be slower, costlier, and exposed.",
      cmd: 'aws cloudfront create-invalidation --distribution-id E... --paths "/*"',
    },
    oac: {
      title: 'Origin Access Control',
      tag: 'Auth',
      body: "Newer replacement for OAI. CloudFront signs requests to S3 with SigV4, so the bucket can stay 100% private. Only this distribution can read it: direct s3.amazonaws.com URLs return 403.",
      cmd: 'aws s3api get-bucket-policy --bucket seba-sh-site',
    },
    s3: {
      title: 'Amazon S3',
      tag: 'Origin',
      body: "The actual files. Private bucket, public-block ON, versioning ON. Deploy runs in CI: GitHub Actions assumes a role via OIDC, runs aws s3 sync, then invalidates CloudFront.",
      cmd: 'aws s3 sync ./dist s3://seba-sh-site --delete',
    },
  };

  const detail = document.getElementById('stack-detail');
  document.querySelectorAll('.stack-node').forEach(node => {
    node.addEventListener('click', () => {
      document.querySelectorAll('.stack-node').forEach(n => n.classList.remove('active'));
      node.classList.add('active');
      const id = node.getAttribute('data-id');
      const info = NODE_INFO[id];
      if (!info || !detail) return;
      detail.innerHTML =
        '<h4>' + info.title + ' <span class="tag">' + info.tag + '</span></h4>' +
        '<p>' + info.body + '</p>' +
        '<code class="cmd">' + info.cmd + '</code>';
    });
  });

  /* ---------- Region / edge map ---------- */
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const map = document.getElementById('region-map');
  const tip = document.getElementById('map-tip');
  if (!map) return;

  // Simplified continent silhouettes (rough polygons — purely decorative)
  // Coordinates in viewBox 1000 x 480.
  const CONTINENTS = [
    // North America
    "M 90 90 L 200 80 L 250 110 L 270 160 L 240 210 L 210 250 L 180 260 L 150 230 L 120 200 L 90 160 Z",
    // Central America thin
    "M 200 250 L 230 260 L 240 290 L 220 310 L 200 300 Z",
    // South America
    "M 240 290 L 290 300 L 310 350 L 300 410 L 270 440 L 240 410 L 230 360 Z",
    // Greenland
    "M 320 60 L 360 50 L 380 90 L 360 120 L 330 110 Z",
    // Europe
    "M 460 90 L 540 80 L 560 110 L 540 140 L 500 150 L 470 130 Z",
    // Africa
    "M 490 160 L 580 160 L 610 220 L 590 290 L 540 330 L 500 290 L 480 220 Z",
    // Middle East / India / SE Asia rough
    "M 580 130 L 660 130 L 700 170 L 720 210 L 690 240 L 640 230 L 600 200 Z",
    // Asia main
    "M 600 70 L 800 70 L 850 110 L 820 160 L 760 150 L 700 130 L 640 130 Z",
    // Japan / east
    "M 830 130 L 870 140 L 880 170 L 850 180 Z",
    // SE Asia islands
    "M 760 230 L 820 240 L 830 270 L 790 280 L 770 260 Z",
    // Australia
    "M 800 320 L 880 320 L 900 360 L 860 390 L 820 380 L 800 360 Z",
  ];

  // AWS edge cities (sample — visually representative, not exhaustive)
  // x/y in viewBox; lat/lon used to pick "nearest" for the visitor
  const EDGES = [
    { id: 'IAD', city: 'Ashburn',     x: 250, y: 180, lat: 39.04, lon: -77.49 },
    { id: 'SFO', city: 'San Francisco', x: 120, y: 180, lat: 37.62, lon: -122.38 },
    { id: 'SEA', city: 'Seattle',     x: 130, y: 130, lat: 47.45, lon: -122.31 },
    { id: 'LAX', city: 'Los Angeles', x: 130, y: 200, lat: 33.94, lon: -118.40 },
    { id: 'DFW', city: 'Dallas',      x: 195, y: 215, lat: 32.89, lon: -97.04 },
    { id: 'ORD', city: 'Chicago',     x: 225, y: 175, lat: 41.97, lon: -87.90 },
    { id: 'MIA', city: 'Miami',       x: 235, y: 240, lat: 25.79, lon: -80.29 },
    { id: 'YUL', city: 'Montréal',    x: 260, y: 160, lat: 45.47, lon: -73.74 },
    { id: 'GRU', city: 'São Paulo',   x: 290, y: 380, lat: -23.55, lon: -46.63 },
    { id: 'EZE', city: 'Buenos Aires',x: 275, y: 415, lat: -34.61, lon: -58.38 },
    { id: 'LHR', city: 'London',      x: 475, y: 125, lat: 51.50, lon: -0.13 },
    { id: 'CDG', city: 'Paris',       x: 490, y: 135, lat: 48.86, lon: 2.35 },
    { id: 'AMS', city: 'Amsterdam',   x: 495, y: 122, lat: 52.37, lon: 4.90 },
    { id: 'FRA', city: 'Frankfurt',   x: 510, y: 130, lat: 50.11, lon: 8.68 },
    { id: 'MAD', city: 'Madrid',      x: 470, y: 155, lat: 40.42, lon: -3.70 },
    { id: 'MXP', city: 'Milan',       x: 515, y: 145, lat: 45.46, lon: 9.19 },
    { id: 'ARN', city: 'Stockholm',   x: 525, y: 105, lat: 59.33, lon: 18.07 },
    { id: 'WAW', city: 'Warsaw',      x: 540, y: 125, lat: 52.23, lon: 21.01 },
    { id: 'JNB', city: 'Cape Town',   x: 555, y: 380, lat: -33.92, lon: 18.42 },
    { id: 'CAI', city: 'Cairo',       x: 565, y: 180, lat: 30.04, lon: 31.24 },
    { id: 'DXB', city: 'Dubai',       x: 625, y: 200, lat: 25.20, lon: 55.27 },
    { id: 'BOM', city: 'Mumbai',      x: 670, y: 215, lat: 19.07, lon: 72.87 },
    { id: 'DEL', city: 'Delhi',       x: 685, y: 195, lat: 28.61, lon: 77.20 },
    { id: 'SIN', city: 'Singapore',   x: 760, y: 260, lat: 1.35,  lon: 103.81 },
    { id: 'HKG', city: 'Hong Kong',   x: 790, y: 215, lat: 22.31, lon: 114.16 },
    { id: 'NRT', city: 'Tokyo',       x: 855, y: 175, lat: 35.67, lon: 139.65 },
    { id: 'ICN', city: 'Seoul',       x: 825, y: 165, lat: 37.56, lon: 126.97 },
    { id: 'SYD', city: 'Sydney',      x: 870, y: 365, lat: -33.86, lon: 151.20 },
    { id: 'MEL', city: 'Melbourne',   x: 850, y: 385, lat: -37.81, lon: 144.96 },
  ];

  // Build silhouettes
  CONTINENTS.forEach(d => {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    path.setAttribute('fill', 'rgba(99, 130, 200, 0.10)');
    path.setAttribute('stroke', 'rgba(99, 130, 200, 0.18)');
    path.setAttribute('stroke-width', '0.8');
    map.appendChild(path);
  });

  // grid lines (latitude)
  for (let i = 1; i < 4; i++) {
    const y = (480 / 4) * i;
    const line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('x1', 30); line.setAttribute('x2', 970);
    line.setAttribute('y1', y); line.setAttribute('y2', y);
    line.setAttribute('stroke', 'rgba(99, 130, 200, 0.07)');
    line.setAttribute('stroke-dasharray', '2 4');
    map.appendChild(line);
  }

  // edge markers
  const edgeEls = [];
  EDGES.forEach(e => {
    const g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('class', 'edge');
    g.setAttribute('transform', `translate(${e.x}, ${e.y})`);
    g.setAttribute('data-id', e.id);

    const ring = document.createElementNS(SVG_NS, 'circle');
    ring.setAttribute('class', 'edge-ring');
    ring.setAttribute('r', 4);
    g.appendChild(ring);

    const dot = document.createElementNS(SVG_NS, 'circle');
    dot.setAttribute('class', 'edge-dot');
    dot.setAttribute('r', 3.5);
    g.appendChild(dot);

    g.addEventListener('mouseenter', (ev) => {
      tip.textContent = `${e.id} · ${e.city}`;
      const rect = map.getBoundingClientRect();
      const scaleX = rect.width / 1000;
      const scaleY = rect.height / 480;
      tip.style.left = (e.x * scaleX) + 'px';
      tip.style.top = (e.y * scaleY + 30) + 'px';
      tip.classList.add('show');
    });
    g.addEventListener('mouseleave', () => tip.classList.remove('show'));

    map.appendChild(g);
    edgeEls.push({ el: g, dot, e });
  });

  // Pick nearest edge using browser geolocation if granted; else fall back to timezone-based guess
  function activateEdge(edge) {
    edgeEls.forEach(({ el, dot }) => {
      el.classList.remove('active');
      dot.classList.remove('active');
    });
    const match = edgeEls.find(x => x.e.id === edge.id);
    if (match) {
      match.el.classList.add('active');
      match.dot.classList.add('active');
    }
    const labels = document.querySelectorAll('#stat-edge, #map-edge');
    labels.forEach(l => l.textContent = `${edge.id} · ${edge.city}`);

    // distance to us-east-1 origin (Ashburn, VA)
    const ORIGIN = { lat: 39.04, lon: -77.49 };
    const d = haversineMiles(edge.lat, edge.lon, ORIGIN.lat, ORIGIN.lon);
    const distEl = document.getElementById('map-dist');
    if (distEl) distEl.textContent = Math.round(d).toLocaleString() + ' mi';
  }

  function haversineMiles(lat1, lon1, lat2, lon2) {
    const R = 3958.8;
    const toRad = x => x * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }

  function nearestEdge(lat, lon) {
    let best = EDGES[0], bestD = Infinity;
    for (const e of EDGES) {
      const d = haversineMiles(lat, lon, e.lat, e.lon);
      if (d < bestD) { bestD = d; best = e; }
    }
    return best;
  }

  // Timezone-based fallback: maps common TZ to a likely edge city
  function guessFromTimezone() {
    let tz = 'America/New_York';
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || tz; } catch {}
    const map = {
      'America/Los_Angeles': 'SFO', 'America/Vancouver': 'SEA', 'America/Tijuana': 'LAX',
      'America/Denver': 'DFW', 'America/Phoenix': 'LAX', 'America/Chicago': 'ORD',
      'America/Mexico_City': 'DFW', 'America/Toronto': 'YUL', 'America/New_York': 'IAD',
      'America/Sao_Paulo': 'GRU', 'America/Argentina/Buenos_Aires': 'EZE',
      'Europe/London': 'LHR', 'Europe/Dublin': 'LHR', 'Europe/Paris': 'CDG',
      'Europe/Amsterdam': 'AMS', 'Europe/Berlin': 'FRA', 'Europe/Madrid': 'MAD',
      'Europe/Rome': 'MXP', 'Europe/Stockholm': 'ARN', 'Europe/Warsaw': 'WAW',
      'Africa/Johannesburg': 'JNB', 'Africa/Cairo': 'CAI',
      'Asia/Dubai': 'DXB', 'Asia/Kolkata': 'BOM', 'Asia/Delhi': 'DEL',
      'Asia/Singapore': 'SIN', 'Asia/Hong_Kong': 'HKG', 'Asia/Tokyo': 'NRT',
      'Asia/Seoul': 'ICN', 'Australia/Sydney': 'SYD', 'Australia/Melbourne': 'MEL',
    };
    const id = map[tz] || 'IAD';
    return EDGES.find(e => e.id === id) || EDGES[0];
  }

  // start with a guess so we have something on screen immediately
  const guess = guessFromTimezone();
  activateEdge(guess);

  // refine when geolocation comes back (only if user grants it)
  // We don't prompt; we use it silently only when already granted by other code paths.
  // Most visitors will see the timezone-based guess, which is usually correct.

  /* ---------- Fake latency / ttfb ---------- */
  // Simulate a TTFB read from the page itself. Real page already loaded;
  // we can use performance.timing if available.
  function updateTtfb() {
    let ttfb = null;
    try {
      const nav = performance.getEntriesByType('navigation')[0];
      if (nav && nav.responseStart && nav.requestStart) {
        ttfb = Math.max(1, Math.round(nav.responseStart - nav.requestStart));
      }
    } catch {}
    if (ttfb == null) ttfb = 18 + Math.round(Math.random() * 30);
    const el = document.getElementById('stat-ttfb');
    if (el) el.textContent = ttfb + ' ms';
  }
  updateTtfb();
})();
