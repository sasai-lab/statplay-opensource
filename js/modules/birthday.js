// StatPlay — module: Birthday Paradox interactive column
const TAU = Math.PI * 2;
function _throttle(fn){let id=0;return function(){id||(id=requestAnimationFrame(()=>{id=0;fn();}));};}
function _debResize(fn,ms=120){let t=0;return function(){clearTimeout(t);t=setTimeout(fn,ms);};}

const ja = () => document.documentElement.lang === 'ja';
const lt = () => document.body.classList.contains('theme-light');
const _raw = window.devicePixelRatio || 1;
const dpr = (Number.isFinite(_raw) && _raw > 0) ? Math.min(_raw, 8) : 1;

// Theme colors aligned with utils.js themeColors()
function tc() {
  return lt()
    ? { cyan: '#1a6b7a', magenta: '#7a2060', yellow: '#6b5a00',
        dim: '#5a6275', text: '#1a1a2e', grid: 'rgba(26,26,46,.08)' }
    : { cyan: '#00f3ff', magenta: '#ff2bd6', yellow: '#ffe600',
        dim: '#7a8aa6', text: '#c8d6e5', grid: 'rgba(0,243,255,.06)' };
}

function setupCanvas(canvas, h) {
  const r = canvas.parentElement.getBoundingClientRect();
  canvas.width = r.width * dpr;
  canvas.height = h * dpr;
  canvas.style.height = h + 'px';
  const ctx = canvas.getContext('2d');
  if (!ctx) return { ctx: null, w: 0, h: 0 };
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w: r.width, h };
}

function exactP(n) {
  if (n <= 1) return 0;
  if (n >= 365) return 1;
  let p = 1;
  for (let i = 1; i < n; i++) p *= (365 - i) / 365;
  return 1 - p;
}

function simTrial() {
  const seen = new Set();
  for (let i = 1; i <= 365; i++) {
    const d = Math.floor(Math.random() * 365);
    if (seen.has(d)) return i;
    seen.add(d);
  }
  return 366;
}

function onVisible(el, cb) {
  if (!el) return;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { obs.unobserve(el); cb(); }
    });
  }, { threshold: 0.2 });
  obs.observe(el);
}

function bindCanvasDrag(canvas, slider, xToValue) {
  if (!canvas || !slider) return;
  let dragging = false;
  function handle(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const x = clientX - rect.left;
    const v = xToValue(x, rect.width);
    if (v !== null) {
      slider.value = v;
      slider.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }
  canvas.addEventListener('pointerdown', (e) => {
    dragging = true;
    canvas.setPointerCapture(e.pointerId);
    handle(e);
  });
  canvas.addEventListener('pointermove', (e) => { if (dragging) handle(e); });
  canvas.addEventListener('pointerup', (e) => {
    dragging = false;
    canvas.releasePointerCapture(e.pointerId);
  });
  canvas.style.cursor = 'crosshair';
  canvas.style.touchAction = 'none';
}

// ─── 01 INTUITION QUIZ ───
(function intuition() {
  const slider = document.getElementById('guessSlider');
  const valEl = document.getElementById('guessVal');
  const btn = document.getElementById('guessBtn');
  const reveal = document.getElementById('guessReveal');
  const msgEl = document.getElementById('guessMsg');
  if (!slider || !btn) return;

  slider.addEventListener('input', () => { valEl.textContent = slider.value; });

  btn.addEventListener('click', () => {
    const guess = parseInt(slider.value);
    btn.disabled = true;
    btn.style.opacity = '.5';
    slider.disabled = true;
    reveal.style.display = 'block';
    reveal.style.opacity = '0';
    requestAnimationFrame(() => { reveal.style.transition = 'opacity .6s'; reveal.style.opacity = '1'; });
    const diff = Math.abs(guess - 23);
    if (diff <= 3) {
      msgEl.innerHTML = ja()
        ? '<b style="color:var(--green)">すごい！ほぼ正解。</b>正解は <b style="color:var(--cyan)">23人</b>。'
        : '<b style="color:var(--green)">Impressive!</b> The answer is <b style="color:var(--cyan)">23</b>.';
    } else {
      msgEl.innerHTML = ja()
        ? 'あなたの予想：<b style="color:var(--cyan)">' + guess + '人</b>。正解は <b style="color:var(--cyan)">23人</b>。' +
          (guess > 23 ? 'ほとんどの人が多く見積もる。それが「パラドックス」の正体だ。' : '少なく見積もるのは珍しい！')
        : 'Your guess: <b style="color:var(--cyan)">' + guess + '</b>. Answer: <b style="color:var(--cyan)">23</b>. ' +
          (guess > 23 ? 'Most people overestimate. That\'s the "paradox."' : 'Underestimating is rare!');
    }
  });
})();

// ─── 02 CALENDAR (taller: 340px, auto on scroll) ───
(function calendar() {
  const canvas = document.getElementById('bdayCalendar');
  const btnReset = document.getElementById('bdayReset');
  const countEl = document.getElementById('bdayStepCount');
  const statusEl = document.getElementById('bdayStepStatus');
  const btnAuto = document.getElementById('bdayAuto');
  if (!canvas) return;

  const CANVAS_H = 340;
  let birthdays = [];
  let matched = false;
  let autoId = null;
  let autoTriggered = false;

  function resize() { return setupCanvas(canvas, CANVAS_H); }

  function drawCal() {
    const { ctx, w, h } = resize();
    const c = tc();
    ctx.clearRect(0, 0, w, h);
    const cols = 19, rows = Math.ceil(365 / cols);
    const cellW = Math.min(30, (w - 20) / cols);
    const cellH = Math.min(16, (h - 10) / rows);
    const ox = (w - cols * cellW) / 2, oy = (h - rows * cellH) / 2;
    const counts = new Array(365).fill(0);
    birthdays.forEach(d => counts[d]++);

    for (let d = 0; d < 365; d++) {
      const col = d % cols, row = Math.floor(d / cols);
      const x = ox + col * cellW, y = oy + row * cellH;
      ctx.shadowBlur = 0;
      if (counts[d] === 0) {
        ctx.fillStyle = lt() ? 'rgba(26,107,122,.08)' : 'rgba(0,243,255,.04)';
      } else if (counts[d] === 1) {
        ctx.fillStyle = lt() ? 'rgba(26,107,122,.55)' : 'rgba(0,243,255,.4)';
      } else {
        ctx.fillStyle = c.magenta;
        ctx.shadowBlur = lt() ? 0 : 10;
        ctx.shadowColor = c.magenta;
      }
      ctx.fillRect(x + 1, y + 1, cellW - 2, cellH - 2);
    }
    ctx.shadowBlur = 0;
  }

  function addPerson() {
    if (matched) return;
    const day = Math.floor(Math.random() * 365);
    const dup = birthdays.includes(day);
    birthdays.push(day);
    countEl.textContent = birthdays.length;
    drawCal();

    if (dup) {
      matched = true;
      if (autoId) { clearInterval(autoId); autoId = null; }
      statusEl.textContent = ja()
        ? `${birthdays.length}人目で一致！`
        : `Match at person ${birthdays.length}!`;
      statusEl.style.color = 'var(--magenta)';
    }
  }

  function reset() {
    birthdays = [];
    matched = false;
    if (autoId) { clearInterval(autoId); autoId = null; }
    countEl.textContent = '0';
    statusEl.textContent = ja() ? 'スクロールで自動スタート' : 'Auto-starts on scroll';
    statusEl.style.color = 'var(--dim)';
    drawCal();
  }

  function startAuto() {
    if (autoId) { clearInterval(autoId); autoId = null; return; }
    if (matched) reset();
    autoId = setInterval(() => {
      addPerson();
      if (matched) { clearInterval(autoId); autoId = null; }
    }, 120);
  }

  btnReset?.addEventListener('click', reset);
  btnAuto?.addEventListener('click', startAuto);

  onVisible(document.getElementById('step-sim'), () => {
    if (autoTriggered) return;
    autoTriggered = true;
    startAuto();
  });

  window.addEventListener('resize', drawCal);
  reset();
})();

// ─── 03 PAIR EXPLOSION (max=20, 400px, slow eased 6s) ───
(function pairs() {
  const canvas = document.getElementById('pairCanvas');
  const slider = document.getElementById('pairN');
  const valEl = document.getElementById('pairNVal');
  const pairCountEl = document.getElementById('pairCount');
  if (!canvas || !slider) return;

  const CANVAS_H = 400;
  let autoAnimated = false;

  function draw() {
    const { ctx, w, h } = setupCanvas(canvas, CANVAS_H);
    const c = tc();
    const n = parseInt(slider.value);
    valEl.textContent = n;
    const numPairs = n * (n - 1) / 2;
    pairCountEl.textContent = numPairs.toLocaleString();
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2, cy = h / 2;
    const R = Math.min(cx, cy) - 30;
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU - Math.PI / 2;
      pts.push([cx + R * Math.cos(a), cy + R * Math.sin(a)]);
    }

    const lineAlpha = lt()
      ? Math.max(0.08, Math.min(0.5, 5 / n))
      : Math.max(0.02, Math.min(0.3, 3 / n));
    ctx.lineWidth = lt() ? (n > 15 ? 1 : 1.5) : (n > 15 ? 0.5 : 1);
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        ctx.strokeStyle = lt()
          ? `rgba(26,107,122,${lineAlpha})`
          : `rgba(0,243,255,${lineAlpha})`;
        ctx.beginPath();
        ctx.moveTo(pts[i][0], pts[i][1]);
        ctx.lineTo(pts[j][0], pts[j][1]);
        ctx.stroke();
      }
    }

    const r = n > 15 ? 4 : 6;
    ctx.shadowBlur = lt() ? 0 : 8;
    ctx.shadowColor = c.cyan;
    pts.forEach(p => {
      ctx.fillStyle = c.cyan;
      ctx.beginPath();
      ctx.arc(p[0], p[1], r, 0, TAU);
      ctx.fill();
    });
    ctx.shadowBlur = 0;
  }

  slider.addEventListener('input', _throttle(draw));
  window.addEventListener('resize', _debResize(draw));

  bindCanvasDrag(canvas, slider, (x, w) => {
    const cx = w / 2, R = Math.min(w, CANVAS_H) / 2 - 30;
    const dist = Math.abs(x - cx);
    const ratio = Math.min(1, dist / R);
    return Math.max(2, Math.min(20, Math.round(2 + ratio * 18)));
  });

  // eased auto: 2→20 over 6s, ease-in (slow start → fast end)
  onVisible(document.getElementById('pairs'), () => {
    if (autoAnimated) return;
    autoAnimated = true;
    const startN = 2, endN = 20;
    const duration = 6000;
    const startTime = performance.now();

    function step(now) {
      const t = Math.min(1, (now - startTime) / duration);
      const eased = t * t * t;
      const n = Math.round(startN + (endN - startN) * eased);
      slider.value = n;
      slider.dispatchEvent(new Event('input', { bubbles: true }));
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  });

  draw();
})();

// ─── 04 PROBABILITY CURVE (max=50, taller: 380px) ───
(function curve() {
  const canvas = document.getElementById('bdayCurve');
  const slider = document.getElementById('bdayN');
  const valEl = document.getElementById('bdayNVal');
  const probEl = document.getElementById('bdayProb');
  const oddsEl = document.getElementById('bdayOdds');
  const nDispEl = document.getElementById('bdayNDisp');
  if (!canvas || !slider) return;

  const MAX_N = 50;
  const CANVAS_H = 380;
  const pad = { l: 50, r: 20, t: 20, b: 40 };
  let autoAnimated = false;

  function draw() {
    const { ctx, w, h } = setupCanvas(canvas, CANVAS_H);
    const c = tc();
    const n = parseInt(slider.value);
    valEl.textContent = n;
    if (nDispEl) nDispEl.textContent = n;
    const prob = exactP(n);
    probEl.textContent = (prob * 100).toFixed(2);

    if (prob > 0.995) {
      oddsEl.textContent = ja() ? 'ほぼ確実' : 'Nearly certain';
    } else if (prob < 0.005) {
      oddsEl.textContent = ja() ? 'ほぼ0' : '≈ 0';
    } else {
      oddsEl.textContent = (prob * 100).toFixed(1) + '%';
    }

    ctx.clearRect(0, 0, w, h);
    const gw = w - pad.l - pad.r, gh = h - pad.t - pad.b;

    // grid
    ctx.strokeStyle = c.grid;
    ctx.lineWidth = 1;
    ctx.fillStyle = c.dim;
    ctx.font = '11px Courier New';
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + gh * (1 - i / 4);
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + gw, y); ctx.stroke();
      ctx.textAlign = 'right';
      ctx.fillText((i * 25) + '%', pad.l - 6, y + 4);
    }
    for (let x = 0; x <= MAX_N; x += 5) {
      const px = pad.l + (x / MAX_N) * gw;
      ctx.beginPath(); ctx.moveTo(px, pad.t); ctx.lineTo(px, pad.t + gh); ctx.stroke();
      ctx.textAlign = 'center';
      ctx.fillText(x, px, h - pad.b + 16);
    }
    ctx.fillText(ja() ? '人数 n' : 'People n', pad.l + gw / 2, h - 4);

    // fill area
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(pad.l + (1 / MAX_N) * gw, pad.t + gh);
    for (let i = 1; i <= n; i++) {
      ctx.lineTo(pad.l + (i / MAX_N) * gw, pad.t + gh * (1 - exactP(i)));
    }
    ctx.lineTo(pad.l + (n / MAX_N) * gw, pad.t + gh);
    ctx.closePath();
    ctx.fillStyle = lt() ? 'rgba(26,107,122,.12)' : 'rgba(0,243,255,.06)';
    ctx.fill();
    ctx.restore();

    // curve stroke
    ctx.save();
    ctx.strokeStyle = c.cyan;
    ctx.lineWidth = lt() ? 3 : 2.5;
    ctx.shadowBlur = lt() ? 0 : 12;
    ctx.shadowColor = c.cyan;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 1; i <= MAX_N; i++) {
      const x = pad.l + (i / MAX_N) * gw;
      const y = pad.t + gh * (1 - exactP(i));
      i === 1 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();

    // 50% line
    const y50 = pad.t + gh * 0.5;
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = lt() ? 'rgba(107,90,0,.5)' : 'rgba(255,230,0,.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(pad.l, y50); ctx.lineTo(pad.l + gw, y50); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = c.yellow;
    ctx.font = '11px Courier New';
    ctx.textAlign = 'left';
    ctx.fillText('50%', pad.l + gw + 2, y50 + 4);

    // n=23 vertical
    const x23 = pad.l + (23 / MAX_N) * gw;
    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = lt() ? 'rgba(107,90,0,.35)' : 'rgba(255,230,0,.2)';
    ctx.beginPath(); ctx.moveTo(x23, pad.t); ctx.lineTo(x23, pad.t + gh); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = c.yellow;
    ctx.textAlign = 'center';
    ctx.fillText('23', x23, pad.t + gh + 16);

    // marker
    const mx = pad.l + (n / MAX_N) * gw;
    const my = pad.t + gh * (1 - prob);
    ctx.save();
    ctx.fillStyle = lt() ? 'rgba(122,32,96,.15)' : 'rgba(255,43,214,.12)';
    ctx.beginPath(); ctx.arc(mx, my, 18, 0, TAU); ctx.fill();
    ctx.fillStyle = c.magenta;
    ctx.shadowBlur = lt() ? 0 : 14;
    ctx.shadowColor = c.magenta;
    ctx.beginPath(); ctx.arc(mx, my, 5, 0, TAU); ctx.fill();
    ctx.restore();
  }

  slider.addEventListener('input', _throttle(draw));
  window.addEventListener('resize', _debResize(draw));

  bindCanvasDrag(canvas, slider, (x, w) => {
    const gw = w - pad.l - pad.r;
    const ratio = (x - pad.l) / gw;
    if (ratio < 0 || ratio > 1) return null;
    return Math.max(1, Math.min(MAX_N, Math.round(ratio * MAX_N)));
  });

  // auto sweep 1→23, stop at 23 (the key number)
  onVisible(document.getElementById('curve'), () => {
    if (autoAnimated) return;
    autoAnimated = true;
    const duration = 3500;
    const targetN = 23;
    const startTime = performance.now();

    function step(now) {
      const t = Math.min(1, (now - startTime) / duration);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const n = Math.max(1, Math.round(eased * targetN));
      slider.value = n;
      slider.dispatchEvent(new Event('input', { bubbles: true }));
      if (t < 1) requestAnimationFrame(step);
    }
    slider.value = 1;
    requestAnimationFrame(step);
  });

  draw();
})();

// ─── 05 1000-TRIAL (3s eased, taller: 500px, auto on scroll) ───
(function masssim() {
  const canvas = document.getElementById('bdayHistCanvas');
  const btn = document.getElementById('bdaySim');
  const countEl = document.getElementById('bdaySimCount');
  const avgEl = document.getElementById('bdaySimAvg');
  if (!canvas || !btn) return;

  let running = false;
  let autoTriggered = false;
  const TOTAL = 1000;
  const DURATION = 3000;
  const CANVAS_H = 500;

  function easedCount(t) {
    return Math.floor(TOTAL * t * t * t * t);
  }

  function drawHist(counts) {
    const { ctx, w, h } = setupCanvas(canvas, CANVAS_H);
    const c = tc();
    ctx.clearRect(0, 0, w, h);
    const hp = { l: 40, r: 10, t: 15, b: 30 };
    const gw = w - hp.l - hp.r, gh = h - hp.t - hp.b;
    const maxC = Math.max(1, ...counts);
    const barW = gw / 70;

    for (let i = 2; i <= 70; i++) {
      const x = hp.l + (i - 1) * barW;
      const bh = (counts[i] / maxC) * gh;
      if (lt()) {
        ctx.fillStyle = i <= 23
          ? 'rgba(26,107,122,.65)'
          : 'rgba(122,32,96,.5)';
      } else {
        ctx.fillStyle = i <= 23
          ? 'rgba(0,243,255,.45)'
          : 'rgba(255,43,214,.35)';
      }
      ctx.fillRect(x, hp.t + gh - bh, Math.max(1, barW - 1), bh);
    }

    // n=23 marker line
    const x23 = hp.l + 22 * barW;
    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = lt() ? 'rgba(107,90,0,.6)' : 'rgba(255,230,0,.4)';
    ctx.beginPath(); ctx.moveTo(x23, hp.t); ctx.lineTo(x23, hp.t + gh); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = c.yellow;
    ctx.font = '10px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('n=23', x23, hp.t - 3);

    // axis labels
    ctx.fillStyle = c.dim;
    for (let x = 5; x <= 70; x += 5) {
      ctx.fillText(x, hp.l + (x - 1) * barW + barW / 2, h - hp.b + 14);
    }
    ctx.fillText(ja() ? '初めて被った人数' : 'First match at n', hp.l + gw / 2, h - 2);
  }

  function runSim() {
    if (running) return;
    running = true;
    btn.disabled = true;
    btn.style.opacity = '.5';

    const allResults = [];
    for (let i = 0; i < TOTAL; i++) allResults.push(simTrial());

    const counts = new Array(71).fill(0);
    let displayed = 0;
    const startTime = performance.now();

    function frame(now) {
      const t = Math.min(1, (now - startTime) / DURATION);
      const target = easedCount(t);

      while (displayed < target && displayed < TOTAL) {
        const n = allResults[displayed];
        if (n <= 70) counts[n]++;
        displayed++;
      }

      countEl.textContent = displayed;
      const sum = allResults.slice(0, displayed).reduce((a, b) => a + b, 0);
      avgEl.textContent = displayed > 0 ? (sum / displayed).toFixed(1) : '—';
      drawHist(counts);

      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        while (displayed < TOTAL) {
          const n = allResults[displayed];
          if (n <= 70) counts[n]++;
          displayed++;
        }
        countEl.textContent = TOTAL;
        const totalSum = allResults.reduce((a, b) => a + b, 0);
        avgEl.textContent = (totalSum / TOTAL).toFixed(1);
        drawHist(counts);
        running = false;
        btn.disabled = false;
        btn.style.opacity = '1';
      }
    }

    requestAnimationFrame(frame);
  }

  btn.addEventListener('click', runSim);

  onVisible(document.getElementById('mass-sim'), () => {
    if (autoTriggered) return;
    autoTriggered = true;
    runSim();
  });
})();
