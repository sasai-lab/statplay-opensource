// StatPlay - module: scroll-to-top floating button.
export function initScrolltop(){
  const btn = document.createElement('button');
  btn.className = 'scroll-top-btn';
  btn.type = 'button';
  btn.setAttribute('aria-label', document.documentElement.lang === 'en' ? 'Scroll to top' : 'ページの先頭へ');
  btn.innerHTML = '&#x25B2;';
  document.body.appendChild(btn);

  let visible = false;
  function toggle(){
    const show = window.scrollY > 300;
    if(show === visible) return;
    visible = show;
    btn.classList.toggle('visible', show);
  }

  toggle();
  window.addEventListener('scroll', toggle, {passive:true});

  btn.addEventListener('click', function(){
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({top:0, behavior:reduce ? 'auto' : 'smooth'});
  });
}
