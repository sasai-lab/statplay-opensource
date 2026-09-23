// Column-specific enhancement on top of the shared site controls.
import { initSiteShell } from './site-shell.js';
import { initScrolltop } from './scrolltop.js';
const columnShellInitialized = new WeakSet();
export function initColumnShell() {
  if (columnShellInitialized.has(document) || !document.body.classList.contains('column-page')) return;
  columnShellInitialized.add(document);
  initSiteShell();
  initScrolltop();
}
initColumnShell();
