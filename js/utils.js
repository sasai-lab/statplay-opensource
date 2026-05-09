/*!
 * StatPlay — shared utilities
 * Copyright (c) 2026 Sasai Lab * Licensed under CC BY-NC 4.0.
 */
export const TAU = Math.PI * 2;
export function $(id){return document.getElementById(id);}
export function rng_normal(mu=0,sd=1){ // Box-Muller
  let u = 0, v = 0;
  while(u === 0) u = Math.random();
  while(v === 0) v = Math.random();
  return mu+sd*Math.sqrt(-2*Math.log(u))*Math.cos(TAU*v);
}
export function rng_exp(lam=1){return -Math.log(1-Math.random())/lam;}
export function rng_uniform(){return Math.random();}
export function rng_bimodal(){return Math.random()<0.5 ? rng_normal(0.25,0.08):rng_normal(0.75,0.08);}

// erf approx (Abramowitz & Stegun)
export function erf(x){
  const a1 = .254829592, a2 = -.284496736, a3 = 1.421413741,
        a4 = -1.453152027, a5 = 1.061405429, p = .3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);
  const t = 1 / (1 + p * x);
  const y=1-(((((a5*t+a4)*t)+a3)*t+a2)*t+a1)*t*Math.exp(-x*x);
  return sign*y;
}
export function normCDF(x,mu=0,sd=1){return 0.5*(1+erf((x-mu)/(sd*Math.SQRT2)));}
export function normPDF(x,mu=0,sd=1){return Math.exp(-.5*((x-mu)/sd)**2)/(sd*Math.sqrt(TAU));}
export function zCritical(alpha){ // two-sided: returns z such that P(|Z|>z)=alpha
  // use bisection on CDF
  let lo=0,hi=6;
  for(let i=0;i<50;i++){
    const m=(lo+hi)/2;
    if(2*(1-normCDF(m))>alpha) lo=m; else hi=m;
  }
  return (lo+hi)/2;
}
// Two-sided β: P(-crit ≤ Z ≤ +crit | mean=delta, sd=1).
// Reused by errs.js (Type I/II canvas) and the error_types column module
// so the math has a single source of truth.
export function betaTwoSided(crit, delta){
  return normCDF(crit, delta, 1) - normCDF(-crit, delta, 1);
}

// log gamma (Lanczos)
export function lgamma(z){
  const g=7;
  const c=[0.99999999999980993,676.5203681218851,-1259.1392167224028,771.32342877765313,
    -176.61502916214059,12.507343278686905,-0.13857109526572012,9.9843695780195716e-6,1.5056327351493116e-7];
  if(z<0.5) return Math.log(Math.PI/Math.sin(Math.PI*z))-lgamma(1-z);
  z -= 1;
  let x = c[0];
  for(let i=1;i<g+2;i++) x+=c[i]/(z+i);
  const t=z+g+0.5;
  return 0.5*Math.log(TAU)+(z+0.5)*Math.log(t)-t+Math.log(x);
}
export function gamma(z){return Math.exp(lgamma(z));}
export function tPDF(x,df){
  return Math.exp(lgamma((df+1)/2)-lgamma(df/2))/Math.sqrt(df*Math.PI)*Math.pow(1+x*x/df,-(df+1)/2);
}
export function chi2PDF(x,df){
  if(x<=0) return 0;
  return Math.exp((df/2-1)*Math.log(x)-x/2-(df/2)*Math.log(2)-lgamma(df/2));
}
export function fPDF(x,d1,d2){
  if(x<=0) return 0;
  const num = d1/2*Math.log(d1*x) + d2/2*Math.log(d2) - (d1+d2)/2*Math.log(d1*x+d2);
  const beta = lgamma(d1/2)+lgamma(d2/2)-lgamma((d1+d2)/2);
  return Math.exp(num-beta)/x;
}

export function withAlpha(hex,a){
  const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
  if(document.body&&document.body.classList.contains('theme-light')) a=Math.min(1,a*1.5);
  return `rgba(${r},${g},${b},${a})`;
}

let _tc=null;
export function themeColors(){
  if(_tc&&_tc._ts===document.body.className) return _tc;
  const s=getComputedStyle(document.documentElement);
  const g=v=>s.getPropertyValue(v).trim();
  const lt=document.body.classList.contains('theme-light');
  _tc={
    cyan:lt?'#1a6b7a':(g('--cyan')||'#00f3ff'),
    magenta:lt?'#7a2060':(g('--magenta')||'#ff2bd6'),
    yellow:lt?'#6b5a00':(g('--yellow')||'#ffe600'),
    purple:lt?'#4a3090':(g('--purple')||'#8b5cff'),
    green:lt?'#1a6040':(g('--green')||'#00ff9c'),
    orange:lt?'#7a4a00':(g('--orange')||'#ff8c00'),
    text:lt?'#1a1a2e':(g('--text')||'#d8f7ff'),
    dim:lt?'#5a6275':(g('--dim')||'#7a8aa6'),
    bg:lt?'#ffffff':(g('--bg')||'#05060f'),
    grid:lt?'rgba(26,26,46,.08)':(g('--grid')||'rgba(0,243,255,.08)'),
    light:lt,
    _ts:document.body.className
  };
  return _tc;
}

export function resizeCanvas(c){
  if(!c||typeof c.getContext!=='function') return {ctx:null,w:0,h:0};
  const raw=window.devicePixelRatio||1;
  const dpr=(Number.isFinite(raw)&&raw>0)?Math.min(raw,8):1;
  const w=c.clientWidth||parseInt(c.getAttribute('width')||300,10);
  const h=c.clientHeight||parseInt(c.getAttribute('height')||300,10);
  if(w<=0||h<=0) return {ctx:null,w:0,h:0};
  c.width = w * dpr;
  c.height = h * dpr;
  const ctx=c.getContext('2d');
  if(!ctx) return {ctx:null,w:0,h:0};
  ctx.setTransform(dpr,0,0,dpr,0,0);
  if(c.getAttribute('aria-busy')==='true') c.removeAttribute('aria-busy');
  return {ctx,w,h};
}

export function drawGrid(ctx,w,h,color){
  if(!ctx||w<=0||h<=0) return;
  if(!color) color=themeColors().grid;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  for(let x=0;x<w;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
  for(let y=0;y<h;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
}
export function neonLine(ctx,pts,color,glow=12,lw=2){
  if(!ctx||!pts||pts.length<2) return;
  const lt=document.body.classList.contains('theme-light');
  ctx.save();
  ctx.shadowBlur=lt?0:glow;ctx.shadowColor=color;ctx.strokeStyle=color;
  ctx.lineWidth=lt?Math.max(lw+0.5,2.5):lw;ctx.lineJoin='round';
  ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.stroke();
  ctx.restore();
}
export function neonFill(ctx,pts,color,alpha=.25){
  if(!ctx||!pts||pts.length<2) return;
  const lt=document.body.classList.contains('theme-light');
  ctx.save();ctx.fillStyle=color;ctx.globalAlpha=lt?Math.min(1,alpha*1.8):alpha;
  ctx.shadowBlur=lt?0:16;ctx.shadowColor=color;
  ctx.beginPath();pts.forEach((p,i)=>{
    const x=Math.round(p[0]),y=Math.round(p[1]);
    i?ctx.lineTo(x,y):ctx.moveTo(x,y);
  });ctx.closePath();ctx.fill();
  ctx.restore();
}

export function throttledDraw(fn){
  let id=0;
  return function(){id||(id=requestAnimationFrame(()=>{id=0;fn();}));};
}
export function debouncedResize(fn,ms=120){
  let t=0;
  return function(){clearTimeout(t);t=setTimeout(fn,ms);};
}

// --- Language helpers ----------------------------------------------------
// Centralised access to the current UI language so modules don't reach for
// `window.__LANG === 'en'` directly (228+ inline checks were drifting in
// shape and were impossible to grep+swap reliably). The ESLint rule
// `no-restricted-syntax` blocks new direct `window.__LANG` reads in js/**.
export function getLang(){
  return (typeof window !== 'undefined' && window.__LANG === 'en') ? 'en' : 'ja';
}
export function isEn(){ return getLang() === 'en'; }

// --- Canvas axis mapping helper -----------------------------------------
// Replaces the dominant `xToPx = x => (x - lo)/(hi - lo) * w` and
// `yToPx = y => h - bot - y/peak * (h - top - bot)` pattern that was
// re-implemented inline across stdnorm/normal/htest/errs/error_types/dist.
// peak is the largest y-value the plot needs to fit (0 maps to the baseline
// at h - marginBottom; peak maps to marginTop). marginLeft/Right let
// modules with side gutters (e.g. proptest) reuse the same builder.
export function makeAxisMap({ w, h, lo, hi, peak,
  marginTop = 0, marginBottom = 0, marginLeft = 0, marginRight = 0 } = {}){
  const innerW = w - marginLeft - marginRight;
  const innerH = h - marginTop - marginBottom;
  const xToPx = x => marginLeft + (x - lo) / (hi - lo) * innerW;
  const yToPx = y => h - marginBottom - (y / peak) * innerH;
  const pxToX = px => lo + (px - marginLeft) / innerW * (hi - lo);
  const axisY = h - marginBottom;
  return { xToPx, yToPx, pxToX, innerW, innerH, axisY };
}

// --- Phase 7: discrete distributions + exponential ------------------------
export function binomPMF(n, k, p){
  if(k < 0 || k > n) return 0;
  if(p <= 0) return k === 0 ? 1 : 0;
  if(p >= 1) return k === n ? 1 : 0;
  const logC = lgamma(n + 1) - lgamma(k + 1) - lgamma(n - k + 1);
  return Math.exp(logC + k * Math.log(p) + (n - k) * Math.log(1 - p));
}
export function poissonPMF(lam, k){
  if(k < 0 || lam <= 0) return k === 0 && lam === 0 ? 1 : 0;
  return Math.exp(-lam + k * Math.log(lam) - lgamma(k + 1));
}
export function expPDF(x, lam){
  if(x < 0) return 0;
  return lam * Math.exp(-lam * x);
}

// --- CDF / p-value / critical-value helpers (moved from dist.js) ---

export function regGammaP(a, x) {
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

export function regGammaQ(a, x) {
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

export function betaCF(x, a, b) {
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

export function regBetaI(x, a, b) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  if (x < (a + 1) / (a + b + 2)) return bt * betaCF(x, a, b) / a;
  return 1 - bt * betaCF(1 - x, b, a) / b;
}

export function tCDF(x, df) {
  if (x <= -30) return 0;
  if (x >= 30) return 1;
  const xt = df / (df + x * x);
  const ib = regBetaI(xt, df / 2, 0.5);
  return x >= 0 ? 1 - 0.5 * ib : 0.5 * ib;
}

export function tCrit(alpha, df) {
  let lo = 0, hi = 50;
  for (let i = 0; i < 60; i++) {
    const m = (lo + hi) / 2;
    if (2 * (1 - tCDF(m, df)) > alpha) lo = m; else hi = m;
  }
  return (lo + hi) / 2;
}

export function chi2CDF(x, k) {
  if (x <= 0) return 0;
  return regGammaP(k / 2, x / 2);
}

export function chi2Pval(x, k) {
  if (x <= 0) return 1;
  return 1 - regGammaP(k / 2, x / 2);
}

export function chi2CritVal(alpha, k) {
  let lo = 0, hi = Math.max(60, k * 4);
  for (let i = 0; i < 60; i++) {
    const m = (lo + hi) / 2;
    if (chi2Pval(m, k) > alpha) lo = m; else hi = m;
  }
  return (lo + hi) / 2;
}

export function fPval(x, d1, d2) {
  if (x <= 0) return 1;
  return 1 - regBetaI(d1 * x / (d1 * x + d2), d1 / 2, d2 / 2);
}

export function fCritVal(alpha, d1, d2) {
  let lo = 0, hi = 40;
  for (let i = 0; i < 60; i++) {
    const m = (lo + hi) / 2;
    if (fPval(m, d1, d2) > alpha) lo = m; else hi = m;
  }
  return (lo + hi) / 2;
}
