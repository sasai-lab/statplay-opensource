// StatPlay — module: F distribution panel (split from dist.js)
import { $, fPDF, resizeCanvas, drawGrid, neonLine, neonFill, themeColors, withAlpha, throttledDraw, fPval, fCritVal, isEn, makeAxisMap } from '../utils.js';

// No-op marker so test_site.mjs bundle() can include this file via main.js
// import without triggering a duplicate panel init. The real entry is via
// initDist() in dist.js, which calls fdist() once after DOM is ready.
export function __distFLoaded(){}

export function fdist(){
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
    const tc = themeColors();    let xmax = 4;
    const sA = parseInt(sdAS.value), sB = parseInt(sdBS.value);
    const fStat = Math.max(sA * sA, sB * sB) / Math.max(1, Math.min(sA * sA, sB * sB));
    if (fStat > 3.5) xmax = Math.min(20, Math.ceil(fStat * 1.5));
    let peak=0;
    for(let x=0.01;x<=xmax;x+=xmax/300){const y=fPDF(x,d1,d2);if(y>peak)peak=y;}
    if(d2>4){
      const nVar=(2*d2*d2*(d1+d2-2))/(d1*(d2-2)*(d2-2)*(d2-4));
      const nSd=Math.sqrt(nVar);
      const nPk=1/(nSd*Math.sqrt(2*Math.PI));
      if(nPk>peak) peak=nPk;
    }
    if(peak===0)peak=1;
    const { xToPx, yToPx } = makeAxisMap({ w, h, lo: 0, hi: xmax, peak, marginTop: 20, marginBottom: 22 });
    ctx.strokeStyle=withAlpha(tc.cyan,.3);ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(0,h-22);ctx.lineTo(w,h-22);ctx.stroke();
    const pts=[];for(let px=0;px<=w;px++){const x=px/w*xmax;pts.push([px,yToPx(fPDF(x,d1,d2))]);}
    const baseY=h-22;const fill=[[0,baseY],...pts,[w,baseY]];neonFill(ctx,fill,tc.yellow,.18);
    neonLine(ctx,pts,tc.yellow,14,2.5);
    if(d2>2){
      const mean=d2/(d2-2);
      const mX=xToPx(Math.min(mean,xmax));
      ctx.strokeStyle=withAlpha(tc.cyan,.7);ctx.setLineDash([3,3]);ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(mX,10);ctx.lineTo(mX,h-22);ctx.stroke();ctx.setLineDash([]);
      ctx.fillStyle=tc.cyan;ctx.font='10px "Courier New"';
      ctx.fillText((isEn()?'mean = ':'平均 = ')+mean.toFixed(2), mX+4, 14);
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
    ctx.fillStyle=tc.purple;ctx.fillText('┄ '+(isEn() ? 'normal approx' : '近似正規'),8,42);
    ctx.fillStyle = tc.yellow;
    const fconv = (d1 >= 20 && d2 >= 20) ? (isEn() ? ' ≈ normal' : ' ≈ 正規に近い') : (isEn() ? ' right-skewed' : ' 右に歪む');
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
        ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = tc.magenta;
        ctx.beginPath();
        ctx.moveTo(rejPts[0][0], baseY);
        rejPts.forEach(p => ctx.lineTo(p[0], p[1]));
        ctx.lineTo(w, baseY);
        ctx.closePath(); ctx.fill(); ctx.restore();
      }
      ctx.fillStyle = withAlpha(tc.magenta, 0.8); ctx.font = '9px "Courier New"';
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
      ? (isEn() ? 'Significantly different' : 'ばらつきに有意差あり')
      : (isEn() ? 'Similar spread' : 'ばらつきは同程度');
    ctx.fillStyle = pVal < 0.05 ? tc.magenta : (tc.green || tc.cyan);
    ctx.font = 'bold 11px "Courier New"';
    ctx.fillText('F=' + fStat.toFixed(2) + '  p=' + (pVal < 0.001 ? '<0.001' : pVal.toFixed(3)) + '  ' + verdict, 8, h - 32);
  }

  function drawGroupBars() {
    const c = $('fGroupCanvas');
    if (!c) return;
    const {ctx,w,h} = resizeCanvas(c);
    if (!ctx) return;
    const tc = themeColors();    const sA = parseInt(sdAS.value), sB = parseInt(sdBS.value);
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
    ctx.fillText(isEn() ? 'Group A:' : 'グループA:', cx - aLen / 2 - 6, gy1 + 13);
    ctx.textAlign = 'left';
    ctx.fillText('SD=' + sA, cx + aLen / 2 + 6, gy1 + 13);
    ctx.fillStyle = withAlpha(tc.magenta, 0.4);
    ctx.fillRect(cx - bLen / 2, gy2, bLen, gbH);
    ctx.strokeStyle = tc.magenta; ctx.lineWidth = 1.5;
    ctx.strokeRect(cx - bLen / 2, gy2, bLen, gbH);
    ctx.fillStyle = tc.magenta; ctx.font = '11px "Courier New"';
    ctx.textAlign = 'right';
    ctx.fillText(isEn() ? 'Group B:' : 'グループB:', cx - bLen / 2 - 6, gy2 + 13);
    ctx.textAlign = 'left';
    ctx.fillText('SD=' + sB, cx + bLen / 2 + 6, gy2 + 13);
    ctx.textAlign = 'start';
  }

  function updateInfo(){
    const sA = parseInt(sdAS.value), sB = parseInt(sdBS.value);
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
