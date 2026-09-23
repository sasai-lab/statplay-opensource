import { normPDF } from '../../../js/utils.js';

// Include the peak and shoulders of every distribution, even when one SD is
// smaller than the overview grid spacing. Keep all curves on the same axes.
export function sampleNormalCurves(distributions) {
  const curves = Object.entries(distributions);
  const lo = Math.min(...curves.map(([, d]) => d.mean - 4 * d.sd));
  const hi = Math.max(...curves.map(([, d]) => d.mean + 4 * d.sd));
  const xs = new Set(Array.from({ length: 361 }, (_, i) => lo + (hi - lo) * i / 360));
  for (const [, d] of curves) {
    for (let i = -60; i <= 60; i++) {
      const x = d.mean + d.sd * i / 12;
      if (x >= lo && x <= hi) xs.add(x);
    }
  }
  const yMax = Math.max(...curves.map(([, d]) => normPDF(d.mean, d.mean, d.sd)));
  const values = [...xs].sort((a, b) => a - b).map(x => ({
    x, ...Object.fromEntries(curves.map(([key, d]) => [key, normPDF(x, d.mean, d.sd)]))
  }));
  return { lo, hi, yMax, values };
}
