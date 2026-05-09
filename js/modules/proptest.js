// StatPlay — module: PROPORTION TEST & ESTIMATION
import { $, normCDF, normPDF, zCritical, resizeCanvas, drawGrid, neonLine, neonFill, themeColors, withAlpha, throttledDraw, makeAxisMap } from '../utils.js';

// ── shared drag helper ──
function bindDrag(canvasId, pxToSlider){
  const cv=document.getElementById(canvasId);
  if(!cv) return;
  cv.style.touchAction='none';
  cv.style.cursor='grab';
  let dragging=false;
  function apply(e,initial){
    const r=cv.getBoundingClientRect();
    const px=e.clientX-r.left, py=e.clientY-r.top;
    pxToSlider(px,py,r.width,r.height,initial);
  }
  cv.addEventListener('pointerdown',e=>{
    dragging=true;cv.style.cursor='grabbing';
    try{cv.setPointerCapture(e.pointerId);}catch(_){}
    apply(e,true);
  });
  cv.addEventListener('pointermove',e=>{if(dragging)apply(e,false);});
  const end=e=>{dragging=false;cv.style.cursor='grab';try{cv.releasePointerCapture(e.pointerId);}catch(_){}};
  cv.addEventListener('pointerup',end);
  cv.addEventListener('pointercancel',end);
}

function setSlider(sl,v){
  if(!sl) return;
  const min=parseFloat(sl.min),max=parseFloat(sl.max),step=parseFloat(sl.step)||0.01;
  let nv=Math.max(min,Math.min(max,v));
  nv=Math.round(nv/step)*step;
  if(String(nv)!==sl.value){sl.value=nv;sl.dispatchEvent(new Event('input',{bubbles:true}));}
}

export function initProptest(){

  // ── Panel ① 母比率の区間推定 ──
  if(document.getElementById('ptCiCanvas')){
    const canvas=$('ptCiCanvas');
    const nS=$('ptCiN'), pS=$('ptCiP'), lvl=$('ptCiLvl');
    const sched=throttledDraw(()=>drawCi());
    [nS,pS].forEach(s=>s.oninput=()=>{
      $('ptCiNVal').textContent=nS.value;
      $('ptCiPVal').textContent=parseFloat(pS.value).toFixed(2);
      sched();
    });
    lvl.onchange=()=>drawCi();

    // drag: horizontal → n（標本サイズ）
    bindDrag('ptCiCanvas',(px,py,w)=>{
      const frac=Math.max(0,Math.min(1,px/w));
      setSlider(nS, 10+frac*190);
    });

    function drawCi(){
      const {ctx,w,h}=resizeCanvas(canvas);
      if(!ctx) return;
      drawGrid(ctx,w,h);
      const tc=themeColors();
      const n=parseInt(nS.value);
      const p=parseFloat(pS.value);
      const conf=parseFloat(lvl.value)/100;
      const sigLevel=1-conf;
      const z=zCritical(sigLevel);
      const se=Math.sqrt(p*(1-p)/n);
      const lo=Math.max(0,p-z*se);
      const hi=Math.min(1,p+z*se);
      const moe=z*se;

      const margin=40;
      const plotW=w-margin*2;
      const { xToPx } = makeAxisMap({ w, h, lo: 0, hi: 1, peak: 1, marginLeft: margin, marginRight: margin });

      // layout: curve fills upper area, bar near bottom, text flush
      const topPad=14;
      const axisY=h-110;
      const curveBase=axisY-6;
      const curveTop=topPad+4;
      const curveH=curveBase-curveTop;

      // axis
      ctx.strokeStyle=withAlpha(tc.dim,.5);ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(margin,axisY);ctx.lineTo(w-margin,axisY);ctx.stroke();
      ctx.fillStyle=tc.dim;ctx.font='10px "Courier New","Segoe UI","Hiragino Sans",sans-serif';
      for(let v=0;v<=1;v+=0.1){
        const px=xToPx(v);
        ctx.beginPath();ctx.moveTo(px,axisY-4);ctx.lineTo(px,axisY+4);ctx.stroke();
        ctx.fillText(v.toFixed(1),px-8,axisY+16);
      }

      // sampling distribution curve
      const peak=normPDF(p,p,se);
      if(se>0&&peak>0){
        const pts=[];
        const step=1/plotW;
        for(let x=Math.max(0,p-4*se);x<=Math.min(1,p+4*se);x+=step){
          const px=xToPx(x);
          const py=curveBase-normPDF(x,p,se)/peak*curveH*0.85;
          pts.push([px,py]);
        }
        neonLine(ctx,pts,tc.cyan,10,2);

        // shade CI area on curve
        const fillPts=[[xToPx(lo),curveBase]];
        for(let x=lo;x<=hi;x+=step){
          const px=xToPx(x);
          const py=curveBase-normPDF(x,p,se)/peak*curveH*0.85;
          fillPts.push([px,py]);
        }
        fillPts.push([xToPx(hi),curveBase]);
        neonFill(ctx,fillPts,tc.cyan,.2);
      }

      // ── CI bar (dist.js style: filled rectangle with border) ──
      const barH=16;
      const barY1=h-68;
      const barLeft=xToPx(lo), barRight=xToPx(hi);
      const barWidth=barRight-barLeft;

      // p̂ center reference line (dashed)
      ctx.strokeStyle=withAlpha(tc.magenta,.4);ctx.setLineDash([2,3]);ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(xToPx(p),axisY+2);ctx.lineTo(xToPx(p),barY1+barH+4);ctx.stroke();
      ctx.setLineDash([]);

      // filled bar
      ctx.fillStyle=withAlpha(tc.cyan,.4);
      ctx.fillRect(barLeft,barY1,barWidth,barH);
      ctx.strokeStyle=tc.cyan;ctx.lineWidth=1.5;
      ctx.strokeRect(barLeft,barY1,barWidth,barH);

      // label: left side
      ctx.fillStyle=tc.cyan;ctx.font='11px "Courier New"';
      ctx.textAlign='right';
      ctx.fillText(lo.toFixed(3),barLeft-6,barY1+12);
      // label: right side
      ctx.textAlign='left';
      ctx.fillText(hi.toFixed(3),barRight+6,barY1+12);
      ctx.textAlign='start';

      // p̂ marker on bar
      ctx.fillStyle=tc.magenta;ctx.font='bold 11px "Courier New"';
      const phatLabel='p̂ = '+p.toFixed(2);
      ctx.textAlign='center';
      ctx.fillText(phatLabel,xToPx(p),h-34);
      ctx.textAlign='start';

      // annotation line (flush to canvas bottom)
      ctx.fillStyle=tc.dim;ctx.font='11px "Courier New","Segoe UI","Hiragino Sans",sans-serif';
      ctx.fillText('n = '+n+'   SE = '+se.toFixed(4)+'   '+conf*100+'% CI',8,h-10);

      // drag hint
      ctx.fillStyle=withAlpha(tc.dim,.5);ctx.font='10px "Courier New","Segoe UI","Hiragino Sans",sans-serif';
      ctx.fillText('← ドラッグ: n →',w-100,h-10);

      // normal approximation warning
      const npOk=n*p>=5&&n*(1-p)>=5;
      if(!npOk){
        ctx.fillStyle=tc.magenta;ctx.font='bold 11px "Courier New","Segoe UI","Hiragino Sans",sans-serif';
        ctx.fillText('⚠ np < 5 or n(1−p) < 5: 正規近似の条件を満たさない',8,topPad);
      }

      $('ptCiSE').textContent=se.toFixed(4);
      $('ptCiLo').textContent=lo.toFixed(4);
      $('ptCiHi').textContent=hi.toFixed(4);
      $('ptCiMoe').textContent=moe.toFixed(4);
    }
    drawCi();
  }

  // ── Panel ①-b 信頼区間シミュレーション ──
  if(document.getElementById('ptCiSimCanvas')){
    const simCanvas=$('ptCiSimCanvas');
    const ciIntervals=[];
    const pTrueS=$('ptCiSimP'),nSimS=$('ptCiSimN'),lvlSimS=$('ptCiSimLvl');
    pTrueS.oninput=()=>{$('ptCiSimPVal').textContent=parseFloat(pTrueS.value).toFixed(2);resetSim();};
    nSimS.oninput=()=>{$('ptCiSimNVal').textContent=nSimS.value;resetSim();};
    lvlSimS.onchange=()=>resetSim();
    const SIM_MAX=200;
    $('ptCiSimRun').onclick=()=>{if(simRunning)return;if(ciIntervals.length>=SIM_MAX)resetSim();runSim();};
    $('ptCiSimReset').onclick=resetSim;
    function resetSim(){ciIntervals.length=0;simFired=false;$('ptCiSimMade').textContent='0';$('ptCiSimCov').textContent='—';drawSim();}
    let simRunning=false;
    let simFired=false;
    const simObs=new IntersectionObserver(entries=>{
      if(entries[0].isIntersecting&&!simFired&&!simRunning&&ciIntervals.length===0){
        simFired=true;runSim();
      }
    },{threshold:0.4});
    simObs.observe(simCanvas);
    function runSim(){
      if(simRunning)return;simRunning=true;
      const n=parseInt(nSimS.value);
      const pTrue=parseFloat(pTrueS.value);
      const conf=parseFloat(lvlSimS.value)/100;
      const z=zCritical(1-conf);
      const t0=performance.now();
      const TARGET_MS=4200;
      let i=0;
      function frame(){
        const elapsed=performance.now()-t0;
        const frac=Math.min(1,elapsed/TARGET_MS);
        const eased=frac*frac*(1.6-0.6*frac);
        const targetI=Math.min(SIM_MAX,Math.ceil(eased*SIM_MAX));
        while(i<targetI){
          let x=0;for(let j=0;j<n;j++){if(Math.random()<pTrue)x++;}
          const ph=x/n;
          const se=Math.sqrt(ph*(1-ph)/n);
          ciIntervals.push({ph,lo:ph-z*se,hi:ph+z*se});i++;
        }
        drawSim();updateSimCov(pTrue);
        if(i<SIM_MAX||frac<1)requestAnimationFrame(frame);else simRunning=false;
      }
      frame();
    }
    function updateSimCov(pTrue){
      const hits=ciIntervals.filter(iv=>iv.lo<=pTrue&&iv.hi>=pTrue).length;
      $('ptCiSimMade').textContent=ciIntervals.length;
      $('ptCiSimCov').textContent=ciIntervals.length?(hits/ciIntervals.length*100).toFixed(1)+'%':'—';
    }
    function drawSim(){
      const {ctx,w,h}=resizeCanvas(simCanvas);
      if(!ctx)return;
      drawGrid(ctx,w,h);
      const tc=themeColors();
      const pTrue=parseFloat(pTrueS.value);
      const margin=30;
      const { xToPx } = makeAxisMap({ w, h, lo: 0, hi: 1, peak: 1, marginLeft: margin, marginRight: margin });

      ctx.strokeStyle=withAlpha(tc.yellow,.8);ctx.setLineDash([4,4]);
      const pLine=xToPx(pTrue);
      ctx.beginPath();ctx.moveTo(pLine,0);ctx.lineTo(pLine,h);ctx.stroke();ctx.setLineDash([]);
      ctx.fillStyle=tc.yellow;ctx.font='11px "Courier New","Segoe UI","Hiragino Sans",sans-serif';
      ctx.fillText('p = '+pTrue.toFixed(2),pLine+4,14);

      const rowH=Math.max(1,(h-30)/Math.max(SIM_MAX,ciIntervals.length));
      ciIntervals.forEach((iv,idx)=>{
        const y=10+idx*rowH;
        const hit=iv.lo<=pTrue&&iv.hi>=pTrue;
        const color=hit?tc.cyan:tc.magenta;
        ctx.strokeStyle=color;ctx.shadowBlur=hit?4:8;ctx.shadowColor=color;
        ctx.lineWidth=Math.max(.7,rowH-.5);
        ctx.beginPath();ctx.moveTo(xToPx(Math.max(0,iv.lo)),y);ctx.lineTo(xToPx(Math.min(1,iv.hi)),y);ctx.stroke();
        ctx.shadowBlur=0;
      });

      if(ciIntervals.length>0){
        const hits=ciIntervals.filter(iv=>iv.lo<=pTrue&&iv.hi>=pTrue).length;
        const cov=(hits/ciIntervals.length*100).toFixed(1);
        ctx.font='bold 12px "Courier New","Segoe UI","Hiragino Sans",sans-serif';
        ctx.fillStyle=tc.cyan;ctx.fillText('── 捕捉（pを含む）',8,h-26);
        ctx.fillStyle=tc.magenta;ctx.fillText('── 外れ',8,h-12);
        ctx.fillStyle=tc.text;ctx.font='bold 13px "Courier New"';
        ctx.fillText('捕捉率: '+cov+'%',w-160,h-12);
      }
    }
    drawSim();
  }

  // ── Panel ② 母比率の検定（1標本z検定） ──
  if(document.getElementById('ptTestCanvas')){
    const canvas=$('ptTestCanvas');
    const nS=$('ptTN'),pS=$('ptTP'),p0S=$('ptTP0'),aS=$('ptTA'),typeS=$('ptTType');
    const sched=throttledDraw(()=>drawTest());
    [nS,pS,p0S,aS].forEach(s=>s.oninput=()=>{
      $('ptTNVal').textContent=nS.value;
      $('ptTPVal').textContent=parseFloat(pS.value).toFixed(2);
      $('ptTP0Val').textContent=parseFloat(p0S.value).toFixed(2);
      $('ptTAVal').textContent=parseFloat(aS.value).toFixed(3);
      sched();
    });
    typeS.onchange=()=>drawTest();

    // drag: horizontal → p̂
    bindDrag('ptTestCanvas',(px,py,w)=>{
      const lo=-4.5,hi=4.5;
      const zDrag=lo+px/w*(hi-lo);
      const p0=parseFloat(p0S.value);
      const n=parseInt(nS.value);
      const se0=Math.sqrt(p0*(1-p0)/n);
      setSlider(pS,p0+zDrag*se0);
    });

    function drawTest(){
      const {ctx,w,h}=resizeCanvas(canvas);
      if(!ctx) return;
      drawGrid(ctx,w,h);
      const tc=themeColors();
      const n=parseInt(nS.value);
      const p=parseFloat(pS.value);
      const p0=parseFloat(p0S.value);
      const sigLevel=parseFloat(aS.value);
      const t=typeS.value;

      const se0=Math.sqrt(p0*(1-p0)/n);
      const zObs=se0>0?(p-p0)/se0:0;

      const lo=-4.5,hi=4.5;
      const margin=20;
      const axisY=h-40;
      const peak=normPDF(0);
      const { xToPx, yToPx } = makeAxisMap({ w, h, lo, hi, peak, marginLeft: margin, marginRight: margin, marginTop: 30, marginBottom: 40 });

      // axis line
      ctx.strokeStyle=withAlpha(tc.dim,.5);ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(xToPx(lo),axisY);ctx.lineTo(xToPx(hi),axisY);ctx.stroke();

      // axis ticks & labels
      ctx.fillStyle=tc.dim;ctx.font='10px "Courier New"';ctx.textAlign='center';
      for(let x=-4;x<=4;x+=1){
        const px=xToPx(x);
        ctx.beginPath();ctx.moveTo(px,axisY);ctx.lineTo(px,axisY+5);ctx.stroke();
        ctx.fillText(x.toString(),px,axisY+18);
      }
      ctx.textAlign='start';

      let crit;let rejection;
      if(t==='two'){crit=zCritical(sigLevel);rejection=[[-4.5,-crit],[crit,4.5]];}
      else if(t==='right'){crit=zCritical(sigLevel*2);rejection=[[crit,4.5]];}
      else{crit=-zCritical(sigLevel*2);rejection=[[-4.5,crit]];}

      rejection.forEach(r=>{
        const pts=[[xToPx(r[0]),axisY]];
        for(let x=r[0];x<=r[1];x+=0.05) pts.push([xToPx(x),yToPx(normPDF(x))]);
        pts.push([xToPx(r[1]),axisY]);
        neonFill(ctx,pts,tc.magenta,.35);
      });

      ctx.fillStyle=withAlpha(tc.magenta,.85);
      ctx.font='bold 10px "Courier New","Segoe UI","Hiragino Sans",sans-serif';
      if(t==='two'){
        ctx.fillText('棄却域',xToPx(-4.2),axisY-6);
        ctx.fillText('棄却域',xToPx(2.8),axisY-6);
      }else if(t==='right'){
        ctx.fillText('棄却域',xToPx(2.8),axisY-6);
      }else{
        ctx.fillText('棄却域',xToPx(-4.2),axisY-6);
      }

      const curve=[];
      for(let px=0;px<=w;px+=1){const x=lo+(px-margin)/(w-margin*2)*(hi-lo);curve.push([px,yToPx(normPDF(x))]);}
      neonLine(ctx,curve,tc.cyan,14,2.5);

      ctx.strokeStyle=withAlpha(tc.yellow,.8);ctx.setLineDash([4,4]);ctx.lineWidth=1.5;
      if(t==='two'){
        [-crit,crit].forEach(cv=>{ctx.beginPath();ctx.moveTo(xToPx(cv),12);ctx.lineTo(xToPx(cv),axisY);ctx.stroke();});
      }else{
        ctx.beginPath();ctx.moveTo(xToPx(crit),12);ctx.lineTo(xToPx(crit),axisY);ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.fillStyle=tc.yellow;ctx.font='bold 11px "Courier New"';
      if(t==='two'){
        ctx.fillText('−'+Math.abs(crit).toFixed(2),xToPx(-crit)-36,axisY-10);
        ctx.fillText('+'+Math.abs(crit).toFixed(2),xToPx(crit)+4,axisY-10);
      }else{
        ctx.fillText(crit.toFixed(2),xToPx(crit)+(t==='left'?-32:4),axisY-10);
      }

      const zClamped=Math.max(lo,Math.min(hi,zObs));
      ctx.strokeStyle=tc.green;ctx.lineWidth=2;ctx.shadowBlur=14;ctx.shadowColor=tc.green;
      ctx.beginPath();ctx.moveTo(xToPx(zClamped),10);ctx.lineTo(xToPx(zClamped),axisY);ctx.stroke();ctx.shadowBlur=0;
      ctx.fillStyle=tc.green;ctx.font='bold 12px "Courier New"';
      ctx.fillText('Z = '+zObs.toFixed(2),xToPx(zClamped)+4,24);

      let pval;
      if(t==='two'){
        pval=2*(1-normCDF(Math.abs(zObs)));
        const az=Math.abs(zObs);
        [[-4.5,-az],[az,4.5]].forEach(r=>{
          const pp=[[xToPx(r[0]),axisY]];
          for(let x=r[0];x<=r[1];x+=0.05) pp.push([xToPx(x),yToPx(normPDF(x))]);
          pp.push([xToPx(r[1]),axisY]);
          neonFill(ctx,pp,tc.orange,.25);
        });
      }else if(t==='right'){
        pval=1-normCDF(zObs);
        const pp=[[xToPx(zObs),axisY]];
        for(let x=zObs;x<=4.5;x+=0.05) pp.push([xToPx(x),yToPx(normPDF(x))]);
        pp.push([xToPx(4.5),axisY]);
        neonFill(ctx,pp,tc.orange,.25);
      }else{
        pval=normCDF(zObs);
        const pp=[[xToPx(-4.5),axisY]];
        for(let x=-4.5;x<=zObs;x+=0.05) pp.push([xToPx(x),yToPx(normPDF(x))]);
        pp.push([xToPx(zObs),axisY]);
        neonFill(ctx,pp,tc.orange,.25);
      }

      ctx.fillStyle=tc.orange;ctx.font='bold 11px "Courier New"';
      const pLabel='p = '+pval.toFixed(4);
      const pLabelX=t==='left'?xToPx(zClamped)-ctx.measureText(pLabel).width-6:xToPx(zClamped)+6;
      ctx.fillText(pLabel,pLabelX,40);

      // drag hint
      ctx.fillStyle=withAlpha(tc.dim,.5);ctx.font='10px "Courier New","Segoe UI","Hiragino Sans",sans-serif';
      ctx.fillText('← ドラッグ: p̂ →',w-110,h-8);

      const npOk=n*p0>=5&&n*(1-p0)>=5;
      if(!npOk){
        ctx.fillStyle=tc.magenta;ctx.font='bold 11px "Courier New","Segoe UI","Hiragino Sans",sans-serif';
        ctx.fillText('⚠ np₀ < 5 or n(1−p₀) < 5',8,20);
      }

      let reject=false;
      if(t==='two') reject=Math.abs(zObs)>=Math.abs(crit);
      else if(t==='right') reject=zObs>=crit;
      else reject=zObs<=crit;

      $('ptTZstat').textContent=zObs.toFixed(3);
      $('ptTCrit').textContent=(t==='two'?'±':'')+Math.abs(crit).toFixed(3);
      $('ptTPval').textContent=pval.toFixed(4);
      $('ptTPval').style.color=pval<sigLevel?'var(--magenta)':'var(--green)';
      $('ptTDecision').textContent=reject?'H₀ 棄却':'H₀ 棄却できず';
      $('ptTDecision').style.color=reject?'var(--magenta)':'var(--green)';
    }
    drawTest();
  }

  // ── Panel ③ 2つの母比率の差の検定 ──
  if(document.getElementById('ptTwoCanvas')){
    const canvas=$('ptTwoCanvas');
    const n1S=$('ptTwoN1'),n2S=$('ptTwoN2'),p1S=$('ptTwoP1'),p2S=$('ptTwoP2'),aS=$('ptTwoA'),typeS=$('ptTwoType');
    const sched=throttledDraw(()=>drawTwo());
    [n1S,n2S,p1S,p2S,aS].forEach(s=>s.oninput=()=>{
      $('ptTwoN1Val').textContent=n1S.value;
      $('ptTwoN2Val').textContent=n2S.value;
      $('ptTwoP1Val').textContent=parseFloat(p1S.value).toFixed(2);
      $('ptTwoP2Val').textContent=parseFloat(p2S.value).toFixed(2);
      $('ptTwoAVal').textContent=parseFloat(aS.value).toFixed(3);
      sched();
    });
    typeS.onchange=()=>drawTwo();

    // drag: horizontal → p̂₁
    bindDrag('ptTwoCanvas',(px,py,w)=>{
      const lo=-4.5,hi=4.5;
      const zDrag=lo+px/w*(hi-lo);
      const n1=parseInt(n1S.value),n2=parseInt(n2S.value);
      const p1=parseFloat(p1S.value),p2=parseFloat(p2S.value);
      const pPool=(p1*n1+p2*n2)/(n1+n2);
      const se=Math.sqrt(pPool*(1-pPool)*(1/n1+1/n2));
      setSlider(p1S,p2+zDrag*se);
    });

    function drawTwo(){
      const {ctx,w,h}=resizeCanvas(canvas);
      if(!ctx) return;
      drawGrid(ctx,w,h);
      const tc=themeColors();
      const n1=parseInt(n1S.value),n2=parseInt(n2S.value);
      const p1=parseFloat(p1S.value),p2=parseFloat(p2S.value);
      const sigLevel=parseFloat(aS.value);
      const t=typeS.value;

      const pPool=(p1*n1+p2*n2)/(n1+n2);
      const se=Math.sqrt(pPool*(1-pPool)*(1/n1+1/n2));
      const zObs=se>0?(p1-p2)/se:0;

      const lo=-4.5,hi=4.5;
      const margin=20;
      const barH=12,barGap=4,barCount=2,barBlock=barCount*(barH+barGap)+20;
      const axisY=h-barBlock-26;
      const curveTop=14;
      const peak=normPDF(0);
      const { xToPx, yToPx } = makeAxisMap({ w, h, lo, hi, peak, marginLeft: margin, marginRight: margin, marginTop: curveTop, marginBottom: barBlock + 26 });

      // axis line
      ctx.strokeStyle=withAlpha(tc.dim,.5);ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(xToPx(lo),axisY);ctx.lineTo(xToPx(hi),axisY);ctx.stroke();

      // axis ticks & labels
      ctx.fillStyle=tc.dim;ctx.font='10px "Courier New"';ctx.textAlign='center';
      for(let x=-4;x<=4;x+=1){
        const px=xToPx(x);
        ctx.beginPath();ctx.moveTo(px,axisY);ctx.lineTo(px,axisY+5);ctx.stroke();
        ctx.fillText(x.toString(),px,axisY+18);
      }
      ctx.textAlign='start';

      let crit;let rejection;
      if(t==='two'){crit=zCritical(sigLevel);rejection=[[-4.5,-crit],[crit,4.5]];}
      else if(t==='right'){crit=zCritical(sigLevel*2);rejection=[[crit,4.5]];}
      else{crit=-zCritical(sigLevel*2);rejection=[[-4.5,crit]];}

      rejection.forEach(r=>{
        const pts=[[xToPx(r[0]),axisY]];
        for(let x=r[0];x<=r[1];x+=0.05) pts.push([xToPx(x),yToPx(normPDF(x))]);
        pts.push([xToPx(r[1]),axisY]);
        neonFill(ctx,pts,tc.magenta,.35);
      });
      ctx.fillStyle=withAlpha(tc.magenta,.85);
      ctx.font='bold 10px "Courier New","Segoe UI","Hiragino Sans",sans-serif';
      if(t==='two'){ctx.fillText('棄却域',xToPx(-4.2),axisY-6);ctx.fillText('棄却域',xToPx(2.8),axisY-6);}
      else if(t==='right'){ctx.fillText('棄却域',xToPx(2.8),axisY-6);}
      else{ctx.fillText('棄却域',xToPx(-4.2),axisY-6);}

      const curve=[];
      for(let px=0;px<=w;px+=1){const x=lo+(px-margin)/(w-margin*2)*(hi-lo);curve.push([px,yToPx(normPDF(x))]);}
      neonLine(ctx,curve,tc.cyan,14,2.5);

      ctx.strokeStyle=withAlpha(tc.yellow,.8);ctx.setLineDash([4,4]);ctx.lineWidth=1.5;
      if(t==='two'){
        [-crit,crit].forEach(cv=>{ctx.beginPath();ctx.moveTo(xToPx(cv),curveTop);ctx.lineTo(xToPx(cv),axisY);ctx.stroke();});
      }else{
        ctx.beginPath();ctx.moveTo(xToPx(crit),curveTop);ctx.lineTo(xToPx(crit),axisY);ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.fillStyle=tc.yellow;ctx.font='bold 11px "Courier New"';
      if(t==='two'){
        ctx.fillText('−'+Math.abs(crit).toFixed(2),xToPx(-crit)-36,axisY-10);
        ctx.fillText('+'+Math.abs(crit).toFixed(2),xToPx(crit)+4,axisY-10);
      }else{
        ctx.fillText(crit.toFixed(2),xToPx(crit)+(t==='left'?-32:4),axisY-10);
      }

      const zClamped=Math.max(lo,Math.min(hi,zObs));
      ctx.strokeStyle=tc.green;ctx.lineWidth=2;ctx.shadowBlur=14;ctx.shadowColor=tc.green;
      ctx.beginPath();ctx.moveTo(xToPx(zClamped),curveTop);ctx.lineTo(xToPx(zClamped),axisY);ctx.stroke();ctx.shadowBlur=0;
      ctx.fillStyle=tc.green;ctx.font='bold 12px "Courier New"';
      ctx.fillText('Z = '+zObs.toFixed(2),xToPx(zClamped)+4,curveTop+14);

      let pval;
      if(t==='two'){
        pval=2*(1-normCDF(Math.abs(zObs)));
        const az=Math.abs(zObs);
        [[-4.5,-az],[az,4.5]].forEach(r=>{
          const pp=[[xToPx(r[0]),axisY]];
          for(let x=r[0];x<=r[1];x+=0.05) pp.push([xToPx(x),yToPx(normPDF(x))]);
          pp.push([xToPx(r[1]),axisY]);
          neonFill(ctx,pp,tc.orange,.25);
        });
      }else if(t==='right'){
        pval=1-normCDF(zObs);
        const pp=[[xToPx(zObs),axisY]];
        for(let x=zObs;x<=4.5;x+=0.05) pp.push([xToPx(x),yToPx(normPDF(x))]);
        pp.push([xToPx(4.5),axisY]);
        neonFill(ctx,pp,tc.orange,.25);
      }else{
        pval=normCDF(zObs);
        const pp=[[xToPx(-4.5),axisY]];
        for(let x=-4.5;x<=zObs;x+=0.05) pp.push([xToPx(x),yToPx(normPDF(x))]);
        pp.push([xToPx(zObs),axisY]);
        neonFill(ctx,pp,tc.orange,.25);
      }
      ctx.fillStyle=tc.orange;ctx.font='bold 11px "Courier New"';
      const pLabel='p = '+pval.toFixed(4);
      const pLabelX=t==='left'?xToPx(zClamped)-ctx.measureText(pLabel).width-6:xToPx(zClamped)+6;
      ctx.fillText(pLabel,pLabelX,curveTop+28);

      let reject=false;
      if(t==='two') reject=Math.abs(zObs)>=Math.abs(crit);
      else if(t==='right') reject=zObs>=crit;
      else reject=zObs<=crit;

      $('ptTwoPool').textContent=pPool.toFixed(4);
      $('ptTwoZstat').textContent=zObs.toFixed(3);
      $('ptTwoPval').textContent=pval.toFixed(4);
      $('ptTwoPval').style.color=pval<sigLevel?'var(--magenta)':'var(--green)';
      $('ptTwoDecision').textContent=reject?'H₀ 棄却':'H₀ 棄却できず';
      $('ptTwoDecision').style.color=reject?'var(--magenta)':'var(--green)';

      // ── Proportion comparison bars (below axis, center-aligned) ──
      const barTop=axisY+26;
      const barMaxHalf=(w-margin*2)/2*0.85;
      const cx=w/2;

      // center line
      ctx.strokeStyle=withAlpha(tc.dim,.4);ctx.lineWidth=1;ctx.setLineDash([3,3]);
      ctx.beginPath();ctx.moveTo(cx,barTop-2);ctx.lineTo(cx,barTop+barCount*(barH+barGap)+6);ctx.stroke();
      ctx.setLineDash([]);

      // bar 1: p̂₁ — centered
      const b1Y=barTop+4;
      const b1Half=p1*barMaxHalf;
      ctx.fillStyle=withAlpha(tc.cyan,.45);
      ctx.fillRect(cx-b1Half,b1Y,b1Half*2,barH);
      ctx.strokeStyle=tc.cyan;ctx.lineWidth=1;
      ctx.strokeRect(cx-b1Half,b1Y,b1Half*2,barH);

      // bar 2: p̂₂ — centered
      const b2Y=b1Y+barH+barGap;
      const b2Half=p2*barMaxHalf;
      ctx.fillStyle=withAlpha(tc.magenta,.35);
      ctx.fillRect(cx-b2Half,b2Y,b2Half*2,barH);
      ctx.strokeStyle=tc.magenta;ctx.lineWidth=1;
      ctx.strokeRect(cx-b2Half,b2Y,b2Half*2,barH);

      // bar labels (right edge)
      ctx.font='bold 10px "Courier New"';
      ctx.fillStyle=tc.cyan;
      ctx.fillText('p̂₁ '+p1.toFixed(2),cx+b1Half+6,b1Y+10);
      ctx.fillStyle=tc.magenta;
      ctx.fillText('p̂₂ '+p2.toFixed(2),cx+b2Half+6,b2Y+10);

      // drag hint
      ctx.fillStyle=withAlpha(tc.dim,.5);ctx.font='10px "Courier New","Segoe UI","Hiragino Sans",sans-serif';
      ctx.fillText('← ドラッグ: p̂₁ →',w-110,h-4);
    }
    drawTwo();
  }
}
