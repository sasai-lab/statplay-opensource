import {
  resizeCanvas, themeColors, withAlpha, throttledDraw, debouncedResize
} from '../../../js/utils.js';
import { betaPdf } from '../math/beta.js';

const jpFont = '"Hiragino Sans", "Yu Gothic", "Noto Sans JP", sans-serif';

function easeOutCubic(t) {
  return 1 - ((1 - t) ** 3);
}

function drawCurve(ctx, points, color, progress, glow = 14) {
  const limit = Math.max(2, Math.floor((points.length - 1) * progress));
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.6;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.shadowColor = color;
  ctx.shadowBlur = glow;
  ctx.beginPath();
  points.slice(0, limit).forEach(([x, y], index) => {
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.restore();
}

function makeCurve({ left, bottom, width, height }, alpha, beta, yMax) {
  const points = [];
  for (let i = 0; i <= 220; i += 1) {
    const p = Math.min(1 - 1e-4, Math.max(1e-4, i / 220));
    const x = left + p * width;
    const y = bottom - (betaPdf(p, alpha, beta) / yMax) * height;
    points.push([x, y]);
  }
  return points;
}

function setHeroText(progress) {
  const impact = document.getElementById('bayesHeroImpact');
  const title = document.getElementById('bayesHeroTitle');
  const sub = document.getElementById('bayesHeroSub');
  const meta = document.getElementById('bayesHeroMeta');
  if (progress > 0.18) impact?.classList.add('hero-in');
  if (progress > 0.36) title?.classList.add('hero-in');
  if (progress > 0.56) sub?.classList.add('hero-in');
  if (progress > 0.72) meta?.classList.add('hero-in');
}

function drawFrame(canvas, progress) {
  const { ctx, w, h } = resizeCanvas(canvas);
  if (!ctx) return;
  const tc = themeColors();
  const p = easeOutCubic(progress);
  ctx.clearRect(0, 0, w, h);

  const gridColor = document.body.classList.contains('theme-light')
    ? 'rgba(0, 70, 90, .06)'
    : withAlpha(tc.cyan, 0.05);
  ctx.save();
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;
  for (let x = 0; x <= w; x += 44) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y <= h; y += 44) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.restore();

  const mobile = w < 680;
  const bounds = {
    left: mobile ? 28 : Math.max(64, w * 0.12),
    right: mobile ? w - 28 : Math.min(w - 64, w * 0.88),
    top: mobile ? h * 0.20 : h * 0.16,
    bottom: mobile ? h * 0.76 : h * 0.78
  };
  bounds.width = bounds.right - bounds.left;
  bounds.height = bounds.bottom - bounds.top;

  const yMax = 5.8;
  const prior = makeCurve(bounds, 5, 5, yMax);
  const likelihood = makeCurve(bounds, 8, 4, yMax);
  const posterior = makeCurve(bounds, 12, 8, yMax);

  ctx.save();
  ctx.strokeStyle = withAlpha(tc.dim, 0.35);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(bounds.left, bounds.bottom);
  ctx.lineTo(bounds.right, bounds.bottom);
  ctx.stroke();
  ctx.restore();

  drawCurve(ctx, prior, withAlpha(tc.cyan, 0.68), Math.min(1, p / 0.48), 16);
  if (p > 0.24) {
    ctx.save();
    ctx.setLineDash([9, 7]);
    drawCurve(ctx, likelihood, withAlpha(tc.magenta, 0.66), Math.min(1, (p - 0.24) / 0.38), 14);
    ctx.restore();
  }
  if (p > 0.52) {
    drawCurve(ctx, posterior, withAlpha(tc.yellow, 0.82), Math.min(1, (p - 0.52) / 0.36), 20);
  }

  const markerProgress = Math.max(0, Math.min(1, (p - 0.62) / 0.22));
  if (markerProgress > 0) {
    [
      { x: 0.5, label: '出発点', color: tc.cyan, offset: 0 },
      { x: 0.7, label: '観測', color: tc.magenta, offset: 20 },
      { x: 0.6, label: '更新後', color: tc.yellow, offset: 40 }
    ].forEach((line) => {
      const x = bounds.left + line.x * bounds.width;
      ctx.save();
      ctx.globalAlpha = markerProgress;
      ctx.strokeStyle = withAlpha(line.color, 0.55);
      ctx.setLineDash([5, 6]);
      ctx.beginPath();
      ctx.moveTo(x, bounds.top);
      ctx.lineTo(x, bounds.bottom);
      ctx.stroke();
      if (!mobile) {
        ctx.fillStyle = line.color;
        ctx.font = `12px ${jpFont}`;
        ctx.fillText(line.label, Math.min(x + 8, bounds.right - 72), bounds.top + 18 + line.offset);
      }
      ctx.restore();
    });
  }

  setHeroText(p);
}

export function initBayesHero() {
  const canvas = document.getElementById('bayesHeroCanvas');
  const scrollButton = document.getElementById('bayesHeroScroll');
  if (!canvas) return;

  scrollButton?.addEventListener('click', () => {
    const target = document.getElementById('beta-binomial') || document.getElementById('lab-index');
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) {
    drawFrame(canvas, 1);
    return;
  }

  const duration = 2600;
  let start = 0;
  function animate(ts) {
    if (!start) start = ts;
    const progress = Math.min(1, (ts - start) / duration);
    drawFrame(canvas, progress);
    if (progress < 1) requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);

  const redraw = throttledDraw(() => drawFrame(canvas, 1));
  window.addEventListener('resize', debouncedResize(redraw, 120));
  window.addEventListener('themechange', redraw);
}
