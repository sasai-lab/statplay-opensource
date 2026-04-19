// StatPlay - module: version display.
// Single source of truth for the app version shown in footers.
// bump_version.py updates the constant below alongside package.json.
const APP_VERSION = 'v2.0.0';

(function version(){
  document.querySelectorAll('#app-version, #app-version-en').forEach(function(el){
    el.textContent = APP_VERSION;
  });
})();
