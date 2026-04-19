// StatPlay — module: 1) CLT
import { $, TAU, rng_normal, rng_exp, rng_uniform, rng_bimodal, erf, normCDF, normPDF, zCritical, lgamma, gamma, tPDF, chi2PDF, fPDF, resizeCanvas, drawGrid, neonLine, neonFill, themeColors, withAlpha} from '../utils.js';

(function clt(){
  if(!document.getElementById('cltCanvas')) return;
  const canvas=$('cltCanvas');
  const BINS_SRC=60, BINS_MEAN=50;
  let srcHist=new Array(BINS_SRC).fill(0);      // raw sample histogram (original skewed)
  let meanHist=new Array(BINS_MEAN).fill(0);    // histogram of sample means
  let sum=0,sum2=0,total=0;                     // stats for means
  let srcSum=0,srcTotal=0;                      // raw source count
  const nSlider=$('cltN'),nVal=$('cltNVal'),distSel=$('cltDist');
  nSlider.oninput=()=>{nVal.textContent=nSlider.value;clear();draw();};
  distSel.onchange=()=>{clear();draw();};
  let cltRunning=false;
  const CLT_MAX=3000;
  $('cltRun').onclick=()=>{if(cltRunning) return; if(total>=CLT_MAX) clear(); cltRunning=true; animateRun();};
  $('cltClear').onclick=clear;

  function sampleOne(){
    const d=distSel.value;
    if(d==='uniform') return rng_uniform();
    if(d==='exp') return rng_exp(1);
    if(d==='bimodal') return rng_bimodal();
    return rng_exp(1);
  }
  function theory(){
    const d=distSel.value;
    if(d==='uniform') return {m:0.5,v:1/12,range:[0,1],label:'Uniform [0,1]',labelJa:'一様 [0,1]'};
    if(d==='exp')     return {m:1,  v:1,   range:[0,5],label:'Exp λ=1',     labelJa:'指数 λ=1'};
    if(d==='bimodal') return {m:0.5,v:0.0664,range:[0,1],label:'Bimodal',   labelJa:'二峰'};
    return {m:1,v:1,range:[0,5],label:'Exp λ=1',labelJa:'指数'};
  }
  function srcPDF(x){
    const d=distSel.value;
    if(d==='uniform') return (x>=0 && x<=1)?1:0;
    if(d==='exp') return (x>=0)?Math.exp(-x):0;
    if(d==='bimodal'){ // two narrow bumps, same as rng_bimodal approx
      const a=Math.exp(-((x-0.2)**2)/(2*0.08*0.08))/(0.08*Math.sqrt(2*Math.PI));
      const b=Math.exp(-((x-0.8)**2)/(2*0.08*0.08))/(0.08*Math.sqrt(2*Math.PI));
      return 0.5*(a+b);
    }
    return 0;
  }
  function clear(){
    srcHist=new Array(BINS_SRC).fill(0);
    meanHist=new Array(BINS_MEAN).fill(0);
    sum=0;sum2=0;total=0;srcSum=0;srcTotal=0;
    updateInfo();draw();
  }

  // Zoomed range for the mean histogram: center on μ, radius ≈ 4·σ/√n
  function meanRange(){
    const th=theory(); const n=parseInt(nSlider.value);
    const se=Math.sqrt(th.v/n);
    const r=Math.max(se*4.5, (th.range[1]-th.range[0])*0.02);
    return [th.m - r, th.m + r];
  }
  function addSample(){
    const n=parseInt(nSlider.value);
    let s=0;
    const {range}=theory();
    const mr=meanRange();
    let firstX=0;
    for(let i=0;i<n;i++){
      const x=sampleOne();
      s+=x;
      if(i===0) firstX=x;
    }
    // Record only ONE raw per iteration (same pace as the mean panel).
    // This keeps the two panels building up in lockstep.
    const ix=Math.min(BINS_SRC-1,Math.max(0,Math.floor((firstX-range[0])/(range[1]-range[0])*BINS_SRC)));
    srcHist[ix]++;srcSum+=firstX;srcTotal++;
    const m=s/n;
    // bin the sample mean using the ZOOMED range so the bell fills the panel
    const im=Math.min(BINS_MEAN-1,Math.max(0,Math.floor((m-mr[0])/(mr[1]-mr[0])*BINS_MEAN)));
    meanHist[im]++;sum+=m;sum2+=m*m;total++;
  }
  function animateRun(){
    const MAX=CLT_MAX;const TARGET_MS=9500;
    const t0=performance.now();let i=0;
    function step(){
      const elapsed=performance.now()-t0;
      const frac=Math.min(1,elapsed/TARGET_MS);
      // 3-segment piecewise easing for "ゆっくりゆっくり…どどど！"
      //   0  – 45% of time  →  0 – 5%  of samples   (very slow, bar-by-bar)
      //  45 – 75% of time  →  5 – 30% of samples   (gradual ramp)
      //  75 – 100% of time → 30 – 100% of samples (rush to 5000)
      let eased;
      if(frac<0.45){
        eased = Math.pow(frac/0.45, 4) * 0.05;
      } else if(frac<0.75){
        const r=(frac-0.45)/0.30;
        eased = 0.05 + r*r * 0.25;
      } else {
        const r=(frac-0.75)/0.25;
        eased = 0.30 + (1 - Math.pow(1-r, 2)) * 0.70;
      }
      const targetI=Math.min(MAX,Math.ceil(eased*MAX));
      while(i<targetI){addSample();i++;}
      updateInfo();draw();
      if(i<MAX||frac<1) requestAnimationFrame(step);else {cltRunning=false;window.__notifyDone&&window.__notifyDone('cltRun');}
    }
    step();
  }
  function updateInfo(){
    const isEn=window.__LANG==='en';
    $('cltCount').textContent=total;
    if(total<2){$('cltMean').textContent='—';$('cltSD').textContent='—';$('cltSE').textContent='—';}
    else{
      const m=sum/total;const v=sum2/total-m*m;const sd=Math.sqrt(Math.max(0,v));
      $('cltMean').textContent=m.toFixed(4);$('cltSD').textContent=sd.toFixed(4);
      const th=theory();$('cltSE').textContent=Math.sqrt(th.v/parseInt(nSlider.value)).toFixed(4);
    }
    // Live narration
    const n=parseInt(nSlider.value);
    const th=theory();
    const storyJa=(
      '左＝'+th.labelJa+'（真の平均 μ='+th.m+'、分散 σ²='+th.v.toFixed(3)+'）から取った '+srcTotal+' 個の生データ。'+
      (distSel.value==='exp'?'めっちゃ右に尾を引いた<b class="mg">非対称</b>な分布だ。':(distSel.value==='bimodal'?'山が2つある<b class="mg">非正規</b>な分布。':'平らな<b class="mg">非正規</b>な分布。'))+
      '<br>右＝それを n='+n+' 個ずつ束ねて平均した '+total+' 個の標本平均。<br>'+
      '→ 理論的には平均は μ='+th.m+' のまま、<b class="cy">ばらつきだけ σ/√n = '+Math.sqrt(th.v/n).toFixed(3)+' に縮む</b>。'+
      '試行が増えるほどヒストグラムは黄色のベル曲線（N(μ, σ²/n)）に重なっていく。<b class="ye">これが中心極限定理。</b>'
    );
    const storyEn=(
      'Left: '+th.label+' (true μ='+th.m+', σ²='+th.v.toFixed(3)+') with '+srcTotal+' raw draws. '+
      (distSel.value==='exp'?'Clearly <b class="mg">asymmetric</b>, heavy right tail.':(distSel.value==='bimodal'?'Two peaks — clearly <b class="mg">not normal</b>.':'Flat — <b class="mg">not normal</b>.'))+
      '<br>Right: '+total+' sample means, each an average of n='+n+' draws.<br>'+
      '→ Theory says the mean stays μ='+th.m+' but the <b class="cy">spread shrinks to σ/√n = '+Math.sqrt(th.v/n).toFixed(3)+'</b>. '+
      'As trials grow, the histogram hugs the yellow N(μ, σ²/n) bell. <b class="ye">That\'s the CLT.</b>'
    );
    const elJa=$('cltStory'),elEn=$('cltStoryEn');
    if(elJa) elJa.innerHTML=storyJa;
    if(elEn) elEn.innerHTML=storyEn;
  }
  function drawHist(ctx, x0, y0, w, h, hist, range, theoryFn, barColor, lineColor, titleJa, titleEn, isMeanPanel){
    const tc=themeColors();
    const isEn=window.__LANG==='en';
    // frame
    ctx.strokeStyle=withAlpha(tc.cyan,.25);ctx.lineWidth=1;
    ctx.strokeRect(x0+0.5,y0+0.5,w-1,h-1);
    // title
    ctx.fillStyle=tc.text;ctx.font='bold 12px "Courier New"';
    ctx.fillText(isEn?titleEn:titleJa, x0+8, y0+14);
    // plot area
    const padL=28,padR=12,padT=22,padB=22;
    const pw=w-padL-padR, ph=h-padT-padB;
    const px0=x0+padL, py0=y0+padT;
    // theoretical curve — used to set y-scale + overlay
    const xs=Math.max(...hist,1);
    const bins=hist.length;
    const bw=pw/bins;
    // y-scale normalized so that highest bar fills 85% of ph
    // Draw bars
    for(let i=0;i<bins;i++){
      const hgt=hist[i]/xs*(ph*0.95);
      const g=ctx.createLinearGradient(0,py0+ph-hgt,0,py0+ph);
      g.addColorStop(0,barColor);
      g.addColorStop(1,withAlpha(tc.magenta,.25));
      ctx.fillStyle=g;ctx.shadowBlur=tc.light?1:8;ctx.shadowColor=barColor;
      ctx.fillRect(px0+i*bw+0.5,py0+ph-hgt,bw-1,hgt);
    }
    ctx.shadowBlur=0;
    // Theory overlay
    if(theoryFn){
      // sample the theory function densely, then scale so its max matches the hist max count (approx)
      const pts=[];const steps=200;
      // expected bin count at bin i = pdf(xmid)*binWidth*totalSamples
      // we want to scale so that the max over bins matches ... but we normalize to ph*.95 too
      const binW=(range[1]-range[0])/bins;
      const total=hist.reduce((s,c)=>s+c,0)||1;
      let maxExp=1e-9;
      const raw=[];
      for(let i=0;i<=steps;i++){
        const x=range[0]+i/steps*(range[1]-range[0]);
        const y=theoryFn(x)*binW*total;
        raw.push([x,y]);
        if(y>maxExp) maxExp=y;
      }
      const scale=(xs*0.95)/Math.max(xs,maxExp);
      raw.forEach(([x,y])=>{
        const xp=px0+(x-range[0])/(range[1]-range[0])*pw;
        const yp=py0+ph- y*scale/xs*ph;
        pts.push([xp,Math.max(py0,yp)]);
      });
      neonLine(ctx,pts,lineColor,12,2);
    }
    // axis ticks
    ctx.fillStyle=tc.dim;ctx.font='11px "Courier New"';
    ctx.fillText(range[0].toFixed(2),px0-4,py0+ph+14);
    ctx.fillText(range[1].toFixed(2),px0+pw-28,py0+ph+14);
  }
  function draw(){
    const {ctx,w,h}=resizeCanvas(canvas);drawGrid(ctx,w,h);const tc=themeColors();
    const isEn=window.__LANG==='en';
    const gap=16;
    const panelW=(w-gap)/2;
    const th=theory();

    // LEFT panel: raw source distribution
    drawHist(ctx, 0, 0, panelW, h, srcHist, th.range,
      srcPDF, withAlpha(tc.magenta,.85), tc.magenta,
      (isEn?'■ SOURCE: ':'■ 元の分布: ')+(isEn?th.label:th.labelJa)+(isEn?' — '+srcTotal+' raws':' — '+srcTotal+'個'),
      '■ SOURCE: '+th.label+' — '+srcTotal+' raws',
      false);

    // Arrow between panels
    ctx.fillStyle=tc.yellow;ctx.font='bold 16px "Courier New"';
    ctx.fillText('→', panelW+2, h/2);
    ctx.font='9px "Courier New"';ctx.fillStyle=tc.dim;
    ctx.fillText(isEn?'n='+nSlider.value:'n='+nSlider.value+'個', panelW+2, h/2+14);
    ctx.fillText(isEn?'avg':'平均', panelW+2, h/2+26);

    // RIGHT panel: sample-mean distribution, with N(μ, σ²/n) overlay
    // Use ZOOMED meanRange (centered on μ, ±4.5σ/√n) so the bell fills the panel.
    const mu=th.m, sigma2n=th.v/parseInt(nSlider.value);
    const sdn=Math.sqrt(sigma2n);
    const mr=meanRange();
    drawHist(ctx, panelW+gap, 0, panelW, h, meanHist, mr,
      x=>normPDF(x,mu,sdn), withAlpha(tc.cyan,.9), tc.yellow,
      '■ '+(total>0?total:0)+'個 の標本平均（→正規に化ける）',
      '■ '+(total>0?total:0)+' sample means (→ normal)',
      true);

    // Global labels
    ctx.fillStyle=tc.dim;ctx.font='10px "Courier New"';
    ctx.fillText(isEn?'theoretical N(μ, σ²/n)':'理論曲線 N(μ, σ²/n)', panelW+gap+panelW-180, h-4);
    ctx.fillText(isEn?'theoretical pdf':'理論密度', 4, h-4);
    ctx.fillStyle=tc.yellow;ctx.font='bold 11px "Courier New"';
    ctx.fillText(`n = ${nSlider.value}`,w/2-24,h-4);
  }
  draw();
})();
