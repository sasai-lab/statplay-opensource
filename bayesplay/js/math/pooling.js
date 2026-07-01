export function clampRate(value, min = 0.02, max = 0.98) {
  return Math.min(max, Math.max(min, value));
}

export function pooledPosteriorMean({ overallMean, priorStrength, successes, trials }) {
  if (trials <= 0) return clampRate(overallMean);
  return clampRate((overallMean * priorStrength + successes) / (priorStrength + trials));
}

export function weightedRate(groups) {
  const totals = groups.reduce((acc, group) => {
    acc.successes += group.successes;
    acc.trials += group.trials;
    return acc;
  }, { successes: 0, trials: 0 });
  return totals.trials > 0 ? totals.successes / totals.trials : 0.5;
}

export function poolingStrengthFromSpread(spread) {
  const t = Math.min(1, Math.max(0, spread));
  return 8 + ((1 - t) * 54);
}

export function withPooledMeans(groups, overallMean, priorStrength) {
  return groups.map(group => ({
    ...group,
    observedRate: group.trials > 0 ? group.successes / group.trials : 0,
    pooledRate: pooledPosteriorMean({
      overallMean,
      priorStrength,
      successes: group.successes,
      trials: group.trials
    })
  }));
}
