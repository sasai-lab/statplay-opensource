// Shared keyboard and pointer navigation. Each DOM header is navInitialized once.
const navInitialized = new WeakSet();
export function initNav() {
  const nav = document.getElementById('mainNav');
  const toggle = document.getElementById('navToggle');
  if (!nav || !toggle || navInitialized.has(nav)) return;
  navInitialized.add(nav);
  const dropdowns = [...nav.querySelectorAll('.nav-dropdown')];
  const languageToggle = nav.querySelector('#siteLanguageToggle');
  const languageNotice = nav.querySelector('#siteLanguageNotice');
  function closeDropdowns() {
    dropdowns.forEach(dd => {
      dd.classList.remove('open');
      dd.querySelector('.nav-cat-link')?.setAttribute('aria-expanded', 'false');
    });
  }
  function closeLanguage() {
    if (!languageNotice) return;
    languageNotice.hidden = true;
    languageToggle.setAttribute('aria-expanded', 'false');
  }
  function close() {
    nav.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    closeDropdowns();
    closeLanguage();
  }
  toggle.addEventListener('click', () => {
    const open = !nav.classList.contains('open');
    close();
    nav.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
  });
  dropdowns.forEach(dd => {
    const button = dd.querySelector('.nav-cat-link');
    button?.addEventListener('click', event => {
      event.preventDefault();
      const open = !dd.classList.contains('open');
      closeDropdowns();
      closeLanguage();
      dd.classList.toggle('open', open);
      button.setAttribute('aria-expanded', String(open));
    });
  });
  languageToggle?.addEventListener('click', () => {
    const open = languageNotice.hidden;
    closeDropdowns();
    languageNotice.hidden = !open;
    languageToggle.setAttribute('aria-expanded', String(open));
  });
  nav.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const dropdown = dropdowns.find(dd => dd.classList.contains('open'));
    if (languageNotice && !languageNotice.hidden) {
      closeLanguage();
      languageToggle.focus();
    } else if (dropdown) {
      closeDropdowns();
      dropdown.querySelector('.nav-cat-link').focus();
    } else if (nav.classList.contains('open')) {
      close();
      toggle.focus();
    }
  });
  document.addEventListener('click', event => { if (!nav.contains(event.target)) close(); });
  nav.addEventListener('focusout', event => { if (event.relatedTarget && !nav.contains(event.relatedTarget)) close(); });
  let wasMobile = window.innerWidth <= 1024;
  window.addEventListener('resize', () => {
    const mobile = window.innerWidth <= 1024;
    if (mobile !== wasMobile) close();
    wasMobile = mobile;
  });
  nav.querySelector('.logo')?.addEventListener('click', event => {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button) return;
    if (document.body.classList.contains('topic-page')) return;
    const normalize = path => path.replace(/index\.html$/, '');
    if (normalize(new URL(event.currentTarget.href, location.href).pathname) !== normalize(location.pathname)) return;
    event.preventDefault();
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  });
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', close));
}
