// Lightweight shell: no StatPlay chart modules are imported here.
import { initPrefs } from './prefs.js';
import { initNav } from './nav.js';
import { initLang } from './lang.js';
import { initTheme } from './theme.js';
import { initVersion } from './version.js';
import { initPwa } from './pwa.js';

const siteShellInitialized = new WeakSet();
export function initSiteShell() {
  if (siteShellInitialized.has(document)) return;
  siteShellInitialized.add(document);
  initPrefs();
  initNav();
  initLang();
  initTheme();
  initVersion();
  initPwa();
}
initSiteShell();
