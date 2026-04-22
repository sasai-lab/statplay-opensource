// StatPlay — module: 4) CI
import { $, rng_normal, zCritical, resizeCanvas, drawGrid, themeColors, withAlpha } from '../utils.js';

export function initCi(){
  if(!document.getElementById('ciCanvas')) return;
  const canvas = $('ciCanvas');
  const intervals = [];
  const nS=$('ciN'),lvl=$('ciLvl');
  nS.oninput=()=>{$('ciNVal').textContent=nS.value;reset();};
  lvl.oninput=()=>{$('ciLvlVal').textContent=lvl.value+'%';$('ciExp').textContent=lvl.value+'%';reset();};
  const CI_MAX=300;
  $('ciRun').onclick=()=>{if(running) return; if(intervals.length>=CI_MAX) reset(); run();};
  $('ciReset').onclick=reset;
  function reset(){intervals.length=0;$('ciMade').textContent='0';$('ciCov').textContent='—';draw();}
  let running=false;
  function run(){
    if(running)return;running=true;
    const n = parseInt(nS.value);
    const conf = parseFloat(lvl.value) / 100;
    const alpha = 1 - conf;
    const z = zCritical(alpha);
    const MAX = CI_MAX;
    const TARGET_MS = 4200;
    const t0 = performance.now();
    let i = 0;
    function frame(){
      const elapsed=performance.now()-t0;
      const frac=Math.min(1,elapsed/TARGET_MS);
      // ease-in: first few intervals appear one-by-one, coverage rate settles visibly
      const eased=frac*frac*(1.6-0.6*frac);
      const targetI=Math.min(MAX,Math.ceil(eased*MAX));
      while(i<targetI){
        let s=0;for(let j=0;j<n;j++){const x=rng_normal(0,1);s+=x;}
        const m = s / n;
        const se = 1 / Math.sqrt(n);
        intervals.push({m,lo:m-z*se,hi:m+z*se});i++;
      }
      draw();updateCov();
      if(i<MAX||frac<1) requestAnimationFrame(frame);else {running=false;window.__notifyDone&&window.__notifyDone('ciRun');}
    }
    frame();
  }
  function updateCov(){
    const hits=intervals.filter(iv=>iv.lo<=0&&iv.hi>=0).length;
    $('ciMade').textContent=intervals.length;
    $('ciCov').textContent=intervals.length?(hits/intervals.length*100).toFixed(1)+'%':'—';
  }
  function draw(){
    const {ctx,w,h} = resizeCanvas(canvas);
    drawGrid(ctx,w,h);
    const tc = themeColors();
    // true mean line
    ctx.strokeStyle=withAlpha(tc.yellow,.8);ctx.setLineDash([4,4]);
    const xMid=w/2;ctx.beginPath();ctx.moveTo(xMid,0);ctx.lineTo(xMid,h);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle=tc.yellow;ctx.font='11px "Courier New"';ctx.fillText('μ = 0',xMid+4,14);

    const range = 1.5;
    const xToPx = x => xMid + x / range * (w / 2 - 20);
    const rowH=Math.max(1,(h-20)/Math.max(300,intervals.length));
    intervals.forEach((iv,i)=>{
      const y = 10 + i * rowH;
      const hit = iv.lo <= 0 && iv.hi >= 0;
      const color=hit?tc.cyan:tc.magenta;
      ctx.strokeStyle=color;ctx.shadowBlur=tc.light?(hit?1:2):(hit?4:8);ctx.shadowColor=color;ctx.lineWidth=Math.max(.7,rowH-.5);
      ctx.beginPath();ctx.moveTo(xToPx(iv.lo),y);ctx.lineTo(xToPx(iv.hi),y);ctx.stroke();ctx.shadowBlur=0;
    });
    // annotation: legend + coverage
    if(intervals.length>0){
      const hits=intervals.filter(iv=>iv.lo<=0&&iv.hi>=0).length;
      const cov=(hits/intervals.length*100).toFixed(1);
      ctx.font='bold 12px "Courier New"';
      ctx.fillStyle=tc.cyan;ctx.fillText(window.__LANG==='en'?'── Hit (contains μ)':'── 捕捉（μを含む）',8,h-26);
      ctx.fillStyle=tc.magenta;ctx.fillText(window.__LANG==='en'?'── Miss':'── 外れ',8,h-12);
      ctx.fillStyle=tc.text;ctx.font='bold 13px "Courier New"';
      ctx.fillText((window.__LANG==='en'?'Coverage: ':'捕捉率: ')+cov+'%',w-160,h-12);
    }
  }
  draw();
}
