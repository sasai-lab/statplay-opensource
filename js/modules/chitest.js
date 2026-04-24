// StatPlay — module: CHI-SQUARED TEST (click-to-add interaction)
import { $, lgamma, chi2PDF, resizeCanvas, drawGrid, neonLine, neonFill, themeColors, withAlpha, throttledDraw } from '../utils.js';

export function initChitest(){
  if(!document.getElementById('chitestCanvas')) return;

  // --- Click feedback animation system ---
  const clickFx=[];
  function spawnClickFx(x,y,delta,tc){
    clickFx.push({x,y,text:(delta>0?'+':'')+(delta),t:0,
      color:delta>0?tc.green:tc.magenta});
  }
  function tickAndDrawFx(ctx,tc){
    for(let i=clickFx.length-1;i>=0;i--){
      const fx=clickFx[i];
      fx.t+=1;
      const progress=fx.t/18;
      if(progress>=1){ clickFx.splice(i,1); continue; }
      const alpha=1-progress;
      const rise=progress*24;
      const scale=1+progress*0.4;
      ctx.save();
      ctx.globalAlpha=alpha;
      ctx.fillStyle=fx.color;
      ctx.font=`bold ${Math.round(14*scale)}px "Courier New"`;
      ctx.fillText(fx.text, fx.x-8, fx.y-rise);
      // ring burst
      ctx.strokeStyle=fx.color;
      ctx.lineWidth=2*(1-progress);
      ctx.beginPath();
      ctx.arc(fx.x, fx.y, 6+progress*20, 0, Math.PI*2);
      ctx.stroke();
      ctx.restore();
    }
    return clickFx.length>0;
  }

  // --- Shared math ---
  function lowerGammaP(a, x){
    if(x<=0) return 0;
    if(x>a+40) return 1-upperGammaQ(a,x);
    let sum=0, term=1/a;
    for(let n=0;n<200;n++){
      sum+=term; term*=x/(a+n+1);
      if(Math.abs(term)<1e-14*Math.abs(sum)) break;
    }
    return sum*Math.exp(-x+a*Math.log(x)-lgamma(a));
  }
  function upperGammaQ(a, x){
    let f=x+1-a, c=1/1e-30, d=1/f, h=d;
    for(let i=1;i<=200;i++){
      const an=-i*(i-a), bn=x+2*i+1-a;
      d=bn+an*d; if(Math.abs(d)<1e-30) d=1e-30;
      c=bn+an/c; if(Math.abs(c)<1e-30) c=1e-30;
      d=1/d; const del=d*c; h*=del;
      if(Math.abs(del-1)<1e-14) break;
    }
    return Math.exp(-x+a*Math.log(x)-lgamma(a))*h;
  }
  function chi2CDF(x, df){ return x<=0?0:lowerGammaP(df/2, x/2); }
  function chi2Critical(alpha, df){
    let lo=0, hi=Math.max(10,df*4);
    for(let i=0;i<60;i++){ const m=(lo+hi)/2; if(1-chi2CDF(m,df)>alpha) lo=m; else hi=m; }
    return (lo+hi)/2;
  }

  // ===================== GOODNESS-OF-FIT =====================
  (function gof(){
    const canvas=$('chitestCanvas');
    const alphaSlider=$('gofA');
    const btnReset=$('gofReset');
    const btnAuto=$('gofAutoRoll');
    const dieSelect=$('gofDie');
    const O=[4,3,2,5,3,7];
    let autoTimer=null;
    let hoverIdx=-1;
    let draggingAlpha=false;

    const k=6;
    function layout(w,h){
      const midX=w*0.48;
      const pad={l:24,t:32,b:44};
      const gw=midX-pad.l-16, gh=h-pad.t-pad.b;
      const barW=gw/k;
      return {midX,pad,gw,gh,barW};
    }

    function gofXMax(){
      const N=O.reduce((a,b)=>a+b,0);
      const df=k-1;
      const alpha=alphaSlider?parseFloat(alphaSlider.value):0.05;
      const critVal=chi2Critical(alpha,df);
      let chiSq=0;
      if(N>0){ const E=N/k; for(let i=0;i<k;i++) chiSq+=(O[i]-E)**2/E; }
      return Math.max(df*3+2, critVal*1.8, chiSq*1.5, 8);
    }

    function pxToAlpha(clientX){
      const rect=canvas.getBoundingClientRect();
      const px=(clientX-rect.left)*(canvas.width/rect.width);
      const {midX}=layout(canvas.width,canvas.height);
      const rp={x:midX+10, w:canvas.width-midX-20};
      const xMax=gofXMax();
      const xVal=(px-rp.x)/rp.w*xMax;
      if(xVal<=0) return 0.50;
      const df=k-1;
      const a=1-chi2CDF(xVal,df);
      return Math.max(0.01,Math.min(0.50,a));
    }

    function isRightSide(clientX){
      const rect=canvas.getBoundingClientRect();
      const px=(clientX-rect.left)*(canvas.width/rect.width);
      const {midX}=layout(canvas.width,canvas.height);
      return px>=midX;
    }

    if(alphaSlider){const schedGof=throttledDraw(draw);alphaSlider.oninput=()=>{
      const el=$('gofAVal');
      if(el) el.textContent=parseFloat(alphaSlider.value).toFixed(2);
      schedGof();
    };}

    if(btnReset) btnReset.onclick=()=>{
      for(let i=0;i<6;i++) O[i]=0;
      draw();
    };

    if(btnAuto) btnAuto.onclick=()=>{
      if(autoTimer){ clearInterval(autoTimer); autoTimer=null;
        const isEn=window.__LANG==='en';
        btnAuto.innerHTML=isEn?'<span>▶ Auto-roll</span>':'<span>▶ 自動試行</span>';
        return;
      }
      const isEn=window.__LANG==='en';
      btnAuto.innerHTML=isEn?'<span>■ Stop</span>':'<span>■ 停止</span>';
      autoTimer=setInterval(()=>{
        const loaded=dieSelect&&dieSelect.value==='loaded';
        const face=loaded?rollLoaded():Math.floor(Math.random()*6);
        O[face]++;
        draw();
        const N=O.reduce((a,b)=>a+b,0);
        if(N>=300){
          clearInterval(autoTimer); autoTimer=null;
          const isEn2=window.__LANG==='en';
          btnAuto.innerHTML=isEn2?'<span>▶ Auto-roll</span>':'<span>▶ 自動試行</span>';
        }
      },80);
    };

    function rollLoaded(){
      const r=Math.random();
      if(r<0.3) return 5;
      return Math.floor(Math.random()*5);
    }

    function hitTest(clientX,clientY){
      const rect=canvas.getBoundingClientRect();
      const px=(clientX-rect.left)*(canvas.width/rect.width);
      const {midX,pad,barW}=layout(canvas.width, canvas.height);
      if(px>midX) return -1;
      const idx=Math.floor((px-pad.l)/barW);
      return (idx>=0&&idx<6)?idx:-1;
    }

    canvas.style.touchAction='none';
    canvas.addEventListener('pointermove', e=>{
      if(draggingAlpha){
        const a=pxToAlpha(e.clientX);
        const step=parseFloat(alphaSlider.step)||0.01;
        alphaSlider.value=Math.round(a/step)*step;
        alphaSlider.dispatchEvent(new Event('input',{bubbles:true}));
        return;
      }
      const right=isRightSide(e.clientX);
      const idx=hitTest(e.clientX,e.clientY);
      canvas.style.cursor=right?'ew-resize':(idx>=0?'pointer':'default');
      if(idx!==hoverIdx){ hoverIdx=idx; draw(); }
    });
    canvas.addEventListener('pointerleave', ()=>{
      if(hoverIdx>=0){ hoverIdx=-1; draw(); }
    });

    canvas.addEventListener('pointerdown', e=>{
      if(isRightSide(e.clientX)){
        draggingAlpha=true;
        canvas.setPointerCapture(e.pointerId);
        const a=pxToAlpha(e.clientX);
        const step=parseFloat(alphaSlider.step)||0.01;
        alphaSlider.value=Math.round(a/step)*step;
        alphaSlider.dispatchEvent(new Event('input',{bubbles:true}));
        return;
      }
      const idx=hitTest(e.clientX,e.clientY);
      if(idx<0) return;
      const delta=e.shiftKey?-1:1;
      if(delta<0){ O[idx]=Math.max(0,O[idx]-1); } else { O[idx]++; }
      const tc=themeColors();
      const {pad,barW}=layout(canvas.width,canvas.height);
      const N=O.reduce((a,b)=>a+b,0);
      const maxVal=Math.max(...O,N>0?N/k:1)*1.25;
      const gh2=canvas.height-pad.t-44;
      const oH=N>0?O[idx]/maxVal*gh2:0;
      spawnClickFx(pad.l+idx*barW+barW/2, pad.t+gh2-oH, delta, tc);
      draw(); animateFx();
    });
    function endDrag(e){ if(draggingAlpha){ draggingAlpha=false; try{canvas.releasePointerCapture(e.pointerId);}catch(_){} } }
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);

    let fxRaf=0;
    function animateFx(){
      cancelAnimationFrame(fxRaf);
      fxRaf=requestAnimationFrame(()=>{
        if(clickFx.length===0) return;
        draw(); animateFx();
      });
    }

    function draw(){
      const {ctx,w,h}=resizeCanvas(canvas); drawGrid(ctx,w,h); const tc=themeColors();
      const isEn=window.__LANG==='en';
      const alpha=alphaSlider?parseFloat(alphaSlider.value):0.05;
      const N=O.reduce((a,b)=>a+b,0);
      const E=N>0?N/k:1;
      const df=k-1;

      const {midX,pad,gh,barW}=layout(w,h);
      const maxVal=Math.max(...O,E)*1.25;

      ctx.fillStyle=tc.dim; ctx.font='10px "Courier New"';
      ctx.fillText('n='+N,midX-40,16);

      const faceLabels=['\u2680','\u2681','\u2682','\u2683','\u2684','\u2685'];

      for(let i=0;i<k;i++){
        const gx=pad.l+i*barW;
        const oH=N>0?O[i]/maxVal*gh:0;
        const isHover=(i===hoverIdx);

        let devRatio=0;
        if(N>0){
          const contrib=(O[i]-E)**2/E;
          const chiSq=computeChiSq();
          devRatio=chiSq>0?Math.min(contrib/chiSq*k,1):0;
        }

        // Hover highlight: bright border around the bar area
        if(isHover){
          ctx.strokeStyle=withAlpha(tc.cyan,.6);
          ctx.lineWidth=2;
          ctx.strokeRect(gx+2,pad.t,barW-4,gh);
        }

        // Observed bar
        const oY=pad.t+gh-oH;
        ctx.fillStyle=withAlpha(tc.cyan, isHover?0.55:0.2+devRatio*0.5);
        ctx.shadowBlur=tc.light?1:(isHover?14:4+devRatio*12);
        ctx.shadowColor=devRatio>0.3?tc.magenta:tc.cyan;
        ctx.fillRect(gx+4,oY,barW-8,oH);
        ctx.shadowBlur=0;

        // Expected line (dashed)
        if(N>0){
          const eH=E/maxVal*gh;
          const eY=pad.t+gh-eH;
          ctx.strokeStyle=withAlpha(tc.dim,.7); ctx.lineWidth=1.5;
          ctx.setLineDash([4,3]);
          ctx.beginPath(); ctx.moveTo(gx+2,eY); ctx.lineTo(gx+barW-2,eY); ctx.stroke();
          ctx.setLineDash([]);
        }

        // Count on bar
        ctx.fillStyle=tc.cyan; ctx.font='bold 11px "Courier New"';
        ctx.fillText(O[i].toString(),gx+barW/2-6,oY-4);

        // +1 indicator on hover
        if(isHover){
          ctx.fillStyle=tc.green; ctx.font='bold 13px "Courier New"';
          ctx.fillText('+1',gx+barW/2-8,pad.t+12);
        }

        // Face label
        ctx.fillStyle=isHover?tc.cyan:tc.text; ctx.font=(isHover?'bold ':'')+'14px "Courier New"';
        ctx.fillText(faceLabels[i],gx+barW/2-7,pad.t+gh+18);
      }

      // Expected legend
      if(N>0){
        ctx.fillStyle=tc.dim; ctx.font='9px "Courier New"';
        ctx.strokeStyle=withAlpha(tc.dim,.7); ctx.setLineDash([4,3]); ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(pad.l,h-8); ctx.lineTo(pad.l+20,h-8); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillText('E='+E.toFixed(1),pad.l+24,h-4);
      }

      // Hint text
      ctx.fillStyle=tc.dim; ctx.font='10px "Courier New"';
      const hint=isEn?'Click bar = +1 / Shift+Click = -1':'クリック = +1 / Shift+クリック = −1';
      ctx.fillText(hint,pad.l,h-16);

      // Right side: χ² curve
      if(N>0){
        const chiSq=computeChiSq();
        const pval=1-chi2CDF(chiSq,df);
        const critVal=chi2Critical(alpha,df);
        const reject=chiSq>=critVal;
        drawChi2Curve(ctx,w,h,tc,alpha,chiSq,df,critVal,pval,reject,midX,isEn);
        updateInfo(chiSq,df,pval,reject,alpha,isEn,'gof');
        const elN=$('gofN'); if(elN) elN.textContent=N;
      } else {
        ctx.fillStyle=tc.dim; ctx.font='12px "Courier New"';
        ctx.fillText(isEn?'Click bars to start':'バーをクリックで開始',midX+20,h/2);
        updateInfo(0,df,1,false,alpha,isEn,'gof');
        const elN=$('gofN'); if(elN) elN.textContent='0';
      }

      tickAndDrawFx(ctx,tc);
    }

    function computeChiSq(){
      const N=O.reduce((a,b)=>a+b,0);
      if(N===0) return 0;
      const E=N/k;
      let chi=0;
      for(let i=0;i<k;i++) chi+=(O[i]-E)**2/E;
      return chi;
    }

    draw();
    window.addEventListener('resize',draw);
  })();

  // ===================== INDEPENDENCE =====================
  (function ind(){
    const canvas=$('indCanvas');
    if(!canvas) return;
    const alphaSlider=$('indA');
    const btnReset=$('indReset');

    // Dots storage: dots[r][c] = array of {rx,ry} in 0..1 relative coords
    const dots=[[],[],[],[]];  // flat index r*2+c
    const di=(r,c)=>r*2+c;
    function count(r,c){ return dots[di(r,c)].length; }

    function randInCell(){ return {rx:0.12+Math.random()*0.76, ry:0.12+Math.random()*0.76}; }

    // Seed initial data as random dots
    const initCounts=[[12,5],[8,15]];
    for(let r=0;r<2;r++) for(let c=0;c<2;c++)
      for(let i=0;i<initCounts[r][c];i++) dots[di(r,c)].push(randInCell());

    let hoverCell=null;
    let draggingAlpha=false;

    function tblLayout(w,h){
      const midX=w*0.48;
      const tblX=30, tblY=38;
      const cellW=(midX-70)/2, cellH=(h-120)/2;
      return {midX,tblX,tblY,cellW,cellH};
    }

    function indXMax(){
      const O=[[count(0,0),count(0,1)],[count(1,0),count(1,1)]];
      const grand=O[0][0]+O[0][1]+O[1][0]+O[1][1];
      const df=1;
      const alpha=alphaSlider?parseFloat(alphaSlider.value):0.05;
      const critVal=chi2Critical(alpha,df);
      let chiSq=0;
      if(grand>0){
        const rowTot=[O[0][0]+O[0][1],O[1][0]+O[1][1]];
        const colTot=[O[0][0]+O[1][0],O[0][1]+O[1][1]];
        for(let r=0;r<2;r++) for(let c=0;c<2;c++){
          const e=rowTot[r]*colTot[c]/grand;
          if(e>0) chiSq+=(O[r][c]-e)**2/e;
        }
      }
      return Math.max(df*3+2, critVal*1.8, chiSq*1.5, 8);
    }

    function indPxToAlpha(clientX){
      const rect=canvas.getBoundingClientRect();
      const px=(clientX-rect.left)*(canvas.width/rect.width);
      const {midX}=tblLayout(canvas.width,canvas.height);
      const rp={x:midX+10, w:canvas.width-midX-20};
      const xMax=indXMax();
      const xVal=(px-rp.x)/rp.w*xMax;
      if(xVal<=0) return 0.50;
      const a=1-chi2CDF(xVal,1);
      return Math.max(0.01,Math.min(0.50,a));
    }

    function isRightSide(clientX){
      const rect=canvas.getBoundingClientRect();
      const px=(clientX-rect.left)*(canvas.width/rect.width);
      const {midX}=tblLayout(canvas.width,canvas.height);
      return px>=midX;
    }

    function cellHitTest(clientX,clientY){
      const rect=canvas.getBoundingClientRect();
      const px=(clientX-rect.left)*(canvas.width/rect.width);
      const py=(clientY-rect.top)*(canvas.height/rect.height);
      const {midX,tblX,tblY,cellW,cellH}=tblLayout(canvas.width,canvas.height);
      if(px>midX) return null;
      const col=Math.floor((px-tblX-20)/cellW);
      const row=Math.floor((py-tblY)/cellH);
      if(row<0||row>1||col<0||col>1) return null;
      const rx=(px-(tblX+20+col*cellW))/(cellW-2);
      const ry=(py-(tblY+row*cellH))/(cellH-2);
      return {r:row, c:col, rx:Math.max(0.05,Math.min(0.95,rx)), ry:Math.max(0.05,Math.min(0.95,ry))};
    }

    if(alphaSlider){const schedInd=throttledDraw(draw);alphaSlider.oninput=()=>{
      const el=$('indAVal');
      if(el) el.textContent=parseFloat(alphaSlider.value).toFixed(2);
      schedInd();
    };}

    if(btnReset) btnReset.onclick=()=>{
      for(let i=0;i<4;i++) dots[i].length=0;
      draw();
    };

    canvas.style.touchAction='none';
    canvas.addEventListener('pointermove', e=>{
      if(draggingAlpha){
        const a=indPxToAlpha(e.clientX);
        const step=parseFloat(alphaSlider.step)||0.01;
        alphaSlider.value=Math.round(a/step)*step;
        alphaSlider.dispatchEvent(new Event('input',{bubbles:true}));
        return;
      }
      const right=isRightSide(e.clientX);
      const cell=cellHitTest(e.clientX,e.clientY);
      const prev=hoverCell;
      canvas.style.cursor=right?'ew-resize':(cell?'pointer':'default');
      if((cell&&prev&&cell.r===prev.r&&cell.c===prev.c)||(!cell&&!prev)) return;
      hoverCell=cell;
      draw();
    });
    canvas.addEventListener('pointerleave', ()=>{
      if(hoverCell){ hoverCell=null; draw(); }
    });

    canvas.addEventListener('pointerdown', e=>{
      if(isRightSide(e.clientX)){
        draggingAlpha=true;
        canvas.setPointerCapture(e.pointerId);
        const a=indPxToAlpha(e.clientX);
        const step=parseFloat(alphaSlider.step)||0.01;
        alphaSlider.value=Math.round(a/step)*step;
        alphaSlider.dispatchEvent(new Event('input',{bubbles:true}));
        return;
      }
      const cell=cellHitTest(e.clientX,e.clientY);
      if(!cell) return;
      const delta=e.shiftKey?-1:1;
      const idx=di(cell.r,cell.c);
      if(delta<0){ if(dots[idx].length>0) dots[idx].pop(); }
      else { dots[idx].push({rx:cell.rx, ry:cell.ry}); }
      const tc=themeColors();
      const {tblX,tblY,cellW,cellH}=tblLayout(canvas.width,canvas.height);
      const cx=tblX+20+cell.c*cellW+cell.rx*(cellW-2);
      const cy=tblY+cell.r*cellH+cell.ry*(cellH-2);
      spawnClickFx(cx,cy,delta,tc);
      draw(); animateIndFx();
    });
    function endIndDrag(e){ if(draggingAlpha){ draggingAlpha=false; try{canvas.releasePointerCapture(e.pointerId);}catch(_){} } }
    canvas.addEventListener('pointerup', endIndDrag);
    canvas.addEventListener('pointercancel', endIndDrag);

    let indFxRaf=0;
    function animateIndFx(){
      cancelAnimationFrame(indFxRaf);
      indFxRaf=requestAnimationFrame(()=>{
        if(clickFx.length===0) return;
        draw(); animateIndFx();
      });
    }

    function draw(){
      const {ctx,w,h}=resizeCanvas(canvas); drawGrid(ctx,w,h); const tc=themeColors();
      const isEn=window.__LANG==='en';
      const alpha=alphaSlider?parseFloat(alphaSlider.value):0.05;

      const O=[[count(0,0),count(0,1)],[count(1,0),count(1,1)]];
      const grand=O[0][0]+O[0][1]+O[1][0]+O[1][1];
      const {midX,tblX,tblY,cellW,cellH}=tblLayout(w,h);

      ctx.fillStyle=tc.dim; ctx.font='10px "Courier New"';
      ctx.fillText('n='+grand,midX-40,16);

      // Column/row headers
      ctx.fillStyle=tc.dim; ctx.font='10px "Courier New"';
      const colLabels=isEn?['Col 1','Col 2','Total']:['列1','列2','計'];
      const rowLabels=isEn?['Row 1','Row 2','Total']:['行1','行2','計'];
      ctx.fillText(colLabels[0],tblX+20+cellW*0.3,tblY-6);
      ctx.fillText(colLabels[1],tblX+20+cellW*1.3,tblY-6);
      ctx.fillText(colLabels[2],tblX+20+cellW*2.1,tblY-6);
      ctx.fillText(rowLabels[0],tblX-4,tblY+cellH*0.55);
      ctx.fillText(rowLabels[1],tblX-4,tblY+cellH*1.55);
      ctx.fillText(rowLabels[2],tblX-4,tblY+cellH*2.3);

      const rowTot=[O[0][0]+O[0][1], O[1][0]+O[1][1]];
      const colTot=[O[0][0]+O[1][0], O[0][1]+O[1][1]];

      let E=[[0,0],[0,0]], chiSq=0;
      const contribs=[[0,0],[0,0]];
      if(grand>0){
        for(let r=0;r<2;r++) for(let c=0;c<2;c++){
          E[r][c]=rowTot[r]*colTot[c]/grand;
          if(E[r][c]>0){
            const v=(O[r][c]-E[r][c])**2/E[r][c];
            contribs[r][c]=v; chiSq+=v;
          }
        }
      }

      for(let r=0;r<2;r++) for(let c=0;c<2;c++){
        const x=tblX+20+c*cellW;
        const y=tblY+r*cellH;
        const isHover=hoverCell&&hoverCell.r===r&&hoverCell.c===c;

        let devAbs=0, cellColor=tc.cyan;
        if(grand>0 && E[r][c]>0){
          const dev=(O[r][c]-E[r][c])/E[r][c];
          devAbs=Math.min(Math.abs(dev),1);
          cellColor=dev>=0?tc.cyan:tc.magenta;
        }

        // Cell fill
        ctx.fillStyle=withAlpha(cellColor, isHover?0.15:0.04+devAbs*0.12);
        ctx.shadowBlur=tc.light?0:(isHover?12:devAbs*10);
        ctx.shadowColor=cellColor;
        ctx.fillRect(x,y,cellW-2,cellH-2);
        ctx.shadowBlur=0;

        // Cell border
        ctx.strokeStyle=withAlpha(isHover?tc.cyan:cellColor, isHover?0.8:0.25+devAbs*0.4);
        ctx.lineWidth=isHover?2:1;
        ctx.strokeRect(x,y,cellW-2,cellH-2);

        // Draw dots
        const cellDots=dots[di(r,c)];
        const dotR=Math.max(2.5, Math.min(5, 40/Math.sqrt(Math.max(cellDots.length,1))));
        const dotColor=r===0?(c===0?tc.cyan:tc.yellow):(c===0?tc.green:tc.orange);
        for(let d=0;d<cellDots.length;d++){
          const dx=x+cellDots[d].rx*(cellW-2);
          const dy=y+cellDots[d].ry*(cellH-2);
          ctx.beginPath();
          ctx.arc(dx,dy,dotR,0,Math.PI*2);
          ctx.fillStyle=withAlpha(dotColor,0.85);
          if(!tc.light){ ctx.shadowBlur=4; ctx.shadowColor=dotColor; }
          ctx.fill();
          ctx.shadowBlur=0;
        }

        // Count label (top-left of cell)
        ctx.fillStyle=tc.text; ctx.font='bold 12px "Courier New"';
        ctx.fillText(O[r][c].toString(), x+4, y+14);

        // +1 indicator on hover
        if(isHover){
          ctx.fillStyle=tc.green; ctx.font='bold 12px "Courier New"';
          ctx.fillText('+1',x+cellW-22,y+14);
        }

        // Expected + contribution
        if(grand>0 && E[r][c]>0){
          ctx.fillStyle=tc.dim; ctx.font='9px "Courier New"';
          ctx.fillText('E='+E[r][c].toFixed(1),x+4,y+cellH-10);
          ctx.fillStyle=devAbs>0.15?tc.magenta:tc.dim;
          ctx.fillText(contribs[r][c].toFixed(2),x+cellW-34,y+cellH-10);
        }
      }

      // Row/column totals
      ctx.fillStyle=tc.dim; ctx.font='11px "Courier New"';
      for(let r=0;r<2;r++) ctx.fillText(rowTot[r].toString(),tblX+20+cellW*2.1,tblY+r*cellH+cellH*0.45);
      for(let c=0;c<2;c++) ctx.fillText(colTot[c].toString(),tblX+20+c*cellW+cellW*0.3,tblY+cellH*2.3);
      ctx.fillText(grand.toString(),tblX+20+cellW*2.1,tblY+cellH*2.3);

      // Hint text
      ctx.fillStyle=tc.dim; ctx.font='10px "Courier New"';
      const hint=isEn?'Click cell = +1 / Shift+Click = -1':'クリック = +1 / Shift+クリック = −1';
      ctx.fillText(hint,tblX,h-8);

      const df=1;
      if(grand>0 && E[0][0]>0 && E[0][1]>0 && E[1][0]>0 && E[1][1]>0){
        const pval=1-chi2CDF(chiSq,df);
        const critVal=chi2Critical(alpha,df);
        const reject=chiSq>=critVal;
        drawChi2Curve(ctx,w,h,tc,alpha,chiSq,df,critVal,pval,reject,midX,isEn);
        updateInfo(chiSq,df,pval,reject,alpha,isEn,'ind');
        const elN=$('indN'); if(elN) elN.textContent=grand;
      } else {
        ctx.fillStyle=tc.dim; ctx.font='12px "Courier New"';
        ctx.fillText(isEn?'Click cells to start':'セルをクリックで開始',midX+20,h/2);
        updateInfo(0,df,1,false,alpha,isEn,'ind');
        const elN=$('indN'); if(elN) elN.textContent=grand;
      }

      tickAndDrawFx(ctx,tc);
    }

    draw();
    window.addEventListener('resize',draw);
  })();

  // ===================== SHARED: chi2 distribution curve =====================
  function drawChi2Curve(ctx,w,h,tc,alpha,chiSq,df,critVal,pval,reject,midX,isEn){
    const rp={x:midX+10, y:20, w:w-midX-20, h:h-50};

    ctx.fillStyle=tc.text; ctx.font='bold 11px "Courier New"';
    ctx.fillText('χ² '+(isEn?'(df='+df+')':'分布 (df='+df+')'),rp.x,14);

    const xMax=Math.max(df*3+2, critVal*1.8, chiSq*1.5, 8);
    const xToPx=x=>rp.x+x/xMax*rp.w;

    let peakY=0;
    for(let x=0.05;x<=xMax;x+=xMax/300){
      const v=chi2PDF(x,df); if(v>peakY) peakY=v;
    }
    if(peakY===0) peakY=1;
    const yToPx=y=>rp.y+rp.h-Math.min(y,peakY)/peakY*(rp.h-10);

    ctx.strokeStyle=withAlpha(tc.cyan,.25); ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(rp.x,rp.y+rp.h); ctx.lineTo(rp.x+rp.w,rp.y+rp.h); ctx.stroke();

    const rejPts=[[xToPx(critVal),rp.y+rp.h]];
    for(let x=critVal;x<=xMax;x+=xMax/300) rejPts.push([xToPx(x),yToPx(chi2PDF(x,df))]);
    rejPts.push([xToPx(xMax),rp.y+rp.h]);
    neonFill(ctx,rejPts,tc.magenta,.35);

    const curve=[];
    for(let x=0.02;x<=xMax;x+=xMax/400) curve.push([xToPx(x),yToPx(chi2PDF(x,df))]);
    neonLine(ctx,curve,tc.cyan,12,2);

    ctx.strokeStyle=withAlpha(tc.yellow,.8); ctx.setLineDash([4,4]); ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(xToPx(critVal),rp.y); ctx.lineTo(xToPx(critVal),rp.y+rp.h); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle=tc.yellow; ctx.font='9px "Courier New"';
    ctx.fillText('c='+critVal.toFixed(2),xToPx(critVal)+3,rp.y+12);
    ctx.fillStyle=tc.magenta;
    ctx.fillText('α='+alpha.toFixed(2),xToPx(critVal)+3,rp.y+24);
    // annotation: rejection region label
    ctx.fillStyle=withAlpha(tc.magenta,.8);ctx.font='bold 9px "Courier New"';
    const rejText=isEn?'Reject H₀':'棄却域';
    ctx.fillText(rejText,Math.min(xToPx(critVal)+40,rp.x+rp.w-60),rp.y+38);

    const statColor=reject?tc.magenta:tc.green;
    ctx.strokeStyle=statColor; ctx.lineWidth=tc.light?2.5:2;
    ctx.shadowBlur=tc.light?2:reject?16:10; ctx.shadowColor=statColor;
    ctx.beginPath(); ctx.moveTo(xToPx(chiSq),rp.y+4); ctx.lineTo(xToPx(chiSq),rp.y+rp.h); ctx.stroke();
    ctx.shadowBlur=0;

    if(reject){
      ctx.shadowBlur=20; ctx.shadowColor=tc.magenta;
      ctx.strokeStyle=withAlpha(tc.magenta,.6); ctx.lineWidth=3;
      ctx.beginPath(); ctx.moveTo(xToPx(chiSq),rp.y+4); ctx.lineTo(xToPx(chiSq),rp.y+rp.h); ctx.stroke();
      ctx.shadowBlur=0;
    }

    ctx.fillStyle=statColor; ctx.font='bold 10px "Courier New"';
    const chiLabel='χ²='+chiSq.toFixed(2);
    const labelX=chiSq>xMax*0.7?xToPx(chiSq)-ctx.measureText(chiLabel).width-6:xToPx(chiSq)+4;
    ctx.fillText(chiLabel,labelX,rp.y+rp.h-6);

    ctx.fillStyle=tc.orange; ctx.font='bold 10px "Courier New"';
    const pLabel='p='+(pval<0.0001?pval.toExponential(1):pval.toFixed(4));
    ctx.fillText(pLabel,rp.x+rp.w-ctx.measureText(pLabel).width-4,rp.y+rp.h-6);

    ctx.fillStyle=tc.dim; ctx.font='10px "Courier New"';
    const nTicks=Math.min(8,Math.ceil(xMax));
    const tickStep=Math.ceil(xMax/nTicks);
    for(let x=0;x<=xMax;x+=tickStep) ctx.fillText(x.toFixed(0),xToPx(x)-4,rp.y+rp.h+14);
  }

  function updateInfo(chiSq,df,pval,reject,alpha,isEn,prefix){
    const elStat=$(prefix+'Stat'), elDf=$(prefix+'Df'), elP=$(prefix+'P'), elResult=$(prefix+'Result');
    if(elStat) elStat.textContent=chiSq.toFixed(4);
    if(elDf) elDf.textContent=df.toString();
    if(elP){
      elP.textContent=pval<0.0001?pval.toExponential(2):pval.toFixed(4);
      elP.style.color=pval<alpha?'var(--magenta)':'var(--cyan)';
    }
    if(elResult){
      elResult.textContent=isEn
        ?(reject?'Reject H\u2080':'Fail to reject H\u2080')
        :(reject?'H\u2080 \u68c4\u5374':'H\u2080 \u63a1\u629e');
      elResult.style.color=reject?'var(--magenta)':'var(--cyan)';
    }
  }
}
