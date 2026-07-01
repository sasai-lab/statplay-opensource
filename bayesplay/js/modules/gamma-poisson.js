import {
  $, resizeCanvas, drawGrid, neonLine, themeColors, withAlpha, debouncedResize, throttledDraw
} from '../../../js/utils.js';
import { gammaPdf, gammaPoissonUpdate, gammaQuantile } from '../math/gamma.js';
import { createStateAnimator, interpolateNumberState } from '../ui/graph-motion.js';

const els = {};
const state = {
  priorMean: 3,
  priorStrength: 4,
  events: 10,
  exposure: 3
};

let visualState = { ...state };

const presets = {
  short: { exposure: 1 },
  middle: { exposure: 3 },
  long: { exposure: 10 }
};

const jpFont = '"Hiragino Sans", "Yu Gothic", "Noto Sans JP", sans-serif';

function fixed(v, digits = 2) {
  return Number.isFinite(v) ? v.toFixed(digits) : '-';
}

function syncOutputs() {
  els.gpPriorMeanValue.textContent = fixed(state.priorMean, 1);
  els.gpPriorStrengthValue.textContent = fixed(state.priorStrength, 1);
  els.gpEventsValue.textContent = String(state.events);
  els.gpExposureValue.textContent = fixed(state.exposure, 1);
  const m = gammaPoissonUpdate(state);
  const low = gammaQuantile(0.025, m.posteriorShape, m.posteriorRate);
  const high = gammaQuantile(0.975, m.posteriorShape, m.posteriorRate);
  els.gpPosteriorMean.textContent = fixed(m.posteriorMean, 2);
  els.gpCredible.textContent = `${fixed(low, 2)} - ${fixed(high, 2)}`;
  els.gpObservedRate.textContent = fixed(state.events / state.exposure, 2);
  if (els.gpGuideText) {
    els.gpGuideText.textContent =
      `${state.events}件を ${fixed(state.exposure, 1)} の時間で観測。観測レートは ${fixed(state.events / state.exposure, 2)}、更新後の平均は ${fixed(m.posteriorMean, 2)}。`;
  }
}

function draw(viewState = visualState) {
  const canvas = els.poissonCanvas;
  const mobile = canvas.clientWidth < 560;
  canvas.style.height = mobile ? '270px' : '350px';
  const { ctx, w, h } = resizeCanvas(canvas);
  if (!ctx) return;
  const tc = themeColors();
  drawGrid(ctx, w, h, withAlpha(tc.cyan, 0.05));
  const m = gammaPoissonUpdate(viewState);
  const posteriorHigh = gammaQuantile(0.995, m.posteriorShape, m.posteriorRate);
  const priorHigh = gammaQuantile(0.995, m.priorShape, m.priorRate);
  const hi = Math.max(1, posteriorHigh, priorHigh, viewState.events / viewState.exposure * 1.4);
  const left = mobile ? 40 : 54;
  const right = w - (mobile ? 14 : 24);
  const top = mobile ? 24 : 30;
  const bottom = h - (mobile ? 40 : 48);
  const width = right - left;
  const height = bottom - top;
  const values = [];
  let yMax = 0;
  for (let i = 0; i <= 360; i += 1) {
    const rate = Math.max(1e-4, hi * i / 360);
    const prior = gammaPdf(rate, m.priorShape, m.priorRate);
    const posterior = gammaPdf(rate, m.posteriorShape, m.posteriorRate);
    yMax = Math.max(yMax, prior, posterior);
    values.push({ rate, prior, posterior });
  }
  const toPx = x => left + x / hi * width;
  const toPath = key => values.map(p => [toPx(p.rate), bottom - p[key] / yMax * height * 0.96]);
  ctx.strokeStyle = withAlpha(tc.dim, 0.45);
  ctx.beginPath();
  ctx.moveTo(left, top);
  ctx.lineTo(left, bottom);
  ctx.lineTo(right, bottom);
  ctx.stroke();
  const observedRate = viewState.events / viewState.exposure;
  neonLine(ctx, toPath('prior'), tc.cyan, 9, mobile ? 1.8 : 2.2);
  neonLine(ctx, toPath('posterior'), tc.yellow, 14, mobile ? 2.2 : 2.8);

  [
    { x: m.priorMean, color: tc.cyan, label: '出発点', y: 8 },
    { x: observedRate, color: tc.magenta, label: '観測', y: 24 },
    { x: m.posteriorMean, color: tc.yellow, label: '更新後', y: 40 }
  ].forEach((line) => {
    const px = toPx(line.x);
    ctx.strokeStyle = withAlpha(line.color, 0.7);
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    ctx.moveTo(px, top);
    ctx.lineTo(px, bottom);
    ctx.stroke();
    ctx.setLineDash([]);
    if (!mobile) {
      ctx.fillStyle = line.color;
      ctx.font = `10px ${jpFont}`;
      ctx.fillText(line.label, Math.min(px + 5, right - 42), top + line.y);
    }
  });

  ctx.fillStyle = tc.dim;
  ctx.font = `${mobile ? 10 : 12}px ${jpFont}`;
  ctx.fillText('発生率', right - 42, bottom - 8);
  ctx.fillText('0', left, bottom + 16);
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
    'priorMean', 'priorStrength', 'events', 'exposure'
  ]),
  render: renderGraph
});
const scheduleDraw = throttledDraw(() => {
  visualState = { ...state };
  renderGraph();
});

function readControls() {
  state.priorMean = Number(els.gpPriorMean.value);
  state.priorStrength = Number(els.gpPriorStrength.value);
  state.events = Number(els.gpEvents.value);
  state.exposure = Number(els.gpExposure.value);
}

function writeControls() {
  els.gpPriorMean.value = String(state.priorMean);
  els.gpPriorStrength.value = String(state.priorStrength);
  els.gpEvents.value = String(state.events);
  els.gpExposure.value = String(state.exposure);
}

function syncPresetButtons() {
  els.gpPresetButtons.forEach((button) => {
    const preset = presets[button.dataset.gpPreset];
    const active = preset.exposure === state.exposure;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function bindPresets() {
  els.gpPresetButtons.forEach((button) => {
    button.addEventListener('click', () => {
      Object.assign(state, presets[button.dataset.gpPreset]);
      writeControls();
      syncPresetButtons();
      animateGraph();
    });
  });
}

export function initGammaPoissonLab() {
  [
    'poissonCanvas', 'gpPriorMean', 'gpPriorStrength', 'gpEvents', 'gpExposure',
    'gpPriorMeanValue', 'gpPriorStrengthValue', 'gpEventsValue', 'gpExposureValue',
    'gpPosteriorMean', 'gpCredible', 'gpObservedRate', 'gpGuideText'
  ].forEach(id => { els[id] = $(id); });
  if (!els.poissonCanvas) return;
  els.gpPresetButtons = [...document.querySelectorAll('[data-gp-preset]')];
  ['gpPriorMean', 'gpPriorStrength', 'gpEvents', 'gpExposure'].forEach((id) => {
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
