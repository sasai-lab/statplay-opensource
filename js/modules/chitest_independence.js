// StatPlay — module: CHI-SQUARED independence test (split from chitest.js)
import { $, resizeCanvas, drawGrid, themeColors, withAlpha, throttledDraw, chi2CDF, chi2CritVal, debouncedResize, isEn } from '../utils.js';
import { drawChi2Curve, updateInfo } from './chitest_common.js';

// chi2CritVal is imported directly; no local alias to avoid bundler-time
// duplicate-declaration collisions in test_site.mjs.

// No-op marker so test_site.mjs bundle() can include this file via main.js
// import without triggering a duplicate panel init. The real entry is via
// initChitest() in chitest.js, which calls ind(clickFx) once after DOM is ready.
export function __chitestIndLoaded(){}

export function ind(clickFx){
  const canvas = $('indCanvas');
  if(!canvas) return;
  const alphaSlider = $('indA');
  const btnReset = $('indReset');

  // Dots storage: dots[r*2+c] = array of {rx,ry} in 0..1 relative coords
  const dots = [[], [], [], []];
  const di = (r, c) => r * 2 + c;
  function count(r, c){ return dots[di(r, c)].length; }

  function randInCell(){ return { rx: 0.12 + Math.random() * 0.76, ry: 0.12 + Math.random() * 0.76 }; }

  // Seed initial data as random dots
  const initCounts = [[12, 5], [8, 15]];
  for(let r = 0; r < 2; r++) for(let c = 0; c < 2; c++)
    for(let i = 0; i < initCounts[r][c]; i++) dots[di(r, c)].push(randInCell());

  let hoverCell = null;
  let draggingAlpha = false;

  function tblLayout(w, h){
    const midX = w * 0.48;
    const tblX = 30, tblY = 38;
    const cellW = (midX - 70) / 2, cellH = (h - 120) / 2;
    return { midX, tblX, tblY, cellW, cellH };
  }

  function indXMax(){
    const O = [[count(0, 0), count(0, 1)], [count(1, 0), count(1, 1)]];
    const grand = O[0][0] + O[0][1] + O[1][0] + O[1][1];
    const df = 1;
    const alpha = alphaSlider ? parseFloat(alphaSlider.value) : 0.05;
    const critVal = chi2CritVal(alpha, df);
    let chiSq = 0;
    if(grand > 0){
      const rowTot = [O[0][0] + O[0][1], O[1][0] + O[1][1]];
      const colTot = [O[0][0] + O[1][0], O[0][1] + O[1][1]];
      for(let r = 0; r < 2; r++) for(let c = 0; c < 2; c++){
        const e = rowTot[r] * colTot[c] / grand;
        if(e > 0) chiSq += (O[r][c] - e) ** 2 / e;
      }
    }
    return Math.max(df * 3 + 2, critVal * 1.8, chiSq * 1.5, 8);
  }

  function indPxToAlpha(clientX){
    const rect = canvas.getBoundingClientRect();
    const px = (clientX - rect.left) * (canvas.width / rect.width);
    const { midX } = tblLayout(canvas.width, canvas.height);
    const rp = { x: midX + 10, w: canvas.width - midX - 20 };
    const xMax = indXMax();
    const xVal = (px - rp.x) / rp.w * xMax;
    if(xVal <= 0) return 0.50;
    const a = 1 - chi2CDF(xVal, 1);
    return Math.max(0.01, Math.min(0.50, a));
  }

  function isRightSide(clientX){
    const rect = canvas.getBoundingClientRect();
    const px = (clientX - rect.left) * (canvas.width / rect.width);
    const { midX } = tblLayout(canvas.width, canvas.height);
    return px >= midX;
  }

  function cellHitTest(clientX, clientY){
    const rect = canvas.getBoundingClientRect();
    const px = (clientX - rect.left) * (canvas.width / rect.width);
    const py = (clientY - rect.top) * (canvas.height / rect.height);
    const { midX, tblX, tblY, cellW, cellH } = tblLayout(canvas.width, canvas.height);
    if(px > midX) return null;
    const col = Math.floor((px - tblX - 20) / cellW);
    const row = Math.floor((py - tblY) / cellH);
    if(row < 0 || row > 1 || col < 0 || col > 1) return null;
    const rx = (px - (tblX + 20 + col * cellW)) / (cellW - 2);
    const ry = (py - (tblY + row * cellH)) / (cellH - 2);
    return { r: row, c: col, rx: Math.max(0.05, Math.min(0.95, rx)), ry: Math.max(0.05, Math.min(0.95, ry)) };
  }

  if(alphaSlider){
    const schedInd = throttledDraw(draw);
    alphaSlider.oninput = () => {
      const el = $('indAVal');
      if(el) el.textContent = parseFloat(alphaSlider.value).toFixed(2);
      schedInd();
    };
  }

  if(btnReset) btnReset.onclick = () => {
    for(let i = 0; i < 4; i++) dots[i].length = 0;
    draw();
  };

  canvas.style.touchAction = 'none';
  canvas.addEventListener('pointermove', e => {
    if(draggingAlpha){
      const a = indPxToAlpha(e.clientX);
      const step = parseFloat(alphaSlider.step) || 0.01;
      alphaSlider.value = Math.round(a / step) * step;
      alphaSlider.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }
    const right = isRightSide(e.clientX);
    const cell = cellHitTest(e.clientX, e.clientY);
    const prev = hoverCell;
    canvas.style.cursor = right ? 'ew-resize' : (cell ? 'pointer' : 'default');
    if((cell && prev && cell.r === prev.r && cell.c === prev.c) || (!cell && !prev)) return;
    hoverCell = cell;
    draw();
  });
  canvas.addEventListener('pointerleave', () => {
    if(hoverCell){ hoverCell = null; draw(); }
  });

  canvas.addEventListener('pointerdown', e => {
    if(isRightSide(e.clientX)){
      draggingAlpha = true;
      canvas.setPointerCapture(e.pointerId);
      const a = indPxToAlpha(e.clientX);
      const step = parseFloat(alphaSlider.step) || 0.01;
      alphaSlider.value = Math.round(a / step) * step;
      alphaSlider.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }
    const cell = cellHitTest(e.clientX, e.clientY);
    if(!cell) return;
    const delta = e.shiftKey ? -1 : 1;
    const idx = di(cell.r, cell.c);
    if(delta < 0){ if(dots[idx].length > 0) dots[idx].pop(); }
    else { dots[idx].push({ rx: cell.rx, ry: cell.ry }); }
    const tc = themeColors();
    const { tblX, tblY, cellW, cellH } = tblLayout(canvas.width, canvas.height);
    const cx = tblX + 20 + cell.c * cellW + cell.rx * (cellW - 2);
    const cy = tblY + cell.r * cellH + cell.ry * (cellH - 2);
    clickFx.spawn(cx, cy, delta, tc);
    draw(); animateIndFx();
  });
  function endIndDrag(e){ if(draggingAlpha){ draggingAlpha = false; try { canvas.releasePointerCapture(e.pointerId); } catch(_){} } }
  canvas.addEventListener('pointerup', endIndDrag);
  canvas.addEventListener('pointercancel', endIndDrag);

  let indFxRaf = 0;
  function animateIndFx(){
    cancelAnimationFrame(indFxRaf);
    indFxRaf = requestAnimationFrame(() => {
      if(clickFx.queue.length === 0) return;
      draw(); animateIndFx();
    });
  }

  function draw(){
    const { ctx, w, h } = resizeCanvas(canvas); drawGrid(ctx, w, h); const tc = themeColors();    const alpha = alphaSlider ? parseFloat(alphaSlider.value) : 0.05;

    const O = [[count(0, 0), count(0, 1)], [count(1, 0), count(1, 1)]];
    const grand = O[0][0] + O[0][1] + O[1][0] + O[1][1];
    const { midX, tblX, tblY, cellW, cellH } = tblLayout(w, h);

    ctx.fillStyle = tc.dim; ctx.font = '10px "Courier New"';
    ctx.fillText('n=' + grand, midX - 40, 16);

    ctx.fillStyle = tc.dim; ctx.font = '10px "Courier New"';
    const colLabels = isEn() ? ['Col 1', 'Col 2', 'Total'] : ['列1', '列2', '計'];
    const rowLabels = isEn() ? ['Row 1', 'Row 2', 'Total'] : ['行1', '行2', '計'];
    ctx.fillText(colLabels[0], tblX + 20 + cellW * 0.3, tblY - 6);
    ctx.fillText(colLabels[1], tblX + 20 + cellW * 1.3, tblY - 6);
    ctx.fillText(colLabels[2], tblX + 20 + cellW * 2.1, tblY - 6);
    ctx.fillText(rowLabels[0], tblX - 4, tblY + cellH * 0.55);
    ctx.fillText(rowLabels[1], tblX - 4, tblY + cellH * 1.55);
    ctx.fillText(rowLabels[2], tblX - 4, tblY + cellH * 2.3);

    const rowTot = [O[0][0] + O[0][1], O[1][0] + O[1][1]];
    const colTot = [O[0][0] + O[1][0], O[0][1] + O[1][1]];

    let E = [[0, 0], [0, 0]], chiSq = 0;
    const contribs = [[0, 0], [0, 0]];
    if(grand > 0){
      for(let r = 0; r < 2; r++) for(let c = 0; c < 2; c++){
        E[r][c] = rowTot[r] * colTot[c] / grand;
        if(E[r][c] > 0){
          const v = (O[r][c] - E[r][c]) ** 2 / E[r][c];
          contribs[r][c] = v; chiSq += v;
        }
      }
    }

    for(let r = 0; r < 2; r++) for(let c = 0; c < 2; c++){
      const x = tblX + 20 + c * cellW;
      const y = tblY + r * cellH;
      const isHover = hoverCell && hoverCell.r === r && hoverCell.c === c;

      let devAbs = 0, cellColor = tc.cyan;
      if(grand > 0 && E[r][c] > 0){
        const dev = (O[r][c] - E[r][c]) / E[r][c];
        devAbs = Math.min(Math.abs(dev), 1);
        cellColor = dev >= 0 ? tc.cyan : tc.magenta;
      }

      ctx.fillStyle = withAlpha(cellColor, isHover ? 0.15 : 0.04 + devAbs * 0.12);
      ctx.shadowBlur = tc.light ? 0 : (isHover ? 12 : devAbs * 10);
      ctx.shadowColor = cellColor;
      ctx.fillRect(x, y, cellW - 2, cellH - 2);
      ctx.shadowBlur = 0;

      ctx.strokeStyle = withAlpha(isHover ? tc.cyan : cellColor, isHover ? 0.8 : 0.25 + devAbs * 0.4);
      ctx.lineWidth = isHover ? 2 : 1;
      ctx.strokeRect(x, y, cellW - 2, cellH - 2);

      const cellDots = dots[di(r, c)];
      const dotR = Math.max(2.5, Math.min(5, 40 / Math.sqrt(Math.max(cellDots.length, 1))));
      const dotColor = r === 0 ? (c === 0 ? tc.cyan : tc.yellow) : (c === 0 ? tc.green : tc.orange);
      for(let d = 0; d < cellDots.length; d++){
        const dx = x + cellDots[d].rx * (cellW - 2);
        const dy = y + cellDots[d].ry * (cellH - 2);
        ctx.beginPath();
        ctx.arc(dx, dy, dotR, 0, Math.PI * 2);
        ctx.fillStyle = withAlpha(dotColor, 0.85);
        if(!tc.light){ ctx.shadowBlur = 4; ctx.shadowColor = dotColor; }
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      ctx.fillStyle = tc.text; ctx.font = 'bold 12px "Courier New"';
      ctx.fillText(O[r][c].toString(), x + 4, y + 14);

      if(isHover){
        ctx.fillStyle = tc.green; ctx.font = 'bold 12px "Courier New"';
        ctx.fillText('+1', x + cellW - 22, y + 14);
      }

      if(grand > 0 && E[r][c] > 0){
        ctx.fillStyle = tc.dim; ctx.font = '9px "Courier New"';
        ctx.fillText('E=' + E[r][c].toFixed(1), x + 4, y + cellH - 10);
        ctx.fillStyle = devAbs > 0.15 ? tc.magenta : tc.dim;
        ctx.fillText(contribs[r][c].toFixed(2), x + cellW - 34, y + cellH - 10);
      }
    }

    ctx.fillStyle = tc.dim; ctx.font = '11px "Courier New"';
    for(let r = 0; r < 2; r++) ctx.fillText(rowTot[r].toString(), tblX + 20 + cellW * 2.1, tblY + r * cellH + cellH * 0.45);
    for(let c = 0; c < 2; c++) ctx.fillText(colTot[c].toString(), tblX + 20 + c * cellW + cellW * 0.3, tblY + cellH * 2.3);
    ctx.fillText(grand.toString(), tblX + 20 + cellW * 2.1, tblY + cellH * 2.3);

    ctx.fillStyle = tc.dim; ctx.font = '10px "Courier New"';
    const hint = isEn() ? 'Click cell = +1 / Shift+Click = -1' : 'クリック = +1 / Shift+クリック = −1';
    ctx.fillText(hint, tblX, h - 8);

    const df = 1;
    if(grand > 0 && E[0][0] > 0 && E[0][1] > 0 && E[1][0] > 0 && E[1][1] > 0){
      const pval = 1 - chi2CDF(chiSq, df);
      const critVal = chi2CritVal(alpha, df);
      const reject = chiSq >= critVal;
      drawChi2Curve(ctx, w, h, tc, alpha, chiSq, df, critVal, pval, reject, midX, isEn);
      updateInfo(chiSq, df, pval, reject, alpha, isEn, 'ind');
      const elN = $('indN'); if(elN) elN.textContent = grand;
    } else {
      ctx.fillStyle = tc.dim; ctx.font = '12px "Courier New"';
      ctx.fillText(isEn() ? 'Click cells to start' : 'セルをクリックで開始', midX + 20, h / 2);
      updateInfo(0, df, 1, false, alpha, isEn, 'ind');
      const elN = $('indN'); if(elN) elN.textContent = grand;
    }

    clickFx.tickAndDraw(ctx, tc);
  }

  draw();
  window.addEventListener('resize', debouncedResize(draw));
}
