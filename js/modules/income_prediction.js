/*!
 * StatPlay — income prediction column module
 * Copyright (c) 2026 Sasai Lab * Licensed under CC BY-NC 4.0.
 */
import { $, resizeCanvas, drawGrid, neonLine, neonFill, themeColors, debouncedResize, isEn } from '../utils.js';

const L = (ja, en) => isEn() ? en : ja;

const AGE_INCOME_TABLE = {
  22: 280, 23: 292, 24: 304, 25: 340, 26: 352, 27: 364, 28: 376, 29: 388,
  30: 420, 31: 432, 32: 444, 33: 456, 34: 468,
  35: 480, 36: 492, 37: 504, 38: 516, 39: 528,
  40: 540, 41: 550, 42: 560, 43: 570, 44: 580,
  45: 590, 46: 596, 47: 602, 48: 608, 49: 614,
  50: 620, 51: 624, 52: 628, 53: 632, 54: 636,
  55: 640, 56: 628, 57: 616, 58: 604, 59: 592,
  60: 580, 61: 560, 62: 540, 63: 520, 64: 500, 65: 480
};

const GENDER_EFFECT = { male: 0, female: -120 };

const PREFECTURE_EFFECT_JA = {
  '東京都': 130, '神奈川県': 80, '大阪府': 50, '愛知県': 40, '千葉県': 30,
  '埼玉県': 25, '京都府': 20, '兵庫県': 15, '茨城県': 10, '静岡県': 10,
  '広島県': 5, '福岡県': 5, '三重県': 5, '栃木県': 0, '群馬県': 0,
  '岐阜県': 0, '長野県': 0, '富山県': 0, '滋賀県': 5, '奈良県': 0,
  '石川県': 0, '福井県': 0, '山梨県': -5, '新潟県': -10, '和歌山県': -10,
  '岡山県': -10, '香川県': -15, '徳島県': -15, '山口県': -20, '愛媛県': -20,
  '大分県': -25, '福島県': -25, '山形県': -30, '岩手県': -35, '佐賀県': -35,
  '熊本県': -40, '長崎県': -40, '鹿児島県': -45, '島根県': -45, '鳥取県': -50,
  '高知県': -50, '秋田県': -55, '北海道': -30, '宮城県': -5,
  '青森県': -70, '沖縄県': -80, '宮崎県': -60
};

const PREFECTURE_EFFECT_EN = {
  'Tokyo': 130, 'Kanagawa': 80, 'Osaka': 50, 'Aichi': 40, 'Chiba': 30,
  'Saitama': 25, 'Kyoto': 20, 'Hyogo': 15, 'Ibaraki': 10, 'Shizuoka': 10,
  'Hiroshima': 5, 'Fukuoka': 5, 'Mie': 5, 'Tochigi': 0, 'Gunma': 0,
  'Gifu': 0, 'Nagano': 0, 'Toyama': 0, 'Shiga': 5, 'Nara': 0,
  'Ishikawa': 0, 'Fukui': 0, 'Yamanashi': -5, 'Niigata': -10, 'Wakayama': -10,
  'Okayama': -10, 'Kagawa': -15, 'Tokushima': -15, 'Yamaguchi': -20, 'Ehime': -20,
  'Oita': -25, 'Fukushima': -25, 'Yamagata': -30, 'Iwate': -35, 'Saga': -35,
  'Kumamoto': -40, 'Nagasaki': -40, 'Kagoshima': -45, 'Shimane': -45, 'Tottori': -50,
  'Kochi': -50, 'Akita': -55, 'Hokkaido': -30, 'Miyagi': -5,
  'Aomori': -70, 'Okinawa': -80, 'Miyazaki': -60
};

const EDUCATION_EFFECT = { high_school: -80, vocational: -40, university: 0, graduate: 80 };
const COMPANY_SIZE_EFFECT = { small: -60, medium: -20, large: 0, enterprise: 60 };

const PRED_SD = 100;
const CONF_SD = 10;

function interpolateAge(age) {
  age = Math.max(22, Math.min(65, age));
  if (AGE_INCOME_TABLE[age] !== undefined) return AGE_INCOME_TABLE[age];
  const keys = Object.keys(AGE_INCOME_TABLE).map(Number).sort((a, b) => a - b);
  let lo = keys[0], hi = keys[keys.length - 1];
  for (const k of keys) {
    if (k <= age) lo = k;
    if (k >= age && hi === keys[keys.length - 1]) hi = k;
  }
  if (lo === hi) return AGE_INCOME_TABLE[lo];
  const t = (age - lo) / (hi - lo);
  return AGE_INCOME_TABLE[lo] + t * (AGE_INCOME_TABLE[hi] - AGE_INCOME_TABLE[lo]);
}

function predict(age, gender, prefEffect, eduEffect, compEffect) {
  const mean = interpolateAge(age) + GENDER_EFFECT[gender] + prefEffect + eduEffect + compEffect;
  return {
    mean,
    predLower: mean - 1.96 * PRED_SD,
    predUpper: mean + 1.96 * PRED_SD,
    confLower: mean - 1.96 * CONF_SD,
    confUpper: mean + 1.96 * CONF_SD
  };
}

/* ── Interactive age-income chart ── */
function initPredictor() {
  const canvas = $('incomeCanvas');
  const ageSlider = $('incomeAge');
  const genderBtns = document.querySelectorAll('.gender-btn');
  const prefSelect = $('incomePref');
  const eduSelect = $('incomeEdu');
  const compSelect = $('incomeComp');
  const vAge = $('incomeAgeVal');
  const vMean = $('incomeMean');
  const vRange = $('incomeRange');
  const vConfRange = $('incomeConfRange');
  if (!canvas || !ageSlider) return;

  const prefEffects = isEn() ? PREFECTURE_EFFECT_EN : PREFECTURE_EFFECT_JA;
  let currentGender = 'male';
  let animAge = null, animEffect = null;
  let targetAge = 35, targetEffect = 0;
  let animId = null, dragging = false;
  let plotPadL = 55, plotW = 400;

  // Restore URL params
  const up = new URLSearchParams(location.search);
  if (up.has('incomeAge')) ageSlider.value = up.get('incomeAge');
  if (up.has('incomePref')) prefSelect.value = up.get('incomePref');
  if (up.has('incomeEdu') && eduSelect) eduSelect.value = up.get('incomeEdu');
  if (up.has('incomeComp') && compSelect) compSelect.value = up.get('incomeComp');
  if (up.has('gender')) {
    currentGender = up.get('gender');
    genderBtns.forEach(b => b.classList.toggle('active', b.dataset.gender === currentGender));
  }

  genderBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      genderBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentGender = btn.dataset.gender;
      update();
    });
  });

  function totalEffect() {
    const g = GENDER_EFFECT[currentGender];
    const p = prefEffects[prefSelect.value] || 0;
    const e = eduSelect ? (EDUCATION_EFFECT[eduSelect.value] || 0) : 0;
    const c = compSelect ? (COMPANY_SIZE_EFFECT[compSelect.value] || 0) : 0;
    return g + p + e + c;
  }

  function update() {
    const age = +ageSlider.value;
    targetAge = age;
    targetEffect = totalEffect();
    const result = predict(age, currentGender, prefEffects[prefSelect.value] || 0,
      eduSelect ? (EDUCATION_EFFECT[eduSelect.value] || 0) : 0,
      compSelect ? (COMPANY_SIZE_EFFECT[compSelect.value] || 0) : 0);

    vAge.textContent = age;
    vMean.textContent = Math.round(result.mean);
    vRange.textContent = Math.round(Math.max(0, result.predLower)) + L('万円 〜 ', '×10k¥ – ') + Math.round(result.predUpper) + L('万円', '×10k¥');
    if (vConfRange) vConfRange.textContent = Math.round(result.confLower) + L('万円 〜 ', '×10k¥ – ') + Math.round(result.confUpper) + L('万円', '×10k¥');
    canvas.setAttribute('aria-valuenow', age);

    if (animAge === null) animAge = targetAge;
    if (animEffect === null) animEffect = targetEffect;
    if (dragging) animAge = targetAge;
    if (!animId) animId = requestAnimationFrame(tick);
  }

  function tick() {
    let moving = false;
    if (!dragging) {
      const ad = targetAge - animAge;
      if (Math.abs(ad) > 0.05) { animAge += ad * 0.22; moving = true; }
      else animAge = targetAge;
    } else { animAge = targetAge; }

    const ed = targetEffect - animEffect;
    if (Math.abs(ed) > 0.5) { animEffect += ed * 0.15; moving = true; }
    else animEffect = targetEffect;

    renderFrame(animAge, animEffect);
    if (moving && !window.__REDUCED_MOTION) animId = requestAnimationFrame(tick);
    else { animAge = targetAge; animEffect = targetEffect; renderFrame(animAge, animEffect); animId = null; }
  }

  function renderFrame(curAge, curEff) {
    const { ctx, w, h } = resizeCanvas(canvas);
    if (!ctx) return;
    const tc = themeColors();
    ctx.clearRect(0, 0, w * 2, h * 2);
    drawGrid(ctx, w, h);

    const pad = { l: 52, r: 12, t: 22, b: 36 };
    const pw = w - pad.l - pad.r;
    const ph = h - pad.t - pad.b;
    plotPadL = pad.l; plotW = pw;

    const aMin = 22, aMax = 65, yMin = 0, yMax = 1100;
    const toX = a => pad.l + (a - aMin) / (aMax - aMin) * pw;
    const toY = v => pad.t + ph * (1 - (v - yMin) / (yMax - yMin));
    const baseY = toY(yMin);

    // axes
    ctx.strokeStyle = tc.dim; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad.l, baseY); ctx.lineTo(pad.l + pw, baseY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pad.l, pad.t); ctx.lineTo(pad.l, baseY); ctx.stroke();

    // y gridlines + ticks
    ctx.fillStyle = tc.dim;
    ctx.font = '10px "Courier New",monospace';
    ctx.textAlign = 'right';
    for (let y = 0; y <= 1000; y += 200) {
      const yp = toY(y);
      ctx.beginPath(); ctx.moveTo(pad.l - 3, yp); ctx.lineTo(pad.l, yp); ctx.stroke();
      ctx.fillText(y, pad.l - 5, yp + 3);
      if (y > 0) { ctx.save(); ctx.globalAlpha = 0.06; ctx.beginPath(); ctx.moveTo(pad.l, yp); ctx.lineTo(pad.l + pw, yp); ctx.stroke(); ctx.restore(); }
    }
    ctx.textAlign = 'left';
    ctx.fillText(L('(万円)', '(×10k¥)'), pad.l - 4, pad.t - 5);

    // x ticks (age) — skip ticks near cursor
    ctx.textAlign = 'center';
    const aStep = pw < 280 ? 10 : 5;
    for (let a = 25; a <= 65; a += aStep) {
      if (Math.abs(a - Math.round(curAge)) < 3) continue;
      const x = toX(a);
      ctx.fillStyle = tc.dim;
      ctx.beginPath(); ctx.moveTo(x, baseY); ctx.lineTo(x, baseY + 3); ctx.stroke();
      ctx.fillText(a, x, baseY + 13);
    }
    ctx.fillStyle = tc.dim;
    ctx.fillText(L('年齢（歳）', 'Age'), pad.l + pw / 2, baseY + 27);

    // compute band data
    const predTop = [], predBot = [], confTop = [], confBot = [], meanPts = [];
    for (let a = aMin; a <= aMax; a += 0.5) {
      const m = interpolateAge(a) + curEff;
      const x = toX(a);
      meanPts.push([x, toY(m)]);
      predTop.push([x, toY(Math.min(yMax, m + 1.96 * PRED_SD))]);
      predBot.push([x, toY(Math.max(yMin, m - 1.96 * PRED_SD))]);
      confTop.push([x, toY(Math.min(yMax, m + 1.96 * CONF_SD))]);
      confBot.push([x, toY(Math.max(yMin, m - 1.96 * CONF_SD))]);
    }

    // prediction band (cyan)
    const pf = [...predTop];
    for (let i = predBot.length - 1; i >= 0; i--) pf.push(predBot[i]);
    neonFill(ctx, pf, tc.cyan, 0.13);

    // confidence band (yellow)
    const cf = [...confTop];
    for (let i = confBot.length - 1; i >= 0; i--) cf.push(confBot[i]);
    neonFill(ctx, cf, tc.yellow, 0.22);

    // mean line
    neonLine(ctx, meanPts, tc.yellow, 8, 2);

    // cursor at current age
    const cx = toX(curAge);
    const curMean = interpolateAge(curAge) + curEff;

    ctx.save();
    ctx.strokeStyle = tc.cyan; ctx.globalAlpha = 0.35; ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(cx, pad.t); ctx.lineTo(cx, baseY); ctx.stroke();
    ctx.restore();

    // prediction range bracket at cursor
    const pLo = toY(Math.max(yMin, curMean - 1.96 * PRED_SD));
    const pHi = toY(Math.min(yMax, curMean + 1.96 * PRED_SD));
    ctx.save();
    ctx.strokeStyle = tc.cyan; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.5;
    ctx.beginPath(); ctx.moveTo(cx - 4, pLo); ctx.lineTo(cx + 4, pLo); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 4, pHi); ctx.lineTo(cx + 4, pHi); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, pLo); ctx.lineTo(cx, pHi); ctx.stroke();
    ctx.restore();

    // dot
    ctx.beginPath(); ctx.arc(cx, toY(curMean), 5, 0, Math.PI * 2);
    ctx.fillStyle = tc.yellow;
    if (!tc.light) { ctx.shadowBlur = 12; ctx.shadowColor = tc.yellow; }
    ctx.fill(); ctx.shadowBlur = 0;

    // mean label
    ctx.fillStyle = tc.yellow;
    ctx.font = 'bold 12px "Courier New",monospace';
    ctx.textAlign = 'center';
    ctx.fillText(Math.round(curMean) + L('万円', '×10k¥'), cx, toY(curMean) - 10);

    // age label (highlighted)
    ctx.fillStyle = tc.cyan;
    ctx.font = 'bold 11px "Courier New",monospace';
    ctx.fillText(Math.round(curAge) + L('歳', ''), cx, baseY + 13);

    // legend
    ctx.font = '10px "Courier New",monospace'; ctx.textAlign = 'left';
    const ly = pad.t + 5;
    ctx.fillStyle = tc.cyan; ctx.globalAlpha = 0.4;
    ctx.fillRect(pad.l + 5, ly, 10, 6); ctx.globalAlpha = 1;
    ctx.fillText(L('95% 予測区間', '95% Prediction'), pad.l + 19, ly + 6);
    ctx.fillStyle = tc.yellow; ctx.globalAlpha = 0.6;
    ctx.fillRect(pad.l + 5, ly + 11, 10, 6); ctx.globalAlpha = 1;
    ctx.fillText(L('95% 信頼区間', '95% Confidence'), pad.l + 19, ly + 17);

    ctx.fillStyle = tc.dim; ctx.textAlign = 'right';
    ctx.fillText(L('← ドラッグで年齢操作 →', '← drag to change age →'), pad.l + pw - 2, ly + 6);
  }

  /* ── Drag → age ── */
  function ageFromPointer(e) {
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX;
    const ratio = (cx - rect.left - plotPadL) / plotW;
    return Math.round(22 + Math.max(0, Math.min(1, ratio)) * (65 - 22));
  }

  canvas.style.cursor = 'grab';
  canvas.style.touchAction = 'none';
  canvas.addEventListener('pointerdown', e => {
    dragging = true; canvas.style.cursor = 'grabbing';
    canvas.setPointerCapture(e.pointerId);
    ageSlider.value = ageFromPointer(e); update(); e.preventDefault();
  });
  canvas.addEventListener('pointermove', e => {
    if (!dragging) return;
    ageSlider.value = ageFromPointer(e); update();
  });
  canvas.addEventListener('pointerup', e => {
    if (dragging) { dragging = false; canvas.style.cursor = 'grab'; }
    try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
  });
  canvas.addEventListener('pointercancel', e => {
    dragging = false; canvas.style.cursor = 'grab';
    try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
  });

  /* ── Keyboard a11y ── */
  canvas.setAttribute('tabindex', '0');
  canvas.setAttribute('role', 'slider');
  canvas.setAttribute('aria-valuemin', '22');
  canvas.setAttribute('aria-valuemax', '65');
  canvas.setAttribute('aria-valuenow', ageSlider.value);
  canvas.setAttribute('aria-label', L('年齢スライダー（左右キーで操作）', 'Age slider (use arrow keys)'));

  canvas.addEventListener('keydown', e => {
    let age = +ageSlider.value;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') age = Math.min(65, age + 1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') age = Math.max(22, age - 1);
    else if (e.key === 'Home') age = 22;
    else if (e.key === 'End') age = 65;
    else return;
    e.preventDefault(); ageSlider.value = age; update();
  });

  ageSlider.addEventListener('input', update);
  prefSelect.addEventListener('change', update);
  if (eduSelect) eduSelect.addEventListener('change', update);
  if (compSelect) compSelect.addEventListener('change', update);

  update();
  const mo = new MutationObserver(() => renderFrame(animAge ?? targetAge, animEffect ?? targetEffect));
  mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  window.addEventListener('resize', debouncedResize(() => renderFrame(animAge ?? targetAge, animEffect ?? targetEffect)));
}

/* ── Toast ── */
function toast(msg) {
  let el = $('colToast');
  if (!el) {
    el = document.createElement('div'); el.id = 'colToast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg; el.classList.add('show');
  setTimeout(() => { el.classList.remove('show'); }, 2200);
}

/* ── Share ── */
function buildGraphURL(srcId) {
  const src = document.getElementById(srcId);
  if (!src) return location.href;
  const section = src.closest('.col-section');
  const params = new URLSearchParams();
  if (section) {
    section.querySelectorAll('input[type="range"], select').forEach(el => { if (el.id) params.set(el.id, el.value); });
    const ag = section.querySelector('.gender-btn.active');
    if (ag) params.set('gender', ag.dataset.gender);
  }
  const base = location.origin + location.pathname;
  const q = params.toString();
  const anchor = section && section.id ? '#' + section.id : '';
  return base + (q ? '?' + q : '') + anchor;
}

async function copyToClipboard(text) {
  try { if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(text); return true; } } catch (_) {}
  try { const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.left = '-9999px'; document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); document.body.removeChild(ta); return ok; } catch (_) { return false; }
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.style.display = 'none';
  document.body.appendChild(a); a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
}

function buildImage(srcId, title) {
  const src = document.getElementById(srcId);
  if (!src) return null;
  const srcLW = 560, srcLH = Math.round(srcLW * src.height / src.width);
  const headerH = 80, footerH = 36, padV = 16;
  const outW = srcLW + 40, outH = headerH + srcLH + padV + footerH;
  const out = document.createElement('canvas'); out.width = outW; out.height = outH;
  const ctx = out.getContext('2d');
  ctx.fillStyle = '#05060f'; ctx.fillRect(0, 0, outW, outH);
  ctx.strokeStyle = 'rgba(0,243,255,.08)'; ctx.lineWidth = 1;
  for (let x = 0; x < outW; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, outH); ctx.stroke(); }
  for (let y = 0; y < outH; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(outW, y); ctx.stroke(); }
  ctx.font = 'bold 26px "Courier New",monospace'; ctx.textBaseline = 'middle';
  const tg = ctx.createLinearGradient(0, 0, outW, 0);
  tg.addColorStop(0, '#00f3ff'); tg.addColorStop(1, '#ff2bd6');
  ctx.fillStyle = tg; ctx.shadowBlur = 14; ctx.shadowColor = '#00f3ff';
  ctx.fillText(title, 20, 36); ctx.shadowBlur = 0;
  ctx.font = '12px "Courier New",monospace'; ctx.fillStyle = '#7a8aa6';
  ctx.fillText(L('StatPlay - 統計をさわって学ぶ', 'StatPlay - Interactive Statistics'), 20, 62);
  ctx.strokeStyle = 'rgba(0,243,255,.3)'; ctx.lineWidth = 1;
  ctx.strokeRect(20, headerH, srcLW, srcLH);
  ctx.drawImage(src, 0, 0, src.width, src.height, 20, headerH, srcLW, srcLH);
  ctx.font = '11px "Courier New",monospace'; ctx.fillStyle = '#7a8aa6';
  ctx.fillText('#StatPlay - ' + new Date().toISOString().slice(0, 10), 20, outH - 18);
  return out;
}

async function doShare(kind, srcId, title) {
  if (kind === 'url') {
    const url = buildGraphURL(srcId);
    const ok = await copyToClipboard(url);
    toast(ok ? L('URL をコピーしました', 'Link copied') : L('コピー失敗', 'Copy failed'));
    return;
  }
  if (kind === 'x') {
    const text = isEn() ? title + ' — interactive statistics viz at StatPlay' : title + ' - StatPlay で可視化したよ';
    window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(text) + '&url=' + encodeURIComponent(location.href) + '&hashtags=StatPlay', '_blank', 'noopener,noreferrer');
    toast(L('Xを開いています…', 'Opening X…'));
    return;
  }
  if (kind === 'native') {
    try { if (navigator.share) { await navigator.share({ title, text: title + ' #StatPlay', url: location.href }); toast(L('シェアしました', 'Shared')); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
    doShare('x', srcId, title);
    return;
  }
  if (kind === 'dl') {
    let c;
    try { c = buildImage(srcId, title); } catch (_) { toast(L('画像の生成に失敗', 'Failed to build image')); return; }
    if (!c) { toast(L('対象が見つかりません', 'Target not found')); return; }
    c.toBlob(blob => {
      if (!blob) { toast(L('画像化に失敗しました', 'Failed to render image')); return; }
      downloadBlob(blob, 'statplay_income.png');
      toast(L('画像を保存しました', 'Saved image'));
    }, 'image/png');
  }
}

function initShare() {
  document.querySelectorAll('.share-btn').forEach(btn => {
    btn.addEventListener('click', () => doShare(btn.dataset.kind, btn.dataset.share, btn.dataset.title));
  });
}

/* ── FAQ accordion ── */
function initFAQ() {
  document.querySelectorAll('.faq-q').forEach(q => {
    q.addEventListener('click', () => {
      const item = q.closest('.faq-item');
      const wasOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(i => i.classList.remove('open'));
      if (!wasOpen) item.classList.add('open');
    });
  });
}

document.addEventListener('DOMContentLoaded', () => { initPredictor(); initShare(); initFAQ(); });
