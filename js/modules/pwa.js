// StatPlay - module: PWA - register service worker after window load.
// Registration is wrapped in a load handler so SW install doesn't compete
// with the initial paint.
(function pwa(){
  if(!('serviceWorker' in navigator)) return;
  // Only register on http(s) — skip file:// to avoid console noise during local dev.
  if(location.protocol !== 'http:' && location.protocol !== 'https:') return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', {scope: './'})
      .catch(err => { try{ console.warn('[PWA] SW registration failed:', err); }catch(_){} });
  });
})();
