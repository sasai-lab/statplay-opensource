// StatPlay — module: CHI-SQUARED goodness-of-fit (split from chitest.js)
import { $, resizeCanvas, drawGrid, themeColors, withAlpha, throttledDraw, chi2CDF, chi2CritVal, debouncedResize, isEn } from '../utils.js';
import { drawChi2Curve, updateInfo } from './chitest_common.js';

// chi2CritVal is imported directly; no local alias to avoid bundler-time
// duplicate-declaration collisions in test_site.mjs.

// No-op marker so test_site.mjs bundle() can include this file via main.js
// import without triggering a duplicate panel init. The real entry is via
// initChitest() in chitest.js, which calls gof(clickFx) once after DOM is ready.
export function __chitestGofLoaded(){}

export function gof(clickFx){
  const canvas = $('chitestCanvas');
  if(!canvas) return;
  const alphaSlider = $('gofA');
  const btnReset = $('gofReset');
  const btnAuto = $('gofAutoRoll');
  const dieSelect = $('gofDie');
  const O = [4, 3, 2, 5, 3, 7];
  let autoTimer = null;
  let hoverIdx = -1;
  let draggingAlpha = false;

  const k = 6;
  function layout(w, h){
    const midX = w * 0.48;
    const pad = { l: 24, t: 32, b: 44 };
    const gw = midX - pad.l - 16, gh = h - pad.t - pad.b;
    const barW = gw / k;
    return { midX, pad, gw, gh, barW };
  }

  function gofXMax(){
    const N = O.reduce((a, b) => a + b, 0);
    const df = k - 1;
    const alpha = alphaSlider ? parseFloat(alphaSlider.value) : 0.05;
    const critVal = chi2CritVal(alpha, df);
    let chiSq = 0;
    if(N > 0){ const E = N / k; for(let i = 0; i < k; i++) chiSq += (O[i] - E) ** 2 / E; }
    return Math.max(df * 3 + 2, critVal * 1.8, chiSq * 1.5, 8);
  }

  function pxToAlpha(clientX){
    const rect = canvas.getBoundingClientRect();
    const px = (clientX - rect.left) * (canvas.width / rect.width);
    const { midX } = layout(canvas.width, canvas.height);
    const rp = { x: midX + 10, w: canvas.width - midX - 20 };
    const xMax = gofXMax();
    const xVal = (px - rp.x) / rp.w * xMax;
    if(xVal <= 0) return 0.50;
    const df = k - 1;
    const a = 1 - chi2CDF(xVal, df);
    return Math.max(0.01, Math.min(0.50, a));
  }

  function isRightSide(clientX){
    const rect = canvas.getBoundingClientRect();
    const px = (clientX - rect.left) * (canvas.width / rect.width);
    const { midX } = layout(canvas.width, canvas.height);
    return px >= midX;
  }

  if(alphaSlider){
    const schedGof = throttledDraw(draw);
    alphaSlider.oninput = () => {
      const el = $('gofAVal');
      if(el) el.textContent = parseFloat(alphaSlider.value).toFixed(2);
      schedGof();
    };
  }

  if(btnReset) btnReset.onclick = () => {
    for(let i = 0; i < 6; i++) O[i] = 0;
    draw();
  };

  if(btnAuto) btnAuto.onclick = () => {
    if(autoTimer){ clearInterval(autoTimer); autoTimer = null; btnAuto.innerHTML = isEn() ? '<span>▶ Auto-roll</span>' : '<span>▶ 自動試行</span>';
      return;
    }    btnAuto.innerHTML = isEn() ? '<span>■ Stop</span>' : '<span>■ 停止</span>';
    autoTimer = setInterval(() => {
      const loaded = dieSelect && dieSelect.value === 'loaded';
      const face = loaded ? rollLoaded() : Math.floor(Math.random() * 6);
      O[face]++;
      draw();
      const N = O.reduce((a, b) => a + b, 0);
      if(N >= 300){
        clearInterval(autoTimer); autoTimer = null;
        const isEn2 = isEn();
        btnAuto.innerHTML = isEn2 ? '<span>▶ Auto-roll</span>' : '<span>▶ 自動試行</span>';
      }
    }, 80);
  };

  function rollLoaded(){
    const r = Math.random();
    if(r < 0.3) return 5;
    return Math.floor(Math.random() * 5);
  }

  function hitTest(clientX /* , clientY */){
    const rect = canvas.getBoundingClientRect();
    const px = (clientX - rect.left) * (canvas.width / rect.width);
    const { midX, pad, barW } = layout(canvas.width, canvas.height);
    if(px > midX) return -1;
    const idx = Math.floor((px - pad.l) / barW);
    return (idx >= 0 && idx < 6) ? idx : -1;
  }

  canvas.style.touchAction = 'none';
  canvas.addEventListener('pointermove', e => {
    if(draggingAlpha){
      const a = pxToAlpha(e.clientX);
      const step = parseFloat(alphaSlider.step) || 0.01;
      alphaSlider.value = Math.round(a / step) * step;
      alphaSlider.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }
    const right = isRightSide(e.clientX);
    const idx = hitTest(e.clientX, e.clientY);
    canvas.style.cursor = right ? 'ew-resize' : (idx >= 0 ? 'pointer' : 'default');
    if(idx !== hoverIdx){ hoverIdx = idx; draw(); }
  });
  canvas.addEventListener('pointerleave', () => {
    if(hoverIdx >= 0){ hoverIdx = -1; draw(); }
  });

  canvas.addEventListener('pointerdown', e => {
    if(isRightSide(e.clientX)){
      draggingAlpha = true;
      canvas.setPointerCapture(e.pointerId);
      const a = pxToAlpha(e.clientX);
      const step = parseFloat(alphaSlider.step) || 0.01;
      alphaSlider.value = Math.round(a / step) * step;
      alphaSlider.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }
    const idx = hitTest(e.clientX, e.clientY);
    if(idx < 0) return;
    const delta = e.shiftKey ? -1 : 1;
    if(delta < 0){ O[idx] = Math.max(0, O[idx] - 1); } else { O[idx]++; }
    const tc = themeColors();
    const { pad, barW } = layout(canvas.width, canvas.height);
    const N = O.reduce((a, b) => a + b, 0);
    const maxVal = Math.max(...O, N > 0 ? N / k : 1) * 1.25;
    const gh2 = canvas.height - pad.t - 44;
    const oH = N > 0 ? O[idx] / maxVal * gh2 : 0;
    clickFx.spawn(pad.l + idx * barW + barW / 2, pad.t + gh2 - oH, delta, tc);
    draw(); animateFx();
  });
  function endDrag(e){ if(draggingAlpha){ draggingAlpha = false; try { canvas.releasePointerCapture(e.pointerId); } catch(_){} } }
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  let fxRaf = 0;
  function animateFx(){
    cancelAnimationFrame(fxRaf);
    fxRaf = requestAnimationFrame(() => {
      if(clickFx.queue.length === 0) return;
      draw(); animateFx();
    });
  }

  function draw(){
    const { ctx, w, h } = resizeCanvas(canvas); drawGrid(ctx, w, h); const tc = themeColors();    const alpha = alphaSlider ? parseFloat(alphaSlider.value) : 0.05;
    const N = O.reduce((a, b) => a + b, 0);
    const E = N > 0 ? N / k : 1;
    const df = k - 1;

    const { midX, pad, gh, barW } = layout(w, h);
    const maxVal = Math.max(...O, E) * 1.25;

    ctx.fillStyle = tc.dim; ctx.font = '10px "Courier New"';
    ctx.fillText('n=' + N, midX - 40, 16);

    const faceLabels = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

    for(let i = 0; i < k; i++){
      const gx = pad.l + i * barW;
      const oH = N > 0 ? O[i] / maxVal * gh : 0;
      const isHover = (i === hoverIdx);

      let devRatio = 0;
      if(N > 0){
        const contrib = (O[i] - E) ** 2 / E;
        const chiSq = computeChiSq();
        devRatio = chiSq > 0 ? Math.min(contrib / chiSq * k, 1) : 0;
      }

      if(isHover){
        ctx.strokeStyle = withAlpha(tc.cyan, .6);
        ctx.lineWidth = 2;
        ctx.strokeRect(gx + 2, pad.t, barW - 4, gh);
      }

      const oY = pad.t + gh - oH;
      ctx.fillStyle = withAlpha(tc.cyan, isHover ? 0.55 : 0.2 + devRatio * 0.5);
      ctx.shadowBlur = tc.light ? 1 : (isHover ? 14 : 4 + devRatio * 12);
      ctx.shadowColor = devRatio > 0.3 ? tc.magenta : tc.cyan;
      ctx.fillRect(gx + 4, oY, barW - 8, oH);
      ctx.shadowBlur = 0;

      if(N > 0){
        const eH = E / maxVal * gh;
        const eY = pad.t + gh - eH;
        ctx.strokeStyle = withAlpha(tc.dim, .7); ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.beginPath(); ctx.moveTo(gx + 2, eY); ctx.lineTo(gx + barW - 2, eY); ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.fillStyle = tc.cyan; ctx.font = 'bold 11px "Courier New"';
      ctx.fillText(O[i].toString(), gx + barW / 2 - 6, oY - 4);

      if(isHover){
        ctx.fillStyle = tc.green; ctx.font = 'bold 13px "Courier New"';
        ctx.fillText('+1', gx + barW / 2 - 8, pad.t + 12);
      }

      ctx.fillStyle = isHover ? tc.cyan : tc.text; ctx.font = (isHover ? 'bold ' : '') + '14px "Courier New"';
      ctx.fillText(faceLabels[i], gx + barW / 2 - 7, pad.t + gh + 18);
    }

    if(N > 0){
      ctx.fillStyle = tc.dim; ctx.font = '9px "Courier New"';
      ctx.strokeStyle = withAlpha(tc.dim, .7); ctx.setLineDash([4, 3]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pad.l, h - 8); ctx.lineTo(pad.l + 20, h - 8); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillText('E=' + E.toFixed(1), pad.l + 24, h - 4);
    }

    ctx.fillStyle = tc.dim; ctx.font = '10px "Courier New"';
    const hint = isEn() ? 'Click bar = +1 / Shift+Click = -1' : 'クリック = +1 / Shift+クリック = −1';
    ctx.fillText(hint, pad.l, h - 16);

    if(N > 0){
      const chiSq = computeChiSq();
      const pval = 1 - chi2CDF(chiSq, df);
      const critVal = chi2CritVal(alpha, df);
      const reject = chiSq >= critVal;
      drawChi2Curve(ctx, w, h, tc, alpha, chiSq, df, critVal, pval, reject, midX, isEn);
      updateInfo(chiSq, df, pval, reject, alpha, isEn, 'gof');
      const elN = $('gofN'); if(elN) elN.textContent = N;
    } else {
      ctx.fillStyle = tc.dim; ctx.font = '12px "Courier New"';
      ctx.fillText(isEn() ? 'Click bars to start' : 'バーをクリックで開始', midX + 20, h / 2);
      updateInfo(0, df, 1, false, alpha, isEn, 'gof');
      const elN = $('gofN'); if(elN) elN.textContent = '0';
    }

    clickFx.tickAndDraw(ctx, tc);
  }

  function computeChiSq(){
    const N = O.reduce((a, b) => a + b, 0);
    if(N === 0) return 0;
    const E = N / k;
    let chi = 0;
    for(let i = 0; i < k; i++) chi += (O[i] - E) ** 2 / E;
    return chi;
  }

  draw();
  window.addEventListener('resize', debouncedResize(draw));
}
