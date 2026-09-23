import { t as tr, labels } from './multivariate-i18n.js';
import { createPCA } from './multivariate-pca.js';
import { createHero } from './multivariate-hero.js';
import { animate, stopMotion, ease, mix } from './multivariate-motion.js';
import { resizeCanvas, makeAxisMap } from '../utils.js';
import { makeData, fitRegression, standardizePair, cluster, factorValues } from './multivariate-model.js';

const $ = id => document.getElementById(id);
const data = makeData(), fit = fitRegression(data);
const pcaPoints = standardizePair(data, 0, 1);
let pca;
let clusterFrame=null;
let factorPulse=1;
const clusterPoints = data.map(d => [d.x[0], d.x[3]]);
let C;
function palette() {
  const s = getComputedStyle(document.body), get = name => s.getPropertyValue(name).trim();
  return { primary:get('--accent-primary'), narrative:get('--accent-narrative'), third:get('--accent-development-note'), fourth:get('--accent-success'), text:get('--text-emphasis'), dim:get('--text-dim'), grid:get('--grid-line'), bg:get('--surface-panel') };
}
function text(ctx, label, x, y, color=C.text, size=12, align='left') {
  ctx.fillStyle=color; ctx.font=`${size}px 'Hiragino Sans','Segoe UI',sans-serif`; ctx.textAlign=align; ctx.textBaseline='middle'; ctx.fillText(label,x,y);
}
function line(ctx, x1, y1, x2, y2, color=C.grid, width=1, dash=[]) {
  ctx.beginPath(); ctx.strokeStyle=color; ctx.lineWidth=width; ctx.setLineDash(dash); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); ctx.setLineDash([]);
}
function mark(ctx, x, y, color, shape=0, radius=3.8) {
  ctx.beginPath(); ctx.fillStyle=color;
  if(shape===1) ctx.rect(x-radius,y-radius,radius*2,radius*2);
  else if(shape===2) { ctx.moveTo(x,y-radius-1); ctx.lineTo(x+radius+1,y+radius); ctx.lineTo(x-radius-1,y+radius); ctx.closePath(); }
  else if(shape===3) { ctx.moveTo(x,y-radius-1); ctx.lineTo(x+radius+1,y); ctx.lineTo(x,y+radius+1); ctx.lineTo(x-radius-1,y); ctx.closePath(); }
  else ctx.arc(x,y,radius,0,Math.PI*2);
  ctx.fill();
}
function arrow(ctx,x1,y1,x2,y2,color) {
  line(ctx,x1,y1,x2,y2,color,1.5);
  const a=Math.atan2(y2-y1,x2-x1);
  line(ctx,x2,y2,x2-7*Math.cos(a-.5),y2-7*Math.sin(a-.5),color,1.5);
  line(ctx,x2,y2,x2-7*Math.cos(a+.5),y2-7*Math.sin(a+.5),color,1.5);
}
function heatmap() {
  const short=[tr("味", "Taste"),tr("接客", "Service"),tr("静かさ", "Quiet"),tr("席", "Seats"),tr("内装", "Décor"),tr("価格", "Value")];
  const samples=[0,3,1,4,2,5];
  $('heatmap').innerHTML=`<thead><tr><th scope="col">${tr("回答者", "ID")}</th>${short.map((s,i)=>`<th scope="col"><abbr title="${labels[i]}">${s}</abbr></th>`).join('')}</tr></thead><tbody>${samples.map(i=>`<tr><th scope="row">${String(data[i].id).padStart(2,'0')}</th>${data[i].x.map(v=>`<td style="--intensity:${(v*.4).toFixed(1)}%">${Math.round(v)}</td>`).join('')}</tr>`).join('')}</tbody>`;
}
function drawRegression() {
  const values=[...fit.means]; values[0]=+$('reg-taste').value; values[3]=+$('reg-seat').value;
  $('reg-taste-value').textContent=tr(`${values[0]} 点`, `${values[0]} points`); $('reg-seat-value').textContent=tr(`${values[3]} 点`, `${values[3]} points`);
  const contributions=values.map((v,j)=>(v-fit.means[j])*fit.coefficients[j]);
  const prediction=fit.predict(values);
  $('reg-output').textContent=tr(`${prediction.toFixed(1)} 点`, `${prediction.toFixed(1)} points`);
  $('reg-base').textContent=tr(`平均的な回答の予測 ${fit.baseline.toFixed(1)} 点 ＋ 各項目の棒`, `Average-response prediction ${fit.baseline.toFixed(1)} points + contributions`);
  $('reg-summary').textContent=tr(`味を${values[0]}点、席を${values[3]}点に設定。他の4項目は、それぞれの平均値で固定しています。予測値は${prediction.toFixed(1)}点です。`, `Taste ${values[0]}, seating ${values[3]}. The other four ratings stay at their means. Predicted satisfaction: ${prediction.toFixed(1)} points.`);
  const {ctx,w,h}=resizeCanvas($('reg-canvas'));
  const left=w<500?96:128, right=w-44, mid=(left+right)/2;
  const bound=Math.max(10,Math.ceil(Math.max(...contributions.map(Math.abs))/5)*5);
  const {xToPx:axis}=makeAxisMap({w,h,lo:-bound,hi:bound,peak:1,marginLeft:left,marginRight:w-right});
  text(ctx,tr("平均的な回答からの予測値の差（点）", "Change from the average prediction (points)"),w/2,20,C.dim,w<400?11:12,'center');
  [-bound,0,bound].forEach(v=>{line(ctx,axis(v),43,axis(v),h-46,v===0?C.dim:C.grid,1,v===0?[4,4]:[]);text(ctx,`${v>0?'+':''}${v}`,axis(v),h-26,C.dim,12,'center');});
  [0,3].forEach((j,row)=>{
    const label=labels[j],y=80+row*85, value=contributions[j];
    text(ctx,label,8,y,C.text,w<400?11:13);
    const end=axis(value); ctx.fillStyle=value>=0?C.primary:C.narrative;
    if(Math.abs(value)>.00001) ctx.fillRect(Math.min(mid,end),y-10,Math.max(2,Math.abs(end-mid)),20);
    else line(ctx,mid-3,y,mid+3,y,C.dim,2);
    text(ctx,`${value>0?'+':''}${value.toFixed(1)}`,value>=0?end+7:end-7,y,value===0?C.dim:C.text,12,value>=0?'left':'right');
  });
}
function drawFactor() {
  const f=+$('factor-score').value, values=factorValues(f);
  $('factor-value').textContent=f.toFixed(1); $('factor-output').textContent=`${f>=0?'+':''}${f.toFixed(1)}`;
  $('factor-summary').textContent=tr(`共通因子を${f.toFixed(1)}に設定。静かさ ${values[0].toFixed(1)}点、席 ${values[1].toFixed(1)}点、内装 ${values[2].toFixed(1)}点。各項目の固有部分は固定しています。`, `Common factor ${f.toFixed(1)}. Quietness ${values[0].toFixed(1)}, seating ${values[1].toFixed(1)}, décor ${values[2].toFixed(1)} points. Unique components are held fixed.`);
  const {ctx,w,h}=resizeCanvas($('factor-canvas')), mobile=w<500;
  const cx=mobile?54:120, cy=h/2, radius=mobile?35:51, bx=mobile?143:w*.45, ex=w-17;
  ctx.strokeStyle=C.narrative;ctx.lineWidth=1.7;ctx.setLineDash([5,4]);ctx.beginPath();ctx.arc(cx,cy,radius,0,2*Math.PI);ctx.stroke();ctx.setLineDash([]);
  text(ctx,tr("居心地", "Comfort"),cx,cy-10,C.text,mobile?12:16,'center'); text(ctx,tr("（仮定）", "(assumed)"),cx,cy+12,C.dim,11,'center');
  text(ctx,tr("共通因子", "Common factor"),cx,cy-radius-24,C.narrative,12,'center');
  const names=[tr("静かさ", "Quiet"),tr("席の快適さ", "Seating"),tr("内装", "Décor")], loadings=[.85,.75,.65], residual=[-3,4,-1];
  names.forEach((label,j)=>{
    const yy=56+j*(h-112)/2;
    arrow(ctx,cx+radius+3,cy,bx-11,yy+4,C.dim);
    if(factorPulse<1) {
      const phase=(factorPulse*6+j*.07)%1;
      mark(ctx,mix(cx+radius+3,bx-11,phase),mix(cy,yy+4,phase),C.narrative,0,3);
    }
    text(ctx,label,bx,yy-23,C.text,mobile?11:14);
    const {xToPx:scoreX}=makeAxisMap({w,h,lo:0,hi:100,peak:1,marginLeft:bx,marginRight:w-ex});
    ctx.fillStyle=C.grid;ctx.fillRect(bx,yy-9,ex-bx,21);
    ctx.fillStyle=C.primary;ctx.fillRect(bx,yy-9,Math.max(1,scoreX(values[j])-bx),21);
    line(ctx,scoreX(60),yy-13,scoreX(60),yy+15,C.narrative,1.5,[3,3]);
    text(ctx,values[j].toFixed(1),ex,yy-23,C.text,mobile?12:15,'right');
    text(ctx,tr(`重み ${loadings[j]} ／ 固有 ${residual[j]>0?'+':''}${residual[j]}`, `Weight ${loadings[j]} / unique ${residual[j]>0?'+':''}${residual[j]}`),bx,yy+29,C.dim,mobile?10:12);
  });
  text(ctx,tr("点線：基準の60点", "Dashed line: 60-point baseline"),w-18,h-13,C.dim,11,'right');
}
function drawCluster() {
  const k=+document.querySelector('input[name="cluster-k"]:checked').value, model=clusterFrame || cluster(clusterPoints,k);
  const colors=[C.primary,C.narrative,C.third,C.fourth], shapes=['●','■','▲','◆'];
  const counts=model.centers.map((_,j)=>model.groups.filter(g=>g===j).length);
  $('cluster-legend').innerHTML=counts.map((n,j)=>`<span style="color:${colors[j]}">${shapes[j]} G${j+1}: ${tr(`${n}人`, `${n} people`)}</span>`).join('');
  $('cluster-summary').textContent=tr(`${k}グループに分けています。${counts.map((n,j)=>`G${j+1}は${n}人`).join('、')}。${clusterFrame?'十字は現在の中心です。':'十字は各グループの平均位置です。'}`, `${k} groups: ${counts.map((n,j)=>`G${j+1}: ${n} people`).join(', ')}. ${clusterFrame?'Crosses show current centers.':'Crosses show each group’s mean position.'}`);
  const {ctx,w,h}=resizeCanvas($('cluster-canvas')), side=Math.min(w-78,h-84), ox=(w-side)/2+9, oy=33;
  const {xToPx:x,yToPx:y}=makeAxisMap({w,h,lo:0,hi:100,peak:100,marginLeft:ox,marginRight:w-ox-side,marginTop:oy,marginBottom:h-oy-side});
  text(ctx,tr("席の快適さ（点）", "Seating score"),ox,16,C.dim,12);
  [0,25,50,75,100].forEach(v=>{line(ctx,x(v),oy,x(v),oy+side);line(ctx,ox,y(v),ox+side,y(v));text(ctx,String(v),x(v),oy+side+17,C.dim,11,'center');text(ctx,String(v),ox-10,y(v),C.dim,11,'right');});
  if(clusterFrame) clusterPoints.forEach((p,i)=>{
    const center=model.centers[model.groups[i]];ctx.globalAlpha=.18;
    line(ctx,x(p[0]),y(p[1]),x(center[0]),y(center[1]),colors[model.groups[i]],1);ctx.globalAlpha=1;
  });
  clusterPoints.forEach((p,i)=>{ctx.globalAlpha=.85;mark(ctx,x(p[0]),y(p[1]),colors[model.groups[i]],model.groups[i],3.4);ctx.globalAlpha=1;});
  model.centers.forEach((p,j)=>{
    const xx=x(p[0]),yy=y(p[1]);
    line(ctx,xx-7,yy,xx+7,yy,C.bg,5);line(ctx,xx,yy-7,xx,yy+7,C.bg,5);
    line(ctx,xx-7,yy,xx+7,yy,C.text,2);line(ctx,xx,yy-7,xx,yy+7,C.text,2);
    text(ctx,`G${j+1}`,xx+12,yy-11,C.text,12);
  });
  text(ctx,tr("味の評価（点）", "Taste score"),ox+side/2,h-9,C.dim,12,'center');
}
function drawAll() { C=palette(); drawRegression(); pca?.draw(); drawFactor(); drawCluster(); }
heatmap();
$('reg-taste').value=80; $('reg-seat').value=50;
for(const id of ['reg-taste','reg-seat','factor-score']) $(id).addEventListener('input',()=>{
  const key=id==='factor-score'?'factor':'reg';
  const value=$(id).value;stopMotion(key);$(id).value=value;drawAll();
});
document.querySelectorAll('input[name="cluster-k"]').forEach(el=>el.addEventListener('change',()=>{stopMotion('cluster');clusterFrame=null;$('cluster-step').textContent='';drawAll();}));
$('reg-reset').addEventListener('click',()=>{stopMotion('reg');$('reg-taste').value=Math.round(fit.means[0]);$('reg-seat').value=Math.round(fit.means[3]);drawAll();});
$('reg-demo').addEventListener('click',()=>{
  if($('fig-regression').dataset.animating==='true'){stopMotion('reg');return;}
  const from=50,to=70;$('reg-taste').value=from;drawAll();
  $('reg-demo').textContent=tr("■ 停止", "■ Stop");
  animate('reg',2400,t=>{$('reg-taste').value=Math.round(mix(from,to,ease(Math.min(1,t/.8))));drawRegression();},()=>{$('reg-demo').textContent=tr("▶ 味を50→70点に", "▶ Change taste from 50 to 70");drawRegression();});
});
$('factor-demo').addEventListener('click',()=>{
  if($('fig-factor').dataset.animating==='true'){stopMotion('factor');return;}
  $('factor-demo').textContent=tr("■ 停止", "■ Stop");
  animate('factor',3600,t=>{
    const f=t<.5?mix(-1.5,1.5,ease(t*2)):mix(1.5,-1.5,ease(t*2-1));
    $('factor-score').value=f.toFixed(1);factorPulse=t;drawFactor();
  },()=>{factorPulse=1;$('factor-demo').textContent=tr("▶ 共通の動きを見る", "▶ Watch the shared movement");drawFactor();});
});
$('cluster-demo').addEventListener('click',()=>{
  if($('fig-cluster').dataset.animating==='true'){stopMotion('cluster');return;}
  const k=+document.querySelector('input[name="cluster-k"]:checked').value;
  const model=cluster(clusterPoints,k),trace=model.trace;
  $('cluster-demo').textContent=tr("■ 停止", "■ Stop");
  animate('cluster',Math.min(6500,trace.length*900),t=>{
    const position=t*(trace.length-1),i=Math.min(trace.length-1,Math.floor(position)),from=trace[i],to=trace[Math.min(i+1,trace.length-1)],f=ease(position-i);
    const centers=from.centers.map((p,j)=>p.map((v,d)=>mix(v,to.centers[j][d],f)));
    clusterFrame={centers,groups:from.groups};
    $('cluster-step').textContent=to.stage==='move'?tr("中心を、その組の平均位置へ。", "Move each center to its group average."):tr("近い中心の組に分ける。", "Assign points to the nearest center.");
    drawCluster();
  },()=>{clusterFrame=null;$('cluster-demo').textContent=tr("▶ 分かれる過程を見る", "▶ Watch the grouping");$('cluster-step').textContent=tr("中心と所属が変わらなくなったら、完了。", "Done: centers and memberships no longer change.");drawCluster();});
});
window.addEventListener('resize',drawAll);
C=palette();pca=createPCA(pcaPoints,palette);
drawAll();
createHero(data, fit, palette);
document.documentElement.dataset.ready='true';
