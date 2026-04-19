// StatPlay — module: URL PARAM RESTORE — reads ?id1=v1&id2=v2 and applies saved slider state
import { $, TAU, rng_normal, rng_exp, rng_uniform, rng_bimodal, erf, normCDF, normPDF, zCritical, lgamma, gamma, tPDF, chi2PDF, fPDF, resizeCanvas, drawGrid, neonLine, neonFill } from '../utils.js';

(function urlParams(){
  const params=new URLSearchParams(location.search);
  if([...params.keys()].length===0) return;
  // Apply values, then fire events to trigger each module's draw/clear logic.
  const pending=[];
  params.forEach((v,k)=>{
    const el=document.getElementById(k);
    if(!el) return;
    if(el.tagName==='SELECT'){
      el.value=v;
      pending.push([el,'change']);
    } else if(el.tagName==='INPUT'){
      el.value=v;
      pending.push([el,'input']);
    }
  });
  // Dispatch after the current microtask so all modules are fully initialized.
  setTimeout(()=>{
    pending.forEach(([el,type])=>{
      try{el.dispatchEvent(new Event(type,{bubbles:true}));}catch(_){}
    });
  },50);
})();
