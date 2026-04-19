// StatPlay — module: MULTIPLE REGRESSION - 3D plane with drag-to-rotate
import { $, TAU, rng_normal, rng_exp, rng_uniform, rng_bimodal, erf, normCDF, normPDF, zCritical, lgamma, gamma, tPDF, chi2PDF, fPDF, resizeCanvas, drawGrid, neonLine, neonFill, themeColors, withAlpha} from '../utils.js';

(function mreg(){
  const canvas=$('mregCanvas');
  if(!canvas) return;
  const b1S=$('mB1'),b2S=$('mB2'),sS=$('mS'),nS=$('mN'),gen=$('mGen');
  let rot={x:-0.35,y:0.55};
  let pts=[];const TRUE_B0=0.2;
  function bind(s,id,fmt){s.oninput=()=>{$(id).textContent=fmt(parseFloat(s.value));draw();};}
  bind(b1S,'mB1Val',v=>v.toFixed(2));
  bind(b2S,'mB2Val',v=>v.toFixed(2));
  bind(sS,'mSVal',v=>v.toFixed(2));
  bind(nS,'mNVal',v=>Math.round(v));
  function sample(){
    const n=parseInt(nS.value);const b1=parseFloat(b1S.value);const b2=parseFloat(b2S.value);const s=parseFloat(sS.value);
    pts=Array.from({length:n},()=>{
      const x1=(Math.random()-0.5)*4,x2=(Math.random()-0.5)*4;
      const y=TRUE_B0+b1*x1+b2*x2+rng_normal(0,s);
      return {x1,x2,y};
    });
    fitOLS();draw();
  }
  function fitOLS(){
    const n=pts.length;if(n<3){$('mE0').textContent='-';$('mE1').textContent='-';$('mE2').textContent='-';$('mR2').textContent='-';return;}
    let M=[[0,0,0],[0,0,0],[0,0,0]],v=[0,0,0];
    pts.forEach(p=>{
      const X=[1,p.x1,p.x2];
      for(let i=0;i<3;i++){for(let j=0;j<3;j++) M[i][j]+=X[i]*X[j]; v[i]+=X[i]*p.y;}
    });
    const det=M[0][0]*(M[1][1]*M[2][2]-M[1][2]*M[2][1])
             -M[0][1]*(M[1][0]*M[2][2]-M[1][2]*M[2][0])
             +M[0][2]*(M[1][0]*M[2][1]-M[1][1]*M[2][0]);
    if(Math.abs(det)<1e-9)return;
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
    mreg.estimate=b;
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
    const b=mreg.estimate||[0,parseFloat(b1S.value),parseFloat(b2S.value)];
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
    ctx.fillStyle=tc.dim;ctx.font='11px "Courier New"';
    ctx.fillText(window.__LANG==='en'?'Drag to rotate':'ドラッグで回転',10,h-8);
  }
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
  gen.addEventListener('click',sample);
  sample();
})();
