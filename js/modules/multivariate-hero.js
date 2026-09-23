import { t as tr } from './multivariate-i18n.js';
import { resizeCanvas } from '../utils.js';
import { animate, stopMotion, ease, mix, onSceneVisible } from './multivariate-motion.js';
import { standardizePair, principalAngle, projection, cluster, factorValues } from './multivariate-model.js';

// One stage, five views: these are separate analyses of the same teaching example.
export function createHero(data, fit, palette) {
  const root = document.getElementById('fig-hero');
  if (!root) return;
  const canvas = document.getElementById('hero-canvas');
  const buttons = [...root.querySelectorAll('[data-method]')];
  const play = document.getElementById('hero-play');
  const summary = document.getElementById('hero-summary');
  const caption = document.getElementById('hero-caption');
  const detail = document.getElementById('hero-detail');
  const names = [tr("味", "Taste"), tr("接客", "Service"), tr("静かさ", "Quiet"), tr("席", "Seats"), tr("内装", "Décor"), tr("価格", "Value")];
  const sample = [0, 3, 1, 4, 2, 5];
  const points = standardizePair(data, 0, 1);
  const projected = projection(points, principalAngle(points)).scores;
  const grouping = cluster(data.map(d => [d.x[0], d.x[3]]), 3);
  const scenes = [
    { duration:3500, name:tr("カフェのアンケートから", "Starting with a café survey"), text:tr("まずは、カフェのアンケートを並べてみます。", "First, let's lay out the café survey responses."), note:tr("架空のカフェアンケート90人分から、6人を表示", "Six responses from a fictional survey of 90 people"), target:'mv-1', link:tr("このデータを見る", "See the data") },
    { duration:4500, name:tr("満足度を予測してみる · 重回帰分析", "Predicting satisfaction · Multiple regression"), text:tr("味の点数と一緒に、予測の数字も動いていきます。", "The taste score changes, and the prediction moves with it."), note:tr("味の評価だけを変え、ほかの5項目は平均値に固定", "Only taste changes; the other five ratings stay at their means"), target:'mv-2', link:tr("重回帰分析を試す", "Try multiple regression") },
    { duration:6000, name:tr("一本の軸にまとめてみる · 主成分分析", "Two ratings, one axis · PCA"), text:tr("点が一本の軸に移る様子を、追ってみます。", "Follow the points as they move onto one axis."), note:tr("味・接客の2項目を標準化 → 一本の軸", "Standardized taste and service → one axis"), target:'mv-3', link:tr("主成分分析を試す", "Try PCA") },
    { duration:4500, name:tr("共通するものがあるとしたら · 因子分析", "Something in common · Factor analysis"), text:tr("「居心地」という共通因子を、仮に置いてみます。", "Suppose there is a common factor called “comfort”."), note:tr("共通因子を仮定した模式図。データから推定した結果ではありません。", "An assumed factor model, not a result estimated from the data."), target:'mv-4', link:tr("因子分析を試す", "Try the factor model") },
    { duration:4500, name:tr("似た回答をまとめてみる · クラスター分析", "Grouping similar responses · Cluster analysis"), text:tr("似た回答が、どんなふうにまとまるか見てみます。", "Let's see how similar responses form groups."), note:tr("味・席の2項目で分類。点の位置は変わりません。", "Grouped by taste and seating. The observed points stay put."), target:'mv-5', link:tr("クラスター分析を試す", "Try clustering") }
  ];
  const total = scenes.reduce((s, scene) => s + scene.duration, 0);
  let active = 0, progress = 1, running = false;
  const clamp = t => Math.max(0, Math.min(1, t));
  const phase = (t, a, b) => ease(clamp((t-a)/(b-a)));

  function label(ctx, value, x, y, color, size=13, align='center') {
    ctx.fillStyle=color; ctx.font=`${size}px 'Hiragino Sans',sans-serif`;
    ctx.textAlign=align; ctx.textBaseline='middle'; ctx.fillText(value,x,y);
  }
  function line(ctx,x1,y1,x2,y2,color,width=1) {
    ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
  }
  function dot(ctx,x,y,color,shape=0,r=3) {
    ctx.fillStyle=color;ctx.beginPath();
    if(shape===1) ctx.rect(x-r,y-r,r*2,r*2);
    else if(shape===2) {ctx.moveTo(x,y-r-1);ctx.lineTo(x+r+1,y+r);ctx.lineTo(x-r-1,y+r);ctx.closePath();}
    else ctx.arc(x,y,r,0,Math.PI*2);
    ctx.fill();
  }
  function table(ctx,w,h,C,t,opacity=1) {
    const pad=w<500?6:Math.max(24,w*.12), gap=w<500?4:8, cw=(w-2*pad)/6;
    const row=(h-68)/6, start=40;
    ctx.globalAlpha=opacity;
    names.forEach((name,j)=>label(ctx,name,pad+(j+.5)*cw,21,C.dim,w<500?11:13));
    sample.forEach((index,i)=>data[index].x.forEach((value,j)=>{
      const x=pad+j*cw+gap/2, y=start+i*row;
      ctx.globalAlpha=opacity*(.10+value/350);
      ctx.fillStyle=C.primary;ctx.fillRect(x,y,cw-gap,row-5);
      ctx.globalAlpha=opacity;
      label(ctx,String(Math.round(value)),x+(cw-gap)/2,y+(row-5)/2,C.text,w<500?12:16);
    }));
    const current=Math.min(5,Math.floor(t*6));
    ctx.strokeStyle=C.primary;ctx.lineWidth=1.5;
    ctx.strokeRect(pad,start+current*row-1,w-2*pad,row-3);
    ctx.globalAlpha=1;
  }
  function pca(ctx,w,h,C,t) {
    const mobile=w<550, reveal=phase(t,0,.24), move=phase(t,.36,.88);
    const cx=mobile?w*.5:w*.25, cy=mobile?h*.31:h*.52;
    const scale=mobile?Math.min(w*.78,h*.40)/5.6:Math.min(w*.36,h*.74)/5.6;
    const targetX=mobile?w*.5:w*.76, targetY=mobile?h*.80:cy;
    const targetScale=(mobile?w*.78:w*.40)/6.6;
    if(reveal<1) table(ctx,w,h,C,1,1-reveal);
    ctx.save();ctx.globalAlpha=reveal;
    line(ctx,cx-2.5*scale,cy,cx+2.5*scale,cy,C.grid);
    line(ctx,cx,cy-2.5*scale,cx,cy+2.5*scale,C.grid);
    line(ctx,targetX-3.1*targetScale,targetY,targetX+3.1*targetScale,targetY,C.narrative,1.5);
    label(ctx,tr("味・接客の点数", "Taste and service"),cx,mobile?12:18,C.dim,12);
    label(ctx,tr("一本の軸にまとめる", "One axis"),targetX,mobile?targetY+30:18,C.narrative,12);
    points.forEach((p,i)=>{
      const ox=cx+p[0]*scale, oy=cy-p[1]*scale;
      const tx=targetX+projected[i]*targetScale;
      const row=sample.indexOf(i);
      ctx.globalAlpha=reveal*(1-move*.70);dot(ctx,ox,oy,C.dim,0,2.5);
      if(row>=0 && move>0) {ctx.globalAlpha=.25*reveal;line(ctx,ox,oy,tx,targetY,C.narrative);}
      ctx.globalAlpha=row>=0?1:reveal;
      const sx=row>=0?mix(w/2,ox,reveal):ox;
      const sy=row>=0?mix(40+(row+.5)*(h-68)/6,oy,reveal):oy;
      dot(ctx,mix(sx,tx,move),mix(sy,targetY,move),row>=0?C.primary:C.narrative,0,row>=0?3.5:2.5);
    });ctx.restore();
  }
  function clusters(ctx,w,h,C,t) {
    const pad=w<500?35:70, left=pad, right=w-pad, top=26, bottom=h-38;
    const px=v=>left+v/100*(right-left), py=v=>bottom-v/100*(bottom-top);
    const colors=[C.primary,C.narrative,C.third];
    line(ctx,left,bottom,right,bottom,C.dim);line(ctx,left,top,left,bottom,C.dim);
    label(ctx,tr("味", "Taste"),(left+right)/2,bottom+29,C.dim,12);label(ctx,tr("席", "Seats"),left-14,top,C.dim,12);
    [0,50,100].forEach(v=>{label(ctx,String(v),px(v),bottom+15,C.dim,10);if(v)line(ctx,left,py(v),right,py(v),C.grid);});
    const reveal=phase(t,.12,.78);
    data.forEach((d,i)=>{
      const group=grouping.groups[i], visible=i/data.length<reveal;
      if(visible) {
        const center=grouping.centers[group];ctx.globalAlpha=.18;
        line(ctx,px(d.x[0]),py(d.x[3]),px(center[0]),py(center[1]),colors[group]);ctx.globalAlpha=1;
      }
      dot(ctx,px(d.x[0]),py(d.x[3]),visible?colors[group]:C.dim,visible?group:0,w<500?2.6:3.6);
    });
    grouping.centers.forEach((center,j)=>{ctx.globalAlpha=reveal;const x=px(center[0]),y=py(center[1]);line(ctx,x-7,y,x+7,y,colors[j],2);line(ctx,x,y-7,x,y+7,colors[j],2);});
    ctx.globalAlpha=1;
  }
  function regression(ctx,w,h,C,t) {
    const values=[...fit.means];values[0]=mix(45,85,phase(t,.12,.90));
    const start=w<500?56:70, span=w<500?w*.26:w*.31, join=w*.64, result=w*.82, middle=h*.48;
    values.forEach((value,j)=>{
      const y=34+j*(h-64)/6;
      label(ctx,names[j],start-10,y,C.dim,w<500?11:13,'right');
      ctx.fillStyle=C.grid;ctx.fillRect(start,y-8,span,16);
      ctx.fillStyle=j===0?C.primary:C.narrative;ctx.fillRect(start,y-8,span*value/100,16);
      label(ctx,String(Math.round(value)),start+span+6,y,C.text,11,'left');
      const sx=start+span+30;
      line(ctx,sx,y,join,middle,C.grid);
      const travel=clamp(t*2-j*.12);
      dot(ctx,mix(sx,join,travel),mix(y,middle,travel),C.primary,0,2.5);
    });
    const prediction=fit.predict(values).toFixed(1), fontSize=w<500?26:44;
    ctx.font=`${fontSize}px 'Hiragino Sans',sans-serif`;
    const numberLeft=result-ctx.measureText(prediction).width/2;
    const connectorEnd=numberLeft-14;
    if(connectorEnd>join) line(ctx,join,middle,connectorEnd,middle,C.primary,1.5);
    label(ctx,tr("総合満足度の", "Satisfaction"),result,middle-49,C.dim,w<500?11:13);
    label(ctx,tr("予測", "Prediction"),result,middle-29,C.dim,w<500?11:13);
    label(ctx,prediction,result,middle+4,C.primary,fontSize);
    label(ctx,tr("点", "points"),result,middle+39,C.dim,12);
  }
  function factor(ctx,w,h,C,t) {
    const values=factorValues(mix(-1.4,1.4,phase(t,.08,.90)));
    const x=w*.22, y=h*.45, radius=Math.min(48,w*.15), start=w*.58, span=w*.32;
    ctx.strokeStyle=C.narrative;ctx.lineWidth=1.5;ctx.setLineDash([5,5]);ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
    label(ctx,tr("共通因子", "Common factor"),x,y,C.narrative,w<500?12:16);
    label(ctx,tr("「居心地」と仮定", "Assume “comfort”"),x,y+radius+23,C.dim,w<500?10:12);
    values.forEach((v,j)=>{
      const yy=48+j*(h-92)/3;
      line(ctx,x+radius,y,start-10,yy,C.dim);
      const travel=clamp(t*1.8);dot(ctx,mix(x+radius,start-10,travel),mix(y,yy,travel),C.narrative,0,3);
      label(ctx,[tr("静かさ", "Quiet"),tr("席", "Seats"),tr("内装", "Décor")][j],start,yy-22,C.dim,12,'left');
      ctx.fillStyle=C.grid;ctx.fillRect(start,yy-7,span,14);
      ctx.fillStyle=C.narrative;ctx.fillRect(start,yy-7,span*v/100,14);
      label(ctx,tr(`${v.toFixed(0)}点`, `${v.toFixed(0)} points`),start+span,yy+21,C.text,12,'right');
    });
  }
  const renderers=[table,regression,pca,factor,clusters];
  function draw() {
    const {ctx,w,h}=resizeCanvas(canvas);
    renderers[active](ctx,w,h,palette(),progress);
    root.dataset.scene=String(active);root.dataset.progress=progress.toFixed(3);
  }
  function choose(index) {
    active=index;const scene=scenes[index];
    buttons.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));
    document.getElementById('hero-method-name').textContent=scene.name;
    document.getElementById('hero-count').textContent=`0${index+1} / 05`;
    summary.textContent=scene.text;caption.textContent=scene.note;
    detail.textContent=`${scene.link} ↓`;detail.href=`#${scene.target}`;
  }
  function done() {running=false;play.textContent=tr("はじめから見る", "Watch from the start");draw();}
  function start(index=null) {
    stopMotion('hero');running=true;play.textContent=tr("一時停止", "Pause");
    animate('hero',index===null?total:scenes[index].duration,t=>{
      t=clamp(t);
      let next=index, local=t;
      if(index===null) {
        let elapsed=t*total;next=0;
        while(next<scenes.length-1 && elapsed>=scenes[next].duration) {elapsed-=scenes[next].duration;next++;}
        local=clamp(elapsed/scenes[next].duration);
      }
      if(next!==active)choose(next);
      progress=local;draw();
    },done);
  }
  buttons.forEach((button,i)=>button.addEventListener('click',()=>start(i)));
  play.addEventListener('click',()=>{if(running)stopMotion('hero');else start();});
  choose(0);draw();window.addEventListener('resize',draw);
  onSceneVisible(root.querySelector('.mv-hero-visual'),()=>start(),'hero');
}
