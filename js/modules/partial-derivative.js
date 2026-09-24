/* StatPlay Math Lab 01 — partial derivatives as one scroll-driven story.
 *
 * One sticky Canvas 2D stage changes shape as the reader scrolls:
 * a 1D curve → the surface it was cut from → x/y cuts → the tangent plane →
 * directional slopes and the gradient → the flat bottom → least squares.
 * All numbers shown in the DOM come from the pure functions exported below,
 * which scripts/test_partial_derivative.mjs checks against numeric derivatives.
 */
import { themeColors } from '../utils.js';
import {
  DOMAIN_MIN, DOMAIN_MAX, surface, partialX, partialY, secantSlope,
  directionalSlope, gradientNorm, linearChange, actualChange, clampToDomain,
  REG_POINTS, REG_A_RANGE, REG_B_RANGE, sse, sumResiduals, sumXResiduals, dSSEda, dSSEdb,
  leastSquares, fmt,
} from './partial-derivative-model.js';
export {
  DOMAIN_MIN, DOMAIN_MAX, surface, partialX, partialY, numericPartialX,
  numericPartialY, secantSlope, directionalSlope, gradientNorm, linearChange,
  actualChange, clampToDomain, REG_POINTS, REG_A_RANGE, REG_B_RANGE, residuals,
  sse, sumResiduals, sumXResiduals, dSSEda, dSSEdb, leastSquares,
  solveNormalEquations, fmt,
} from './partial-derivative-model.js';

// ---------------------------------------------------------------------------
// Pure math (exported for tests)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Strings for dynamic UI text
// ---------------------------------------------------------------------------
export const STR = {
  ja: {
    caption: [
      'x と y の2つの入力で高さが決まる曲面',
      s => `y = ${s.py} で切った断面を真横から見ている`,
      '点 P から、選んだ向きへ一歩進む',
      s => `y = ${s.py} に固定した切り口（シアンの面）`,
      s => `y = ${s.py} の切り口を横から：傾き = ∂f/∂x`,
      s => `x = ${s.px} の切り口を横から：傾き = ∂f/∂y`,
      '2本の接線を含む平面（接平面）と、x・y 方向の上り下り',
      '真上から見た等高線と勾配',
      '2つの偏微分が両方0になる場所',
      '5つの点と直線、そのずれの大きさ S(a, b)',
      s => `b = ${s.b} に固定して a だけ動かす`,
      s => `a = ${s.a} に固定して b だけ動かす`,
      '∂S/∂a = 0 と ∂S/∂b = 0 の交点',
    ],
    hud: {
      p: 'P', f: 'f(x, y)', secant: 'Δf/Δx', fprime: '接線の傾き', theta: '向き θ', du: 'この向きの坂',
      fx: '∂f/∂x', fy: '∂f/∂y', fixedY: '止めた y', pred: '接平面での変化', actual: '実際の Δf', err: 'ずれ',
      grad: '|∇f|', a: 'a（切片）', b: 'b（傾き）', S: 'S(a, b)', dSa: '∂S/∂a', dSb: '∂S/∂b',
    },
    tanX1D: 'f′', slopeWord: '傾き', dir: '坂', grad: '∇f', mean: '平均の点',
    gesture3d: 'P をドラッグで移動 · 背景ドラッグで回転',
    gestureSide: 'P を曲線に沿ってドラッグ',
    gestureTop: 'ドラッグで P を移動',
    gestureReg: '谷の上の点をドラッグ · スライダーでも操作',
    up: '上り', down: '下り', flat: 'ほぼ平ら',
    summaryMath: s => `点 P (${s.px}, ${s.py}) の高さは ${s.f}。x方向の傾き ∂f/∂x は ${s.fx}、y方向の傾き ∂f/∂y は ${s.fy}。`,
    summaryDir: s => `向き ${s.theta} に進むと、坂は ${s.du}。最も急な上り坂の大きさ |∇f| は ${s.grad}。`,
    summaryReg: s => `直線 y = ${s.a} + ${s.b}x のずれの2乗和 S は ${s.S}。∂S/∂a は ${s.dSa}、∂S/∂b は ${s.dSb}。`,
    stepOf: (i, n) => `${i} / ${n}`,
  },
  en: {
    caption: [
      'A surface whose height depends on two inputs, x and y',
      s => `The slice at y = ${s.py}, seen from the side`,
      'One step from P in the chosen direction',
      s => `The cut with y held at ${s.py} (cyan plane)`,
      s => `The y = ${s.py} slice from the side: slope = ∂f/∂x`,
      s => `The x = ${s.px} slice from the side: slope = ∂f/∂y`,
      'The plane containing both tangents (tangent plane)',
      'Contours and the gradient, seen from above',
      'Where both partial derivatives are zero',
      'Five points, a line, and the size of the misfit S(a, b)',
      s => `Hold b = ${s.b}; move only a`,
      s => `Hold a = ${s.a}; move only b`,
      'Where ∂S/∂a = 0 meets ∂S/∂b = 0',
    ],
    hud: {
      p: 'P', f: 'f(x, y)', secant: 'Δf/Δx', fprime: 'tangent slope', theta: 'direction θ', du: 'slope this way',
      fx: '∂f/∂x', fy: '∂f/∂y', fixedY: 'fixed y', pred: 'plane Δf', actual: 'actual Δf', err: 'gap',
      grad: '|∇f|', a: 'a (intercept)', b: 'b (slope)', S: 'S(a, b)', dSa: '∂S/∂a', dSb: '∂S/∂b',
    },
    tanX1D: 'f′', slopeWord: 'slope', dir: 'slope', grad: '∇f', mean: 'mean point',
    gesture3d: 'Drag P to move · drag background to rotate',
    gestureSide: 'Drag P along the curve',
    gestureTop: 'Drag to move P',
    gestureReg: 'Drag the point on the valley · or use the sliders',
    up: 'uphill', down: 'downhill', flat: 'about flat',
    summaryMath: s => `At P (${s.px}, ${s.py}) the height is ${s.f}. The x-slope ∂f/∂x is ${s.fx}; the y-slope ∂f/∂y is ${s.fy}.`,
    summaryDir: s => `Heading ${s.theta}, the slope is ${s.du}. The steepest uphill slope |∇f| is ${s.grad}.`,
    summaryReg: s => `For the line y = ${s.a} + ${s.b}x, the sum of squared residuals S is ${s.S}. ∂S/∂a is ${s.dSa}; ∂S/∂b is ${s.dSb}.`,
    stepOf: (i, n) => `${i} / ${n}`,
  },
};

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------
function fmtSigned(value, digits = 2) {
  const text = fmt(value, digits);
  return value > 0.5 * 10 ** -digits ? '+' + text : text;
}
function fmtDeg(theta) {
  let d = Math.round(theta * 180 / Math.PI) % 360;
  if (d < 0) d += 360;
  return `${d}°`;
}
function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
  if (!m) return [216, 247, 255];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgba(rgb, a) { return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${Math.max(0, Math.min(1, a)).toFixed(3)})`; }
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const easeInOut = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// ---------------------------------------------------------------------------
// Fields: the math bowl and the least-squares valley share one renderer.
// Render coordinates: X, Y in [-2, 2], Z = height × zs.
// ---------------------------------------------------------------------------
const MATH_ZS = 0.25;
const REG_ZS = 0.05;
const regToX = a => (a - 1) * (4 / 3);
const regToY = b => (b - 0.95) * (8 / 3);
const FIELDS = {
  math: {
    f: surface, fx: partialX, fy: partialY,
    xr: [DOMAIN_MIN, DOMAIN_MAX], yr: [DOMAIN_MIN, DOMAIN_MAX],
    toR: (x, y, z) => [x, y, z * FIELDS.math.zs],
    dX: 1, dY: 1, zs: MATH_ZS, zTop: 12,
    levels: [0.25, 0.75, 1.5, 2.5, 3.5, 5, 6.5, 8, 10],
    tickZ: [0, 2, 4, 6, 8, 10, 12],
  },
  reg: {
    f: sse, fx: dSSEda, fy: dSSEdb,
    xr: [...REG_A_RANGE], yr: [...REG_B_RANGE],
    toR: (a, b, s) => [regToX(a), regToY(b), s * REG_ZS],
    dX: 4 / 3, dY: 8 / 3, zs: REG_ZS, zTop: 62,
    levels: [0.5, 1.5, 3, 5, 8, 12, 18, 26, 36, 48],
    tickZ: [0, 20, 40, 60],
  },
};
const MESH_N = 30;

function buildMesh(field) {
  const n = MESH_N;
  const xs = []; const ys = [];
  for (let i = 0; i <= n; i++) {
    xs.push(lerp(field.xr[0], field.xr[1], i / n));
    ys.push(lerp(field.yr[0], field.yr[1], i / n));
  }
  const verts = [];
  for (let j = 0; j <= n; j++) {
    for (let i = 0; i <= n; i++) {
      const z = field.f(xs[i], ys[j]);
      verts.push({ x: xs[i], y: ys[j], z });
    }
  }
  const quads = [];
  const zMax = field.zTop;
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const k = j * (n + 1) + i;
      const idx = [k, k + 1, k + n + 2, k + n + 1];
      const cx = (xs[i] + xs[i + 1]) / 2; const cy = (ys[j] + ys[j + 1]) / 2;
      const cz = field.f(cx, cy);
      // Raw partials at the quad centre; the render-space normal depends on the current height scale.
      const gx = field.fx(cx, cy) / field.dX;
      const gy = field.fy(cx, cy) / field.dY;
      // Contour segments inside this quad (marching squares).
      const vals = idx.map(v => verts[v].z);
      const pts = idx.map(v => verts[v]);
      const segs = [];
      field.levels.forEach(level => {
        const cross = [];
        for (let e = 0; e < 4; e++) {
          const p = pts[e]; const q = pts[(e + 1) % 4];
          const a = vals[e] - level; const b = vals[(e + 1) % 4] - level;
          if ((a < 0) !== (b < 0)) {
            const t = a / (a - b);
            cross.push([lerp(p.x, q.x, t), lerp(p.y, q.y, t), level]);
          }
        }
        if (cross.length === 2) segs.push(cross);
        else if (cross.length === 4) { segs.push([cross[0], cross[1]]); segs.push([cross[2], cross[3]]); }
      });
      quads.push({ idx, i, j, gx, gy, t: clamp(cz / zMax, 0, 1), segs });
    }
  }
  return { n, xs, ys, verts, quads };
}

// ---------------------------------------------------------------------------
// Camera: orthographic, yaw around the vertical axis, pitch = elevation.
// ---------------------------------------------------------------------------
function makeProjector(cam, rect, box, focus = null) {
  const cyw = Math.cos(cam.yaw); const syw = Math.sin(cam.yaw);
  const cp = Math.cos(cam.pitch); const sp = Math.sin(cam.pitch);
  const raw = (x, y, z) => {
    const u = x * cyw - y * syw;
    const v = x * syw + y * cyw;
    return [u, z * cp + v * sp, v * cp - z * sp];
  };
  let minU = Infinity; let maxU = -Infinity; let minV = Infinity; let maxV = -Infinity;
  for (const x of [box.x0, box.x1]) for (const y of [box.y0, box.y1]) for (const z of [box.z0, box.z1]) {
    const [u, up] = raw(x, y, z);
    minU = Math.min(minU, u); maxU = Math.max(maxU, u); minV = Math.min(minV, up); maxV = Math.max(maxV, up);
  }
  const width = Math.max(1, rect.w - rect.pl - rect.pr);
  const height = Math.max(1, rect.h - rect.pt - rect.pb);
  const s = Math.min(width / Math.max(1e-6, maxU - minU), height / Math.max(1e-6, maxV - minV)) * (box.zoom || 1);
  const ox = rect.x + rect.pl + width / 2 - s * (minU + maxU) / 2;
  const oy = rect.y + rect.pt + height / 2 + s * (minV + maxV) / 2;
  const zoom = focus ? focus.zoom : 1;
  const cx = rect.x + rect.pl + width / 2; const cy = rect.y + rect.pt + height / 2;
  let ax = cx; let ay = cy;
  if (focus && focus.w > 0) {
    const [fu, fup] = raw(focus.x, focus.y, focus.z);
    ax = lerp(cx, ox + s * fu, focus.w); ay = lerp(cy, oy - s * fup, focus.w);
  }
  const project = (x, y, z) => {
    const [u, up, d] = raw(x, y, z);
    return { x: cx + zoom * (ox + s * u - ax), y: cy + zoom * (oy - s * up - ay), d };
  };
  project.scale = s * zoom;
  return project;
}

// ---------------------------------------------------------------------------
// Steps: camera + layer opacities per scroll step.
// ---------------------------------------------------------------------------
// yaw ≈ π/4 puts P = (1, −1) on the right flank with ∇f pointing right and up the screen,
// so P reads as a point on a slope, not as the valley floor.
const CAM_3D = { yaw: 0.8, pitch: 0.52, zs: 0.36 };
const CAM_REG = { yaw: -0.5, pitch: 0.74 };
const LAYER_KEYS = [
  'surf', 'wire', 'contour', 'box', 'top', 'frameX', 'frameY',
  'cutX', 'curveX', 'tanX', 'cutY', 'curveY', 'tanY', 'secant', 'dir', 'grad', 'levelP',
  'plane', 'delta', 'zero', 'trail', 'point',
  'reg', 'rCutA', 'rTanA', 'rCutB', 'rTanB', 'rZero', 'mean', 'resid', 'rTrail',
];
export const STEPS = [
  { id: 'intro', cam: CAM_3D, layers: { surf: 1, wire: 1, contour: .35, box: 1, point: 1 }, hud: ['p', 'f'], idle: true },
  { id: 'single', cam: { yaw: 0, pitch: 0 }, layers: { surf: .06, wire: .12, curveX: 1, tanX: 1, secant: 1, frameX: 1, point: 1 }, hud: ['p', 'secant', 'fprime'], lock: 'x' },
  { id: 'directions', cam: { yaw: 0.8, pitch: 0.6, zoom: 1.2, focus: 0.7, zs: 0.36 }, layers: { surf: 1, wire: 1, contour: .35, box: 1, curveX: .55, dir: 1, point: 1 }, hud: ['p', 'theta', 'du'] },
  { id: 'cut-x', cam: { yaw: 0.3, pitch: 0.4, zs: 0.36 }, layers: { surf: .8, wire: 1, contour: .2, box: 1, cutX: 1, curveX: 1, point: 1 }, hud: ['p', 'fixedY'] },
  { id: 'partial-x', cam: { yaw: 0, pitch: 0 }, layers: { surf: .06, wire: .12, curveX: 1, tanX: 1, frameX: 1, point: 1 }, hud: ['p', 'fx'], lock: 'x' },
  { id: 'partial-y', cam: { yaw: -Math.PI / 2, pitch: 0 }, layers: { surf: .06, wire: .12, curveY: 1, tanY: 1, frameY: 1, point: 1 }, hud: ['p', 'fy'], lock: 'y' },
  { id: 'tangent-plane', cam: { yaw: 0.8, pitch: 0.5, zoom: 1.9, focus: 1, zs: 0.5 }, layers: { surf: .62, wire: .7, box: 1, curveX: .45, curveY: .45, tanX: 1, tanY: 1, plane: 1, delta: 1, point: 1 }, hud: ['fx', 'fy'] },
  { id: 'gradient', cam: { yaw: 0, pitch: Math.PI / 2 }, layers: { surf: .9, wire: .25, contour: 1, top: 1, dir: 1, grad: 1, levelP: 1, point: 1 }, hud: ['fx', 'fy', 'du', 'grad'], mode: 'top' },
  { id: 'zero', cam: { yaw: 0.8, pitch: 0.95, zs: 0.36 }, layers: { surf: 1, wire: .8, contour: .55, box: 1, zero: 1, trail: 1, plane: .75, point: 1 }, hud: ['p', 'fx', 'fy'] },
  { id: 'least-squares', cam: CAM_REG, layers: { reg: 1, resid: 1, rTrail: 1 }, hud: ['a', 'b', 'S'], scene: 'reg' },
  // 10 / 11 mirror 04 / 05: the cut axis runs across the screen, so the tangent's rise matches its sign.
  { id: 'ls-a', cam: { yaw: 0, pitch: 0.35 }, layers: { reg: 1, resid: 1, rCutA: 1, rTanA: 1, mean: 1, rTrail: 1 }, hud: ['a', 'b', 'dSa'], scene: 'reg' },
  { id: 'ls-b', cam: { yaw: -Math.PI / 2, pitch: 0.35 }, layers: { reg: 1, resid: 1, rCutB: 1, rTanB: 1, rTrail: 1 }, hud: ['a', 'b', 'dSb'], scene: 'reg' },
  { id: 'ls-solve', cam: { yaw: -0.5, pitch: 0.98 }, layers: { reg: 1, resid: 1, rZero: 1, mean: .6, rTanA: .7, rTanB: .7, rTrail: 1 }, hud: ['a', 'b', 'dSa', 'dSb'], scene: 'reg' },
];
function layersFor(step) {
  const out = {};
  LAYER_KEYS.forEach(k => { out[k] = step.layers[k] || 0; });
  return out;
}

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------
export function initPartialDerivative() {
  const stage = document.getElementById('partialSurface');
  const stepEls = Array.from(document.querySelectorAll('.pd-step[data-step]'));
  if (!stage || !stepEls.length) return null;

  const lang = document.documentElement.lang === 'en' ? 'en' : 'ja';
  const T = STR[lang];
  const reduced = () => Boolean(window.__REDUCED_MOTION) || (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);

  const els = {
    hud: document.getElementById('pdHud'),
    caption: document.getElementById('pdCaption'),
    progress: document.getElementById('pdProgress'),
    gesture: document.getElementById('partialInteraction'),
    summary: document.getElementById('partialSummary'),
    wave: document.getElementById('pdWave'),
    counter: document.getElementById('pdCounter'),
  };

  const LS = leastSquares();
  const state = {
    step: 0,
    px: 1, py: -1,
    h: 1,
    theta: 0,
    dx: 0.4, dy: -0.2,
    a: 2.0, b: 0.3,
    trail: [],
    rTrail: [],
  };
  const meshes = { math: buildMesh(FIELDS.math), reg: buildMesh(FIELDS.reg) };

  // Current (animated) view and its target.
  const view = { yaw: CAM_3D.yaw, pitch: CAM_3D.pitch, zoom: 1, focus: 0, zs: CAM_3D.zs, layers: layersFor(STEPS[0]) };
  let tween = null;
  let idleT0 = performance.now();
  let userOrbited = false;
  let animating = new Set();
  const projectors = {};

  // ---- canvas sizing -----------------------------------------------------
  let ctx = null; let W = 0; let H = 0; let DPR = 1;
  function ensureCanvas() {
    const w = stage.clientWidth; const h = stage.clientHeight;
    const dpr = Math.min(2.5, Math.max(1, window.devicePixelRatio || 1));
    if (!ctx || w !== W || h !== H || dpr !== DPR) {
      W = w; H = h; DPR = dpr;
      stage.width = Math.max(1, Math.round(w * dpr));
      stage.height = Math.max(1, Math.round(h * dpr));
      ctx = stage.getContext('2d');
    }
    if (ctx) ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    return ctx;
  }

  // ---- colours -----------------------------------------------------------
  let palette = null;
  function colors() {
    const tc = themeColors();
    if (palette && palette._key === tc._ts) return palette;
    const light = Boolean(tc.light);
    palette = {
      _key: tc._ts,
      light,
      cyan: tc.cyan, magenta: tc.magenta, yellow: tc.yellow, green: tc.green, orange: tc.orange, text: tc.text, dim: tc.dim, purple: tc.purple,
      rgb: {
        cyan: hexToRgb(tc.cyan), magenta: hexToRgb(tc.magenta), yellow: hexToRgb(tc.yellow), green: hexToRgb(tc.green),
        orange: hexToRgb(tc.orange), text: hexToRgb(tc.text), dim: hexToRgb(tc.dim), bg: hexToRgb(tc.bg),
      },
      low: light ? [214, 220, 242] : [30, 40, 112],
      high: light ? [196, 178, 242] : [120, 74, 214],
      wire: light ? [52, 60, 110] : [150, 176, 255],
      contour: light ? [40, 44, 80] : [216, 247, 255],
      glow: light ? 0 : 1,
    };
    return palette;
  }

  // The secant partner point must stay inside the drawn domain, so the readout uses the same Δx as the picture.
  const effectiveH = () => Math.max(0.01, Math.min(state.h, DOMAIN_MAX - state.px));

  // ---- values for readouts -----------------------------------------------
  function values() {
    const { px, py, a, b } = state;
    const f = surface(px, py);
    const fx = partialX(px, py);
    const fy = partialY(px, py);
    const du = directionalSlope(px, py, state.theta);
    const pred = linearChange(px, py, state.dx, state.dy);
    const act = actualChange(px, py, state.dx, state.dy);
    return {
      px, py, f, fx, fy, du,
      h: state.h, secant: secantSlope(px, py, effectiveH()),
      theta: state.theta, grad: gradientNorm(px, py), gradAngle: Math.atan2(fy, fx),
      dx: state.dx, dy: state.dy, pred, actual: act, err: act - pred,
      fxdx: fx * state.dx, fydy: fy * state.dy,
      ducos: fx * Math.cos(state.theta), dusin: fy * Math.sin(state.theta),
      a, b, S: sse(a, b), dSa: dSSEda(a, b), dSb: dSSEdb(a, b),
      sumE: sumResiduals(a, b), sumXE: sumXResiduals(a, b),
      lsA: LS.a, lsB: LS.b, meanX: LS.meanX, meanY: LS.meanY,
      aStar: LS.meanY - b * LS.meanX,
    };
  }
  const READ_FORMAT = {
    theta: v => fmtDeg(v), gradAngle: v => fmtDeg(v),
    du: v => fmtSigned(v), fx: v => fmtSigned(v), fy: v => fmtSigned(v), secant: v => fmtSigned(v),
    dSa: v => fmtSigned(v), dSb: v => fmtSigned(v), sumE: v => fmtSigned(v), sumXE: v => fmtSigned(v),
    pred: v => fmtSigned(v, 4), actual: v => fmtSigned(v, 4), err: v => fmtSigned(v, 4),
    fxdx: v => fmtSigned(v, 3), fydy: v => fmtSigned(v, 3), ducos: v => fmtSigned(v), dusin: v => fmtSigned(v),
    S: v => fmt(v, 3),
  };
  const readValue = (key, v) => (READ_FORMAT[key] ? READ_FORMAT[key](v[key]) : fmt(v[key]));

  function hudLabel(key) { return T.hud[key] || key; }
  function hudValue(key, v) {
    if (key === 'p') return `(${fmt(v.px)}, ${fmt(v.py)})`;
    if (key === 'fixedY') return fmt(v.py);
    if (key === 'fprime') return fmtSigned(v.fx);
    if (key === 'du') {
      const word = Math.abs(v.du) < 0.05 ? T.flat : (v.du > 0 ? T.up : T.down);
      return `${fmtSigned(v.du)} ${word}`;
    }
    return readValue(key, v);
  }
  const HUD_CLASS = { fx: 'is-x', fy: 'is-y', secant: 'is-orange', fprime: 'is-x', du: 'is-text', grad: 'is-green', dSa: 'is-x', dSb: 'is-y', err: 'is-orange', pred: 'is-point' };

  let lastSummary = '';
  let summaryTimer = 0;
  function updateDom() {
    const v = values();
    document.querySelectorAll('[data-read]').forEach(el => {
      const key = el.getAttribute('data-read');
      if (key in v) el.textContent = readValue(key, v);
    });
    document.querySelectorAll('[data-bind]').forEach(input => {
      const key = input.getAttribute('data-bind');
      if (document.activeElement === input && input.__dragging) return;
      const raw = key === 'theta' ? Math.round(((state.theta * 180 / Math.PI) % 360 + 360) % 360) : state[key];
      if (Number(input.value) !== raw) input.value = String(raw);
      const out = input.parentElement?.querySelector(`output[data-out="${key}"]`) || document.querySelector(`output[data-out="${key}"]`);
      if (out) out.textContent = key === 'theta' ? fmtDeg(state.theta) : fmt(state[key]);
    });
    // HUD
    const step = STEPS[state.step];
    if (els.hud) {
      const html = step.hud.map(key => `<div class="${HUD_CLASS[key] || ''}"><dt>${hudLabel(key)}</dt><dd>${hudValue(key, v)}</dd></div>`).join('');
      if (els.hud.__html !== html) { els.hud.innerHTML = html; els.hud.__html = html; }
    }
    if (els.caption) {
      const cap = T.caption[state.step];
      const text = typeof cap === 'function' ? cap({ px: fmt(v.px), py: fmt(v.py), a: fmt(v.a), b: fmt(v.b) }) : cap;
      if (els.caption.textContent !== text) els.caption.textContent = text;
    }
    if (els.gesture) {
      const sc = step.scene === 'reg' ? T.gestureReg : step.lock ? T.gestureSide : step.mode === 'top' ? T.gestureTop : T.gesture3d;
      if (els.gesture.textContent !== sc) els.gesture.textContent = sc;
    }
    if (els.counter) els.counter.textContent = T.stepOf(String(state.step).padStart(2, '0'), String(STEPS.length - 1).padStart(2, '0'));
    // Screen-reader summary (throttled so sliders do not flood the live region).
    const sv = {
      px: fmt(v.px), py: fmt(v.py), f: fmt(v.f), fx: fmt(v.fx), fy: fmt(v.fy), theta: fmtDeg(v.theta), du: fmt(v.du), grad: fmt(v.grad),
      a: fmt(v.a), b: fmt(v.b), S: fmt(v.S, 3), dSa: fmt(v.dSa), dSb: fmt(v.dSb),
    };
    const sentence = step.scene === 'reg' ? T.summaryReg(sv) : (step.id === 'directions' || step.id === 'gradient') ? `${T.summaryMath(sv)} ${T.summaryDir(sv)}` : T.summaryMath(sv);
    stage.setAttribute('aria-label', sentence);
    if (sentence !== lastSummary) {
      lastSummary = sentence;
      clearTimeout(summaryTimer);
      summaryTimer = setTimeout(() => { if (els.summary) els.summary.textContent = sentence; }, 350);
    }
    drawWave(v);
    requestDraw();
  }

  // ---- step switching ----------------------------------------------------
  function setStep(index, { instant = false } = {}) {
    index = clamp(index, 0, STEPS.length - 1);
    if (index === state.step && !instant) return;
    const prev = STEPS[state.step];
    state.step = index;
    const step = STEPS[index];
    stepEls.forEach((el, i) => el.classList.toggle('is-active', i === index));
    els.progress?.querySelectorAll('button').forEach((b, i) => {
      b.classList.toggle('is-active', i === index);
      if (i === index) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    });
    stage.dataset.step = step.id;
    userOrbited = false;
    const to = { yaw: step.cam.yaw, pitch: step.cam.pitch, zoom: step.cam.zoom || 1, focus: step.cam.focus || 0, zs: step.cam.zs || MATH_ZS, layers: layersFor(step) };
    const bump = Math.abs(view.pitch) < .08 && Math.abs(to.pitch) < .08 && Math.abs(view.yaw - to.yaw) > .8;
    if (instant || reduced()) {
      view.yaw = to.yaw; view.pitch = to.pitch; view.zoom = to.zoom; view.focus = to.focus; view.zs = to.zs; view.layers = { ...to.layers };
      tween = null;
    } else {
      tween = { from: { yaw: view.yaw, pitch: view.pitch, zoom: view.zoom, focus: view.focus, zs: view.zs, layers: { ...view.layers } }, to, t0: performance.now(), dur: prev && prev.scene !== step.scene ? 900 : 1150, bump };
    }
    idleT0 = performance.now();
    updateDom();
  }

  // Choose the active step from scroll position.
  function pickStep() {
    const mobile = window.innerWidth < 900;
    const line = window.innerHeight * (mobile ? 0.7 : 0.5);
    let best = 0;
    stepEls.forEach((el, i) => {
      const r = el.getBoundingClientRect();
      if (r.top <= line) best = i;
    });
    const last = stepEls[stepEls.length - 1].getBoundingClientRect();
    if (last.bottom < line * 0.4) best = stepEls.length - 1;
    setStep(best);
  }
  let scrollQueued = false;
  window.addEventListener('scroll', () => {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(() => { scrollQueued = false; pickStep(); });
  }, { passive: true });

  // ---- progress dots -----------------------------------------------------
  if (els.progress) {
    els.progress.innerHTML = stepEls.map((el, i) => {
      const label = el.getAttribute('data-label') || String(i);
      return `<li><button type="button" data-goto="${i}" aria-label="${label}" title="${label}"><span></span></button></li>`;
    }).join('');
    els.progress.addEventListener('click', event => {
      const btn = event.target.closest('button[data-goto]');
      if (!btn) return;
      const i = Number(btn.dataset.goto);
      const el = stepEls[i];
      const mobile = window.innerWidth < 900;
      const y = el.getBoundingClientRect().top + window.scrollY - (mobile ? window.innerHeight * 0.52 : window.innerHeight * 0.22);
      window.scrollTo({ top: Math.max(0, y), behavior: reduced() ? 'auto' : 'smooth' });
    });
  }

  // ---- controls ----------------------------------------------------------
  function stepIndexOf(el) {
    const host = el.closest('.pd-step[data-step]');
    return host ? stepEls.indexOf(host) : -1;
  }
  function setValue(key, value) {
    if (key === 'px' || key === 'py') {
      state[key] = clampToDomain(value);
      state.trail = [];
    } else if (key === 'theta') {
      state.theta = value * Math.PI / 180;
    } else if (key === 'a') {
      state.a = clamp(value, REG_A_RANGE[0], REG_A_RANGE[1]); state.rTrail = [];
    } else if (key === 'b') {
      state.b = clamp(value, REG_B_RANGE[0], REG_B_RANGE[1]); state.rTrail = [];
    } else {
      state[key] = value;
    }
  }
  document.querySelectorAll('[data-bind]').forEach(input => {
    input.addEventListener('input', () => {
      animating.delete('secant');
      const key = input.getAttribute('data-bind');
      setValue(key, Number(input.value));
      const idx = stepIndexOf(input);
      if (idx >= 0 && idx !== state.step) setStep(idx);
      updateDom();
    });
    input.addEventListener('pointerdown', () => { input.__dragging = true; });
    input.addEventListener('pointerup', () => { input.__dragging = false; });
  });

  function animateTo(targets, dur = 700, key = 'move') {
    const from = {}; Object.keys(targets).forEach(k => { from[k] = state[k]; });
    const t0 = performance.now();
    animating.add(key);
    if (reduced()) { Object.assign(state, targets); animating.delete(key); updateDom(); return; }
    const tick = now => {
      if (!animating.has(key)) return;
      const t = clamp((now - t0) / dur, 0, 1);
      const e = easeInOut(t);
      Object.keys(targets).forEach(k => { state[k] = lerp(from[k], targets[k], e); });
      if (key === 'solve') state.rTrail.push([state.a, state.b]);
      updateDom();
      if (t < 1) requestAnimationFrame(tick); else animating.delete(key);
    };
    requestAnimationFrame(tick);
  }

  function descend() {
    if (animating.has('descend')) return;
    animating.add('descend');
    state.trail = [[state.px, state.py]];
    let count = 0;
    const eta = 0.14;
    const stepOnce = () => {
      if (!animating.has('descend')) return;
      const gx = partialX(state.px, state.py); const gy = partialY(state.px, state.py);
      if (Math.hypot(gx, gy) < 0.01 || count > 80) { animating.delete('descend'); updateDom(); return; }
      state.px = clampToDomain(state.px - eta * gx);
      state.py = clampToDomain(state.py - eta * gy);
      state.trail.push([state.px, state.py]);
      count++;
      updateDom();
      if (reduced()) stepOnce(); else setTimeout(stepOnce, 70);
    };
    stepOnce();
  }

  const STARTS = [[1.7, 1.3], [-1.6, 1.7], [1.8, -0.2], [-1.2, -1.7], [0.4, 1.9]];
  let startIndex = 0;
  document.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.getAttribute('data-action');
      const idx = stepIndexOf(btn);
      if (idx >= 0 && idx !== state.step) setStep(idx);
      if (action === 'steepest') {
        const target = Math.atan2(partialY(state.px, state.py), partialX(state.px, state.py));
        let delta = target - state.theta;
        delta = Math.atan2(Math.sin(delta), Math.cos(delta));
        animateTo({ theta: state.theta + delta }, 650, 'theta');
      } else if (action === 'halve') {
        animateTo({ dx: state.dx / 2, dy: state.dy / 2 }, 450, 'delta');
      } else if (action === 'delta-reset') {
        animateTo({ dx: 0.4, dy: -0.2 }, 450, 'delta');
      } else if (action === 'descend') {
        descend();
      } else if (action === 'restart') {
        animating.delete('descend');
        const [x, y] = STARTS[startIndex++ % STARTS.length];
        state.trail = [];
        animateTo({ px: x, py: y }, 600, 'move');
      } else if (action === 'solve') {
        state.rTrail = [[state.a, state.b]];
        animateTo({ a: LS.a, b: LS.b }, 1300, 'solve');
      } else if (action === 'best-a') {
        state.rTrail = [[state.a, state.b]];
        animateTo({ a: clamp(LS.meanY - state.b * LS.meanX, REG_A_RANGE[0], REG_A_RANGE[1]) }, 800, 'solve');
      } else if (action === 'reg-reset') {
        state.rTrail = [];
        animateTo({ a: 2.0, b: 0.3 }, 700, 'move');
      } else if (action === 'reset-p') {
        state.trail = [];
        animateTo({ px: 1, py: -1 }, 600, 'move');
      }
    });
  });

  // ---- drawing -----------------------------------------------------------
  let drawQueued = false;
  function requestDraw() {
    if (drawQueued) return;
    drawQueued = true;
    requestAnimationFrame(frame);
  }

  function frame(now) {
    drawQueued = false;
    let again = false;
    if (tween) {
      const t = clamp((now - tween.t0) / tween.dur, 0, 1);
      const e = easeInOut(t);
      view.yaw = lerp(tween.from.yaw, tween.to.yaw, e);
      view.pitch = lerp(tween.from.pitch, tween.to.pitch, e) + (tween.bump ? Math.sin(Math.PI * e) * 0.55 : 0);
      view.zoom = lerp(tween.from.zoom, tween.to.zoom, e);
      view.focus = lerp(tween.from.focus, tween.to.focus, e);
      view.zs = lerp(tween.from.zs, tween.to.zs, e);
      LAYER_KEYS.forEach(k => { view.layers[k] = lerp(tween.from.layers[k], tween.to.layers[k], e); });
      if (t >= 1) tween = null; else again = true;
    }
    const step = STEPS[state.step];
    if (step.idle && !tween && !userOrbited && !reduced()) {
      const t = (now - idleT0) / 1000;
      view.yaw = CAM_3D.yaw + Math.sin(t * 0.35) * 0.22;
      again = true;
    }
    draw();
    if (again) requestDraw();
  }

  function stageRects() {
    const mobile = W < 640;
    const hudH = els.hud ? Math.min(H * 0.3, els.hud.offsetHeight + 16) : 40;
    const base = { x: 0, y: 0, w: W, h: H, pl: mobile ? 14 : 34, pr: mobile ? 42 : 64, pt: Math.max(mobile ? 58 : 70, hudH + 8), pb: mobile ? 40 : 52 };
    const side = Math.max(view.layers.frameX, view.layers.frameY);
    base.pl += side * (mobile ? 18 : 22);
    base.pr += side * (mobile ? 10 : 18);
    const regWide = W > H * 1.05;
    let scatter; let bowl;
    if (regWide) {
      const sw = Math.round(W * 0.4);
      const sh = Math.min(H - base.pt - base.pb, Math.round(sw * 1.05));
      const sy = Math.round(base.pt + (H - base.pt - base.pb - sh) / 2) - 8;
      scatter = { x: 0, y: sy, w: sw, h: sh, pl: 46, pr: 12, pt: 26, pb: 26 };
      bowl = { x: sw, y: 0, w: W - sw, h: H, pl: 10, pr: base.pr, pt: base.pt, pb: base.pb };
    } else {
      const sh = Math.round(H * (mobile ? 0.4 : 0.44));
      scatter = { x: 0, y: 0, w: W, h: sh, pl: mobile ? 40 : 56, pr: base.pr, pt: base.pt, pb: 22 };
      bowl = { x: 0, y: sh, w: W, h: H - sh, pl: mobile ? 4 : base.pl, pr: mobile ? 22 : base.pr, pt: 0, pb: mobile ? 26 : base.pb };
    }
    return { math: base, scatter, bowl };
  }

  function draw() {
    const c = ensureCanvas();
    if (!c) return;
    const C = colors();
    c.clearRect(0, 0, W, H);
    const rects = stageRects();
    const L = view.layers;
    if (L.reg < 0.999) group(c, 1 - L.reg, () => drawMath(c, rects.math, C, L));
    if (L.reg > 0.001) group(c, L.reg, () => drawRegression(c, rects, C, L));
    if (stage.getAttribute('aria-busy') === 'true') stage.removeAttribute('aria-busy');
  }

  function group(c, a, fn) {
    if (a <= 0.004) return;
    const prev = c.globalAlpha;
    c.save();
    c.globalAlpha = prev * a;
    fn();
    c.restore();
  }

  function glowLine(c, pts, color, width, C, dash) {
    if (pts.length < 2) return;
    c.save();
    c.strokeStyle = color;
    c.lineWidth = width;
    c.lineJoin = 'round';
    c.lineCap = 'round';
    if (dash) c.setLineDash(dash);
    if (C.glow) { c.shadowColor = color; c.shadowBlur = 10; }
    c.beginPath();
    pts.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
    c.stroke();
    c.restore();
  }
  function arrowHead(c, from, to, color, size = 9) {
    const ang = Math.atan2(to.y - from.y, to.x - from.x);
    if (!Number.isFinite(ang) || Math.hypot(to.x - from.x, to.y - from.y) < 2) return;
    c.save();
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(to.x, to.y);
    c.lineTo(to.x - size * Math.cos(ang - 0.45), to.y - size * Math.sin(ang - 0.45));
    c.lineTo(to.x - size * Math.cos(ang + 0.45), to.y - size * Math.sin(ang + 0.45));
    c.closePath();
    c.fill();
    c.restore();
  }
  function label(c, text, x, y, color, { align = 'left', size = 12, bold = true, bg = null } = {}) {
    c.save();
    c.font = `${bold ? 'bold ' : ''}${size}px "Courier New", monospace`;
    c.textAlign = align;
    c.textBaseline = 'middle';
    const tw = c.measureText(text).width;
    if (align === 'left' && x + tw > W - 6) x = W - 6 - tw;
    if (bg) {
      const w = tw;
      const x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
      c.fillStyle = bg;
      c.fillRect(x0 - 4, y - size * 0.75, w + 8, size * 1.5);
    }
    c.fillStyle = color;
    c.fillText(text, x, y);
    c.restore();
  }
  function dot(c, p, r, fill, stroke) {
    c.save();
    c.beginPath();
    c.arc(p.x, p.y, r, 0, Math.PI * 2);
    c.fillStyle = fill;
    c.fill();
    if (stroke) { c.lineWidth = 2; c.strokeStyle = stroke; c.stroke(); }
    c.restore();
  }
  function pointMarker(c, p, C, text) {
    c.save();
    if (C.glow) { c.shadowColor = C.yellow; c.shadowBlur = 18; }
    dot(c, p, 7.5, C.yellow);
    c.restore();
    dot(c, p, 7.5, C.yellow, rgba(C.rgb.bg, 1));
    if (text) label(c, text, p.x + 12, p.y - 13, C.yellow, { size: 13 });
  }

  // Surface polygons (depth-sorted together with translucent planes).
  function pushSurface(polys, field, mesh, P, C, L) {
    const proj = mesh.verts.map(v => { const r = field.toR(v.x, v.y, v.z); return P(r[0], r[1], r[2]); });
    const light = [-0.38, -0.52, 0.76];
    const zs = field.zs;
    const surfA = L.surf;
    const wireA = L.wire;
    const contourA = L.contour;
    mesh.quads.forEach(q => {
      const pts = q.idx.map(i => proj[i]);
      const d = (pts[0].d + pts[1].d + pts[2].d + pts[3].d) / 4;
      const nx = -q.gx * zs; const ny = -q.gy * zs; const nl = Math.hypot(nx, ny, 1);
      const lam = Math.max(0, (nx * light[0] + ny * light[1] + light[2]) / nl);
      const shade = C.light ? 0.82 + 0.22 * lam : 0.42 + 0.78 * lam;
      const rgb = [0, 1, 2].map(k => Math.round(clamp(lerp(C.low[k], C.high[k], q.t) * shade, 0, 255)));
      polys.push({
        d,
        draw: c => {
          c.beginPath();
          c.moveTo(pts[0].x, pts[0].y);
          for (let k = 1; k < 4; k++) c.lineTo(pts[k].x, pts[k].y);
          c.closePath();
          if (surfA > 0.004) {
            c.fillStyle = rgba(rgb, (C.light ? 0.8 : 0.78) * surfA);
            c.fill();
          }
          if (wireA > 0.004) {
            c.strokeStyle = rgba(C.wire, (C.light ? 0.16 : 0.17) * wireA * Math.max(surfA, 0.35));
            c.lineWidth = 0.8;
            c.beginPath();
            if (q.i % 2 === 0) { c.moveTo(pts[0].x, pts[0].y); c.lineTo(pts[3].x, pts[3].y); }
            if (q.j % 2 === 0) { c.moveTo(pts[0].x, pts[0].y); c.lineTo(pts[1].x, pts[1].y); }
            c.stroke();
          }
          if (contourA > 0.004 && q.segs.length) {
            c.strokeStyle = rgba(C.contour, (C.light ? 0.4 : 0.34) * contourA);
            c.lineWidth = 1.1;
            c.beginPath();
            q.segs.forEach(([s0, s1]) => {
              const r0 = field.toR(s0[0], s0[1], s0[2]); const r1 = field.toR(s1[0], s1[1], s1[2]);
              const p0 = P(r0[0], r0[1], r0[2]); const p1 = P(r1[0], r1[1], r1[2]);
              c.moveTo(p0.x, p0.y); c.lineTo(p1.x, p1.y);
            });
            c.stroke();
          }
        },
      });
    });
  }

  function pushCutPlane(polys, field, P, axis, value, rgb, a) {
    // axis 'x': plane y = value (x varies). axis 'y': plane x = value.
    const nu = 14; const nz = 5;
    const [t0, t1] = axis === 'x' ? field.xr : field.yr;
    const zTop = field.zTop;
    for (let i = 0; i < nu; i++) {
      for (let k = 0; k < nz; k++) {
        const ta = lerp(t0, t1, i / nu); const tb = lerp(t0, t1, (i + 1) / nu);
        const za = zTop * k / nz; const zb = zTop * (k + 1) / nz;
        const corners = [[ta, za], [tb, za], [tb, zb], [ta, zb]].map(([t, z]) => {
          const r = axis === 'x' ? field.toR(t, value, z) : field.toR(value, t, z);
          return P(r[0], r[1], r[2]);
        });
        const d = corners.reduce((s, p) => s + p.d, 0) / 4;
        polys.push({
          d,
          draw: c => {
            c.beginPath();
            corners.forEach((p, n) => (n ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
            c.closePath();
            c.fillStyle = rgba(rgb, 0.085 * a);
            c.fill();
          },
        });
      }
    }
  }

  function pushTangentPlane(polys, field, P, x0, y0, rgb, a, half = 0.95) {
    const f0 = field.f(x0, y0); const fx = field.fx(x0, y0); const fy = field.fy(x0, y0);
    const n = 8;
    const hx = half / field.dX; const hy = half / field.dY;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const us = [lerp(-hx, hx, i / n), lerp(-hx, hx, (i + 1) / n)];
        const vs = [lerp(-hy, hy, j / n), lerp(-hy, hy, (j + 1) / n)];
        const corners = [[us[0], vs[0]], [us[1], vs[0]], [us[1], vs[1]], [us[0], vs[1]]].map(([u, v]) => {
          const r = field.toR(x0 + u, y0 + v, f0 + fx * u + fy * v);
          return P(r[0], r[1], r[2]);
        });
        const d = corners.reduce((s, p) => s + p.d, 0) / 4 - 0.02;
        polys.push({
          d,
          draw: c => {
            c.beginPath();
            corners.forEach((p, k) => (k ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
            c.closePath();
            c.fillStyle = rgba(rgb, 0.2 * a);
            c.fill();
            c.strokeStyle = rgba(rgb, 0.28 * a);
            c.lineWidth = 0.7;
            c.stroke();
          },
        });
      }
    }
  }

  function tangentPlaneOutline(c, field, P, x0, y0, rgb, a, half = 0.95) {
    const f0 = field.f(x0, y0); const fx = field.fx(x0, y0); const fy = field.fy(x0, y0);
    const hx = half / field.dX; const hy = half / field.dY;
    const pts = [[-hx, -hy], [hx, -hy], [hx, hy], [-hx, hy], [-hx, -hy]].map(([u, v]) => {
      const r = field.toR(x0 + u, y0 + v, f0 + fx * u + fy * v);
      return P(r[0], r[1], r[2]);
    });
    c.save();
    c.strokeStyle = rgba(rgb, 0.75 * a);
    c.lineWidth = 1.4;
    c.setLineDash([6, 5]);
    c.beginPath();
    pts.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
    c.stroke();
    c.restore();
  }

  function curvePoints(field, P, axis, fixed, t0 = null, t1 = null, n = 90) {
    const [a0, a1] = axis === 'x' ? field.xr : field.yr;
    const lo = t0 === null ? a0 : t0; const hi = t1 === null ? a1 : t1;
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const t = lerp(lo, hi, i / n);
      const x = axis === 'x' ? t : fixed; const y = axis === 'x' ? fixed : t;
      const r = field.toR(x, y, field.f(x, y));
      pts.push(P(r[0], r[1], r[2]));
    }
    return pts;
  }

  function tangentSegment(field, P, axis, x0, y0, halfLen) {
    const f0 = field.f(x0, y0);
    const slope = axis === 'x' ? field.fx(x0, y0) : field.fy(x0, y0);
    const hl = halfLen / (axis === 'x' ? field.dX : field.dY);
    const c0 = axis === 'x' ? x0 : y0;
    const [lo, hi] = axis === 'x' ? field.xr : field.yr;
    const pts = [Math.max(-hl, lo - c0), Math.min(hl, hi - c0)].map(t => {
      const x = axis === 'x' ? x0 + t : x0; const y = axis === 'x' ? y0 : y0 + t;
      const r = field.toR(x, y, f0 + slope * t);
      return P(r[0], r[1], r[2]);
    });
    return pts;
  }

  function drawFrame(c, field, P, axis, fixed, C, a, tickT, zTop = field.zTop) {
    // Side-view axes: horizontal axis for `axis`, vertical axis for height.
    const [t0, t1] = axis === 'x' ? field.xr : field.yr;
    const at = (t, z) => {
      const x = axis === 'x' ? t : fixed; const y = axis === 'x' ? fixed : t;
      const r = field.toR(x, y, z);
      return P(r[0], r[1], r[2]);
    };
    c.save();
    c.globalAlpha *= a;
    c.strokeStyle = rgba(C.rgb.dim, 0.75);
    c.lineWidth = 1;
    const base0 = at(t0, 0); const base1 = at(t1, 0);
    const left = base0.x < base1.x ? t0 : t1;
    const vTop = at(left, zTop);
    c.beginPath();
    c.moveTo(base0.x, base0.y); c.lineTo(base1.x, base1.y);
    c.moveTo(at(left, 0).x, at(left, 0).y); c.lineTo(vTop.x, vTop.y);
    c.stroke();
    c.strokeStyle = rgba(C.rgb.dim, 0.16);
    c.beginPath();
    const ticksZ = field.tickZ.filter(z => z <= zTop + 1e-9);
    ticksZ.forEach(z => { if (z === 0) return; const p0 = at(t0, z); const p1 = at(t1, z); c.moveTo(p0.x, p0.y); c.lineTo(p1.x, p1.y); });
    tickT.forEach(t => { const p0 = at(t, 0); const p1 = at(t, zTop); c.moveTo(p0.x, p0.y); c.lineTo(p1.x, p1.y); });
    c.stroke();
    tickT.forEach(t => { const p = at(t, 0); label(c, fmt(t, 0), p.x, p.y + 14, C.dim, { align: 'center', size: 11, bold: false }); });
    ticksZ.forEach(z => { const p = at(left, z); label(c, fmt(z, 0), p.x - 8, p.y, C.dim, { align: 'right', size: 11, bold: false }); });
    const end = base0.x < base1.x ? base1 : base0;
    label(c, axis === 'x' ? 'x' : 'y', end.x + 10, end.y, axis === 'x' ? C.cyan : C.magenta, { size: 14 });
    label(c, 'f', vTop.x, vTop.y - 12, C.yellow, { align: 'center', size: 14 });
    c.restore();
  }

  function drawBox3D(c, field, P, C, a, names) {
    c.save();
    c.globalAlpha *= a;
    const at = (x, y, z) => { const r = field.toR(x, y, z); return P(r[0], r[1], r[2]); };
    const [x0, x1] = field.xr; const [y0, y1] = field.yr;
    c.strokeStyle = rgba(C.rgb.dim, 0.32);
    c.lineWidth = 1;
    c.beginPath();
    [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]].forEach(([x, y], i) => { const p = at(x, y, 0); if (i) c.lineTo(p.x, p.y); else c.moveTo(p.x, p.y); });
    c.stroke();
    // Axis names at the far ends of the floor edges.
    const ex = at(x1 + (x1 - x0) * 0.08, y0 - (y1 - y0) * 0.04, 0);
    const ey = at(x1 + (x1 - x0) * 0.04, y1 + (y1 - y0) * 0.08, 0);
    label(c, names[0], ex.x, ex.y, C.cyan, { align: 'center', size: 14 });
    label(c, names[1], ey.x, ey.y, C.magenta, { align: 'center', size: 14 });
    // Floor ticks.
    const tickC = rgba(C.rgb.dim, 0.9);
    const ticksX = names.ticksX || []; const ticksY = names.ticksY || [];
    ticksX.forEach(t => { const p = at(t, y0, 0); label(c, fmt(t, names.digits ?? 0), p.x, p.y + 12, tickC, { align: 'center', size: 10, bold: false }); });
    ticksY.forEach(t => { const p = at(x1, t, 0); label(c, fmt(t, names.digits ?? 0), p.x + 14, p.y + 6, tickC, { align: 'left', size: 10, bold: false }); });
    c.restore();
  }

  function drawTopAxes(c, field, P, C, a) {
    c.save();
    c.globalAlpha *= a;
    const at = (x, y) => { const r = field.toR(x, y, 0); return P(r[0], r[1], r[2]); };
    c.strokeStyle = rgba(C.rgb.dim, 0.55);
    c.lineWidth = 1;
    c.beginPath();
    const a0 = at(field.xr[0], 0); const a1 = at(field.xr[1], 0);
    const b0 = at(0, field.yr[0]); const b1 = at(0, field.yr[1]);
    c.moveTo(a0.x, a0.y); c.lineTo(a1.x, a1.y); c.moveTo(b0.x, b0.y); c.lineTo(b1.x, b1.y);
    c.stroke();
    label(c, 'x', a1.x + 12, a1.y, C.cyan, { size: 14, align: 'center' });
    label(c, 'y', b1.x, b1.y - 12, C.magenta, { size: 14, align: 'center' });
    [-2, -1, 1, 2].forEach(t => {
      const p = at(t, 0); label(c, fmt(t, 0), p.x, p.y + 12, C.dim, { size: 10, bold: false, align: 'center' });
      const q = at(0, t); label(c, fmt(t, 0), q.x - 10, q.y, C.dim, { size: 10, bold: false, align: 'right' });
    });
    c.restore();
  }

  function levelCurve(field, mesh, P, level) {
    // Marching squares for one level over the whole mesh (used for the contour through P).
    const segs = [];
    const { n, verts } = mesh;
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const k = j * (n + 1) + i;
        const pts = [verts[k], verts[k + 1], verts[k + n + 2], verts[k + n + 1]];
        const cross = [];
        for (let e = 0; e < 4; e++) {
          const p = pts[e]; const q = pts[(e + 1) % 4];
          const a = p.z - level; const b = q.z - level;
          if ((a < 0) !== (b < 0)) { const t = a / (a - b); cross.push([lerp(p.x, q.x, t), lerp(p.y, q.y, t)]); }
        }
        if (cross.length >= 2) segs.push([cross[0], cross[1]]);
        if (cross.length === 4) segs.push([cross[2], cross[3]]);
      }
    }
    return segs.map(([s0, s1]) => {
      const r0 = field.toR(s0[0], s0[1], level); const r1 = field.toR(s1[0], s1[1], level);
      return [P(r0[0], r0[1], r0[2]), P(r1[0], r1[1], r1[2])];
    });
  }

  function drawMath(c, rect, C, L) {
    const field = FIELDS.math;
    field.zs = view.zs;
    const side = Math.max(L.frameX, L.frameY);
    const zView = lerp(field.zTop, 8, side);
    const box = { x0: -2, x1: 2, y0: -2, y1: 2, z0: 0, z1: zView * view.zs };
    const { px, py } = state;
    const f0 = surface(px, py);
    const fr = field.toR(px, py, f0);
    const P = makeProjector(view, rect, box, { x: fr[0], y: fr[1], z: fr[2], w: view.focus, zoom: view.zoom });
    projectors.math = P;
    const at = (x, y, z) => { const r = field.toR(x, y, z); return P(r[0], r[1], r[2]); };

    if (L.box > 0.004) drawBox3D(c, field, P, C, L.box * (1 - 0.6 * view.focus), Object.assign(['x', 'y'], { ticksX: [-1, 0, 1], ticksY: [-1, 0, 1] }));
    if (L.top > 0.004) drawTopAxes(c, field, P, C, L.top);

    const polys = [];
    if (L.surf > 0.004 || L.wire > 0.004) pushSurface(polys, field, meshes.math, P, C, L);
    if (L.cutX > 0.004) pushCutPlane(polys, field, P, 'x', py, C.rgb.cyan, L.cutX);
    if (L.cutY > 0.004) pushCutPlane(polys, field, P, 'y', px, C.rgb.magenta, L.cutY);
    if (L.plane > 0.004) pushTangentPlane(polys, field, P, px, py, C.rgb.yellow, L.plane, state.step === STEPS.findIndex(s => s.id === 'zero') ? 0.7 : 0.95);
    polys.sort((p, q) => q.d - p.d);
    polys.forEach(p => p.draw(c));

    if (L.frameX > 0.004) drawFrame(c, field, P, 'x', py, C, L.frameX, [-2, -1, 0, 1, 2], 8);
    if (L.frameY > 0.004) drawFrame(c, field, P, 'y', px, C, L.frameY, [-2, -1, 0, 1, 2], 8);
    if (L.plane > 0.004) tangentPlaneOutline(c, field, P, px, py, C.rgb.yellow, L.plane, state.step === STEPS.findIndex(s => s.id === 'zero') ? 0.7 : 0.95);

    // Contour through P (gradient step).
    if (L.levelP > 0.004 && f0 > 0.02) {
      c.save();
      c.strokeStyle = rgba(C.rgb.yellow, 0.55 * L.levelP);
      c.lineWidth = 1.6;
      c.setLineDash([5, 4]);
      c.beginPath();
      levelCurve(field, meshes.math, P, f0).forEach(([p0, p1]) => { c.moveTo(p0.x, p0.y); c.lineTo(p1.x, p1.y); });
      c.stroke();
      c.restore();
    }

    // Cut curves.
    if (L.curveX > 0.004) group(c, L.curveX, () => glowLine(c, curvePoints(field, P, 'x', py), C.cyan, 3, C));
    if (L.curveY > 0.004) group(c, L.curveY, () => glowLine(c, curvePoints(field, P, 'y', px), C.magenta, 3, C));

    // Zero lines: ∂f/∂x = 0 is y = -2x; ∂f/∂y = 0 is x = -2y.
    if (L.zero > 0.004) {
      group(c, L.zero, () => {
        const zx = []; const zy = [];
        for (let i = 0; i <= 60; i++) {
          const t = lerp(-1, 1, i / 60);
          zx.push(at(t, -2 * t, surface(t, -2 * t)));
          zy.push(at(-2 * t, t, surface(-2 * t, t)));
        }
        glowLine(c, zx, C.cyan, 2.4, C, [7, 5]);
        glowLine(c, zy, C.magenta, 2.4, C, [7, 5]);
        const lx = zx[8]; const ly = zy[8];
        label(c, '∂f/∂x = 0', lx.x + 8, lx.y - 10, C.cyan, { size: 12, bg: rgba(C.rgb.bg, 0.62) });
        label(c, '∂f/∂y = 0', ly.x + 8, ly.y + 12, C.magenta, { size: 12, bg: rgba(C.rgb.bg, 0.62) });
        const o = at(0, 0, 0);
        c.save(); c.strokeStyle = C.green; c.lineWidth = 2; c.beginPath(); c.arc(o.x, o.y, 10, 0, Math.PI * 2); c.stroke(); c.restore();
      });
    }

    // Descent trail.
    if (L.trail > 0.004 && state.trail.length > 1) {
      group(c, L.trail, () => {
        const pts = state.trail.map(([x, y]) => at(x, y, surface(x, y)));
        glowLine(c, pts, C.green, 2, C);
        pts.forEach(p => dot(c, p, 2.6, C.green));
      });
    }

    // Secant (1D step): P → Q with Δx / Δf guides.
    if (L.secant > 0.004) {
      group(c, L.secant, () => {
        const xq = px + effectiveH();
        const fq = surface(xq, py);
        const p = at(px, py, f0); const q = at(xq, py, fq);
        const m = (fq - f0) / (xq - px || 1e-9);
        const ext = 0.55;
        const e0 = Math.min(ext, px - DOMAIN_MIN); const e1 = Math.min(ext, DOMAIN_MAX - xq);
        const s0 = at(px - e0, py, f0 - m * e0); const s1 = at(xq + e1, py, fq + m * e1);
        glowLine(c, [s0, s1], C.orange, 2, C);
        c.save();
        c.strokeStyle = rgba(C.rgb.dim, 0.9);
        c.setLineDash([4, 4]);
        c.lineWidth = 1.2;
        const corner = at(xq, py, f0);
        c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(corner.x, corner.y); c.lineTo(q.x, q.y); c.stroke();
        c.restore();
        label(c, 'Δx', (p.x + corner.x) / 2, corner.y + 13, C.text, { align: 'center', size: 12 });
        label(c, 'Δf', corner.x + 8, (corner.y + q.y) / 2, C.orange, { size: 12 });
        dot(c, q, 5, C.orange);
      });
    }

    // Tangent lines.
    const tanLen = Math.max(L.frameX, L.frameY) > 0.5 ? 1.25 : 0.85;
    const showTanLabel = (axis, pts, color, text) => {
      if (L.plane > 0.5) return;
      const end = pts[1];
      label(c, text, end.x + 8, end.y + (axis === 'x' ? -10 : 12), color, { size: 12, bg: rgba(C.rgb.bg, 0.6) });
    };
    if (L.tanX > 0.004) {
      group(c, L.tanX, () => {
        const pts = tangentSegment(field, P, 'x', px, py, tanLen);
        glowLine(c, pts, C.cyan, 2.6, C);
        // In 01 the Δf guide sits where this label would go; the HUD already shows the tangent slope.
        if (STEPS[state.step].id !== 'single') showTanLabel('x', pts, C.cyan, `∂f/∂x = ${fmtSigned(partialX(px, py))}`);
      });
    }
    if (L.tanY > 0.004) {
      group(c, L.tanY, () => {
        const pts = tangentSegment(field, P, 'y', px, py, tanLen);
        glowLine(c, pts, C.magenta, 2.6, C);
        showTanLabel('y', pts, C.magenta, `∂f/∂y = ${fmtSigned(partialY(px, py))}`);
      });
    }

    // Tangent-plane prediction: staircase P → +Δx (cyan rise) → +Δy (magenta rise), vs the surface.
    if (L.delta > 0.004) {
      group(c, L.delta, () => {
        const { dx, dy } = state;
        const fx = partialX(px, py); const fy = partialY(px, py);
        const p0 = at(px, py, f0);
        const p1 = at(px + dx, py, f0 + fx * dx);
        const p2 = at(px + dx, py + dy, f0 + fx * dx + fy * dy);
        const qs = at(px + dx, py + dy, surface(px + dx, py + dy));
        glowLine(c, [p0, p1], C.cyan, 3, C);
        glowLine(c, [p1, p2], C.magenta, 3, C);
        c.save();
        c.strokeStyle = C.orange; c.lineWidth = 2.2; c.setLineDash([3, 3]);
        c.beginPath(); c.moveTo(p2.x, p2.y); c.lineTo(qs.x, qs.y); c.stroke();
        c.restore();
        dot(c, p2, 5.5, rgba(C.rgb.bg, 1), C.yellow);
        dot(c, qs, 5, C.orange);
        label(c, T.hud.err, qs.x + 10, (qs.y + p2.y) / 2, C.orange, { size: 12, bg: rgba(C.rgb.bg, 0.6) });
      });
    }

    // Direction arrow (and its x/y components in the top view).
    if (L.dir > 0.004) {
      group(c, L.dir, () => {
        const th = state.theta;
        const len = 0.95;
        const du = directionalSlope(px, py, th);
        const ux = Math.cos(th); const uy = Math.sin(th);
        // Ring of possible directions at P's height.
        c.save();
        c.strokeStyle = rgba(C.rgb.text, 0.22);
        c.setLineDash([3, 4]);
        c.beginPath();
        for (let i = 0; i <= 48; i++) {
          const a = (i / 48) * Math.PI * 2;
          const p = at(px + len * Math.cos(a), py + len * Math.sin(a), f0);
          if (i) c.lineTo(p.x, p.y); else c.moveTo(p.x, p.y);
        }
        c.stroke();
        c.restore();
        const start = at(px, py, f0);
        const end = at(px + len * ux, py + len * uy, f0 + du * len);
        if (L.top > 0.5) {
          const mid = at(px + len * ux, py, f0);
          c.save();
          c.lineWidth = 2; c.setLineDash([4, 4]);
          c.strokeStyle = C.cyan; c.beginPath(); c.moveTo(start.x, start.y); c.lineTo(mid.x, mid.y); c.stroke();
          c.strokeStyle = C.magenta; c.beginPath(); c.moveTo(mid.x, mid.y); c.lineTo(end.x, end.y); c.stroke();
          c.restore();
        } else {
          // The actual path on the surface, faint.
          const path = [];
          for (let i = 0; i <= 30; i++) { const s = len * i / 30; path.push(at(px + s * ux, py + s * uy, surface(px + s * ux, py + s * uy))); }
          glowLine(c, path, rgba(C.rgb.text, 0.35), 1.4, { glow: 0 });
        }
        glowLine(c, [start, end], C.text, 2.6, C);
        arrowHead(c, start, end, C.text, 11);
        label(c, `${T.dir} ${fmtSigned(du)}`, end.x + 10, end.y - 10, C.text, { size: 12, bg: rgba(C.rgb.bg, 0.62) });
      });
    }

    // Gradient arrow.
    if (L.grad > 0.004) {
      group(c, L.grad, () => {
        const gx = partialX(px, py); const gy = partialY(px, py);
        const g = Math.hypot(gx, gy);
        if (g > 1e-6) {
          const len = Math.min(1.5, 0.3 + 0.3 * g);
          const start = at(px, py, f0);
          const end = at(px + len * gx / g, py + len * gy / g, f0);
          glowLine(c, [start, end], C.green, 3.4, C);
          arrowHead(c, start, end, C.green, 13);
          label(c, `${T.grad}  |∇f| = ${fmt(g)}`, end.x + 10, end.y + 14, C.green, { size: 12, bg: rgba(C.rgb.bg, 0.62) });
        }
      });
    }

    if (L.point > 0.004) {
      group(c, L.point, () => {
        const p = at(px, py, f0);
        if (L.box > 0.3 && L.top < 0.5) {
          const g = at(px, py, 0);
          c.save(); c.strokeStyle = rgba(C.rgb.yellow, 0.45); c.setLineDash([3, 4]); c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(g.x, g.y); c.stroke(); c.restore();
        }
        pointMarker(c, p, C, 'P');
        projectors.pointScreen = p;
      });
    }
  }

  function drawRegression(c, rects, C, L) {
    const { scatter, bowl } = rects;
    const field = FIELDS.reg;
    const { a, b } = state;
    // --- scatter panel ---
    const sx0 = -0.5; const sx1 = 4.5; const sy0 = 0; const sy1 = 6;
    const X = x => scatter.x + scatter.pl + (x - sx0) / (sx1 - sx0) * (scatter.w - scatter.pl - scatter.pr);
    const Y = y => scatter.y + scatter.h - scatter.pb - (y - sy0) / (sy1 - sy0) * (scatter.h - scatter.pt - scatter.pb);
    c.save();
    c.strokeStyle = rgba(C.rgb.dim, 0.2);
    c.lineWidth = 1;
    c.beginPath();
    for (let x = 0; x <= 4; x++) { c.moveTo(X(x), Y(sy0)); c.lineTo(X(x), Y(sy1)); }
    for (let y = 0; y <= 6; y += 1) { c.moveTo(X(sx0), Y(y)); c.lineTo(X(sx1), Y(y)); }
    c.stroke();
    c.strokeStyle = rgba(C.rgb.dim, 0.7);
    c.beginPath(); c.moveTo(X(sx0), Y(0)); c.lineTo(X(sx1), Y(0)); c.moveTo(X(sx0), Y(sy0)); c.lineTo(X(sx0), Y(sy1)); c.stroke();
    for (let x = 0; x <= 4; x++) label(c, String(x), X(x), Y(0) + 13, C.dim, { align: 'center', size: 10, bold: false });
    for (let y = 0; y <= 6; y += 2) label(c, String(y), X(sx0) - 8, Y(y), C.dim, { align: 'right', size: 10, bold: false });
    label(c, 'x', X(sx1) - 4, Y(0) - 10, C.dim, { align: 'right', size: 12 });
    label(c, 'y', X(sx0) - 8, Y(sy1) - 12, C.dim, { size: 12, align: 'right' });
    c.restore();
    // residuals
    if (L.resid > 0.004) {
      group(c, L.resid, () => {
        c.save();
        c.strokeStyle = C.orange; c.lineWidth = 2;
        REG_POINTS.forEach(([x, y]) => { c.beginPath(); c.moveTo(X(x), Y(y)); c.lineTo(X(x), Y(a + b * x)); c.stroke(); });
        c.restore();
      });
    }
    // line
    glowLine(c, [{ x: X(sx0), y: Y(a + b * sx0) }, { x: X(sx1), y: Y(a + b * sx1) }], C.yellow, 2.6, C);
    // mean point
    if (L.mean > 0.004) {
      group(c, L.mean, () => {
        const mx = X(LS.meanX); const my = Y(LS.meanY);
        c.save(); c.strokeStyle = C.cyan; c.lineWidth = 2;
        c.beginPath(); c.moveTo(mx - 8, my); c.lineTo(mx + 8, my); c.moveTo(mx, my - 8); c.lineTo(mx, my + 8); c.stroke();
        c.beginPath(); c.arc(mx, my, 11, 0, Math.PI * 2); c.stroke(); c.restore();
        // Upper-left of the mean point is empty for this data (low x, high y); the line label sits bottom-right.
        label(c, `${T.mean} (${fmt(LS.meanX, 0)}, ${fmt(LS.meanY, 0)})`, mx - 14, my - 16, C.cyan, { size: 11, align: 'right', bg: rgba(C.rgb.bg, 0.7) });
      });
    }
    REG_POINTS.forEach(([x, y]) => dot(c, { x: X(x), y: Y(y) }, 5, C.text, rgba(C.rgb.bg, 1)));
    label(c, `y = ${fmt(a)} + ${fmt(b)}x`, scatter.x + scatter.w - scatter.pr - 8, scatter.y + scatter.h - scatter.pb - 14, C.yellow, { size: 12, align: 'right', bg: rgba(C.rgb.bg, 0.7) });
    projectors.scatter = { X, Y };

    // --- loss bowl ---
    const box = { x0: -2, x1: 2, y0: -2, y1: 2, z0: 0, z1: field.zTop * field.zs };
    const P = makeProjector(view, bowl, box);
    projectors.reg = P;
    const at = (aa, bb, s) => { const r = field.toR(aa, bb, s); return P(r[0], r[1], r[2]); };
    drawBox3D(c, field, P, C, 1, Object.assign(['a', 'b'], { ticksX: [0, 1, 2], ticksY: [0.5, 1, 1.5], digits: 1 }));
    const polys = [];
    pushSurface(polys, field, meshes.reg, P, C, { surf: 1, wire: 1, contour: 0.5 });
    if (L.rCutA > 0.004) pushCutPlane(polys, field, P, 'x', b, C.rgb.cyan, L.rCutA);
    if (L.rCutB > 0.004) pushCutPlane(polys, field, P, 'y', a, C.rgb.magenta, L.rCutB);
    polys.sort((p, q) => q.d - p.d);
    polys.forEach(p => p.draw(c));
    const S0 = sse(a, b);
    if (L.rCutA > 0.004) group(c, L.rCutA, () => glowLine(c, curvePoints(field, P, 'x', b), C.cyan, 2.6, C));
    if (L.rCutB > 0.004) group(c, L.rCutB, () => glowLine(c, curvePoints(field, P, 'y', a), C.magenta, 2.6, C));
    const tanLabels = L.rZero < 0.5;
    if (L.rTanA > 0.004) group(c, L.rTanA, () => { const pts = tangentSegment(field, P, 'x', a, b, 0.8); glowLine(c, pts, C.cyan, 2.4, C); if (tanLabels) label(c, `∂S/∂a = ${fmtSigned(dSSEda(a, b))}`, pts[0].x - 8, pts[0].y - 10, C.cyan, { size: 11, align: 'right', bg: rgba(C.rgb.bg, 0.6) }); });
    if (L.rTanB > 0.004) group(c, L.rTanB, () => { const pts = tangentSegment(field, P, 'y', a, b, 0.8); glowLine(c, pts, C.magenta, 2.4, C); if (tanLabels) label(c, `∂S/∂b = ${fmtSigned(dSSEdb(a, b))}`, pts[1].x + 8, pts[1].y + 12, C.magenta, { size: 11, bg: rgba(C.rgb.bg, 0.6) }); });
    if (L.rZero > 0.004) {
      group(c, L.rZero, () => {
        // ∂S/∂a = 0 ⇔ a = ȳ − b x̄ ; ∂S/∂b = 0 ⇔ Σx(y − a − bx) = 0 ⇔ a = (Σxy − bΣx²)/Σx
        let sx = 0; let sxx = 0; let sxy = 0;
        REG_POINTS.forEach(([x, y]) => { sx += x; sxx += x * x; sxy += x * y; });
        const la = []; const lb = [];
        for (let i = 0; i <= 60; i++) {
          const bb = lerp(REG_B_RANGE[0], REG_B_RANGE[1], i / 60);
          const a1 = LS.meanY - bb * LS.meanX; const a2 = (sxy - bb * sxx) / sx;
          if (a1 >= REG_A_RANGE[0] && a1 <= REG_A_RANGE[1]) la.push(at(a1, bb, sse(a1, bb)));
          if (a2 >= REG_A_RANGE[0] && a2 <= REG_A_RANGE[1]) lb.push(at(a2, bb, sse(a2, bb)));
        }
        glowLine(c, la, C.cyan, 2.2, C, [7, 5]);
        glowLine(c, lb, C.magenta, 2.2, C, [7, 5]);
        if (la.length) label(c, '∂S/∂a = 0', la[la.length - 1].x + 6, la[la.length - 1].y - 8, C.cyan, { size: 11, bg: rgba(C.rgb.bg, 0.6) });
        if (lb.length) label(c, '∂S/∂b = 0', lb[0].x + 6, lb[0].y + 12, C.magenta, { size: 11, bg: rgba(C.rgb.bg, 0.6) });
        const o = at(LS.a, LS.b, sse(LS.a, LS.b));
        c.save(); c.strokeStyle = C.green; c.lineWidth = 2; c.beginPath(); c.arc(o.x, o.y, 10, 0, Math.PI * 2); c.stroke(); c.restore();
      });
    }
    if (L.rTrail > 0.004 && state.rTrail.length > 1) {
      group(c, L.rTrail, () => glowLine(c, state.rTrail.map(([aa, bb]) => at(aa, bb, sse(aa, bb))), C.green, 2, C));
    }
    const p = at(a, b, S0);
    pointMarker(c, p, C, '(a, b)');
    projectors.regPoint = p;
  }

  // Directional-slope wave: D(θ) = fx cosθ + fy sinθ.
  function drawWave(v) {
    const canvas = els.wave;
    if (!canvas) return;
    const w = canvas.clientWidth; const h = canvas.clientHeight;
    if (!w || !h) return;
    const dpr = Math.min(2.5, Math.max(1, window.devicePixelRatio || 1));
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
    const c = canvas.getContext('2d');
    if (!c) return;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, w, h);
    if (canvas.getAttribute('aria-busy') === 'true') canvas.removeAttribute('aria-busy');
    const C = colors();
    const pad = { l: 34, r: 10, t: 12, b: 22 };
    const amp = Math.max(1, Math.ceil(v.grad + 0.2));
    const X = th => pad.l + th / (Math.PI * 2) * (w - pad.l - pad.r);
    const Y = val => pad.t + (amp - val) / (2 * amp) * (h - pad.t - pad.b);
    c.strokeStyle = rgba(C.rgb.dim, 0.35); c.lineWidth = 1;
    c.beginPath(); c.moveTo(pad.l, Y(0)); c.lineTo(w - pad.r, Y(0)); c.stroke();
    [0, 90, 180, 270, 360].forEach(d => label(c, `${d}°`, X(d * Math.PI / 180), h - 8, C.dim, { align: 'center', size: 10, bold: false }));
    label(c, fmt(amp, 0), pad.l - 6, Y(amp), C.dim, { align: 'right', size: 10, bold: false });
    label(c, fmt(-amp, 0), pad.l - 6, Y(-amp), C.dim, { align: 'right', size: 10, bold: false });
    const curve = (fn, color, width, dash) => {
      c.save(); c.strokeStyle = color; c.lineWidth = width; if (dash) c.setLineDash(dash);
      c.beginPath();
      for (let i = 0; i <= 120; i++) { const th = Math.PI * 2 * i / 120; const p = [X(th), Y(fn(th))]; if (i) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); }
      c.stroke(); c.restore();
    };
    curve(th => v.fx * Math.cos(th), rgba(C.rgb.cyan, 0.7), 1.3, [4, 3]);
    curve(th => v.fy * Math.sin(th), rgba(C.rgb.magenta, 0.7), 1.3, [4, 3]);
    curve(th => v.fx * Math.cos(th) + v.fy * Math.sin(th), C.text, 2.2);
    const th = ((state.theta % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    dot(c, { x: X(th), y: Y(directionalSlope(v.px, v.py, th)) }, 5, C.text, rgba(C.rgb.bg, 1));
    const gth = ((v.gradAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    if (v.grad > 1e-6) {
      c.save(); c.strokeStyle = C.green; c.setLineDash([2, 3]); c.beginPath(); c.moveTo(X(gth), Y(v.grad)); c.lineTo(X(gth), Y(0)); c.stroke(); c.restore();
      dot(c, { x: X(gth), y: Y(v.grad) }, 4, C.green);
    }
  }

  // ---- pointer interaction ----------------------------------------------
  function localPoint(event) {
    const r = stage.getBoundingClientRect();
    return { x: event.clientX - r.left, y: event.clientY - r.top };
  }
  function searchNearest(fieldKey, target, lockAxis) {
    const field = FIELDS[fieldKey];
    const P = projectors[fieldKey];
    if (!P) return null;
    let best = null;
    let cx = fieldKey === 'math' ? state.px : state.a;
    let cy = fieldKey === 'math' ? state.py : state.b;
    let rx = (field.xr[1] - field.xr[0]) / 2; let ry = (field.yr[1] - field.yr[0]) / 2;
    let ox = (field.xr[0] + field.xr[1]) / 2; let oy = (field.yr[0] + field.yr[1]) / 2;
    for (let pass = 0; pass < 4; pass++) {
      const n = pass === 0 ? 36 : 10;
      for (let j = 0; j <= (lockAxis === 'x' ? 0 : n); j++) {
        const y = lockAxis === 'x' ? cy : clamp(oy - ry + 2 * ry * j / n, field.yr[0], field.yr[1]);
        for (let i = 0; i <= (lockAxis === 'y' ? 0 : n); i++) {
          const x = lockAxis === 'y' ? cx : clamp(ox - rx + 2 * rx * i / n, field.xr[0], field.xr[1]);
          const r = field.toR(x, y, field.f(x, y));
          const p = P(r[0], r[1], r[2]);
          const dist = Math.hypot(p.x - target.x, p.y - target.y);
          if (!best || dist < best.dist) best = { x, y, dist };
        }
      }
      ox = best.x; oy = best.y; rx /= 5; ry /= 5;
    }
    return best;
  }

  let gesture = null;
  function hitTest(pt) {
    const step = STEPS[state.step];
    if (step.scene === 'reg') {
      const p = projectors.regPoint;
      return p && Math.hypot(pt.x - p.x, pt.y - p.y) < 34 ? 'reg-point' : 'reg-orbit';
    }
    const p = projectors.pointScreen;
    const near = p && Math.hypot(pt.x - p.x, pt.y - p.y) < 34;
    if (step.mode === 'top') return 'point';
    if (near) return 'point';
    if (step.lock) return 'point';
    return 'orbit';
  }
  stage.addEventListener('pointerdown', event => {
    const pt = localPoint(event);
    const mode = hitTest(pt);
    gesture = { mode, lastX: event.clientX, lastY: event.clientY, id: event.pointerId };
    stage.setPointerCapture?.(event.pointerId);
    stage.classList.add('is-grabbing');
    animating.delete('descend');
    if (mode === 'point' || mode === 'reg-point') moveByPointer(pt, mode);
  });
  stage.addEventListener('touchstart', event => {
    const t = event.touches[0];
    if (!t) return;
    const r = stage.getBoundingClientRect();
    const mode = hitTest({ x: t.clientX - r.left, y: t.clientY - r.top });
    const p = mode === 'reg-point' ? projectors.regPoint : projectors.pointScreen;
    const near = p && Math.hypot(t.clientX - r.left - p.x, t.clientY - r.top - p.y) < 40;
    if ((mode === 'point' || mode === 'reg-point') && near) event.preventDefault();
  }, { passive: false });
  function moveByPointer(pt, mode) {
    const step = STEPS[state.step];
    if (mode === 'reg-point') {
      const best = searchNearest('reg', pt, null);
      if (best) { state.a = best.x; state.b = best.y; state.rTrail = []; updateDom(); }
      return;
    }
    const best = searchNearest('math', pt, step.lock || null);
    if (best) { state.px = best.x; state.py = best.y; state.trail = []; updateDom(); }
  }
  stage.addEventListener('pointermove', event => {
    const pt = localPoint(event);
    if (!gesture) {
      const mode = hitTest(pt);
      stage.classList.toggle('is-point-hover', mode === 'point' || mode === 'reg-point');
      return;
    }
    if (gesture.mode === 'point' || gesture.mode === 'reg-point') {
      moveByPointer(pt, gesture.mode);
    } else {
      const dx = event.clientX - gesture.lastX; const dy = event.clientY - gesture.lastY;
      tween = null;
      userOrbited = true;
      view.yaw = clamp(view.yaw + dx * 0.008, -0.6, 1.2);
      view.pitch = clamp(view.pitch + dy * 0.006, 0.12, 1.35);
      requestDraw();
    }
    gesture.lastX = event.clientX; gesture.lastY = event.clientY;
  });
  function endGesture(event) {
    if (!gesture) return;
    gesture = null;
    stage.classList.remove('is-grabbing');
    if (stage.hasPointerCapture?.(event.pointerId)) stage.releasePointerCapture(event.pointerId);
  }
  stage.addEventListener('pointerup', endGesture);
  stage.addEventListener('pointercancel', endGesture);
  stage.addEventListener('pointerleave', () => stage.classList.remove('is-point-hover'));

  stage.addEventListener('keydown', event => {
    const step = STEPS[state.step];
    const k = event.key;
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(k)) return;
    event.preventDefault();
    const big = event.shiftKey ? 5 : 1;
    const dh = (k === 'ArrowRight' ? 1 : k === 'ArrowLeft' ? -1 : 0);
    const dv = (k === 'ArrowUp' ? 1 : k === 'ArrowDown' ? -1 : 0);
    if (step.scene === 'reg') {
      setValue('a', state.a + dh * 0.02 * big);
      setValue('b', state.b + dv * 0.01 * big);
    } else {
      if (step.lock !== 'y') setValue('px', state.px + (step.lock === 'x' ? dh || dv : dh) * 0.05 * big);
      if (step.lock !== 'x') setValue('py', state.py + (step.lock === 'y' ? dh || dv : dv) * 0.05 * big);
    }
    updateDom();
  });

  // ---- lifecycle -----------------------------------------------------------
  let resizeTimer = 0;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { updateDom(); pickStep(); }, 80); });
  new MutationObserver(() => { palette = null; updateDom(); }).observe(document.body, { attributes: true, attributeFilter: ['class'] });

  const api = {
    state, values, setStep, steps: STEPS.map(s => s.id),
    project: () => ({ point: projectors.pointScreen, reg: projectors.regPoint }),
    screenOf: (x, y) => {
      const field = FIELDS.math;
      const r = field.toR(x, y, field.f(x, y));
      return projectors.math ? projectors.math(r[0], r[1], r[2]) : null;
    },
    refresh: () => updateDom(),
    drawNow: () => draw(),
    view,
  };
  stage.__pd = api;
  setStep(0, { instant: true });
  pickStep();
  updateDom();
  return api;
}

if (typeof document !== 'undefined' && document.getElementById('partialSurface')) initPartialDerivative();
