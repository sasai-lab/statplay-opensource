import {
  $, resizeCanvas, drawGrid, themeColors, withAlpha, debouncedResize, throttledDraw
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
const jpFont = '"Hiragino Sans", "Yu Gothic", "Noto Sans JP", sans-serif';

function pct(value, digits = 0) {
  return `${(value * 100).toFixed(digits)}%`;
}

function fixed(value, digits = 2) {
  return Number.isFinite(value) ? value.toFixed(digits) : '-';
}

function groupsFor(viewState = state) {
  const count = Math.round(viewState.groupCount);
  return Array.from({ length: count }, (_, index) => {
    const trials = Math.max(2, baseNs[index] * viewState.sampleScale);
    const rate = clampRate(0.58 + offsets[index] * 0.27 * viewState.spread);
    return {
      label: labels[index],
      trials,
      successes: rate * trials
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
  els.hbGlobalMean.textContent = pct(summary.globalMean, 1);
  els.hbPoolingStrength.textContent = `${Math.round(summary.poolingStrength)}件分`;
  els.hbSmallGroupPull.textContent = pct(summary.smallGroupPull, 1);
  if (els.hbGuideText) {
    els.hbGuideText.textContent =
      `全体の中心は ${pct(summary.globalMean, 1)}。グループ間の違いが ${fixed(state.spread, 2)} のとき、共有の強さは約 ${Math.round(summary.poolingStrength)} 件分として読める。`;
  }
}

function draw(viewState = visualState) {
  const canvas = els.hierarchicalCanvas;
  const mobile = canvas.clientWidth < 560;
  canvas.style.height = mobile ? '300px' : '360px';
  const { ctx, w, h } = resizeCanvas(canvas);
  if (!ctx) return;
  const tc = themeColors();
  drawGrid(ctx, w, h, withAlpha(tc.cyan, 0.05));

  const summary = hierarchicalSummary(viewState);
  const { groups, globalMean } = summary;
  const left = mobile ? 36 : 54;
  const right = w - (mobile ? 18 : 30);
  const top = mobile ? 26 : 32;
  const bottom = h - (mobile ? 54 : 64);
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

  const globalY = yFor(globalMean);
  ctx.fillStyle = withAlpha(tc.cyan, 0.08);
  ctx.fillRect(left, globalY - 12, width, 24);
  ctx.strokeStyle = withAlpha(tc.cyan, 0.74);
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(left, globalY);
  ctx.lineTo(right, globalY);
  ctx.stroke();
  ctx.setLineDash([]);

  groups.forEach((group, index) => {
    const x = xFor(index);
    const observedY = yFor(group.observedRate);
    const pooledY = yFor(group.pooledRate);
    const radius = Math.max(4, Math.min(13, Math.sqrt(group.trials) * 0.9));

    ctx.strokeStyle = withAlpha(tc.dim, 0.5);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x, observedY);
    ctx.lineTo(x, pooledY);
    ctx.stroke();

    ctx.strokeStyle = tc.magenta;
    ctx.fillStyle = withAlpha(tc.magenta, 0.12);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, observedY, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = tc.yellow;
    ctx.shadowColor = tc.yellow;
    ctx.shadowBlur = mobile ? 7 : 11;
    ctx.beginPath();
    ctx.arc(x, pooledY, Math.max(4, radius * 0.62), 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = tc.dim;
    ctx.font = `${mobile ? 10 : 11}px ${jpFont}`;
    ctx.textAlign = 'center';
    ctx.fillText(group.label, x, bottom + 17);
    if (!mobile) {
      ctx.fillText(`n=${Math.round(group.trials)}`, x, bottom + 35);
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
    ctx.fillText(`全体中心 ${pct(globalMean, 1)}`, right - 112, globalY - 17);
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
    'spread', 'sampleScale', 'groupCount'
  ]),
  render: renderGraph
});

const scheduleDraw = throttledDraw(() => {
  visualState = { ...state };
  renderGraph();
});

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
