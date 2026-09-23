import { drawGroupPlot, renderGroupTable } from '../ui/group-plot.js';
import {
  $, debouncedResize, throttledDraw
} from '../../../js/utils.js';
import { createStateAnimator, interpolateNumberState } from '../ui/graph-motion.js';
import {
  clampRate, poolingStrengthFromSpread, weightedRate, withPooledMeans
} from '../math/pooling.js';

const els = {};
const state = {
  spread: 0.45,
  sampleScale: 1,
  groupCount: 6
};

let visualState = { ...state };

const presets = {
  tight: { spread: 0.15 },
  middle: { spread: 0.45 },
  wide: { spread: 0.82 }
};

const baseNs = [6, 10, 16, 28, 50, 82, 128, 180];
const offsets = [-1.2, -0.72, -0.32, 0.04, 0.35, 0.67, 0.92, 1.16];
const labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

function pct(value, digits = 0) {
  return `${(value * 100).toFixed(digits)}%`;
}

function fixed(value, digits = 2) {
  return Number.isFinite(value) ? value.toFixed(digits) : '-';
}

function groupsFor(viewState = state) {
  const count = Math.round(viewState.groupCount);
  return Array.from({ length: count }, (_, index) => {
    const trials = Math.max(2, Math.round(baseNs[index] * viewState.sampleScale));
    const rate = clampRate(0.58 + offsets[index] * 0.27 * viewState.spread);
    return {
      label: labels[index],
      trials,
      successes: Math.round(rate * trials)
    };
  });
}

function hierarchicalSummary(viewState = state) {
  const rawGroups = groupsFor(viewState);
  const globalMean = weightedRate(rawGroups);
  const poolingStrength = poolingStrengthFromSpread(viewState.spread);
  const groups = withPooledMeans(rawGroups, globalMean, poolingStrength);
  const smallest = groups.reduce((best, group) => (group.trials < best.trials ? group : best), groups[0]);
  return {
    groups,
    globalMean,
    poolingStrength,
    smallGroupPull: Math.abs(smallest.pooledRate - smallest.observedRate)
  };
}

function syncOutputs() {
  els.hbSpreadValue.textContent = fixed(state.spread, 2);
  els.hbSampleScaleValue.textContent = fixed(state.sampleScale, 1);
  els.hbGroupCountValue.textContent = String(Math.round(state.groupCount));
  const summary = hierarchicalSummary();
  renderGroupTable(summary.groups, summary.globalMean, summary.poolingStrength);
  els.hbGlobalMean.textContent = pct(summary.globalMean, 1);
  els.hbPoolingStrength.textContent = `${Math.round(summary.poolingStrength)}件分`;
  els.hbSmallGroupPull.textContent = `${(summary.smallGroupPull * 100).toFixed(1)}pt`;
  if (els.hbGuideText) {
    els.hbGuideText.textContent =
      `全体の中心は ${pct(summary.globalMean, 1)}。グループ間の違いが ${fixed(state.spread, 2)} のとき、共有の強さは約 ${Math.round(summary.poolingStrength)} 件分として読める。`;
  }
}

function draw(viewState = visualState) {
  const summary = hierarchicalSummary(viewState);
  drawGroupPlot(els.hierarchicalCanvas, summary.groups, summary.globalMean, summary.poolingStrength);
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
    'spread', 'sampleScale', 'groupCount'
  ]),
  render: renderGraph
});

const scheduleDraw = throttledDraw(() => animateGraph.snap());

function readControls() {
  state.spread = Number(els.hbSpread.value);
  state.sampleScale = Number(els.hbSampleScale.value);
  state.groupCount = Number(els.hbGroupCount.value);
}

function writeControls() {
  els.hbSpread.value = String(state.spread);
  els.hbSampleScale.value = String(state.sampleScale);
  els.hbGroupCount.value = String(state.groupCount);
}

function syncPresetButtons() {
  els.hbPresetButtons.forEach((button) => {
    const preset = presets[button.dataset.hbPreset];
    const active = preset.spread === state.spread;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function bindPresets() {
  els.hbPresetButtons.forEach((button) => {
    button.addEventListener('click', () => {
      Object.assign(state, presets[button.dataset.hbPreset]);
      writeControls();
      syncPresetButtons();
      animateGraph();
    });
  });
}

export function initHierarchicalBayesLab() {
  [
    'hierarchicalCanvas', 'hbSpread', 'hbSampleScale', 'hbGroupCount',
    'hbSpreadValue', 'hbSampleScaleValue', 'hbGroupCountValue',
    'hbGuideText', 'hbGlobalMean', 'hbPoolingStrength', 'hbSmallGroupPull'
  ].forEach(id => { els[id] = $(id); });
  if (!els.hierarchicalCanvas) return;
  els.hbPresetButtons = [...document.querySelectorAll('[data-hb-preset]')];
  ['hbSpread', 'hbSampleScale', 'hbGroupCount'].forEach((id) => {
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
