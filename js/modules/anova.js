// StatPlay — module: ANOVA (one-way analysis of variance)
import { $, TAU, rng_normal, lgamma, fPDF, resizeCanvas, drawGrid, neonLine, neonFill, themeColors, withAlpha, throttledDraw } from '../utils.js';

(function anova(){
  if(!document.getElementById('anovaCanvas')) return;
  const canvas=$('anovaCanvas');
  const slK=$('anovaK'),slEff=$('anovaEffect'),slW=$('anovaWithin'),slNk=$('anovaNk');
  const GROUP_COLORS_KEYS=['cyan','magenta','yellow','green','purple'];

  let data=[];  // array of arrays, one per group
  let stats={};

  // --- regularized incomplete beta (series approx) ---
  function lnBeta(a,b){return lgamma(a)+lgamma(b)-lgamma(a+b);}
  function regBetaI(x,a,b){
    // regularized incomplete beta I_x(a,b) via continued fraction (Lentz)
    if(x<=0) return 0;
    if(x>=1) return 1;
    // symmetry transform for convergence
    if(x>(a+1)/(a+b+2)) return 1-regBetaI(1-x,b,a);
    const lnPre=a*Math.log(x)+b*Math.log(1-x)-Math.log(a)-lnBeta(a,b);
    const pre=Math.exp(lnPre);
    // continued fraction
    let num=1,den=1-((a+b)*x)/(a+1);
    if(Math.abs(den)<1e-30) den=1e-30;
    den=1/den; let cf=den;
    for(let m=1;m<=200;m++){
      // even step
      let am=m*(b-m)*x/((a+2*m-1)*(a+2*m));
      den=1+am*den; if(Math.abs(den)<1e-30) den=1e-30; den=1/den;
      num=1+am/num; if(Math.abs(num)<1e-30) num=1e-30;
      cf*=den*num;
      // odd step
      am=-(a+m)*(a+b+m)*x/((a+2*m)*(a+2*m+1));
      den=1+am*den; if(Math.abs(den)<1e-30) den=1e-30; den=1/den;
      num=1+am/num; if(Math.abs(num)<1e-30) num=1e-30;
      cf*=den*num;
      if(Math.abs(den*num-1)<1e-10) break;
    }
    return pre*cf;
  }
  function fCDF(x,d1,d2){
    if(x<=0) return 0;
    return regBetaI(d1*x/(d1*x+d2), d1/2, d2/2);
  }
  function fCritical(alpha,d1,d2){
    // bisection for F critical value (right tail)
    let lo=0,hi=100;
    for(let i=0;i<80;i++){
      const m=(lo+hi)/2;
      if(1-fCDF(m,d1,d2)>alpha) lo=m; else hi=m;
    }
    return (lo+hi)/2;
  }

  // --- data generation ---
  function generate(){
    const k=parseInt(slK.value);
    const effect=parseFloat(slEff.value);
    const withinSD=parseFloat(slW.value);
    const nk=parseInt(slNk.value);
    data=[];
    // center group means around 0
    for(let i=0;i<k;i++){
      const gm=(i-(k-1)/2)*effect;
      const pts=[];
      for(let j=0;j<nk;j++) pts.push(gm+rng_normal(0,withinSD));
      data.push(pts);
    }
    compute();
    draw();
  }

  // --- ANOVA computation ---
  function compute(){
    const k=data.length;
    const nk=data[0].length;
    const N=k*nk;
    // group means
    const gMeans=data.map(g=>{let s=0;for(const x of g) s+=x; return s/g.length;});
    // grand mean
    let total=0; for(const g of data) for(const x of g) total+=x;
    const grandMean=total/N;
    // SSB, SSW
    let SSB=0, SSW=0;
    for(let i=0;i<k;i++){
      SSB+=nk*(gMeans[i]-grandMean)**2;
      for(const x of data[i]) SSW+=(x-gMeans[i])**2;
    }
    const dfB=k-1, dfW=N-k;
    const MSB=SSB/dfB, MSW=SSW/dfW;
    const F=MSB/MSW;
    const pval=1-fCDF(F,dfB,dfW);
    const Fcrit=fCritical(0.05,dfB,dfW);
    stats={k,nk,N,gMeans,grandMean,SSB,SSW,dfB,dfW,MSB,MSW,F,pval,Fcrit};
    // update info elements
    $('anovaF').textContent=F.toFixed(3);
    $('anovaDfB').textContent=dfB;
    $('anovaDfW').textContent=dfW;
    $('anovaP').textContent=pval<0.0001?pval.toExponential(2):pval.toFixed(4);
    $('anovaP').style.color=pval<0.05?'var(--magenta)':'var(--green)';
    $('anovaSSB').textContent=SSB.toFixed(2);
    $('anovaSSW').textContent=SSW.toFixed(2);
    const reject=pval<0.05;
    const en=window.__LANG==='en';
    $('anovaResult').textContent=en?(reject?'Reject H\u2080':'Fail to reject H\u2080'):(reject?'H\u2080 \u68C4\u5374':'H\u2080 \u63A1\u629E');
    $('anovaResult').style.color=reject?'var(--magenta)':'var(--green)';
  }

  // --- drawing ---
  function draw(){
    const {ctx,w,h}=resizeCanvas(canvas);drawGrid(ctx,w,h);const tc=themeColors();
    const colors=[tc.cyan,tc.magenta,tc.yellow,tc.green,tc.purple];
    const {k,nk,gMeans,grandMean,F,Fcrit,dfB,dfW}=stats;
    const splitX=Math.round(w*0.55);
    const pad=20;

    // ===== LEFT PANEL: strip chart =====
    // find data range
    let dMin=Infinity, dMax=-Infinity;
    for(const g of data) for(const x of g){if(x<dMin)dMin=x;if(x>dMax)dMax=x;}
    const range=dMax-dMin||1;
    dMin-=range*0.08; dMax+=range*0.08;
    const yToPx=v=>pad+(1-(v-dMin)/(dMax-dMin))*(h-2*pad);

    const colW=(splitX-pad*2)/k;
    for(let i=0;i<k;i++){
      const cx=pad+colW*(i+0.5);
      const color=colors[i%colors.length];
      // jittered dots
      ctx.fillStyle=withAlpha(color,.75);
      const dotR=Math.min(4,colW/6);
      for(const x of data[i]){
        const jitter=(Math.random()-0.5)*colW*0.5;
        const px=cx+jitter;
        const py=yToPx(x);
        ctx.beginPath();ctx.arc(px,py,dotR,0,TAU);ctx.fill();
      }
      // group mean line (bold)
      ctx.strokeStyle=color;ctx.lineWidth=tc.light?3:2.5;
      ctx.shadowBlur=tc.light?2:8;ctx.shadowColor=color;
      const mY=yToPx(gMeans[i]);
      ctx.beginPath();ctx.moveTo(cx-colW*0.35,mY);ctx.lineTo(cx+colW*0.35,mY);ctx.stroke();
      ctx.shadowBlur=0;
      // group label
      ctx.fillStyle=color;ctx.font='bold 11px "Courier New"';
      const label=(window.__LANG==='en'?'G':'群')+String(i+1);
      ctx.fillText(label,cx-ctx.measureText(label).width/2,h-4);
    }
    // grand mean dashed line
    ctx.strokeStyle=withAlpha(tc.yellow,.85);ctx.setLineDash([6,4]);ctx.lineWidth=tc.light?2:1.5;
    ctx.shadowBlur=tc.light?1:6;ctx.shadowColor=tc.yellow;
    const gmY=yToPx(grandMean);
    ctx.beginPath();ctx.moveTo(pad,gmY);ctx.lineTo(splitX-pad/2,gmY);ctx.stroke();
    ctx.shadowBlur=0;ctx.setLineDash([]);
    // grand mean label
    ctx.fillStyle=tc.yellow;ctx.font='10px "Courier New"';
    const gmLabel=(window.__LANG==='en'?'Grand ':'')+'M\u0304='+grandMean.toFixed(2);
    ctx.fillText(gmLabel,pad+2,gmY-5);
    // y-axis ticks
    ctx.fillStyle=tc.dim;ctx.font='10px "Courier New"';
    const nTicks=5;
    for(let t=0;t<=nTicks;t++){
      const v=dMin+(dMax-dMin)*t/nTicks;
      ctx.fillText(v.toFixed(1),2,yToPx(v)+3);
    }

    // separator line
    ctx.strokeStyle=withAlpha(tc.dim,.3);ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(splitX,0);ctx.lineTo(splitX,h);ctx.stroke();

    // ===== RIGHT PANEL: F distribution =====
    const rx=splitX+pad;
    const rw=w-splitX-pad*2;
    const rh=h-2*pad;
    // determine x range for F dist
    const fMax=Math.max(Fcrit*1.8, F*1.3, 6);
    const fXToPx=f=>rx+f/fMax*rw;
    // find peak of fPDF for scaling
    let peak=0;
    for(let f=0.01;f<=fMax;f+=0.05){const v=fPDF(f,dfB,dfW);if(v>peak)peak=v;}
    if(peak===0) peak=1;
    const fYToPx=v=>h-pad-v/peak*rh*0.9;

    // rejection region fill (right tail at Fcrit)
    const rejPts=[[fXToPx(Fcrit),h-pad]];
    for(let f=Fcrit;f<=fMax;f+=0.05) rejPts.push([fXToPx(f),fYToPx(fPDF(f,dfB,dfW))]);
    rejPts.push([fXToPx(fMax),h-pad]);
    neonFill(ctx,rejPts,tc.magenta,.35);

    // F curve
    const curve=[];
    for(let px=0;px<=rw;px+=1){
      const f=px/rw*fMax;
      if(f<=0) continue;
      curve.push([rx+px,fYToPx(fPDF(f,dfB,dfW))]);
    }
    neonLine(ctx,curve,tc.cyan,14,2.5);

    // critical value dashed line
    ctx.strokeStyle=withAlpha(tc.dim,.8);ctx.setLineDash([4,4]);ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(fXToPx(Fcrit),pad);ctx.lineTo(fXToPx(Fcrit),h-pad);ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle=tc.dim;ctx.font='10px "Courier New"';
    ctx.fillText('F\u209C='+Fcrit.toFixed(2),fXToPx(Fcrit)+3,pad+12);

    // observed F statistic (yellow vertical)
    ctx.strokeStyle=tc.yellow;ctx.lineWidth=tc.light?2.5:2;
    ctx.shadowBlur=tc.light?2:12;ctx.shadowColor=tc.yellow;
    const fPx=fXToPx(Math.min(F,fMax*0.98));
    ctx.beginPath();ctx.moveTo(fPx,pad);ctx.lineTo(fPx,h-pad);ctx.stroke();
    ctx.shadowBlur=0;
    ctx.fillStyle=tc.yellow;ctx.font='bold 11px "Courier New"';
    ctx.fillText('F='+F.toFixed(2),fPx+4,pad+26);

    // alpha label
    ctx.fillStyle=tc.magenta;ctx.font='10px "Courier New"';
    ctx.fillText('\u03B1=0.05',fXToPx(Fcrit)+3,pad+38);

    // x-axis ticks for F panel
    ctx.fillStyle=tc.dim;ctx.font='10px "Courier New"';
    const tickStep=fMax<=8?1:fMax<=20?2:5;
    for(let f=0;f<=fMax;f+=tickStep){
      ctx.fillText(f.toFixed(0),fXToPx(f)-4,h-4);
    }

    // panel titles
    ctx.fillStyle=withAlpha(tc.text,.7);ctx.font='11px "Courier New"';
    const leftTitle=window.__LANG==='en'?'Strip Chart':'ストリップチャート';
    ctx.fillText(leftTitle,pad,14);
    const rightTitle=window.__LANG==='en'?'F Distribution':'F 分布';
    ctx.fillText(rightTitle,rx,14);
  }

  // --- event bindings ---
  const schedGen=throttledDraw(generate);
  slK.oninput=()=>{if($('anovaKVal'))$('anovaKVal').textContent=slK.value;schedGen();};
  slEff.oninput=()=>{if($('anovaEffectVal'))$('anovaEffectVal').textContent=parseFloat(slEff.value).toFixed(1);schedGen();};
  slW.oninput=()=>{if($('anovaWithinVal'))$('anovaWithinVal').textContent=parseFloat(slW.value).toFixed(1);schedGen();};
  slNk.oninput=()=>{if($('anovaNkVal'))$('anovaNkVal').textContent=slNk.value;schedGen();};
  $('anovaGen').onclick=()=>{generate();window.__notifyDone&&window.__notifyDone('anovaGen');};

  // initial draw
  generate();
})();
