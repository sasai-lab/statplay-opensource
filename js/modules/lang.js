// StatPlay — module: LANGUAGE TOGGLE (JA <-> EN)
import { $, TAU, rng_normal, rng_exp, rng_uniform, rng_bimodal, erf, normCDF, normPDF, zCritical, lgamma, gamma, tPDF, chi2PDF, fPDF, resizeCanvas, drawGrid, neonLine, neonFill } from '../utils.js';

export function initLang(){
  const htmlLang = document.documentElement.lang || 'ja';
  window.__LANG = htmlLang === 'en' ? 'en' : 'ja';
  const btn=document.getElementById('langToggle');
  if(!btn) return;
  function swapOptions(l){
    document.querySelectorAll('option[data-ja][data-en]').forEach(op=>{
      const t=op.getAttribute(l==='en'?'data-en':'data-ja');
      if(t!=null) op.textContent=t;
    });
  }
  function setLang(l){
    if(l==='en') document.body.classList.add('lang-en');
    else document.body.classList.remove('lang-en');
    document.documentElement.lang=l;
    btn.textContent=l==='en'?'日本語':'EN';
    window.__LANG=l;
    try{localStorage.setItem('statplay-lang',l);}catch(_){}
    swapOptions(l);
    window.dispatchEvent(new Event('resize'));
    document.querySelectorAll('input[type="range"],select').forEach(el=>{
      try{el.dispatchEvent(new Event('input',{bubbles:true}));}catch(_){}
    });
  }
  btn.addEventListener('click',()=>{
    setLang(document.body.classList.contains('lang-en')?'ja':'en');
  });
  const saved=(() => {try{return localStorage.getItem('statplay-lang');}catch(_){return null;}})();
  setLang(saved || window.__LANG || 'ja');
}
