import {
  $, resizeCanvas, drawGrid, neonLine, normPDF, themeColors, withAlpha, debouncedResize, throttledDraw
} from '../../../js/utils.js';
import { createStateAnimator, interpolateNumberState } from '../ui/graph-motion.js';

const els = {};
const state = {
  priorMean: 0,
  priorSd: 2,
  observedMean: 1.8,
  noiseSd: 1.5,
  n: 8
};

let visualState = { ...state };

const presets = {
  low: { noiseSd: 2.5, n: 3 },
  middle: { noiseSd: 1.5, n: 8 },
  high: { noiseSd: 0.8, n: 30 }
};

const jpFont = '"Hiragino Sans", "Yu Gothic", "Noto Sans JP", sans-serif';

function fixed(v, digits = 2) {
  return Number.isFinite(v) ? v.toFixed(digits) : '-';
}

function model(viewState = state) {
  const priorPrecision = 1 / (viewState.priorSd ** 2);
  const dataPrecision = viewState.n / (viewState.noiseSd ** 2);
  const posteriorVariance = 1 / (priorPrecision + dataPrecision);
  const posteriorMean = posteriorVariance * (priorPrecision * viewState.priorMean + dataPrecision * viewState.observedMean);
  const posteriorSd = Math.sqrt(posteriorVariance);
  const likelihoodSd = viewState.noiseSd / Math.sqrt(viewState.n);
  const dataWeight = dataPrecision / (priorPrecision + dataPrecision);
  return { priorPrecision, dataPrecision, posteriorMean, posteriorSd, likelihoodSd, dataWeight };
}

function syncOutputs() {
  els.nnPriorMeanValue.textContent = fixed(state.priorMean, 1);
  els.nnPriorSdValue.textContent = fixed(state.priorSd, 1);
  els.nnObservedMeanValue.textContent = fixed(state.observedMean, 1);
  els.nnNoiseSdValue.textContent = fixed(state.noiseSd, 1);
  els.nnNValue.textContent = String(state.n);
  const m = model();
  els.nnPosteriorMean.textContent = fixed(m.posteriorMean, 2);
  els.nnPosteriorSd.textContent = fixed(m.posteriorSd, 2);
  els.nnDataWeight.textContent = `${(m.dataWeight * 100).toFixed(0)}%`;
  if (els.nnGuideText) {
    const side = m.dataWeight >= 0.5 ? 'マゼンタの観測側' : 'シアンの出発点側';
    els.nnGuideText.textContent =
      `観測の重みは ${(m.dataWeight * 100).toFixed(0)}%。黄色の平均は ${fixed(m.posteriorMean, 2)} で、${side}へ寄っている。`;
  }
}

function draw(viewState = visualState) {
  const canvas = els.normalCanvas;
  const mobile = canvas.clientWidth < 560;
  canvas.style.height = mobile ? '270px' : '350px';
  const { ctx, w, h } = resizeCanvas(canvas);
  if (!ctx) return;
  const tc = themeColors();
  drawGrid(ctx, w, h, withAlpha(tc.cyan, 0.05));
  const m = model(viewState);
  const lo = Math.min(viewState.priorMean - 4 * viewState.priorSd, viewState.observedMean - 4 * m.likelihoodSd, m.posteriorMean - 4 * m.posteriorSd);
  const hi = Math.max(viewState.priorMean + 4 * viewState.priorSd, viewState.observedMean + 4 * m.likelihoodSd, m.posteriorMean + 4 * m.posteriorSd);
  const left = mobile ? 40 : 54;
  const right = w - (mobile ? 14 : 24);
  const top = mobile ? 24 : 30;
  const bottom = h - (mobile ? 40 : 48);
  const width = right - left;
  const height = bottom - top;
  const values = [];
  let yMax = 0;
  for (let i = 0; i <= 360; i += 1) {
    const x = lo + (hi - lo) * i / 360;
    const prior = normPDF(x, viewState.priorMean, viewState.priorSd);
    const likelihood = normPDF(x, viewState.observedMean, m.likelihoodSd);
    const posterior = normPDF(x, m.posteriorMean, m.posteriorSd);
    yMax = Math.max(yMax, prior, likelihood, posterior);
    values.push({ x, prior, likelihood, posterior });
  }
  const toPx = x => left + (x - lo) / (hi - lo) * width;
  const toPath = key => values.map(p => [toPx(p.x), bottom - p[key] / yMax * height * 0.96]);
  ctx.strokeStyle = withAlpha(tc.dim, 0.45);
  ctx.beginPath();
  ctx.moveTo(left, top);
  ctx.lineTo(left, bottom);
  ctx.lineTo(right, bottom);
  ctx.stroke();
  neonLine(ctx, toPath('prior'), tc.cyan, 9, mobile ? 1.8 : 2.2);
  neonLine(ctx, toPath('likelihood'), tc.magenta, 9, mobile ? 1.8 : 2.2);
  neonLine(ctx, toPath('posterior'), tc.yellow, 14, mobile ? 2.1 : 2.8);
  [
    { x: viewState.priorMean, label: '出発点', color: tc.cyan },
    { x: viewState.observedMean, label: '観測', color: tc.magenta },
    { x: m.posteriorMean, label: '更新後', color: tc.yellow }
  ].forEach((line) => {
    const px = toPx(line.x);
    ctx.strokeStyle = withAlpha(line.color, 0.65);
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    ctx.moveTo(px, top);
    ctx.lineTo(px, bottom);
    ctx.stroke();
    ctx.setLineDash([]);
    if (!mobile) {
      ctx.fillStyle = line.color;
      ctx.font = `10px ${jpFont}`;
      ctx.fillText(line.label, Math.min(px + 5, right - 42), top + 8);
    }
  });
  ctx.fillStyle = tc.dim;
  ctx.font = `${mobile ? 10 : 12}px ${jpFont}`;
  ctx.fillText('平均', right - 28, bottom - 8);
  ctx.fillText(fixed(lo, 1), left, bottom + 16);
  ctx.textAlign = 'right';
  ctx.fillText(fixed(hi, 1), right, bottom + 16);
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
  interpolateState: (from, to, progress) => interpolateNumberState(from, to, progress, [
    'priorMean', 'priorSd', 'observedMean', 'noiseSd', 'n'
  ]),
  render: renderGraph
});
const scheduleDraw = throttledDraw(() => {
  visualState = { ...state };
  renderGraph();
});

function readControls() {
  state.priorMean = Number(els.nnPriorMean.value);
  state.priorSd = Number(els.nnPriorSd.value);
  state.observedMean = Number(els.nnObservedMean.value);
  state.noiseSd = Number(els.nnNoiseSd.value);
  state.n = Number(els.nnN.value);
}

function writeControls() {
  els.nnPriorMean.value = String(state.priorMean);
  els.nnPriorSd.value = String(state.priorSd);
  els.nnObservedMean.value = String(state.observedMean);
  els.nnNoiseSd.value = String(state.noiseSd);
  els.nnN.value = String(state.n);
}

function syncPresetButtons() {
  els.nnPresetButtons.forEach((button) => {
    const preset = presets[button.dataset.nnPreset];
    const active = preset.noiseSd === state.noiseSd
      && preset.n === state.n;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function bindPresets() {
  els.nnPresetButtons.forEach((button) => {
    button.addEventListener('click', () => {
      Object.assign(state, presets[button.dataset.nnPreset]);
      writeControls();
      syncPresetButtons();
      animateGraph();
    });
  });
}

export function initNormalNormalLab() {
  [
    'normalCanvas', 'nnPriorMean', 'nnPriorSd', 'nnObservedMean', 'nnNoiseSd', 'nnN',
    'nnPriorMeanValue', 'nnPriorSdValue', 'nnObservedMeanValue', 'nnNoiseSdValue',
    'nnNValue', 'nnPosteriorMean', 'nnPosteriorSd', 'nnDataWeight', 'nnGuideText'
  ].forEach(id => { els[id] = $(id); });
  if (!els.normalCanvas) return;
  els.nnPresetButtons = [...document.querySelectorAll('[data-nn-preset]')];
  ['nnPriorMean', 'nnPriorSd', 'nnObservedMean', 'nnNoiseSd', 'nnN'].forEach((id) => {
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
