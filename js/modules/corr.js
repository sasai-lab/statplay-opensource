// StatPlay — module: CORRELATION & SCATTER PLOTS
import { $, TAU, rng_normal, resizeCanvas, drawGrid, neonLine, themeColors, withAlpha, debouncedResize } from '../utils.js';

export function initCorr(){
  if(!document.getElementById('corrCanvas')) return;
  const canvas=$('corrCanvas');
  canvas.style.cursor='crosshair';

  // Store points in normalized coords (nx, ny) ∈ [0,1]
  const pts=[];

  // --- Controls ---
  const slR=$('corrR'), slN=$('corrN');
  const btnGen=$('corrGen'), btnClear=$('corrClear');

  // --- Click to add individual points ---
  canvas.addEventListener('click',e=>{
    const r=canvas.getBoundingClientRect();
    const nx=(e.clientX-r.left)/r.width;
    const ny=(e.clientY-r.top)/r.height;
    pts.push({nx,ny,t:0});
    animate();
  });

  // --- Drag to add points continuously ---
  let dragging=false;
  canvas.addEventListener('mousedown',e=>{
    dragging=true;
  });
  canvas.addEventListener('mousemove',e=>{
    if(!dragging) return;
    const r=canvas.getBoundingClientRect();
    const nx=(e.clientX-r.left)/r.width;
    const ny=(e.clientY-r.top)/r.height;
    if(nx>=0&&nx<=1&&ny>=0&&ny<=1){
      pts.push({nx,ny,t:0});
      animate();
    }
  });
  canvas.addEventListener('mouseup',()=>{dragging=false;});
  canvas.addEventListener('mouseleave',()=>{dragging=false;});

  // --- Generate correlated data via Cholesky decomposition ---
  btnGen.onclick=()=>{
    pts.length=0;
    const targetR=parseFloat(slR.value);
    const n=parseInt(slN.value,10);
    // Generate x ~ N(0,1), e ~ N(0,1)
    // y = r*x + sqrt(1 - r²)*e  (Cholesky)
    const xs=[],ys=[];
    for(let i=0;i<n;i++){
      const x=rng_normal(0,1);
      const e=rng_normal(0,1);
      const y=targetR*x+Math.sqrt(Math.max(0,1-targetR*targetR))*e;
      xs.push(x); ys.push(y);
    }
    // Scale to [0.1, 0.9] in normalized coords
    const xMin=Math.min(...xs),xMax=Math.max(...xs);
    const yMin=Math.min(...ys),yMax=Math.max(...ys);
    const xRange=xMax-xMin||1, yRange=yMax-yMin||1;
    for(let i=0;i<n;i++){
      const nx=0.1+0.8*(xs[i]-xMin)/xRange;
      // Invert y so positive correlation slopes upward visually
      const ny=0.9-0.8*(ys[i]-yMin)/yRange;
      pts.push({nx,ny,t:0});
    }
    animate();
  };

  // --- Clear ---
  btnClear.onclick=()=>{pts.length=0;draw();};

  // --- Slider change: update display values only ---
  if(slR) slR.addEventListener('input',()=>{
    const el=$('corrTargetR');
    if(el) el.textContent=parseFloat(slR.value).toFixed(2);
  });
  if(slN) slN.addEventListener('input',()=>{
    const el=$('corrTargetN');
    if(el) el.textContent=slN.value;
  });

  // --- Entry animation (t: 0→1) ---
  function animate(){let f=0;function loop(){f++;
    pts.forEach(p=>{p.t=Math.min(1,p.t+0.08);});
    draw();
    if(pts.some(p=>p.t<1)&&f<60) requestAnimationFrame(loop);
  }loop();}

  // Redraw on resize
  window.addEventListener('resize',debouncedResize(draw));

  function draw(){
    const {ctx,w,h} = resizeCanvas(canvas);
    drawGrid(ctx,w,h);
    const tc = themeColors();
    const en=window.__LANG==='en';

    // Empty state hint
    if(pts.length===0){
      ctx.fillStyle=tc.dim;ctx.font='14px "Courier New"';
      ctx.fillText(en?'Click canvas to add points, or press Generate':'キャンバスをクリックで点を追加、または生成ボタン',20,30);

      // Anscombe hint
      ctx.fillStyle=withAlpha(tc.yellow,0.6);ctx.font='12px "Courier New"';
      ctx.fillText(en
        ?'Anscombe\'s quartet: same r \u2248 0.816, very different patterns!'
        :'アンスコムの例: 同じ r \u2248 0.816 でもパターンは全く異なる',20,h-16);

      updateStats(0,0,0,0);
      return;
    }

    // Convert normalized coords to pixel coords
    const render=pts.map(p=>({...p, rx:p.nx*w, ry:p.ny*h}));
    const n=render.length;

    // Compute statistics in normalized space for accuracy
    let sx=0,sy=0,sxy=0,sxx=0,syy=0;
    pts.forEach(p=>{
      sx+=p.nx; sy+=p.ny;
      sxy+=p.nx*p.ny;
      sxx+=p.nx*p.nx;
      syy+=p.ny*p.ny;
    });
    const mx=sx/n, my=sy/n;
    const varX=sxx/n-mx*mx;
    const varY=syy/n-my*my;
    const covXY=sxy/n-mx*my;
    const denR=Math.sqrt(varX*varY);
    const r=denR===0?0:covXY/denR;
    const R2=r*r;

    // Regression in pixel space for drawing the line
    let psx=0,psy=0,psxy=0,psxx=0;
    render.forEach(p=>{psx+=p.rx;psy+=p.ry;psxy+=p.rx*p.ry;psxx+=p.rx*p.rx;});
    const pmx=psx/n, pmy=psy/n;
    const pdenom=psxx-n*pmx*pmx;
    const b1=pdenom===0?0:(psxy-n*pmx*pmy)/pdenom;
    const b0=pmy-b1*pmx;

    // Mean lines (yellow, dashed)
    ctx.strokeStyle=withAlpha(tc.yellow,0.4);
    ctx.setLineDash([4,4]);ctx.lineWidth=1;
    // Vertical mean line
    ctx.beginPath();ctx.moveTo(pmx,0);ctx.lineTo(pmx,h);ctx.stroke();
    // Horizontal mean line
    ctx.beginPath();ctx.moveTo(0,pmy);ctx.lineTo(w,pmy);ctx.stroke();
    ctx.setLineDash([]);

    // Regression line (cyan, dashed)
    ctx.setLineDash([6,4]);
    neonLine(ctx,[[0,b0],[w,b0+b1*w]],tc.cyan,tc.light?2:10,2);
    ctx.setLineDash([]);

    // Points (magenta)
    render.forEach(p=>{
      const rad=4+2*(1-p.t);
      const alpha=0.4+0.6*p.t;
      ctx.fillStyle=withAlpha(tc.magenta,alpha);
      ctx.shadowBlur=tc.light?2:14;ctx.shadowColor=tc.magenta;
      ctx.beginPath();ctx.arc(p.rx,p.ry,rad,0,TAU);ctx.fill();
      ctx.shadowBlur=0;
    });

    // Axis labels
    ctx.fillStyle=withAlpha(tc.text,0.5);ctx.font='11px "Courier New"';
    ctx.fillText('x',w-14,pmy-6);
    ctx.fillText('y',pmx+6,14);

    // Anscombe reminder (bottom-left)
    ctx.fillStyle=withAlpha(tc.yellow,0.4);ctx.font='10px "Courier New"';
    ctx.fillText(en
      ?'Note: r alone doesn\'t capture nonlinear patterns (Anscombe\'s quartet)'
      :'注意: r だけでは非線形パターンを捉えられない（アンスコムの例）',8,h-6);

    updateStats(r,R2,n,covXY);
  }

  function updateStats(r,R2,n,cov){
    const el=k=>$(k);
    const rEl=el('corrRval'), r2El=el('corrR2val'), nEl=el('corrNval'), covEl=el('corrCov');
    if(rEl)  rEl.textContent =n>0?r.toFixed(4):'—';
    if(r2El) r2El.textContent=n>0?R2.toFixed(4):'—';
    if(nEl)  nEl.textContent =n;
    if(covEl)covEl.textContent=n>0?cov.toFixed(4):'—';
  }

  // Initial draw
  draw();
}
