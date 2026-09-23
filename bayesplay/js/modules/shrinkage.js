import { drawGroupPlot, renderGroupTable } from '../ui/group-plot.js';
import {
  $, debouncedResize, throttledDraw
} from '../../../js/utils.js';
import { createStateAnimator, interpolateNumberState } from '../ui/graph-motion.js';
import { withPooledMeans } from '../math/pooling.js';

const els = {};
const state = {
  overallMean: 0.55,
  priorStrength: 24,
  sampleScale: 1
};

let visualState = { ...state };

const presets = {
  weak: { priorStrength: 6 },
  middle: { priorStrength: 24 },
  strong: { priorStrength: 60 }
};

const baseGroups = [
  { label: 'A', trials: 5, rate: 1.00 },
  { label: 'B', trials: 8, rate: 0.13 },
  { label: 'C', trials: 14, rate: 0.79 },
  { label: 'D', trials: 28, rate: 0.50 },
  { label: 'E', trials: 52, rate: 0.65 },
  { label: 'F', trials: 96, rate: 0.46 }
];


function pct(value, digits = 0) {
  return `${(value * 100).toFixed(digits)}%`;
}

function fixed(value, digits = 1) {
  return Number.isFinite(value) ? value.toFixed(digits) : '-';
}

function groupsFor(viewState = state) {
  return baseGroups.map((group) => {
    const trials = Math.max(1, Math.round(group.trials * viewState.sampleScale));
    return {
      label: group.label,
      trials,
      successes: Math.round(group.rate * trials)
    };
  });
}

function pooledGroups(viewState = state) {
  return withPooledMeans(groupsFor(viewState), viewState.overallMean, viewState.priorStrength);
}

function shrinkageStats(viewState = state) {
  const groups = pooledGroups(viewState);
  const pulls = groups.map(group => Math.abs(group.pooledRate - group.observedRate));
  const maxIndex = pulls.reduce((best, value, index) => (value > pulls[best] ? index : best), 0);
  const avgPull = pulls.reduce((sum, value) => sum + value, 0) / pulls.length;
  return {
    groups,
    mostPulled: groups[maxIndex],
    maxPull: pulls[maxIndex],
    avgPull
  };
}

function syncOutputs() {
  els.shOverallMeanValue.textContent = pct(state.overallMean);
  els.shPriorStrengthValue.textContent = String(Math.round(state.priorStrength));
  els.shSampleScaleValue.textContent = fixed(state.sampleScale, 1);
  const stats = shrinkageStats();
  renderGroupTable(stats.groups, state.overallMean, state.priorStrength, true);
  els.shMostPulled.textContent = `${stats.mostPulled.label} (${(stats.maxPull * 100).toFixed(1)}pt)`;
  els.shAvgPull.textContent = `${(stats.avgPull * 100).toFixed(1)}pt`;
  els.shCenterReadout.textContent = pct(state.overallMean, 1);
  if (els.shGuideText) {
    els.shGuideText.textContent =
      `全体の中心は ${pct(state.overallMean)}。共有する強さ ${Math.round(state.priorStrength)} 件分として読むと、小さいグループほど黄色の点が中央へ寄る。`;
  }
}

function draw(viewState = visualState) {
  drawGroupPlot(els.shrinkageCanvas, pooledGroups(viewState), viewState.overallMean, viewState.priorStrength, true);
}

function renderGraph() {
  syncOutputs();
  draw();
}

const animateGraph = createStateAnimator({
  getTargetState: () => ({ ...state }),
  getVisualState: () => ({ ...visualState }),
  setVisualState: next => { visualState = { ...next }; },
  interpolateState: (from, to, progress) => interpolateNumberState(from, to, progress, [
    'overallMean', 'priorStrength', 'sampleScale'
  ]),
  render: renderGraph
});

const scheduleDraw = throttledDraw(() => animateGraph.snap());

function readControls() {
  state.overallMean = Number(els.shOverallMean.value);
  state.priorStrength = Number(els.shPriorStrength.value);
  state.sampleScale = Number(els.shSampleScale.value);
}

function writeControls() {
  els.shOverallMean.value = String(state.overallMean);
  els.shPriorStrength.value = String(state.priorStrength);
  els.shSampleScale.value = String(state.sampleScale);
}

function syncPresetButtons() {
  els.shPresetButtons.forEach((button) => {
    const preset = presets[button.dataset.shPreset];
    const active = preset.priorStrength === state.priorStrength;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function bindPresets() {
  els.shPresetButtons.forEach((button) => {
    button.addEventListener('click', () => {
      Object.assign(state, presets[button.dataset.shPreset]);
      writeControls();
      syncPresetButtons();
      animateGraph();
    });
  });
}

export function initShrinkageLab() {
  [
    'shrinkageCanvas', 'shOverallMean', 'shPriorStrength', 'shSampleScale',
    'shOverallMeanValue', 'shPriorStrengthValue', 'shSampleScaleValue',
    'shGuideText', 'shMostPulled', 'shAvgPull', 'shCenterReadout'
  ].forEach(id => { els[id] = $(id); });
  if (!els.shrinkageCanvas) return;
  els.shPresetButtons = [...document.querySelectorAll('[data-sh-preset]')];
  ['shOverallMean', 'shPriorStrength', 'shSampleScale'].forEach((id) => {
    els[id].addEventListener('input', () => {
      readControls();
      syncPresetButtons();
      scheduleDraw();
    });
  });
  bindPresets();
  window.addEventListener('resize', debouncedResize(scheduleDraw, 120));
  window.addEventListener('themechange', scheduleDraw);
  readControls();
  syncPresetButtons();
  scheduleDraw();
}
