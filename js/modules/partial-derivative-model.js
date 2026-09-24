/* Pure mathematical model shared by the MathPlay lesson and entrance preview. */
export const DOMAIN_MIN = -2;
export const DOMAIN_MAX = 2;

/** f(x, y) = x² + xy + y²: a bowl whose slices depend on the fixed value. */
export function surface(x, y) { return x * x + x * y + y * y; }
export function partialX(x, y) { return 2 * x + y; }
export function partialY(x, y) { return x + 2 * y; }
export function numericPartialX(x, y, h = 1e-5, f = surface) { return (f(x + h, y) - f(x - h, y)) / (2 * h); }
export function numericPartialY(x, y, h = 1e-5, f = surface) { return (f(x, y + h) - f(x, y - h)) / (2 * h); }
export function secantSlope(x, y, h) { return (surface(x + h, y) - surface(x, y)) / h; }
export function directionalSlope(x, y, theta) { return partialX(x, y) * Math.cos(theta) + partialY(x, y) * Math.sin(theta); }
export function gradientNorm(x, y) { return Math.hypot(partialX(x, y), partialY(x, y)); }
export function linearChange(x, y, dx, dy) { return partialX(x, y) * dx + partialY(x, y) * dy; }
export function actualChange(x, y, dx, dy) { return surface(x + dx, y + dy) - surface(x, y); }
export function clampToDomain(value) { return Math.max(DOMAIN_MIN, Math.min(DOMAIN_MAX, value)); }

/** Five points for the least-squares finale (x, y). */
export const REG_POINTS = Object.freeze([[0, 1.0], [1, 2.3], [2, 2.9], [3, 3.9], [4, 4.9]]);
export const REG_A_RANGE = Object.freeze([-0.5, 2.5]);
export const REG_B_RANGE = Object.freeze([0.2, 1.7]);
export function residuals(a, b, pts = REG_POINTS) { return pts.map(([x, y]) => y - (a + b * x)); }
export function sse(a, b, pts = REG_POINTS) { return residuals(a, b, pts).reduce((s, e) => s + e * e, 0); }
export function sumResiduals(a, b, pts = REG_POINTS) { return residuals(a, b, pts).reduce((s, e) => s + e, 0); }
export function sumXResiduals(a, b, pts = REG_POINTS) { return residuals(a, b, pts).reduce((s, e, i) => s + pts[i][0] * e, 0); }
export function dSSEda(a, b, pts = REG_POINTS) { return -2 * sumResiduals(a, b, pts); }
export function dSSEdb(a, b, pts = REG_POINTS) { return -2 * sumXResiduals(a, b, pts); }
export function leastSquares(pts = REG_POINTS) {
  const n = pts.length;
  const mx = pts.reduce((s, p) => s + p[0], 0) / n;
  const my = pts.reduce((s, p) => s + p[1], 0) / n;
  let sxy = 0; let sxx = 0;
  pts.forEach(([x, y]) => { sxy += (x - mx) * (y - my); sxx += (x - mx) ** 2; });
  const b = sxy / sxx;
  return { a: my - b * mx, b, meanX: mx, meanY: my };
}
/** Solve the normal equations directly (used to cross-check the closed form). */
export function solveNormalEquations(pts = REG_POINTS) {
  const n = pts.length;
  let sx = 0; let sy = 0; let sxx = 0; let sxy = 0;
  pts.forEach(([x, y]) => { sx += x; sy += y; sxx += x * x; sxy += x * y; });
  const det = n * sxx - sx * sx;
  return { a: (sy * sxx - sx * sxy) / det, b: (n * sxy - sx * sy) / det };
}

const MINUS = '−';
export function fmt(value, digits = 2) {
  if (!Number.isFinite(value)) return '—';
  const limit = 0.5 * 10 ** -digits;
  if (Math.abs(value) < limit) return (0).toFixed(digits);
  const text = Math.abs(value).toFixed(digits);
  return value < 0 ? MINUS + text : text;
}
