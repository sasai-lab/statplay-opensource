// StatPlay — module: 2) NORMAL
import { $, TAU, rng_normal, rng_exp, rng_uniform, rng_bimodal, erf, normCDF, normPDF, zCritical, lgamma, gamma, tPDF, chi2PDF, fPDF, resizeCanvas, drawGrid, neonLine, neonFill, themeColors, withAlpha, throttledDraw} from '../utils.js';

(function normal(){
  if(!document.getElementById('normalCanvas')) return;
  const canvas=$('normalCanvas');
  const ids=['nMu','nSd','nA','nB'];
  const sched=throttledDraw(()=>draw());
  ids.forEach(id=>{const el=$(id);el.oninput=()=>{$(id+'Val').textContent=(id==='nMu'||id==='nSd'||id==='nA'||id==='nB')?parseFloat(el.value).toFixed(1):el.value;sched();};});
  function draw(){
    const {ctx,w,h}=resizeCanvas(canvas);drawGrid(ctx,w,h);const tc=themeColors();
    const mu=parseFloat($('nMu').value),sd=parseFloat($('nSd').value);
    const a=parseFloat($('nA').value),b=parseFloat($('nB').value);
    const lo=-6,hi=6;const xToPx=x=>(x-lo)/(hi-lo)*w;const pxToX=p=>lo+p/w*(hi-lo);
    const peak=normPDF(mu,mu,sd);const yToPx=y=>h-20-y/peak*(h-60);
    // axis
    ctx.strokeStyle=withAlpha(tc.cyan,.35);ctx.beginPath();ctx.moveTo(0,h-20);ctx.lineTo(w,h-20);ctx.stroke();
    // labels
    ctx.fillStyle=tc.dim;ctx.font='11px "Courier New"';
    for(let x=-6;x<=6;x+=2){ctx.fillText(x.toString(),xToPx(x)-4,h-6);}

    // fill region [a,b]
    const pts=[];pts.push([xToPx(Math.min(a,b)),h]);
    for(let px=xToPx(Math.min(a,b));px<=xToPx(Math.max(a,b));px+=1){
      const x=pxToX(px);pts.push([px,yToPx(normPDF(x,mu,sd))]);
    }
    pts.push([xToPx(Math.max(a,b)),h]);
    neonFill(ctx,pts,tc.magenta,.35);

    // curve
    const curve=[];for(let px=0;px<=w;px+=1){curve.push([px,yToPx(normPDF(pxToX(px),mu,sd))]);}
    neonLine(ctx,curve,tc.cyan,14,2.5);

    // mean line
    ctx.strokeStyle=withAlpha(tc.yellow,.7);ctx.setLineDash([4,4]);
    ctx.beginPath();ctx.moveTo(xToPx(mu),20);ctx.lineTo(xToPx(mu),h-20);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle=tc.yellow;ctx.fillText('μ',xToPx(mu)+4,30);

    // ±1σ ±2σ markers
    [1,2].forEach(k=>{
      [mu-k*sd,mu+k*sd].forEach(x=>{
        ctx.strokeStyle=withAlpha(tc.purple,.6-k*.15);ctx.setLineDash([2,4]);
        ctx.beginPath();ctx.moveTo(xToPx(x),yToPx(normPDF(x,mu,sd)));ctx.lineTo(xToPx(x),h-20);ctx.stroke();ctx.setLineDash([]);
      });
    });

    // ±1σ ±2σ labels
    ctx.fillStyle=withAlpha(tc.purple,.7);ctx.font='10px "Courier New"';
    [1,2].forEach(k=>{
      const xr=mu+k*sd;if(xr<hi-0.5) ctx.fillText(`+${k}σ`,xToPx(xr)+2,h-24);
      const xl=mu-k*sd;if(xl>lo+0.5) ctx.fillText(`−${k}σ`,xToPx(xl)-20,h-24);
    });

    // prob
    const lo2=Math.min(a,b),hi2=Math.max(a,b);
    const p=normCDF(hi2,mu,sd)-normCDF(lo2,mu,sd);
    $('nProb').textContent=p.toFixed(4);
    // annotation: probability on shaded region
    const pctLabel=(p*100).toFixed(1)+'%';
    const midAB=(lo2+hi2)/2;
    ctx.fillStyle=tc.magenta;ctx.font='bold 14px "Courier New"';ctx.globalAlpha=.9;
    ctx.fillText(pctLabel,xToPx(midAB)-ctx.measureText(pctLabel).width/2,Math.min(yToPx(normPDF(midAB,mu,sd))+25,h-30));
    ctx.globalAlpha=1;
    $('nZa').textContent=((a-mu)/sd).toFixed(3);
    $('nZb').textContent=((b-mu)/sd).toFixed(3);

    // title
    ctx.fillStyle=tc.cyan;ctx.font='bold 13px "Courier New"';
    ctx.fillText(`N(μ=${mu.toFixed(1)}, σ=${sd.toFixed(1)})   P[${lo2.toFixed(1)} ≤ X ≤ ${hi2.toFixed(1)}] = ${p.toFixed(4)}`,10,20);
  }
  draw();
})();
