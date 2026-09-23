// Shared site controls for all column pages; loaded once by the column builder.
import { initPrefs } from './prefs.js';
import { initNav } from './nav.js';
import { initTheme } from './theme.js';
import { initVersion } from './version.js';
import { initScrolltop } from './scrolltop.js';
import { initPwa } from './pwa.js';

let initialized = false;
export function initColumnShell() {
  if (initialized || !document.body.classList.contains('column-page')) return;
  initialized = true;
  initPrefs();
  initNav();
  initTheme();
  initVersion();
  initScrolltop();
  initPwa();
  document.getElementById('columnLangSwitch')?.addEventListener('click', event => {
    const lang = event.currentTarget.hreflang;
    try { localStorage.setItem('sp:lang', lang); } catch (_) { /* Optional preference. */ }
    const secure = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `sp_lang=${lang}; Path=/; Max-Age=63072000; SameSite=Lax${secure}`;
  });
}

initColumnShell();
