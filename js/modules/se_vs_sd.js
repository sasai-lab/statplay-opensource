/*!
 * StatPlay — se_vs_sd column module
 * Copyright (c) 2026 Sasai Lab * Licensed under CC BY-NC 4.0.
 *
 * Standalone module for columns/se_vs_sd.html (and en/ counterpart).
 * Namespaced under window.__svs_* to avoid collision with other column modules.
 *
 * Interactive A: two-tier dot-plot + mean histogram, n slider drives both panels.
 *                Right column shows side-by-side SD / SE bar comparison.
 * Interactive B: parallel CI and test-statistic visuals sharing the same SE bar.
 */
import {
  $, rng_normal, normPDF,
  resizeCanvas, drawGrid, neonLine, neonFill,
  themeColors, withAlpha, throttledDraw, debouncedResize, isEn, makeAxisMap
} from '../utils.js';
import { initUrlParams } from './urlParams.js';
import { initShare } from './share.js';

// ─── Population constants (per design doc) ─────────────────────────────
// Heights of 30 students, μ=172cm, σ=6cm. σ slider is intentionally not
// exposed in the initial implementation — keeps the n→SE shrinking story
// uncluttered. Future iteration can add a σ knob without restructuring.
const MU = 172;
const SIGMA = 6;

const reduced = () => !!window.__REDUCED_MOTION ||
  (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);

// Returns true on screens narrow enough that a stacked dot-lane plot would
// be unreadable. Used by Interactive A to drop the per-sample dot lane
// while keeping the mean histogram (which is the actual SE story).
function isNarrow() {
  return window.innerWidth < 600;
}

// ──────────────────────────────────────────────────────────────────────
// Interactive A: two-tier sample-vs-mean canvas with SD/SE bars
// ──────────────────────────────────────────────────────────────────────
function initInteractiveA() {
  const canvasTier1 = $('seCanvasTier1');
  const canvasTier2 = $('seCanvasTier2');
  if (!canvasTier1 || !canvasTier2) return;

  const nSlider = $('seN');
  const nVal = $('seNVal');
  const oneBtn = $('seOneBtn');
  const manyBtn = $('seManyBtn');
  const clearBtn = $('seClearBtn');
  const sdReadout = $('seSdVal');
  const seReadout = $('seSeVal');
  const seFormulaEl = $('seSeFormula');
  if (!nSlider) return;

  // Bin layout: shared x-range so both panels read on the same axis.
  // Range covers ~μ ± 4σ so individual draws fit.
  const X_LO = MU - 4 * SIGMA;       // 148
  const X_HI = MU + 4 * SIGMA;       // 196
  const BINS_MEAN = 60;

  // State: latest sample (for the top dot lane) + accumulated mean histogram.
  const state = (window.__svs_a = window.__svs_a || {
    n: 30,
    latestSample: [],   // last n raw draws, used for the top dot lane
    latestMean: null,
    means: [],          // every accumulated sample mean (kept lean for stats)
    meanHist: new Array(BINS_MEAN).fill(0),
    drawCount: 0,
  });

  function clear() {
    state.latestSample = [];
    state.latestMean = null;
    state.means = [];
    state.meanHist = new Array(BINS_MEAN).fill(0);
    state.drawCount = 0;
  }

  function drawOnce() {
    const n = state.n;
    const draws = new Array(n);
    let s = 0;
    for (let i = 0; i < n; i++) {
      const x = rng_normal(MU, SIGMA);
      draws[i] = x;
      s += x;
    }
    state.latestSample = draws;
    const m = s / n;
    state.latestMean = m;
    state.means.push(m);
    const ix = Math.min(BINS_MEAN - 1, Math.max(0,
      Math.floor((m - X_LO) / (X_HI - X_LO) * BINS_MEAN)));
    state.meanHist[ix]++;
    state.drawCount++;
  }

  // Sample SD of one drawn batch (the top lane). For the readout we use the
  // most-recent sample's SD when available, falling back to the population σ.
  // This matches what "SD" means in everyday wording: a property of the data
  // you have in front of you, not of the imagined re-sampling distribution.
  function currentSD() {
    const xs = state.latestSample;
    if (!xs || xs.length < 2) return SIGMA;
    let sm = 0;
    for (const x of xs) sm += x;
    const mean = sm / xs.length;
    let sq = 0;
    for (const x of xs) sq += (x - mean) * (x - mean);
    return Math.sqrt(sq / (xs.length - 1));
  }

  function updateReadouts() {
    const n = state.n;
    const sd = currentSD();
    const se = SIGMA / Math.sqrt(n);  // theoretical SE based on population σ
    if (sdReadout) sdReadout.textContent = sd.toFixed(2);
    if (seReadout) seReadout.textContent = se.toFixed(2);
    if (seFormulaEl) {
      seFormulaEl.textContent =
        (isEn() ? 'SE = σ/√n = 6/√' : 'SE = σ/√n = 6/√') + n + ' ≈ ' + se.toFixed(2);
    }
    if (nVal) nVal.textContent = String(n);
  }

  const sched = throttledDraw(drawAll);

  function drawAll() {
    drawTier1();
    drawTier2();
    updateReadouts();
    updateRatioCaption();
  }

  // Draws a horizontal bar centered on μ that spans ±2 units, with internal
  // tick marks at -unit, 0, +unit so the reader can read off "1 unit width."
  // Used for SD (unit = σ) and SE (unit = σ/√n) so the bar's center aligns
  // vertically with the bell curve above.
  function drawCenteredBar(ctx, xToPx, baseY, unit, color, label, valueText, unitLabel) {
    const barH = 10;
    const x1 = xToPx(MU - 2 * unit);
    const x2 = xToPx(MU + 2 * unit);
    const barLen = Math.max(1, x2 - x1);
    ctx.fillStyle = withAlpha(color, .55);
    ctx.fillRect(x1, baseY, barLen, barH);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.strokeRect(x1 + 0.5, baseY + 0.5, barLen - 1, barH - 1);
    // Internal tick lines at -unit, 0, +unit so each segment reads as "1 unit."
    ctx.strokeStyle = withAlpha(color, .95);
    ctx.lineWidth = 1;
    for (const off of [-1, 0, 1]) {
      const xx = xToPx(MU + off * unit);
      ctx.beginPath();
      ctx.moveTo(xx, baseY - 3);
      ctx.lineTo(xx, baseY + barH + 3);
      ctx.stroke();
    }
    // Tick labels: -2unit, -unit, 0, +unit, +2unit.
    ctx.fillStyle = withAlpha(color, .85);
    ctx.font = '9px "Courier New"';
    const tickLabels = ['-2' + unitLabel, '-' + unitLabel, '0', '+' + unitLabel, '+2' + unitLabel];
    for (let i = 0; i < 5; i++) {
      const off = i - 2;
      const xx = xToPx(MU + off * unit);
      const lw = ctx.measureText(tickLabels[i]).width;
      ctx.fillText(tickLabels[i], xx - lw / 2, baseY + barH + 13);
    }
    // Center label below the ticks: "SD = 6.00 cm = 1σ" etc.
    ctx.fillStyle = color;
    ctx.font = 'bold 11px "Courier New"';
    const txt = label + ' = ' + valueText + ' = 1' + unitLabel;
    const tw = ctx.measureText(txt).width;
    ctx.fillText(txt, xToPx(MU) - tw / 2, baseY + barH + 27);
  }

  // TIER 1 — individual heights scatter + population PDF + SD bar at base.
  function drawTier1() {
    const { ctx, w, h } = resizeCanvas(canvasTier1);
    if (!ctx) return;
    drawGrid(ctx, w, h);
    const tc = themeColors();
    const en = isEn();

    // Bottom padding leaves room for SD bar (12px) + bar label (16px) + axis ticks (16px).
    const padT = 26, padB = 56, padL = 36, padR = 16;
    const innerW = w - padL - padR;
    const innerH = h - padT - padB;
    const axis = makeAxisMap({
      w, h, lo: X_LO, hi: X_HI, peak: 1,
      marginTop: padT, marginBottom: padB, marginLeft: padL, marginRight: padR,
    });
    const xToPx = axis.xToPx;
    const y0 = padT;
    const y1 = padT + innerH;

    ctx.strokeStyle = withAlpha(tc.cyan, .18);
    ctx.lineWidth = 1;
    ctx.strokeRect(padL + 0.5, y0 + 0.5, innerW - 1, innerH - 1);

    ctx.fillStyle = tc.magenta;
    ctx.font = 'bold 11px "Courier New","Segoe UI","Hiragino Sans",sans-serif';
    ctx.fillText(
      en ? 'TIER 1 — individual heights (n=' + state.n + ')'
         : 'TIER 1 — 個々の身長 (n=' + state.n + ')',
      padL + 4, y0 - 8);

    // Population pdf as a faint reference curve.
    const peakPop = normPDF(MU, MU, SIGMA);
    const refH = (innerH - 12) * 0.78;
    const refPts = [];
    for (let px = 0; px <= innerW; px += 2) {
      const x = X_LO + px / innerW * (X_HI - X_LO);
      const y = normPDF(x, MU, SIGMA) / peakPop * refH;
      refPts.push([padL + px, y1 - 4 - y]);
    }
    ctx.save();
    ctx.globalAlpha = .55;
    neonLine(ctx, refPts, withAlpha(tc.magenta, .55), 8, 1.5);
    ctx.restore();

    // Dots — deterministic jitter so they don't dance on redraw.
    ctx.fillStyle = withAlpha(tc.magenta, .65);
    const baseY = y1 - 8;
    const jitterAmp = Math.min(innerH * 0.45, 44);
    for (let i = 0; i < state.latestSample.length; i++) {
      const x = state.latestSample[i];
      const px = xToPx(x);
      if (px < padL || px > padL + innerW) continue;
      const jr = ((i * 9301 + 49297) % 233280) / 233280;
      const jy = baseY - jr * jitterAmp;
      ctx.beginPath();
      ctx.arc(px, jy, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }

    // μ marker.
    ctx.save();
    ctx.strokeStyle = withAlpha(tc.yellow, .55);
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(xToPx(MU), y0 + 4);
    ctx.lineTo(xToPx(MU), y1 - 2);
    ctx.stroke();
    ctx.restore();

    // SD bar — spans ±2σ, with internal ticks at -σ/0/+σ so "1σ width"
    // is readable. Center aligns vertically with the bell curve above.
    drawCenteredBar(
      ctx, xToPx, y1 + 10, SIGMA, tc.magenta,
      'SD', SIGMA.toFixed(2) + ' cm', 'σ');
  }

  // TIER 2 — accumulated sample-mean histogram + N(μ, σ²/n) curve + SE bar.
  function drawTier2() {
    const { ctx, w, h } = resizeCanvas(canvasTier2);
    if (!ctx) return;
    drawGrid(ctx, w, h);
    const tc = themeColors();
    const en = isEn();

    const padT = 26, padB = 56, padL = 36, padR = 16;
    const innerW = w - padL - padR;
    const innerH = h - padT - padB;
    const axis = makeAxisMap({
      w, h, lo: X_LO, hi: X_HI, peak: 1,
      marginTop: padT, marginBottom: padB, marginLeft: padL, marginRight: padR,
    });
    const xToPx = axis.xToPx;
    const my0 = padT;
    const my1 = padT + innerH;

    ctx.strokeStyle = withAlpha(tc.cyan, .18);
    ctx.lineWidth = 1;
    ctx.strokeRect(padL + 0.5, my0 + 0.5, innerW - 1, innerH - 1);

    ctx.fillStyle = tc.cyan;
    ctx.font = 'bold 11px "Courier New","Segoe UI","Hiragino Sans",sans-serif';
    ctx.fillText(
      en ? 'TIER 2 — sample means (' + state.drawCount + ' so far)'
         : 'TIER 2 — 標本平均 (' + state.drawCount + '回ぶん)',
      padL + 4, my0 - 8);

    const xs = Math.max(...state.meanHist, 1);
    const binW = innerW / BINS_MEAN;
    for (let i = 0; i < BINS_MEAN; i++) {
      const c = state.meanHist[i];
      if (c <= 0) continue;
      const hgt = c / xs * (innerH * 0.78);
      ctx.fillStyle = withAlpha(tc.cyan, .55);
      ctx.fillRect(padL + i * binW + 0.5, my1 - 4 - hgt, binW - 1, hgt);
    }

    const se = SIGMA / Math.sqrt(state.n);
    const peakMean = normPDF(MU, MU, se);
    const total = Math.max(state.drawCount, 1);
    const expectedPeakBin = peakMean * ((X_HI - X_LO) / BINS_MEAN) * total;
    const overlayScale = (xs * 0.78) / Math.max(xs, expectedPeakBin);
    const pts = [];
    for (let px = 0; px <= innerW; px += 2) {
      const x = X_LO + px / innerW * (X_HI - X_LO);
      const expected = normPDF(x, MU, se) * ((X_HI - X_LO) / BINS_MEAN) * total;
      const hgt = expected * overlayScale / xs * (innerH * 0.78);
      pts.push([padL + px, my1 - 4 - hgt]);
    }
    neonLine(ctx, pts, tc.cyan, 12, 2);

    // μ marker.
    ctx.save();
    ctx.strokeStyle = withAlpha(tc.yellow, .55);
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(xToPx(MU), my0 + 4);
    ctx.lineTo(xToPx(MU), my1 - 2);
    ctx.stroke();
    ctx.restore();

    // SE bar — spans ±2·SE with internal ticks at -SE/0/+SE. Same style as
    // SD bar above so the √n shrinkage of the unit is visible at a glance.
    drawCenteredBar(
      ctx, xToPx, my1 + 10, se, tc.cyan,
      'SE', se.toFixed(2) + ' cm', 'SE');
  }

  function updateRatioCaption() {
    const el = document.getElementById('seRatioCaption');
    if (!el) return;
    const ratio = Math.sqrt(state.n);
    el.textContent = 'SD / SE = √n ≈ ' + ratio.toFixed(2);
  }

  // ── Wire up controls ────────────────────────────────────────────────
  nSlider.addEventListener('input', () => {
    state.n = parseInt(nSlider.value, 10);
    // Reset accumulator when n changes — mixing different-n means in one
    // histogram would mislead the SE story.
    clear();
    drawOnce();
    sched();
  });

  oneBtn?.addEventListener('click', () => {
    drawOnce();
    sched();
  });

  manyBtn?.addEventListener('click', () => {
    if (reduced()) {
      for (let i = 0; i < 100; i++) drawOnce();
      sched();
      return;
    }
    let i = 0;
    function step() {
      const burst = 4;
      for (let k = 0; k < burst && i < 100; k++, i++) drawOnce();
      sched();
      if (i < 100) requestAnimationFrame(step);
    }
    step();
  });

  clearBtn?.addEventListener('click', () => {
    clear();
    drawOnce();
    sched();
  });

  window.addEventListener('themechange', sched);
  window.addEventListener('resize', debouncedResize(sched));

  // Initial render: draw one sample so the panels aren't empty.
  state.n = parseInt(nSlider.value, 10) || 30;
  if (state.drawCount === 0) drawOnce();
  drawAll();
}

// ──────────────────────────────────────────────────────────────────────
// Interactive B: parallel CI + test-statistic visuals sharing one SE bar
// ──────────────────────────────────────────────────────────────────────
function initInteractiveB() {
  const ciC = $('seCiCanvas');
  const tC = $('seTestCanvas');
  if (!ciC && !tC) return;

  const nSlider = $('seBN');
  const nVal = $('seBNVal');
  const xbarSlider = $('seBXbar');
  const xbarVal = $('seBXbarVal');
  const muSlider = $('seBMu');
  const muVal = $('seBMuVal');
  const seBar = $('seBSeVal');
  const ciTxt = $('seBCiTxt');
  const tTxt = $('seBTtxt');

  if (!nSlider) return;

  const state = (window.__svs_b = window.__svs_b || {
    n: 30, xbar: 173.5, mu0: 172,
  });

  const sched = throttledDraw(redraw);

  function redraw() {
    const n = state.n;
    const xbar = state.xbar;
    const mu0 = state.mu0;
    const se = SIGMA / Math.sqrt(n);

    if (nVal) nVal.textContent = String(n);
    if (xbarVal) xbarVal.textContent = xbar.toFixed(2);
    if (muVal) muVal.textContent = mu0.toFixed(2);
    if (seBar) seBar.textContent = 'SE = σ/√n ≈ ' + se.toFixed(2);

    drawCi(n, xbar, se);
    drawTest(n, xbar, mu0, se);

    if (ciTxt) {
      const lo = (xbar - 1.96 * se);
      const hi = (xbar + 1.96 * se);
      ciTxt.textContent =
        (isEn() ? '95% CI: [' : '95% CI: [') +
        lo.toFixed(2) + ', ' + hi.toFixed(2) + '] cm';
    }
    if (tTxt) {
      const z = (xbar - mu0) / Math.max(se, 1e-9);
      tTxt.textContent =
        (isEn() ? 'z = (x̄ − μ₀) / SE = ' : 'z = (x̄ − μ₀) / SE = ') +
        z.toFixed(2);
    }
  }

  function drawCi(n, xbar, se) {
    if (!ciC) return;
    const { ctx, w, h } = resizeCanvas(ciC);
    if (!ctx) return;
    drawGrid(ctx, w, h);
    const tc = themeColors();
    const en = isEn();

    // x-axis spans μ ± 4·SE — anchored on TRUE μ (172) so the CI's drift
    // versus the parameter is visible.
    const radius = Math.max(4 * se, 3);
    const lo = MU - radius;
    const hi = MU + radius;
    const padL = 28, padR = 18, padT = 30, padB = 14;
    const innerW = w - padL - padR;
    const innerH = h - padT - padB;
    // makeAxisMap supplies xToPx; y is custom-laid out per drawing element.
    const axis = makeAxisMap({
      w, h, lo, hi, peak: 1,
      marginTop: padT, marginBottom: padB, marginLeft: padL, marginRight: padR,
    });
    const xToPx = axis.xToPx;
    const baseY = padT + innerH * 0.78;

    // Title
    ctx.fillStyle = tc.cyan;
    ctx.font = 'bold 11px "Courier New","Segoe UI","Hiragino Sans",sans-serif';
    ctx.fillText(en ? '// CI : center ± 1.96 · SE' : '// 信頼区間 : 中心 ± 1.96 · SE',
      padL, padT - 12);

    // μ axis tick + label
    ctx.save();
    ctx.strokeStyle = withAlpha(tc.yellow, .5);
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(xToPx(MU), padT);
    ctx.lineTo(xToPx(MU), baseY + 14);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = tc.yellow;
    ctx.font = '10px "Courier New"';
    ctx.fillText('μ=' + MU, xToPx(MU) - 14, padT + 2);

    // Sampling distribution N(x̄, SE) faint background — the bell on which
    // the SE bar lives. (Drawn around xbar; spread by SE.)
    const peak = normPDF(xbar, xbar, se);
    const bellH = innerH * 0.62;
    const bellPts = [];
    for (let px = 0; px <= innerW; px += 2) {
      const x = lo + px / innerW * (hi - lo);
      const y = normPDF(x, xbar, se) / peak * bellH;
      bellPts.push([padL + px, baseY - y]);
    }
    ctx.save();
    ctx.globalAlpha = .55;
    neonLine(ctx, bellPts, withAlpha(tc.cyan, .55), 8, 1.5);
    ctx.restore();

    // CI band: ±1.96·SE around x̄
    const ciLo = xbar - 1.96 * se;
    const ciHi = xbar + 1.96 * se;
    const ciPts = [
      [xToPx(ciLo), baseY],
      [xToPx(ciLo), baseY - 22],
      [xToPx(ciHi), baseY - 22],
      [xToPx(ciHi), baseY],
    ];
    neonFill(ctx, ciPts, tc.cyan, .25);

    // SE whiskers (thick cyan): the shared SE quantity
    ctx.save();
    ctx.strokeStyle = tc.cyan;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(xToPx(xbar - se), baseY + 18);
    ctx.lineTo(xToPx(xbar + se), baseY + 18);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(xToPx(xbar - se), baseY + 12);
    ctx.lineTo(xToPx(xbar - se), baseY + 24);
    ctx.moveTo(xToPx(xbar + se), baseY + 12);
    ctx.lineTo(xToPx(xbar + se), baseY + 24);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = tc.cyan;
    ctx.font = '10px "Courier New"';
    ctx.fillText('SE', xToPx(xbar) - 8, baseY + 38);

    // x̄ marker (thick magenta vertical)
    ctx.save();
    ctx.strokeStyle = tc.magenta;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(xToPx(xbar), padT + 4);
    ctx.lineTo(xToPx(xbar), baseY + 4);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = tc.magenta;
    ctx.font = '10px "Courier New"';
    ctx.fillText('x̄=' + xbar.toFixed(2), xToPx(xbar) + 4, padT + 14);

    // baseline
    ctx.strokeStyle = withAlpha(tc.dim, .5);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL, baseY);
    ctx.lineTo(padL + innerW, baseY);
    ctx.stroke();

    // axis labels
    ctx.fillStyle = tc.dim;
    ctx.font = '10px "Courier New"';
    ctx.fillText(lo.toFixed(1), padL - 4, baseY + 14);
    ctx.fillText(hi.toFixed(1), padL + innerW - 24, baseY + 14);
  }

  function drawTest(n, xbar, mu0, se) {
    if (!tC) return;
    const { ctx, w, h } = resizeCanvas(tC);
    if (!ctx) return;
    drawGrid(ctx, w, h);
    const tc = themeColors();
    const en = isEn();

    const radius = Math.max(4 * se, 3);
    const lo = MU - radius;
    const hi = MU + radius;
    const padL = 28, padR = 18, padT = 30, padB = 14;
    const innerW = w - padL - padR;
    const innerH = h - padT - padB;
    const axis = makeAxisMap({
      w, h, lo, hi, peak: 1,
      marginTop: padT, marginBottom: padB, marginLeft: padL, marginRight: padR,
    });
    const xToPx = axis.xToPx;
    const baseY = padT + innerH * 0.78;

    // Title
    ctx.fillStyle = tc.cyan;
    ctx.font = 'bold 11px "Courier New","Segoe UI","Hiragino Sans",sans-serif';
    ctx.fillText(en ? '// Test : (x̄ − μ₀) / SE' : '// 検定 : (x̄ − μ₀) / SE',
      padL, padT - 12);

    // H₀ sampling distribution centered on μ₀ — the world the test lives in
    const peak = normPDF(mu0, mu0, se);
    const bellH = innerH * 0.62;
    const bellPts = [];
    for (let px = 0; px <= innerW; px += 2) {
      const x = lo + px / innerW * (hi - lo);
      const y = normPDF(x, mu0, se) / peak * bellH;
      bellPts.push([padL + px, baseY - y]);
    }
    ctx.save();
    ctx.globalAlpha = .8;
    neonLine(ctx, bellPts, tc.cyan, 10, 1.8);
    ctx.restore();

    // SE whiskers around μ₀ — the very same SE quantity, in the test's world
    ctx.save();
    ctx.strokeStyle = tc.cyan;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(xToPx(mu0 - se), baseY + 18);
    ctx.lineTo(xToPx(mu0 + se), baseY + 18);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(xToPx(mu0 - se), baseY + 12);
    ctx.lineTo(xToPx(mu0 - se), baseY + 24);
    ctx.moveTo(xToPx(mu0 + se), baseY + 12);
    ctx.lineTo(xToPx(mu0 + se), baseY + 24);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = tc.cyan;
    ctx.font = '10px "Courier New"';
    ctx.fillText('SE', xToPx(mu0) - 8, baseY + 38);

    // μ₀ marker
    ctx.save();
    ctx.strokeStyle = withAlpha(tc.yellow, .6);
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(xToPx(mu0), padT);
    ctx.lineTo(xToPx(mu0), baseY + 14);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = tc.yellow;
    ctx.font = '10px "Courier New"';
    ctx.fillText('μ₀=' + mu0.toFixed(2), xToPx(mu0) - 16, padT + 2);

    // x̄ marker + arrow showing the (x̄ − μ₀) gap measured in SE units
    const z = (xbar - mu0) / Math.max(se, 1e-9);
    ctx.save();
    ctx.strokeStyle = tc.magenta;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(xToPx(xbar), padT + 4);
    ctx.lineTo(xToPx(xbar), baseY + 4);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = tc.magenta;
    ctx.font = '10px "Courier New"';
    ctx.fillText('x̄=' + xbar.toFixed(2), xToPx(xbar) + 4, padT + 14);

    // gap arrow on a separate y-row
    const arrowY = baseY - 6;
    ctx.save();
    ctx.strokeStyle = tc.yellow;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(xToPx(mu0), arrowY);
    ctx.lineTo(xToPx(xbar), arrowY);
    ctx.stroke();
    // arrowhead
    const ahDir = xbar >= mu0 ? -1 : 1;
    ctx.beginPath();
    ctx.moveTo(xToPx(xbar), arrowY);
    ctx.lineTo(xToPx(xbar) + ahDir * 6, arrowY - 4);
    ctx.moveTo(xToPx(xbar), arrowY);
    ctx.lineTo(xToPx(xbar) + ahDir * 6, arrowY + 4);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = tc.yellow;
    ctx.font = '10px "Courier New"';
    const midX = (xToPx(mu0) + xToPx(xbar)) / 2;
    ctx.fillText(
      (en ? 'gap = ' : 'ズレ = ') + Math.abs(xbar - mu0).toFixed(2) +
        ' cm  (= ' + Math.abs(z).toFixed(2) + ' × SE)',
      Math.max(padL + 4, midX - 80), arrowY - 8);

    // baseline
    ctx.strokeStyle = withAlpha(tc.dim, .5);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL, baseY);
    ctx.lineTo(padL + innerW, baseY);
    ctx.stroke();
  }

  // Wire up
  nSlider.addEventListener('input', () => {
    state.n = parseInt(nSlider.value, 10);
    sched();
  });
  xbarSlider?.addEventListener('input', () => {
    state.xbar = parseFloat(xbarSlider.value);
    sched();
  });
  muSlider?.addEventListener('input', () => {
    state.mu0 = parseFloat(muSlider.value);
    sched();
  });
  window.addEventListener('themechange', sched);
  window.addEventListener('resize', debouncedResize(sched));
  redraw();
}

// ──────────────────────────────────────────────────────────────────────
// FAQ accordion
// ──────────────────────────────────────────────────────────────────────
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

// ──────────────────────────────────────────────────────────────────────
// Progress bar + scroll reveal (mirrors error_types.js)
// ──────────────────────────────────────────────────────────────────────
function initProgressBar() {
  const bar = document.getElementById('progressBar');
  if (!bar) return;
  window.addEventListener('scroll', () => {
    const dh = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = dh > 0 ? (window.scrollY / dh * 100) + '%' : '0%';
  }, { passive: true });
}

function initScrollReveal() {
  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('.col-section, .takeaway').forEach(el => el.classList.add('visible'));
    return;
  }
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.col-section, .takeaway').forEach(el => obs.observe(el));
}

function initHero() {
  const cinema = document.getElementById('seHero');
  if (!cinema) return;
  const heroBits = cinema.querySelectorAll('.hero-in-target');
  if (reduced()) {
    heroBits.forEach(el => el.classList.add('hero-in'));
    return;
  }
  const start = performance.now();
  const ticks = [
    { t: 600,  fn: () => heroBits.forEach((el, i) => setTimeout(() => el.classList.add('hero-in'), i * 220)) },
  ];
  function loop(ts) {
    const elapsed = ts - start;
    while (ticks.length && elapsed >= ticks[0].t) ticks.shift().fn();
    if (ticks.length) requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

function initHeroScroll() {
  const btn = document.getElementById('heroScroll');
  btn?.addEventListener('click', () => {
    const main = document.querySelector('main');
    if (main) main.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth' });
  });
}

// ──────────────────────────────────────────────────────────────────────
// Boot
// ──────────────────────────────────────────────────────────────────────
function boot() {
  // Guard: only run on the se_vs_sd column page.
  if (!document.getElementById('seHero') && !document.getElementById('seCanvasTier1')) return;
  initProgressBar();
  initScrollReveal();
  initHeroScroll();
  initHero();
  initInteractiveA();
  initInteractiveB();
  initFAQ();
  // Wire up download/URL-copy/X/native buttons. share.js attaches click
  // handlers to every .share-btn it finds on the page.
  initShare();
  // Restore slider state from ?seN=…&seBN=… so URL-copied links re-open in
  // the same configuration. Fires after interactives are wired up, so each
  // synthetic input event reaches its module's handler.
  initUrlParams();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
