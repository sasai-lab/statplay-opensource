// StatPlay - module: MORE DISTRIBUTIONS (binomial, Poisson, exponential)
import { $, TAU, resizeCanvas, drawGrid, neonLine, neonFill, normPDF, binomPMF, poissonPMF, expPDF, themeColors, withAlpha } from '../utils.js';

(function morep(){
  if(!document.getElementById('binomCanvas')) return;
  // -------------------- Binomial ------------------------------------------
  const binCanvas = $('binomCanvas');
  if(binCanvas){
    binCanvas.style.cursor = 'ew-resize';
    const slN = $('binomN'), slP = $('binomP');
    const vN = $('binomNVal'), vP = $('binomPVal');
    function draw(){
      const {ctx, w, h} = resizeCanvas(binCanvas);
      ctx.clearRect(0,0,w,h);
      drawGrid(ctx, w, h);const tc=themeColors();
      const n = parseInt(slN.value, 10);
      const p = parseFloat(slP.value);
      vN.textContent = n;
      vP.textContent = p.toFixed(2);
      // Compute all PMF values
      const ys = [];
      let maxY = 0;
      for(let k = 0; k <= n; k++){
        const v = binomPMF(n, k, p);
        ys.push(v); if(v > maxY) maxY = v;
      }
      if(maxY <= 0) maxY = 1;
      const pad = 28;
      const gw = w - pad*2, gh = h - pad*2;
      const barW = gw / (n + 1);
      ctx.fillStyle = withAlpha(tc.cyan,.28);
      ctx.strokeStyle = tc.cyan;
      ctx.lineWidth = 1;
      for(let k = 0; k <= n; k++){
        const bh = (ys[k] / maxY) * gh;
        const x = pad + k * barW + 1;
        const y = pad + gh - bh;
        ctx.fillRect(x, y, Math.max(1, barW - 2), bh);
        ctx.strokeRect(x, y, Math.max(1, barW - 2), bh);
      }
      // Mean marker
      const mu = n * p;
      ctx.strokeStyle = tc.magenta;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4,4]);
      ctx.beginPath();
      const xMu = pad + mu * barW + barW/2;
      ctx.moveTo(xMu, pad); ctx.lineTo(xMu, pad + gh);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = tc.magenta;
      ctx.font = '12px "Courier New", monospace';
      ctx.fillText('μ = np = ' + mu.toFixed(2), xMu + 6, pad + 14);
      ctx.fillStyle = tc.dim;
      ctx.font = '10px "Courier New", monospace';
      const hintBin = window.__LANG==='en'?'Drag: n / Shift+Drag: p':'ドラッグ: n / Shift+ドラッグ: p';
      ctx.fillText(hintBin, pad + 4, pad + gh - 4);
    }
    slN.addEventListener('input', draw);
    slP.addEventListener('input', draw);
    window.addEventListener('resize', draw);
    draw();
  }

  // -------------------- Poisson -------------------------------------------
  const poisCanvas = $('poissonCanvas');
  if(poisCanvas){
    poisCanvas.style.cursor = 'ew-resize';
    const slL = $('poisL'), vL = $('poisLVal');
    function draw(){
      const {ctx, w, h} = resizeCanvas(poisCanvas);
      ctx.clearRect(0,0,w,h);
      drawGrid(ctx, w, h);const tc=themeColors();
      const lam = parseFloat(slL.value);
      vL.textContent = lam.toFixed(1);
      const kMax = Math.max(10, Math.ceil(lam * 3));
      const ys = [];
      let maxY = 0;
      for(let k = 0; k <= kMax; k++){
        const v = poissonPMF(lam, k);
        ys.push(v); if(v > maxY) maxY = v;
      }
      if(maxY <= 0) maxY = 1;
      const pad = 28;
      const gw = w - pad*2, gh = h - pad*2;
      const barW = gw / (kMax + 1);
      ctx.fillStyle = withAlpha(tc.yellow,.28);
      ctx.strokeStyle = tc.yellow;
      ctx.lineWidth = 1;
      for(let k = 0; k <= kMax; k++){
        const bh = (ys[k] / maxY) * gh;
        const x = pad + k * barW + 1;
        const y = pad + gh - bh;
        ctx.fillRect(x, y, Math.max(1, barW - 2), bh);
        ctx.strokeRect(x, y, Math.max(1, barW - 2), bh);
      }
      // Overlay normal approximation when lambda is large
      if(lam >= 5){
        const sd = Math.sqrt(lam);
        const pts = [];
        for(let i = 0; i <= 120; i++){
          const x = (i / 120) * (kMax + 1);
          const y = normPDF(x, lam, sd);
          pts.push([pad + x * barW, pad + gh - (y / maxY) * gh]);
        }
        neonLine(ctx, pts, tc.cyan, 10, 1.5);
      }
      ctx.fillStyle = tc.yellow;
      ctx.font = '12px "Courier New", monospace';
      ctx.fillText('E[X] = Var[X] = λ = ' + lam.toFixed(2), pad + 4, pad + 14);
      ctx.fillStyle = tc.dim;
      ctx.font = '10px "Courier New", monospace';
      ctx.fillText(window.__LANG==='en'?'Drag to adjust λ':'ドラッグで λ を調整', pad + 4, pad + gh - 4);
    }
    slL.addEventListener('input', draw);
    window.addEventListener('resize', draw);
    draw();
  }

  // -------------------- Exponential ---------------------------------------
  const expCv = $('expCanvas');
  if(expCv){
    expCv.style.cursor = 'ew-resize';
    const slL = $('expL'), vL = $('expLVal');
    function draw(){
      const {ctx, w, h} = resizeCanvas(expCv);
      ctx.clearRect(0,0,w,h);
      drawGrid(ctx, w, h);const tc=themeColors();
      const lam = parseFloat(slL.value);
      vL.textContent = lam.toFixed(2);
      const pad = 28;
      const gw = w - pad*2, gh = h - pad*2;
      // x range: 0..5/lam so full decay visible
      const xMax = 5 / lam;
      const pts = [];
      let yMax = lam; // expPDF(0,lam) = lam
      for(let i = 0; i <= 200; i++){
        const x = (i / 200) * xMax;
        const y = expPDF(x, lam);
        pts.push([pad + (x / xMax) * gw, pad + gh - (y / yMax) * gh]);
      }
      const fillPts = [[pad, pad + gh], ...pts, [pad + gw, pad + gh]];
      neonFill(ctx, fillPts, tc.magenta, 0.22);
      neonLine(ctx, pts, tc.magenta, 12, 2);
      // Mean line at 1/lam
      const mean = 1 / lam;
      ctx.strokeStyle = tc.cyan;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4,4]);
      ctx.beginPath();
      const xm = pad + (mean / xMax) * gw;
      ctx.moveTo(xm, pad); ctx.lineTo(xm, pad + gh);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = tc.cyan;
      ctx.font = '12px "Courier New", monospace';
      ctx.fillText('E[X] = 1/λ = ' + mean.toFixed(2), xm + 6, pad + 14);
      ctx.fillStyle = tc.dim;
      ctx.font = '10px "Courier New", monospace';
      ctx.fillText(window.__LANG==='en'?'Drag to adjust λ':'ドラッグで λ を調整', pad + 4, pad + gh - 4);
    }
    slL.addEventListener('input', draw);
    window.addEventListener('resize', draw);
    draw();
  }
})();
