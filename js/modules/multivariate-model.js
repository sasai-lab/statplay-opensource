// Fixed synthetic teaching data and small, dependency-free calculations.
export const labels = ['味', '接客', '静かさ', '席の快適さ', '内装', '価格の納得感'];
export const mean = a => a.reduce((s, x) => s + x, 0) / a.length;
export const variance = a => { const m = mean(a); return a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1); };
export function makeData() {
  let state = 20260919;
  const random = () => { state = (Math.imul(1664525, state) + 1013904223) >>> 0; return (state + .5) / 4294967296; };
  const normal = () => Math.sqrt(-2 * Math.log(random())) * Math.cos(2 * Math.PI * random());
  const centers = [[1.4, -.9], [-.9, 1.4], [-.8, -.8]];
  return Array.from({ length: 90 }, (_, i) => {
    const [ca, cb] = centers[i % 3];
    const a = ca + .32 * normal(), b = cb + .32 * normal();
    const x = [.85 * a, .65 * a, .85 * b, .75 * b, .65 * b, .7 * a]
      .map(z => Math.max(5, Math.min(95, 60 + 15 * z + 3 * normal())));
    const coef = [.25, .15, .10, .15, .10, .10];
    return { id: i + 1, x, y: 10 + x.reduce((s, v, j) => s + v * coef[j], 0) + 2 * normal() };
  });
}
export function solve(matrix, rhs) {
  const a = matrix.map((row, i) => [...row, rhs[i]]), n = a.length;
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row;
    if (Math.abs(a[pivot][col]) < 1e-12) throw new Error('Singular design matrix');
    [a[col], a[pivot]] = [a[pivot], a[col]];
    const div = a[col][col];
    for (let j = col; j <= n; j++) a[col][j] /= div;
    for (let row = 0; row < n; row++) if (row !== col) {
      const scale = a[row][col];
      for (let j = col; j <= n; j++) a[row][j] -= scale * a[col][j];
    }
  }
  return a.map(row => row[n]);
}
export function fitRegression(data) {
  const means = labels.map((_, j) => mean(data.map(d => d.x[j]))), baseline = mean(data.map(d => d.y));
  const x = data.map(d => d.x.map((v, j) => v - means[j]));
  const gram = means.map((_, i) => means.map((__, j) => x.reduce((s, row) => s + row[i] * row[j], 0)));
  const rhs = means.map((_, j) => x.reduce((s, row, i) => s + row[j] * (data[i].y - baseline), 0));
  const coefficients = solve(gram, rhs);
  return { means, baseline, coefficients, predict: values => baseline + values.reduce((s, v, j) => s + (v - means[j]) * coefficients[j], 0) };
}
export function standardizePair(data, a, b) {
  const av = data.map(d => d.x[a]), bv = data.map(d => d.x[b]);
  const am = mean(av), bm = mean(bv), as = Math.sqrt(variance(av)), bs = Math.sqrt(variance(bv));
  return av.map((v, i) => [(v - am) / as, (bv[i] - bm) / bs]);
}
export function projection(points, angle) {
  const radians = angle * Math.PI / 180, u = [Math.cos(radians), Math.sin(radians)];
  const scores = points.map(p => p[0] * u[0] + p[1] * u[1]);
  const total = variance(points.map(p => p[0])) + variance(points.map(p => p[1]));
  return { u, scores, retained: variance(scores) / total };
}
export function principalAngle(points) {
  const a = points.map(p => p[0]), b = points.map(p => p[1]), am = mean(a), bm = mean(b);
  const cov = points.reduce((s, p) => s + (p[0] - am) * (p[1] - bm), 0) / (points.length - 1);
  return .5 * Math.atan2(2 * cov, variance(a) - variance(b)) * 180 / Math.PI;
}
const distance2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
export function cluster(points, k) {
  const centers = [[...points[0]]];
  while (centers.length < k) {
    let best = points[0], farthest = -1;
    for (const p of points) {
      const d = Math.min(...centers.map(c => distance2(p, c)));
      if (d > farthest) { best = p; farthest = d; }
    }
    centers.push([...best]);
  }
  const nearest = p => centers.map(c => distance2(p, c)).reduce((best, d, i, a) => d < a[best] ? i : best, 0);
  let groups = points.map(nearest);
  const history = [];
  const trace=[];
  const snapshot=stage=>trace.push({stage,centers:centers.map(c=>[...c]),groups:[...groups]});
  snapshot('assign');
  for (let round = 0; round < 100; round++) {
    for (let j = 0; j < k; j++) {
      const members = points.filter((_, i) => groups[i] === j);
      if (members.length) centers[j] = [mean(members.map(p => p[0])), mean(members.map(p => p[1]))];
    }
    snapshot('move');
    const next = points.map(nearest);
    history.push(points.reduce((s, p, i) => s + distance2(p, centers[next[i]]), 0));
    const stable = groups.every((g, i) => g === next[i]);
    groups = next;
    snapshot('assign');
    if (stable) break;
  }
  const order = centers.map((_, i) => i).sort((a, b) => centers[a][0] - centers[b][0]);
  return { centers: order.map(i => centers[i]), groups: groups.map(i => order.indexOf(i)), history,
    trace:trace.map(s=>({stage:s.stage,centers:order.map(i=>s.centers[i]),groups:s.groups.map(i=>order.indexOf(i))})) };
}
export function factorValues(f) { return [.85, .75, .65].map((loading, j) => 60 + 15 * loading * f + [-3, 4, -1][j]); }
