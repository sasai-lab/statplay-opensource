// StatPlay — module: MULTIPLE REGRESSION — 3D regression plane
import { $, TAU, rng_normal, resizeCanvas, drawGrid, themeColors, withAlpha, throttledDraw } from '../utils.js';

export function initMreg(){
  const canvas=$('mregCanvas');
  if(!canvas) return;
  const studyS=$('mStudy'),sleepS=$('mSleep'),gen=$('mGen');
  if(!studyS||!sleepS) return;

  const TRUE_B0=40,TRUE_B1=3,TRUE_B2=2,NOISE=5,N=60;
  const X1MIN=1,X1MAX=9,X2MIN=4,X2MAX=10,YMIN=30,YMAX=100;
  let pool=[];

  function regeneratePool(){
    pool=Array.from({length:N},()=>{
      const x1=Math.random()*(X1MAX-X1MIN)+X1MIN;
      const x2=Math.random()*(X2MAX-X2MIN)+X2MIN;
      return {x1,x2,y:Math.max(YMIN,Math.min(YMAX,TRUE_B0+TRUE_B1*x1+TRUE_B2*x2+rng_normal(0,NOISE)))};
    });
  }
  regeneratePool();

  function fitOLS(pts){
    const n=pts.length;
    if(n<3) return [0,0,0,0];
    let M=[[0,0,0],[0,0,0],[0,0,0]],v=[0,0,0];
    pts.forEach(p=>{
      const X=[1,p.x1,p.x2];
      for(let i=0;i<3;i++){for(let j=0;j<3;j++) M[i][j]+=X[i]*X[j]; v[i]+=X[i]*p.y;}
    });
    const det=M[0][0]*(M[1][1]*M[2][2]-M[1][2]*M[2][1])
             -M[0][1]*(M[1][0]*M[2][2]-M[1][2]*M[2][0])
             +M[0][2]*(M[1][0]*M[2][1]-M[1][1]*M[2][0]);
    if(Math.abs(det)<1e-9) return [0,0,0,0];
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
    const ym=v[0]/n;
    let ssTot=0,ssRes=0;
    pts.forEach(p=>{const yhat=b[0]+b[1]*p.x1+b[2]*p.x2;ssTot+=(p.y-ym)**2;ssRes+=(p.y-yhat)**2;});
    return [b[0],b[1],b[2],1-ssRes/(ssTot||1)];
  }

  let cachedB=[0,0,0,0];
  let azimuth=0.65, elevation=0.45;
  let isDragging=false, lastPX=0, lastPY=0;
  let autoRotate=true, spinId=0;

  function updateData(){ cachedB=fitOLS(pool); }

  // 3D projection
  function norm(val,lo,hi){ return 2*(val-lo)/(hi-lo)-1; }

  function project(nx,ny,nz,cx,cy,sz){
    const ca=Math.cos(azimuth),sa=Math.sin(azimuth);
    let rx=nx*ca-nz*sa, rz=nx*sa+nz*ca, ry=ny;
    const ce=Math.cos(elevation),se=Math.sin(elevation);
    const ry2=ry*ce-rz*se, rz2=ry*se+rz*ce;
    const d=3.8, f=d/(d+rz2+2);
    return {sx:cx+rx*f*sz, sy:cy-ry2*f*sz, depth:rz2};
  }

  function draw(){
    const {ctx,w,h}=resizeCanvas(canvas);
    if(!ctx) return;
    drawGrid(ctx,w,h);
    const tc=themeColors();
    const ja=window.__LANG!=='en';
    const b=cachedB;

    const cx=w*0.5, cy=h*0.48;
    const sz=Math.min(w,h)*0.44;

    // Floor grid (x1-x2 plane at y=-1)
    ctx.strokeStyle=withAlpha(tc.dim,0.1);ctx.lineWidth=1;
    for(let i=0;i<=4;i++){
      const t=-1+i*0.5;
      const a=project(t,-1,-1,cx,cy,sz), b2=project(t,-1,1,cx,cy,sz);
      ctx.beginPath();ctx.moveTo(a.sx,a.sy);ctx.lineTo(b2.sx,b2.sy);ctx.stroke();
      const c=project(-1,-1,t,cx,cy,sz), d2=project(1,-1,t,cx,cy,sz);
      ctx.beginPath();ctx.moveTo(c.sx,c.sy);ctx.lineTo(d2.sx,d2.sy);ctx.stroke();
    }

    // 3 axes
    const o=project(-1,-1,-1,cx,cy,sz);
    const axX=project(1,-1,-1,cx,cy,sz);
    const axY=project(-1,1,-1,cx,cy,sz);
    const axZ=project(-1,-1,1,cx,cy,sz);
    ctx.strokeStyle=withAlpha(tc.dim,0.4);ctx.lineWidth=1;
    [[o,axX],[o,axY],[o,axZ]].forEach(([a,b2])=>{
      ctx.beginPath();ctx.moveTo(a.sx,a.sy);ctx.lineTo(b2.sx,b2.sy);ctx.stroke();
    });

    // Axis labels
    ctx.font='11px "Courier New"';ctx.textAlign='center';
    const lx=project(1.15,-1,-1,cx,cy,sz);
    ctx.fillStyle=tc.cyan;
    ctx.fillText(ja?'勉強(h)':'Study(h)',lx.sx,lx.sy+14);
    const lz=project(-1,-1,1.15,cx,cy,sz);
    ctx.fillStyle=tc.cyan;
    ctx.fillText(ja?'睡眠(h)':'Sleep(h)',lz.sx,lz.sy+14);
    const ly=project(-1.15,1.1,-1,cx,cy,sz);
    ctx.fillStyle=tc.dim;
    ctx.fillText(ja?'点数':'Score',ly.sx,ly.sy);

    // Axis ticks
    ctx.font='9px "Courier New"';ctx.fillStyle=withAlpha(tc.dim,0.5);
    for(let v=X1MIN;v<=X1MAX;v+=2){
      const t=norm(v,X1MIN,X1MAX);
      const p=project(t,-1,-1.08,cx,cy,sz);
      ctx.fillText(v,p.sx,p.sy+10);
    }
    for(let v=X2MIN;v<=X2MAX;v+=2){
      const t=norm(v,X2MIN,X2MAX);
      const p=project(-1.08,-1,t,cx,cy,sz);
      ctx.fillText(v,p.sx,p.sy+10);
    }
    for(let v=YMIN;v<=YMAX;v+=20){
      const t=norm(v,YMIN,YMAX);
      const p=project(-1.1,t,-1,cx,cy,sz);
      ctx.textAlign='right';
      ctx.fillText(v,p.sx-2,p.sy+3);
    }
    ctx.textAlign='center';

    // Regression plane as mesh
    const planeN=8;
    const planeQuads=[];
    for(let i=0;i<planeN;i++){
      for(let j=0;j<planeN;j++){
        const corners=[[i,j],[i+1,j],[i+1,j+1],[i,j+1]].map(([ci,cj])=>{
          const x1=X1MIN+ci/planeN*(X1MAX-X1MIN);
          const x2=X2MIN+cj/planeN*(X2MAX-X2MIN);
          const yhat=b[0]+b[1]*x1+b[2]*x2;
          const nx=norm(x1,X1MIN,X1MAX), ny=norm(Math.max(YMIN,Math.min(YMAX,yhat)),YMIN,YMAX), nz=norm(x2,X2MIN,X2MAX);
          return project(nx,ny,nz,cx,cy,sz);
        });
        const avgD=(corners[0].depth+corners[1].depth+corners[2].depth+corners[3].depth)/4;
        planeQuads.push({corners,avgD});
      }
    }
    planeQuads.sort((a,b2)=>a.avgD-b2.avgD);
    planeQuads.forEach(q=>{
      ctx.fillStyle=withAlpha(tc.cyan,0.08);
      ctx.strokeStyle=withAlpha(tc.cyan,0.15);ctx.lineWidth=0.5;
      ctx.beginPath();
      q.corners.forEach((c,i)=>i===0?ctx.moveTo(c.sx,c.sy):ctx.lineTo(c.sx,c.sy));
      ctx.closePath();ctx.fill();ctx.stroke();
    });

    // Plane edge outline
    const pe=[
      [X1MIN,X2MIN],[X1MAX,X2MIN],[X1MAX,X2MAX],[X1MIN,X2MAX]
    ].map(([x1,x2])=>{
      const yhat=Math.max(YMIN,Math.min(YMAX,b[0]+b[1]*x1+b[2]*x2));
      return project(norm(x1,X1MIN,X1MAX),norm(yhat,YMIN,YMAX),norm(x2,X2MIN,X2MAX),cx,cy,sz);
    });
    ctx.strokeStyle=withAlpha(tc.cyan,0.5);ctx.lineWidth=1.5;
    ctx.beginPath();
    pe.forEach((p,i)=>i===0?ctx.moveTo(p.sx,p.sy):ctx.lineTo(p.sx,p.sy));
    ctx.closePath();ctx.stroke();

    // Prepare data points with projection
    const sv=parseFloat(studyS.value),sl=parseFloat(sleepS.value);
    const projected=pool.map(p=>{
      const yhat=b[0]+b[1]*p.x1+b[2]*p.x2;
      const nx=norm(p.x1,X1MIN,X1MAX), nz=norm(p.x2,X2MIN,X2MAX);
      const nyD=norm(p.y,YMIN,YMAX), nyH=norm(Math.max(YMIN,Math.min(YMAX,yhat)),YMIN,YMAX);
      const pp=project(nx,nyD,nz,cx,cy,sz);
      const ph=project(nx,nyH,nz,cx,cy,sz);
      return {...pp, hx:ph.sx, hy:ph.sy, residual:p.y-yhat};
    });
    projected.sort((a,b2)=>a.depth-b2.depth);

    // Residual lines + data points (back to front)
    projected.forEach(p=>{
      // Residual line
      ctx.setLineDash([2,3]);
      ctx.strokeStyle=withAlpha(p.residual>0?'#50fa7b':'#ff5555',0.35);
      ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(p.sx,p.sy);ctx.lineTo(p.hx,p.hy);ctx.stroke();
      ctx.setLineDash([]);

      // Data point
      const depthFade=0.3+0.5*(1-(p.depth+2)/4);
      const r=3+2*(1-(p.depth+2)/4);
      ctx.fillStyle=withAlpha(tc.cyan,depthFade);
      if(!isDragging){ctx.shadowBlur=tc.light?0:3;ctx.shadowColor=tc.cyan;}
      ctx.beginPath();ctx.arc(p.sx,p.sy,r,0,TAU);ctx.fill();
      ctx.shadowBlur=0;
    });

    // User prediction point on plane
    const userYhat=b[0]+b[1]*sv+b[2]*sl;
    const clampedY=Math.max(YMIN,Math.min(YMAX,userYhat));
    const up=project(norm(sv,X1MIN,X1MAX),norm(clampedY,YMIN,YMAX),norm(sl,X2MIN,X2MAX),cx,cy,sz);
    const uf=project(norm(sv,X1MIN,X1MAX),-1,norm(sl,X2MIN,X2MAX),cx,cy,sz);

    // Drop line to floor
    ctx.setLineDash([3,4]);
    ctx.strokeStyle=withAlpha(tc.magenta,0.25);ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(up.sx,up.sy);ctx.lineTo(uf.sx,uf.sy);ctx.stroke();
    ctx.setLineDash([]);

    // Floor crosshair
    ctx.fillStyle=withAlpha(tc.magenta,0.3);
    ctx.beginPath();ctx.arc(uf.sx,uf.sy,3,0,TAU);ctx.fill();

    // Prediction dot
    ctx.fillStyle=tc.magenta;
    if(!isDragging){ctx.shadowBlur=tc.light?0:16;ctx.shadowColor=tc.magenta;}
    ctx.beginPath();ctx.arc(up.sx,up.sy,7,0,TAU);ctx.fill();
    ctx.shadowBlur=0;

    // Drag hint
    if(autoRotate){
      ctx.fillStyle=withAlpha(tc.dim,0.4);ctx.font='11px "Courier New"';ctx.textAlign='center';
      ctx.fillText(ja?'↻ ドラッグで回転':'↻ drag to rotate',w/2,h-10);
    }
  }

  function updateUI(){
    const ja=window.__LANG!=='en';
    const b=cachedB;
    const sv=parseFloat(studyS.value),sl=parseFloat(sleepS.value);
    const pred=b[0]+b[1]*sv+b[2]*sl;

    const lbl=$('mPredLabel'),lblEn=$('mPredLabelEn'),big=$('mPredBig'),sub=$('mPredSub');
    const predTxt=ja
      ?'勉強'+sv.toFixed(1)+'h＋睡眠'+sl.toFixed(1)+'h → '
      :'Study '+sv.toFixed(1)+'h + Sleep '+sl.toFixed(1)+'h → ';
    if(lbl) lbl.textContent=predTxt;
    if(lblEn) lblEn.textContent=predTxt;
    if(big) big.textContent=Math.round(pred)+(ja?'点':' pts');
    if(sub) sub.textContent='ŷ = '+b[0].toFixed(1)+' + '+b[1].toFixed(1)+'×'+sv.toFixed(1)+' + '+b[2].toFixed(1)+'×'+sl.toFixed(1);

    const cs=$('mCoefStudy'),cl=$('mCoefSleep');
    if(cs) cs.textContent='+'+b[1].toFixed(1)+(ja?' 点/h':' pts/h');
    if(cl) cl.textContent='+'+b[2].toFixed(1)+(ja?' 点/h':' pts/h');

    const r2=$('mR2');
    if(r2) r2.textContent=b[3].toFixed(3);
  }

  function fullDraw(){ updateData(); draw(); updateUI(); }
  const schedDraw=throttledDraw(()=>{draw();updateUI();});

  // Pointer drag rotation
  canvas.addEventListener('pointerdown',e=>{
    if(autoRotate){ autoRotate=false; cancelAnimationFrame(spinId); }
    isDragging=true; lastPX=e.clientX; lastPY=e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove',e=>{
    if(!isDragging) return;
    azimuth+=(e.clientX-lastPX)*0.008;
    elevation=Math.max(-1.2,Math.min(1.2,elevation+(e.clientY-lastPY)*0.008));
    lastPX=e.clientX; lastPY=e.clientY;
    schedDraw();
  });
  canvas.addEventListener('pointerup',e=>{
    isDragging=false;
    canvas.releasePointerCapture(e.pointerId);
  });

  studyS.oninput=function(){$('mStudyVal').textContent=parseFloat(this.value).toFixed(1);schedDraw();};
  sleepS.oninput=function(){$('mSleepVal').textContent=parseFloat(this.value).toFixed(1);schedDraw();};
  gen.addEventListener('click',()=>{regeneratePool();fullDraw();});

  // Auto-rotation on load
  function spin(){
    if(!autoRotate) return;
    azimuth+=0.003;
    draw();
    spinId=requestAnimationFrame(spin);
  }

  fullDraw();
  spin();
}
