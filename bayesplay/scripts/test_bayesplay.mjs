import assert from 'node:assert/strict';
import {
  betaMean,
  betaQuantile,
  betaBinomialPmf,
  betaUpdate,
  likelihoodShape
} from '../js/math/beta.js';
import {
  pooledPosteriorMean,
  poolingStrengthFromSpread,
  weightedRate,
  withPooledMeans
} from '../js/math/pooling.js';

{
  const model = betaUpdate({
    priorMean: 0.5,
    priorStrength: 10,
    successes: 7,
    failures: 3
  });
  assert.equal(model.alpha, 5);
  assert.equal(model.beta, 5);
  assert.equal(model.posteriorAlpha, 12);
  assert.equal(model.posteriorBeta, 8);
  assert.equal(betaMean(model.posteriorAlpha, model.posteriorBeta), 0.6);
}

{
  const model = betaUpdate({
    priorMean: 0.2,
    priorStrength: 20,
    successes: 0,
    failures: 0
  });
  assert.equal(model.posteriorAlpha, 4);
  assert.equal(model.posteriorBeta, 16);
  assert.equal(betaMean(model.posteriorAlpha, model.posteriorBeta), 0.2);
}

{
  const low = betaQuantile(0.025, 12, 8);
  const high = betaQuantile(0.975, 12, 8);
  assert.ok(low > 0 && low < high && high < 1);
  assert.ok(low > 0.36 && low < 0.39);
  assert.ok(high > 0.79 && high < 0.82);
}

{
  const pmf = Array.from({ length: 21 }, (_, k) => betaBinomialPmf(k, 20, 12, 8));
  const total = pmf.reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(total - 1) < 1e-10);
}

{
  assert.equal(likelihoodShape(0.7, 7, 3), 1);
  assert.ok(likelihoodShape(0.2, 7, 3) < likelihoodShape(0.6, 7, 3));
}

{
  const weak = pooledPosteriorMean({
    overallMean: 0.5,
    priorStrength: 10,
    successes: 10,
    trials: 10
  });
  const strong = pooledPosteriorMean({
    overallMean: 0.5,
    priorStrength: 60,
    successes: 10,
    trials: 10
  });
  assert.ok(weak > strong);
  assert.ok(strong > 0.5);
}

{
  const groups = [
    { label: 'small', successes: 5, trials: 5 },
    { label: 'large', successes: 70, trials: 100 }
  ];
  assert.equal(weightedRate(groups), 75 / 105);
  const pooled = withPooledMeans(groups, 0.6, 20);
  const smallPull = Math.abs(pooled[0].observedRate - pooled[0].pooledRate);
  const largePull = Math.abs(pooled[1].observedRate - pooled[1].pooledRate);
  assert.ok(smallPull > largePull);
}

{
  assert.ok(poolingStrengthFromSpread(0.1) > poolingStrengthFromSpread(0.8));
}

console.log('BayesPlay math checks passed');
