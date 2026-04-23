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
    navigator.serviceWorker.register('./sw.js', {scope: './'})
      .catch(err => { try{ console.warn('[PWA] SW registration failed:', err); }catch(_){} });
  });
}
