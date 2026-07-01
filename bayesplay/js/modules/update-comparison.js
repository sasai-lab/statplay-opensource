import {
  resizeCanvas, themeColors, withAlpha, drawGrid, neonLine, throttledDraw, debouncedResize
} from '../../../js/utils.js';
import { betaPdf, likelihoodShape } from '../math/beta.js';

const stageOrder = ['prior', 'evidence', 'posterior'];
const stageLevel = { prior: 0, evidence: 1, posterior: 2 };

const stageCopy = {
  prior: {
    label: '1 / 出発点',
    point: 'まだ観測を見ない段階では、成功率の候補を幅のある山として置く。',
    detail: 'シアンの山は、観測前にどの成功率がありそうかを表す出発点です。最初から1つの値に決めず、幅を残して読みます。'
  },
  evidence: {
    label: '2 / 観測',
    point: '成功7回・失敗3回という観測は、70%付近の候補を強く支持する。',
    detail: 'マゼンタの山は尤度です。その成功率だったとしたら、今回の観測がどれくらい起こりやすいかを見ています。'
  },
  posterior: {
    label: '3 / 更新後',
    point: '出発点と観測を合わせると、候補の山は観測側へ寄り、幅も変わる。',
    detail: '黄色の山が事後分布です。平均だけでなく、まだどれくらい不確実性が残るかを幅として読みます。'
  }
};

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function easeOutCubic(t) {
  return 1 - ((1 - t) ** 3);
}

function makeShape(fn) {
  const values = [];
  let maxY = 0;
  for (let i = 0; i <= 220; i += 1) {
    const x = Math.min(1 - 1e-4, Math.max(1e-4, i / 220));
    const y = fn(x);
    maxY = Math.max(maxY, y);
    values.push([x, y]);
  }
  return values.map(([x, y]) => [x, maxY ? y / maxY : 0]);
}

const shapes = {
  prior: makeShape((x) => betaPdf(x, 5, 5)),
  evidence: makeShape((x) => likelihoodShape(x, 7, 3)),
  posterior: makeShape((x) => betaPdf(x, 12, 8))
};

function pointsFromShape(shape, bounds) {
  return shape.map(([x, y]) => [
    bounds.left + x * bounds.width,
    bounds.bottom - y * bounds.height
  ]);
}

function drawAxis(ctx, bounds, colors, mobile) {
  ctx.save();
  ctx.strokeStyle = withAlpha(colors.dim, 0.38);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(bounds.left, bounds.bottom);
  ctx.lineTo(bounds.right, bounds.bottom);
  ctx.stroke();

  ctx.fillStyle = colors.dim;
  ctx.font = `${mobile ? 11 : 12}px "Courier New", monospace`;
  [
    [0, '0%'],
    [0.5, '50%'],
    [1, '100%']
  ].forEach(([x, label]) => {
    const px = bounds.left + x * bounds.width;
    ctx.beginPath();
    ctx.moveTo(px, bounds.bottom);
    ctx.lineTo(px, bounds.bottom + 5);
    ctx.stroke();
    ctx.fillText(label, Math.min(px, bounds.right - 28), bounds.bottom + 22);
  });
  ctx.restore();
}

function drawPosteriorBand(ctx, bounds, alpha, colors) {
  if (alpha <= 0) return;
  const low = 0.39;
  const high = 0.80;
  const x1 = bounds.left + low * bounds.width;
  const x2 = bounds.left + high * bounds.width;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = withAlpha(colors.yellow, 0.12);
  ctx.strokeStyle = withAlpha(colors.yellow, 0.28);
  ctx.fillRect(x1, bounds.top + 8, x2 - x1, bounds.height - 8);
  ctx.strokeRect(x1, bounds.top + 8, x2 - x1, bounds.height - 8);
  ctx.restore();
}

function drawMarker(ctx, bounds, x, label, color, alpha, offset = 0) {
  if (alpha <= 0) return;
  const px = bounds.left + x * bounds.width;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = withAlpha(color, 0.66);
  ctx.setLineDash([5, 6]);
  ctx.beginPath();
  ctx.moveTo(px, bounds.top + 8);
  ctx.lineTo(px, bounds.bottom);
  ctx.stroke();
  if (label) {
    ctx.fillStyle = color;
    ctx.font = '700 12px "Hiragino Sans", "Yu Gothic", "Noto Sans JP", sans-serif';
    ctx.fillText(label, Math.min(px + 8, bounds.right - 112), bounds.top + 24 + offset);
  }
  ctx.restore();
}

function drawCurve(ctx, bounds, shape, color, alpha, active) {
  if (alpha <= 0) return;
  const points = pointsFromShape(shape, bounds);
  ctx.save();
  ctx.globalAlpha = alpha;
  neonLine(ctx, points, color, active ? 16 : 7, active ? 3 : 2);
  ctx.restore();
}

function drawStageLabels(ctx, bounds, colors, stage, mobile) {
  const active = stageCopy[stage];
  ctx.save();
  ctx.fillStyle = colors.yellow;
  ctx.font = '700 12px "Courier New", monospace';
  ctx.fillText(active.label, bounds.left, bounds.top - 12);
  if (!mobile) {
    ctx.fillStyle = colors.dim;
    ctx.font = '12px "Hiragino Sans", "Yu Gothic", "Noto Sans JP", sans-serif';
    ctx.fillText('横軸: 未知の成功率 p', bounds.right - 148, bounds.bottom + 22);
  }
  ctx.restore();
}

function drawComparison(canvas, state) {
  const { ctx, w, h } = resizeCanvas(canvas);
  if (!ctx) return;
  const colors = themeColors();
  const mobile = w < 680;
  ctx.clearRect(0, 0, w, h);
  drawGrid(ctx, w, h, colors.grid);

  const bounds = {
    left: mobile ? 42 : 58,
    right: mobile ? w - 24 : w - 42,
    top: mobile ? 38 : 44,
    bottom: mobile ? h - 58 : h - 56
  };
  bounds.width = bounds.right - bounds.left;
  bounds.height = bounds.bottom - bounds.top;

  const level = state.renderLevel;
  const evidenceIn = clamp01(level);
  const posteriorIn = clamp01(level - 1);
  const priorActive = level < 0.55;
  const evidenceActive = level >= 0.55 && level < 1.55;
  const posteriorActive = level >= 1.55;
  const priorAlpha = Math.max(priorActive ? 1 : 0.24, 1 - evidenceIn * 0.64 - posteriorIn * 0.08);
  const evidenceAlpha = Math.max(evidenceActive ? 1 : 0.26, evidenceIn - posteriorIn * 0.54);
  const posteriorAlpha = Math.max(posteriorActive ? 1 : 0, posteriorIn);

  drawAxis(ctx, bounds, colors, mobile);
  drawPosteriorBand(ctx, bounds, posteriorIn * 0.88, colors);
  drawCurve(ctx, bounds, shapes.prior, colors.cyan, priorAlpha, priorActive);
  drawCurve(ctx, bounds, shapes.evidence, colors.magenta, evidenceAlpha, evidenceActive);
  drawCurve(ctx, bounds, shapes.posterior, colors.yellow, posteriorAlpha, posteriorActive);
  drawMarker(ctx, bounds, 0.5, mobile && !priorActive ? '' : '出発点', colors.cyan, priorAlpha * 0.92);
  drawMarker(ctx, bounds, 0.7, mobile && !evidenceActive ? '' : '観測 70%', colors.magenta, evidenceAlpha * 0.9, 18);
  drawMarker(ctx, bounds, 0.6, mobile && !posteriorActive ? '' : '更新後平均', colors.yellow, posteriorAlpha * 0.9, 36);
  drawStageLabels(ctx, bounds, colors, state.stage, mobile);
}

function syncCopy(state) {
  const copy = stageCopy[state.stage];
  const name = document.getElementById('compareStageName');
  const point = document.getElementById('compareStagePoint');
  const detail = document.getElementById('compareStageDetail');
  if (name) name.textContent = copy.label;
  if (point) point.textContent = copy.point;
  if (detail) detail.textContent = copy.detail;
}

function syncButtons(state) {
  document.querySelectorAll('[data-compare-stage]').forEach((button) => {
    const active = button.dataset.compareStage === state.stage;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function animateTo(canvas, state, nextStage) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  state.stage = nextStage;
  state.targetLevel = stageLevel[nextStage];
  syncButtons(state);
  syncCopy(state);
  if (reduced) {
    state.renderLevel = state.targetLevel;
    drawComparison(canvas, state);
    return;
  }

  state.animationId += 1;
  const animationId = state.animationId;
  const from = state.renderLevel;
  const to = state.targetLevel;
  const duration = 650;
  let start = 0;
  function frame(ts) {
    if (animationId !== state.animationId) return;
    if (!start) start = ts;
    const t = Math.min(1, (ts - start) / duration);
    state.renderLevel = from + (to - from) * easeOutCubic(t);
    drawComparison(canvas, state);
    if (t < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

export function initUpdateComparison() {
  const canvas = document.getElementById('updateCompareCanvas');
  if (!canvas) return;
  const state = {
    stage: 'prior',
    renderLevel: 0,
    targetLevel: 0,
    animationId: 0
  };
  const draw = throttledDraw(() => drawComparison(canvas, state));
  document.querySelectorAll('[data-compare-stage]').forEach((button) => {
    button.addEventListener('click', () => {
      const next = button.dataset.compareStage;
      if (!stageOrder.includes(next)) return;
      animateTo(canvas, state, next);
    });
  });
  syncButtons(state);
  syncCopy(state);
  drawComparison(canvas, state);
  window.addEventListener('resize', debouncedResize(draw, 120));
  window.addEventListener('themechange', draw);
}
