// StatPlay — module: Probability Rules (Venn Diagram)
import { $, TAU, resizeCanvas, drawGrid, neonLine, neonFill, themeColors, withAlpha, throttledDraw } from '../utils.js';

(function prob(){
  if(!document.getElementById('probCanvas')) return;
  const canvas=$('probCanvas');
  canvas.style.cursor='ew-resize';

  const slPA=$('probPA'), slPB=$('probPB'), slPAB=$('probPAB');
  const btnIndep=$('probIndep');

  const lang=()=>window.__LANG||'ja';
  const lbl=(ja,en)=>lang()==='en'?en:ja;

  function getPA(){return parseFloat(slPA.value);}
  function getPB(){return parseFloat(slPB.value);}
  function getPAB(){return parseFloat(slPAB.value);}

  function clampPAB(){
    const maxAB=Math.min(getPA(),getPB());
    slPAB.max=maxAB.toFixed(2);
    if(getPAB()>maxAB){slPAB.value=maxAB.toFixed(2);}
  }

  function updateInfo(){
    const pA=getPA(), pB=getPB(), pAB=getPAB();
    const pUnion=pA+pB-pAB;
    const pCondAB=pB>0?(pAB/pB):0;
    const pCondBA=pA>0?(pAB/pA):0;
    const indep=Math.abs(pAB-pA*pB)<0.01;

    if($('probUnion'))  $('probUnion').textContent=pUnion.toFixed(4);
    if($('probCondAB')) $('probCondAB').textContent=pB>0?pCondAB.toFixed(4):'—';
    if($('probCondBA')) $('probCondBA').textContent=pA>0?pCondBA.toFixed(4):'—';
    if($('probIndepCheck')) $('probIndepCheck').textContent=indep
      ?lbl('独立 (Yes)','Independent (Yes)')
      :lbl('非独立 (No)','Not Independent (No)');
  }

  function draw(){
    const {ctx,w,h}=resizeCanvas(canvas);
    drawGrid(ctx,w,h);
    const tc=themeColors();
    const lt=tc.light;

    const pA=getPA(), pB=getPB(), pAB=getPAB();
    const pUnion=pA+pB-pAB;

    // --- sample space rectangle ---
    const pad=30;
    const rw=w-pad*2, rh=h-pad*2;
    ctx.strokeStyle=withAlpha(tc.text,0.3);
    ctx.lineWidth=1;
    ctx.strokeRect(pad,pad,rw,rh);
    ctx.fillStyle=withAlpha(tc.dim,0.06);
    ctx.fillRect(pad,pad,rw,rh);

    // --- circle geometry ---
    const maxR=Math.min(rw,rh)*0.38;
    const rA=maxR*Math.sqrt(pA);
    const rB=maxR*Math.sqrt(pB);

    // compute center distance from desired overlap area
    // overlap fraction relative to smaller circle
    const cx=w/2, cy=h/2;
    // position circles so overlap is proportional to P(A∩B)
    // use a heuristic: d = rA + rB - k, where k scales with P(A∩B)
    let dist;
    if(pAB<=0){
      dist=rA+rB+4; // no overlap
    } else if(pAB>=Math.min(pA,pB)-0.001){
      // one circle inside the other
      dist=Math.abs(rA-rB)*0.3;
    } else {
      // interpolate distance: when pAB=0 -> dist=rA+rB, when pAB=min(pA,pB) -> dist~|rA-rB|
      const t=pAB/Math.min(pA,pB);
      const dMax=rA+rB;
      const dMin=Math.abs(rA-rB)*0.3;
      dist=dMax+(dMin-dMax)*t;
    }

    const xA=cx-dist/2, xB=cx+dist/2;

    // --- draw circle fills ---
    // A only (cyan)
    ctx.save();
    ctx.beginPath();ctx.arc(xA,cy,rA,0,TAU);ctx.closePath();ctx.clip();
    // subtract B
    ctx.beginPath();ctx.rect(0,0,w,h);ctx.arc(xB,cy,rB,0,TAU,true);ctx.closePath();
    ctx.fillStyle=withAlpha(tc.cyan,lt?0.25:0.18);
    ctx.shadowBlur=lt?2:10;ctx.shadowColor=tc.cyan;
    ctx.fill();
    ctx.restore();

    // B only (magenta)
    ctx.save();
    ctx.beginPath();ctx.arc(xB,cy,rB,0,TAU);ctx.closePath();ctx.clip();
    ctx.beginPath();ctx.rect(0,0,w,h);ctx.arc(xA,cy,rA,0,TAU,true);ctx.closePath();
    ctx.fillStyle=withAlpha(tc.magenta,lt?0.25:0.18);
    ctx.shadowBlur=lt?2:10;ctx.shadowColor=tc.magenta;
    ctx.fill();
    ctx.restore();

    // Intersection (yellow)
    if(pAB>0 && dist<rA+rB){
      ctx.save();
      ctx.beginPath();ctx.arc(xA,cy,rA,0,TAU);ctx.closePath();ctx.clip();
      ctx.beginPath();ctx.arc(xB,cy,rB,0,TAU);ctx.closePath();
      ctx.fillStyle=withAlpha(tc.yellow,lt?0.4:0.3);
      ctx.shadowBlur=lt?2:14;ctx.shadowColor=tc.yellow;
      ctx.fill();
      ctx.restore();
    }

    // --- circle outlines ---
    ctx.lineWidth=2;
    ctx.shadowBlur=lt?1:8;
    ctx.shadowColor=tc.cyan;ctx.strokeStyle=tc.cyan;
    ctx.beginPath();ctx.arc(xA,cy,rA,0,TAU);ctx.stroke();
    ctx.shadowColor=tc.magenta;ctx.strokeStyle=tc.magenta;
    ctx.beginPath();ctx.arc(xB,cy,rB,0,TAU);ctx.stroke();
    ctx.shadowBlur=0;

    // --- labels on diagram ---
    const fs=Math.max(11,Math.min(14,w/40));
    ctx.font=`bold ${fs}px "Courier New",monospace`;
    ctx.textAlign='center';ctx.textBaseline='middle';

    // A label
    ctx.fillStyle=tc.cyan;
    ctx.fillText('A',xA-rA*0.45,cy-rA*0.5);
    ctx.font=`${fs-1}px "Courier New",monospace`;
    ctx.fillText('P(A)='+pA.toFixed(2),xA-rA*0.3,cy+rA*0.65);

    // B label
    ctx.fillStyle=tc.magenta;
    ctx.font=`bold ${fs}px "Courier New",monospace`;
    ctx.fillText('B',xB+rB*0.45,cy-rB*0.5);
    ctx.font=`${fs-1}px "Courier New",monospace`;
    ctx.fillText('P(B)='+pB.toFixed(2),xB+rB*0.3,cy+rB*0.65);

    // intersection label
    if(pAB>0 && dist<rA+rB){
      ctx.fillStyle=tc.yellow;
      ctx.font=`${fs-1}px "Courier New",monospace`;
      ctx.fillText('P(A\u2229B)',cx,cy-8);
      ctx.fillText('='+pAB.toFixed(2),cx,cy+8);
    }

    // --- formulas at bottom ---
    const fmtY=h-8;
    ctx.fillStyle=withAlpha(tc.text,0.8);
    ctx.font=`${Math.max(10,fs-2)}px "Courier New",monospace`;
    ctx.textAlign='left';
    ctx.fillText('P(A\u222aB) = P(A)+P(B)\u2212P(A\u2229B) = '+pUnion.toFixed(4),pad+4,fmtY);

    ctx.textAlign='right';
    const condStr=pB>0
      ?'P(A|B) = P(A\u2229B)/P(B) = '+(pAB/pB).toFixed(4)
      :'P(A|B) = —';
    ctx.fillText(condStr,w-pad-4,fmtY);

    // sample space label
    ctx.textAlign='left';
    ctx.fillStyle=withAlpha(tc.text,0.4);
    ctx.font=`${fs-2}px "Courier New",monospace`;
    ctx.fillText(lbl('\u03a9 (\u6a19\u672c\u7a7a\u9593)','\u03a9 (Sample Space)'),pad+4,pad+12);
  }

  // --- event handlers ---
  const sched=throttledDraw(()=>draw());
  slPA.oninput=()=>{clampPAB();updateInfo();sched();};
  slPB.oninput=()=>{clampPAB();updateInfo();sched();};
  slPAB.oninput=()=>{updateInfo();sched();};

  btnIndep.onclick=()=>{
    const pA=getPA(), pB=getPB();
    const indepVal=Math.min(pA*pB, Math.min(pA,pB));
    slPAB.value=indepVal.toFixed(2);
    clampPAB();
    updateInfo();
    draw();
  };

  // initial
  clampPAB();
  updateInfo();
  draw();

  // redraw on resize
  window.addEventListener('resize',()=>{draw();});
})();
