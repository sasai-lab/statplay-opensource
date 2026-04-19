// StatPlay — module: 5) HYPOTHESIS TEST
import { $, TAU, rng_normal, rng_exp, rng_uniform, rng_bimodal, erf, normCDF, normPDF, zCritical, lgamma, gamma, tPDF, chi2PDF, fPDF, resizeCanvas, drawGrid, neonLine, neonFill, themeColors, withAlpha} from '../utils.js';

(function htest(){
  if(!document.getElementById('testCanvas')) return;
  const canvas=$('testCanvas');
  const z=$('tZ'),a=$('tA'),type=$('tType');
  [z,a].forEach(s=>s.oninput=()=>{$('tZVal').textContent=parseFloat(z.value).toFixed(2);$('tAVal').textContent=parseFloat(a.value).toFixed(3);draw();});
  type.onchange=draw;
  function draw(){
    const {ctx,w,h}=resizeCanvas(canvas);drawGrid(ctx,w,h);const tc=themeColors();
    const zObs=parseFloat(z.value);const alpha=parseFloat(a.value);const t=type.value;
    const lo=-4.5,hi=4.5;const xToPx=x=>(x-lo)/(hi-lo)*w;
    const peak=normPDF(0);const yToPx=y=>h-20-y/peak*(h-60);
    // critical
    let crit;let rejection;
    if(t==='two'){crit=zCritical(alpha);rejection=[[-hi,-crit],[crit,hi]];}
    else if(t==='right'){crit=zCritical(alpha*2);rejection=[[crit,hi]];}
    else {crit=-zCritical(alpha*2);rejection=[[lo,crit]];}

    // rejection fills
    rejection.forEach(r=>{
      const pts=[[xToPx(r[0]),h]];
      for(let x=r[0];x<=r[1];x+=0.05) pts.push([xToPx(x),yToPx(normPDF(x))]);
      pts.push([xToPx(r[1]),h]);
      neonFill(ctx,pts,tc.magenta,.35);
    });

    // curve
    const curve=[];for(let px=0;px<=w;px+=1){const x=lo+px/w*(hi-lo);curve.push([px,yToPx(normPDF(x))]);}
    neonLine(ctx,curve,tc.cyan,14,2.5);

    // critical value vertical marker (yellow dashed)
    ctx.strokeStyle=withAlpha(tc.yellow,.8);ctx.setLineDash([4,4]);ctx.lineWidth=1.5;
    if(t==='two'){[-crit,crit].forEach(cv=>{ctx.beginPath();ctx.moveTo(xToPx(cv),12);ctx.lineTo(xToPx(cv),h-20);ctx.stroke();});}
    else{ctx.beginPath();ctx.moveTo(xToPx(crit),12);ctx.lineTo(xToPx(crit),h-20);ctx.stroke();}
    ctx.setLineDash([]);

    // z marker (observed)
    ctx.strokeStyle=tc.green;ctx.lineWidth=tc.light?2.5:2;ctx.shadowBlur=tc.light?2:14;ctx.shadowColor=tc.green;
    ctx.beginPath();ctx.moveTo(xToPx(zObs),10);ctx.lineTo(xToPx(zObs),h-20);ctx.stroke();ctx.shadowBlur=0;
    ctx.fillStyle=tc.green;ctx.font='bold 12px "Courier New"';ctx.fillText(`z = ${zObs.toFixed(2)}`,xToPx(zObs)+4,24);

    // p-value shading (orange, distinct from rejection region magenta)
    let pval;
    if(t==='two'){
      pval=2*(1-normCDF(Math.abs(zObs)));
      const az=Math.abs(zObs);
      [[-hi,-az],[az,hi]].forEach(r=>{
        const pp=[[xToPx(r[0]),h]];
        for(let x=r[0];x<=r[1];x+=0.05) pp.push([xToPx(x),yToPx(normPDF(x))]);
        pp.push([xToPx(r[1]),h]);
        neonFill(ctx,pp,tc.orange,.25);
      });
    } else if(t==='right'){
      pval=1-normCDF(zObs);
      const pp=[[xToPx(zObs),h]];
      for(let x=zObs;x<=hi;x+=0.05) pp.push([xToPx(x),yToPx(normPDF(x))]);
      pp.push([xToPx(hi),h]);
      neonFill(ctx,pp,tc.orange,.25);
    } else {
      pval=normCDF(zObs);
      const pp=[[xToPx(lo),h]];
      for(let x=lo;x<=zObs;x+=0.05) pp.push([xToPx(x),yToPx(normPDF(x))]);
      pp.push([xToPx(zObs),h]);
      neonFill(ctx,pp,tc.orange,.25);
    }

    // p-value label on canvas
    ctx.fillStyle=tc.orange;ctx.font='bold 11px "Courier New"';
    const pLabel='p = '+pval.toFixed(4);
    const pLabelX=t==='left'?xToPx(zObs)-ctx.measureText(pLabel).width-6:xToPx(zObs)+6;
    ctx.fillText(pLabel,pLabelX,40);

    // decision: does z fall in rejection region?
    let reject=false;
    if(t==='two') reject=Math.abs(zObs)>=crit;
    else if(t==='right') reject=zObs>=crit;
    else reject=zObs<=crit;
    $('tZstat').textContent=zObs.toFixed(3);
    $('tCrit').textContent=(t==='two'?'±':'')+Math.abs(crit).toFixed(3);
    $('tPval').textContent=pval.toFixed(4);
    $('tPval').style.color=pval<parseFloat(a.value)?'var(--magenta)':'var(--green)';
    $('tDecision').textContent=(window.__LANG==='en')?(reject?'Reject H₀':'Fail to reject H₀'):(reject?'H₀ 棄却':'H₀ 採択');
    $('tDecision').style.color=reject?'var(--magenta)':'var(--green)';

    // axis
    ctx.fillStyle=tc.dim;ctx.font='11px "Courier New"';
    for(let x=-4;x<=4;x+=1)ctx.fillText(x.toString(),xToPx(x)-4,h-6);
  }
  draw();
})();
