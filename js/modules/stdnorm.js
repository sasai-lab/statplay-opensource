// StatPlay — module: 0) STANDARD NORMAL — intro
import { $, TAU, rng_normal, rng_exp, rng_uniform, rng_bimodal, erf, normCDF, normPDF, zCritical, lgamma, gamma, tPDF, chi2PDF, fPDF, resizeCanvas, drawGrid, neonLine, neonFill, themeColors, withAlpha, throttledDraw} from '../utils.js';

(function stdnorm(){
  if(!document.getElementById('snCanvas')) return;
  // ---- panel A: 68-95-99.7
  const kS=$('snK'),cvA=$('snCanvas');
  const schedA=throttledDraw(drawA);
  kS.oninput=()=>{$('snKVal').textContent=parseFloat(kS.value).toFixed(1);schedA();};
  function drawA(){
    const {ctx,w,h}=resizeCanvas(cvA);drawGrid(ctx,w,h);const tc=themeColors();
    const k=parseFloat(kS.value);
    const lo=-4,hi=4;const xToPx=x=>(x-lo)/(hi-lo)*w;
    const peak=normPDF(0);const yToPx=y=>h-22-y/peak*(h-60);
    // fill inside ±k — snap boundary pixels to eliminate seams
    const kPxL=Math.round(xToPx(-k)),kPxR=Math.round(xToPx(k));
    const pts=[[kPxL,h]];
    for(let x=-k;x<=k;x+=0.04) pts.push([xToPx(x),yToPx(normPDF(x))]);
    pts.push([kPxR,yToPx(normPDF(k))],[kPxR,h]);
    neonFill(ctx,pts,tc.cyan,.35);
    // tails — start/end at exact same snapped pixel as central fill
    {
      const psL=[[0,h]];
      for(let x=-4;x<=-k;x+=0.04) psL.push([xToPx(x),yToPx(normPDF(x))]);
      psL.push([kPxL,yToPx(normPDF(-k))],[kPxL,h]);
      neonFill(ctx,psL,tc.magenta,.35);
      const psR=[[kPxR,h],[kPxR,yToPx(normPDF(k))]];
      for(let x=k;x<=4;x+=0.04) psR.push([xToPx(x),yToPx(normPDF(x))]);
      psR.push([w,yToPx(normPDF(4))],[w,h]);
      neonFill(ctx,psR,tc.magenta,.35);
    }
    // curve
    const curve=[];for(let px=0;px<=w;px++){curve.push([px,yToPx(normPDF(lo+px/w*(hi-lo)))]);}
    neonLine(ctx,curve,tc.cyan,14,2.5);
    // axis
    ctx.strokeStyle=withAlpha(tc.cyan,.35);ctx.beginPath();ctx.moveTo(0,h-22);ctx.lineTo(w,h-22);ctx.stroke();
    ctx.fillStyle=tc.dim;ctx.font='11px "Courier New"';
    for(let x=-3;x<=3;x++)ctx.fillText(x.toString(),xToPx(x)-4,h-6);
    // ±k markers
    ctx.strokeStyle=withAlpha(tc.yellow,.8);ctx.setLineDash([4,4]);ctx.lineWidth=1.5;
    [-k,k].forEach(xv=>{ctx.beginPath();ctx.moveTo(xToPx(xv),12);ctx.lineTo(xToPx(xv),h-22);ctx.stroke();});
    ctx.setLineDash([]);
    ctx.fillStyle=tc.yellow;ctx.font='bold 12px "Courier New"';
    ctx.fillText(`+${k.toFixed(1)}σ`,xToPx(k)+4,26);
    ctx.fillText(`−${k.toFixed(1)}σ`,xToPx(-k)-40,26);
    // title
    ctx.fillStyle=tc.cyan;ctx.font='bold 13px "Courier New"';
    ctx.fillText(window.__LANG==='en'?'N(0,1)  Standard Normal':'N(0,1)  標準正規分布',10,18);
    // compute
    const inside=normCDF(k)-normCDF(-k);
    const left=normCDF(k);
    $('snInside').textContent=(inside*100).toFixed(2)+'%';
    $('snLeft').textContent=(left*100).toFixed(2)+'%';
    $('snOutside').textContent=((1-inside)*100).toFixed(2)+'%';
  }
  drawA();

  // ---- panel B: standardization morph
  const muS=$('snMu'),sdS=$('snSd'),tS=$('snT'),cvB=$('snMorphCanvas');
  const schedB=throttledDraw(()=>drawB());
  [muS,sdS].forEach(s=>s.oninput=()=>{
    $('snMuVal').textContent=parseFloat(muS.value).toFixed(1);
    $('snSdVal').textContent=parseFloat(sdS.value).toFixed(1);
    $('snOrig').textContent=`N(${(+muS.value).toFixed(1)}, ${(+sdS.value).toFixed(1)}²)`;
    schedB();
  });
  tS.oninput=()=>{$('snTVal').textContent=tS.value;schedB();};
  let animBTimer=null;
  $('snAnim').onclick=()=>{
    if(animBTimer) return;
    tS.value=0;$('snTVal').textContent='0';
    const start=performance.now();
    (function step(now){
      const elapsed=now-start;const prog=Math.min(1,elapsed/2000);
      const t=Math.round(prog*100);
      tS.value=t;$('snTVal').textContent=t;
      drawB();
      if(prog<1) animBTimer=requestAnimationFrame(step); else animBTimer=null;
    })(start);
  };
  // Expose a cancel hook so user interaction (drag on morph canvas) can
  // stop the "▶ 標準化する" RAF loop — otherwise the animation keeps
  // overwriting tS.value each frame and the drag looks dead.
  cvB.__cancelMorphAnim=()=>{
    if(animBTimer){cancelAnimationFrame(animBTimer);animBTimer=null;}
  };
  cvB.style.cursor='ew-resize';
  function drawB(){
    const {ctx,w,h}=resizeCanvas(cvB);drawGrid(ctx,w,h);const tc=themeColors();
    const mu=parseFloat(muS.value);const sd=parseFloat(sdS.value);
    const tt=parseFloat(tS.value)/100; // 0 = 元, 1 = 標準化
    // blend params
    const bMu=mu*(1-tt);const bSd=sd*(1-tt)+1*tt;
    const lo=-5,hi=5;const xToPx=x=>(x-lo)/(hi-lo)*w;
    const peak=Math.max(normPDF(bMu,bMu,bSd),normPDF(0));
    const yToPx=y=>h-22-y/peak*(h-60);
    // ghost: target N(0,1)
    const ghost=[];for(let px=0;px<=w;px++){ghost.push([px,yToPx(normPDF(lo+px/w*(hi-lo)))]);}
    ctx.globalAlpha=.4;neonLine(ctx,ghost,tc.magenta,10,1.5);ctx.globalAlpha=1;
    // original / blended
    const cur=[];for(let px=0;px<=w;px++){cur.push([px,yToPx(normPDF(lo+px/w*(hi-lo),bMu,bSd))]);}
    const color=tt>.9?tc.magenta:tc.cyan;
    neonLine(ctx,cur,color,14,2.5);
    // mean lines
    ctx.strokeStyle=withAlpha(tc.yellow,.7);ctx.setLineDash([4,4]);
    ctx.beginPath();ctx.moveTo(xToPx(bMu),12);ctx.lineTo(xToPx(bMu),h-22);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle=tc.yellow;ctx.font='bold 12px "Courier New"';
    ctx.fillText(`μ=${bMu.toFixed(2)}`,xToPx(bMu)+4,26);
    // axis
    ctx.strokeStyle=withAlpha(tc.cyan,.35);ctx.beginPath();ctx.moveTo(0,h-22);ctx.lineTo(w,h-22);ctx.stroke();
    ctx.fillStyle=tc.dim;ctx.font='11px "Courier New"';
    for(let x=-5;x<=5;x++)ctx.fillText(x.toString(),xToPx(x)-4,h-6);
    // title
    ctx.fillStyle=color;ctx.font='bold 13px "Courier New"';
    const t100=Math.round(tt*100);
    ctx.fillText((window.__LANG==='en'?`Standardization progress: ${t100}%  →  N(${bMu.toFixed(2)}, ${bSd.toFixed(2)}²)`:`標準化進度: ${t100}%  →  N(${bMu.toFixed(2)}, ${bSd.toFixed(2)}²)`),10,18);
    $('snNewMu').textContent=bMu.toFixed(3);
    $('snNewSd').textContent=bSd.toFixed(3);
  }
  drawB();
})();
