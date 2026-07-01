import {
  $, resizeCanvas, drawGrid, neonLine, themeColors, withAlpha, debouncedResize, throttledDraw
} from '../../../js/utils.js';
import { likelihoodShape } from '../math/beta.js';
import { createStateAnimator, interpolateNumberState } from '../ui/graph-motion.js';

const els = {};
const state = {
  rate: 0.7,
  smallN: 10,
  largeN: 100
};

let visualState = { ...state };

const presets = {
  near: { largeN: 20 },
  middle: { largeN: 100 },
  wide: { largeN: 300 }
};

const jpFont = '"Hiragino Sans", "Yu Gothic", "Noto Sans JP", sans-serif';

function pct(v, digits = 1) {
  return `${(v * 100).toFixed(digits)}%`;
}

function successes(n, viewState = state) {
  return Math.round(viewState.rate * n);
}

function approxWidth(n, viewState = state) {
  const se = Math.sqrt(Math.max(1e-9, viewState.rate * (1 - viewState.rate) / n));
  return 1.96 * se * 2;
}

function syncOutputs() {
  els.lsRateValue.textContent = pct(state.rate, 0);
  els.lsSmallNValue.textContent = String(state.smallN);
  els.lsLargeNValue.textContent = String(state.largeN);
  els.lsSmallCase.textContent = `${successes(state.smallN)} / ${state.smallN}`;
  els.lsLargeCase.textContent = `${successes(state.largeN)} / ${state.largeN}`;
  els.lsWidthRatio.textContent = `${(approxWidth(state.smallN) / approxWidth(state.largeN)).toFixed(1)}倍`;
  if (els.lsGuideText) {
    els.lsGuideText.textContent =
      `観測割合はどちらも ${pct(state.rate, 0)}。${successes(state.largeN)}/${state.largeN} の尤度は、${successes(state.smallN)}/${state.smallN} と比べて約 ${(approxWidth(state.smallN) / approxWidth(state.largeN)).toFixed(1)} 倍細くなる。`;
  }
}

function draw(viewState = visualState) {
  const canvas = els.strengthCanvas;
  const mobile = canvas.clientWidth < 560;
  canvas.style.height = mobile ? '260px' : '340px';
  const { ctx, w, h } = resizeCanvas(canvas);
  if (!ctx) return;
  const tc = themeColors();
  drawGrid(ctx, w, h, withAlpha(tc.cyan, 0.05));

  const left = mobile ? 38 : 54;
  const right = w - (mobile ? 14 : 24);
  const top = mobile ? 22 : 30;
  const bottom = h - (mobile ? 38 : 48);
  const width = right - left;
  const height = bottom - top;

  ctx.strokeStyle = withAlpha(tc.dim, 0.45);
  ctx.beginPath();
  ctx.moveTo(left, top);
  ctx.lineTo(left, bottom);
  ctx.lineTo(right, bottom);
  ctx.stroke();

  const smallN = Math.max(1, viewState.smallN);
  const largeN = Math.max(1, viewState.largeN);
  const smallX = viewState.rate * smallN;
  const largeX = viewState.rate * largeN;
  const points = [];
  for (let i = 0; i <= 360; i += 1) {
    const pValue = i / 360;
    const x = Math.min(1 - 1e-5, Math.max(1e-5, pValue));
    points.push({
      pValue,
      small: likelihoodShape(x, smallX, smallN - smallX),
      large: likelihoodShape(x, largeX, largeN - largeX)
    });
  }
  const toPath = key => points.map(p => [left + p.pValue * width, bottom - p[key] * height]);
  const xRate = left + viewState.rate * width;
  ctx.save();
  ctx.setLineDash([6, 5]);
  neonLine(ctx, toPath('small'), withAlpha(tc.magenta, 0.58), 7, mobile ? 1.6 : 2);
  ctx.restore();
  neonLine(ctx, toPath('large'), tc.magenta, 10, mobile ? 2.2 : 2.8);

  ctx.strokeStyle = withAlpha(tc.dim, 0.72);
  ctx.setLineDash([4, 5]);
  ctx.beginPath();
  ctx.moveTo(xRate, top);
  ctx.lineTo(xRate, bottom);
  ctx.stroke();
  ctx.setLineDash([]);

  if (!mobile) {
    ctx.fillStyle = tc.text;
    ctx.font = `bold 13px ${jpFont}`;
    ctx.fillText('割合をそろえて比較', left, top + 2);
    ctx.fillStyle = tc.dim;
    ctx.font = `10px ${jpFont}`;
    ctx.fillText('観測割合', Math.min(xRate + 5, right - 54), top + 18);
  }
  ctx.fillStyle = tc.dim;
  ctx.font = `${mobile ? 10 : 12}px ${jpFont}`;
  ctx.fillText('成功率', right - 42, bottom - 8);
  ctx.fillText('0', left, bottom + 14);
  ctx.textAlign = 'right';
  ctx.fillText('1', right, bottom + 14);
  ctx.textAlign = 'left';
}

function renderGraph() {
  syncOutputs();
  draw();
}

const animateGraph = createStateAnimator({
  getTargetState: () => ({ ...state }),
  getVisualState: () => ({ ...visualState }),
  setVisualState: next => { visualState = { ...next }; },
  interpolateState: (from, to, progress) => interpolateNumberState(from, to, progress, ['rate', 'smallN', 'largeN']),
  render: renderGraph
});
const scheduleDraw = throttledDraw(() => {
  visualState = { ...state };
  renderGraph();
});

function readControls() {
  state.rate = Number(els.lsRate.value);
  state.smallN = Number(els.lsSmallN.value);
  state.largeN = Number(els.lsLargeN.value);
}

function writeControls() {
  els.lsRate.value = String(state.rate);
  els.lsSmallN.value = String(state.smallN);
  els.lsLargeN.value = String(state.largeN);
}

function syncPresetButtons() {
  els.lsPresetButtons.forEach((button) => {
    const preset = presets[button.dataset.lsPreset];
    const active = preset.largeN === state.largeN;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function bindPresets() {
  els.lsPresetButtons.forEach((button) => {
    button.addEventListener('click', () => {
      Object.assign(state, presets[button.dataset.lsPreset]);
      writeControls();
      syncPresetButtons();
      animateGraph();
    });
  });
}

export function initLikelihoodStrengthLab() {
  [
    'strengthCanvas', 'lsRate', 'lsSmallN', 'lsLargeN', 'lsRateValue',
    'lsSmallNValue', 'lsLargeNValue', 'lsSmallCase', 'lsLargeCase', 'lsWidthRatio',
    'lsGuideText'
  ].forEach(id => { els[id] = $(id); });
  if (!els.strengthCanvas) return;
  els.lsPresetButtons = [...document.querySelectorAll('[data-ls-preset]')];
  ['lsRate', 'lsSmallN', 'lsLargeN'].forEach((id) => {
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
