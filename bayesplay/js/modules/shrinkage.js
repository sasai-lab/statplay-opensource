import {
  $, resizeCanvas, drawGrid, themeColors, withAlpha, debouncedResize, throttledDraw
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

const jpFont = '"Hiragino Sans", "Yu Gothic", "Noto Sans JP", sans-serif';

function pct(value, digits = 0) {
  return `${(value * 100).toFixed(digits)}%`;
}

function fixed(value, digits = 1) {
  return Number.isFinite(value) ? value.toFixed(digits) : '-';
}

function groupsFor(viewState = state) {
  return baseGroups.map((group) => {
    const trials = Math.max(1, group.trials * viewState.sampleScale);
    return {
      label: group.label,
      trials,
      successes: group.rate * trials
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
  els.shMostPulled.textContent = `${stats.mostPulled.label} (${pct(stats.maxPull, 1)})`;
  els.shAvgPull.textContent = pct(stats.avgPull, 1);
  els.shCenterReadout.textContent = pct(state.overallMean, 1);
  if (els.shGuideText) {
    els.shGuideText.textContent =
      `全体の中心は ${pct(state.overallMean)}。共有する強さ ${Math.round(state.priorStrength)} 件分として読むと、小さいグループほど黄色の点が中央へ寄る。`;
  }
}

function draw(viewState = visualState) {
  const canvas = els.shrinkageCanvas;
  const mobile = canvas.clientWidth < 560;
  canvas.style.height = mobile ? '280px' : '350px';
  const { ctx, w, h } = resizeCanvas(canvas);
  if (!ctx) return;
  const tc = themeColors();
  drawGrid(ctx, w, h, withAlpha(tc.cyan, 0.05));

  const groups = pooledGroups(viewState);
  const left = mobile ? 36 : 54;
  const right = w - (mobile ? 18 : 28);
  const top = mobile ? 24 : 30;
  const bottom = h - (mobile ? 50 : 60);
  const width = right - left;
  const height = bottom - top;
  const xFor = index => left + (groups.length === 1 ? 0.5 : index / (groups.length - 1)) * width;
  const yFor = rate => bottom - rate * height;

  ctx.strokeStyle = withAlpha(tc.dim, 0.45);
  ctx.beginPath();
  ctx.moveTo(left, top);
  ctx.lineTo(left, bottom);
  ctx.lineTo(right, bottom);
  ctx.stroke();

  const centerY = yFor(viewState.overallMean);
  ctx.strokeStyle = withAlpha(tc.cyan, 0.72);
  ctx.setLineDash([7, 6]);
  ctx.beginPath();
  ctx.moveTo(left, centerY);
  ctx.lineTo(right, centerY);
  ctx.stroke();
  ctx.setLineDash([]);

  groups.forEach((group, index) => {
    const x = xFor(index);
    const observedY = yFor(group.observedRate);
    const pooledY = yFor(group.pooledRate);
    ctx.strokeStyle = withAlpha(tc.dim, 0.55);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x, observedY);
    ctx.lineTo(x, pooledY);
    ctx.stroke();

    ctx.strokeStyle = tc.magenta;
    ctx.fillStyle = withAlpha(tc.magenta, 0.12);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, observedY, mobile ? 5 : 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = tc.yellow;
    ctx.shadowColor = tc.yellow;
    ctx.shadowBlur = mobile ? 8 : 12;
    ctx.beginPath();
    ctx.arc(x, pooledY, mobile ? 4.5 : 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = tc.dim;
    ctx.font = `${mobile ? 10 : 11}px ${jpFont}`;
    ctx.textAlign = 'center';
    ctx.fillText(group.label, x, bottom + 17);
    if (!mobile) {
      ctx.fillText(`n=${Math.round(group.trials)}`, x, bottom + 34);
    }
  });

  ctx.fillStyle = tc.dim;
  ctx.font = `${mobile ? 10 : 12}px ${jpFont}`;
  ctx.textAlign = 'left';
  ctx.fillText('成功率', left, top - 8);
  ctx.fillText('0%', left, bottom + 17);
  ctx.textAlign = 'right';
  ctx.fillText('100%', left - 4, top + 4);
  ctx.textAlign = 'left';
  if (!mobile) {
    ctx.fillStyle = tc.cyan;
    ctx.fillText(`全体の中心 ${pct(viewState.overallMean)}`, right - 118, centerY - 8);
  }
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

const scheduleDraw = throttledDraw(() => {
  visualState = { ...state };
  renderGraph();
});

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
