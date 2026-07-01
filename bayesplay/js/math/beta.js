import { lgamma, regBetaI } from '../../../js/utils.js';

const EPS = 1e-9;

export function clamp01(x) {
  return Math.min(1 - EPS, Math.max(EPS, x));
}

export function logBeta(a, b) {
  return lgamma(a) + lgamma(b) - lgamma(a + b);
}

export function betaPdf(x, a, b) {
  const xx = clamp01(x);
  const logPdf = (a - 1) * Math.log(xx) + (b - 1) * Math.log(1 - xx) - logBeta(a, b);
  return Math.exp(logPdf);
}

export function betaMean(a, b) {
  return a / (a + b);
}

export function betaMode(a, b) {
  if (a <= 1 && b <= 1) return a >= b ? 1 : 0;
  if (a <= 1) return 0;
  if (b <= 1) return 1;
  return (a - 1) / (a + b - 2);
}

export function betaVariance(a, b) {
  const s = a + b;
  return (a * b) / (s * s * (s + 1));
}

export function betaCdf(x, a, b) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  return regBetaI(x, a, b);
}

export function betaQuantile(p, a, b) {
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 70; i += 1) {
    const mid = (lo + hi) / 2;
    if (betaCdf(mid, a, b) < p) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export function betaBinomialPmf(k, n, a, b) {
  if (k < 0 || k > n) return 0;
  const logChoose = lgamma(n + 1) - lgamma(k + 1) - lgamma(n - k + 1);
  const logP = logChoose + logBeta(k + a, n - k + b) - logBeta(a, b);
  return Math.exp(logP);
}

export function betaUpdate({ priorMean, priorStrength, successes, failures }) {
  const alpha = priorMean * priorStrength;
  const beta = (1 - priorMean) * priorStrength;
  const posteriorAlpha = alpha + successes;
  const posteriorBeta = beta + failures;
  return {
    alpha,
    beta,
    posteriorAlpha,
    posteriorBeta,
    totalObserved: successes + failures
  };
}

export function likelihoodShape(pValue, successes, failures) {
  if (successes === 0 && failures === 0) return 1;
  const t = clamp01(pValue);
  const phat = successes + failures === 0 ? 0.5 : successes / (successes + failures);
  const peakAt = clamp01(phat);
  const peak = successes * Math.log(peakAt) + failures * Math.log(1 - peakAt);
  const logLik = successes * Math.log(t) + failures * Math.log(1 - t);
  return Math.exp(logLik - peak);
}
