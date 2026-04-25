// StatPlay — module: HERO PARTICLES
import { $, TAU, themeColors, withAlpha } from '../utils.js';

export function initHero(){
  const startBtn=document.getElementById('heroStart');
  if(startBtn){
    startBtn.addEventListener('click',()=>{
      const t=document.getElementById('stdnorm');
      if(t) t.scrollIntoView({behavior:'smooth',block:'start'});
    });
  }
  if(!document.getElementById('heroCanvas')) return;
  /* --------------------------------------------------------------
     CONCEPT: 「公式の暗記」→「あ、そうか！」と気づく瞬間
     "rote formulas" → "aha!" moment
     Phase A: scattered formulas drift (memorization hell)
     Phase B: particles migrate into a meaningful shape
       (bell curve / scatter+line / bayes grid / CI bars)
     Phase C: brief "AHA" pulse when the shape completes
     Loop with a different shape each cycle.
     -------------------------------------------------------------- */
  const c=$('heroCanvas');
  let ctx,W,H;
  function fit(){
    W = c.clientWidth || window.innerWidth;
    H = c.clientHeight || window.innerHeight;
    const raw = window.devicePixelRatio || 1;
    const dpr = (Number.isFinite(raw) && raw > 0) ? Math.min(raw, 8) : 1;
    c.width = W * dpr;
    c.height = H * dpr;
    ctx = c.getContext('2d');
    if(!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  fit();
  let resizeTimer=null;
  addEventListener('resize',()=>{fit();clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(typeof setTarget==='function'){phase--;setTarget();}},120);});

  // --- floating formulas (the "rote memorization" layer) ---
  const FORMULAS=[
    'z = (x − μ) / σ',
    'f(x)=(1/√(2πσ²))·e^(−(x−μ)²/2σ²)',
    'P(A|B) = P(B|A)·P(A)/P(B)',
    'β̂ = (XᵀX)⁻¹Xᵀy',
    'x̄ ± 1.96·σ/√n',
    'χ² = Σ(Oᵢ−Eᵢ)²/Eᵢ',
    'H₀ : μ = μ₀',
    'E[X] = Σ xᵢ·p(xᵢ)',
    'SE = σ/√n',
    '1 − β  = Power',
    'r = Σ(xᵢ−x̄)(yᵢ−ȳ)/…',
    't = (x̄ − μ₀)/(s/√n)',
  ];
  const floats=FORMULAS.map(t=>({
    t,
    x:Math.random()*W, y:Math.random()*H,
    vx:(Math.random()-.5)*.25, vy:(Math.random()-.5)*.12,
    op:0.32+Math.random()*0.18,
    sz:10+Math.random()*5,
  }));

  // --- particle cloud that morphs into meaningful shapes ---
  const N=100;
  const pts=Array.from({length:N},()=>({
    x:Math.random()*W, y:Math.random()*H,
    tx:0, ty:0, vx:0, vy:0, col:themeColors().cyan
  }));

  // Stage — fixed aspect-ratio virtual box, always centered, scaled to fit viewport.
  // All shape functions draw into this stage, so they stay centered & uncropped regardless of viewport.
  function stage(){
    const aspect=1.7; // virtual stage aspect (wider than tall)
    let sw,sh;
    if(W/H>aspect){ sh=H*0.74; sw=sh*aspect; }
    else { sw=W*0.92; sh=sw/aspect; }
    return {sx:(W-sw)/2, sy:(H-sh)/2, sw, sh, cx:W/2, cy:H/2};
  }

  // target shape generators (stage-relative)
  function bell(i,n){
    const s=stage(); const u=i/(n-1);
    const x=s.sx+u*s.sw;
    const z=(u-0.5)*6;
    const y=s.sy+s.sh*0.78 - Math.exp(-z*z/2)*s.sh*0.55;
    return [x,y,themeColors().cyan];
  }
  function scatter(i,n){
    const s=stage(); const u=i/(n-1);
    const x=s.sx+u*s.sw;
    const y=s.sy+s.sh*0.85 - u*s.sh*0.7 + (Math.random()-0.5)*s.sh*0.08;
    const col=i%9===0?themeColors().magenta:themeColors().purple;
    return [x,y,col];
  }
  function bayesGrid(i,n){
    const s=stage();
    const cols=10, rows=Math.ceil(n/cols);
    const ix=i%cols, iy=Math.floor(i/cols);
    const gridW=Math.min(s.sw*0.5, s.sh*1.0), gridH=gridW;
    const cw=gridW/cols, ch=gridH/rows;
    const x0=s.cx-gridW/2, y0=s.cy-gridH/2;
    const col=(i<20)?themeColors().cyan:(i<30)?themeColors().magenta:withAlpha(themeColors().dim,0.6);
    return [x0+ix*cw+cw/2, y0+iy*ch+ch/2, col];
  }
  function ciBars(i,n){
    const s=stage();
    const rows=n/2;
    const r=Math.floor(i/2);
    const side=i%2;
    const spread=(Math.random()-0.5)*s.sw*0.28;
    const x=s.cx+spread+(side?s.sw*0.09:-s.sw*0.09);
    const y=s.sy+s.sh*0.12+r*(s.sh*0.72/rows);
    const captured=Math.abs(spread)<s.sw*0.12;
    const col=captured?withAlpha(themeColors().cyan,0.9):themeColors().magenta;
    return [x,y,col];
  }
  function tWave(i,n){
    const s=stage(); const u=i/(n-1);
    const x=s.sx+u*s.sw;
    const z=(u-0.5)*8;
    const y=s.sy+s.sh*0.65 - (1/(1+z*z/3))*s.sh*0.42;
    return [x,y,themeColors().yellow];
  }

  const shapes=[bell,scatter,bayesGrid,ciBars,tWave];
  let phase=0, t0=performance.now();
  function setTarget(){
    const idx=phase%shapes.length;
    const fn=shapes[idx];
    pts.forEach((p,i)=>{const [tx,ty,col]=fn(i,N);p.tx=tx;p.ty=ty;p.col=col||themeColors().cyan;});
    t0=performance.now();
    phase++;
  }
  setTarget();

  const CYCLE=3.6; // seconds per shape (×1.5 faster)

  function loop(now){
    ctx.clearRect(0,0,W,H);
    const elapsed=(now-t0)/1000;
    const progress=Math.min(1,elapsed/2.53); // migration progress (×1.5 faster)
    // when progress=1 we hold briefly then move to next
    if(elapsed>CYCLE) setTarget();

    // formula layer — gradually fades OUT as particles converge
    const fFade=1-progress*0.6;
    floats.forEach(f=>{
      f.x+=f.vx; f.y+=f.vy;
      if(f.x<-300) f.x=W+200;
      if(f.x>W+200) f.x=-200;
      if(f.y<-40) f.y=H+20;
      if(f.y>H+40) f.y=-20;
      ctx.fillStyle=withAlpha(themeColors().purple,f.op*fFade);
      ctx.font=`italic ${f.sz}px "Courier New",monospace`;
      ctx.fillText(f.t,f.x,f.y);
    });

    // particle update — easing toward target
    const stiffness=0.0035+progress*0.01;
    const damping=0.86;
    pts.forEach(p=>{
      const dx=p.tx-p.x, dy=p.ty-p.y;
      p.vx=(p.vx+dx*stiffness)*damping;
      p.vy=(p.vy+dy*stiffness)*damping;
      p.x+=p.vx; p.y+=p.vy;
    });

    // connecting lines — intensify as they converge
    const linkDist=60+progress*40;
    for(let i=0;i<N;i++){
      for(let j=i+1;j<N;j++){
        const a=pts[i],b=pts[j];
        const d=Math.hypot(a.x-b.x,a.y-b.y);
        if(d<linkDist){
          const alpha=(1-d/linkDist)*(0.15+progress*0.25);
          ctx.strokeStyle=withAlpha(themeColors().cyan,alpha);
          ctx.lineWidth=0.6;
          ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
        }
      }
    }

    // dots
    pts.forEach(p=>{
      ctx.fillStyle=p.col;
      ctx.shadowBlur=document.body.classList.contains('theme-light')?1+progress*2:8+progress*6;
      ctx.shadowColor=p.col;
      ctx.beginPath();ctx.arc(p.x,p.y,1.8+progress*0.8,0,TAU);ctx.fill();
    });
    ctx.shadowBlur=0;

    if(running) rafId=requestAnimationFrame(loop);
  }
  let running=true, rafId=0;
  if(window.__REDUCED_MOTION){
    setTarget();
    pts.forEach(p=>{p.x=p.tx;p.y=p.ty;});
    loop(performance.now());
  } else {
    rafId=requestAnimationFrame(loop);
  }
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){running=false;cancelAnimationFrame(rafId);}
    else{running=true;t0=performance.now();rafId=requestAnimationFrame(loop);}
  });
  window.addEventListener('prefs:change',()=>{
    if(window.__REDUCED_MOTION){running=false;cancelAnimationFrame(rafId);}
  });
}
