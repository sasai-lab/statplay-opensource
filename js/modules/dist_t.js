// StatPlay — module: t distribution panel (split from dist.js)
import { $, normPDF, tPDF, resizeCanvas, drawGrid, neonLine, themeColors, withAlpha, throttledDraw, zCritical, tCrit, isEn, makeAxisMap } from '../utils.js';

// No-op marker so test_site.mjs bundle() can include this file via main.js
// import without triggering a duplicate panel init. The real entry is via
// initDist() in dist.js, which calls tdist() once after DOM is ready.
export function __distTLoaded(){}

export function tdist(){
  if(!document.getElementById('tDistCanvas')) return;
  const c = $('tDistCanvas');
  const nS = $('tN');
  if(!nS) return;
  const confRadios = document.querySelectorAll('input[name="tConf"]');
  const sched = throttledDraw(() => { draw(); drawCI(); });
  nS.oninput = () => {
    const n = parseInt(nS.value);
    $('tNVal').textContent = n;
    const dfEl = $('tdVal');
    if(dfEl) dfEl.textContent = n - 1;
    sched();
  };
  confRadios.forEach(r => { r.onchange = sched; });
  const dfEl = $('tdVal');
  if(dfEl) dfEl.textContent = parseInt(nS.value) - 1;

  function draw(){
    const n = parseInt(nS.value);
    const df = Math.max(1, n - 1);
    const {ctx,w,h} = resizeCanvas(c);
    drawGrid(ctx,w,h);
    const tc = themeColors();    const lo = -5, hi = 5;
    let peak = Math.max(tPDF(0, df), normPDF(0));
    const { xToPx, yToPx } = makeAxisMap({ w, h, lo, hi, peak, marginTop: 20, marginBottom: 22 });
    ctx.strokeStyle=withAlpha(tc.cyan,.3);ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(0,h-22);ctx.lineTo(w,h-22);ctx.stroke();
    ctx.fillStyle=tc.dim;ctx.font='10px "Courier New"';
    for(let x=-4;x<=4;x+=2){ctx.fillText(String(x),xToPx(x)-4,h-8);}
    const nPts=[];for(let px=0;px<=w;px++){const x=lo+px/w*(hi-lo);nPts.push([px,yToPx(normPDF(x))]);}
    neonLine(ctx,nPts,tc.purple,8,1.5);
    const tPts=[];for(let px=0;px<=w;px++){const x=lo+px/w*(hi-lo);tPts.push([px,yToPx(tPDF(x,df))]);}
    neonLine(ctx,tPts,tc.cyan,14,2.5);
    ctx.fillStyle=tc.cyan;ctx.font='10px "Courier New"';
    ctx.fillText('─ t  (df='+df+')',8,14);
    ctx.fillStyle=tc.purple;
    ctx.fillText('─ N(0,1)',8,28);
    ctx.fillStyle=tc.yellow;
    const conv = df>=30 ? ' ≈ N(0,1)' : (isEn()?' fatter tails':' 裾が重い');
    ctx.fillText(conv, 80, 14);
    if(df<20){
      const tY=tPDF(2.5,df),nY=normPDF(2.5);
      if(tY>nY*1.2){
        const ax=xToPx(2.5),ay=yToPx(tY);
        ctx.fillStyle=withAlpha(tc.cyan,.7);ctx.font='9px "Courier New"';
        ctx.fillText(isEn()?'↑ heavier tail':'↑ 裾が重い',ax+4,ay-4);
      }
    }
  }

  function drawCI(){
    const ciC = $('tCICanvas');
    if(!ciC) return;
    const {ctx,w,h} = resizeCanvas(ciC);
    if(!ctx) return;
    const tc = themeColors();    const n = parseInt(nS.value);
    const dfCI = Math.max(1, n - 1);
    let alpha = 0.05;
    confRadios.forEach(r => { if(r.checked) alpha = parseFloat(r.value); });
    const tC = tCrit(alpha, dfCI);
    const zC = zCritical(alpha);
    ctx.clearRect(0,0,w,h);
    const maxC = tC * 1.15;
    const barArea = Math.max(60, w - 200);
    const tLen = (tC / maxC) * barArea;
    const zLen = (zC / maxC) * barArea;
    const cx = 90 + barArea / 2;
    ctx.strokeStyle = withAlpha(tc.dim, 0.4);
    ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.moveTo(cx, 2); ctx.lineTo(cx, h - 4); ctx.stroke();
    ctx.setLineDash([]);
    const barH = 18, y1 = 6, y2 = y1 + barH + 6;
    ctx.fillStyle = withAlpha(tc.cyan, 0.5);
    ctx.fillRect(cx - tLen / 2, y1, tLen, barH);
    ctx.strokeStyle = tc.cyan; ctx.lineWidth = 1.5;
    ctx.strokeRect(cx - tLen / 2, y1, tLen, barH);
    ctx.fillStyle = tc.cyan; ctx.font = '11px "Courier New"';
    ctx.textAlign = 'right';
    ctx.fillText(isEn() ? 't-dist:' : 't分布:', cx - tLen / 2 - 6, y1 + 13);
    ctx.textAlign = 'left';
    ctx.fillText('±' + tC.toFixed(3), cx + tLen / 2 + 6, y1 + 13);
    ctx.fillStyle = withAlpha(tc.magenta, 0.5);
    ctx.fillRect(cx - zLen / 2, y2, zLen, barH);
    ctx.strokeStyle = tc.magenta; ctx.lineWidth = 1.5;
    ctx.strokeRect(cx - zLen / 2, y2, zLen, barH);
    ctx.fillStyle = tc.magenta; ctx.font = '11px "Courier New"';
    ctx.textAlign = 'right';
    ctx.fillText(isEn() ? 'Normal:' : '正規分布:', cx - zLen / 2 - 6, y2 + 13);
    ctx.textAlign = 'left';
    const warn = n < 30 ? (isEn() ? '  ⚠ Overconfident' : '  ⚠ 過信') : '';
    ctx.fillText('±' + zC.toFixed(3) + warn, cx + zLen / 2 + 6, y2 + 13);
    ctx.textAlign = 'start';

    const confPct = ((1 - alpha) * 100).toFixed(0);
    const ratio = tC / zC;
    const elN = $('tInfoN'); if(elN) elN.textContent = n;
    const elDf = $('tInfoDf'); if(elDf) elDf.textContent = dfCI;
    const elConf = $('tInfoConf'); if(elConf) elConf.textContent = confPct + '%';
    const elT = $('tInfoTCrit'); if(elT) elT.textContent = '±' + tC.toFixed(3);
    const elZ = $('tInfoZCrit'); if(elZ) elZ.textContent = '±' + zC.toFixed(3);
    const elRatio = $('tInfoRatio');
    if(elRatio){
      const pctWider = ((ratio - 1) * 100).toFixed(1);
      elRatio.textContent = ratio.toFixed(3) + (isEn() ? ' (' + pctWider + '% wider)' : ' (' + pctWider + '%広い)');
      elRatio.style.color = ratio > 1.05 ? 'var(--magenta)' : '';
    }
  }

  draw();
  drawCI();
}
