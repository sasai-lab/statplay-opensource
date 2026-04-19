// StatPlay — module: DESCRIPTIVE STATISTICS
import { $, TAU, rng_normal, resizeCanvas, drawGrid, neonLine, neonFill, themeColors, withAlpha } from '../utils.js';

(function descriptive(){
  if(!document.getElementById('descCanvas')) return;
  const canvas = $('descCanvas');
  canvas.style.cursor = 'ew-resize';

  const slN    = $('descN');
  const slSkew = $('descSkew');
  const btnGen = $('descGen');

  let data = [];

  // --- Data generation ---
  function generate(){
    const n    = parseInt(slN.value, 10);
    const skew = parseFloat(slSkew.value);
    data = [];
    for(let i = 0; i < n; i++){
      let x;
      if(Math.abs(skew) < 0.05){
        // Symmetric normal
        x = rng_normal(50, 15);
      } else if(skew > 0){
        // Right-skewed via log-normal transformation
        const sigma = skew * 0.5;
        const z = rng_normal(0, 1);
        x = Math.exp(sigma * z);
        // Scale to roughly 0-100 range
        x = x / Math.exp(sigma * sigma / 2) * 50;
      } else {
        // Left-skewed: mirror of right-skewed
        const sigma = Math.abs(skew) * 0.5;
        const z = rng_normal(0, 1);
        x = Math.exp(sigma * z);
        x = x / Math.exp(sigma * sigma / 2) * 50;
        x = 100 - x;
      }
      data.push(x);
    }
    computeStats();
    draw();
  }

  // --- Statistics ---
  let stats = { mean:0, median:0, mode:0, variance:0, sd:0, q1:0, q3:0, iqr:0, min:0, max:0, wLo:0, wHi:0, outliers:[] };

  function quantile(sorted, p){
    const idx = p * (sorted.length - 1);
    const lo  = Math.floor(idx);
    const hi  = Math.ceil(idx);
    if(lo === hi) return sorted[lo];
    return sorted[lo] * (hi - idx) + sorted[hi] * (idx - lo);
  }

  function computeStats(){
    if(data.length === 0) return;
    const sorted = [...data].sort((a, b) => a - b);
    const n = sorted.length;

    // Mean
    const sum = sorted.reduce((a, b) => a + b, 0);
    stats.mean = sum / n;

    // Median
    stats.median = quantile(sorted, 0.5);

    // Mode (bin-based approximation)
    const MBINS = 20;
    const dMin = sorted[0], dMax = sorted[n - 1];
    const binW = (dMax - dMin) / MBINS || 1;
    const modeBins = new Array(MBINS).fill(0);
    for(let i = 0; i < n; i++){
      const bi = Math.min(MBINS - 1, Math.floor((sorted[i] - dMin) / binW));
      modeBins[bi]++;
    }
    let modeIdx = 0;
    for(let i = 1; i < MBINS; i++) if(modeBins[i] > modeBins[modeIdx]) modeIdx = i;
    stats.mode = dMin + (modeIdx + 0.5) * binW;

    // Variance & SD
    const sumSq = sorted.reduce((a, v) => a + (v - stats.mean) ** 2, 0);
    stats.variance = sumSq / n;
    stats.sd = Math.sqrt(stats.variance);

    // Quartiles
    stats.q1  = quantile(sorted, 0.25);
    stats.q3  = quantile(sorted, 0.75);
    stats.iqr = stats.q3 - stats.q1;

    // Whiskers (capped at actual data range)
    const wLoRaw = stats.q1 - 1.5 * stats.iqr;
    const wHiRaw = stats.q3 + 1.5 * stats.iqr;
    stats.wLo = sorted.find(v => v >= wLoRaw) ?? sorted[0];
    stats.wHi = [...sorted].reverse().find(v => v <= wHiRaw) ?? sorted[n - 1];

    // Outliers
    stats.outliers = sorted.filter(v => v < wLoRaw || v > wHiRaw);

    stats.min = sorted[0];
    stats.max = sorted[n - 1];

    // Update info elements
    const fmt = v => v.toFixed(2);
    const el = id => document.getElementById(id);
    if(el('descMean'))   el('descMean').textContent   = fmt(stats.mean);
    if(el('descMedian')) el('descMedian').textContent = fmt(stats.median);
    if(el('descMode'))   el('descMode').textContent   = fmt(stats.mode);
    if(el('descVar'))    el('descVar').textContent    = fmt(stats.variance);
    if(el('descSD'))     el('descSD').textContent     = fmt(stats.sd);
    if(el('descQ1'))     el('descQ1').textContent     = fmt(stats.q1);
    if(el('descQ3'))     el('descQ3').textContent     = fmt(stats.q3);
    if(el('descIQR'))    el('descIQR').textContent    = fmt(stats.iqr);
  }

  // --- Drawing ---
  function draw(){
    const { ctx, w, h } = resizeCanvas(canvas);
    ctx.clearRect(0, 0, w, h);
    drawGrid(ctx, w, h);
    const tc = themeColors();

    if(data.length === 0){
      ctx.fillStyle = tc.dim;
      ctx.font = '14px "Courier New", monospace';
      const hint = window.__LANG === 'en'
        ? 'Press Generate to create a sample'
        : '「生成」ボタンでサンプルを作成';
      ctx.fillText(hint, 20, h / 2);
      return;
    }

    const pad   = 28;
    const histH = (h - pad * 2) * 0.62;   // top 62% for histogram
    const boxY  = pad + histH + 14;        // gap then box plot
    const boxH  = (h - pad * 2) * 0.25;
    const gw    = w - pad * 2;

    // Data range for x-axis mapping
    const dMin = stats.min - stats.sd * 0.3;
    const dMax = stats.max + stats.sd * 0.3;
    const range = dMax - dMin || 1;
    const xMap = v => pad + ((v - dMin) / range) * gw;

    // ----- Histogram -----
    const BINS = Math.min(20, Math.max(10, Math.round(data.length / 3)));
    const binW = range / BINS;
    const bins = new Array(BINS).fill(0);
    for(let i = 0; i < data.length; i++){
      const bi = Math.min(BINS - 1, Math.max(0, Math.floor((data[i] - dMin) / binW)));
      bins[bi]++;
    }
    const maxBin = Math.max(...bins) || 1;

    ctx.fillStyle = withAlpha(tc.cyan, 0.28);
    ctx.strokeStyle = tc.cyan;
    ctx.lineWidth = 1;
    for(let i = 0; i < BINS; i++){
      const bx = pad + (i / BINS) * gw;
      const bw = gw / BINS;
      const bh = (bins[i] / maxBin) * histH;
      const by = pad + histH - bh;
      ctx.fillRect(bx, by, bw - 1, bh);
      ctx.strokeRect(bx, by, bw - 1, bh);
    }

    // Mean line (yellow dashed)
    const xMean = xMap(stats.mean);
    ctx.strokeStyle = tc.yellow;
    ctx.lineWidth = 1.8;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(xMean, pad);
    ctx.lineTo(xMean, pad + histH);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = tc.yellow;
    ctx.font = '11px "Courier New", monospace';
    const meanLabel = window.__LANG === 'en' ? 'Mean' : '平均';
    ctx.fillText(meanLabel, xMean + 4, pad + 12);

    // Median line (magenta dashed)
    const xMed = xMap(stats.median);
    ctx.strokeStyle = tc.magenta;
    ctx.lineWidth = 1.8;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(xMed, pad);
    ctx.lineTo(xMed, pad + histH);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = tc.magenta;
    const medLabel = window.__LANG === 'en' ? 'Median' : '中央値';
    ctx.fillText(medLabel, xMed + 4, pad + 26);

    // ----- Box plot -----
    const boxMid = boxY + boxH / 2;
    const boxTop = boxY + 4;
    const boxBot = boxY + boxH - 4;

    // Whisker lines
    const xWLo = xMap(stats.wLo);
    const xWHi = xMap(stats.wHi);
    ctx.strokeStyle = tc.green;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);

    // Horizontal whisker line
    ctx.beginPath();
    ctx.moveTo(xWLo, boxMid);
    ctx.lineTo(xWHi, boxMid);
    ctx.stroke();

    // Whisker end caps
    ctx.beginPath();
    ctx.moveTo(xWLo, boxTop + 4);
    ctx.lineTo(xWLo, boxBot - 4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(xWHi, boxTop + 4);
    ctx.lineTo(xWHi, boxBot - 4);
    ctx.stroke();

    // Box (Q1 to Q3)
    const xQ1 = xMap(stats.q1);
    const xQ3 = xMap(stats.q3);
    ctx.fillStyle = withAlpha(tc.green, 0.18);
    ctx.fillRect(xQ1, boxTop, xQ3 - xQ1, boxBot - boxTop);
    ctx.strokeStyle = tc.green;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(xQ1, boxTop, xQ3 - xQ1, boxBot - boxTop);

    // Median line in box
    ctx.strokeStyle = tc.magenta;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(xMed, boxTop);
    ctx.lineTo(xMed, boxBot);
    ctx.stroke();

    // Mean marker in box (small diamond)
    ctx.fillStyle = tc.yellow;
    ctx.beginPath();
    ctx.moveTo(xMean, boxMid - 5);
    ctx.lineTo(xMean + 4, boxMid);
    ctx.moveTo(xMean, boxMid + 5);
    ctx.lineTo(xMean - 4, boxMid);
    ctx.closePath();
    // Draw as diamond
    ctx.beginPath();
    ctx.moveTo(xMean, boxMid - 5);
    ctx.lineTo(xMean + 4, boxMid);
    ctx.lineTo(xMean, boxMid + 5);
    ctx.lineTo(xMean - 4, boxMid);
    ctx.closePath();
    ctx.fill();

    // Outliers
    if(stats.outliers.length > 0){
      ctx.fillStyle = withAlpha(tc.orange, 0.8);
      ctx.shadowBlur = tc.light ? 0 : 6;
      ctx.shadowColor = tc.orange;
      for(const v of stats.outliers){
        const ox = xMap(v);
        ctx.beginPath();
        ctx.arc(ox, boxMid, 3, 0, TAU);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    }

    // Q1, Q3 labels
    ctx.fillStyle = tc.green;
    ctx.font = '10px "Courier New", monospace';
    ctx.fillText('Q1', xQ1 - 4, boxBot + 12);
    ctx.fillText('Q3', xQ3 - 4, boxBot + 12);

    // Drag hint
    ctx.fillStyle = tc.dim;
    ctx.font = '10px "Courier New", monospace';
    const hintText = window.__LANG === 'en'
      ? 'Drag: N / Shift+Drag: Skew'
      : 'ドラッグ: N / Shift+ドラッグ: 歪度';
    ctx.fillText(hintText, pad + 4, h - 6);
  }

  // --- Value display sync ---
  const descNVal    = document.getElementById('descNVal');
  const descSkewVal = document.getElementById('descSkewVal');
  function syncDisplay(){
    if(descNVal)    descNVal.textContent    = slN.value;
    if(descSkewVal) descSkewVal.textContent = parseFloat(slSkew.value).toFixed(1);
  }

  // --- Event listeners ---
  slN.addEventListener('input', () => { syncDisplay(); generate(); });
  slSkew.addEventListener('input', () => { syncDisplay(); generate(); });
  btnGen.addEventListener('click', generate);
  window.addEventListener('resize', draw);

  // Initial generation
  generate();
})();
