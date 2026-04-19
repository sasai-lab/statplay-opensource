// StatPlay - Service Worker
// Cache-first for static assets; bumps version to invalidate on deploy.
const CACHE = 'sp-v7';
const TOPIC_SLUGS = /* __TOPIC_SLUGS__ */ ["stdnorm", "normal", "prob", "morep", "bayes", "clt", "lln", "ci", "test", "dists", "chitest", "reg", "mreg"];
const MODULE_FILES = [
  'a11y.js','anchor.js','anova.js','autorun.js','bayes.js','chitest.js',
  'ci.js','clt.js','corr.js','descriptive.js','deviation.js','dist.js',
  'errs.js','graphDrag.js','hero.js','htest.js','lang.js','lln.js',
  'morep.js','mreg.js','nav.js','normal.js','prefs.js','prob.js',
  'pwa.js','reg.js','reveal.js','share.js','stdnorm.js','theme.js',
  'toc.js','urlParams.js'
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
  /* __COLUMN_PATHS__ */ './columns/deviation.html',
  './en/columns/deviation.html',
  './columns/birthday.html',
  './en/columns/birthday.html'
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
  // Only cache GET same-origin requests.
  if(req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    caches.match(req).then(hit => {
      if(hit) return hit;
      return fetch(req).then(res => {
        // Don't cache non-OK or opaque responses.
        if(!res || res.status !== 200 || res.type === 'opaque') return res;
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
