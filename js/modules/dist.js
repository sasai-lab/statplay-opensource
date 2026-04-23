// StatPlay — module: 6) DISTS
import { $, normPDF, tPDF, chi2PDF, fPDF, resizeCanvas, drawGrid, neonLine, neonFill, themeColors, withAlpha, throttledDraw, lgamma, zCritical } from '../utils.js';

/* ─── CDF / p-value helpers (体験優先の近似実装) ─── */

function tCDF(x, df) {
  if (x <= -30) return 0;
  if (x >= 30) return 1;
  const N = 500, lo = -30, step = (x - lo) / N;
  let s = tPDF(lo, df) + tPDF(x, df);
  for (let i = 1; i < N; i++) s += (i & 1 ? 4 : 2) * tPDF(lo + i * step, df);
  return Math.max(0, Math.min(1, s * step / 3));
}

function tCrit(alpha, df) {
  let lo = 0, hi = 50;
  for (let i = 0; i < 60; i++) {
    const m = (lo + hi) / 2;
    if (2 * (1 - tCDF(m, df)) > alpha) lo = m; else hi = m;
  }
  return (lo + hi) / 2;
}

function regGammaP(a, x) {
  if (x <= 0) return 0;
  if (x < a + 1) {
    let s = 1 / a, t = 1 / a;
    for (let n = 1; n < 200; n++) {
      t *= x / (a + n); s += t;
      if (Math.abs(t) < 1e-10 * Math.abs(s)) break;
    }
    return Math.min(1, s * Math.exp(-x + a * Math.log(x) - lgamma(a)));
  }
  return 1 - regGammaQ(a, x);
}

function regGammaQ(a, x) {
  const TINY = 1e-30;
  let b0 = x + 1 - a, cf = 1 / TINY, df = 1 / b0, hh = df;
  for (let i = 1; i <= 200; i++) {
    const an = -i * (i - a); b0 += 2;
    df = b0 + an * df; if (Math.abs(df) < TINY) df = TINY; df = 1 / df;
    cf = b0 + an / cf; if (Math.abs(cf) < TINY) cf = TINY;
    hh *= df * cf;
    if (Math.abs(df * cf - 1) < 1e-10) break;
  }
  return Math.min(1, Math.max(0, hh * Math.exp(-x + a * Math.log(x) - lgamma(a))));
}

function chi2Pval(x, k) {
  if (x <= 0) return 1;
  return 1 - regGammaP(k / 2, x / 2);
}

function betaCF(x, a, b) {
  const TINY = 1e-30;
  const qab = a + b, qap = a + 1, qam = a - 1;
  let cc = 1, dd = 1 - qab * x / qap;
  if (Math.abs(dd) < TINY) dd = TINY;
  dd = 1 / dd; let hh = dd;
  for (let m = 1; m <= 200; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    dd = 1 + aa * dd; if (Math.abs(dd) < TINY) dd = TINY; dd = 1 / dd;
    cc = 1 + aa / cc; if (Math.abs(cc) < TINY) cc = TINY;
    hh *= dd * cc;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    dd = 1 + aa * dd; if (Math.abs(dd) < TINY) dd = TINY; dd = 1 / dd;
    cc = 1 + aa / cc; if (Math.abs(cc) < TINY) cc = TINY;
    hh *= dd * cc;
    if (Math.abs(dd * cc - 1) < 1e-10) break;
  }
  return hh;
}

function regBetaI(x, a, b) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  if (x < (a + 1) / (a + b + 2)) return bt * betaCF(x, a, b) / a;
  return 1 - bt * betaCF(1 - x, b, a) / b;
}

function fPval(x, d1, d2) {
  if (x <= 0) return 1;
  return 1 - regBetaI(d1 * x / (d1 * x + d2), d1 / 2, d2 / 2);
}

function chi2CritVal(alpha, k) {
  let lo = 0, hi = Math.max(60, k * 4);
  for (let i = 0; i < 60; i++) {
    const m = (lo + hi) / 2;
    if (chi2Pval(m, k) > alpha) lo = m; else hi = m;
  }
  return (lo + hi) / 2;
}

function fCritVal(alpha, d1, d2) {
  let lo = 0, hi = 40;
  for (let i = 0; i < 60; i++) {
    const m = (lo + hi) / 2;
    if (fPval(m, d1, d2) > alpha) lo = m; else hi = m;
  }
  return (lo + hi) / 2;
}

/* ═══════════════════════════════════════════ */
/*  t distribution                            */
/* ═══════════════════════════════════════════ */
function tdist(){
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
    const tc = themeColors();
    const isEn = window.__LANG==='en';
    const lo = -5, hi = 5;
    const xToPx = x => (x - lo) / (hi - lo) * w;
    let peak = Math.max(tPDF(0, df), normPDF(0));
    const yToPx = y => h - 22 - y / peak * (h - 42);
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
    const conv = df>=30 ? ' ≈ N(0,1)' : (isEn?' fatter tails':' 裾が重い');
    ctx.fillText(conv, 80, 14);
    if(df<20){
      const tY=tPDF(2.5,df),nY=normPDF(2.5);
      if(tY>nY*1.2){
        const ax=xToPx(2.5),ay=yToPx(tY);
        ctx.fillStyle=withAlpha(tc.cyan,.7);ctx.font='9px "Courier New"';
        ctx.fillText(isEn?'↑ heavier tail':'↑ 裾が重い',ax+4,ay-4);
      }
    }
  }

  function drawCI(){
    const ciC = $('tCICanvas');
    if(!ciC) return;
    const {ctx,w,h} = resizeCanvas(ciC);
    if(!ctx) return;
    const tc = themeColors();
    const isEn = window.__LANG==='en';
    const n = parseInt(nS.value);
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
    ctx.fillText(isEn ? 't-dist:' : 't分布:', cx - tLen / 2 - 6, y1 + 13);
    ctx.textAlign = 'left';
    ctx.fillText('±' + tC.toFixed(3), cx + tLen / 2 + 6, y1 + 13);
    ctx.fillStyle = withAlpha(tc.magenta, 0.5);
    ctx.fillRect(cx - zLen / 2, y2, zLen, barH);
    ctx.strokeStyle = tc.magenta; ctx.lineWidth = 1.5;
    ctx.strokeRect(cx - zLen / 2, y2, zLen, barH);
    ctx.fillStyle = tc.magenta; ctx.font = '11px "Courier New"';
    ctx.textAlign = 'right';
    ctx.fillText(isEn ? 'Normal:' : '正規分布:', cx - zLen / 2 - 6, y2 + 13);
    ctx.textAlign = 'left';
    const warn = n < 30 ? (isEn ? '  ⚠ Overconfident' : '  ⚠ 過信') : '';
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
      elRatio.textContent = ratio.toFixed(3) + (isEn ? ' (' + pctWider + '% wider)' : ' (' + pctWider + '%広い)');
      elRatio.style.color = ratio > 1.05 ? 'var(--magenta)' : '';
    }
  }

  draw();
  drawCI();
}

/* ═══════════════════════════════════════════ */
/*  χ² distribution                           */
/* ═══════════════════════════════════════════ */
function chi(){
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
    const tc = themeColors();
    const isEn = window.__LANG==='en';
    ctx.clearRect(0,0,w,h);
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
    ctx.fillText(isEn ? 'expected' : '期待値', pad.left + chartW + 4, expY + 3);

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
    const tc = themeColors();
    const isEn=window.__LANG==='en';
    const xmax=Math.max(15, df*2.5);
    const xToPx=x=>x/xmax*w;
    let peak=0;
    for(let x=0.02;x<=xmax;x+=xmax/300){const y=chi2PDF(x,df);if(y>peak)peak=y;}
    { const nSd = Math.sqrt(2 * df);
      const nPk = 1 / (nSd * Math.sqrt(2 * Math.PI));
      if(nPk > peak) peak = nPk; }
    if(peak===0)peak=1;
    const yToPx=y=>h-22-y/peak*(h-42);
    ctx.strokeStyle=withAlpha(tc.cyan,.3);ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(0,h-22);ctx.lineTo(w,h-22);ctx.stroke();
    const pts=[];for(let px=0;px<=w;px++){const x=px/w*xmax;pts.push([px,yToPx(chi2PDF(x,df))]);}
    const fill=[[0,h],...pts,[w,h]];neonFill(ctx,fill,tc.magenta,.18);
    neonLine(ctx,pts,tc.magenta,14,2.5);
    const meanX=xToPx(df);
    ctx.strokeStyle=withAlpha(tc.yellow,.75);ctx.setLineDash([3,3]);ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(meanX,10);ctx.lineTo(meanX,h-22);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle=tc.yellow;ctx.font='10px "Courier New"';
    ctx.fillText((isEn?'mean = k = ':'平均 = k = ')+df, meanX+4, 14);
    if(df>2){
      const modeX=xToPx(df-2);
      ctx.strokeStyle=withAlpha(tc.cyan,.55);ctx.setLineDash([2,3]);
      ctx.beginPath();ctx.moveTo(modeX,10);ctx.lineTo(modeX,h-22);ctx.stroke();ctx.setLineDash([]);
      ctx.fillStyle=tc.cyan;
      ctx.fillText((isEn?'mode = k−2':'最頻値 k−2'), modeX+4, 28);
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
    const conv = df >= 20 ? (isEn ? ' ≈ normal' : ' ≈ 正規に近い') : (isEn ? ' right-skewed' : ' 右に歪む');
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
            ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = '#ff4444';
            ctx.beginPath();
            ctx.moveTo(rejPts[0][0], baseY);
            rejPts.forEach(p => ctx.lineTo(p[0], p[1]));
            ctx.lineTo(w, baseY);
            ctx.closePath(); ctx.fill(); ctx.restore();
          }
          ctx.fillStyle = withAlpha('#ff4444', 0.8); ctx.font = '9px "Courier New"';
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
          ? (isEn ? 'Biased (p<0.05)' : '偏りあり (p<0.05)')
          : (isEn ? 'Fair (within error)' : '偏りなし (誤差の範囲)');
        ctx.fillStyle = pVal < 0.05 ? '#ff6666' : (tc.green || tc.cyan);
        ctx.font = 'bold 11px "Courier New"';
        ctx.fillText('χ²=' + chi2Stat.toFixed(2) + '  p=' + (pVal < 0.001 ? '<0.001' : pVal.toFixed(3)) + '  ' + verdict, 8, h - 32);
      }
    }
  }
  function updateChiInfo(){
    if(!diceObs) return;
    const isEn = window.__LANG==='en';
    const total = diceObs.reduce((a,b) => a+b, 0);
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
          ? (isEn ? 'Biased (p<0.05)' : '偏りあり (p<0.05)')
          : (isEn ? 'Fair (within error)' : '偏りなし (誤差の範囲)');
        eV.style.color = biased ? 'var(--magenta)' : 'var(--green, var(--cyan))';
      }
    }
  }

  draw();
  if(hasDice){ drawBars(); updateChiInfo(); }
}

/* ═══════════════════════════════════════════ */
/*  F distribution                            */
/* ═══════════════════════════════════════════ */
function fdist(){
  if(!document.getElementById('fCanvas')) return;
  const sdAS = $('fSdA'), sdBS = $('fSdB'), gnS = $('fGroupN');
  if(!sdAS || !sdBS || !gnS) return;

  function getDf(){
    return Math.min(30, Math.max(1, parseInt(gnS.value) - 1));
  }
  function updateDfLabel(){
    const el = $('fDfLabel');
    if(el) el.textContent = getDf();
  }
  updateDfLabel();

  const sched=throttledDraw(()=>{ draw(); drawGroupBars(); updateInfo(); });
  sdAS.oninput = () => { $('fSdAVal').textContent = sdAS.value; sched(); };
  sdBS.oninput = () => { $('fSdBVal').textContent = sdBS.value; sched(); };
  gnS.oninput = () => { $('fGroupNVal').textContent = gnS.value; updateDfLabel(); sched(); };

  function draw(){
    const d1 = getDf(), d2 = getDf();
    const c = $('fCanvas');
    const {ctx,w,h} = resizeCanvas(c);
    drawGrid(ctx,w,h);
    const tc = themeColors();
    const isEn=window.__LANG==='en';
    let xmax = 4;
    const sA = parseInt(sdAS.value), sB = parseInt(sdBS.value);
    const fStat = Math.max(sA * sA, sB * sB) / Math.max(1, Math.min(sA * sA, sB * sB));
    if (fStat > 3.5) xmax = Math.min(20, Math.ceil(fStat * 1.5));
    const xToPx = x => x / xmax * w;
    let peak=0;
    for(let x=0.01;x<=xmax;x+=xmax/300){const y=fPDF(x,d1,d2);if(y>peak)peak=y;}
    if(d2>4){
      const nVar=(2*d2*d2*(d1+d2-2))/(d1*(d2-2)*(d2-2)*(d2-4));
      const nSd=Math.sqrt(nVar);
      const nPk=1/(nSd*Math.sqrt(2*Math.PI));
      if(nPk>peak) peak=nPk;
    }
    if(peak===0)peak=1;
    const yToPx=y=>h-22-y/peak*(h-42);
    ctx.strokeStyle=withAlpha(tc.cyan,.3);ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(0,h-22);ctx.lineTo(w,h-22);ctx.stroke();
    const pts=[];for(let px=0;px<=w;px++){const x=px/w*xmax;pts.push([px,yToPx(fPDF(x,d1,d2))]);}
    const fill=[[0,h],...pts,[w,h]];neonFill(ctx,fill,tc.yellow,.18);
    neonLine(ctx,pts,tc.yellow,14,2.5);
    if(d2>2){
      const mean=d2/(d2-2);
      const mX=xToPx(Math.min(mean,xmax));
      ctx.strokeStyle=withAlpha(tc.cyan,.7);ctx.setLineDash([3,3]);ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(mX,10);ctx.lineTo(mX,h-22);ctx.stroke();ctx.setLineDash([]);
      ctx.fillStyle=tc.cyan;ctx.font='10px "Courier New"';
      ctx.fillText((isEn?'mean = ':'平均 = ')+mean.toFixed(2), mX+4, 14);
    }
    const oneX=xToPx(1);
    ctx.strokeStyle=withAlpha(tc.magenta,.5);ctx.setLineDash([2,3]);
    ctx.beginPath();ctx.moveTo(oneX,10);ctx.lineTo(oneX,h-22);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle=tc.magenta;ctx.font='10px "Courier New"';
    ctx.fillText('F=1', oneX+4, 28);
    if(d2>4){
      const nMean=d2/(d2-2);
      const nVar=(2*d2*d2*(d1+d2-2))/(d1*(d2-2)*(d2-2)*(d2-4));
      const nSd=Math.sqrt(nVar);
      const nPts=[];for(let px=0;px<=w;px++){const x=px/w*xmax;const z=(x-nMean)/nSd;const y=Math.exp(-0.5*z*z)/(nSd*Math.sqrt(2*Math.PI));nPts.push([px,yToPx(y)]);}
      ctx.save();ctx.setLineDash([6,4]);
      neonLine(ctx,nPts,tc.purple,8,1.6);
      ctx.restore();
    }
    ctx.fillStyle=tc.dim;ctx.font='10px "Courier New"';
    const tickStep = xmax <= 5 ? 1 : xmax <= 10 ? 2 : Math.ceil(xmax / 5);
    for(let t=0;t<=xmax;t+=tickStep){ctx.fillText(t.toFixed(0),xToPx(t)-4,h-8);}
    ctx.fillStyle=tc.yellow;ctx.fillText('F  ('+d1+', '+d2+')',8,14);
    ctx.fillStyle=tc.purple;ctx.fillText('┄ '+(isEn ? 'normal approx' : '近似正規'),8,42);
    ctx.fillStyle = tc.yellow;
    const fconv = (d1 >= 20 && d2 >= 20) ? (isEn ? ' ≈ normal' : ' ≈ 正規に近い') : (isEn ? ' right-skewed' : ' 右に歪む');
    ctx.fillText(fconv, 100, 14);

    const n = parseInt(gnS.value);
    const testD1 = n - 1, testD2 = n - 1;
    const pVal = Math.min(1, 2 * fPval(fStat, testD1, testD2));
    const critF = fCritVal(0.025, d1, d2);
    if (critF < xmax) {
      const rejPts = [];
      for (let px = Math.max(0, Math.floor(xToPx(critF))); px <= w; px++) {
        const rx = px / w * xmax;
        rejPts.push([px, yToPx(fPDF(rx, d1, d2))]);
      }
      if (rejPts.length > 1) {
        const baseY = h - 22;
        ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = '#ff4444';
        ctx.beginPath();
        ctx.moveTo(rejPts[0][0], baseY);
        rejPts.forEach(p => ctx.lineTo(p[0], p[1]));
        ctx.lineTo(w, baseY);
        ctx.closePath(); ctx.fill(); ctx.restore();
      }
      ctx.fillStyle = withAlpha('#ff4444', 0.8); ctx.font = '9px "Courier New"';
      ctx.fillText('α/2=0.025', Math.min(xToPx(critF) + 2, w - 60), h - 26);
    }
    if (fStat <= xmax) {
      const fx = xToPx(fStat);
      ctx.strokeStyle = tc.yellow; ctx.lineWidth = 2.5; ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(fx, 40); ctx.lineTo(fx, h - 22); ctx.stroke();
      ctx.fillStyle = tc.yellow; ctx.font = '10px "Courier New"';
      ctx.fillText('F=' + fStat.toFixed(2), fx + 4, 56);
    }
    const verdict = pVal < 0.05
      ? (isEn ? 'Significantly different' : 'ばらつきに有意差あり')
      : (isEn ? 'Similar spread' : 'ばらつきは同程度');
    ctx.fillStyle = pVal < 0.05 ? '#ff6666' : (tc.green || tc.cyan);
    ctx.font = 'bold 11px "Courier New"';
    ctx.fillText('F=' + fStat.toFixed(2) + '  p=' + (pVal < 0.001 ? '<0.001' : pVal.toFixed(3)) + '  ' + verdict, 8, h - 32);
  }

  function drawGroupBars() {
    const c = $('fGroupCanvas');
    if (!c) return;
    const {ctx,w,h} = resizeCanvas(c);
    if (!ctx) return;
    const tc = themeColors();
    const isEn = window.__LANG==='en';
    const sA = parseInt(sdAS.value), sB = parseInt(sdBS.value);
    ctx.clearRect(0, 0, w, h);
    const maxSD = Math.max(sA, sB, 1) * 1.3;
    const barArea = Math.max(60, w - 220);
    const cx = 110 + barArea / 2;
    const aLen = (sA / maxSD) * barArea;
    const bLen = (sB / maxSD) * barArea;
    ctx.strokeStyle = withAlpha(tc.dim, 0.4);
    ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.moveTo(cx, 2); ctx.lineTo(cx, h - 4); ctx.stroke();
    ctx.setLineDash([]);
    const gbH = 18, gy1 = 6, gy2 = gy1 + gbH + 6;
    ctx.fillStyle = withAlpha(tc.cyan, 0.4);
    ctx.fillRect(cx - aLen / 2, gy1, aLen, gbH);
    ctx.strokeStyle = tc.cyan; ctx.lineWidth = 1.5;
    ctx.strokeRect(cx - aLen / 2, gy1, aLen, gbH);
    ctx.fillStyle = tc.cyan; ctx.font = '11px "Courier New"';
    ctx.textAlign = 'right';
    ctx.fillText(isEn ? 'Group A:' : 'グループA:', cx - aLen / 2 - 6, gy1 + 13);
    ctx.textAlign = 'left';
    ctx.fillText('SD=' + sA, cx + aLen / 2 + 6, gy1 + 13);
    ctx.fillStyle = withAlpha(tc.magenta, 0.4);
    ctx.fillRect(cx - bLen / 2, gy2, bLen, gbH);
    ctx.strokeStyle = tc.magenta; ctx.lineWidth = 1.5;
    ctx.strokeRect(cx - bLen / 2, gy2, bLen, gbH);
    ctx.fillStyle = tc.magenta; ctx.font = '11px "Courier New"';
    ctx.textAlign = 'right';
    ctx.fillText(isEn ? 'Group B:' : 'グループB:', cx - bLen / 2 - 6, gy2 + 13);
    ctx.textAlign = 'left';
    ctx.fillText('SD=' + sB, cx + bLen / 2 + 6, gy2 + 13);
    ctx.textAlign = 'start';
  }

  function updateInfo(){
    const isEn = window.__LANG==='en';
    const sA = parseInt(sdAS.value), sB = parseInt(sdBS.value);
    const n = parseInt(gnS.value);
    const d1 = getDf(), d2 = getDf();
    const fStat = Math.max(sA*sA, sB*sB) / Math.max(1, Math.min(sA*sA, sB*sB));
    const pVal = Math.min(1, 2 * fPval(fStat, d1, d2));
    const critF = fCritVal(0.025, d1, d2);
    const el = (id) => $(id);
    const e1 = el('fInfoSdA'); if(e1) e1.textContent = sA;
    const e2 = el('fInfoSdB'); if(e2) e2.textContent = sB;
    const e3 = el('fInfoDf'); if(e3) e3.textContent = d1 + ', ' + d2;
    const e4 = el('fInfoF');
    if(e4){
      e4.textContent = fStat.toFixed(3);
      e4.style.color = fStat > critF ? 'var(--magenta)' : 'var(--yellow)';
    }
    const e5 = el('fInfoFCrit'); if(e5) e5.textContent = critF.toFixed(3);
    const e6 = el('fInfoP');
    if(e6){
      e6.textContent = pVal < 0.001 ? '<0.001' : pVal.toFixed(3);
      e6.style.color = pVal < 0.05 ? 'var(--magenta)' : '';
    }
  }

  draw();
  drawGroupBars();
  updateInfo();
}

export function initDist(){
  tdist();
  chi();
  fdist();
}
