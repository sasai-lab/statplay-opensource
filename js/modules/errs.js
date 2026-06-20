// StatPlay — module: TYPE I / II ERROR VISUALIZATION (two-sided test)
import { $, normCDF, normPDF, zCritical, resizeCanvas, drawGrid, neonLine, neonFill, themeColors, withAlpha, throttledDraw, isEn, makeAxisMap } from '../utils.js';

export function initErrs(){
  if(!document.getElementById('errCanvas')) return;
  const canvas=$('errCanvas');
  const dS=$('eD'),aS=$('eA');
  const sched=throttledDraw(()=>draw());
  [dS,aS].forEach(s=>s.oninput=()=>{$('eDVal').textContent=parseFloat(dS.value).toFixed(1);$('eAVal').textContent=parseFloat(aS.value).toFixed(3);sched();});
  function draw(){
    const {ctx,w,h} = resizeCanvas(canvas);
    drawGrid(ctx,w,h);
    const tc = themeColors();
    const d = parseFloat(dS.value);
    const a = parseFloat(aS.value);
    const lo = -4, hi = 8;
    const peak = normPDF(0);
    const { xToPx, yToPx } = makeAxisMap({ w, h, lo, hi, peak, marginTop: 42, marginBottom: 28 });
    // Two-sided test: zCritical(a) returns z* such that P(|Z|>z*) = a.
    // So critical values are -crit (left) and +crit (right); rejection region = |Z|>crit.
    const crit = zCritical(a);
    const axisY = h - 28;
    const critPxR = Math.round(xToPx(crit));
    const critPxL = Math.round(xToPx(-crit));

    // β region: H₁ density between -crit and +crit (the "miss" zone)
    const betaPts = [[critPxL, axisY]];
    for(let x = -crit; x <= crit; x += 0.05) betaPts.push([xToPx(x), yToPx(normPDF(x, d, 1))]);
    betaPts.push([critPxR, yToPx(normPDF(crit, d, 1))], [critPxR, axisY]);
    neonFill(ctx, betaPts, tc.purple, .4);

    // α region (right tail): H₀ density beyond +crit
    const aPtsR = [[critPxR, axisY]];
    for(let x = crit; x <= hi; x += 0.05) aPtsR.push([xToPx(x), yToPx(normPDF(x))]);
    aPtsR.push([xToPx(hi), axisY]);
    neonFill(ctx, aPtsR, tc.magenta, .45);

    // α region (left tail): H₀ density beyond -crit
    const aPtsL = [[xToPx(lo), axisY]];
    for(let x = lo; x <= -crit; x += 0.05) aPtsL.push([xToPx(x), yToPx(normPDF(x))]);
    aPtsL.push([critPxL, axisY]);
    neonFill(ctx, aPtsL, tc.magenta, .45);

    // Power region (right): H₁ density beyond +crit (the bulk of power for δ ≥ 0)
    const pPtsR = [[critPxR, axisY]];
    for(let x = crit; x <= hi; x += 0.05) pPtsR.push([xToPx(x), yToPx(normPDF(x, d, 1))]);
    pPtsR.push([xToPx(hi), axisY]);
    neonFill(ctx, pPtsR, tc.green, .3);

    // Power region (left): H₁ density beyond -crit (small but nonzero, esp. at δ=0)
    const pPtsL = [[xToPx(lo), axisY]];
    for(let x = lo; x <= -crit; x += 0.05) pPtsL.push([xToPx(x), yToPx(normPDF(x, d, 1))]);
    pPtsL.push([critPxL, axisY]);
    neonFill(ctx, pPtsL, tc.green, .3);

    // Hatching for color-blind accessibility (over both power regions)
    const hatch = (pts) => {
      ctx.save();
      ctx.beginPath(); pts.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1])); ctx.closePath(); ctx.clip();
      ctx.strokeStyle = withAlpha(tc.green, .4); ctx.lineWidth = 1;
      for(let i = -h; i < w + h; i += 8){ ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + h, h); ctx.stroke(); }
      ctx.restore();
    };
    hatch(pPtsR); hatch(pPtsL);

    // H0 curve
    const h0=[];for(let px=0;px<=w;px++){h0.push([px,yToPx(normPDF(lo+px/w*(hi-lo)))]);}
    neonLine(ctx,h0,tc.cyan,14,2.5);
    // H1 curve (dashed for color-blind accessibility)
    const h1=[];for(let px=0;px<=w;px++){h1.push([px,yToPx(normPDF(lo+px/w*(hi-lo),d,1))]);}
    ctx.save();ctx.setLineDash([8,4]);
    neonLine(ctx,h1,tc.purple,14,2.5);
    ctx.setLineDash([]);ctx.restore();

    // Critical lines (both sides)
    ctx.strokeStyle=withAlpha(tc.yellow,.8);ctx.setLineDash([4,4]);ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(xToPx(crit),12);ctx.lineTo(xToPx(crit),h-28);ctx.stroke();
    ctx.beginPath();ctx.moveTo(xToPx(-crit),12);ctx.lineTo(xToPx(-crit),h-28);ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle=tc.yellow;ctx.font='12px "Courier New"';
    ctx.fillText('+'+crit.toFixed(2),xToPx(crit)+4,26);
    ctx.fillText('-'+crit.toFixed(2),xToPx(-crit)+4,26);

    // Labels — declare which "world" each curve represents.
    // This is the direct fix for the "where am I now?" confusion described
    // in the column draft (column_errors_draft.md §2 ねじれ1):
    // a viewer needs to see, at a glance, whether a region belongs to the
    // H₀-true world or the H₁-true world.
    const greekFont='bold 12px "Courier New","Segoe UI","Hiragino Sans",sans-serif';
    const h0Label = isEn() ? 'H₀: TRUE WORLD' : 'H₀: 真の世界';
    const h1Label = (isEn() ? 'H₁: TRUE WORLD (δ=' : 'H₁: 真の世界 (δ=') + d.toFixed(1) + ')';
    ctx.fillStyle=tc.cyan;ctx.font=greekFont;
    ctx.fillText(h0Label, xToPx(0)-8, yToPx(peak)-6);
    ctx.fillStyle=tc.purple;
    ctx.fillText(h1Label, xToPx(d)-8, yToPx(peak)-6);

    // axis
    ctx.fillStyle=tc.dim;ctx.font='10px "Courier New"';
    for(let x=lo;x<=hi;x+=2) ctx.fillText(x.toString(),xToPx(x)-4,h-12);

    // Readouts (two-sided)
    // α = P(|Z|>crit | H₀) = 2*(1-Φ(crit))
    // β = P(-crit ≤ Z ≤ crit | H₁) = Φ(crit-δ) - Φ(-crit-δ)
    // power = 1 - β
    const alpha = 2 * (1 - normCDF(crit));
    const beta  = normCDF(crit, d, 1) - normCDF(-crit, d, 1);
    $('eAlpha').textContent = alpha.toFixed(3);
    $('eCrit').textContent  = '±' + crit.toFixed(3);
    $('eBeta').textContent  = beta.toFixed(3);
    $('ePower').textContent = (1 - beta).toFixed(3);
  }
  draw();
}
