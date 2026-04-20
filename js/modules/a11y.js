// StatPlay - module: A11Y - keyboard support + focus-visible plumbing.
//
// 1. Makes draggable canvases keyboard-operable (Arrow keys / Home / End /
//    PageUp / PageDown). The visual drag handlers live in graphDrag.js;
//    this module just gives keyboard users an equivalent path.
// 2. Mirrors each linked slider's value to aria-valuenow on its canvas so
//    screen readers can announce updates.
//
// Canvas -> slider(s) mapping table mirrors what graphDrag.js binds. If you
// add a new draggable canvas there, append it here too.

export function initA11y(){
  // [canvasId, primarySliderId, secondarySliderId|null, label]
  const MAP = [
    ['snCanvas',       'snK',  null,    'Standard normal: |k| (sigma)'],
    ['snMorphCanvas',  'snT',  null,    'Standardize morph progress'],
    ['normalCanvas',   'nA',   'nB',    'Normal interval [a, b]'],
    ['testCanvas',     'tA',   null,    'Hypothesis test alpha'],
    ['errCanvas',      'eA',   null,    'Type-I/II error alpha'],
    ['tDistCanvas',    'tdDf', null,    't-distribution degrees of freedom'],
    ['chiCanvas',      'chiDf',null,    'chi-squared degrees of freedom'],
    ['fCanvas',        'fDf1', 'fDf2',  'F-distribution df1 / df2'],
    ['binomCanvas',    'binomN', 'binomP', 'Binomial n / p (Shift for p)'],
    ['poissonCanvas',  'poisL',  null,     'Poisson lambda'],
    ['expCanvas',      'expL',   null,     'Exponential lambda'],
    ['descCanvas',     'descN',  'descSkew','Descriptive stats: n / skew (Shift for skew)'],
    ['corrCanvas',     'corrR',  null,     'Correlation target r'],
    ['probCanvas',     'probPA', 'probPB', 'Probability P(A) / P(B) (Shift for P(B))'],
    ['chitestCanvas',  'gofA',null,    'Goodness-of-fit test alpha (click bars to add data)'],
    ['indCanvas',      'indA',null,    'Independence test alpha (click cells to add data)'],
    ['anovaCanvas',    'anovaEffect','anovaWithin','ANOVA effect / within SD (Shift for SD)'],
  ];

  function step(slider, dir, big){
    if(!slider) return;
    const min = parseFloat(slider.min);
    const max = parseFloat(slider.max);
    const cur = parseFloat(slider.value);
    if(!isFinite(min)||!isFinite(max)||!isFinite(cur)) return;
    const nativeStep = parseFloat(slider.step) || (max - min) / 100;
    // "big" = PageUp/PageDown -> ~10% of range, snap to nativeStep.
    const delta = big
      ? Math.max(nativeStep, (max - min) / 10)
      : nativeStep;
    let nv = cur + dir * delta;
    nv = Math.max(min, Math.min(max, nv));
    nv = Math.round(nv / nativeStep) * nativeStep;
    if(String(nv) !== slider.value){
      slider.value = nv;
      slider.dispatchEvent(new Event('input', {bubbles:true}));
    }
  }

  function syncAria(cv, slider){
    if(!cv || !slider) return;
    cv.setAttribute('aria-valuemin', slider.min);
    cv.setAttribute('aria-valuemax', slider.max);
    cv.setAttribute('aria-valuenow', slider.value);
  }

  MAP.forEach(([cvId, slAId, slBId, label]) => {
    const cv = document.getElementById(cvId);
    const slA = document.getElementById(slAId);
    const slB = slBId ? document.getElementById(slBId) : null;
    if(!cv || !slA) return;

    cv.setAttribute('tabindex', '0');
    cv.setAttribute('role', 'slider');
    cv.setAttribute('aria-label', label);
    syncAria(cv, slA);

    // Keep aria-valuenow in sync as slider changes (drag, keyboard, programmatic).
    slA.addEventListener('input', () => syncAria(cv, slA));
    if(slB) slB.addEventListener('input', () => {
      // For two-handle canvases, expose the secondary as well via valuetext.
      cv.setAttribute('aria-valuetext', slA.value + ' / ' + slB.value);
    });

    cv.addEventListener('keydown', (e) => {
      // SHIFT modifies which slider for two-axis canvases (F df1 vs df2,
      // normal a vs b). For F we use Arrow Up/Down for the secondary; for
      // normalCanvas (a, b) we use Arrow Up/Down too.
      const useSecondary = slB && (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.shiftKey);
      const target = useSecondary ? slB : slA;
      let handled = true;
      switch(e.key){
        case 'ArrowRight':
        case 'ArrowUp':   step(target, +1, false); break;
        case 'ArrowLeft':
        case 'ArrowDown': step(target, -1, false); break;
        case 'PageUp':    step(target, +1, true);  break;
        case 'PageDown':  step(target, -1, true);  break;
        case 'Home':      target.value = target.min; target.dispatchEvent(new Event('input',{bubbles:true})); break;
        case 'End':       target.value = target.max; target.dispatchEvent(new Event('input',{bubbles:true})); break;
        default: handled = false;
      }
      if(handled){ e.preventDefault(); }
    });
  });
}
