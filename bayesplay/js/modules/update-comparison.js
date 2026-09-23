import { resizeCanvas, themeColors, withAlpha, neonLine, throttledDraw, debouncedResize } from '../../../js/utils.js';
import { betaPdf, betaQuantile, betaUpdate, betaMean, likelihoodShape } from '../math/beta.js';

const levels = { prior: 0, evidence: 1, posterior: 2 };
const pct = value => `${(100 * value).toFixed(1)}%`;
const clamp = value => Math.max(0, Math.min(1, value));

// The chart and the DOM readout use the same conjugate update and interval.
export function comparisonModel(successes, failures) {
  const model = betaUpdate({ priorMean: 0.5, priorStrength: 10, successes, failures });
  return {
    ...model,
    mean: betaMean(model.posteriorAlpha, model.posteriorBeta),
    low: betaQuantile(0.025, model.posteriorAlpha, model.posteriorBeta),
    high: betaQuantile(0.975, model.posteriorAlpha, model.posteriorBeta),
    observed: successes / (successes + failures)
  };
}

function drawComparison(canvas, state) {
  const { ctx, w, h } = resizeCanvas(canvas);
  if (!ctx) return;
  const c = themeColors();
  const m = comparisonModel(state.successes, state.failures);
  const b = { left: 30, right: w - 16, top: 24, bottom: h - 38 };
  const width = b.right - b.left;
  const height = b.bottom - b.top;
  const points = Array.from({ length: 241 }, (_, i) => {
    const x = Math.max(1e-5, Math.min(1 - 1e-5, i / 240));
    return { x, prior: betaPdf(x, 5, 5), posterior: betaPdf(x, m.posteriorAlpha, m.posteriorBeta), likelihood: likelihoodShape(x, state.successes, state.failures) };
  });
  const densityMax = Math.max(...points.map(p => Math.max(p.prior, p.posterior)));
  const yMax = Math.ceil(densityMax * 1.12);
  const xPixel = x => b.left + x * width;
  const yPixel = y => b.bottom - y / yMax * height;
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.font = '10px "Courier New", monospace';
  ctx.fillStyle = c.dim;
  ctx.textAlign = 'right';
  for (const y of [0, yMax / 2, yMax]) {
    ctx.strokeStyle = withAlpha(c.dim, 0.14);
    ctx.beginPath(); ctx.moveTo(b.left, yPixel(y)); ctx.lineTo(b.right, yPixel(y)); ctx.stroke();
    ctx.fillText(String(y), b.left - 8, yPixel(y) + 3);
  }
  ctx.textAlign = 'center';
  for (const x of [0, 0.25, 0.5, 0.75, 1]) ctx.fillText(`${x * 100}%`, xPixel(x), b.bottom + 17);
  ctx.textAlign = 'left';
  ctx.fillText('密度', b.left, 13);
  ctx.textAlign = 'right';
  ctx.fillText('未知の成功率 p', b.right, h - 3);
  const evidenceAlpha = clamp(state.renderLevel);
  const posteriorAlpha = clamp(state.renderLevel - 1);
  if (posteriorAlpha > 0) {
    ctx.fillStyle = withAlpha(c.yellow, 0.09 * posteriorAlpha);
    ctx.fillRect(xPixel(m.low), b.top, (m.high - m.low) * width, height);
  }
  function curve(key, color, alpha, scale = 1, dashed = false) {
    if (alpha <= 0) return;
    ctx.save(); ctx.globalAlpha = alpha;
    if (dashed) ctx.setLineDash([6, 5]);
    neonLine(ctx, points.map(p => [xPixel(p.x), yPixel(p[key] * scale)]), color, 5, key === 'posterior' ? 2.8 : 1.8);
    ctx.restore();
  }
  curve('prior', c.cyan, 1 - posteriorAlpha * 0.25);
  curve('likelihood', c.magenta, evidenceAlpha * 0.85, densityMax * 0.82, true);
  curve('posterior', c.yellow, posteriorAlpha);
  if (posteriorAlpha > 0) {
    ctx.strokeStyle = withAlpha(c.yellow, posteriorAlpha * 0.6); ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(xPixel(m.mean), b.top); ctx.lineTo(xPixel(m.mean), b.bottom); ctx.stroke();
  }
  ctx.restore();
  canvas.setAttribute('aria-busy', 'false');
}

function syncCopy(state) {
  const m = comparisonModel(state.successes, state.failures);
  const showEvidence = state.stage !== 'prior';
  const showPosterior = state.stage === 'posterior';
  const texts = {
    prior: ['1 / 事前分布', '観測前は、50%を中心に成功率の候補を置く。', '事前分布はBeta(5, 5)。成功側5・失敗側5に相当する仮の重みで、実際の観測ではありません。'],
    evidence: ['2 / 尤度', `成功${state.successes}回・失敗${state.failures}回。尤度は${pct(m.observed)}付近で最大になる。`, '破線の高さは比較用に調整しています。尤度は成功率の確率分布そのものではありません。'],
    posterior: ['3 / 事後分布', `事前と観測を合わせると、事後平均は${pct(m.mean)}。`, `95%信用区間は${pct(m.low)}–${pct(m.high)}。このモデルと事前分布のもとで、成功率に残る不確実性を表します。`]
  };
  const [name, point, detail] = texts[state.stage];
  for (const [id, text] of Object.entries({
    compareStageName: name, compareStagePoint: point, compareStageDetail: detail,
    compareObserved: showEvidence ? pct(m.observed) : '—', compareMean: showPosterior ? pct(m.mean) : '—',
    compareCounts: `成功 ${state.successes} / 失敗 ${state.failures}`,
    'demo-title': `${state.successes}回成功した。成功率は${Math.round(m.observed * 100)}%？`
  })) document.getElementById(id).textContent = text;
  document.getElementById('compareSuccess').disabled = state.successes >= 100;
  document.getElementById('compareFailure').disabled = state.failures >= 100;
  document.querySelectorAll('[data-compare-stage]').forEach(button => {
    const active = button.dataset.compareStage === state.stage;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

export function initUpdateComparison() {
  const canvas = document.getElementById('updateCompareCanvas');
  if (!canvas) return;
  const state = { stage: 'posterior', renderLevel: 2, successes: 7, failures: 3 };
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let frameId = 0;
  function update(stage) {
    cancelAnimationFrame(frameId);
    const from = state.renderLevel;
    state.stage = stage;
    const to = levels[stage];
    syncCopy(state);
    if (motion.matches || from === to) {
      state.renderLevel = to;
      drawComparison(canvas, state);
      return;
    }
    let start;
    function frame(ts) {
      start ??= ts;
      const t = Math.min(1, (ts - start) / 420);
      state.renderLevel = from + (to - from) * (1 - (1 - t) ** 3);
      drawComparison(canvas, state);
      if (t < 1) frameId = requestAnimationFrame(frame);
    }
    frameId = requestAnimationFrame(frame);
  }
  document.querySelectorAll('[data-compare-stage]').forEach(button => {
    button.addEventListener('click', () => update(button.dataset.compareStage));
  });
  for (const [id, key] of [['compareSuccess', 'successes'], ['compareFailure', 'failures']]) {
    document.getElementById(id).addEventListener('click', () => {
      state[key] = Math.min(100, state[key] + 1);
      update('posterior');
    });
  }
  document.getElementById('compareReset').addEventListener('click', () => {
    state.successes = 7; state.failures = 3;
    update('posterior');
  });
  const redraw = throttledDraw(() => drawComparison(canvas, state));
  window.addEventListener('resize', debouncedResize(redraw, 100));
  window.addEventListener('themechange', redraw);
  syncCopy(state);
  drawComparison(canvas, state);
}
