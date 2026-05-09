// StatPlay — module: chitest shared helpers (split from chitest.js)
import { $, chi2PDF, neonLine, neonFill, withAlpha, makeAxisMap } from '../utils.js';

// No-op marker so test_site.mjs bundle() can include this file via main.js
// import. The real entry is via initChitest() in chitest.js.
export function __chitestCommonLoaded(){}

// Click feedback animation queue (shared between gof and independence panels)
export function createClickFxQueue(){
  const queue = [];
  function spawn(x, y, delta, tc){
    queue.push({
      x, y,
      text: (delta > 0 ? '+' : '') + delta,
      t: 0,
      color: delta > 0 ? tc.green : tc.magenta,
    });
  }
  function tickAndDraw(ctx /* , tc */){
    for(let i = queue.length - 1; i >= 0; i--){
      const fx = queue[i];
      fx.t += 1;
      const progress = fx.t / 18;
      if(progress >= 1){ queue.splice(i, 1); continue; }
      const alpha = 1 - progress;
      const rise = progress * 24;
      const scale = 1 + progress * 0.4;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = fx.color;
      ctx.font = `bold ${Math.round(14 * scale)}px "Courier New"`;
      ctx.fillText(fx.text, fx.x - 8, fx.y - rise);
      ctx.strokeStyle = fx.color;
      ctx.lineWidth = 2 * (1 - progress);
      ctx.beginPath();
      ctx.arc(fx.x, fx.y, 6 + progress * 20, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    return queue.length > 0;
  }
  return { queue, spawn, tickAndDraw };
}

// Shared χ² distribution curve renderer (right-side panel of both gof and independence)
export function drawChi2Curve(ctx, w, h, tc, alpha, chiSq, df, critVal, pval, reject, midX, isEn){
  const rp = { x: midX + 10, y: 20, w: w - midX - 20, h: h - 50 };

  ctx.fillStyle = tc.text; ctx.font = 'bold 11px "Courier New"';
  ctx.fillText('χ² ' + (isEn() ? '(df=' + df + ')' : '分布 (df=' + df + ')'), rp.x, 14);

  const xMax = Math.max(df * 3 + 2, critVal * 1.8, chiSq * 1.5, 8);

  let peakY = 0;
  for(let x = 0.05; x <= xMax; x += xMax / 300){
    const v = chi2PDF(x, df); if(v > peakY) peakY = v;
  }
  if(peakY === 0) peakY = 1;
  // rp = {x: midX+10, y: 20, w: w-midX-20, h: h-50}, with a 10px top gutter
  // inside the panel so the curve never grazes the top edge. Translate that
  // to makeAxisMap margins: marginLeft = midX+10, marginRight = 10,
  // marginTop = rp.y + 10 = 30, marginBottom = h - (rp.y + rp.h) = 30.
  // clampY mirrors the original `Math.min(y, peakY)` guard for χ² values
  // that overshoot the coarsely-sampled peak.
  const { xToPx, yToPx } = makeAxisMap({
    w, h, lo: 0, hi: xMax, peak: peakY,
    marginLeft: midX + 10, marginRight: 10,
    marginTop: 30, marginBottom: 30,
    clampY: true
  });

  ctx.strokeStyle = withAlpha(tc.cyan, .25); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(rp.x, rp.y + rp.h); ctx.lineTo(rp.x + rp.w, rp.y + rp.h); ctx.stroke();

  const rejPts = [[xToPx(critVal), rp.y + rp.h]];
  for(let x = critVal; x <= xMax; x += xMax / 300) rejPts.push([xToPx(x), yToPx(chi2PDF(x, df))]);
  rejPts.push([xToPx(xMax), rp.y + rp.h]);
  neonFill(ctx, rejPts, tc.magenta, .35);

  const curve = [];
  for(let x = 0.02; x <= xMax; x += xMax / 400) curve.push([xToPx(x), yToPx(chi2PDF(x, df))]);
  neonLine(ctx, curve, tc.cyan, 12, 2);

  ctx.strokeStyle = withAlpha(tc.yellow, .8); ctx.setLineDash([4, 4]); ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(xToPx(critVal), rp.y); ctx.lineTo(xToPx(critVal), rp.y + rp.h); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = tc.yellow; ctx.font = '9px "Courier New"';
  ctx.fillText('c=' + critVal.toFixed(2), xToPx(critVal) + 3, rp.y + 12);
  ctx.fillStyle = tc.magenta;
  ctx.fillText('α=' + alpha.toFixed(2), xToPx(critVal) + 3, rp.y + 24);
  ctx.fillStyle = withAlpha(tc.magenta, .8); ctx.font = 'bold 9px "Courier New"';
  const rejText = isEn() ? 'Reject H₀' : '棄却域';
  ctx.fillText(rejText, Math.min(xToPx(critVal) + 40, rp.x + rp.w - 60), rp.y + 38);

  const statColor = reject ? tc.magenta : tc.green;
  ctx.strokeStyle = statColor; ctx.lineWidth = tc.light ? 2.5 : 2;
  ctx.shadowBlur = tc.light ? 2 : reject ? 16 : 10; ctx.shadowColor = statColor;
  ctx.beginPath(); ctx.moveTo(xToPx(chiSq), rp.y + 4); ctx.lineTo(xToPx(chiSq), rp.y + rp.h); ctx.stroke();
  ctx.shadowBlur = 0;

  if(reject){
    ctx.shadowBlur = 20; ctx.shadowColor = tc.magenta;
    ctx.strokeStyle = withAlpha(tc.magenta, .6); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(xToPx(chiSq), rp.y + 4); ctx.lineTo(xToPx(chiSq), rp.y + rp.h); ctx.stroke();
    ctx.shadowBlur = 0;
  }

  ctx.fillStyle = statColor; ctx.font = 'bold 10px "Courier New"';
  const chiLabel = 'χ²=' + chiSq.toFixed(2);
  const labelX = chiSq > xMax * 0.7 ? xToPx(chiSq) - ctx.measureText(chiLabel).width - 6 : xToPx(chiSq) + 4;
  ctx.fillText(chiLabel, labelX, rp.y + rp.h - 6);

  ctx.fillStyle = tc.orange; ctx.font = 'bold 10px "Courier New"';
  const pLabel = 'p=' + (pval < 0.0001 ? pval.toExponential(1) : pval.toFixed(4));
  ctx.fillText(pLabel, rp.x + rp.w - ctx.measureText(pLabel).width - 4, rp.y + rp.h - 6);

  ctx.fillStyle = tc.dim; ctx.font = '10px "Courier New"';
  const nTicks = Math.min(8, Math.ceil(xMax));
  const tickStep = Math.ceil(xMax / nTicks);
  for(let x = 0; x <= xMax; x += tickStep) ctx.fillText(x.toFixed(0), xToPx(x) - 4, rp.y + rp.h + 14);
}

// Shared info panel updater (gof/ind both write to elements like gofStat/indStat)
export function updateInfo(chiSq, df, pval, reject, alpha, isEn, prefix){
  const elStat = $(prefix + 'Stat'), elDf = $(prefix + 'Df'), elP = $(prefix + 'P'), elResult = $(prefix + 'Result');
  if(elStat) elStat.textContent = chiSq.toFixed(4);
  if(elDf) elDf.textContent = df.toString();
  if(elP){
    elP.textContent = pval < 0.0001 ? pval.toExponential(2) : pval.toFixed(4);
    elP.style.color = pval < alpha ? 'var(--magenta)' : 'var(--cyan)';
  }
  if(elResult){
    elResult.textContent = isEn()
      ? (reject ? 'Reject H₀' : 'Fail to reject H₀')
      : (reject ? 'H₀ 棄却' : 'H₀ 採択');
    elResult.style.color = reject ? 'var(--magenta)' : 'var(--cyan)';
  }
}
