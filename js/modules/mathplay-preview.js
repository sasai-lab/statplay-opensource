/* Small MathPlay entrance preview. The full lesson owns the detailed 3D controls. */
import { surface, partialX, partialY, fmt } from './partial-derivative-model.js';
import { resizeCanvas, themeColors } from '../utils.js';

const canvas = document.getElementById('mathplayPreview');
if (canvas) {
  const xInput = document.getElementById('mp-x');
  const yInput = document.getElementById('mp-y');
  const english = document.documentElement.lang === 'en';
  const signed = value => `${value > 0 ? '+' : ''}${fmt(value)}`;

  function draw() {
    const { ctx: context, w: width, h: height } = resizeCanvas(canvas);
    if (!context) return;
    context.clearRect(0, 0, width, height);

    const { cyan, magenta, yellow, dim } = themeColors();
    const x = Number(xInput.value);
    const y = Number(yInput.value);
    const scale = Math.min(width / 6.5, 80);
    const rise = Math.min(height / 11, 31);
    const project = (a, b, z = surface(a, b)) => ({
      x: width / 2 + (a - b) * scale,
      y: height * .7 + (a + b) * scale * .28 - z * rise,
    });
    const stroke = (points, color, lineWidth, alpha = 1) => {
      context.beginPath();
      points.forEach((point, index) => index ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y));
      context.strokeStyle = color;
      context.lineWidth = lineWidth;
      context.globalAlpha = alpha;
      context.stroke();
      context.globalAlpha = 1;
    };
    const line = (fixed, alongX, samples = 45) => Array.from({ length: samples + 1 }, (_, index) => {
      const value = -1.5 + 3 * index / samples;
      return alongX ? project(value, fixed) : project(fixed, value);
    });

    for (let i = -1.5; i <= 1.501; i += .3) {
      stroke(line(i, true), dim, .7, .24);
      stroke(line(i, false), dim, .7, .24);
    }
    stroke(line(y, true, 70), cyan, 2.5);
    stroke(line(x, false, 70), magenta, 2.5);
    const z = surface(x, y);
    const tangent = (alongX, derivative) => [-.45, .45].map(t => alongX
      ? project(x + t, y, z + derivative * t)
      : project(x, y + t, z + derivative * t));
    stroke(tangent(true, partialX(x, y)), cyan, 4);
    stroke(tangent(false, partialY(x, y)), magenta, 4);

    const point = project(x, y, z);
    context.beginPath();
    context.arc(point.x, point.y, 7, 0, Math.PI * 2);
    context.fillStyle = yellow;
    context.shadowColor = yellow;
    context.shadowBlur = 18;
    context.fill();
    context.shadowBlur = 0;
    context.font = '700 13px "Courier New", monospace';
    context.fillText('P', point.x + 12, point.y - 10);

    document.getElementById('mp-x-value').textContent = fmt(x);
    document.getElementById('mp-y-value').textContent = fmt(y);
    document.getElementById('mp-fx').textContent = signed(partialX(x, y));
    document.getElementById('mp-fy').textContent = signed(partialY(x, y));
    document.getElementById('mp-demo-summary-lead').textContent = english
      ? `At P (${fmt(x)}, ${fmt(y)}), the x-slope is `
      : `点 P (${fmt(x)}, ${fmt(y)}) では、x 方向の傾き `;
  }

  xInput.addEventListener('input', draw);
  yInput.addEventListener('input', draw);
  new ResizeObserver(draw).observe(canvas);
  new MutationObserver(draw).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  draw();
}
