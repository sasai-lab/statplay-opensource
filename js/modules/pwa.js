// StatPlay - module: PWA - register service worker after window load.
// Registration is wrapped in a load handler so SW install doesn't compete
// with the initial paint.
export function initPwa(){
  if(!('serviceWorker' in navigator)) return;
  if(location.protocol !== 'http:' && location.protocol !== 'https:') return;
  if(location.hostname === 'localhost' || location.hostname === '127.0.0.1') return;
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if(reloading) return;
    reloading = true;
    location.reload();
  });
  window.addEventListener('load', () => {
    // sw.js lives at the deploy root, but this page may be at /topics/<x>.html
    // or /en/topics/<x>.html. Register relative to the root rather than the
    // page — a bare './sw.js' on /topics/foo.html resolves to /topics/sw.js
    // (404/403 on the live host) — and give the SW a root scope so it covers
    // the whole site, not just the current directory.
    const dirDepth = location.pathname.replace(/\/[^/]*$/, '').split('/').filter(Boolean).length;
    const toRoot = dirDepth === 0 ? './' : '../'.repeat(dirDepth);
    navigator.serviceWorker.register(toRoot + 'sw.js', {scope: toRoot})
      .catch(err => { try{ console.warn('[PWA] SW registration failed:', err); }catch(_){} });
  });
}
