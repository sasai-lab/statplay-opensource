// StatPlay — module: CANVAS DRAG INTERACTIONS
import { normCDF } from '../utils.js';

export function initGraphDrag(){
  function bindHorizontal(canvasId,sliderId,pxToData){
    const cv=document.getElementById(canvasId),sl=document.getElementById(sliderId);
    if(!cv||!sl) return;
    cv.style.touchAction='none';
    let dragging=false;
    function apply(clientX,clientY){
      const r=cv.getBoundingClientRect();
      const px=clientX-r.left,py=clientY-r.top;
      const v=pxToData(px,py,r.width,r.height);
      if(v==null||!isFinite(v)) return;
      const min=parseFloat(sl.min),max=parseFloat(sl.max),step=parseFloat(sl.step)||0.01;
      let nv=Math.max(min,Math.min(max,v));
      nv=Math.round(nv/step)*step;
      sl.value=nv;
      sl.dispatchEvent(new Event('input',{bubbles:true}));
    }
    cv.addEventListener('pointerdown',e=>{dragging=true;cv.setPointerCapture(e.pointerId);apply(e.clientX,e.clientY);});
    cv.addEventListener('pointermove',e=>{if(dragging)apply(e.clientX,e.clientY);});
    const end=e=>{dragging=false;try{cv.releasePointerCapture(e.pointerId);}catch(_){}};
    cv.addEventListener('pointerup',end);cv.addEventListener('pointercancel',end);
  }
  function bindTwoHandles(canvasId,slA,slB,pxToData){
    const cv=document.getElementById(canvasId),a=document.getElementById(slA),b=document.getElementById(slB);
    if(!cv||!a||!b) return;
    cv.style.touchAction='none';
    let dragging=false, which='a';
    function apply(clientX,clientY,initial){
      const r=cv.getBoundingClientRect();
      const px=clientX-r.left,py=clientY-r.top;
      const v=pxToData(px,py,r.width,r.height);
      if(v==null||!isFinite(v)) return;
      if(initial){
        which=Math.abs(v-parseFloat(a.value))<=Math.abs(v-parseFloat(b.value))?'a':'b';
      }
      const sl=which==='a'?a:b;
      const min=parseFloat(sl.min),max=parseFloat(sl.max),step=parseFloat(sl.step)||0.01;
      let nv=Math.max(min,Math.min(max,v));
      nv=Math.round(nv/step)*step;
      sl.value=nv;
      sl.dispatchEvent(new Event('input',{bubbles:true}));
    }
    cv.addEventListener('pointerdown',e=>{dragging=true;cv.setPointerCapture(e.pointerId);apply(e.clientX,e.clientY,true);});
    cv.addEventListener('pointermove',e=>{if(dragging)apply(e.clientX,e.clientY);});
    const end=e=>{dragging=false;try{cv.releasePointerCapture(e.pointerId);}catch(_){}};
    cv.addEventListener('pointerup',end);cv.addEventListener('pointercancel',end);
  }
  // snCanvas: horizontal drag → ±k σ (always non-negative k)
  bindHorizontal('snCanvas','snK',(px,py,w)=>{
    const lo=-4,hi=4;return Math.abs(lo+px/w*(hi-lo));
  });
  // snMorphCanvas: horizontal drag → progress (0..100) of the "standardize" morph.
  // Cancel any in-flight auto-animation first so the user's value isn't overwritten.
  (function(){
    const cv=document.getElementById('snMorphCanvas');
    if(cv){
      cv.addEventListener('pointerdown',()=>{ if(cv.__cancelMorphAnim) cv.__cancelMorphAnim(); }, true);
    }
  })();
  bindHorizontal('snMorphCanvas','snT',(px,py,w)=>{
    // Reversed: drag RIGHT→LEFT advances progress 0→100 (matches user's intuition
    // that pulling the curve inward = collapse toward the spike).
    return Math.max(0, Math.min(100, (1 - px/w)*100));
  });
  // normalCanvas: two-handle drag for [a,b] — canvas draws x∈[-6,6]
  bindTwoHandles('normalCanvas','nA','nB',(px,py,w)=>{
    const lo=-6,hi=6;return lo+px/w*(hi-lo);
  });
  // testCanvas: horizontal drag → α (via critical boundary).
  // We interpret the drag position as where the rejection boundary lies,
  // and invert to an α value based on the currently-selected test type.
  bindHorizontal('testCanvas','tA',(px,py,w)=>{
    const lo = -4.5, hi = 4.5;
    const x = lo + px / w * (hi - lo);
    const tt = (document.getElementById('tType') || {}).value || 'two';
    let alpha;
    if(tt==='two'){ alpha = 2*(1-normCDF(Math.abs(x))); }
    else if(tt==='right'){ alpha = 1-normCDF(x); }
    else { alpha = normCDF(x); }
    return Math.max(0.001, Math.min(0.2, alpha));
  });
  // errCanvas: horizontal drag on critical-z boundary → α
  bindHorizontal('errCanvas','eA',(px,py,w)=>{
    const lo = -4, hi = 8;
    const xCrit = lo + px / w * (hi - lo);
    return 1 - normCDF(xCrit);
  });

  // snCanvas — drag X to set k
  bindHorizontal('snCanvas','snK',(px,py,w)=>{
    const xMin = -4, xMax = 4;
    const x = xMin + px / w * (xMax - xMin);
    return Math.abs(x);
  });
  // normalCanvas — drag to move nearest of a/b
  bindTwoHandles('normalCanvas','nA','nB',(px,py,w)=>{
    const xMin = -5, xMax = 5;
    return xMin + px / w * (xMax - xMin);
  });
  // testCanvas — drag to set z
  bindHorizontal('testCanvas','tZ',(px,py,w)=>{
    const xMin = -4, xMax = 4;
    return xMin + px / w * (xMax - xMin);
  });
  // errCanvas — drag to set α via critical line x-position
  bindHorizontal('errCanvas','eA',(px,py,w)=>{
    const lo = -4, hi = 8;
    const xCrit = lo + px / w * (hi - lo);
    return 1 - normCDF(xCrit);
  });

  // --- 離散分布+指数分布 ドラッグ ------------------------------------
  // binomCanvas: x→n (horizontal position maps to bar index → n), Shift+drag→p
  (function bindBinomCanvas(){
    const cv=document.getElementById('binomCanvas');
    const slN=document.getElementById('binomN');
    const slP=document.getElementById('binomP');
    if(!cv||!slN||!slP) return;
    cv.style.touchAction='none';
    let dragging=false, target=slN;
    function apply(clientX,clientY,initial,shiftKey){
      const r=cv.getBoundingClientRect();
      const frac=Math.max(0,Math.min(1,(clientX-r.left)/r.width));
      if(initial) target=shiftKey?slP:slN;
      const sl=target;
      const min=parseFloat(sl.min),max=parseFloat(sl.max),step=parseFloat(sl.step)||1;
      let nv=min+frac*(max-min);
      nv=Math.max(min,Math.min(max,Math.round(nv/step)*step));
      if(String(nv)!==sl.value){ sl.value=nv; sl.dispatchEvent(new Event('input',{bubbles:true})); }
    }
    cv.addEventListener('pointerdown',e=>{dragging=true;try{cv.setPointerCapture(e.pointerId);}catch(_){} apply(e.clientX,e.clientY,true,e.shiftKey);});
    cv.addEventListener('pointermove',e=>{if(dragging)apply(e.clientX,e.clientY,false,e.shiftKey);});
    const end=e=>{dragging=false;try{cv.releasePointerCapture(e.pointerId);}catch(_){}};
    cv.addEventListener('pointerup',end);cv.addEventListener('pointercancel',end);
  })();

  // poissonCanvas: horizontal drag → λ (0.5..20)
  bindHorizontal('poissonCanvas','poisL',(px,py,w)=>{
    return 0.5+px/w*19.5;
  });

  // expCanvas: horizontal drag → λ (0.1..3)
  bindHorizontal('expCanvas','expL',(px,py,w)=>{
    return 0.1+px/w*2.9;
  });

  // --- 三大検定分布 ドラッグ -----------------------------------------
  // t : drag → sample size n (3..100)
  // chi2 : drag → df (1..30)
  // F : drag → sample size n (5..100)
  function pxToDf(px, w){
    const frac = Math.max(0, Math.min(1, px / w));
    return 1 + frac * 29;
  }
  bindHorizontal('tDistCanvas', 'tN', (px, py, w) => {
    const frac = Math.max(0, Math.min(1, px / w));
    return 3 + frac * 97;
  });
  bindHorizontal('chiCanvas', 'chiDf', (px, py, w) => pxToDf(px, w));
  bindHorizontal('fCanvas', 'fGroupN', (px, py, w) => {
    const frac = Math.max(0, Math.min(1, px / w));
    return 5 + frac * 95;
  });

  // --- descriptive: x→N, Shift+drag→skew ---
  (function bindDescCanvas(){
    const cv=document.getElementById('descCanvas');
    const slN=document.getElementById('descN');
    const slS=document.getElementById('descSkew');
    if(!cv||!slN||!slS) return;
    cv.style.touchAction='none';
    let dragging=false, target=slN;
    function apply(clientX,clientY,initial,shiftKey){
      const r=cv.getBoundingClientRect();
      const frac=Math.max(0,Math.min(1,(clientX-r.left)/r.width));
      if(initial) target=shiftKey?slS:slN;
      const sl=target;
      const min=parseFloat(sl.min),max=parseFloat(sl.max),step=parseFloat(sl.step)||1;
      let nv=min+frac*(max-min);
      nv=Math.max(min,Math.min(max,Math.round(nv/step)*step));
      if(String(nv)!==sl.value){ sl.value=nv; sl.dispatchEvent(new Event('input',{bubbles:true})); }
    }
    cv.addEventListener('pointerdown',e=>{dragging=true;try{cv.setPointerCapture(e.pointerId);}catch(_){} apply(e.clientX,e.clientY,true,e.shiftKey);});
    cv.addEventListener('pointermove',e=>{if(dragging)apply(e.clientX,e.clientY,false,e.shiftKey);});
    const end=e=>{dragging=false;try{cv.releasePointerCapture(e.pointerId);}catch(_){}};
    cv.addEventListener('pointerup',end);cv.addEventListener('pointercancel',end);
  })();

  // prob: horizontal drag → P(A), Shift → P(B)
  (function bindProbCanvas(){
    const cv=document.getElementById('probCanvas');
    const slA=document.getElementById('probPA');
    const slB=document.getElementById('probPB');
    if(!cv||!slA||!slB) return;
    cv.style.touchAction='none';
    let dragging=false, target=slA;
    function apply(clientX,clientY,initial,shiftKey){
      const r=cv.getBoundingClientRect();
      const frac=Math.max(0,Math.min(1,(clientX-r.left)/r.width));
      if(initial) target=shiftKey?slB:slA;
      const sl=target;
      const min=parseFloat(sl.min),max=parseFloat(sl.max),step=parseFloat(sl.step)||0.01;
      let nv=min+frac*(max-min);
      nv=Math.max(min,Math.min(max,Math.round(nv/step)*step));
      if(String(nv)!==sl.value){ sl.value=nv; sl.dispatchEvent(new Event('input',{bubbles:true})); }
    }
    cv.addEventListener('pointerdown',e=>{dragging=true;try{cv.setPointerCapture(e.pointerId);}catch(_){} apply(e.clientX,e.clientY,true,e.shiftKey);});
    cv.addEventListener('pointermove',e=>{if(dragging)apply(e.clientX,e.clientY,false,e.shiftKey);});
    const end=e=>{dragging=false;try{cv.releasePointerCapture(e.pointerId);}catch(_){}};
    cv.addEventListener('pointerup',end);cv.addEventListener('pointercancel',end);
  })();

  // chitest canvases use click-to-add, no drag binding needed

  // anova: horizontal drag → effect, Shift → within SD
  (function bindAnovaCanvas(){
    const cv=document.getElementById('anovaCanvas');
    const slE=document.getElementById('anovaEffect');
    const slW=document.getElementById('anovaWithin');
    if(!cv||!slE||!slW) return;
    cv.style.touchAction='none';
    let dragging=false, target=slE;
    function apply(clientX,clientY,initial,shiftKey){
      const r=cv.getBoundingClientRect();
      const frac=Math.max(0,Math.min(1,(clientX-r.left)/r.width));
      if(initial) target=shiftKey?slW:slE;
      const sl=target;
      const min=parseFloat(sl.min),max=parseFloat(sl.max),step=parseFloat(sl.step)||0.1;
      let nv=min+frac*(max-min);
      nv=Math.max(min,Math.min(max,Math.round(nv/step)*step));
      if(String(nv)!==sl.value){ sl.value=nv; sl.dispatchEvent(new Event('input',{bubbles:true})); }
    }
    cv.addEventListener('pointerdown',e=>{dragging=true;try{cv.setPointerCapture(e.pointerId);}catch(_){} apply(e.clientX,e.clientY,true,e.shiftKey);});
    cv.addEventListener('pointermove',e=>{if(dragging)apply(e.clientX,e.clientY,false,e.shiftKey);});
    const end=e=>{dragging=false;try{cv.releasePointerCapture(e.pointerId);}catch(_){}};
    cv.addEventListener('pointerup',end);cv.addEventListener('pointercancel',end);
  })();

}
