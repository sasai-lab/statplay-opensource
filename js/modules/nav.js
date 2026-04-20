// StatPlay - module: NAV - hamburger, dropdown, smooth scroll
import { $, TAU, rng_normal, rng_exp, rng_uniform, rng_bimodal, erf, normCDF, normPDF, zCritical, lgamma, gamma, tPDF, chi2PDF, fPDF, resizeCanvas, drawGrid, neonLine, neonFill } from '../utils.js';

export function initNav(){
  const navEl=document.getElementById('mainNav');
  const toggle=document.getElementById('navToggle');
  const links=document.getElementById('navLinks');
  const close=()=>{if(!navEl||!toggle) return; navEl.classList.remove('open'); toggle.setAttribute('aria-expanded','false');};

  if(navEl && toggle){
    toggle.addEventListener('click',()=>{
      const open=navEl.classList.toggle('open');
      toggle.setAttribute('aria-expanded',open?'true':'false');
      if(!open) navEl.querySelectorAll('.nav-dropdown.open').forEach(d=>d.classList.remove('open'));
    });
    window.addEventListener('resize',()=>{
      if(window.innerWidth>760){ close(); navEl.querySelectorAll('.nav-dropdown.open').forEach(d=>d.classList.remove('open')); }
    });
    document.addEventListener('click',e=>{
      if(!navEl.classList.contains('open')) return;
      if(!navEl.contains(e.target)) close();
    });
  }

  // Dropdown toggle on mobile (tap category link to expand/collapse)
  const isMobile=()=>window.innerWidth<=760;
  document.querySelectorAll('.nav-dropdown').forEach(dd=>{
    const catLink=dd.querySelector('.nav-cat-link');
    if(!catLink) return;
    catLink.addEventListener('click',e=>{
      if(!isMobile()) return;
      e.preventDefault();
      const wasOpen=dd.classList.contains('open');
      // Close all others
      document.querySelectorAll('.nav-dropdown.open').forEach(d=>d.classList.remove('open'));
      if(!wasOpen) dd.classList.add('open');
    });
  });

  // Dropdown menu item click: scroll to section + close everything
  document.querySelectorAll('.nav-dropdown-menu a').forEach(a=>{
    a.addEventListener('click',()=>{
      document.querySelectorAll('.nav-dropdown.open').forEach(d=>d.classList.remove('open'));
      close();
    });
  });

  // Close dropdown on outside click (desktop)
  document.addEventListener('click',e=>{
    if(isMobile()) return;
    if(!e.target.closest('.nav-dropdown')){
      document.querySelectorAll('.nav-dropdown.open').forEach(d=>d.classList.remove('open'));
    }
  });

  // Logo click -> smooth scroll to top
  document.querySelectorAll('.logo').forEach(el=>{
    el.addEventListener('click',e=>{
      if(e.defaultPrevented) return;
      if(e.ctrlKey||e.metaKey||e.shiftKey||e.altKey||e.button===1) return;
      if(document.body.classList.contains('topic-page')) return;
      e.preventDefault();
      try{ window.scrollTo({top:0,left:0,behavior:'smooth'}); }
      catch(_){ window.scrollTo(0,0); }
      if(location.hash){
        try{ history.replaceState(null,'',location.pathname+location.search); }catch(_){}
      }
      close();
    });
  });
}
