import { lgamma, regGammaP } from '../../../js/utils.js';

export function gammaPdf(x, shape, rate) {
  if (x <= 0 || shape <= 0 || rate <= 0) return 0;
  const logPdf = shape * Math.log(rate) + (shape - 1) * Math.log(x) - rate * x - lgamma(shape);
  return Math.exp(logPdf);
}

export function gammaCdf(x, shape, rate) {
  if (x <= 0) return 0;
  return regGammaP(shape, rate * x);
}

export function gammaQuantile(p, shape, rate) {
  if (p <= 0) return 0;
  if (p >= 1) return Number.POSITIVE_INFINITY;
  let lo = 0;
  let hi = Math.max(1, shape / rate + 8 * Math.sqrt(shape) / rate);
  while (gammaCdf(hi, shape, rate) < p) hi *= 2;
  for (let i = 0; i < 70; i += 1) {
    const mid = (lo + hi) / 2;
    if (gammaCdf(mid, shape, rate) < p) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export function gammaPoissonUpdate({ priorMean, priorStrength, events, exposure }) {
  const priorShape = priorMean * priorStrength;
  const priorRate = priorStrength;
  const posteriorShape = priorShape + events;
  const posteriorRate = priorRate + exposure;
  return {
    priorShape,
    priorRate,
    posteriorShape,
    posteriorRate,
    priorMean: priorShape / priorRate,
    posteriorMean: posteriorShape / posteriorRate
  };
}
