// StatPlay — module: LANGUAGE TOGGLE (Route A: JA/EN are separate pages)

// Persist the user's explicit language choice in BOTH localStorage (for the
// UI to read on subsequent loads) and a first-party cookie. The cookie is
// what the CloudFront viewer-request function reads to skip Accept-Language
// auto-redirection — without it, a JA-pinned user on an English-OS browser
// would keep getting bounced to /en/.
function persistLangChoice(lang){
  try { localStorage.setItem('sp:lang', lang); } catch(_) {}
  try {
    const secure = location.protocol === 'https:' ? '; Secure' : '';
    // 2 years; SameSite=Lax so the cookie travels on top-level GET nav.
    document.cookie = `sp_lang=${lang}; Path=/; Max-Age=63072000; SameSite=Lax${secure}`;
  } catch(_) {}
}

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
    if(htmlLang==='en'){
      persistLangChoice('ja');
      window.location.href='../index.html';
    } else {
      persistLangChoice('en');
      window.location.href='en/index.html';
    }
  });

  // Initial redraw
  window.dispatchEvent(new Event('resize'));
  document.querySelectorAll('input[type="range"],select').forEach(el=>{
    try{el.dispatchEvent(new Event('input',{bubbles:true}));}catch(_){}
  });
}
