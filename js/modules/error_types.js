/*!
 * StatPlay — error_types column module
 * Copyright (c) 2026 Sasai Lab * Licensed under CC BY-NC 4.0.
 *
 * Standalone module for columns/error_types.html (and en/ counterpart).
 * Namespaced under window.__et_* to avoid collision with errs.js or other
 * column modules.
 */
import {
  $, normPDF, zCritical, betaTwoSided,
  resizeCanvas, drawGrid, neonLine, neonFill,
  themeColors, withAlpha, throttledDraw, debouncedResize, isEn, makeAxisMap
} from '../utils.js';

const reduced = () => !!window.__REDUCED_MOTION ||
  (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);

// ─── Shared canvas utilities (two-sided test, both H₀ and H₁ rendered) ────
function drawTwoWorldFrame(ctx, w, h, opts){
  const { alpha, delta, fillCell, dimUnselected } = opts;
  const tc = themeColors();
  drawGrid(ctx, w, h);

  const lo = -4.5, hi = Math.max(8, delta + 4.5);
  const peak = normPDF(0);
  const { xToPx, yToPx, axisY } = makeAxisMap({ w, h, lo, hi, peak, marginTop: 44, marginBottom: 32 });

  const crit = zCritical(alpha);
  const critPxR = Math.round(xToPx(crit));
  const critPxL = Math.round(xToPx(-crit));

  // Helper: build polygon points for an integration band on a curve
  const band = (mu, x1, x2) => {
    const pts = [[xToPx(x1), axisY]];
    for (let x = x1; x <= x2; x += 0.05) pts.push([xToPx(x), yToPx(normPDF(x, mu, 1))]);
    pts.push([xToPx(x2), axisY]);
    return pts;
  };

  // Highlight fill — depends on which 2×2 cell is selected.
  // 00 = 1−α (H₀ correct, central H₀ band)
  // 01 = α   (Type I, H₀ tails)
  // 10 = β   (Type II, H₁ central band)
  // 11 = 1−β (Power, H₁ tails)
  if (fillCell === '00') {
    neonFill(ctx, band(0, -crit, crit), tc.cyan, .25);
  } else if (fillCell === '01') {
    neonFill(ctx, band(0, lo, -crit), tc.yellow, .35);
    neonFill(ctx, band(0, crit, hi), tc.yellow, .35);
    // Hatch overlay on α regions for color-blind readers
    hatchRegion(ctx, w, h, band(0, lo, -crit), tc.yellow);
    hatchRegion(ctx, w, h, band(0, crit, hi), tc.yellow);
  } else if (fillCell === '10') {
    neonFill(ctx, band(delta, -crit, crit), tc.yellow, .35);
    hatchRegion(ctx, w, h, band(delta, -crit, crit), tc.yellow);
  } else if (fillCell === '11') {
    neonFill(ctx, band(delta, lo, -crit), tc.green, .30);
    neonFill(ctx, band(delta, crit, hi), tc.green, .30);
  }

  // H₀ curve
  const h0 = []; for (let px = 0; px <= w; px++) h0.push([px, yToPx(normPDF(lo + px / w * (hi - lo)))]);
  const h0Color = tc.cyan;
  const h1Color = tc.magenta;
  const h0Alpha = (dimUnselected === 'h0') ? 0.30 : 1;
  const h1Alpha = (dimUnselected === 'h1') ? 0.30 : 1;
  ctx.save(); ctx.globalAlpha = h0Alpha;
  neonLine(ctx, h0, h0Color, 14, 2.5);
  ctx.restore();

  // H₁ curve (dashed)
  const h1 = []; for (let px = 0; px <= w; px++) h1.push([px, yToPx(normPDF(lo + px / w * (hi - lo), delta, 1))]);
  ctx.save(); ctx.globalAlpha = h1Alpha; ctx.setLineDash([8, 4]);
  neonLine(ctx, h1, h1Color, 14, 2.5);
  ctx.setLineDash([]); ctx.restore();

  // Critical lines (both sides)
  ctx.save(); ctx.strokeStyle = withAlpha(tc.yellow, .8); ctx.setLineDash([4, 4]); ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(critPxR, 12); ctx.lineTo(critPxR, axisY); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(critPxL, 12); ctx.lineTo(critPxL, axisY); ctx.stroke();
  ctx.setLineDash([]); ctx.restore();
  ctx.fillStyle = tc.yellow; ctx.font = '11px "Courier New"';
  ctx.fillText('+' + crit.toFixed(2), critPxR + 4, 24);
  ctx.fillText('-' + crit.toFixed(2), critPxL + 4, 24);

  // World-declaration labels (cyan for H₀, magenta for H₁), echoing errs.js
  const labelFont = 'bold 11px "Courier New","Segoe UI","Hiragino Sans",sans-serif';
  const h0Label = isEn() ? 'H₀: TRUE WORLD' : 'H₀: 真の世界';
  const h1Label = (isEn() ? 'H₁: TRUE WORLD (δ=' : 'H₁: 真の世界 (δ=') + delta.toFixed(2) + ')';
  ctx.save(); ctx.globalAlpha = h0Alpha;
  ctx.fillStyle = tc.cyan; ctx.font = labelFont;
  ctx.fillText(h0Label, xToPx(0) - 8, yToPx(peak) - 6);
  ctx.restore();
  ctx.save(); ctx.globalAlpha = h1Alpha;
  ctx.fillStyle = tc.magenta; ctx.font = labelFont;
  ctx.fillText(h1Label, xToPx(delta) - 8, yToPx(peak) - 6);
  ctx.restore();

  // Axis ticks
  ctx.fillStyle = tc.dim; ctx.font = '10px "Courier New"';
  for (let x = Math.ceil(lo); x <= Math.floor(hi); x += 2) {
    ctx.fillText(String(x), xToPx(x) - 4, h - 14);
  }

  return { crit };
}

function hatchRegion(ctx, w, h, pts, color) {
  ctx.save();
  ctx.beginPath();
  pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
  ctx.closePath(); ctx.clip();
  ctx.strokeStyle = withAlpha(color, .35); ctx.lineWidth = 1;
  for (let i = -h; i < w + h; i += 8) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + h, h); ctx.stroke();
  }
  ctx.restore();
}

// ─── Hero animation: cells fade in, then h1/sub fade in ────────────────
function initHero() {
  const cinema = document.getElementById('etHero');
  if (!cinema) return;

  // Pre-revealed (Phase 1) cells light up immediately; correct cells (Phase 2)
  // get .cell-revealed once user starts scrolling.
  const phaseOneCells = cinema.querySelectorAll('.hero-mat-cell.phase-1');
  const phaseTwoCells = cinema.querySelectorAll('.hero-mat-cell.phase-2');
  const heroBits = cinema.querySelectorAll('.hero-in-target');

  if (reduced()) {
    phaseOneCells.forEach(c => c.classList.add('cell-revealed'));
    phaseTwoCells.forEach(c => c.classList.add('cell-revealed'));
    heroBits.forEach(el => el.classList.add('hero-in'));
    return;
  }

  // Stagger Phase 1 + hero-in over a short timeline.
  const start = performance.now();
  const ticks = [
    { t:  600, fn: () => phaseOneCells.forEach((c,i) => setTimeout(() => c.classList.add('cell-revealed'), i * 250)) },
    { t: 1100, fn: () => heroBits.forEach((el,i) => setTimeout(() => el.classList.add('hero-in'), i * 220)) },
  ];
  function loop(ts) {
    const elapsed = ts - start;
    while (ticks.length && elapsed >= ticks[0].t) ticks.shift().fn();
    if (ticks.length) requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // Phase 2 cells reveal once the user begins scrolling.
  const sentinel = document.getElementById('heroMatrixSentinel');
  if (sentinel && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          phaseTwoCells.forEach((c,i) => setTimeout(() => c.classList.add('cell-revealed'), i * 250));
          io.disconnect();
        }
      });
    }, { threshold: 0.05, rootMargin: '0px 0px -10% 0px' });
    io.observe(sentinel);
  } else {
    phaseTwoCells.forEach(c => c.classList.add('cell-revealed'));
  }
}

// ─── Interactive ①: "You're the judge" mode ────────────────────────────
function initInteractive1() {
  const canvas = $('judgeCanvas');
  const matrix = document.getElementById('judgeMatrix');
  const narration = document.getElementById('judgeNarration');
  if (!canvas || !matrix) return;

  const cells = Array.from(matrix.querySelectorAll('.cell-clickable'));
  // Default selection: 1−α (cell 00) per Round 2 decision.
  const state = (window.__et_judge = window.__et_judge || { cell: '00', delta: 2.0, alpha: 0.05 });

  const NARRATIONS = {
    '00': {
      ja: '正解（信頼度 1−α）：H₀ が真の世界で、棄却しなかった確率。青の山の中央域。',
      en: 'Correct (confidence 1−α): in the H₀-true world, the probability you do NOT reject. Central area of the blue mountain.'
    },
    '01': {
      ja: '第一種の過誤 α：H₀ が真の世界で、誤って棄却してしまう確率。青の山の両尾。',
      en: 'Type I error α: in the H₀-true world, the probability you reject by mistake. Both tails of the blue mountain.'
    },
    '10': {
      ja: '第二種の過誤 β：H₁ が真の世界で、棄却し損ねる確率。紫の山の臨界値の内側。',
      en: 'Type II error β: in the H₁-true world, the probability you fail to reject. Area between critical values under the purple mountain.'
    },
    '11': {
      ja: '検出力 1−β：H₁ が真の世界で、ちゃんと棄却できる確率。紫の山の両裾。',
      en: 'Power 1−β: in the H₁-true world, the probability you correctly reject. Both tails of the purple mountain.'
    }
  };

  function dimWorldOf(cell) {
    if (cell === '00' || cell === '01') return 'h1';
    if (cell === '10' || cell === '11') return 'h0';
    return null;
  }

  const sched = throttledDraw(draw);

  function draw() {
    const { ctx, w, h } = resizeCanvas(canvas);
    if (!ctx) return;
    drawTwoWorldFrame(ctx, w, h, {
      alpha: state.alpha,
      delta: state.delta,
      fillCell: state.cell,
      dimUnselected: dimWorldOf(state.cell)
    });
  }

  function selectCell(cellId) {
    state.cell = cellId;
    cells.forEach(c => {
      const active = c.dataset.cell === cellId;
      c.classList.toggle('cell-active', active);
      c.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    if (narration) {
      const n = NARRATIONS[cellId];
      narration.textContent = isEn() ? n.en : n.ja;
    }
    sched();
    // Mobile: scroll the canvas into view so the user sees the result of the tap.
    if (window.innerWidth < 720) {
      try { canvas.scrollIntoView({ block: 'nearest', behavior: reduced() ? 'auto' : 'smooth' }); } catch (_) {}
    }
  }

  // Wire up clicks + keyboard
  cells.forEach(c => {
    c.addEventListener('click', () => selectCell(c.dataset.cell));
    c.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectCell(c.dataset.cell);
      } else if (e.key.startsWith('Arrow')) {
        e.preventDefault();
        const order = ['00','01','10','11'];
        const i = order.indexOf(c.dataset.cell);
        const map = { ArrowRight: { '00':'01', '01':'00', '10':'11', '11':'10' },
                      ArrowLeft:  { '00':'01', '01':'00', '10':'11', '11':'10' },
                      ArrowDown:  { '00':'10', '01':'11', '10':'00', '11':'01' },
                      ArrowUp:    { '00':'10', '01':'11', '10':'00', '11':'01' } };
        const next = map[e.key]?.[c.dataset.cell] || order[(i+1) % 4];
        const target = matrix.querySelector(`.cell-clickable[data-cell="${next}"]`);
        if (target) { target.focus(); selectCell(next); }
      }
    });
  });

  // Initialize visible state.
  selectCell(state.cell);

  window.addEventListener('themechange', sched);
  window.addEventListener('resize', debouncedResize(sched));
}

// ─── Interactive ②: independent α / δ sliders ──────────────────────────
function initInteractive2() {
  const canvas = $('deltaAlphaCanvas');
  if (!canvas) return;

  const aS = $('etAlphaSlider');
  const dS = $('etDeltaSlider');
  const aCell = document.querySelector('.slider-cell[data-param="alpha"]');
  const dCell = document.querySelector('.slider-cell[data-param="delta"]');
  const aStat = document.querySelector('.live-stats [data-stat="alpha"]');
  const bStat = document.querySelector('.live-stats [data-stat="beta"]');
  const pStat = document.querySelector('.live-stats [data-stat="power"]');
  const cStat = document.querySelector('.live-stats [data-stat="crit"]');
  const aVal = $('etAlphaVal');
  const dVal = $('etDeltaVal');
  const isoAlphaBtn = document.getElementById('etIsoAlpha');
  const isoDeltaBtn = document.getElementById('etIsoDelta');
  if (!aS || !dS) return;

  const state = (window.__et_ab = window.__et_ab || { active: 'delta' });

  function pulse(el) {
    if (!el || reduced()) return;
    el.classList.remove('is-changing');
    // force reflow to restart animation
    void el.offsetWidth;
    el.classList.add('is-changing');
    setTimeout(() => el.classList.remove('is-changing'), 260);
  }

  const sched = throttledDraw(draw);

  function draw() {
    const alpha = parseFloat(aS.value);
    const delta = parseFloat(dS.value);
    const crit = zCritical(alpha);
    const beta = betaTwoSided(crit, delta);
    const power = 1 - beta;

    if (aVal) aVal.textContent = alpha.toFixed(3);
    if (dVal) dVal.textContent = delta.toFixed(2);

    if (aStat) aStat.textContent = alpha.toFixed(3);
    if (bStat) bStat.textContent = beta.toFixed(3);
    if (pStat) pStat.textContent = power.toFixed(3);
    if (cStat) cStat.textContent = '±' + crit.toFixed(2);

    // FIXED-side dim, ACTIVE-side highlight
    if (aCell) {
      aCell.classList.toggle('is-fixed', state.active !== 'alpha');
      aCell.classList.toggle('is-active', state.active === 'alpha');
    }
    if (dCell) {
      dCell.classList.toggle('is-fixed', state.active !== 'delta');
      dCell.classList.toggle('is-active', state.active === 'delta');
    }
    if (aStat) aStat.classList.toggle('is-locked', state.active !== 'alpha');
    if (bStat) bStat.classList.toggle('is-locked', false);
    if (pStat) pStat.classList.toggle('is-locked', false);

    const { ctx, w, h } = resizeCanvas(canvas);
    if (!ctx) return;
    drawTwoWorldFrame(ctx, w, h, { alpha, delta, fillCell: '10' /* β region prominent */, dimUnselected: null });
  }

  aS.addEventListener('input', () => {
    state.active = 'alpha';
    pulse(aStat);
    sched();
  });
  dS.addEventListener('input', () => {
    state.active = 'delta';
    pulse(bStat); pulse(pStat);
    sched();
  });

  // Guide buttons reset to a baseline that isolates one variable.
  isoAlphaBtn?.addEventListener('click', () => {
    aS.value = '0.05';
    dS.value = '2.0';
    state.active = 'alpha';
    pulse(aStat);
    sched();
    aS.focus();
  });
  isoDeltaBtn?.addEventListener('click', () => {
    aS.value = '0.05';
    dS.value = '1.0';
    state.active = 'delta';
    pulse(bStat); pulse(pStat);
    sched();
    dS.focus();
  });

  window.addEventListener('themechange', sched);
  window.addEventListener('resize', debouncedResize(sched));
  draw();
}

// ─── Interactive ③: n slider (α fixed, β/power respond) ────────────────
function initInteractive3() {
  const canvas = $('nCanvas');
  if (!canvas) return;
  const nS = $('etNSlider');
  const nVal = $('etNVal');
  const aCard = document.querySelector('.n-card[data-card="alpha"] .n-card-val');
  const bCard = document.querySelector('.n-card[data-card="beta"] .n-card-val');
  const pCard = document.querySelector('.n-card[data-card="power"] .n-card-val');
  const bArrow = document.querySelector('.n-card[data-card="beta"] .n-card-arrow');
  const pArrow = document.querySelector('.n-card[data-card="power"] .n-card-arrow');
  if (!nS) return;

  // Fixed effect-size constants (per design doc): δ_pop = 0.5, α = 0.05.
  // Effective δ on the standardized scale = δ_pop · √n.
  const ALPHA = 0.05;
  const DELTA_POP = 0.5;
  let prevBeta = null;

  const sched = throttledDraw(draw);

  function draw() {
    const n = parseInt(nS.value, 10);
    if (nVal) nVal.textContent = String(n);

    const deltaEff = DELTA_POP * Math.sqrt(n);
    const crit = zCritical(ALPHA);
    const beta = betaTwoSided(crit, deltaEff);
    const power = 1 - beta;

    if (aCard) aCard.textContent = ALPHA.toFixed(3);
    if (bCard) bCard.textContent = beta.toFixed(3);
    if (pCard) pCard.textContent = power.toFixed(3);

    // Direction indicators (β should drop, power should rise as n increases).
    if (prevBeta !== null && !reduced()) {
      const movingDown = beta < prevBeta - 1e-4;
      const movingUp = beta > prevBeta + 1e-4;
      if (bArrow) bArrow.classList.toggle('arrow-active', movingDown || movingUp);
      if (pArrow) pArrow.classList.toggle('arrow-active', movingDown || movingUp);
      const bv = bCard?.parentElement;
      const pv = pCard?.parentElement;
      [bv, pv].forEach(el => {
        if (!el) return;
        el.classList.remove('is-changing');
        void el.offsetWidth;
        el.classList.add('is-changing');
        setTimeout(() => el.classList.remove('is-changing'), 260);
      });
    }
    prevBeta = beta;

    const { ctx, w, h } = resizeCanvas(canvas);
    if (!ctx) return;
    drawTwoWorldFrame(ctx, w, h, { alpha: ALPHA, delta: deltaEff, fillCell: '01' /* α tails (always same area) */, dimUnselected: null });
    // Add a second layer that paints the β region too — both regions matter here.
    const tc = themeColors();
    const lo = -4.5, hi = Math.max(8, deltaEff + 4.5);
    const peak = normPDF(0);
    const { xToPx, yToPx, axisY } = makeAxisMap({ w, h, lo, hi, peak, marginTop: 44, marginBottom: 32 });
    const pts = [[xToPx(-crit), axisY]];
    for (let x = -crit; x <= crit; x += 0.05) pts.push([xToPx(x), yToPx(normPDF(x, deltaEff, 1))]);
    pts.push([xToPx(crit), axisY]);
    neonFill(ctx, pts, tc.yellow, .25);
    hatchRegion(ctx, w, h, pts, tc.yellow);
  }

  nS.addEventListener('input', sched);
  window.addEventListener('themechange', sched);
  window.addEventListener('resize', debouncedResize(sched));
  draw();
}

// ─── FAQ accordion ──────────────────────────────────────────────────────
function initFAQ() {
  document.querySelectorAll('.faq-q').forEach(q => {
    q.addEventListener('click', () => {
      const a = q.nextElementSibling;
      if (!a) return;
      const isOpen = q.classList.toggle('open');
      a.style.display = isOpen ? 'block' : 'none';
      q.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  });
}

// ─── Theme toggle (column-local copy, mirrors other column scripts) ────
function initThemeToggle() {
  const btn = document.getElementById('themeToggle');
  if (!btn) return;
  const saved = localStorage.getItem('svl_theme');
  if (saved === 'light') {
    document.body.classList.add('theme-light');
    btn.textContent = 'DARK';
    btn.setAttribute('aria-pressed', 'true');
  }
  btn.addEventListener('click', () => {
    const isLight = document.body.classList.toggle('theme-light');
    btn.textContent = isLight ? 'DARK' : 'LIGHT';
    btn.setAttribute('aria-pressed', String(isLight));
    localStorage.setItem('svl_theme', isLight ? 'light' : 'dark');
    window.dispatchEvent(new CustomEvent('themechange'));
  });
}

// ─── Progress bar ──────────────────────────────────────────────────────
function initProgressBar() {
  const bar = document.getElementById('progressBar');
  if (!bar) return;
  window.addEventListener('scroll', () => {
    const h = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = h > 0 ? (window.scrollY / h * 100) + '%' : '0%';
  }, { passive: true });
}

// ─── Scroll reveal ─────────────────────────────────────────────────────
function initScrollReveal() {
  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('.col-section, .takeaway').forEach(el => el.classList.add('visible'));
    return;
  }
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.col-section, .takeaway').forEach(el => obs.observe(el));
}

// ─── Hero scroll button ────────────────────────────────────────────────
function initHeroScroll() {
  const btn = document.getElementById('heroScroll');
  btn?.addEventListener('click', () => {
    const main = document.querySelector('main');
    if (main) main.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth' });
  });
}

// ─── Boot ──────────────────────────────────────────────────────────────
function boot() {
  // Only run when the column page is loaded — guard with one of its IDs.
  if (!document.getElementById('etHero') && !document.getElementById('judgeMatrix')) return;
  initThemeToggle();
  initProgressBar();
  initScrollReveal();
  initHeroScroll();
  initHero();
  initInteractive1();
  initInteractive2();
  initInteractive3();
  initFAQ();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
