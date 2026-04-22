// StatPlay — module: TYPE I / II ERROR VISUALIZATION
import { $, normCDF, normPDF, zCritical, resizeCanvas, drawGrid, neonLine, neonFill, themeColors, withAlpha, throttledDraw } from '../utils.js';

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
    const xToPx = x => (x - lo) / (hi - lo) * w;
    const peak = normPDF(0);
    const yToPx = y => h - 28 - y / peak * (h - 70);
    const crit=zCritical(a*2); // right-tailed critical
    // beta region under H1, up to crit
    const critPx=Math.round(xToPx(crit));
    const betaPts=[[xToPx(lo),h]];
    for(let x=lo;x<=crit;x+=0.05) betaPts.push([xToPx(x),yToPx(normPDF(x,d,1))]);
    betaPts.push([critPx,yToPx(normPDF(crit,d,1))],[critPx,h]);
    neonFill(ctx,betaPts,tc.purple,.4);
    // alpha region under H0, beyond crit
    const aPts=[[critPx,h]];
    for(let x=crit;x<=hi;x+=0.05) aPts.push([xToPx(x),yToPx(normPDF(x))]);
    aPts.push([xToPx(hi),h]);
    neonFill(ctx,aPts,tc.magenta,.45);
    // power region under H1 beyond crit
    const pPts=[[critPx,h]];
    for(let x=crit;x<=hi;x+=0.05) pPts.push([xToPx(x),yToPx(normPDF(x,d,1))]);
    pPts.push([xToPx(hi),h]);
    neonFill(ctx,pPts,tc.green,.3);
    // H0 curve
    const h0=[];for(let px=0;px<=w;px++){h0.push([px,yToPx(normPDF(lo+px/w*(hi-lo)))]);}
    neonLine(ctx,h0,tc.cyan,14,2.5);
    // H1 curve
    const h1=[];for(let px=0;px<=w;px++){h1.push([px,yToPx(normPDF(lo+px/w*(hi-lo),d,1))]);}
    neonLine(ctx,h1,tc.purple,14,2.5);
    // critical line
    ctx.strokeStyle=withAlpha(tc.yellow,.8);ctx.setLineDash([4,4]);ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(xToPx(crit),12);ctx.lineTo(xToPx(crit),h-28);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle=tc.yellow;ctx.font='11px "Courier New"';ctx.fillText((window.__LANG==='en'?'Critical c=':'臨界値 c=')+crit.toFixed(2),xToPx(crit)+4,26);
    // labels
    ctx.fillStyle=tc.cyan;ctx.font='bold 12px "Courier New"';ctx.fillText('H₀',xToPx(0)-8,yToPx(peak)-6);
    ctx.fillStyle=tc.purple;ctx.fillText('H₁',xToPx(d)-8,yToPx(peak)-6);
    // axis
    ctx.fillStyle=tc.dim;ctx.font='11px "Courier New"';
    for(let x=lo;x<=hi;x+=2) ctx.fillText(x.toString(),xToPx(x)-4,h-12);
    // readouts
    const alpha=1-normCDF(crit);
    const beta=normCDF(crit,d,1);
    $('eAlpha').textContent=alpha.toFixed(3);
    $('eBeta').textContent=beta.toFixed(3);
    $('ePower').textContent=(1-beta).toFixed(3);
  }
  draw();
}
