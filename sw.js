// StatPlay - Service Worker
// Cache-first for exact-version static assets; build derives the cache key from content.
const CACHE = 'sp-v4.0.5-d7bc34906da8';
const EXPERIENCE_ASSETS = ["./bayesplay/", "./bayesplay/css/bayesplay.css", "./bayesplay/css/site-shell.css", "./bayesplay/index.html", "./bayesplay/js/main.js", "./bayesplay/js/math/beta.js", "./bayesplay/js/math/gamma.js", "./bayesplay/js/math/normal.js", "./bayesplay/js/math/pooling.js", "./bayesplay/js/modules/beta-binomial.js", "./bayesplay/js/modules/gamma-poisson.js", "./bayesplay/js/modules/hero.js", "./bayesplay/js/modules/hierarchical-bayes.js", "./bayesplay/js/modules/likelihood-strength.js", "./bayesplay/js/modules/normal-normal.js", "./bayesplay/js/modules/shrinkage.js", "./bayesplay/js/modules/update-comparison.js", "./bayesplay/js/ui/graph-motion.js", "./bayesplay/js/ui/group-plot.js", "./bayesplay/lab-01.html", "./bayesplay/lab-02.html", "./bayesplay/lab-03.html", "./bayesplay/lab-04.html", "./bayesplay/lab-05.html", "./bayesplay/lab-06.html", "./bayesplay/lab-07.html", "./en/math/partial-derivative.html", "./math/", "./math/index.html", "./math/partial-derivative.html"];
const ASSET_VERSION = '4.0.5';
const COLUMN_SLUGS = ["deviation", "birthday", "standardization", "income_prediction", "error_types", "se_vs_sd", "multivariate_analysis"];
const TOPIC_SLUGS = /* __TOPIC_SLUGS__ */ ["stdnorm", "normal", "prob", "bayes", "morep", "clt", "lln", "ci", "test", "proptest", "dists", "chitest", "anova", "corr", "reg", "mreg"];
const MODULE_FILES = ["a11y.js", "anchor.js", "anova.js", "autorun.js", "bayes.js", "birthday.js", "chitest.js", "chitest_common.js", "chitest_gof.js", "chitest_independence.js", "ci.js", "clt.js", "column-shell.js", "corr.js", "descriptive.js", "deviation.js", "dist.js", "dist_chi2.js", "dist_f.js", "dist_t.js", "error_types.js", "errs.js", "graphDrag.js", "hero.js", "htest.js", "income_prediction.js", "lang.js", "lln.js", "mathplay-preview.js", "morep.js", "mreg.js", "multivariate-hero.js", "multivariate-i18n.js", "multivariate-model.js", "multivariate-motion.js", "multivariate-pca.js", "multivariate.js", "nav.js", "normal.js", "partial-derivative-model.js", "partial-derivative.js", "prefs.js", "prob.js", "proptest.js", "pwa.js", "reg.js", "reveal.js", "scrolltop.js", "se_vs_sd.js", "share.js", "site-shell.js", "stdnorm.js", "tables.js", "theme.js", "toc.js", "urlParams.js", "version.js"];
const CORE_MODULE_FILES = ["prefs.js", "hero.js", "reveal.js", "nav.js", "autorun.js", "share.js", "urlParams.js", "lang.js", "theme.js", "graphDrag.js", "anchor.js", "a11y.js", "toc.js", "scrolltop.js", "version.js", "pwa.js", "tables.js"];
const CSS_FILES = ["./css/math-lab.css", "./css/multivariate.css", "./css/stat_cyber.css"];
const ASSETS = [
  ...EXPERIENCE_ASSETS,
  './',
  './index.html',
  './en/index.html',
  ...CSS_FILES,
  './js/main.js',
  './js/utils.js',
  './js/katex-render.js',
  ...MODULE_FILES.map(f => `./js/modules/${f}`),
  './stat_cyber_og.png',
  './manifest.webmanifest',
  './sitemap.xml',
  './robots.txt',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/favicon.svg',
  ...TOPIC_SLUGS.flatMap(s => [`./topics/${s}.html`, `./en/topics/${s}.html`]),
  ...COLUMN_SLUGS.flatMap(s => [`./columns/${s}.html`, `./en/columns/${s}.html`]),
  './about.html',
  './en/about.html',
  './privacy.html',
  './en/privacy.html',
  './tables/index.html',
  './en/tables/index.html'
];
// The hub's static import graph is required for an offline opening. Other
// lessons are cached independently: one missing optional asset must not abort
// a Service Worker update or discard all the other offline lessons.
const CORE_ASSETS = [
  './', './index.html', './en/index.html',
  './css/stat_cyber.css', './js/main.js', './js/utils.js',
  ...CORE_MODULE_FILES.map(f => `./js/modules/${f}`)
];
const coreSet = new Set(CORE_ASSETS);
const OPTIONAL_ASSETS = ASSETS.filter(url => !coreSet.has(url));
function cacheRequest(url){
  return new Request(/\.(js|css)$/.test(url) ? `${url}?v=${ASSET_VERSION}` : url, {cache: 'reload'});
}

function matchCurrentFirst(request){
  return caches.open(CACHE).then(cache => cache.match(request))
    .then(hit => hit || caches.match(request));
}

self.addEventListener('install', (e) => {
  // Reload bypasses the HTTP cache, including previously immutable assets.
  e.waitUntil(caches.open(CACHE).then(async cache => {
    await cache.addAll(CORE_ASSETS.map(cacheRequest));
    let next = 0;
    await Promise.all(Array.from({length: 8}, async () => {
      while(next < OPTIONAL_ASSETS.length){
        const url = OPTIONAL_ASSETS[next++];
        try{ await cache.add(cacheRequest(url)); }
        catch(err){ console.warn('[statplay] optional offline asset unavailable:', url, err); }
      }
    }));
    await self.skipWaiting();
  }));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => {
      // A lesson already open under the previous worker may lazy-load its
      // versioned JS/CSS after going offline. Keep one prior StatPlay cache.
      const old = keys.filter(k => k.startsWith('sp-v') && k !== CACHE);
      const previous = old.at(-1);
      return Promise.all(old.filter(k => k !== previous).map(k => caches.delete(k)));
    }).then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  const isLocal = url.origin === self.location.origin;
  const isCDN = url.hostname === 'cdn.jsdelivr.net';
  if(!isLocal && !isCDN) return;
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
      }).catch(() => matchCurrentFirst(req).then(hit => hit || Response.error()))
    );
  } else {
    // Cache-first for static assets (CSS/JS/images).
    e.respondWith(
      matchCurrentFirst(req).then(hit => {
        if(hit) return hit;
        return fetch(req).then(res => {
          if(!res || res.status !== 200 || res.type === 'opaque') return res;
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
          return res;
        }).catch(() => Response.error());
      })
    );
  }
});
