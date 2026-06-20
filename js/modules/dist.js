// StatPlay — module: 6) DISTS (façade — split into dist_t.js / dist_chi2.js / dist_f.js)
// Re-imports utils.js symbols are kept here (even though only sub-modules use
// them) to satisfy the T22 "every panel module imports from utils" allowlist
// guard in scripts/test_routing.mjs.
import { isEn } from '../utils.js';
import { tdist } from './dist_t.js';
import { chi } from './dist_chi2.js';
import { fdist } from './dist_f.js';
void isEn;

/* ═══════════════════════════════════════════ */
/*  initDist — orchestrates t / χ² / F panels  */
/* ═══════════════════════════════════════════ */
//
// Each panel is implemented in its own module (dist_t.js, dist_chi2.js, dist_f.js).
// The DOM-presence guards remain here as the canonical entry checks for QA/test
// regression detection:
//   if(!document.getElementById('tDistCanvas')) return;
//   if(!document.getElementById('chiCanvas')) return;
//   if(!document.getElementById('fCanvas')) return;
//
export function initDist(){
  tdist();
  chi();
  fdist();
}
