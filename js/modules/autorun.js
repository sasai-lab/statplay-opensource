// StatPlay — module: AUTO-RUN ON SCROLL
import { $, TAU, rng_normal, rng_exp, rng_uniform, rng_bimodal, erf, normCDF, normPDF, zCritical, lgamma, gamma, tPDF, chi2PDF, fPDF, resizeCanvas, drawGrid, neonLine, neonFill } from '../utils.js';

export function initAutorun(){
  const panels=document.querySelectorAll('[data-autorun]');
  const seen=new WeakSet();
  const io=new IntersectionObserver(entries=>{
    entries.forEach(e=>{
      if(!e.isIntersecting||seen.has(e.target)) return;
      const id=e.target.getAttribute('data-autorun');
      const btn=document.getElementById(id);
      if(btn){seen.add(e.target);btn.click();}
    });
  },{threshold:0.35});
  panels.forEach(p=>io.observe(p));
}
