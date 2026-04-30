// StatPlay — module: CORRELATION & SCATTER PLOTS
import { $, TAU, rng_normal, resizeCanvas, drawGrid, neonLine, themeColors, withAlpha, debouncedResize } from '../utils.js';

/* ============================================================
   Panel 1 — Main scatter plot with 4-quadrant coloring
   ============================================================ */
export function initCorr(){
  if(!document.getElementById('corrCanvas')) return;
  const canvas=$('corrCanvas');
  canvas.style.cursor='crosshair';

  const pts=[];

  const slR=$('corrR'), slN=$('corrN');
  const btnGen=$('corrGen'), btnClear=$('corrClear');

  // --- pointer helpers (mouse + touch) ---
  function canvasCoord(e){
    const r=canvas.getBoundingClientRect();
    const cx=e.clientX??e.touches?.[0]?.clientX;
    const cy=e.clientY??e.touches?.[0]?.clientY;
    if(cx==null) return null;
    return {nx:(cx-r.left)/r.width, ny:(cy-r.top)/r.height};
  }
  function inBounds(c){return c&&c.nx>=0&&c.nx<=1&&c.ny>=0&&c.ny<=1;}

  let dragging=false;

  canvas.addEventListener('pointerdown',e=>{
    canvas.setPointerCapture(e.pointerId);
    dragging=true;
    const c=canvasCoord(e);
    if(inBounds(c)){pts.push({nx:c.nx,ny:c.ny,t:0});animate();}
  });
  canvas.addEventListener('pointermove',e=>{
    if(!dragging) return;
    const c=canvasCoord(e);
    if(inBounds(c)){pts.push({nx:c.nx,ny:c.ny,t:0});animate();}
  });
  canvas.addEventListener('pointerup',()=>{dragging=false;});
  canvas.addEventListener('pointercancel',()=>{dragging=false;});

  // --- Generate correlated data (Cholesky) ---
  btnGen.onclick=()=>{
    pts.length=0;
    const targetR=parseFloat(slR.value);
    const n=parseInt(slN.value,10);
    const xs=[],ys=[];
    for(let i=0;i<n;i++){
      const x=rng_normal(0,1);
      const e=rng_normal(0,1);
      const y=targetR*x+Math.sqrt(Math.max(0,1-targetR*targetR))*e;
      xs.push(x); ys.push(y);
    }
    const xMin=Math.min(...xs),xMax=Math.max(...xs);
    const yMin=Math.min(...ys),yMax=Math.max(...ys);
    const xR=xMax-xMin||1, yR=yMax-yMin||1;
    for(let i=0;i<n;i++){
      const nx=0.1+0.8*(xs[i]-xMin)/xR;
      const ny=0.9-0.8*(ys[i]-yMin)/yR;
      pts.push({nx,ny,t:0});
    }
    animate();
  };

  btnClear.onclick=()=>{pts.length=0;draw();};

  if(slR) slR.addEventListener('input',()=>{
    const el=$('corrTargetR');
    if(el) el.textContent=parseFloat(slR.value).toFixed(2);
  });
  if(slN) slN.addEventListener('input',()=>{
    const el=$('corrTargetN');
    if(el) el.textContent=slN.value;
  });

  // URL param restore: re-generate after urlParams.js applies saved slider values
  const params=new URLSearchParams(location.search);
  if(params.has('corrR')||params.has('corrN')){
    setTimeout(()=>{
      if(slR){const el=$('corrTargetR');if(el)el.textContent=parseFloat(slR.value).toFixed(2);}
      if(slN){const el=$('corrTargetN');if(el)el.textContent=slN.value;}
      btnGen.click();
    },100);
  }

  function animate(){let f=0;(function loop(){f++;
    pts.forEach(p=>{p.t=Math.min(1,p.t+0.08);});
    draw();
    if(pts.some(p=>p.t<1)&&f<60) requestAnimationFrame(loop);
  })();}

  window.addEventListener('resize',debouncedResize(draw));

  function draw(){
    const {ctx,w,h}=resizeCanvas(canvas);
    if(!ctx) return;
    drawGrid(ctx,w,h);
    const tc=themeColors();
    const en=window.__LANG==='en';

    if(pts.length===0){
      ctx.fillStyle=tc.dim;ctx.font='14px "Courier New"';
      ctx.fillText(en?'Click canvas to add points, or press Generate'
                     :'キャンバスをクリックで点を追加、または生成ボタン',20,30);
      updateStats(0,0,0,0);
      return;
    }

    const n=pts.length;

    // stats in visual coordinates (vy = 1-ny so y goes up)
    let sx=0,sy=0,sxy=0,sxx=0,syy=0;
    pts.forEach(p=>{
      const vy=1-p.ny;
      sx+=p.nx; sy+=vy;
      sxy+=p.nx*vy; sxx+=p.nx*p.nx; syy+=vy*vy;
    });
    const mx=sx/n, my=sy/n;
    const varX=sxx/n-mx*mx, varY=syy/n-my*my;
    const covXY=sxy/n-mx*my;
    const den=Math.sqrt(varX*varY);
    const r=den===0?0:covXY/den;
    const R2=r*r;

    // mean pixel positions
    const pmx=mx*w, pmy=(1-my)*h;

    // --- 4-quadrant background ---
    // upper-right & lower-left = positive contribution (green)
    // upper-left  & lower-right = negative contribution (magenta)
    ctx.fillStyle=withAlpha(tc.green,0.05);
    ctx.fillRect(pmx,0,w-pmx,pmy);        // upper-right
    ctx.fillRect(0,pmy,pmx,h-pmy);         // lower-left
    ctx.fillStyle=withAlpha(tc.magenta,0.05);
    ctx.fillRect(0,0,pmx,pmy);             // upper-left
    ctx.fillRect(pmx,pmy,w-pmx,h-pmy);     // lower-right

    // quadrant point counts
    let qUR=0,qUL=0,qLR=0,qLL=0;
    pts.forEach(p=>{
      const px=p.nx*w, py=p.ny*h;
      if(px>=pmx&&py<=pmy) qUR++;
      else if(px<pmx&&py<=pmy) qUL++;
      else if(px>=pmx&&py>pmy) qLR++;
      else qLL++;
    });

    // mean lines (yellow dashed)
    ctx.strokeStyle=withAlpha(tc.yellow,0.4);
    ctx.setLineDash([4,4]);ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(pmx,0);ctx.lineTo(pmx,h);ctx.stroke();
    ctx.beginPath();ctx.moveTo(0,pmy);ctx.lineTo(w,pmy);ctx.stroke();
    ctx.setLineDash([]);

    // regression line (pixel space)
    const render=pts.map(p=>({rx:p.nx*w,ry:p.ny*h,t:p.t}));
    let psx=0,psy=0,psxy=0,psxx=0;
    render.forEach(p=>{psx+=p.rx;psy+=p.ry;psxy+=p.rx*p.ry;psxx+=p.rx*p.rx;});
    const prx=psx/n,pry=psy/n;
    const pd=psxx-n*prx*prx;
    const b1=pd===0?0:(psxy-n*prx*pry)/pd;
    const b0=pry-b1*prx;
    ctx.setLineDash([6,4]);
    neonLine(ctx,[[0,b0],[w,b0+b1*w]],tc.cyan,tc.light?2:10,2);
    ctx.setLineDash([]);

    // points
    render.forEach(p=>{
      const rad=4+2*(1-p.t);
      const a=0.4+0.6*p.t;
      ctx.fillStyle=withAlpha(tc.magenta,a);
      ctx.shadowBlur=tc.light?2:14;ctx.shadowColor=tc.magenta;
      ctx.beginPath();ctx.arc(p.rx,p.ry,rad,0,TAU);ctx.fill();
      ctx.shadowBlur=0;
    });

    // quadrant labels
    const pad=8;
    ctx.font='bold 11px "Courier New"';
    ctx.fillStyle=withAlpha(tc.green,0.7);
    ctx.fillText('+'+qUR, pmx+pad, pad+14);
    ctx.fillText('+'+qLL, pad, pmy+pad+14);
    ctx.fillStyle=withAlpha(tc.magenta,0.7);
    ctx.fillText('−'+qUL, pad, pad+14);
    ctx.fillText('−'+qLR, pmx+pad, pmy+pad+14);

    // r & R² on canvas
    ctx.fillStyle=tc.cyan;ctx.font='bold 14px "Courier New"';
    ctx.fillText('r = '+r.toFixed(3), w-120, 20);
    ctx.fillStyle=withAlpha(tc.yellow,0.9);ctx.font='bold 12px "Courier New"';
    ctx.fillText('R² = '+R2.toFixed(3), w-120, 36);

    // axis labels near mean lines
    ctx.fillStyle=withAlpha(tc.text,0.4);ctx.font='11px "Courier New"';
    ctx.fillText('x',w-14,pmy-6);
    ctx.fillText('y',pmx+6,14);

    updateStats(r,R2,n,covXY);
  }

  function updateStats(r,R2,n,cov){
    const rEl=$('corrRval'),r2El=$('corrR2val'),nEl=$('corrNval'),covEl=$('corrCov');
    if(rEl)  rEl.textContent=n>0?r.toFixed(4):'—';
    if(r2El) r2El.textContent=n>0?R2.toFixed(4):'—';
    if(nEl)  nEl.textContent=n;
    if(covEl) covEl.textContent=n>0?cov.toFixed(4):'—';
  }

  draw();
}

/* ============================================================
   Panel 2 — Anscombe's Quartet (sequential reveal animation)
   ============================================================ */
export function initCorrAnscombe(){
  if(!document.getElementById('anscombeCanvas')) return;
  const canvas=$('anscombeCanvas');

  const SETS=[
    {x:[10,8,13,9,11,14,6,4,12,7,5],y:[8.04,6.95,7.58,8.81,8.33,9.96,7.24,4.26,10.84,4.82,5.68],
     label:'I',ja:'直線的',en:'Linear'},
    {x:[10,8,13,9,11,14,6,4,12,7,5],y:[9.14,8.14,8.74,8.77,9.26,8.10,6.13,3.10,9.13,7.26,4.74],
     label:'II',ja:'曲線的',en:'Curvilinear'},
    {x:[10,8,13,9,11,14,6,4,12,7,5],y:[7.46,6.77,12.74,7.11,7.81,8.84,6.08,5.39,8.15,6.42,5.73],
     label:'III',ja:'外れ値 1つ',en:'One outlier'},
    {x:[8,8,8,8,8,8,8,19,8,8,8],y:[6.58,5.76,7.71,8.84,8.47,7.04,5.25,12.50,5.56,7.91,6.89],
     label:'IV',ja:'1点が支配',en:'High leverage'}
  ];

  // precompute regression stats
  const ST=SETS.map(ds=>{
    const nn=ds.x.length;
    let sx=0,sy=0,sxy=0,sxx=0,syy=0;
    for(let i=0;i<nn;i++){sx+=ds.x[i];sy+=ds.y[i];sxy+=ds.x[i]*ds.y[i];sxx+=ds.x[i]*ds.x[i];syy+=ds.y[i]*ds.y[i];}
    const mx=sx/nn,my=sy/nn,dd=sxx-nn*mx*mx;
    const b1=dd===0?0:(sxy-nn*mx*my)/dd;
    const d2=Math.sqrt((sxx-nn*mx*mx)*(syy-nn*my*my));
    return {b0:my-b1*mx, b1, r:d2===0?0:(sxy-nn*mx*my)/d2};
  });


  // --- animation state ---
  const N=11;
  function fa(n,v){const a=new Float32Array(n);a.fill(v);return a;}
  const reveal=[N,N,N,N];
  const ptT=[fa(N,1),fa(N,1),fa(N,1),fa(N,1)];
  const rFade=[1,1,1,1];
  let lineFade=1;
  let animId=0;

  const btnReplay=$('anscombeReplay');

  function startAnim(){
    const myId=++animId;
    reveal.fill(0); rFade.fill(0); lineFade=0;
    for(let s=0;s<4;s++) ptT[s].fill(0);

    let cur=0,frame=0,pause=0;
    (function loop(){
      if(myId!==animId) return;
      frame++;
      if(pause>0) pause--;
      else if(cur<4){
        if(frame%5===0&&reveal[cur]<N) reveal[cur]++;
        if(reveal[cur]>=N){cur++;if(cur<4) pause=35;}
      }
      let moving=false;
      for(let s=0;s<4;s++){
        for(let i=0;i<reveal[s];i++)
          if(ptT[s][i]<1){ptT[s][i]=Math.min(1,ptT[s][i]+0.12);moving=true;}
        if(reveal[s]>=N&&rFade[s]<1){rFade[s]=Math.min(1,rFade[s]+0.05);moving=true;}
      }
      if(rFade.every(v=>v>=1)&&lineFade<1){lineFade=Math.min(1,lineFade+0.03);moving=true;}
      draw();
      if(cur<4||moving) requestAnimationFrame(loop);
    })();
  }

  if(btnReplay) btnReplay.onclick=startAnim;

  window.addEventListener('resize',debouncedResize(draw));

  const DX0=2,DX1=21,DY0=2,DY1=14;

  function subplot(ctx,ox,oy,pw,ph,ds,si,tc,en){
    ctx.strokeStyle=withAlpha(tc.dim,0.3);ctx.lineWidth=1;
    ctx.strokeRect(ox,oy,pw,ph);

    const count=reveal[si];
    if(count===0) return;

    ctx.strokeStyle=withAlpha(tc.dim,0.06);
    const gx=pw/5,gy=ph/4;
    for(let i=1;i<5;i++){ctx.beginPath();ctx.moveTo(ox+gx*i,oy);ctx.lineTo(ox+gx*i,oy+ph);ctx.stroke();}
    for(let i=1;i<4;i++){ctx.beginPath();ctx.moveTo(ox,oy+gy*i);ctx.lineTo(ox+pw,oy+gy*i);ctx.stroke();}

    const toX=v=>ox+(v-DX0)/(DX1-DX0)*pw;
    const toY=v=>oy+ph-(v-DY0)/(DY1-DY0)*ph;

    const drawLineAlpha=lineFade;
    if(drawLineAlpha>0&&count>=N){
      ctx.save();ctx.setLineDash([4,3]);ctx.globalAlpha=drawLineAlpha;
      ctx.beginPath();ctx.rect(ox,oy,pw,ph);ctx.clip();
      neonLine(ctx,[[toX(DX0),toY(ST[si].b0+ST[si].b1*DX0)],[toX(DX1),toY(ST[si].b0+ST[si].b1*DX1)]],tc.cyan,tc.light?2:8,1.5);
      ctx.setLineDash([]);ctx.globalAlpha=1;ctx.restore();
    }

    for(let i=0;i<count;i++){
      const t=ptT[si][i];
      const rad=3.5+1.5*(1-t);
      const alpha=0.3+0.7*t;
      const px=toX(ds.x[i]),py=toY(ds.y[i]);
      ctx.fillStyle=withAlpha(tc.magenta,alpha);
      ctx.shadowBlur=tc.light?1:10*(0.3+0.7*t);ctx.shadowColor=tc.magenta;
      ctx.beginPath();ctx.arc(px,py,rad,0,TAU);ctx.fill();
      ctx.shadowBlur=0;
    }

    ctx.fillStyle=tc.cyan;ctx.font='bold 13px "Courier New"';
    ctx.fillText(ds.label,ox+6,oy+16);
    ctx.fillStyle=withAlpha(tc.text,0.55);ctx.font='10px "Courier New"';
    ctx.fillText(en?ds.en:ds.ja,ox+26,oy+16);

    if(rFade[si]>0){
      ctx.fillStyle=withAlpha(tc.yellow,0.9*rFade[si]);ctx.font='bold 16px "Courier New"';
      ctx.fillText('r = '+ST[si].r.toFixed(3),ox+pw-110,oy+ph-10);
    }
  }

  function draw(){
    const {ctx,w,h}=resizeCanvas(canvas);
    if(!ctx) return;
    drawGrid(ctx,w,h);
    const tc=themeColors();
    const en=window.__LANG==='en';

    const GAP=12;
    const P={t:8,r:8,b:20,l:8};
    const pw=(w-P.l-P.r-GAP)/2;
    const ph=(h-P.t-P.b-GAP)/2;

    const O=[
      {x:P.l,y:P.t},{x:P.l+pw+GAP,y:P.t},
      {x:P.l,y:P.t+ph+GAP},{x:P.l+pw+GAP,y:P.t+ph+GAP}
    ];

    for(let i=0;i<4;i++) subplot(ctx,O[i].x,O[i].y,pw,ph,SETS[i],i,tc,en);

    if(reveal.every(r=>r>=N)){
      ctx.fillStyle=withAlpha(tc.yellow,0.45*Math.min(...rFade));ctx.font='10px "Courier New"';
      ctx.fillText(en
        ?'All four: x̄=9.0  ȳ≈7.5  r≈0.816  ŷ≈3.0+0.5x'
        :'4つとも: x̄=9.0  ȳ≈7.5  r≈0.816  ŷ≈3.0+0.5x'
      ,P.l+4,h-6);
    }
  }

  draw();
}
