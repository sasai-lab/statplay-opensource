import {
  $, resizeCanvas, drawGrid, neonLine, themeColors, withAlpha, debouncedResize, throttledDraw
} from '../../../js/utils.js';
import {
  betaPdf, betaMean, betaMode, betaQuantile, betaBinomialPmf, betaUpdate, likelihoodShape
} from '../math/beta.js';
import { createStateAnimator, interpolateNumberState } from '../ui/graph-motion.js';

const els = {};

const state = {
  priorMean: 0.5,
  priorStrength: 10,
  successes: 7,
  failures: 3,
  showLikelihood: true,
  showCredible: true,
  futureTrials: 20,
  updateStep: 'prior'
};

const stepLevels = {
  prior: 0,
  evidence: 1,
  posterior: 2
};

function levelToStep(level) {
  if (level < 0.5) return 'prior';
  if (level < 1.5) return 'evidence';
  return 'posterior';
}

function snapshotState(source = state) {
  return {
    ...source,
    stepLevel: Number.isFinite(source.stepLevel) ? source.stepLevel : (stepLevels[source.updateStep] ?? 0)
  };
}

let visualState = snapshotState();

const futurePresets = {
  short: 5,
  middle: 20,
  long: 50
};

const jpFont = '"Hiragino Sans", "Yu Gothic", "Noto Sans JP", sans-serif';

function pct(v, digits = 1) {
  return `${(v * 100).toFixed(digits)}%`;
}

function fixed(v, digits = 3) {
  return Number.isFinite(v) ? v.toFixed(digits) : '-';
}

function countText(v) {
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

function getModel(viewState = state) {
  return betaUpdate(viewState);
}

function posteriorSummary(viewState = state) {
  const model = getModel(viewState);
  const mean = betaMean(model.posteriorAlpha, model.posteriorBeta);
  const mode = betaMode(model.posteriorAlpha, model.posteriorBeta);
  const low = betaQuantile(0.025, model.posteriorAlpha, model.posteriorBeta);
  const high = betaQuantile(0.975, model.posteriorAlpha, model.posteriorBeta);
  return { ...model, mean, mode, low, high, next: mean };
}

function predictiveSummary(summary = posteriorSummary(), viewState = state) {
  const n = Math.max(1, Math.round(viewState.futureTrials));
  const pmf = Array.from({ length: n + 1 }, (_, k) => betaBinomialPmf(k, n, summary.posteriorAlpha, summary.posteriorBeta));
  const mode = pmf.reduce((best, value, k) => (value > pmf[best] ? k : best), 0);
  let cumulative = 0;
  let low = 0;
  let high = n;
  let lowSet = false;
  for (let k = 0; k <= n; k += 1) {
    cumulative += pmf[k];
    if (!lowSet && cumulative >= 0.1) {
      low = k;
      lowSet = true;
    }
    if (cumulative >= 0.9) {
      high = k;
      break;
    }
  }
  return { n, pmf, mode, low, high, mean: n * summary.mean };
}

function syncOutputs() {
  if (els.priorMeanValue) els.priorMeanValue.textContent = fixed(state.priorMean, 2);
  if (els.priorStrengthValue) els.priorStrengthValue.textContent = String(state.priorStrength);
  if (els.successesValue) els.successesValue.textContent = String(state.successes);
  if (els.failuresValue) els.failuresValue.textContent = String(state.failures);
  if (els.futureTrialsValue) els.futureTrialsValue.textContent = String(state.futureTrials);

  const summary = posteriorSummary();
  const observed = state.successes + state.failures;
  const ratio = observed ? state.successes / observed : 0;
  const showPosteriorStats = state.updateStep === 'posterior';
  if (els.posteriorMean) els.posteriorMean.textContent = showPosteriorStats ? pct(summary.mean, 1) : '-';
  if (els.credibleInterval) els.credibleInterval.textContent = showPosteriorStats ? `${pct(summary.low, 1)} - ${pct(summary.high, 1)}` : '-';
  if (els.nextSuccess) els.nextSuccess.textContent = showPosteriorStats ? pct(summary.next, 1) : '-';
  if (els.priorWeight) els.priorWeight.textContent = `${Math.round(state.priorStrength)}件分`;
  if (els.observedRatio) {
    els.observedRatio.textContent = observed
      ? `${state.successes}/${observed} (${pct(ratio, 1)})`
      : '0/0';
  }
  if (els.predictiveGuideText) {
    els.predictiveGuideText.textContent =
      `更新後の平均は ${pct(summary.mean, 1)}。未来 ${state.futureTrials} 回の成功数候補が、予測分布として横に並ぶ。`;
  }
  if (els.predictiveMode && els.predictiveRange) {
    const predictive = predictiveSummary(summary);
    els.predictiveMode.textContent = `${predictive.mode}回`;
    els.predictiveRange.textContent = `${predictive.low} - ${predictive.high}回`;
  }
  if (els.trialDots) renderTrialDots();
  syncProcessGuide(summary);
}

function syncProcessGuide(summary) {
  if (!els.updateGuide) return;
  els.updateGuide.dataset.step = state.updateStep;
  els.processStepButtons.forEach((button) => {
    const active = button.dataset.updateStep === state.updateStep;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  const showEvidence = state.updateStep !== 'prior';
  const showPosterior = state.updateStep === 'posterior';
  els.flowPrior.textContent = `仮の成功側 ${countText(summary.alpha)} / 仮の失敗側 ${countText(summary.beta)}`;
  els.flowEvidence.textContent = showEvidence ? `成功 ${state.successes} / 失敗 ${state.failures}` : '観測で重みづける';
  els.flowEvidence.classList.toggle('is-pending', !showEvidence);
  els.flowPosterior.textContent = showPosterior
    ? `成功側 ${countText(summary.posteriorAlpha)} / 失敗側 ${countText(summary.posteriorBeta)}`
    : '更新後で現れる';
  els.flowPosterior.classList.toggle('is-pending', !showPosterior);
  if (els.resultReadout) {
    els.resultReadout.classList.toggle('is-pending', state.updateStep !== 'posterior');
  }

  const observed = state.successes + state.failures;
  const dataRate = observed ? state.successes / observed : 0;
  const text = {
    prior: `観測前には、候補の山が出発点として置かれる。事前平均 ${pct(state.priorMean, 0)} は中心、事前分布の強さ ${state.priorStrength}件分は、実観測ではない仮の重みとして表れる。`,
    evidence: `観測が重なる。尤度は、その成功率だったとしたら今回の観測がどれくらい起こりやすいかを表す。観測が支持する山は ${pct(dataRate, 1)} 付近に立つ。`,
    posterior: `出発点と観測が合わさり、更新後の分布が現れる。成功側は ${countText(summary.alpha)} + ${state.successes}、失敗側は ${countText(summary.beta)} + ${state.failures} として積み上がる。`
  };
  els.processNarrative.textContent = text[state.updateStep];
  const detail = {
    prior: `成功側 ${countText(summary.alpha)}・失敗側 ${countText(summary.beta)} に近い仮の重みが、出発点の形を作る。強さ ${state.priorStrength} は、観測が少ないときに出発点がどれだけ動きにくいかを表す。`,
    evidence: `観測割合は ${pct(dataRate, 1)}。マゼンタの尤度が出発点に重なる。`,
    posterior: `更新後の平均は ${pct(summary.mean, 1)}。95%信用区間は信頼区間とは別に、更新後の山の幅をこのモデルと事前分布のもとで切り出した ${pct(summary.low, 1)} - ${pct(summary.high, 1)} と読む。`
  };
  if (els.processDetail) els.processDetail.textContent = detail[state.updateStep];
}

function renderTrialDots() {
  const total = state.successes + state.failures;
  const ratio = total ? state.successes / total : 0;
  els.trialDots.textContent = total
    ? `成功側に +${state.successes}、失敗側に +${state.failures}（観測割合 ${pct(ratio, 1)}）`
    : 'まだ観測はない';
}

function sampleCurves(width = 360, viewState = state) {
  const model = getModel(viewState);
  const points = [];
  let maxDensity = 0;
  let maxLikelihood = 0;
  for (let i = 0; i <= width; i += 1) {
    const pValue = i / width;
    const x = Math.min(1 - 1e-5, Math.max(1e-5, pValue));
    const prior = betaPdf(x, model.alpha, model.beta);
    const posterior = betaPdf(x, model.posteriorAlpha, model.posteriorBeta);
    const likelihood = likelihoodShape(x, viewState.successes, viewState.failures);
    maxDensity = Math.max(maxDensity, prior, posterior);
    maxLikelihood = Math.max(maxLikelihood, likelihood);
    points.push({ pValue, prior, posterior, likelihood });
  }
  const likelihoodScale = maxDensity * 0.82 / Math.max(maxLikelihood, 1e-12);
  const yMax = Math.max(maxDensity, maxDensity * 0.82) * 1.08;
  return { points, yMax, likelihoodScale };
}

function drawAxis(ctx, bounds, tc, yLabel) {
  const { left, right, top, bottom, width, height } = bounds;
  ctx.save();
  ctx.strokeStyle = withAlpha(tc.dim, 0.45);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(left, bottom);
  ctx.lineTo(right, bottom);
  ctx.moveTo(left, top);
  ctx.lineTo(left, bottom);
  ctx.stroke();

  ctx.fillStyle = tc.dim;
  ctx.font = '11px "Courier New"';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let i = 0; i <= 4; i += 1) {
    const x = left + width * i / 4;
    ctx.strokeStyle = withAlpha(tc.dim, 0.25);
    ctx.beginPath();
    ctx.moveTo(x, bottom);
    ctx.lineTo(x, bottom + 5);
    ctx.stroke();
    ctx.fillText((i / 4).toFixed(2), x, bottom + 8);
  }

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = tc.text;
  ctx.font = `bold 12px ${jpFont}`;
  ctx.fillText('p', right - 12, bottom - 9);
  ctx.save();
  ctx.translate(left + 13, top + 86);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(yLabel, 0, 0);
  ctx.restore();
  ctx.restore();
}

function pathFrom(points, bounds, yMax, getY) {
  const { left, bottom, width, height } = bounds;
  return points.map((p) => {
    const x = left + p.pValue * width;
    const y = bottom - Math.min(1, getY(p) / yMax) * height;
    return [x, y];
  });
}

function drawCredibleBand(ctx, bounds, summary, tc) {
  const { left, bottom, top, width } = bounds;
  const x0 = left + summary.low * width;
  const x1 = left + summary.high * width;
  ctx.save();
  ctx.fillStyle = withAlpha(tc.yellow, 0.12);
  ctx.fillRect(x0, top, Math.max(1, x1 - x0), bottom - top);
  ctx.strokeStyle = withAlpha(tc.yellow, 0.58);
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(x0, top);
  ctx.lineTo(x0, bottom);
  ctx.moveTo(x1, top);
  ctx.lineTo(x1, bottom);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawMarkers(ctx, bounds, summary, tc, viewState = state) {
  const { left, top, bottom, width } = bounds;
  const stepLevel = viewState.stepLevel ?? stepLevels[viewState.updateStep] ?? 0;
  const lines = [{ x: viewState.priorMean, color: tc.cyan, label: '出発点' }];
  const observed = viewState.successes + viewState.failures;
  if (observed > 0 && stepLevel > 0) {
    lines.push({ x: viewState.successes / observed, color: tc.magenta, label: '観測', alpha: Math.min(1, stepLevel) });
  }
  if (stepLevel > 1) {
    lines.push({ x: summary.mean, color: tc.yellow, label: '更新後', alpha: Math.min(1, stepLevel - 1) });
  }
  ctx.save();
  ctx.font = `10px ${jpFont}`;
  ctx.textBaseline = 'top';
  for (const item of lines) {
    const x = left + item.x * width;
    ctx.globalAlpha = item.alpha ?? 1;
    ctx.strokeStyle = withAlpha(item.color, 0.7);
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = item.color;
    ctx.fillText(item.label, Math.min(x + 5, left + width - 42), top + 8);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawPosterior(viewState = visualState) {
  const canvas = els.posteriorCanvas;
  if (!canvas) return;
  const mobile = canvas.clientWidth < 560;
  canvas.style.height = mobile ? '290px' : '430px';
  const { ctx, w, h } = resizeCanvas(canvas);
  if (!ctx) return;
  const tc = themeColors();
  drawGrid(ctx, w, h, withAlpha(tc.cyan, 0.055));

  const bounds = {
    left: mobile ? 42 : 58,
    right: w - (mobile ? 16 : 26),
    top: mobile ? 24 : 34,
    bottom: h - (mobile ? 42 : 54)
  };
  bounds.width = bounds.right - bounds.left;
  bounds.height = bounds.bottom - bounds.top;

  const { points, yMax, likelihoodScale } = sampleCurves(mobile ? 240 : 420, viewState);
  const summary = posteriorSummary(viewState);
  const stepLevel = viewState.stepLevel ?? stepLevels[viewState.updateStep] ?? 0;
  const displayStep = levelToStep(stepLevel);
  const likelihoodAlpha = viewState.showLikelihood ? Math.min(1, Math.max(0, stepLevel)) : 0;
  const posteriorAlpha = Math.min(1, Math.max(0, stepLevel - 1));

  drawAxis(ctx, bounds, tc, '密度');
  if (viewState.showCredible && posteriorAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = posteriorAlpha;
    drawCredibleBand(ctx, bounds, summary, tc);
    ctx.restore();
  }

  const priorPath = pathFrom(points, bounds, yMax, (p) => p.prior);
  const posteriorPath = pathFrom(points, bounds, yMax, (p) => p.posterior);
  neonLine(ctx, priorPath, tc.cyan, 10, mobile ? 1.8 : 2.2);
  if (likelihoodAlpha > 0) {
    const likelihoodPath = pathFrom(points, bounds, yMax, (p) => p.likelihood * likelihoodScale);
    ctx.save();
    ctx.globalAlpha = likelihoodAlpha;
    ctx.setLineDash([8, 5]);
    neonLine(ctx, likelihoodPath, tc.magenta, 8, mobile ? 1.5 : 2);
    ctx.setLineDash([]);
    ctx.restore();
  }
  if (posteriorAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = posteriorAlpha;
    neonLine(ctx, posteriorPath, tc.yellow, 14, mobile ? 2.2 : 2.8);
    ctx.restore();
  }
  drawMarkers(ctx, bounds, summary, tc, viewState);

  const stepLabel = {
    prior: 'STEP 1 / 出発点',
    evidence: 'STEP 2 / 観測',
    posterior: 'STEP 3 / 更新後'
  };
  ctx.fillStyle = displayStep === 'posterior' ? tc.yellow : (displayStep === 'evidence' ? tc.magenta : tc.cyan);
  ctx.font = `bold ${mobile ? 10 : 12}px ${jpFont}`;
  ctx.fillText(stepLabel[displayStep], bounds.left, bounds.top - 9);

  if (!mobile) {
    ctx.fillStyle = tc.dim;
    ctx.font = `12px ${jpFont}`;
    ctx.textAlign = 'left';
    const note = displayStep === 'prior'
      ? 'STEP 2で観測を重ねる'
      : 'マゼンタの線は形の比較用に高さをそろえている';
    ctx.fillText(note, bounds.left, h - 12);
  }
}

function drawPredictive(viewState = visualState) {
  const canvas = els.predictiveCanvas;
  if (!canvas) return;
  const mobile = canvas.clientWidth < 560;
  canvas.style.height = mobile ? '240px' : '320px';
  const { ctx, w, h } = resizeCanvas(canvas);
  if (!ctx) return;
  const tc = themeColors();
  drawGrid(ctx, w, h, withAlpha(tc.cyan, 0.05));
  const summary = posteriorSummary(viewState);
  const { n, pmf, low, high, mean } = predictiveSummary(summary, viewState);
  const maxP = Math.max(...pmf, 1e-9);
  const left = mobile ? 34 : 48;
  const right = w - (mobile ? 12 : 24);
  const top = mobile ? 22 : 28;
  const bottom = h - (mobile ? 38 : 48);
  const innerW = right - left;
  const innerH = bottom - top;
  const barGap = n > 36 ? 1 : 3;
  const barW = Math.max(2, innerW / (n + 1) - barGap);

  ctx.strokeStyle = withAlpha(tc.dim, 0.45);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(left, top);
  ctx.lineTo(left, bottom);
  ctx.lineTo(right, bottom);
  ctx.stroke();

  const bandStart = left + low * innerW / (n + 1);
  const bandEnd = left + (high + 1) * innerW / (n + 1);
  ctx.fillStyle = withAlpha(tc.yellow, 0.12);
  ctx.fillRect(bandStart, top, Math.max(2, bandEnd - bandStart), innerH);

  for (let k = 0; k <= n; k += 1) {
    const x = left + k * innerW / (n + 1) + barGap / 2;
    const bh = pmf[k] / maxP * innerH;
    ctx.fillStyle = withAlpha(tc.yellow, 0.68);
    ctx.fillRect(x, bottom - bh, barW, bh);
  }

  const meanX = left + mean * innerW / (n + 1) + barGap / 2;
  ctx.strokeStyle = withAlpha(tc.text, 0.82);
  ctx.lineWidth = mobile ? 1.3 : 1.6;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(meanX, top);
  ctx.lineTo(meanX, bottom);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = tc.text;
  ctx.font = `bold ${mobile ? 11 : 13}px ${jpFont}`;
  ctx.fillText(`未来の試行数: ${n}`, left, top + 2);
  ctx.fillStyle = tc.dim;
  ctx.font = `${mobile ? 10 : 12}px ${jpFont}`;
  ctx.fillText('縦軸: 確率', left, top + (mobile ? 17 : 20));
  ctx.fillText('成功数', right - 48, bottom + 19);
  ctx.fillText('0', left, bottom + 17);
  ctx.textAlign = 'right';
  ctx.fillText(String(n), right, bottom + 17);
  ctx.textAlign = 'left';
}

function renderGraph() {
  syncOutputs();
  drawPosterior();
  drawPredictive();
}

function interpolateVisualState(from, to, progress) {
  const next = interpolateNumberState(from, to, progress, [
    'priorMean', 'priorStrength', 'successes', 'failures', 'futureTrials', 'stepLevel'
  ]);
  next.updateStep = levelToStep(next.stepLevel);
  next.showLikelihood = progress < 0.5 ? from.showLikelihood : to.showLikelihood;
  next.showCredible = progress < 0.5 ? from.showCredible : to.showCredible;
  return next;
}

const animateGraph = createStateAnimator({
  getTargetState: () => snapshotState(state),
  getVisualState: () => snapshotState(visualState),
  setVisualState: next => { visualState = { ...next }; },
  interpolateState: interpolateVisualState,
  render: renderGraph
});
const scheduleDraw = throttledDraw(() => {
  visualState = snapshotState(state);
  renderGraph();
});

function readControls() {
  if (els.priorMean) state.priorMean = Number(els.priorMean.value);
  if (els.priorStrength) state.priorStrength = Number(els.priorStrength.value);
  if (els.successes) state.successes = Number(els.successes.value);
  if (els.failures) state.failures = Number(els.failures.value);
  if (els.showLikelihood) state.showLikelihood = els.showLikelihood.checked;
  if (els.showCredible) state.showCredible = els.showCredible.checked;
  if (els.futureTrials) state.futureTrials = Number(els.futureTrials.value);
}

function clampDataInputs() {
  if (els.successes) els.successes.value = String(Math.min(80, Math.max(0, state.successes)));
  if (els.failures) els.failures.value = String(Math.min(80, Math.max(0, state.failures)));
}

function syncFutureControl() {
  if (els.futureTrials) els.futureTrials.value = String(state.futureTrials);
}

function syncFuturePresetButtons() {
  els.futurePresetButtons.forEach((button) => {
    const active = futurePresets[button.dataset.futurePreset] === state.futureTrials;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function bindControls() {
  [
    'priorMean', 'priorStrength', 'successes', 'failures',
    'showLikelihood', 'showCredible', 'futureTrials'
  ].forEach((id) => {
    if (!els[id]) return;
    els[id].addEventListener('input', () => {
      readControls();
      if ((id === 'successes' || id === 'failures') && state.updateStep === 'prior') {
        state.updateStep = 'evidence';
      }
      syncFuturePresetButtons();
      if (id === 'showLikelihood' || id === 'showCredible') animateGraph();
      else scheduleDraw();
    });
  });

  els.addSuccess?.addEventListener('click', () => {
    state.successes = Math.min(80, state.successes + 1);
    if (state.updateStep === 'prior') state.updateStep = 'evidence';
    clampDataInputs();
    animateGraph();
  });
  els.addFailure?.addEventListener('click', () => {
    state.failures = Math.min(80, state.failures + 1);
    if (state.updateStep === 'prior') state.updateStep = 'evidence';
    clampDataInputs();
    animateGraph();
  });
  els.resetData?.addEventListener('click', () => {
    state.successes = 7;
    state.failures = 3;
    clampDataInputs();
    animateGraph();
  });
  els.processStepButtons.forEach((button) => {
    button.addEventListener('click', () => {
      state.updateStep = button.dataset.updateStep;
      animateGraph();
    });
  });
  els.futurePresetButtons.forEach((button) => {
    button.addEventListener('click', () => {
      state.futureTrials = futurePresets[button.dataset.futurePreset];
      syncFutureControl();
      syncFuturePresetButtons();
      animateGraph();
    });
  });

  window.addEventListener('resize', debouncedResize(scheduleDraw, 120));
  window.addEventListener('themechange', scheduleDraw);
}

export function initBetaBinomialLab() {
  [
    'posteriorCanvas', 'predictiveCanvas', 'priorMean', 'priorStrength', 'successes',
    'failures', 'showLikelihood', 'showCredible', 'futureTrials', 'priorMeanValue',
    'priorStrengthValue', 'successesValue', 'failuresValue', 'futureTrialsValue',
    'posteriorMean', 'credibleInterval', 'nextSuccess', 'priorWeight', 'observedRatio',
    'trialDots', 'addSuccess', 'addFailure', 'resetData', 'updateGuide', 'flowPrior',
    'flowEvidence', 'flowPosterior', 'processNarrative', 'processDetail', 'resultReadout',
    'predictiveGuideText', 'predictiveMode', 'predictiveRange'
  ].forEach((id) => {
    els[id] = $(id);
  });
  els.processStepButtons = [...document.querySelectorAll('[data-update-step]')];
  els.futurePresetButtons = [...document.querySelectorAll('[data-future-preset]')];
  if (!els.posteriorCanvas && !els.predictiveCanvas) return;
  readControls();
  syncFuturePresetButtons();
  bindControls();
  scheduleDraw();
}
