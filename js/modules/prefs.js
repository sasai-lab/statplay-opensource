// StatPlay - module: PREFS - honor OS accessibility preferences.
//
// Exposes:
//   window.__REDUCED_MOTION : boolean   (live - reflects current OS setting)
//   window.__OS_PREFERS_LIGHT : boolean (live - reflects prefers-color-scheme)
//
// theme.js consumes __OS_PREFERS_LIGHT to pick an initial theme when no URL
// ?theme= override is present. Animation modules (hero, CLT, LLN, etc.) can
// consult __REDUCED_MOTION to shortcut long animations.

export function initPrefs(){
  const mqMotion = (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)')) || null;
  const mqLight  = (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)')) || null;

  function update(){
    window.__REDUCED_MOTION = !!(mqMotion && mqMotion.matches);
    window.__OS_PREFERS_LIGHT = !!(mqLight && mqLight.matches);
  }
  update();

  const htmlLang = document.documentElement.lang || 'ja';
  window.__LANG = htmlLang === 'en' ? 'en' : 'ja';

  // Keep flags in sync if the user changes OS preferences mid-session.
  if(mqMotion && mqMotion.addEventListener){
    mqMotion.addEventListener('change', ()=>{
      update();
      window.dispatchEvent(new CustomEvent('prefs:change', {detail:{reducedMotion:window.__REDUCED_MOTION}}));
    });
  }
  if(mqLight && mqLight.addEventListener){
    mqLight.addEventListener('change', ()=>{
      update();
      // Only auto-apply if user hasn't chosen a theme explicitly via URL.
      const urlTheme = new URLSearchParams(location.search).get('theme');
      if(!urlTheme){
        window.dispatchEvent(new CustomEvent('prefs:colorscheme', {detail:{osPrefersLight:window.__OS_PREFERS_LIGHT}}));
      }
    });
  }
}
