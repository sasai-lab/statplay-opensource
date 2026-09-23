import { resizeCanvas, themeColors, withAlpha } from '../../../js/utils.js';
import { betaQuantile } from '../math/beta.js';

export function groupInterval(group, mean, strength) {
  const a = mean * strength + group.successes;
  const b = (1 - mean) * strength + group.trials - group.successes;
  return [betaQuantile(0.025, a, b), betaQuantile(0.975, a, b)];
}

export function drawGroupPlot(canvas, groups, mean, strength, intervals = false) {
  canvas.style.height = `${groups.length * 46 + 76}px`;
  const { ctx, w, h } = resizeCanvas(canvas);
  if (!ctx) return;
  const c = themeColors();
  const left = w < 560 ? 62 : 90;
  const right = w - 20;
  const x = rate => left + rate * (right - left);
  ctx.font = '11px sans-serif';
  ctx.fillStyle = c.dim;
  ctx.fillText('成功率', left, 13);
  [0, .25, .5, .75, 1].forEach(rate => {
    ctx.strokeStyle = withAlpha(c.dim, .18);
    ctx.beginPath(); ctx.moveTo(x(rate), 28); ctx.lineTo(x(rate), h - 28); ctx.stroke();
    ctx.textAlign = 'center'; ctx.fillText(`${rate * 100}%`, x(rate), h - 9);
  });
  ctx.strokeStyle = c.cyan; ctx.setLineDash([4, 4]);
  ctx.beginPath(); ctx.moveTo(x(mean), 26); ctx.lineTo(x(mean), h - 28); ctx.stroke();
  ctx.setLineDash([]);
  groups.forEach((g, index) => {
    const y = 42 + index * 46;
    ctx.textAlign = 'left'; ctx.fillStyle = c.text;
    ctx.fillText(g.label, 5, y - 4);
    ctx.fillStyle = c.dim; ctx.font = '10px sans-serif';
    ctx.fillText(`n=${Math.round(g.trials)}`, 5, y + 11);
    ctx.strokeStyle = withAlpha(c.text, .6); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x(g.observedRate), y); ctx.lineTo(x(g.pooledRate), y); ctx.stroke();
    ctx.fillStyle = c.bg; ctx.strokeStyle = c.magenta;
    ctx.beginPath(); ctx.arc(x(g.observedRate), y, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = c.yellow;
    ctx.beginPath(); ctx.moveTo(x(g.pooledRate), y - 6); ctx.lineTo(x(g.pooledRate) + 6, y);
    ctx.lineTo(x(g.pooledRate), y + 6); ctx.lineTo(x(g.pooledRate) - 6, y); ctx.closePath(); ctx.fill();
    if (intervals) {
      const [low, high] = groupInterval(g, mean, strength);
      ctx.strokeStyle = withAlpha(c.yellow, .65); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x(low), y + 14); ctx.lineTo(x(high), y + 14);
      ctx.moveTo(x(low), y + 11); ctx.lineTo(x(low), y + 17);
      ctx.moveTo(x(high), y + 11); ctx.lineTo(x(high), y + 17); ctx.stroke();
    }
  });
}

export function renderGroupTable(groups, mean, strength, intervals = false) {
  const table = document.getElementById('groupDataTable');
  if (!table) return;
  const pct = n => `${(n * 100).toFixed(1)}%`;
  table.innerHTML = '<caption>各グループの観測と更新後の値</caption><thead><tr><th scope="col">群</th><th scope="col">成功/n</th><th scope="col">観測</th><th scope="col">更新後</th><th scope="col">移動幅</th>' + (intervals ? '<th scope="col">95%区間</th>' : '') + '</tr></thead><tbody>' + groups.map(g => {
    const interval = intervals ? groupInterval(g, mean, strength) : null;
    return `<tr><th scope="row">${g.label}</th><td>${Math.round(g.successes)}/${Math.round(g.trials)}</td><td>${pct(g.observedRate)}</td><td>${pct(g.pooledRate)}</td><td>${(100 * Math.abs(g.pooledRate - g.observedRate)).toFixed(1)}pt</td>${interval ? `<td>${pct(interval[0])}–${pct(interval[1])}</td>` : ''}</tr>`;
  }).join('') + '</tbody>';
}
