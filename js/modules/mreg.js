// StatPlay — module: MULTIPLE REGRESSION - 3D plane with drag-to-rotate
import { $, TAU, rng_normal, rng_exp, rng_uniform, rng_bimodal, erf, normCDF, normPDF, zCritical, lgamma, gamma, tPDF, chi2PDF, fPDF, resizeCanvas, drawGrid, neonLine, neonFill, themeColors, withAlpha, throttledDraw} from '../utils.js';

(function mreg(){
  const canvas=$('mregCanvas');
  if(!canvas) return;
  const b1S=$('mB1'),b2S=$('mB2'),sS=$('mS'),nS=$('mN'),gen=$('mGen');
  let rot={x:-0.35,y:0.55};
  const TRUE_B0=0.2;
  const sched=throttledDraw(()=>draw());

  // Pool of pre-generated points: fixed x1, x2, epsilon (noise unit)
  const MAX_POOL=200;
  let pool=[];
  function regeneratePool(){
    pool=Array.from({length:MAX_POOL},()=>({
      x1:(Math.random()-0.5)*4,
      x2:(Math.random()-0.5)*4,
      eps:rng_normal(0,1)
    }));
  }
  regeneratePool();

  // Derive visible points from pool + current slider values
  function getPoints(){
    const n=Math.min(parseInt(nS.value),pool.length);
    const b1=parseFloat(b1S.value),b2=parseFloat(b2S.value),s=parseFloat(sS.value);
    const pts=[];
    for(let i=0;i<n;i++){
      const p=pool[i];
      pts.push({x1:p.x1, x2:p.x2, y:TRUE_B0+b1*p.x1+b2*p.x2+s*p.eps});
    }
    return pts;
  }

  function fitOLS(pts){
    const n=pts.length;
    if(n<3){$('mE0').textContent='-';$('mE1').textContent='-';$('mE2').textContent='-';$('mR2').textContent='-';return [0,0,0];}
    let M=[[0,0,0],[0,0,0],[0,0,0]],v=[0,0,0];
    pts.forEach(p=>{
      const X=[1,p.x1,p.x2];
      for(let i=0;i<3;i++){for(let j=0;j<3;j++) M[i][j]+=X[i]*X[j]; v[i]+=X[i]*p.y;}
    });
    const det=M[0][0]*(M[1][1]*M[2][2]-M[1][2]*M[2][1])
             -M[0][1]*(M[1][0]*M[2][2]-M[1][2]*M[2][0])
             +M[0][2]*(M[1][0]*M[2][1]-M[1][1]*M[2][0]);
    if(Math.abs(det)<1e-9) return [0,0,0];
    const inv=[[0,0,0],[0,0,0],[0,0,0]];
    inv[0][0]=(M[1][1]*M[2][2]-M[1][2]*M[2][1])/det;
    inv[0][1]=-(M[0][1]*M[2][2]-M[0][2]*M[2][1])/det;
    inv[0][2]=(M[0][1]*M[1][2]-M[0][2]*M[1][1])/det;
    inv[1][0]=-(M[1][0]*M[2][2]-M[1][2]*M[2][0])/det;
    inv[1][1]=(M[0][0]*M[2][2]-M[0][2]*M[2][0])/det;
    inv[1][2]=-(M[0][0]*M[1][2]-M[0][2]*M[1][0])/det;
    inv[2][0]=(M[1][0]*M[2][1]-M[1][1]*M[2][0])/det;
    inv[2][1]=-(M[0][0]*M[2][1]-M[0][1]*M[2][0])/det;
    inv[2][2]=(M[0][0]*M[1][1]-M[0][1]*M[1][0])/det;
    const b=[0,0,0];
    for(let i=0;i<3;i++)for(let j=0;j<3;j++) b[i]+=inv[i][j]*v[j];
    const ym=v[0]/n;let ssTot=0,ssRes=0;
    pts.forEach(p=>{const yhat=b[0]+b[1]*p.x1+b[2]*p.x2;ssTot+=(p.y-ym)**2;ssRes+=(p.y-yhat)**2;});
    const R2=1-ssRes/(ssTot||1);
    $('mE0').textContent=b[0].toFixed(3);$('mE1').textContent=b[1].toFixed(3);$('mE2').textContent=b[2].toFixed(3);
    $('mR2').textContent=R2.toFixed(3);
    return b;
  }

  function project(x,y,z,w,h){
    const cx=Math.cos(rot.x),sx=Math.sin(rot.x),cy=Math.cos(rot.y),sy=Math.sin(rot.y);
    let Y=y*cx - z*sx, Z=y*sx + z*cx;
    let X=x;
    const X2=X*cy + Z*sy; const Z2=-X*sy + Z*cy;
    const scale=Math.min(w,h)*0.32;
    return [w/2+X2*scale, h/2 - Y*scale - Z2*scale*0.1];
  }

  function draw(){
    const {ctx,w,h}=resizeCanvas(canvas);drawGrid(ctx,w,h);const tc=themeColors();
    const axes=[[[-2.5,0,0],[2.5,0,0],tc.cyan,'x1'],
                [[0,-2.5,0],[0,2.5,0],tc.magenta,'y'],
                [[0,0,-2.5],[0,0,2.5],tc.yellow,'x2']];
    axes.forEach(a=>{
      const p0=project(a[0][0],a[0][1],a[0][2],w,h);
      const p1=project(a[1][0],a[1][1],a[1][2],w,h);
      ctx.strokeStyle=a[2];ctx.lineWidth=1.2;ctx.globalAlpha=.55;
      ctx.beginPath();ctx.moveTo(p0[0],p0[1]);ctx.lineTo(p1[0],p1[1]);ctx.stroke();
      ctx.globalAlpha=1;
      ctx.fillStyle=a[2];ctx.font='11px "Courier New"';ctx.fillText(a[3],p1[0]+4,p1[1]-4);
    });
    const pts=getPoints();
    const b=fitOLS(pts);
    ctx.strokeStyle=withAlpha(tc.magenta,.45);ctx.lineWidth=1;
    const steps=8,lim=2.2;
    for(let i=-steps;i<=steps;i++){
      const u=i/steps*lim;
      const p0=project(u,b[0]+b[1]*u+b[2]*(-lim),-lim,w,h);
      const p1=project(u,b[0]+b[1]*u+b[2]*(lim),lim,w,h);
      ctx.beginPath();ctx.moveTo(p0[0],p0[1]);ctx.lineTo(p1[0],p1[1]);ctx.stroke();
      const q0=project(-lim,b[0]+b[1]*(-lim)+b[2]*u,u,w,h);
      const q1=project(lim,b[0]+b[1]*(lim)+b[2]*u,u,w,h);
      ctx.beginPath();ctx.moveTo(q0[0],q0[1]);ctx.lineTo(q1[0],q1[1]);ctx.stroke();
    }
    pts.forEach(p=>{
      const yhat=b[0]+b[1]*p.x1+b[2]*p.x2;
      const res=p.y-yhat;
      const pr=project(p.x1,p.y,p.x2,w,h);
      const pry=project(p.x1,yhat,p.x2,w,h);
      ctx.strokeStyle=res>=0?withAlpha(tc.green,.7):withAlpha(tc.magenta,.7);
      ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(pr[0],pr[1]);ctx.lineTo(pry[0],pry[1]);ctx.stroke();
      ctx.fillStyle=tc.cyan;ctx.shadowBlur=tc.light?1:8;ctx.shadowColor=tc.cyan;
      ctx.beginPath();ctx.arc(pr[0],pr[1],3,0,TAU);ctx.fill();ctx.shadowBlur=0;
    });
    // annotation: regression equation + R²
    const pts2=getPoints();const b2=fitOLS(pts2);
    let ss_res=0,ss_tot=0;const ybar=pts2.reduce((s,p)=>s+p.y,0)/pts2.length;
    pts2.forEach(p=>{const yhat=b2[0]+b2[1]*p.x1+b2[2]*p.x2;ss_res+=(p.y-yhat)**2;ss_tot+=(p.y-ybar)**2;});
    const R2=ss_tot>0?1-ss_res/ss_tot:0;
    ctx.fillStyle=tc.cyan;ctx.font='bold 11px "Courier New"';
    ctx.fillText(`ŷ = ${b2[0].toFixed(2)} ${b2[1]>=0?'+ ':'− '}${Math.abs(b2[1]).toFixed(2)}x₁ ${b2[2]>=0?'+ ':'− '}${Math.abs(b2[2]).toFixed(2)}x₂`,10,18);
    ctx.fillStyle=withAlpha(tc.yellow,.9);
    ctx.fillText(`R² = ${R2.toFixed(3)}`,10,34);
    ctx.fillStyle=tc.dim;ctx.font='11px "Courier New"';
    ctx.fillText(window.__LANG==='en'?'Drag to rotate':'ドラッグで回転',10,h-8);
  }

  // All sliders trigger live redraw
  [b1S,b2S,sS,nS].forEach(s=>{
    const origHandler=s.oninput;
    s.oninput=function(){
      if(origHandler) origHandler.call(this);
      sched();
    };
  });

  let dragging=false,lx=0,ly=0;
  canvas.addEventListener('pointerdown',e=>{dragging=true;canvas.setPointerCapture(e.pointerId);lx=e.clientX;ly=e.clientY;canvas.style.cursor='grabbing';});
  canvas.addEventListener('pointermove',e=>{
    if(!dragging) return;
    const dx=e.clientX-lx, dy=e.clientY-ly;lx=e.clientX;ly=e.clientY;
    rot.y+=dx*0.006;rot.x+=dy*0.006;
    rot.x=Math.max(-1.3,Math.min(1.3,rot.x));
    draw();
  });
  function end(){dragging=false;canvas.style.cursor='grab';}
  canvas.addEventListener('pointerup',end);
  canvas.addEventListener('pointercancel',end);
  gen.addEventListener('click',()=>{stopDemo();rot.x=-0.35;rot.y=0.55;regeneratePool();draw();});
  draw();

  // --- Guided demo ---
  let demoRunning=false, demoAbort=false;
  const section=canvas.closest('section');
  const guideEl=section?section.querySelector('.guided-steps'):null;
  const guideItems=guideEl?guideEl.querySelectorAll('li'):[];

  function stopDemo(){demoAbort=true;demoRunning=false;guideItems.forEach(li=>li.style.opacity='');}
  [b1S,b2S,sS,nS].forEach(s=>s.addEventListener('pointerdown',stopDemo));
  canvas.addEventListener('pointerdown',stopDemo);

  function wait(ms){return new Promise(r=>{const id=setTimeout(r,ms);const check=()=>{if(demoAbort){clearTimeout(id);r();}};setTimeout(check,50);});}

  function animateSlider(slider,target,valId,fmt,duration){
    return new Promise(resolve=>{
      const start=parseFloat(slider.value), diff=target-start;
      if(Math.abs(diff)<0.001){resolve();return;}
      const t0=performance.now();
      function tick(now){
        if(demoAbort){resolve();return;}
        const t=Math.min(1,(now-t0)/duration);
        const ease=t<0.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
        const v=start+diff*ease;
        slider.value=v;
        $(valId).textContent=fmt(v);
        draw();
        if(t<1) requestAnimationFrame(tick);
        else resolve();
      }
      requestAnimationFrame(tick);
    });
  }

  function highlightStep(idx){
    guideItems.forEach((li,i)=>{li.style.opacity=i===idx?'1':'0.3';});
  }

  async function runDemo(){
    if(demoRunning||window.__REDUCED_MOTION) return;
    demoRunning=true;demoAbort=false;

    const origB1=b1S.value, origB2=b2S.value, origS=sS.value, origN=nS.value;

    // Step 1: σ → 0 — points converge onto the plane
    highlightStep(0);
    await animateSlider(sS,0,'mSVal',v=>v.toFixed(2),2000);
    if(demoAbort){demoRunning=false;return;}
    await wait(2000);if(demoAbort){demoRunning=false;return;}

    // Step 2: σ → 0.5 — noise scatters points off the plane
    highlightStep(1);
    await animateSlider(sS,0.5,'mSVal',v=>v.toFixed(2),2000);
    if(demoAbort){demoRunning=false;return;}
    await wait(1500);if(demoAbort){demoRunning=false;return;}
    regeneratePool();draw();
    await wait(1500);if(demoAbort){demoRunning=false;return;}

    // Step 3: n → 10 (few points) → n → 200 (dense)
    highlightStep(2);
    await animateSlider(nS,10,'mNVal',v=>Math.round(v),1500);
    if(demoAbort){demoRunning=false;return;}
    await wait(1500);if(demoAbort){demoRunning=false;return;}
    regeneratePool();draw();
    await wait(1200);if(demoAbort){demoRunning=false;return;}
    await animateSlider(nS,200,'mNVal',v=>Math.round(v),2500);
    if(demoAbort){demoRunning=false;return;}
    await wait(2500);if(demoAbort){demoRunning=false;return;}

    // Step 4: β₁ → 0 — plane rotates as x1 loses effect
    highlightStep(3);
    await animateSlider(nS,40,'mNVal',v=>Math.round(v),1200);
    if(demoAbort){demoRunning=false;return;}
    await animateSlider(b1S,0,'mB1Val',v=>v.toFixed(2),2500);
    if(demoAbort){demoRunning=false;return;}
    await wait(2500);if(demoAbort){demoRunning=false;return;}

    // Restore
    guideItems.forEach(li=>li.style.opacity='');
    await animateSlider(b1S,parseFloat(origB1),'mB1Val',v=>v.toFixed(2),1500);
    await animateSlider(sS,parseFloat(origS),'mSVal',v=>v.toFixed(2),1200);
    await animateSlider(nS,parseInt(origN),'mNVal',v=>Math.round(v),1200);
    if(demoAbort){demoRunning=false;return;}
    regeneratePool();draw();
    demoRunning=false;
  }

})();
