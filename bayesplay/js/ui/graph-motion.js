export function revealProgress(progress) {
  const t = Math.min(1, Math.max(0, progress));
  return 1 - ((1 - t) ** 3);
}

export function lerp(a, b, progress) {
  return a + ((b - a) * progress);
}

export function interpolateNumberState(from, to, progress, keys) {
  const next = { ...to };
  keys.forEach((key) => {
    next[key] = lerp(Number(from[key] ?? to[key]), Number(to[key]), progress);
  });
  return next;
}

export function createStateAnimator({
  getTargetState,
  getVisualState,
  setVisualState,
  interpolateState,
  render,
  duration = 720
}) {
  let frameId = 0;
  let token = 0;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  return function animateState() {
    token += 1;
    const currentToken = token;
    if (frameId) cancelAnimationFrame(frameId);

    const from = getVisualState();
    const to = getTargetState();
    if (reducedMotion.matches) {
      setVisualState(to);
      render();
      return;
    }

    let start = 0;
    function step(ts) {
      if (currentToken !== token) return;
      if (!start) start = ts;
      const rawProgress = Math.min(1, (ts - start) / duration);
      const progress = revealProgress(rawProgress);
      setVisualState(interpolateState(from, to, progress));
      render();
      if (rawProgress < 1) {
        frameId = requestAnimationFrame(step);
      } else {
        setVisualState(to);
        render();
        frameId = 0;
      }
    }
    frameId = requestAnimationFrame(step);
  };
}

export function createGraphAnimator(render, { duration = 520 } = {}) {
  let frameId = 0;
  let token = 0;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  return function animateGraph() {
    token += 1;
    const currentToken = token;
    if (frameId) cancelAnimationFrame(frameId);
    if (reducedMotion.matches) {
      render(1);
      return;
    }

    let start = 0;
    function step(ts) {
      if (currentToken !== token) return;
      if (!start) start = ts;
      const progress = Math.min(1, (ts - start) / duration);
      render(revealProgress(progress));
      if (progress < 1) {
        frameId = requestAnimationFrame(step);
      } else {
        frameId = 0;
      }
    }
    frameId = requestAnimationFrame(step);
  };
}

export function withGraphReveal(ctx, bounds, progress, draw) {
  const p = revealProgress(progress);
  ctx.save();
  ctx.globalAlpha = 0.28 + (0.72 * p);
  ctx.beginPath();
  ctx.rect(
    bounds.left,
    bounds.top - 10,
    Math.max(1, bounds.width * p),
    bounds.height + 20
  );
  ctx.clip();
  draw(p);
  ctx.restore();
}
