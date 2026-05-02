// StatPlay — module: ANOVA (one-way analysis of variance)
import { $, TAU, rng_normal, lgamma, fPDF, resizeCanvas, drawGrid, neonLine, neonFill, themeColors, withAlpha, throttledDraw } from '../utils.js';

export function initAnova(){
  initAnovaMain();
  initAnovaSim();
}

// =====================================================================
// Section 02–04: Main ANOVA visualization (strip chart + F dist + table)
// =====================================================================
function initAnovaMain(){
  if(!document.getElementById('anovaCanvas')) return;
  const canvas=$('anovaCanvas');
  const slEff=$('anovaEffect'),slW=$('anovaWithin'),slNk=$('anovaNk');
  let data=[];
  let stats={};
  let dotJitters=[];
  let dotOrder=[];
  const K=3;

  // --- regularized incomplete beta (continued fraction, Lentz) ---
  function lnBeta(a,b){return lgamma(a)+lgamma(b)-lgamma(a+b);}
  function regBetaI(x,a,b){
    if(x<=0) return 0;
    if(x>=1) return 1;
    if(x>(a+1)/(a+b+2)) return 1-regBetaI(1-x,b,a);
    const lnPre=a*Math.log(x)+b*Math.log(1-x)-Math.log(a)-lnBeta(a,b);
    const pre=Math.exp(lnPre);
    let num=1,den=1-((a+b)*x)/(a+1);
    if(Math.abs(den)<1e-30) den=1e-30;
    den=1/den; let cf=den;
    for(let m=1;m<=200;m++){
      let am=m*(b-m)*x/((a+2*m-1)*(a+2*m));
      den=1+am*den; if(Math.abs(den)<1e-30) den=1e-30; den=1/den;
      num=1+am/num; if(Math.abs(num)<1e-30) num=1e-30;
      cf*=den*num;
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
    let lo=0,hi=100;
    for(let i=0;i<80;i++){
      const m=(lo+hi)/2;
      if(1-fCDF(m,d1,d2)>alpha) lo=m; else hi=m;
    }
    return (lo+hi)/2;
  }

  function stableJitter(seed){
    const x=Math.sin(seed*12.9898+78.233)*43758.5453;
    return x-Math.floor(x)-0.5;
  }

  // --- data generation ---
  function generate(){
    const effect=parseFloat(slEff.value);
    const withinSD=parseFloat(slW.value);
    const nk=parseInt(slNk.value);
    data=[];
    for(let i=0;i<K;i++){
      const gm=(i-(K-1)/2)*effect;
      const pts=[];
      for(let j=0;j<nk;j++) pts.push(gm+rng_normal(0,withinSD));
      data.push(pts);
    }
    compute();

    dotJitters=[];
    for(let i=0;i<K;i++){
      dotJitters[i]=[];
      for(let j=0;j<data[i].length;j++) dotJitters[i][j]=stableJitter(i*1000+j);
    }
    dotOrder=[];
    for(let i=0;i<K;i++)
      for(let j=0;j<data[i].length;j++) dotOrder.push({g:i,j});

    draw(dotOrder.length);
  }

  // --- ANOVA computation ---
  function compute(){
    const k=data.length;
    const nk=data[0].length;
    const N=k*nk;
    const gMeans=data.map(g=>{let s=0;for(const x of g) s+=x; return s/g.length;});
    let total=0; for(const g of data) for(const x of g) total+=x;
    const grandMean=total/N;
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
    const SST=SSB+SSW;
    const eta2=SST>0?SSB/SST:0;
    stats={k,nk,N,gMeans,grandMean,SSB,SSW,SST,dfB,dfW,MSB,MSW,F,pval,Fcrit,eta2};

    $('anovaF').textContent=F.toFixed(3);
    $('anovaDfB').textContent=dfB;
    $('anovaDfW').textContent=dfW;
    $('anovaP').textContent=pval<0.0001?pval.toExponential(2):pval.toFixed(4);
    $('anovaP').style.color=pval<0.05?'var(--magenta)':'var(--green)';
    $('anovaSSB').textContent=SSB.toFixed(2);
    $('anovaSSW').textContent=SSW.toFixed(2);
    if($('anovaEta2')) $('anovaEta2').textContent=eta2.toFixed(3);
    const reject=pval<0.05;
    const en=window.__LANG==='en';
    $('anovaResult').textContent=en?(reject?'Reject H₀':'Fail to reject H₀'):(reject?'H₀ 棄却':'H₀ 採択');
    $('anovaResult').style.color=reject?'var(--magenta)':'var(--green)';

    const tbl=document.getElementById('anovaTable');
    if(tbl){
      const c=s=>tbl.querySelector(`[data-cell="${s}"]`);
      if(c('ssb')) c('ssb').textContent=SSB.toFixed(2);
      if(c('dfb')) c('dfb').textContent=dfB;
      if(c('msb')) c('msb').textContent=MSB.toFixed(2);
      if(c('f'))   c('f').textContent=F.toFixed(3);
      if(c('p')){  c('p').textContent=pval<0.0001?pval.toExponential(2):pval.toFixed(4);
                   c('p').style.color=pval<0.05?'var(--magenta)':'var(--green)';}
      if(c('ssw')) c('ssw').textContent=SSW.toFixed(2);
      if(c('dfw')) c('dfw').textContent=dfW;
      if(c('msw')) c('msw').textContent=MSW.toFixed(2);
      if(c('sst')) c('sst').textContent=SST.toFixed(2);
      if(c('dft')) c('dft').textContent=dfB+dfW;
    }
  }

  // --- drawing ---
  function draw(dotsToShow){
    const {ctx,w,h} = resizeCanvas(canvas);
    if(!ctx) return;
    drawGrid(ctx,w,h);
    const tc = themeColors();
    const colors=[tc.cyan,tc.magenta,tc.yellow];
    const {k,gMeans,grandMean,F:Fval,Fcrit,dfB,dfW}=stats;
    const splitX=Math.round(w*0.55);
    const pad=20;
    const complete=dotsToShow>=dotOrder.length;

    // ===== LEFT: layout params (fixed Y-axis from slider params) =====
    const halfRange=Math.max(1,parseFloat(slEff.value)+3.5*parseFloat(slW.value));
    const dMin=-halfRange, dMax=halfRange;
    const yToPx=v=>pad+(1-(v-dMin)/(dMax-dMin))*(h-2*pad);
    const colW=(splitX-pad*2)/k;
    const dotR=Math.min(4,colW/6);

    // panel titles
    ctx.fillStyle=withAlpha(tc.text,.7);ctx.font='11px "Courier New"';
    ctx.fillText(window.__LANG==='en'?'Strip Chart':'ストリップチャート',pad,14);

    // group labels (always visible)
    for(let i=0;i<k;i++){
      const cx=pad+colW*(i+0.5);
      ctx.fillStyle=colors[i%colors.length];ctx.font='bold 11px "Courier New"';
      const label=(window.__LANG==='en'?'G':'群')+String(i+1);
      ctx.fillText(label,cx-ctx.measureText(label).width/2,h-4);
    }
    // y-axis ticks
    ctx.fillStyle=tc.dim;ctx.font='10px "Courier New"';
    for(let t=0;t<=5;t++){
      const v=dMin+(dMax-dMin)*t/5;
      ctx.fillText(v.toFixed(1),2,yToPx(v)+3);
    }

    // ===== LEFT: dots (animated) =====
    for(let d=0;d<dotsToShow;d++){
      const {g,j}=dotOrder[d];
      const cx=pad+colW*(g+0.5);
      const color=colors[g%colors.length];
      ctx.fillStyle=withAlpha(color,.75);
      const jv=dotJitters[g][j]*colW*0.5;
      ctx.beginPath();ctx.arc(cx+jv,yToPx(data[g][j]),dotR,0,TAU);ctx.fill();
    }

    // separator
    ctx.strokeStyle=withAlpha(tc.dim,.3);ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(splitX,0);ctx.lineTo(splitX,h);ctx.stroke();

    // ===== RIGHT: F distribution (always visible as context) =====
    const rx=splitX+pad;
    const rw=w-splitX-pad*2;
    const rh=h-2*pad;
    const fMax=Math.max(Fcrit*1.8, Fval*1.3, 6);
    const fXToPx=f=>rx+f/fMax*rw;
    let peak=0;
    for(let f=0.01;f<=fMax;f+=0.05){const v=fPDF(f,dfB,dfW);if(v>peak)peak=v;}
    if(peak===0) peak=1;
    const fYToPx=v=>h-pad-v/peak*rh*0.9;

    // rejection region fill
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

    // critical value dashed
    ctx.strokeStyle=withAlpha(tc.dim,.8);ctx.setLineDash([4,4]);ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(fXToPx(Fcrit),pad);ctx.lineTo(fXToPx(Fcrit),h-pad);ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle=tc.dim;ctx.font='10px "Courier New"';
    ctx.fillText('Fₜ='+Fcrit.toFixed(2),fXToPx(Fcrit)+3,pad+12);

    // alpha label
    ctx.fillStyle=tc.magenta;ctx.font='10px "Courier New"';
    ctx.fillText('α=0.05',fXToPx(Fcrit)+3,pad+38);

    // x ticks
    ctx.fillStyle=tc.dim;ctx.font='10px "Courier New"';
    const tickStep=fMax<=8?1:fMax<=20?2:5;
    for(let f=0;f<=fMax;f+=tickStep){
      ctx.fillText(f.toFixed(0),fXToPx(f)-4,h-4);
    }

    // F panel title
    ctx.fillStyle=withAlpha(tc.text,.7);ctx.font='11px "Courier New"';
    ctx.fillText(window.__LANG==='en'?'F Distribution':'F 分布',rx,14);

    // ===== Overlays — appear only after all dots are placed =====
    if(complete){
      for(let i=0;i<k;i++){
        const cx=pad+colW*(i+0.5);
        const color=colors[i%colors.length];
        // group mean
        ctx.strokeStyle=color;ctx.lineWidth=tc.light?3:2.5;
        ctx.shadowBlur=tc.light?2:8;ctx.shadowColor=color;
        const mY=yToPx(gMeans[i]);
        ctx.beginPath();ctx.moveTo(cx-colW*0.35,mY);ctx.lineTo(cx+colW*0.35,mY);ctx.stroke();
        ctx.shadowBlur=0;
        // within-group spread (±1σ)
        const gSD=Math.sqrt(data[i].reduce((s,x)=>s+(x-gMeans[i])**2,0)/data[i].length);
        ctx.strokeStyle=withAlpha(color,.3);ctx.lineWidth=1;ctx.setLineDash([3,3]);
        const sdTop=yToPx(gMeans[i]+gSD), sdBot=yToPx(gMeans[i]-gSD);
        ctx.strokeRect(cx-colW*0.3,sdTop,colW*0.6,sdBot-sdTop);
        ctx.setLineDash([]);
        // between-group arrow (mean → grand mean)
        const gmY2=yToPx(grandMean);
        if(Math.abs(mY-gmY2)>3){
          ctx.strokeStyle=withAlpha(tc.yellow,.5);ctx.lineWidth=1.5;
          ctx.beginPath();ctx.moveTo(cx,mY);ctx.lineTo(cx,gmY2);ctx.stroke();
          ctx.fillStyle=withAlpha(tc.yellow,.5);
          const arrowDir=gmY2>mY?1:-1;
          ctx.beginPath();ctx.moveTo(cx,gmY2);ctx.lineTo(cx-4,gmY2-arrowDir*6);ctx.lineTo(cx+4,gmY2-arrowDir*6);ctx.fill();
        }
      }
      // grand mean dashed
      ctx.strokeStyle=withAlpha(tc.yellow,.85);ctx.setLineDash([6,4]);ctx.lineWidth=tc.light?2:1.5;
      ctx.shadowBlur=tc.light?1:6;ctx.shadowColor=tc.yellow;
      const gmY=yToPx(grandMean);
      ctx.beginPath();ctx.moveTo(pad,gmY);ctx.lineTo(splitX-pad/2,gmY);ctx.stroke();
      ctx.shadowBlur=0;ctx.setLineDash([]);
      ctx.fillStyle=tc.yellow;ctx.font='10px "Courier New"';
      const gmLabel=(window.__LANG==='en'?'Grand ':'')+'M̄='+grandMean.toFixed(2);
      ctx.fillText(gmLabel,pad+2,gmY-5);

      // observed F line (the "punchline")
      ctx.strokeStyle=tc.yellow;ctx.lineWidth=tc.light?2.5:2;
      ctx.shadowBlur=tc.light?2:12;ctx.shadowColor=tc.yellow;
      const fPx=fXToPx(Math.min(Fval,fMax*0.98));
      ctx.beginPath();ctx.moveTo(fPx,pad);ctx.lineTo(fPx,h-pad);ctx.stroke();
      ctx.shadowBlur=0;
      ctx.fillStyle=tc.yellow;ctx.font='bold 11px "Courier New"';
      ctx.fillText('F='+Fval.toFixed(2),fPx+4,pad+26);

      // strip chart legend
      const en=window.__LANG==='en';
      const lx=pad+2, ly=pad+2;
      ctx.font='9px "Courier New"';
      ctx.strokeStyle=tc.cyan;ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(lx,ly+4);ctx.lineTo(lx+14,ly+4);ctx.stroke();
      ctx.fillStyle=withAlpha(tc.text,.6);
      ctx.fillText(en?'group mean':'群平均',lx+17,ly+7);
      ctx.strokeStyle=withAlpha(tc.cyan,.3);ctx.lineWidth=1;ctx.setLineDash([3,3]);
      ctx.strokeRect(lx,ly+11,14,8);ctx.setLineDash([]);
      ctx.fillText('±1σ',lx+17,ly+20);
      ctx.strokeStyle=withAlpha(tc.yellow,.85);ctx.setLineDash([6,4]);ctx.lineWidth=1.5;
      ctx.beginPath();ctx.moveTo(lx,ly+27);ctx.lineTo(lx+14,ly+27);ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillText(en?'grand mean':'全体平均',lx+17,ly+30);
      ctx.strokeStyle=withAlpha(tc.yellow,.5);ctx.lineWidth=1.5;
      ctx.beginPath();ctx.moveTo(lx+7,ly+34);ctx.lineTo(lx+7,ly+44);ctx.stroke();
      ctx.fillStyle=withAlpha(tc.yellow,.5);
      ctx.beginPath();ctx.moveTo(lx+7,ly+44);ctx.lineTo(lx+3,ly+39);ctx.lineTo(lx+11,ly+39);ctx.fill();
      ctx.fillStyle=withAlpha(tc.text,.6);
      ctx.fillText(en?'between diff':'群間差',lx+17,ly+43);
    }
  }

  // --- event bindings ---
  const schedGen=throttledDraw(generate);
  slEff.oninput=()=>{if($('anovaEffectVal'))$('anovaEffectVal').textContent=parseFloat(slEff.value).toFixed(1);schedGen();};
  slW.oninput=()=>{if($('anovaWithinVal'))$('anovaWithinVal').textContent=parseFloat(slW.value).toFixed(1);schedGen();};
  slNk.oninput=()=>{if($('anovaNkVal'))$('anovaNkVal').textContent=slNk.value;schedGen();};
  $('anovaGen').onclick=()=>{generate();window.__notifyDone&&window.__notifyDone('anovaGen');};

  generate();
}

// =====================================================================
// Section 01: Multiple comparisons simulation
// =====================================================================
function initAnovaSim(){
  if(!document.getElementById('mcSimCanvas')) return;
  const canvas=$('mcSimCanvas');
  const btnRun=$('mcRun');
  const btnRun1000=$('mcRun1000');
  const btnReset=$('mcReset');
  let trials=[];
  let totalTrials=0, falsePositives=0;
  let visibleTrials=0;
  let simAnimId=0;

  // Simple two-sample t-test (equal variance assumed)
  function tTest(a,b){
    const nA=a.length, nB=b.length;
    let sA=0,sA2=0,sB=0,sB2=0;
    for(const x of a){sA+=x;sA2+=x*x;}
    for(const x of b){sB+=x;sB2+=x*x;}
    const mA=sA/nA, mB=sB/nB;
    const vA=(sA2-nA*mA*mA)/(nA-1);
    const vB=(sB2-nB*mB*mB)/(nB-1);
    const sp=((nA-1)*vA+(nB-1)*vB)/(nA+nB-2);
    if(sp<=0) return 0;
    const t=(mA-mB)/Math.sqrt(sp*(1/nA+1/nB));
    const df=nA+nB-2;
    return tPval(Math.abs(t),df);
  }

  // t-distribution CDF approximation via regularized incomplete beta
  function lnBeta(a,b){return lgamma(a)+lgamma(b)-lgamma(a+b);}
  function regBetaI(x,a,b){
    if(x<=0) return 0;
    if(x>=1) return 1;
    if(x>(a+1)/(a+b+2)) return 1-regBetaI(1-x,b,a);
    const lnPre=a*Math.log(x)+b*Math.log(1-x)-Math.log(a)-lnBeta(a,b);
    const pre=Math.exp(lnPre);
    let num=1,den=1-((a+b)*x)/(a+1);
    if(Math.abs(den)<1e-30) den=1e-30;
    den=1/den; let cf=den;
    for(let m=1;m<=200;m++){
      let am=m*(b-m)*x/((a+2*m-1)*(a+2*m));
      den=1+am*den;if(Math.abs(den)<1e-30)den=1e-30;den=1/den;
      num=1+am/num;if(Math.abs(num)<1e-30)num=1e-30;
      cf*=den*num;
      am=-(a+m)*(a+b+m)*x/((a+2*m)*(a+2*m+1));
      den=1+am*den;if(Math.abs(den)<1e-30)den=1e-30;den=1/den;
      num=1+am/num;if(Math.abs(num)<1e-30)num=1e-30;
      cf*=den*num;
      if(Math.abs(den*num-1)<1e-10) break;
    }
    return pre*cf;
  }
  function tCDF(t,df){
    const x=df/(df+t*t);
    return 1-0.5*regBetaI(x,df/2,0.5);
  }
  function tPval(absT,df){
    return 2*(1-tCDF(absT,df));
  }

  // Run one trial: 3 groups from same N(0,1), do 3 pairwise t-tests
  function runOneTrial(n){
    const alpha=0.05;
    const groups=[];
    for(let i=0;i<3;i++){
      const g=[];
      for(let j=0;j<n;j++) g.push(rng_normal(0,1));
      groups.push(g);
    }
    const p01=tTest(groups[0],groups[1]);
    const p02=tTest(groups[0],groups[2]);
    const p12=tTest(groups[1],groups[2]);
    const anySignificant=p01<alpha||p02<alpha||p12<alpha;
    return anySignificant;
  }

  function runTrials(count){
    cancelAnimationFrame(simAnimId);
    const n=20;
    const startVis=visibleTrials;
    for(let i=0;i<count;i++){
      const fp=runOneTrial(n);
      trials.push(fp);
      totalTrials++;
      if(fp) falsePositives++;
    }
    const endVis=trials.length;

    if(window.__REDUCED_MOTION){
      visibleTrials=endVis;
      updateInfo();
      drawSim();
      return;
    }

    let visFP=0;
    for(let i=0;i<startVis;i++) if(trials[i]) visFP++;
    const toReveal=endVis-startVis;
    const perFrame=toReveal<=200?1:Math.max(1,Math.ceil(toReveal/200));
    (function step(){
      const prev=visibleTrials;
      visibleTrials=Math.min(visibleTrials+perFrame,endVis);
      for(let i=prev;i<visibleTrials;i++) if(trials[i]) visFP++;
      const rate=visibleTrials>0?(visFP/visibleTrials*100):0;
      $('mcTotal').textContent=visibleTrials;
      $('mcFP').textContent=visFP;
      $('mcRate').textContent=rate.toFixed(1)+'%';
      $('mcRate').style.color=rate>10?'var(--magenta)':'var(--green)';
      drawSim();
      if(visibleTrials<endVis) simAnimId=requestAnimationFrame(step);
    })();
  }

  function updateInfo(){
    const rate=totalTrials>0?(falsePositives/totalTrials*100):0;
    $('mcTotal').textContent=totalTrials;
    $('mcFP').textContent=falsePositives;
    $('mcRate').textContent=rate.toFixed(1)+'%';
    $('mcRate').style.color=rate>10?'var(--magenta)':'var(--green)';
  }

  function drawSim(){
    const {ctx,w,h}=resizeCanvas(canvas);
    if(!ctx) return;
    drawGrid(ctx,w,h);
    const tc=themeColors();
    const pad=20;
    const maxDots=200;
    const shown=trials.slice(Math.max(0,visibleTrials-maxDots),visibleTrials);
    if(shown.length===0) return;

    const cols=20;
    const rows=Math.ceil(maxDots/cols);
    const dotW=(w-2*pad)/cols;
    const dotH=(h-2*pad-20)/rows;
    const r=Math.min(dotW,dotH)*0.35;

    for(let i=0;i<shown.length;i++){
      const col=i%cols;
      const row=Math.floor(i/cols);
      const cx=pad+col*dotW+dotW/2;
      const cy=pad+20+row*dotH+dotH/2;
      const fp=shown[i];
      const color=fp?tc.magenta:tc.cyan;
      ctx.fillStyle=withAlpha(color,.85);
      ctx.shadowBlur=fp?(tc.light?3:10):0;
      ctx.shadowColor=color;
      ctx.beginPath();ctx.arc(cx,cy,r,0,TAU);ctx.fill();
      ctx.shadowBlur=0;
    }

    // legend
    ctx.font='11px "Courier New"';
    const en=window.__LANG==='en';
    ctx.fillStyle=tc.cyan;
    ctx.fillText(en?'● No false positive':'● 偽陽性なし',pad,14);
    ctx.fillStyle=tc.magenta;
    const fpLabel=en?'● False positive (≥1 test significant)':'● 偽陽性あり（1回以上「有意」）';
    ctx.fillText(fpLabel,pad+140,14);

    // theoretical line
    const shownRate=visibleTrials>0?((function(){let c=0;for(let i=0;i<visibleTrials;i++)if(trials[i])c++;return c/visibleTrials*100;})()):0;
    ctx.fillStyle=tc.dim;ctx.font='10px "Courier New"';
    const theoLabel=en?'Theory: 14.3%  |  Observed: ':'理論値: 14.3%  |  実測値: ';
    ctx.fillText(theoLabel+shownRate.toFixed(1)+'%',pad,h-4);
  }

  function reset(){
    cancelAnimationFrame(simAnimId);
    trials=[];totalTrials=0;falsePositives=0;visibleTrials=0;
    updateInfo();
    const {ctx,w,h}=resizeCanvas(canvas);
    if(ctx) drawGrid(ctx,w,h);
  }

  btnRun.onclick=()=>{runTrials(100);window.__notifyDone&&window.__notifyDone('mcRun');};
  if(btnRun1000) btnRun1000.onclick=()=>{runTrials(1000);window.__notifyDone&&window.__notifyDone('mcRun1000');};
  btnReset.onclick=()=>{reset();window.__notifyDone&&window.__notifyDone('mcReset');};

  runTrials(100);
}
