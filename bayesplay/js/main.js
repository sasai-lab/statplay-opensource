import { initBayesHero } from './modules/hero.js';
import { initBetaBinomialLab } from './modules/beta-binomial.js';
import { initGammaPoissonLab } from './modules/gamma-poisson.js';
import { initHierarchicalBayesLab } from './modules/hierarchical-bayes.js';
import { initLikelihoodStrengthLab } from './modules/likelihood-strength.js';
import { initNormalNormalLab } from './modules/normal-normal.js';
import { initShrinkageLab } from './modules/shrinkage.js';
import { initUpdateComparison } from './modules/update-comparison.js';

function initNav() {
  const nav = document.getElementById('mainNav');
  const toggle = document.getElementById('navToggle');
  if (!nav || !toggle) return;
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });
}

function initTheme() {
  const button = document.getElementById('themeToggle');
  if (!button) return;
  const stored = localStorage.getItem('bayesplay-theme');
  if (stored === 'light') {
    document.body.classList.add('theme-light');
    button.textContent = 'DARK';
    button.setAttribute('aria-pressed', 'true');
    button.setAttribute('aria-label', 'ダークテーマへ切り替え');
  }
  button.addEventListener('click', () => {
    const light = document.body.classList.toggle('theme-light');
    localStorage.setItem('bayesplay-theme', light ? 'light' : 'dark');
    button.textContent = light ? 'DARK' : 'LIGHT';
    button.setAttribute('aria-pressed', String(light));
    button.setAttribute('aria-label', light ? 'ダークテーマへ切り替え' : 'ライトテーマへ切り替え');
    window.dispatchEvent(new CustomEvent('themechange'));
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initTheme();
  initBayesHero();
  initUpdateComparison();
  initBetaBinomialLab();
  initLikelihoodStrengthLab();
  initNormalNormalLab();
  initGammaPoissonLab();
  initShrinkageLab();
  initHierarchicalBayesLab();
});
