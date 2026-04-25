// StatPlay — module: Interactive Distribution Tables
import { $, normCDF, normPDF, tPDF, chi2PDF, fPDF, lgamma,
         resizeCanvas, drawGrid, neonLine, neonFill, themeColors,
         withAlpha, throttledDraw } from '../utils.js';

/* ─── CDF / critical-value helpers ─── */

function tCDF(x, df) {
  if (df > 1e6) return normCDF(x);
  if (x <= -30) return 0;
  if (x >= 30) return 1;
  const N = 500, lo = -30, step = (x - lo) / N;
  let s = tPDF(lo, df) + tPDF(x, df);
  for (let i = 1; i < N; i++) s += (i & 1 ? 4 : 2) * tPDF(lo + i * step, df);
  return Math.max(0, Math.min(1, s * step / 3));
}

function tCritOne(alpha, df) {
  if (df > 1e6) {
    let lo = 0, hi = 8;
    for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (1 - normCDF(m) > alpha) lo = m; else hi = m; }
    return (lo + hi) / 2;
  }
  let lo = 0, hi = 100;
  for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (1 - tCDF(m, df) > alpha) lo = m; else hi = m; }
  return (lo + hi) / 2;
}

function regGammaP(a, x) {
  if (x <= 0) return 0;
  if (x < a + 1) {
    let s = 1 / a, t = 1 / a;
    for (let n = 1; n < 200; n++) { t *= x / (a + n); s += t; if (Math.abs(t) < 1e-10 * Math.abs(s)) break; }
    return Math.min(1, s * Math.exp(-x + a * Math.log(x) - lgamma(a)));
  }
  return 1 - regGammaQ(a, x);
}
function regGammaQ(a, x) {
  const TINY = 1e-30;
  let b0 = x + 1 - a, cf = 1 / TINY, d = 1 / b0, hh = d;
  for (let i = 1; i <= 200; i++) {
    const an = -i * (i - a); b0 += 2;
    d = b0 + an * d; if (Math.abs(d) < TINY) d = TINY; d = 1 / d;
    cf = b0 + an / cf; if (Math.abs(cf) < TINY) cf = TINY;
    hh *= d * cf; if (Math.abs(d * cf - 1) < 1e-10) break;
  }
  return Math.min(1, Math.max(0, hh * Math.exp(-x + a * Math.log(x) - lgamma(a))));
}
function chi2Pval(x, k) { return x <= 0 ? 1 : 1 - regGammaP(k / 2, x / 2); }
function chi2Crit(alpha, k) {
  let lo = 0, hi = Math.max(60, k * 4);
  for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (chi2Pval(m, k) > alpha) lo = m; else hi = m; }
  return (lo + hi) / 2;
}

function betaCF(x, a, b) {
  const TINY = 1e-30, qab = a + b, qap = a + 1, qam = a - 1;
  let cc = 1, dd = 1 - qab * x / qap;
  if (Math.abs(dd) < TINY) dd = TINY; dd = 1 / dd; let hh = dd;
  for (let m = 1; m <= 200; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    dd = 1 + aa * dd; if (Math.abs(dd) < TINY) dd = TINY; dd = 1 / dd;
    cc = 1 + aa / cc; if (Math.abs(cc) < TINY) cc = TINY; hh *= dd * cc;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    dd = 1 + aa * dd; if (Math.abs(dd) < TINY) dd = TINY; dd = 1 / dd;
    cc = 1 + aa / cc; if (Math.abs(cc) < TINY) cc = TINY; hh *= dd * cc;
    if (Math.abs(dd * cc - 1) < 1e-10) break;
  }
  return hh;
}
function regBetaI(x, a, b) {
  if (x <= 0) return 0; if (x >= 1) return 1;
  const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? bt * betaCF(x, a, b) / a : 1 - bt * betaCF(1 - x, b, a) / b;
}
function fPval(x, d1, d2) { return x <= 0 ? 1 : 1 - regBetaI(d1 * x / (d1 * x + d2), d1 / 2, d2 / 2); }
function fCrit(alpha, d1, d2) {
  let lo = 0, hi = 100;
  for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (fPval(m, d1, d2) > alpha) lo = m; else hi = m; }
  return (lo + hi) / 2;
}

/* ─── Constants ─── */
const ALPHAS = [0.10, 0.05, 0.025, 0.01, 0.005];
const T_DFS = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,25,30,40,60,120,Infinity];
const CHI2_DFS = Array.from({length: 30}, (_, i) => i + 1);
const F_D1 = [1,2,3,4,5,6,8,10,12,15,20,30];
const F_D2 = [1,2,3,4,5,6,7,8,9,10,12,15,20,24,30,40,60,120];

const S = {
  tab: 'norm',
  norm: { z: 1.96, mode: 'lower' },
  t: { df: 10, alpha: 0.05, side: 'two' },
  chi2: { df: 5, alpha: 0.05 },
  f: { df1: 3, df2: 10, alpha: 0.05 }
};
let _initializing = true;
const isEn = () => window.__LANG === 'en';

/* ─── Toast + Copy ─── */
let _tEl, _tT;
function toast(msg) {
  if (!_tEl) {
    _tEl = document.createElement('div');
    _tEl.style.cssText = 'position:fixed;left:50%;bottom:28px;transform:translateX(-50%) translateY(20px);background:rgba(0,8,20,.92);color:#d8f7ff;border:1px solid rgba(0,243,255,.45);padding:10px 18px;font-family:"Courier New",monospace;font-size:13px;opacity:0;transition:.3s;z-index:10000;pointer-events:none';
    document.body.appendChild(_tEl);
  }
  _tEl.textContent = msg; _tEl.style.opacity = '1'; _tEl.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(_tT);
  _tT = setTimeout(() => { _tEl.style.opacity = '0'; _tEl.style.transform = 'translateX(-50%) translateY(20px)'; }, 2200);
}
async function clip(text) {
  try { if (navigator.clipboard) { await navigator.clipboard.writeText(text); return true; } } catch (_) {}
  try { const ta = document.createElement('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;left:-9999px'; document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); document.body.removeChild(ta); return ok; } catch (_) { return false; }
}

/* ─── Sidebar ─── */
function initSidebar() {
  const sb = $('dtSidebar'), toggle = $('sidebarToggle'), close = $('sidebarClose'), bd = $('dtBackdrop');
  if (!sb) return;
  const shut = () => { sb.classList.remove('open'); bd?.classList.remove('show'); };
  toggle?.addEventListener('click', () => { sb.classList.add('open'); bd?.classList.add('show'); });
  close?.addEventListener('click', shut);
  bd?.addEventListener('click', shut);
}
function syncSections() {
  document.querySelectorAll('[data-for]').forEach(s => s.classList.toggle('active', s.dataset.for === S.tab));
}

/* ─── Tabs ─── */
function initTabs() {
  document.querySelectorAll('.dt-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      S.tab = btn.dataset.tab;
      document.querySelectorAll('.dt-tab').forEach(b => b.classList.toggle('active', b === btn));
      document.querySelectorAll('.dt-pane').forEach(p => p.classList.toggle('active', p.id === 'pane-' + S.tab));
      syncSections();
      writeURL();
      window.dispatchEvent(new Event('resize'));
    });
  });
}

/* ════════════════════════════════════════════════ */
/*  Tab 1 — Standard Normal Distribution Table    */
/* ════════════════════════════════════════════════ */
function initNormTab() {
  const cv = $('normCanvas'), zIn = $('normZ'), tbl = $('normTable'), zText = $('normZText');
  if (!cv || !tbl) return;
  let hZ = null;

  zIn.value = S.norm.z.toFixed(2);
  if (zText) zText.value = S.norm.z.toFixed(2);
  const mr = document.querySelector(`input[name="normMode"][value="${S.norm.mode}"]`);
  if (mr) mr.checked = true;

  const sched = throttledDraw(draw);

  function getP(z) {
    if (S.norm.mode === 'upper') return 1 - normCDF(z);
    if (S.norm.mode === 'twosided') return 2 * normCDF(z) - 1;
    return normCDF(z);
  }

  // Build table
  const thead = tbl.createTHead(), hr = thead.insertRow();
  hr.insertCell().outerHTML = '<th>z</th>';
  for (let c = 0; c <= 9; c++) hr.insertCell().outerHTML = '<th>.0' + c + '</th>';
  const tbody = tbl.createTBody();
  for (let r = 0; r <= 34; r++) {
    const z1 = r / 10, tr = tbody.insertRow();
    tr.insertCell().outerHTML = '<th>' + z1.toFixed(1) + '</th>';
    for (let c = 0; c <= 9; c++) {
      const z = +(z1 + c / 100).toFixed(2);
      const td = tr.insertCell();
      td.dataset.z = z.toFixed(2);
      td.textContent = getP(z).toFixed(4);
      td.addEventListener('click', () => pick(z));
      td.addEventListener('mouseenter', () => { hZ = z; sched(); info(); });
    }
  }
  tbl.addEventListener('mouseleave', () => { hZ = null; sched(); info(); });

  function pick(z) { S.norm.z = z; zIn.value = z.toFixed(2); if (zText) zText.value = z.toFixed(2); hl(); sched(); info(); writeURL(); }
  function hl() {
    tbl.querySelectorAll('td.selected').forEach(t => t.classList.remove('selected'));
    const td = tbl.querySelector('td[data-z="' + S.norm.z.toFixed(2) + '"]');
    if (td) { td.classList.add('selected'); if (!_initializing) td.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
  }
  function info() {
    const z = hZ ?? S.norm.z, p = getP(z);
    const lbl = S.norm.mode === 'upper' ? 'P(Z ≥ z)' : S.norm.mode === 'twosided' ? 'P(|Z| ≤ z)' : 'P(Z ≤ z)';
    const el = $('normSelInfo');
    if (el) el.innerHTML = '<span>z = <b>' + z.toFixed(2) + '</b></span><span>' + lbl + ' = <b>' + p.toFixed(4) + '</b></span>';
  }
  function rebuildVals() { tbl.querySelectorAll('tbody td').forEach(td => { td.textContent = getP(parseFloat(td.dataset.z)).toFixed(4); }); }

  function draw() {
    const { ctx, w, h } = resizeCanvas(cv);
    if (!ctx) return;
    const tc = themeColors(); drawGrid(ctx, w, h);
    const lo = -4, hi = 4, pk = normPDF(0), mt = 30, mb = 22, baseY = h - mb;
    const xP = x => (x - lo) / (hi - lo) * w;
    const yP = y => mt + (1 - y / pk) * (h - mt - mb);

    ctx.strokeStyle = withAlpha(tc.cyan, .3); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, baseY); ctx.lineTo(w, baseY); ctx.stroke();
    ctx.fillStyle = tc.dim; ctx.font = '10px "Courier New"'; ctx.textAlign = 'center';
    for (let x = -4; x <= 4; x++) ctx.fillText(String(x), xP(x), h - 8);
    ctx.textAlign = 'start';

    const pts = [];
    for (let px = 0; px <= w; px++) { const x = lo + px / w * (hi - lo); pts.push([px, yP(normPDF(x))]); }

    const z = hZ ?? S.norm.z, mode = S.norm.mode;
    if (mode === 'lower') {
      const fp = [[xP(lo), baseY]];
      for (let px = 0; px <= w; px++) { const x = lo + px / w * (hi - lo); if (x <= z) fp.push([px, yP(normPDF(x))]); }
      fp.push([xP(Math.min(z, hi)), baseY]);
      neonFill(ctx, fp, tc.cyan, .25);
    } else if (mode === 'upper') {
      const fp = [[xP(Math.max(z, lo)), baseY]];
      for (let px = 0; px <= w; px++) { const x = lo + px / w * (hi - lo); if (x >= z) fp.push([px, yP(normPDF(x))]); }
      fp.push([xP(hi), baseY]);
      neonFill(ctx, fp, tc.cyan, .25);
    } else {
      const fp = [[xP(-z), baseY]];
      for (let px = 0; px <= w; px++) { const x = lo + px / w * (hi - lo); if (x >= -z && x <= z) fp.push([px, yP(normPDF(x))]); }
      fp.push([xP(z), baseY]);
      neonFill(ctx, fp, tc.cyan, .25);
    }

    neonLine(ctx, pts, tc.cyan, 14, 2.5);
    ctx.strokeStyle = tc.yellow; ctx.lineWidth = 2; ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(xP(z), mt); ctx.lineTo(xP(z), baseY); ctx.stroke();
    if (mode === 'twosided') { ctx.beginPath(); ctx.moveTo(xP(-z), mt); ctx.lineTo(xP(-z), baseY); ctx.stroke(); }

    const p = getP(z), lbl = mode === 'upper' ? 'P(Z≥z)' : mode === 'twosided' ? 'P(|Z|≤z)' : 'P(Z≤z)';
    ctx.fillStyle = tc.text; ctx.font = 'bold 12px "Courier New"'; ctx.textAlign = 'right';
    ctx.fillText('z = ' + z.toFixed(2), w - 10, 16);
    ctx.fillText(lbl + ' = ' + p.toFixed(4), w - 10, 30);
    ctx.textAlign = 'start';
  }

  zIn.addEventListener('input', () => {
    const v = parseFloat(zIn.value);
    if (!isNaN(v) && v >= 0 && v <= 3.49) { S.norm.z = Math.round(v * 100) / 100; if (zText) zText.value = S.norm.z.toFixed(2); hl(); sched(); info(); writeURL(); }
  });
  if (zText) zText.addEventListener('input', () => {
    const v = parseFloat(zText.value);
    if (!isNaN(v) && v >= 0 && v <= 3.49) { S.norm.z = Math.round(v * 100) / 100; zIn.value = S.norm.z.toFixed(2); hl(); sched(); info(); writeURL(); }
  });
  document.querySelectorAll('input[name="normMode"]').forEach(r => r.addEventListener('change', () => {
    S.norm.mode = r.value; rebuildVals(); hl(); sched(); info();
  }));
  $('normCopy')?.addEventListener('click', async () => {
    const ok = await clip('z = ' + S.norm.z.toFixed(2) + ', P = ' + getP(S.norm.z).toFixed(4));
    toast(ok ? (isEn() ? 'Copied!' : 'コピーしました') : (isEn() ? 'Copy failed' : 'コピー失敗'));
  });

  document.querySelectorAll('.dt-quick-btn').forEach(btn => {
    btn.addEventListener('click', () => pick(parseFloat(btn.dataset.z)));
  });

  const invIn = $('inverseP'), invRes = $('inverseResult'), invPVal = $('inversePVal');
  if (invIn) {
    const calcInverse = () => {
      const p = parseFloat(invIn.value);
      if (invPVal) invPVal.textContent = p.toFixed(3);
      if (isNaN(p) || p <= 0 || p >= 1) { if (invRes) invRes.textContent = '—'; return; }
      let target = p;
      if (S.norm.mode === 'upper') target = 1 - p;
      else if (S.norm.mode === 'twosided') target = (1 + p) / 2;
      let lo = -4, hi = 4;
      for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (normCDF(m) < target) lo = m; else hi = m; }
      const z = Math.round((lo + hi) / 2 * 100) / 100;
      if (invRes) invRes.textContent = 'z = ' + z.toFixed(2) + (isEn() ? '  (click to apply)' : '  (クリックで適用)');
    };
    invIn.addEventListener('input', calcInverse);
    document.querySelectorAll('input[name="normMode"]').forEach(r => r.addEventListener('change', calcInverse));
    if (invRes) invRes.addEventListener('click', () => {
      const m = invRes.textContent.match(/z = ([\d.-]+)/);
      if (m) pick(parseFloat(m[1]));
    });
    calcInverse();
  }

  window.addEventListener('resize', sched);
  draw(); hl(); info();
}

/* ════════════════════════════════════════════════ */
/*  Tab 2 — t Distribution Table                  */
/* ════════════════════════════════════════════════ */
function initTTab() {
  const cv = $('tTabCanvas'), dfIn = $('tTabDf'), tbl = $('tTabTable'), alphaWrap = $('tAlphas'), dfVal = $('tDfVal');
  if (!cv || !tbl) return;
  let hDf = null, hA = null;

  if (dfIn && S.t.df !== Infinity) dfIn.value = S.t.df;
  if (dfVal) dfVal.textContent = S.t.df === Infinity ? '∞' : S.t.df;
  const sr = document.querySelector('input[name="tSide"][value="' + S.t.side + '"]');
  if (sr) sr.checked = true;
  alphaWrap?.querySelectorAll('.dt-alpha').forEach(b => b.classList.toggle('active', parseFloat(b.dataset.alpha) === S.t.alpha));

  const sched = throttledDraw(draw);
  const cdf = df => df === Infinity ? 1e6 : df;

  const thead = tbl.createTHead(), hr = thead.insertRow();
  hr.insertCell().outerHTML = '<th>df \\ α</th>';
  ALPHAS.forEach(a => { const th = document.createElement('th'); th.textContent = a.toString(); th.style.cursor = 'pointer'; th.addEventListener('click', () => selA(a)); hr.appendChild(th); });
  const tbody = tbl.createTBody();
  T_DFS.forEach(df => {
    const tr = tbody.insertRow(), th = document.createElement('th');
    th.textContent = df === Infinity ? '∞' : String(df);
    th.style.cursor = 'pointer'; th.addEventListener('click', () => selDf(df)); tr.appendChild(th);
    ALPHAS.forEach(a => {
      const td = tr.insertCell();
      td.dataset.df = df === Infinity ? 'inf' : String(df);
      td.dataset.alpha = String(a);
      td.textContent = tCritOne(a, cdf(df)).toFixed(3);
      td.addEventListener('click', () => selCell(df, a));
      td.addEventListener('mouseenter', () => { hDf = df; hA = a; sched(); info(); });
    });
  });
  tbl.addEventListener('mouseleave', () => { hDf = null; hA = null; sched(); info(); });

  function selDf(d) { S.t.df = d; if (dfIn) dfIn.value = d === Infinity ? '' : d; if (dfVal) dfVal.textContent = d === Infinity ? '∞' : d; hl(); sched(); info(); writeURL(); }
  function selA(a) { S.t.alpha = a; alphaWrap?.querySelectorAll('.dt-alpha').forEach(b => b.classList.toggle('active', parseFloat(b.dataset.alpha) === a)); hl(); sched(); info(); writeURL(); }
  function selCell(d, a) { S.t.df = d; S.t.alpha = a; if (dfIn) dfIn.value = d === Infinity ? '' : d; if (dfVal) dfVal.textContent = d === Infinity ? '∞' : d; alphaWrap?.querySelectorAll('.dt-alpha').forEach(b => b.classList.toggle('active', parseFloat(b.dataset.alpha) === a)); hl(); sched(); info(); writeURL(); }
  function hl() {
    tbl.querySelectorAll('td.selected').forEach(t => t.classList.remove('selected'));
    const k = S.t.df === Infinity ? 'inf' : String(S.t.df);
    const td = tbl.querySelector('td[data-df="' + k + '"][data-alpha="' + S.t.alpha + '"]');
    if (td) { td.classList.add('selected'); if (!_initializing) td.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
  }
  function info() {
    const df = hDf ?? S.t.df, a = hA ?? S.t.alpha, side = S.t.side, t = tCritOne(a, cdf(df)), dl = df === Infinity ? '∞' : df;
    const el = $('tSelInfo');
    if (!el) return;
    if (side === 'two') el.innerHTML = '<span>df = <b>' + dl + '</b></span><span>t = <b>±' + t.toFixed(3) + '</b></span><span>α = <b>' + (a * 2) + '</b> ' + (isEn() ? '(two-sided)' : '(両側)') + '</span>';
    else el.innerHTML = '<span>df = <b>' + dl + '</b></span><span>t = <b>' + t.toFixed(3) + '</b></span><span>α = <b>' + a + '</b> ' + (isEn() ? '(one-sided)' : '(片側)') + '</span>';
  }

  function draw() {
    const { ctx, w, h } = resizeCanvas(cv);
    if (!ctx) return;
    const tc = themeColors(); drawGrid(ctx, w, h);
    const rDf = hDf ?? S.t.df, df = cdf(rDf), a = hA ?? S.t.alpha, side = S.t.side, tc2 = tCritOne(a, df);
    const lo = -5, hi = 5, pk = Math.max(tPDF(0, df), normPDF(0)), mt = 30, mb = 22, baseY = h - mb;
    const xP = x => (x - lo) / (hi - lo) * w, yP = y => mt + (1 - y / pk) * (h - mt - mb);

    ctx.strokeStyle = withAlpha(tc.cyan, .3); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, baseY); ctx.lineTo(w, baseY); ctx.stroke();
    ctx.fillStyle = tc.dim; ctx.font = '10px "Courier New"'; ctx.textAlign = 'center';
    for (let x = -4; x <= 4; x += 2) ctx.fillText(String(x), xP(x), h - 8);
    ctx.textAlign = 'start';

    const pts = [];
    for (let px = 0; px <= w; px++) { const x = lo + px / w * (hi - lo); pts.push([px, yP(tPDF(x, df))]); }

    // Right tail
    const rF = [[xP(tc2), baseY]];
    for (let px = 0; px <= w; px++) { const x = lo + px / w * (hi - lo); if (x >= tc2) rF.push([px, yP(tPDF(x, df))]); }
    rF.push([w, baseY]); neonFill(ctx, rF, tc.magenta, .3);
    if (side === 'two') {
      const lF = [[0, baseY]];
      for (let px = 0; px <= w; px++) { const x = lo + px / w * (hi - lo); if (x <= -tc2) lF.push([px, yP(tPDF(x, df))]); }
      lF.push([xP(-tc2), baseY]); neonFill(ctx, lF, tc.magenta, .3);
    }

    neonLine(ctx, pts, tc.cyan, 14, 2.5);
    ctx.strokeStyle = tc.yellow; ctx.lineWidth = 2; ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(xP(tc2), mt); ctx.lineTo(xP(tc2), baseY); ctx.stroke();
    if (side === 'two') { ctx.beginPath(); ctx.moveTo(xP(-tc2), mt); ctx.lineTo(xP(-tc2), baseY); ctx.stroke(); }
    ctx.setLineDash([]);

    const dl = rDf === Infinity ? '∞' : rDf;
    ctx.fillStyle = tc.cyan; ctx.font = '10px "Courier New"'; ctx.fillText('t (df=' + dl + ')', 8, 14);
    ctx.fillStyle = tc.text; ctx.font = 'bold 11px "Courier New"'; ctx.textAlign = 'right';
    ctx.fillText('df = ' + dl, w - 10, 14);
    ctx.fillText('t = ' + (side === 'two' ? '±' : '') + tc2.toFixed(3), w - 10, 28);
    ctx.fillText('α = ' + (side === 'two' ? (a * 2) : a) + (side === 'two' ? (isEn() ? ' two' : ' 両側') : (isEn() ? ' one' : ' 片側')), w - 10, 42);
    ctx.textAlign = 'start';
  }

  if (dfIn) dfIn.addEventListener('input', () => {
    const v = parseInt(dfIn.value);
    if (!isNaN(v) && v >= 1 && v <= 200) { S.t.df = v; if (dfVal) dfVal.textContent = v; hl(); sched(); info(); writeURL(); }
  });
  document.querySelectorAll('input[name="tSide"]').forEach(r => r.addEventListener('change', () => { S.t.side = r.value; sched(); info(); }));
  alphaWrap?.querySelectorAll('.dt-alpha').forEach(btn => btn.addEventListener('click', () => selA(parseFloat(btn.dataset.alpha))));
  $('tCopy')?.addEventListener('click', async () => {
    const t = tCritOne(S.t.alpha, cdf(S.t.df)), dl = S.t.df === Infinity ? '∞' : S.t.df;
    const ok = await clip('df=' + dl + ', t=' + t.toFixed(3) + ', α=' + S.t.alpha);
    toast(ok ? (isEn() ? 'Copied!' : 'コピーしました') : (isEn() ? 'Copy failed' : 'コピー失敗'));
  });
  window.addEventListener('resize', sched);
  draw(); hl(); info();
}

/* ════════════════════════════════════════════════ */
/*  Tab 3 — Chi-Square Distribution Table         */
/* ════════════════════════════════════════════════ */
function initChi2Tab() {
  const cv = $('chi2TblCanvas'), dfIn = $('chi2TblDf'), tbl = $('chi2TblTable'), alphaWrap = $('chi2Alphas'), chi2DfVal = $('chi2DfVal');
  if (!cv || !tbl) return;
  let hDf = null, hA = null;

  if (dfIn) dfIn.value = S.chi2.df;
  if (chi2DfVal) chi2DfVal.textContent = S.chi2.df;
  alphaWrap?.querySelectorAll('.dt-alpha').forEach(b => b.classList.toggle('active', parseFloat(b.dataset.alpha) === S.chi2.alpha));

  const sched = throttledDraw(draw);

  const thead = tbl.createTHead(), hr = thead.insertRow();
  hr.insertCell().outerHTML = '<th>df \\ α</th>';
  ALPHAS.forEach(a => { const th = document.createElement('th'); th.textContent = a.toString(); th.style.cursor = 'pointer'; th.addEventListener('click', () => selA(a)); hr.appendChild(th); });
  const tbody = tbl.createTBody();
  CHI2_DFS.forEach(df => {
    const tr = tbody.insertRow(), th = document.createElement('th');
    th.textContent = String(df); th.style.cursor = 'pointer'; th.addEventListener('click', () => selDf(df)); tr.appendChild(th);
    ALPHAS.forEach(a => {
      const td = tr.insertCell();
      td.dataset.df = String(df); td.dataset.alpha = String(a);
      td.textContent = chi2Crit(a, df).toFixed(3);
      td.addEventListener('click', () => selCell(df, a));
      td.addEventListener('mouseenter', () => { hDf = df; hA = a; sched(); info(); });
    });
  });
  tbl.addEventListener('mouseleave', () => { hDf = null; hA = null; sched(); info(); });

  function selDf(d) { S.chi2.df = d; if (dfIn) dfIn.value = d; if (chi2DfVal) chi2DfVal.textContent = d; hl(); sched(); info(); writeURL(); }
  function selA(a) { S.chi2.alpha = a; alphaWrap?.querySelectorAll('.dt-alpha').forEach(b => b.classList.toggle('active', parseFloat(b.dataset.alpha) === a)); hl(); sched(); info(); writeURL(); }
  function selCell(d, a) { S.chi2.df = d; S.chi2.alpha = a; if (dfIn) dfIn.value = d; if (chi2DfVal) chi2DfVal.textContent = d; alphaWrap?.querySelectorAll('.dt-alpha').forEach(b => b.classList.toggle('active', parseFloat(b.dataset.alpha) === a)); hl(); sched(); info(); writeURL(); }
  function hl() {
    tbl.querySelectorAll('td.selected').forEach(t => t.classList.remove('selected'));
    const td = tbl.querySelector('td[data-df="' + S.chi2.df + '"][data-alpha="' + S.chi2.alpha + '"]');
    if (td) { td.classList.add('selected'); if (!_initializing) td.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
  }
  function info() {
    const el = $('chi2SelInfo');
    const df = hDf ?? S.chi2.df, a = hA ?? S.chi2.alpha;
    if (el) el.innerHTML = '<span>df = <b>' + df + '</b></span><span>χ² = <b>' + chi2Crit(a, df).toFixed(3) + '</b></span><span>α = <b>' + a + '</b></span>';
  }

  function draw() {
    const { ctx, w, h } = resizeCanvas(cv);
    if (!ctx) return;
    const tc = themeColors(); drawGrid(ctx, w, h);
    const df = hDf ?? S.chi2.df, a = hA ?? S.chi2.alpha, cr = chi2Crit(a, df);
    const xmax = Math.max(15, df * 2.5, cr * 1.5);
    const xP = x => x / xmax * w;
    let pk = 0;
    for (let x = 0.02; x <= xmax; x += xmax / 300) { const y = chi2PDF(x, df); if (y > pk) pk = y; }
    if (pk === 0) pk = 1;
    const mt = 30, mb = 22, baseY = h - mb;
    const yP = y => mt + (1 - y / pk) * (h - mt - mb);

    ctx.strokeStyle = withAlpha(tc.cyan, .3); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, baseY); ctx.lineTo(w, baseY); ctx.stroke();

    const pts = [];
    for (let px = 1; px <= w; px++) { const x = px / w * xmax; pts.push([px, yP(chi2PDF(x, df))]); }

    const fp = [[xP(cr), baseY]];
    for (let px = 0; px <= w; px++) { const x = px / w * xmax; if (x >= cr) fp.push([px, yP(chi2PDF(x, df))]); }
    fp.push([w, baseY]); neonFill(ctx, fp, tc.magenta, .3);
    neonLine(ctx, pts, tc.magenta, 14, 2.5);

    ctx.strokeStyle = tc.yellow; ctx.lineWidth = 2; ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(xP(cr), mt); ctx.lineTo(xP(cr), baseY); ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = tc.dim; ctx.font = '10px "Courier New"'; ctx.textAlign = 'center';
    const ts = xmax <= 15 ? 2 : xmax <= 30 ? 5 : 10;
    for (let t = 0; t <= xmax; t += ts) ctx.fillText(t.toFixed(0), xP(t), h - 8);
    ctx.textAlign = 'start';

    ctx.fillStyle = tc.magenta; ctx.font = '10px "Courier New"'; ctx.fillText('χ² (df=' + df + ')', 8, 14);
    ctx.fillStyle = tc.text; ctx.font = 'bold 11px "Courier New"'; ctx.textAlign = 'right';
    ctx.fillText('df = ' + df, w - 10, 14);
    ctx.fillText('χ² = ' + cr.toFixed(3), w - 10, 28);
    ctx.fillText('α = ' + a, w - 10, 42);
    ctx.textAlign = 'start';
  }

  if (dfIn) dfIn.addEventListener('input', () => {
    const v = parseInt(dfIn.value);
    if (!isNaN(v) && v >= 1 && v <= 30) { S.chi2.df = v; if (chi2DfVal) chi2DfVal.textContent = v; hl(); sched(); info(); writeURL(); }
  });
  alphaWrap?.querySelectorAll('.dt-alpha').forEach(btn => btn.addEventListener('click', () => selA(parseFloat(btn.dataset.alpha))));
  $('chi2Copy')?.addEventListener('click', async () => {
    const ok = await clip('df=' + S.chi2.df + ', χ²=' + chi2Crit(S.chi2.alpha, S.chi2.df).toFixed(3) + ', α=' + S.chi2.alpha);
    toast(ok ? (isEn() ? 'Copied!' : 'コピーしました') : (isEn() ? 'Copy failed' : 'コピー失敗'));
  });
  window.addEventListener('resize', sched);
  draw(); hl(); info();
}

/* ════════════════════════════════════════════════ */
/*  Tab 4 — F Distribution Table                  */
/* ════════════════════════════════════════════════ */
function initFTab() {
  const cv = $('fTblCanvas'), d1In = $('fTblDf1'), d2In = $('fTblDf2'), tbl = $('fTblTable'), alphaWrap = $('fAlphas'), fDf1Val = $('fDf1Val'), fDf2Val = $('fDf2Val');
  if (!cv || !tbl) return;
  let hD1 = null, hD2 = null;

  if (d1In) d1In.value = S.f.df1;
  if (d2In) d2In.value = S.f.df2;
  if (fDf1Val) fDf1Val.textContent = S.f.df1;
  if (fDf2Val) fDf2Val.textContent = S.f.df2;
  alphaWrap?.querySelectorAll('.dt-alpha').forEach(b => b.classList.toggle('active', parseFloat(b.dataset.alpha) === S.f.alpha));

  const sched = throttledDraw(draw);

  buildTable();

  function buildTable() {
    tbl.innerHTML = '';
    const a = S.f.alpha;
    const thead = tbl.createTHead(), hr = thead.insertRow();
    hr.insertCell().outerHTML = '<th>df₂ \\ df₁</th>';
    F_D1.forEach(d1 => { const th = document.createElement('th'); th.textContent = String(d1); hr.appendChild(th); });
    const tbody = tbl.createTBody();
    F_D2.forEach(d2 => {
      const tr = tbody.insertRow(), th = document.createElement('th');
      th.textContent = String(d2); tr.appendChild(th);
      F_D1.forEach(d1 => {
        const val = fCrit(a, d1, d2);
        const td = tr.insertCell();
        td.dataset.df1 = String(d1); td.dataset.df2 = String(d2);
        td.textContent = val < 10 ? val.toFixed(2) : val.toFixed(1);
        td.addEventListener('click', () => selCell(d1, d2));
        td.addEventListener('mouseenter', () => { hD1 = d1; hD2 = d2; sched(); info(); });
      });
    });
    tbl.addEventListener('mouseleave', () => { hD1 = null; hD2 = null; sched(); info(); });
  }

  function selCell(d1, d2) { S.f.df1 = d1; S.f.df2 = d2; if (d1In) d1In.value = d1; if (d2In) d2In.value = d2; if (fDf1Val) fDf1Val.textContent = d1; if (fDf2Val) fDf2Val.textContent = d2; hl(); sched(); info(); writeURL(); }
  function hl() {
    tbl.querySelectorAll('td.selected').forEach(t => t.classList.remove('selected'));
    const td = tbl.querySelector('td[data-df1="' + S.f.df1 + '"][data-df2="' + S.f.df2 + '"]');
    if (td) { td.classList.add('selected'); if (!_initializing) td.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
  }
  function info() {
    const df1 = hD1 ?? S.f.df1, df2 = hD2 ?? S.f.df2, alpha = S.f.alpha, cr = fCrit(alpha, df1, df2);
    const el = $('fSelInfo');
    if (el) el.innerHTML = '<span>df₁ = <b>' + df1 + '</b></span><span>df₂ = <b>' + df2 + '</b></span><span>F = <b>' + cr.toFixed(3) + '</b></span><span>α = <b>' + alpha + '</b></span>';
  }

  function draw() {
    const { ctx, w, h } = resizeCanvas(cv);
    if (!ctx) return;
    const tc = themeColors(); drawGrid(ctx, w, h);
    const df1 = hD1 ?? S.f.df1, df2 = hD2 ?? S.f.df2, alpha = S.f.alpha, cr = fCrit(alpha, df1, df2);
    const xmax = Math.max(4, cr * 1.8);
    const xP = x => x / xmax * w;
    let pk = 0;
    for (let x = 0.01; x <= xmax; x += xmax / 300) { const y = fPDF(x, df1, df2); if (y > pk) pk = y; }
    if (pk === 0) pk = 1;
    const mt = 30, mb = 22, baseY = h - mb;
    const yP = y => mt + (1 - y / pk) * (h - mt - mb);

    ctx.strokeStyle = withAlpha(tc.cyan, .3); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, baseY); ctx.lineTo(w, baseY); ctx.stroke();

    const pts = [];
    for (let px = 1; px <= w; px++) { const x = px / w * xmax; pts.push([px, yP(fPDF(x, df1, df2))]); }

    const fp = [[xP(cr), baseY]];
    for (let px = 0; px <= w; px++) { const x = px / w * xmax; if (x >= cr) fp.push([px, yP(fPDF(x, df1, df2))]); }
    fp.push([w, baseY]); neonFill(ctx, fp, tc.magenta, .3);
    neonLine(ctx, pts, tc.yellow, 14, 2.5);

    ctx.strokeStyle = tc.yellow; ctx.lineWidth = 2; ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(xP(cr), mt); ctx.lineTo(xP(cr), baseY); ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = tc.dim; ctx.font = '10px "Courier New"'; ctx.textAlign = 'center';
    const ts = xmax <= 5 ? 1 : xmax <= 10 ? 2 : Math.ceil(xmax / 5);
    for (let t = 0; t <= xmax; t += ts) ctx.fillText(t.toFixed(0), xP(t), h - 8);
    ctx.textAlign = 'start';

    ctx.fillStyle = tc.yellow; ctx.font = '10px "Courier New"'; ctx.fillText('F (' + df1 + ', ' + df2 + ')', 8, 14);
    ctx.fillStyle = tc.text; ctx.font = 'bold 11px "Courier New"'; ctx.textAlign = 'right';
    ctx.fillText('df₁=' + df1 + '  df₂=' + df2, w - 10, 14);
    ctx.fillText('F = ' + cr.toFixed(3), w - 10, 28);
    ctx.fillText('α = ' + alpha, w - 10, 42);
    ctx.textAlign = 'start';
  }

  [d1In, d2In].forEach((inp, idx) => {
    if (!inp) return;
    inp.addEventListener('input', () => {
      const v = parseInt(inp.value);
      if (!isNaN(v) && v >= 1 && v <= 120) {
        if (idx === 0) { S.f.df1 = v; if (fDf1Val) fDf1Val.textContent = v; }
        else { S.f.df2 = v; if (fDf2Val) fDf2Val.textContent = v; }
        hl(); sched(); info(); writeURL();
      }
    });
  });
  alphaWrap?.querySelectorAll('.dt-alpha').forEach(btn => btn.addEventListener('click', () => {
    S.f.alpha = parseFloat(btn.dataset.alpha);
    alphaWrap.querySelectorAll('.dt-alpha').forEach(b => b.classList.toggle('active', b === btn));
    buildTable(); hl(); sched(); info(); writeURL();
  }));
  $('fCopy')?.addEventListener('click', async () => {
    const cr = fCrit(S.f.alpha, S.f.df1, S.f.df2);
    const ok = await clip('df₁=' + S.f.df1 + ', df₂=' + S.f.df2 + ', F=' + cr.toFixed(3) + ', α=' + S.f.alpha);
    toast(ok ? (isEn() ? 'Copied!' : 'コピーしました') : (isEn() ? 'Copy failed' : 'コピー失敗'));
  });
  window.addEventListener('resize', sched);
  draw(); hl(); info();
}

/* ─── URL State ─── */
function readURL() {
  const p = new URLSearchParams(location.search);
  if (p.has('dist') && ['norm', 't', 'chi2', 'f'].includes(p.get('dist'))) S.tab = p.get('dist');
  if (p.has('z')) S.norm.z = Math.max(0, Math.min(3.49, parseFloat(p.get('z')) || 1.96));
  if (p.has('mode') && ['lower', 'upper', 'twosided'].includes(p.get('mode'))) S.norm.mode = p.get('mode');
  if (p.has('df')) { const r = p.get('df'); if (r === 'inf') S.t.df = Infinity; else { const v = parseInt(r); if (v > 0) S.t.df = v; } }
  if (p.has('alpha')) { const v = parseFloat(p.get('alpha')); if (v > 0 && v < 1) S.t.alpha = v; }
  if (p.has('side') && ['one', 'two'].includes(p.get('side'))) S.t.side = p.get('side');
  if (p.has('chi2df')) { const v = parseInt(p.get('chi2df')); if (v > 0 && v <= 30) S.chi2.df = v; }
  if (p.has('chi2alpha')) { const v = parseFloat(p.get('chi2alpha')); if (v > 0 && v < 1) S.chi2.alpha = v; }
  if (p.has('df1')) { const v = parseInt(p.get('df1')); if (v > 0) S.f.df1 = v; }
  if (p.has('df2')) { const v = parseInt(p.get('df2')); if (v > 0) S.f.df2 = v; }
  if (p.has('falpha')) { const v = parseFloat(p.get('falpha')); if (v > 0 && v < 1) S.f.alpha = v; }
}

function writeURL() {
  const p = new URLSearchParams();
  p.set('dist', S.tab);
  if (S.tab === 'norm') { p.set('z', S.norm.z.toFixed(2)); p.set('mode', S.norm.mode); }
  else if (S.tab === 't') { p.set('df', S.t.df === Infinity ? 'inf' : S.t.df); p.set('alpha', S.t.alpha); p.set('side', S.t.side); }
  else if (S.tab === 'chi2') { p.set('chi2df', S.chi2.df); p.set('chi2alpha', S.chi2.alpha); }
  else { p.set('df1', S.f.df1); p.set('df2', S.f.df2); p.set('falpha', S.f.alpha); }
  history.replaceState(null, '', '?' + p.toString());
}

/* ─── Entry ─── */
export function initTables() {
  if (!$('tabBar')) return;
  const p = new URLSearchParams(location.search);
  const hasDistParams = p.has('dist');
  readURL();
  document.querySelectorAll('.dt-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === S.tab));
  document.querySelectorAll('.dt-pane').forEach(p => p.classList.toggle('active', p.id === 'pane-' + S.tab));
  syncSections();
  initSidebar();
  initTabs();
  initNormTab();
  initTTab();
  initChi2Tab();
  initFTab();
  _initializing = false;
  if (hasDistParams) {
    const pane = document.getElementById('pane-' + S.tab);
    if (pane) requestAnimationFrame(() => pane.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }
}
