// StatPlay — module: chi-squared distribution panel (split from dist.js)
import { $, chi2PDF, resizeCanvas, drawGrid, neonLine, neonFill, themeColors, withAlpha, throttledDraw, chi2Pval, chi2CritVal, isEn, makeAxisMap } from '../utils.js';

// No-op marker so test_site.mjs bundle() can include this file via main.js
// import without triggering a duplicate panel init. The real entry is via
// initDist() in dist.js, which calls chi() once after DOM is ready.
export function __distChi2Loaded(){}

export function chi(){
  if(!document.getElementById('chiCanvas')) return;
  const dfS = $('chiDf');
  const rollsS = $('chiRolls');
  const dieSelect = $('chiDieType');
  const rollBtn = $('diceFair') || $('diceRandom');
  let diceObs = null;
  const hasDice = !!rollBtn;

  function rollDice(){
    const total = rollsS ? parseInt(rollsS.value) : 60;
    const loaded = dieSelect && dieSelect.value === 'loaded';
    const weights = [3, 1, 1, 1, 1, 1];
    const totalW = 8;
    diceObs = [0,0,0,0,0,0];
    for(let i = 0; i < total; i++){
      if(loaded){
        let r = Math.random() * totalW, cum = 0;
        for(let j = 0; j < 6; j++){ cum += weights[j]; if(r < cum){ diceObs[j]++; break; } }
      } else {
        diceObs[Math.floor(Math.random() * 6)]++;
      }
    }
    dfS.value = 5; $('chiVal').textContent = '5';
  }

  if(hasDice){
    rollDice();
  }

  const sched = throttledDraw(() => { draw(); if(hasDice){ drawBars(); updateChiInfo(); } });
  dfS.oninput = () => { $('chiVal').textContent = dfS.value; sched(); };
  if(rollsS) rollsS.oninput = () => {
    if($('chiRollsVal')) $('chiRollsVal').textContent = rollsS.value;
    rollDice(); sched();
  };
  if(rollBtn) rollBtn.onclick = () => { rollDice(); sched(); };

  function drawBars(){
    const bc = $('diceBarCanvas');
    if(!bc || !diceObs) return;
    const {ctx,w,h} = resizeCanvas(bc);
    if(!ctx) return;
    const tc = themeColors();    ctx.clearRect(0,0,w,h);
    drawGrid(ctx,w,h);

    const total = diceObs.reduce((a,b) => a+b, 0);
    if(total === 0) return;

    const expected = total / 6;
    const maxVal = Math.max(...diceObs, expected) * 1.25;
    const pad = {left: 40, right: 60, top: 18, bottom: 22};
    const chartW = w - pad.left - pad.right;
    const chartH = h - pad.top - pad.bottom;
    const barW = Math.min(36, chartW / 7.5);
    const gap = (chartW - barW * 6) / 7;

    const expY = pad.top + (1 - expected / maxVal) * chartH;
    ctx.strokeStyle = withAlpha(tc.yellow, 0.6);
    ctx.setLineDash([4, 3]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, expY);
    ctx.lineTo(pad.left + chartW, expY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = tc.yellow; ctx.font = '9px "Courier New"';
    ctx.textAlign = 'left';
    ctx.fillText(isEn() ? 'expected' : '期待値', pad.left + chartW + 4, expY + 3);

    for(let i = 0; i < 6; i++){
      const x = pad.left + gap + i * (barW + gap);
      const barH = (diceObs[i] / maxVal) * chartH;
      const y = pad.top + chartH - barH;
      const dev = Math.abs(diceObs[i] - expected) / expected;
      const color = dev > 0.4 ? tc.magenta : tc.cyan;
      ctx.fillStyle = withAlpha(color, 0.45);
      ctx.fillRect(x, y, barW, barH);
      ctx.strokeStyle = color; ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, barW, barH);
      ctx.fillStyle = color; ctx.font = 'bold 10px "Courier New"';
      ctx.textAlign = 'center';
      ctx.fillText(String(diceObs[i]), x + barW / 2, y - 4);
      ctx.fillStyle = tc.dim; ctx.font = '11px "Courier New"';
      ctx.fillText(String(i + 1), x + barW / 2, h - 6);
    }
    ctx.textAlign = 'start';
  }

  function draw(){
    const df=parseInt(dfS.value);
    const c = $('chiCanvas');
    const {ctx,w,h} = resizeCanvas(c);
    drawGrid(ctx,w,h);
    const tc = themeColors();    const xmax=Math.max(15, df*2.5);
    let peak=0;
    for(let x=0.02;x<=xmax;x+=xmax/300){const y=chi2PDF(x,df);if(y>peak)peak=y;}
    { const nSd = Math.sqrt(2 * df);
      const nPk = 1 / (nSd * Math.sqrt(2 * Math.PI));
      if(nPk > peak) peak = nPk; }
    if(peak===0)peak=1;
    const { xToPx, yToPx } = makeAxisMap({ w, h, lo: 0, hi: xmax, peak, marginTop: 20, marginBottom: 22 });
    ctx.strokeStyle=withAlpha(tc.cyan,.3);ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(0,h-22);ctx.lineTo(w,h-22);ctx.stroke();
    const pts=[];for(let px=0;px<=w;px++){const x=px/w*xmax;pts.push([px,yToPx(chi2PDF(x,df))]);}
    const baseY=h-22;const fill=[[0,baseY],...pts,[w,baseY]];neonFill(ctx,fill,tc.magenta,.18);
    neonLine(ctx,pts,tc.magenta,14,2.5);
    const meanX=xToPx(df);
    ctx.strokeStyle=withAlpha(tc.yellow,.75);ctx.setLineDash([3,3]);ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(meanX,10);ctx.lineTo(meanX,h-22);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle=tc.yellow;ctx.font='10px "Courier New"';
    ctx.fillText((isEn()?'mean = k = ':'平均 = k = ')+df, meanX+4, 14);
    if(df>2){
      const modeX=xToPx(df-2);
      ctx.strokeStyle=withAlpha(tc.cyan,.55);ctx.setLineDash([2,3]);
      ctx.beginPath();ctx.moveTo(modeX,10);ctx.lineTo(modeX,h-22);ctx.stroke();ctx.setLineDash([]);
      ctx.fillStyle=tc.cyan;
      ctx.fillText((isEn()?'mode = k−2':'最頻値 k−2'), modeX+4, 28);
    }
    const nMean=df, nVar=2*df, nSd=Math.sqrt(nVar);
    const nPts=[];for(let px=0;px<=w;px++){const x=px/w*xmax;const z=(x-nMean)/nSd;const y=Math.exp(-0.5*z*z)/(nSd*Math.sqrt(2*Math.PI));nPts.push([px,yToPx(y)]);}
    ctx.save();ctx.setLineDash([6,4]);
    neonLine(ctx,nPts,tc.purple,8,1.6);
    ctx.restore();
    ctx.fillStyle=tc.dim;ctx.font='10px "Courier New"';
    for(let t=0;t<=xmax;t+=Math.ceil(xmax/6)){ctx.fillText(String(t),xToPx(t)-4,h-8);}
    ctx.fillStyle=tc.magenta;ctx.fillText('χ²  (df='+df+')',8,14);
    ctx.fillStyle=tc.purple;ctx.fillText('┄ N(k, 2k)',8,28);
    ctx.fillStyle = tc.yellow;
    const conv = df >= 20 ? (isEn() ? ' ≈ normal' : ' ≈ 正規に近い') : (isEn() ? ' right-skewed' : ' 右に歪む');
    ctx.fillText(conv, 100, 14);

    if (diceObs) {
      const total = diceObs.reduce((a, b) => a + b, 0);
      if (total > 0) {
        const expected = total / 6;
        const chi2Stat = diceObs.reduce((s, o) => s + (o - expected) ** 2 / expected, 0);
        const pVal = chi2Pval(chi2Stat, 5);
        const critX = chi2CritVal(0.05, df);
        if (critX < xmax) {
          const rejPts = [];
          for (let px = Math.max(0, Math.floor(xToPx(critX))); px <= w; px++) {
            const rx = px / w * xmax;
            rejPts.push([px, yToPx(chi2PDF(rx, df))]);
          }
          if (rejPts.length > 1) {
            const baseY = h - 22;
            ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = tc.magenta;
            ctx.beginPath();
            ctx.moveTo(rejPts[0][0], baseY);
            rejPts.forEach(p => ctx.lineTo(p[0], p[1]));
            ctx.lineTo(w, baseY);
            ctx.closePath(); ctx.fill(); ctx.restore();
          }
          ctx.fillStyle = withAlpha(tc.magenta, 0.8); ctx.font = '9px "Courier New"';
          ctx.fillText('α=0.05', Math.min(xToPx(critX) + 2, w - 50), h - 26);
        }
        if (chi2Stat <= xmax) {
          const sx = xToPx(chi2Stat);
          ctx.strokeStyle = tc.yellow; ctx.lineWidth = 2.5; ctx.setLineDash([]);
          ctx.beginPath(); ctx.moveTo(sx, 40); ctx.lineTo(sx, h - 22); ctx.stroke();
          ctx.fillStyle = tc.yellow; ctx.font = '10px "Courier New"';
          ctx.fillText('χ²=' + chi2Stat.toFixed(2), sx + 4, 52);
        }
        const verdict = pVal < 0.05
          ? (isEn() ? 'Biased (p<0.05)' : '偏りあり (p<0.05)')
          : (isEn() ? 'Fair (within error)' : '偏りなし (誤差の範囲)');
        ctx.fillStyle = pVal < 0.05 ? tc.magenta : (tc.green || tc.cyan);
        ctx.font = 'bold 11px "Courier New"';
        ctx.fillText('χ²=' + chi2Stat.toFixed(2) + '  p=' + (pVal < 0.001 ? '<0.001' : pVal.toFixed(3)) + '  ' + verdict, 8, h - 32);
      }
    }
  }
  function updateChiInfo(){
    if(!diceObs) return;    const total = diceObs.reduce((a,b) => a+b, 0);
    const df = parseInt(dfS.value);
    const critX = chi2CritVal(0.05, 5);
    const eN = $('chiInfoN'); if(eN) eN.textContent = total;
    const eDf = $('chiInfoDf'); if(eDf) eDf.textContent = df;
    const eCrit = $('chiInfoCrit'); if(eCrit) eCrit.textContent = critX.toFixed(3);
    if(total > 0){
      const expected = total / 6;
      const chi2Stat = diceObs.reduce((s,o) => s + (o - expected)**2 / expected, 0);
      const pVal = chi2Pval(chi2Stat, 5);
      const eStat = $('chiInfoStat');
      if(eStat){
        eStat.textContent = chi2Stat.toFixed(3);
        eStat.style.color = chi2Stat > critX ? 'var(--magenta)' : 'var(--cyan)';
      }
      const eP = $('chiInfoP');
      if(eP){
        eP.textContent = pVal < 0.001 ? '<0.001' : pVal.toFixed(3);
        eP.style.color = pVal < 0.05 ? 'var(--magenta)' : '';
      }
      const eV = $('chiInfoVerdict');
      if(eV){
        const biased = pVal < 0.05;
        eV.textContent = biased
          ? (isEn() ? 'Biased (p<0.05)' : '偏りあり (p<0.05)')
          : (isEn() ? 'Fair (within error)' : '偏りなし (誤差の範囲)');
        eV.style.color = biased ? 'var(--magenta)' : 'var(--green, var(--cyan))';
      }
    }
  }

  draw();
  if(hasDice){ drawBars(); updateChiInfo(); }
}
