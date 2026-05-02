// StatPlay — module: LANGUAGE TOGGLE (Route A: JA/EN are separate pages)

export function initLang(){
  const htmlLang = document.documentElement.lang || 'ja';
  window.__LANG = htmlLang === 'en' ? 'en' : 'ja';

  // Apply option text for current language
  document.querySelectorAll('option[data-ja][data-en]').forEach(op=>{
    const t=op.getAttribute(htmlLang==='en'?'data-en':'data-ja');
    if(t!=null) op.textContent=t;
  });

  // Set lang-en class for CSS data-lang visibility rules
  if(htmlLang==='en') document.body.classList.add('lang-en');

  const btn=document.getElementById('langToggle');
  if(!btn) return;

  // Hub pages: navigate to other language hub
  btn.textContent=htmlLang==='en'?'日本語':'EN';
  btn.addEventListener('click',()=>{
    if(htmlLang==='en') window.location.href='../index.html';
    else window.location.href='en/index.html';
  });

  // Initial redraw
  window.dispatchEvent(new Event('resize'));
  document.querySelectorAll('input[type="range"],select').forEach(el=>{
    try{el.dispatchEvent(new Event('input',{bubbles:true}));}catch(_){}
  });
}
