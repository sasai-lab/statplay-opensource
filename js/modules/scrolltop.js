// StatPlay - module: scroll-to-top floating button.
(function scrolltop(){
  const btn = document.createElement('button');
  btn.className = 'scroll-top-btn';
  btn.setAttribute('aria-label', 'Scroll to top');
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
    window.scrollTo({top:0, behavior:'smooth'});
  });
})();
