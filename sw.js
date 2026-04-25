// StatPlay - Service Worker
// Cache-first for static assets; bumps version to invalidate on deploy.
const CACHE = 'sp-v3.2.0';
const COLUMN_SLUGS = ["deviation", "birthday", "standardization", "how_statplay_was_built"];
const TOPIC_SLUGS = /* __TOPIC_SLUGS__ */ ["stdnorm", "normal", "prob", "bayes", "morep", "clt", "lln", "ci", "test", "dists", "chitest", "reg", "mreg"];
const MODULE_FILES = [
  'a11y.js','anchor.js','anova.js','autorun.js','bayes.js','chitest.js',
  'ci.js','clt.js','corr.js','descriptive.js','deviation.js','dist.js',
  'errs.js','graphDrag.js','hero.js','htest.js','lang.js','lln.js',
  'morep.js','mreg.js','nav.js','normal.js','prefs.js','prob.js',
  'pwa.js','reg.js','reveal.js','scrolltop.js','share.js','stdnorm.js','tables.js','theme.js',
  'toc.js','urlParams.js','version.js'
];
const ASSETS = [
  './',
  './index.html',
  './css/stat_cyber.css',
  './js/main.js',
  './js/utils.js',
  ...MODULE_FILES.map(f => `./js/modules/${f}`),
  './stat_cyber_og.png',
  './manifest.webmanifest',
  './sitemap.xml',
  './robots.txt',
  './icons/icon-192.png',
  './icons/icon-512.png',
  ...TOPIC_SLUGS.flatMap(s => [`./topics/${s}.html`, `./en/topics/${s}.html`]),
  ...COLUMN_SLUGS.flatMap(s => [`./columns/${s}.html`, `./en/columns/${s}.html`]),
  './about.html',
  './en/about.html',
  './tables/index.html',
  './en/tables/index.html'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if(req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  const url = new URL(req.url);
  const isNav = req.mode === 'navigate'
    || url.pathname.endsWith('.html')
    || url.pathname.endsWith('/');
  if(isNav){
    // Network-first for HTML — always show latest content.
    e.respondWith(
      fetch(req).then(res => {
        if(res && res.status === 200){
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
    );
  } else {
    // Cache-first for static assets (CSS/JS/images).
    e.respondWith(
      caches.match(req).then(hit => {
        if(hit) return hit;
        return fetch(req).then(res => {
          if(!res || res.status !== 200 || res.type === 'opaque') return res;
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
          return res;
        }).catch(() => caches.match('./index.html'));
      })
    );
  }
});
