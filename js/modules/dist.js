// StatPlay — module: 6) DISTS
import { $, TAU, rng_normal, rng_exp, rng_uniform, rng_bimodal, erf, normCDF, normPDF, zCritical, lgamma, gamma, tPDF, chi2PDF, fPDF, resizeCanvas, drawGrid, neonLine, neonFill, themeColors, withAlpha, throttledDraw} from '../utils.js';

function drawDist(canvas,func,xmax,color){
  const {ctx,w,h}=resizeCanvas(canvas);drawGrid(ctx,w,h);const tc=themeColors();
  // sample peak
  let peak=0;for(let x=0;x<=xmax;x+=xmax/200){const y=func(x);if(y>peak)peak=y;}
  if(peak===0)peak=1;
  const pts=[];
  for(let px=0;px<=w;px+=1){const x=px/w*xmax;const y=func(x);pts.push([px,h-10-y/peak*(h-30)]);}
  neonLine(ctx,pts,color,14,2.5);
  // fill
  const fill=[[0,h],...pts,[w,h]];neonFill(ctx,fill,color,.18);
}
(function tdist(){
  if(!document.getElementById('tDistCanvas')) return;
  const dfS=$('tdDf');const sched=throttledDraw(()=>draw());dfS.oninput=()=>{$('tdVal').textContent=dfS.value;sched();};
  function draw(){
    const df=parseInt(dfS.value);
    const c=$('tDistCanvas');const {ctx,w,h}=resizeCanvas(c);drawGrid(ctx,w,h);const tc=themeColors();
    const isEn=window.__LANG==='en';
    const lo=-5,hi=5;const xToPx=x=>(x-lo)/(hi-lo)*w;
    // include N(0,1) overlay in peak so sharp t curves don't clip the reference (and vice versa)
    let peak=Math.max(tPDF(0,df), normPDF(0));const yToPx=y=>h-22-y/peak*(h-42);
    // baseline
    ctx.strokeStyle=withAlpha(tc.cyan,.3);ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(0,h-22);ctx.lineTo(w,h-22);ctx.stroke();
    // axis ticks
    ctx.fillStyle=tc.dim;ctx.font='10px "Courier New"';
    for(let x=-4;x<=4;x+=2){ctx.fillText(String(x),xToPx(x)-4,h-8);}
    // normal reference
    const nPts=[];for(let px=0;px<=w;px++){const x=lo+px/w*(hi-lo);nPts.push([px,yToPx(normPDF(x))]);}
    neonLine(ctx,nPts,tc.purple,8,1.5);
    // t
    const tPts=[];for(let px=0;px<=w;px++){const x=lo+px/w*(hi-lo);tPts.push([px,yToPx(tPDF(x,df))]);}
    neonLine(ctx,tPts,tc.cyan,14,2.5);
    // legend + gap annotation
    ctx.fillStyle=tc.cyan;ctx.font='10px "Courier New"';
    ctx.fillText('─ t  (df='+df+')',8,14);
    ctx.fillStyle=tc.purple;
    ctx.fillText('─ N(0,1)',8,28);
    ctx.fillStyle=tc.yellow;
    const conv = df>=30 ? (isEn?' ≈ N(0,1)':' ≈ N(0,1)') : (isEn?' fatter tails':' 裾が重い');
    ctx.fillText(conv, 80, 14);
  }
  draw();
})();
(function chi(){
  if(!document.getElementById('chiCanvas')) return;
  const dfS=$('chiDf');const sched=throttledDraw(()=>draw());dfS.oninput=()=>{$('chiVal').textContent=dfS.value;sched();};
  function draw(){
    const df=parseInt(dfS.value);
    const c=$('chiCanvas');const {ctx,w,h}=resizeCanvas(c);drawGrid(ctx,w,h);const tc=themeColors();
    const isEn=window.__LANG==='en';
    const xmax=Math.max(15, df*2.5);
    const xToPx=x=>x/xmax*w;
    // find peak
    let peak=0;
    // χ² own peak
    for(let x=0.02;x<=xmax;x+=xmax/300){const y=chi2PDF(x,df);if(y>peak)peak=y;}
    // include N(k,2k) reference peak so the overlay never clips
    {const nSd=Math.sqrt(2*df);const nPk=1/(nSd*Math.sqrt(2*Math.PI));if(nPk>peak)peak=nPk;}
    if(peak===0)peak=1;
    const yToPx=y=>h-22-y/peak*(h-42);
    // baseline
    ctx.strokeStyle=withAlpha(tc.cyan,.3);ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(0,h-22);ctx.lineTo(w,h-22);ctx.stroke();
    // curve
    const pts=[];for(let px=0;px<=w;px++){const x=px/w*xmax;pts.push([px,yToPx(chi2PDF(x,df))]);}
    const fill=[[0,h],...pts,[w,h]];neonFill(ctx,fill,tc.magenta,.18);
    neonLine(ctx,pts,tc.magenta,14,2.5);
    // mean = df marker
    const meanX=xToPx(df);
    ctx.strokeStyle=withAlpha(tc.yellow,.75);ctx.setLineDash([3,3]);ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(meanX,10);ctx.lineTo(meanX,h-22);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle=tc.yellow;ctx.font='10px "Courier New"';
    ctx.fillText((isEn?'mean = k = ':'平均 = k = ')+df, meanX+4, 14);
    // mode = max(0, df-2)
    if(df>2){
      const modeX=xToPx(df-2);
      ctx.strokeStyle=withAlpha(tc.cyan,.55);ctx.setLineDash([2,3]);
      ctx.beginPath();ctx.moveTo(modeX,10);ctx.lineTo(modeX,h-22);ctx.stroke();ctx.setLineDash([]);
      ctx.fillStyle=tc.cyan;
      ctx.fillText((isEn?'mode = k−2':'最頻値 k−2'), modeX+4, 28);
    }
    // N(0,1) reference — shifted to mean=k, var=2k (so χ² approaches it as k→∞)
    const nMean=df, nVar=2*df, nSd=Math.sqrt(nVar);
    const nPts=[];for(let px=0;px<=w;px++){const x=px/w*xmax;const z=(x-nMean)/nSd;const y=Math.exp(-0.5*z*z)/(nSd*Math.sqrt(2*Math.PI));nPts.push([px,yToPx(y)]);}
    ctx.save();ctx.setLineDash([6,4]);
    neonLine(ctx,nPts,tc.purple,8,1.6);
    ctx.restore();
    // axis ticks
    ctx.fillStyle=tc.dim;ctx.font='10px "Courier New"';
    for(let t=0;t<=xmax;t+=Math.ceil(xmax/6)){ctx.fillText(String(t),xToPx(t)-4,h-8);}
    ctx.fillStyle=tc.magenta;ctx.fillText('χ²  (df='+df+')',8,14);
    ctx.fillStyle=tc.purple;ctx.fillText('┄ N(k, 2k)',8,28);
    ctx.fillStyle=tc.yellow;const conv=df>=20?(isEn?' ≈ normal':' ≈ 正規に近い'):(isEn?' right-skewed':' 右に歪む');ctx.fillText(conv,100,14);
  }
  draw();
})();
(function fdist(){
  if(!document.getElementById('fCanvas')) return;
  const sched=throttledDraw(()=>draw());[$('fDf1'),$('fDf2')].forEach(s=>s.oninput=()=>{$('fDf1Val').textContent=$('fDf1').value;$('fDf2Val').textContent=$('fDf2').value;sched();});
  function draw(){
    const d1=parseInt($('fDf1').value),d2=parseInt($('fDf2').value);
    const c=$('fCanvas');const {ctx,w,h}=resizeCanvas(c);drawGrid(ctx,w,h);const tc=themeColors();
    const isEn=window.__LANG==='en';
    const xmax=4;const xToPx=x=>x/xmax*w;
    let peak=0;
    for(let x=0.01;x<=xmax;x+=xmax/300){const y=fPDF(x,d1,d2);if(y>peak)peak=y;}
    // include the dashed normal approx peak so it isn't chopped
    if(d2>4){
      const nMean=d2/(d2-2);
      const nVar=(2*d2*d2*(d1+d2-2))/(d1*(d2-2)*(d2-2)*(d2-4));
      const nSd=Math.sqrt(nVar);
      const nPk=1/(nSd*Math.sqrt(2*Math.PI));
      if(nPk>peak) peak=nPk;
    }
    if(peak===0)peak=1;
    const yToPx=y=>h-22-y/peak*(h-42);
    ctx.strokeStyle=withAlpha(tc.cyan,.3);ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(0,h-22);ctx.lineTo(w,h-22);ctx.stroke();
    const pts=[];for(let px=0;px<=w;px++){const x=px/w*xmax;pts.push([px,yToPx(fPDF(x,d1,d2))]);}
    const fill=[[0,h],...pts,[w,h]];neonFill(ctx,fill,tc.yellow,.18);
    neonLine(ctx,pts,tc.yellow,14,2.5);
    // mean = d2/(d2-2) when d2>2
    if(d2>2){
      const mean=d2/(d2-2);
      const mX=xToPx(Math.min(mean,xmax));
      ctx.strokeStyle=withAlpha(tc.cyan,.7);ctx.setLineDash([3,3]);ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(mX,10);ctx.lineTo(mX,h-22);ctx.stroke();ctx.setLineDash([]);
      ctx.fillStyle=tc.cyan;ctx.font='10px "Courier New"';
      ctx.fillText((isEn?'mean = ':'平均 = ')+mean.toFixed(2), mX+4, 14);
    }
    // F=1 guide
    const oneX=xToPx(1);
    ctx.strokeStyle=withAlpha(tc.magenta,.5);ctx.setLineDash([2,3]);
    ctx.beginPath();ctx.moveTo(oneX,10);ctx.lineTo(oneX,h-22);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle=tc.magenta;ctx.font='10px "Courier New"';
    ctx.fillText('F=1', oneX+4, 28);
    // Normal reference using F's theoretical mean/var (approaches normal only when both df large)
    if(d2>4){
      const nMean=d2/(d2-2);
      const nVar=(2*d2*d2*(d1+d2-2))/(d1*(d2-2)*(d2-2)*(d2-4));
      const nSd=Math.sqrt(nVar);
      const nPts=[];for(let px=0;px<=w;px++){const x=px/w*xmax;const z=(x-nMean)/nSd;const y=Math.exp(-0.5*z*z)/(nSd*Math.sqrt(2*Math.PI));nPts.push([px,yToPx(y)]);}
      ctx.save();ctx.setLineDash([6,4]);
      neonLine(ctx,nPts,tc.purple,8,1.6);
      ctx.restore();
    }
    // axis ticks
    ctx.fillStyle=tc.dim;ctx.font='10px "Courier New"';
    for(let t=0;t<=xmax;t+=1){ctx.fillText(t.toFixed(0),xToPx(t)-4,h-8);}
    ctx.fillStyle=tc.yellow;ctx.fillText('F  ('+d1+', '+d2+')',8,14);
    ctx.fillStyle=tc.purple;ctx.fillText('┄ 近似正規 / normal approx',8,42);
    ctx.fillStyle=tc.yellow;const fconv=(d1>=20&&d2>=20)?(isEn?' ≈ normal':' ≈ 正規に近い'):(isEn?' right-skewed':' 右に歪む');ctx.fillText(fconv,100,14);
  }
  draw();
})();
