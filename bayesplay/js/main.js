import { initBetaBinomialLab } from './modules/beta-binomial.js';
import { initGammaPoissonLab } from './modules/gamma-poisson.js';
import { initHierarchicalBayesLab } from './modules/hierarchical-bayes.js';
import { initLikelihoodStrengthLab } from './modules/likelihood-strength.js';
import { initNormalNormalLab } from './modules/normal-normal.js';
import { initShrinkageLab } from './modules/shrinkage.js';
import { initUpdateComparison } from './modules/update-comparison.js';

import { initSiteShell } from '../../js/modules/site-shell.js';

document.addEventListener('DOMContentLoaded', () => {
  initSiteShell();
  initUpdateComparison();
  initBetaBinomialLab();
  initLikelihoodStrengthLab();
  initNormalNormalLab();
  initGammaPoissonLab();
  initShrinkageLab();
  initHierarchicalBayesLab();
});
