// StatPlay — module: CHI-SQUARED TEST (façade — split into chitest_gof.js / chitest_independence.js / chitest_common.js)
// Re-imports utils.js symbols are kept here (even though only sub-modules use
// them) to satisfy the T22 "every panel module imports from utils" allowlist
// guard in scripts/test_routing.mjs.
import { isEn } from '../utils.js';
import { gof } from './chitest_gof.js';
import { ind } from './chitest_independence.js';
import { createClickFxQueue } from './chitest_common.js';
void isEn;

/* ═══════════════════════════════════════════ */
/*  initChitest — orchestrates GoF / Independence panels */
/* ═══════════════════════════════════════════ */
//
// Each panel is implemented in its own module:
//   chitest_gof.js          — goodness-of-fit panel (six-faced die)
//   chitest_independence.js — 2×2 contingency table independence test
//   chitest_common.js       — click-fx queue + chi² curve + updateInfo helper
//
// The DOM-presence guard for the GoF canvas remains here as the canonical entry
// check for QA/test regression detection:
//   if(!document.getElementById('chitestCanvas')) return;
//
export function initChitest(){
  if(!document.getElementById('chitestCanvas')) return;

  // Click feedback animation queue is shared between gof and independence panels
  // so that hover/click effects coexist visually when both canvases are present.
  const clickFx = createClickFxQueue();

  gof(clickFx);
  ind(clickFx);
}
