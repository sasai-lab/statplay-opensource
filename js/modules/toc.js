// StatPlay - module: TOC - fixed side TOC + scroll progress bar.
//
// Reads every <section id> and its .sec-title[data-lang] to build a floating
// side-rail with section links. Highlights the current-visible section using
// IntersectionObserver. Also draws a thin progress bar at the top of viewport
// showing overall scroll progress.
(function toc(){
  const sections = Array.from(document.querySelectorAll('section[id]'))
    .filter(s => s.querySelector('.sec-title'));
  if(!sections.length) return;

  // --- 1. Build progress bar -----------------------------------------------
  const bar = document.createElement('div');
  bar.className = 'scroll-progress';
  bar.setAttribute('aria-hidden', 'true');
  const fill = document.createElement('div');
  fill.className = 'scroll-progress-fill';
  bar.appendChild(fill);
  document.body.appendChild(bar);

  function updateProgress(){
    const docH = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docH > 0 ? (window.scrollY / docH) * 100 : 0;
    fill.style.width = Math.max(0, Math.min(100, pct)) + '%';
  }
  updateProgress();
  window.addEventListener('scroll', updateProgress, {passive:true});
  window.addEventListener('resize', updateProgress, {passive:true});

  // --- 2. Build side TOC ---------------------------------------------------
  const nav = document.createElement('nav');
  nav.className = 'side-toc';
  nav.setAttribute('aria-label', 'Section navigation');
  const list = document.createElement('ol');
  list.className = 'side-toc-list';
  nav.appendChild(list);

  function titleFor(sec){
    const isEn = document.body.classList.contains('lang-en');
    const lang = isEn ? 'en' : 'ja';
    const h = sec.querySelector('.sec-title[data-lang="'+lang+'"]') || sec.querySelector('.sec-title');
    if(!h) return sec.id;
    const clone = h.cloneNode(true);
    clone.querySelectorAll('.sec-sub').forEach(el => el.remove());
    return (clone.textContent || sec.id).trim().replace(/\s+/g, ' ');
  }

  const linkMap = new Map(); // sectionId -> <a>
  sections.forEach(sec => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = '#' + sec.id;
    a.textContent = titleFor(sec);
    a.setAttribute('data-toc-for', sec.id);
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const tgt = document.getElementById(sec.id);
      if(!tgt) return;
      tgt.scrollIntoView({behavior:'smooth', block:'start'});
      try{ history.replaceState(null, '', '#' + sec.id); }catch(_){}
    });
    li.appendChild(a);
    list.appendChild(li);
    linkMap.set(sec.id, a);
  });
  document.body.appendChild(nav);

  // Re-label TOC when language toggles
  window.addEventListener('click', (e) => {
    if(e.target && e.target.id === 'langToggle'){
      // Wait a tick for lang-en class to flip
      setTimeout(() => {
        sections.forEach(sec => {
          const a = linkMap.get(sec.id);
          if(a) a.textContent = titleFor(sec);
        });
      }, 10);
    }
  });

  // --- 3. Current-section highlight (scroll-position based) ----------------
  const headerNav = document.getElementById('navLinks');
  const catHeaders = Array.from(document.querySelectorAll('.category-header[id]'));
  let currentId = '';
  let currentCat = '';

  function findActiveCat(scrollTrigger){
    let activeCat = '';
    for(let i = catHeaders.length - 1; i >= 0; i--){
      if(catHeaders[i].offsetTop <= scrollTrigger){ activeCat = catHeaders[i].id; break; }
    }
    return activeCat;
  }

  function highlightCurrent(){
    const scrollY = window.scrollY;
    const trigger = scrollY + window.innerHeight * 0.3;
    let activeId = '';
    for(let i = sections.length - 1; i >= 0; i--){
      if(sections[i].offsetTop <= trigger){ activeId = sections[i].id; break; }
    }
    const activeCat = findActiveCat(trigger);
    if(activeId === currentId && activeCat === currentCat) return;
    currentId = activeId;
    currentCat = activeCat;
    list.querySelectorAll('a.current').forEach(x => x.classList.remove('current'));
    if(headerNav) headerNav.querySelectorAll('.nav-cat-link.current').forEach(x => x.classList.remove('current'));
    if(activeId){
      const a = linkMap.get(activeId);
      if(a){
        a.classList.add('current');
        if(a.scrollIntoView) a.scrollIntoView({block:'nearest',behavior:'smooth'});
      }
    }
    if(activeCat && headerNav){
      const catLink = headerNav.querySelector('a[href="#'+activeCat+'"]');
      if(catLink) catLink.classList.add('current');
    }
  }
  highlightCurrent();
  window.addEventListener('scroll', highlightCurrent, {passive:true});
})();
