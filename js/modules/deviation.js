/*!
 * StatPlay — deviation column module
 * Copyright (c) 2026 Sasai Lab * Licensed under CC BY-NC 4.0.
 */
import { $, normPDF, normCDF, resizeCanvas, drawGrid, neonLine, neonFill, themeColors, throttledDraw, debouncedResize, isEn } from '../utils.js';
import { initShare } from './share.js';

const L = (ja, en) => isEn() ? en : ja;

/* ── Quiz ── */
function initQuiz() {
  document.querySelectorAll('.quiz-choice').forEach(btn => {
    btn.addEventListener('click', () => {
      const group = btn.closest('.quiz-item');
      if (group.classList.contains('answered')) return;
      group.classList.add('answered');
      const correct = btn.dataset.correct === 'true';
      btn.classList.add(correct ? 'correct' : 'wrong');
      if (!correct) {
        group.querySelector('[data-correct="true"]').classList.add('correct');
      }
      group.querySelector('.quiz-explain').style.display = 'block';
    });
  });
}

/* ── Unified simulator + rarity ── */
function initSimulator() {
  const cScore = $('devScore');
  const cMean  = $('devMean');
  const cSD    = $('devSD');
  const vScore = $('devScoreVal');
  const vMean  = $('devMeanVal');
  const vSD    = $('devSDVal');
  const vDev   = $('devResult');
  const vPct   = $('devPct');
  const vRank  = $('devRank');
  const canvas = $('devCanvas');
  const rows   = document.querySelectorAll('.rarity-row');
  if (!canvas) return;

  function draw() {
    const score = +cScore.value;
    const mu    = +cMean.value;
    const sd    = +cSD.value;
    vScore.textContent = score;
    vMean.textContent  = mu;
    vSD.textContent    = sd;

    const dev = 50 + 10 * (score - mu) / sd;
    const z   = (score - mu) / sd;
    const pct = (1 - normCDF(z)) * 100;
    const oneIn = Math.max(1, Math.round(1 / (1 - normCDF(z))));

    vDev.textContent  = dev.toFixed(1);
    vPct.textContent  = pct < 0.01 ? '< 0.01' : pct.toFixed(2);
    vRank.textContent = oneIn >= 10000 ? oneIn.toLocaleString() : oneIn;

    // highlight nearest rarity row
    let nearest = null, minDist = Infinity;
    rows.forEach(r => {
      r.classList.remove('rarity-active');
      const d = Math.abs(+r.dataset.dev - dev);
      if (d < minDist) { minDist = d; nearest = r; }
    });
    if (nearest && minDist < 4) nearest.classList.add('rarity-active');

    // draw canvas
    const { ctx, w, h } = resizeCanvas(canvas);
    const tc = themeColors();
    ctx.clearRect(0, 0, w, h);
    drawGrid(ctx, w, h);

    const pad = { l: 40, r: 40, t: 28, b: 40 };
    const plotW = w - pad.l - pad.r;
    const plotH = h - pad.t - pad.b;
    const zMin = -3.8, zMax = 3.8;

    const toX = v => pad.l + (v - zMin) / (zMax - zMin) * plotW;
    const toY = v => pad.t + plotH - v / 0.42 * plotH;

    // axis
    ctx.strokeStyle = tc.dim;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.l, pad.t + plotH);
    ctx.lineTo(pad.l + plotW, pad.t + plotH);
    ctx.stroke();

    // shaded area (right tail)
    const zClamped = Math.max(zMin, Math.min(zMax, z));
    const fillPts = [[toX(zClamped), toY(0)]];
    for (let v = zClamped; v <= zMax; v += 0.02) {
      fillPts.push([toX(v), toY(normPDF(v))]);
    }
    fillPts.push([toX(zMax), toY(0)]);
    neonFill(ctx, fillPts, tc.magenta, 0.3);

    // bell curve
    const pts = [];
    for (let v = zMin; v <= zMax; v += 0.02) {
      pts.push([toX(v), toY(normPDF(v))]);
    }
    neonLine(ctx, pts, tc.cyan, 14, 2.5);

    // marker line
    if (z > zMin && z < zMax) {
      const sx = toX(z);
      ctx.save();
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = tc.yellow;
      ctx.lineWidth = 2;
      ctx.shadowBlur = tc.light ? 0 : 8;
      ctx.shadowColor = tc.yellow;
      ctx.beginPath();
      ctx.moveTo(sx, toY(normPDF(z)));
      ctx.lineTo(sx, pad.t + plotH);
      ctx.stroke();
      ctx.restore();

      // deviation label above curve
      ctx.fillStyle = tc.yellow;
      ctx.font = 'bold 15px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(dev.toFixed(1), sx, toY(normPDF(z)) - 14);
    }

    // percentage annotation in shaded area
    const pctText = pct < 0.1 ? pct.toFixed(2) : pct.toFixed(1);
    const annoX = Math.min(toX(zClamped) + 55, pad.l + plotW - 50);
    ctx.fillStyle = tc.magenta;
    ctx.font = 'bold 13px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(L(`上位 ${pctText}%`, `Top ${pctText}%`), annoX, pad.t + 14);

    // axis labels (deviation scale)
    for (let d = 25; d <= 75; d += 5) {
      const zz = (d - 50) / 10;
      const xx = toX(zz);
      if (d % 10 === 0) {
        ctx.fillStyle = tc.text;
        ctx.font = '12px "Courier New", monospace';
      } else {
        ctx.fillStyle = tc.dim;
        ctx.font = '10px "Courier New", monospace';
      }
      ctx.textAlign = 'center';
      ctx.fillText(d.toString(), xx, pad.t + plotH + 16);
    }
    ctx.fillStyle = tc.dim;
    ctx.font = '11px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(L('偏差値', 'Deviation'), pad.l + plotW / 2, pad.t + plotH + 32);
  }

  // slider → draw
  const schedDraw=throttledDraw(draw);
  [cScore, cMean, cSD].forEach(el => el.addEventListener('input', schedDraw));

  // rarity row → slider → draw
  rows.forEach(row => {
    const handler = () => {
      const d = +row.dataset.dev;
      const mu = +cMean.value;
      const sd = +cSD.value;
      cScore.value = mu + sd * (d - 50) / 10;
      draw();
    };
    row.addEventListener('mouseenter', handler);
    row.addEventListener('touchstart', handler, { passive: true });
  });

  draw();

  const mo = new MutationObserver(draw);
  mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  window.addEventListener('resize', debouncedResize(draw));
}

/* ── Skewed distribution comparison (interactive) ── */
function initSkewDemo() {
  const canvas = $('skewCanvas');
  const cDev   = $('skewDev');
  const cSkew  = $('skewAmount');
  const vDev   = $('skewDevVal');
  const vSkew  = $('skewAmountVal');
  const vNorm  = $('skewNormPct');
  const vActual = $('skewActualPct');
  const vGap   = $('skewGap');
  if (!canvas) return;

  // skewed PDF: log-normal mapped to z-space, parameterized by skewness
  function skewPDF(z, skew) {
    if (skew < 0.05) return normPDF(z);
    const shift = 1.0 + skew * 1.5;
    const x = z + 3.5;
    if (x <= 0) return 0;
    const mu = Math.log(shift) + 0.3, sigma = 0.4 + skew * 0.35;
    return Math.exp(-0.5 * ((Math.log(x) - mu) / sigma) ** 2) / (x * sigma * Math.sqrt(2 * Math.PI));
  }

  // numerical integration of skewed PDF above z
  function skewUpperTail(z, skew) {
    const step = 0.01;
    let total = 0, above = 0;
    for (let v = -4; v <= 5; v += step) {
      const y = skewPDF(v, skew);
      total += y;
      if (v >= z) above += y;
    }
    return total > 0 ? above / total : 0;
  }

  function draw() {
    const dev  = +cDev.value;
    const skew = +cSkew.value;
    const z = (dev - 50) / 10;
    vDev.textContent  = dev;
    vSkew.textContent = skew.toFixed(1);

    const normalPct = (1 - normCDF(z)) * 100;
    const actualPct = skewUpperTail(z, skew) * 100;
    const gap = Math.abs(normalPct - actualPct);

    vNorm.textContent   = normalPct < 0.1 ? normalPct.toFixed(2) : normalPct.toFixed(1);
    vActual.textContent = actualPct < 0.1 ? actualPct.toFixed(2) : actualPct.toFixed(1);
    vGap.textContent    = gap < 0.1 ? gap.toFixed(2) : gap.toFixed(1);

    // color gap by severity
    const severity = Math.min(1, gap / 10);
    const gapEl = vGap.closest('.skew-gap');
    if (gapEl) {
      gapEl.style.borderColor = severity > 0.3
        ? `rgba(255,43,214,${0.3 + severity * 0.5})`
        : 'rgba(0,243,255,.15)';
    }

    const { ctx, w, h } = resizeCanvas(canvas);
    const tc = themeColors();
    ctx.clearRect(0, 0, w, h);
    drawGrid(ctx, w, h);

    const pad = { l: 40, r: 40, t: 32, b: 40 };
    const plotW = w - pad.l - pad.r;
    const gap2 = 24;
    const halfW = (plotW - gap2) / 2;
    const plotH = h - pad.t - pad.b;

    function drawPanel(offsetX, pdfFn, label, pct, maxY) {
      const toX = v => offsetX + (v + 4) / 8 * halfW;
      const toY = v => pad.t + plotH - v / maxY * plotH;

      // axis
      ctx.strokeStyle = tc.dim;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(offsetX, pad.t + plotH);
      ctx.lineTo(offsetX + halfW, pad.t + plotH);
      ctx.stroke();

      // shaded area above z
      const fillPts = [[toX(z), toY(0)]];
      for (let v = z; v <= 4; v += 0.03) {
        fillPts.push([toX(v), toY(pdfFn(v))]);
      }
      fillPts.push([toX(4), toY(0)]);
      neonFill(ctx, fillPts, tc.magenta, 0.3);

      // curve
      const pts = [];
      for (let v = -4; v <= 4; v += 0.03) {
        pts.push([toX(v), toY(pdfFn(v))]);
      }
      neonLine(ctx, pts, tc.cyan, 10, 2);

      // marker
      const sx = toX(z);
      ctx.save();
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = tc.yellow;
      ctx.lineWidth = 2;
      ctx.shadowBlur = tc.light ? 0 : 6;
      ctx.shadowColor = tc.yellow;
      ctx.beginPath();
      ctx.moveTo(sx, toY(pdfFn(z)));
      ctx.lineTo(sx, pad.t + plotH);
      ctx.stroke();
      ctx.restore();

      // title
      ctx.fillStyle = tc.text;
      ctx.font = 'bold 13px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(label, offsetX + halfW / 2, pad.t - 10);

      // percentage
      const pctText = pct < 0.1 ? pct.toFixed(2) + '%' : pct.toFixed(1) + '%';
      ctx.fillStyle = tc.magenta;
      ctx.font = 'bold 12px "Courier New", monospace';
      const pctX = Math.min(sx + 40, offsetX + halfW - 30);
      ctx.fillText(L('上位 ', 'Top ') + pctText, pctX, pad.t + 6);

      // deviation label
      ctx.fillStyle = tc.dim;
      ctx.font = '10px "Courier New", monospace';
      ctx.fillText(L('偏差値 ', 'Dev ') + dev, sx, pad.t + plotH + 14);
    }

    // find max Y for consistent scaling
    let maxNorm = 0.42;
    let maxSkew = 0;
    for (let v = -4; v <= 4; v += 0.05) {
      maxSkew = Math.max(maxSkew, skewPDF(v, skew));
    }
    const maxY = Math.max(maxNorm, maxSkew) * 1.08;

    drawPanel(pad.l, v => normPDF(v), L('正規分布（理想）', 'Normal (ideal)'), normalPct, maxY);
    drawPanel(pad.l + halfW + gap2, v => skewPDF(v, skew), L('歪んだ分布（現実）', 'Skewed (real)'), actualPct, maxY);
  }

  const schedDraw2=throttledDraw(draw);
  [cDev, cSkew].forEach(el => el.addEventListener('input', schedDraw2));
  draw();

  const mo = new MutationObserver(draw);
  mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  window.addEventListener('resize', debouncedResize(draw));
}

/* ── URL sync ── */
const SYNC_IDS = ['devScore','devMean','devSD','skewDev','skewAmount'];

function pushURL() {
  const params = new URLSearchParams();
  SYNC_IDS.forEach(id => {
    const el = $(id);
    if (el) params.set(id, el.value);
  });
  const url = location.pathname + '?' + params.toString() + location.hash;
  history.replaceState(null, '', url);
}

function restoreURL() {
  const params = new URLSearchParams(location.search);
  if ([...params.keys()].length === 0) return;
  const pending = [];
  params.forEach((v, k) => {
    const el = $(k);
    if (!el) return;
    el.value = v;
    pending.push(el);
  });
  setTimeout(() => {
    pending.forEach(el => {
      try { el.dispatchEvent(new Event('input', { bubbles: true })); } catch (_) {}
    });
    if (location.hash) {
      const target = document.querySelector(location.hash);
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    }
  }, 100);
}

/* ── URL sync on slider change ── */
function initURLSync() {
  SYNC_IDS.forEach(id => {
    const el = $(id);
    if (el) el.addEventListener('input', pushURL);
  });
}

/* ── FAQ accordion ── */
function initFAQ() {
  document.querySelectorAll('.faq-q').forEach(q => {
    q.addEventListener('click', () => {
      const item = q.closest('.faq-item');
      const wasOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(i => i.classList.remove('open'));
      if (!wasOpen) item.classList.add('open');
    });
  });
}

/* ── Boot ── */
document.addEventListener('DOMContentLoaded', () => {
  initQuiz();
  initSimulator();
  initSkewDemo();
  initShare();
  initFAQ();
  initURLSync();
  restoreURL();
});
