// StatPlay — module: THEME TOGGLE (dark <-> light)
//
// Behaviour:
//   - Default is dark (cyberpunk).
//   - `?theme=light` in the URL forces light mode on load.
//   - The #themeToggle button in nav flips the mode and updates the URL
//     query string via history.replaceState so that copy-link also captures
//     the user's preference.
//   - Button label shows the mode it will switch TO when clicked, not the
//     current mode (common UX convention for theme toggles).
//   - Hero canvas stays dark — it's the site's brand. Other canvases are
//     filter-inverted for light mode so neon graphs become dark-on-light.
import { $, TAU, rng_normal, rng_exp, rng_uniform, rng_bimodal, erf, normCDF, normPDF, zCritical, lgamma, gamma, tPDF, chi2PDF, fPDF, resizeCanvas, drawGrid, neonLine, neonFill } from '../utils.js';

export function initTheme(){
  const btn = document.getElementById('themeToggle');
  if(!btn) return;

  function applyTheme(mode){
    if(mode === 'light') document.body.classList.add('theme-light');
    else document.body.classList.remove('theme-light');
    try{ localStorage.setItem('svl_theme', mode); }catch(_){}
    // Text label in the monospace cyberpunk style; shows the target mode so
    // the user can see what they'll get on click.
    //   Currently dark  -> show "LIGHT"  (click to go light)
    //   Currently light -> show "DARK"   (click to go dark)
    btn.textContent = mode === 'light' ? 'DARK' : 'LIGHT';
    btn.setAttribute('aria-label', mode === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
    btn.setAttribute('title', mode === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
    btn.setAttribute('aria-pressed', mode === 'light' ? 'true' : 'false');
    window.__THEME = mode;
    // Update URL param so shared links carry the theme.
    try{
      const u = new URL(location.href);
      if(mode === 'light') u.searchParams.set('theme', 'light');
      else u.searchParams.delete('theme');
      history.replaceState(null, '', u.toString());
    }catch(_){ /* ignore */ }
    // Ping canvases to redraw — some modules cache gradients/colors.
    window.dispatchEvent(new Event('resize'));
    document.querySelectorAll('input[type="range"],select').forEach(el=>{
      try{ el.dispatchEvent(new Event('input',{bubbles:true})); }catch(_){}
    });
  }

  // Initial mode: URL param > OS prefers-color-scheme > dark default.
  function pickInitial(){
    const urlTheme = new URLSearchParams(location.search).get('theme');
    if(urlTheme === 'light') return 'light';
    if(urlTheme === 'dark')  return 'dark';
    try{ const saved = localStorage.getItem('svl_theme'); if(saved) return saved; }catch(_){}
    if(window.__OS_PREFERS_LIGHT) return 'light';
    return 'dark';
  }
  applyTheme(pickInitial());

  // React to live OS color-scheme changes (when no URL override).
  window.addEventListener('prefs:colorscheme', (e)=>{
    const urlTheme = new URLSearchParams(location.search).get('theme');
    if(urlTheme) return; // user choice wins
    applyTheme(e.detail && e.detail.osPrefersLight ? 'light' : 'dark');
    // Drop the URL param we might have added during a prior manual toggle
    // reset - but only when no URL override exists, which we already checked.
  });

  btn.addEventListener('click', ()=>{
    applyTheme(document.body.classList.contains('theme-light') ? 'dark' : 'light');
  });
}
