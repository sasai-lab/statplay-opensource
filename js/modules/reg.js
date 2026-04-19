// StatPlay — module: 7) REGRESSION
import { $, TAU, rng_normal, rng_exp, rng_uniform, rng_bimodal, erf, normCDF, normPDF, zCritical, lgamma, gamma, tPDF, chi2PDF, fPDF, resizeCanvas, drawGrid, neonLine, neonFill, themeColors, withAlpha, debouncedResize} from '../utils.js';

(function reg(){
  if(!document.getElementById('regCanvas')) return;
  const canvas=$('regCanvas');
  // Store points in normalized coords (nx, ny) ∈ [0,1]. Rendering always
  // recomputes pixel coords from the CURRENT canvas size, so resizing the
  // viewport immediately re-flows the scatter + regression line with no lag.
  const pts=[];
  canvas.addEventListener('click',e=>{
    const r=canvas.getBoundingClientRect();
    const nx=(e.clientX-r.left)/r.width, ny=(e.clientY-r.top)/r.height;
    pts.push({nx,ny,t:0});
    animate();
  });
  $('regRandom').onclick=()=>{pts.length=0;
    const slope=0.5+Math.random()*0.5;
    for(let i=0;i<20;i++){
      const nx=0.1+Math.random()*0.8;
      const baseY=0.85 - (nx-0.1)*slope*0.7;
      const ny=Math.max(0.02,Math.min(0.98, baseY + rng_normal(0,0.06)));
      pts.push({nx,ny,t:0});
    }
    animate();};
  $('regClear').onclick=()=>{pts.length=0;draw();};

  // Entry animation only (t: 0→1). No position interpolation — position is
  // derived directly from normalized coords each draw.
  function animate(){let f=0;function loop(){f++;
    pts.forEach(p=>{p.t=Math.min(1,p.t+0.08);});
    draw();
    if(pts.some(p=>p.t<1)&&f<60) requestAnimationFrame(loop);
  }loop();}

  // On resize, redraw immediately so points + line reflow without delay.
  window.addEventListener('resize',debouncedResize(draw));

  // Pedagogical axis: x ∈ [0, 10], y ∈ [0, 10] (canvas y is inverted)
  const AXIS_MAX = 10;
  const PAD = {left:40, right:10, top:10, bottom:30};

  function toCanvasX(x, w){ return PAD.left + x / AXIS_MAX * (w - PAD.left - PAD.right); }
  function toCanvasY(y, h){ return h - PAD.bottom - y / AXIS_MAX * (h - PAD.top - PAD.bottom); }
  function toDataX(px, w){ return (px - PAD.left) / (w - PAD.left - PAD.right) * AXIS_MAX; }
  function toDataY(py, h){ return (h - PAD.bottom - py) / (h - PAD.top - PAD.bottom) * AXIS_MAX; }

  function drawAxes(ctx, w, h, tc){
    ctx.strokeStyle = tc.dim; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PAD.left, PAD.top); ctx.lineTo(PAD.left, h - PAD.bottom);
    ctx.lineTo(w - PAD.right, h - PAD.bottom); ctx.stroke();
    ctx.fillStyle = tc.dim; ctx.font = '10px "Courier New"';
    for(let v = 0; v <= AXIS_MAX; v += 2){
      const px = toCanvasX(v, w), py = toCanvasY(v, h);
      ctx.fillText(v, px - 4, h - PAD.bottom + 14);
      ctx.fillText(v, PAD.left - 18, py + 3);
      ctx.strokeStyle = withAlpha(tc.dim, 0.2); ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(px, PAD.top); ctx.lineTo(px, h - PAD.bottom); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(PAD.left, py); ctx.lineTo(w - PAD.right, py); ctx.stroke();
      ctx.strokeStyle = tc.dim; ctx.lineWidth = 1;
    }
    ctx.fillStyle = tc.dim; ctx.font = '11px "Courier New"';
    ctx.fillText('x', w - PAD.right - 4, h - PAD.bottom + 14);
    ctx.fillText('y', PAD.left - 8, PAD.top + 2);
  }

  function draw(){
    const {ctx,w,h}=resizeCanvas(canvas);drawGrid(ctx,w,h);const tc=themeColors();
    drawAxes(ctx, w, h, tc);
    if(pts.length===0){ctx.fillStyle=tc.dim;ctx.font='14px "Courier New"';ctx.fillText(window.__LANG==='en'?'Click the canvas to add points':'キャンバスをクリックして点を追加',PAD.left+10,PAD.top+30);return;}

    // OLS on pedagogical coordinates (0-10 scale)
    const dataX = pts.map(p => toDataX(p.nx * w, w));
    const dataY = pts.map(p => toDataY(p.ny * h, h));
    const n = pts.length;
    let sx=0,sy=0,sxy=0,sxx=0,syy=0;
    for(let i=0;i<n;i++){sx+=dataX[i];sy+=dataY[i];sxy+=dataX[i]*dataY[i];sxx+=dataX[i]*dataX[i];syy+=dataY[i]*dataY[i];}
    const mx=sx/n,my=sy/n;
    const denom=sxx-n*mx*mx;
    const b1=denom===0?0:(sxy-n*mx*my)/denom;
    const b0=my-b1*mx;
    const num2=(sxy-n*mx*my);const den2=Math.sqrt((sxx-n*mx*mx)*(syy-n*my*my));
    const r=den2===0?0:num2/den2;const R2=r*r;

    // regression line in canvas coords
    const lx0=0, lx1=AXIS_MAX;
    neonLine(ctx,[[toCanvasX(lx0,w),toCanvasY(b0+b1*lx0,h)],[toCanvasX(lx1,w),toCanvasY(b0+b1*lx1,h)]],tc.cyan,14,2.5);

    // residuals + points
    for(let i=0;i<n;i++){
      const px=toCanvasX(dataX[i],w), py=toCanvasY(dataY[i],h);
      const yhat=b0+b1*dataX[i];
      const pyhat=toCanvasY(yhat,h);
      ctx.strokeStyle=withAlpha(tc.green,.6);ctx.setLineDash([2,3]);ctx.lineWidth=1.5;
      ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px,pyhat);ctx.stroke();ctx.setLineDash([]);

      const p=pts[i];
      const rad=4+2*(1-p.t);
      const alpha=0.4+0.6*p.t;
      ctx.fillStyle=withAlpha(tc.magenta,alpha);ctx.shadowBlur=tc.light?2:14;ctx.shadowColor=tc.magenta;
      ctx.beginPath();ctx.arc(px,py,rad,0,TAU);ctx.fill();ctx.shadowBlur=0;
    }

    // annotation: regression equation on canvas
    if(n>=2 && isFinite(b0) && isFinite(b1)){
      ctx.fillStyle=tc.cyan;ctx.font='bold 12px "Courier New"';
      const eq=`ŷ = ${b0.toFixed(1)} ${b1>=0?'+ ':'− '}${Math.abs(b1).toFixed(2)}x`;
      ctx.fillText(eq,PAD.left+8,PAD.top+20);
      ctx.fillStyle=withAlpha(tc.yellow,.9);ctx.font='bold 12px "Courier New"';
      ctx.fillText(`R² = ${R2.toFixed(3)}`,PAD.left+8,PAD.top+36);
    }

    $('regN').textContent=n;
    $('regB1').textContent=isFinite(b1)?b1.toFixed(4):'—';
    $('regB0').textContent=isFinite(b0)?b0.toFixed(1):'—';
    $('regR2').textContent=R2.toFixed(4);
    $('regR').textContent=r.toFixed(4);
  }
  draw();
})();
