import { t as tr } from './multivariate-i18n.js';
import { resizeCanvas, makeAxisMap } from '../utils.js';
import { projection, principalAngle } from './multivariate-model.js';
import { animate, stopMotion, ease, mix, onSceneVisible } from './multivariate-motion.js';

export function createPCA(points,getColors) {
  const $=id=>document.getElementById(id), canvas=$('pca-canvas'), slider=$('pca-angle');
  const best=principalAngle(points), bad=best-90;
  const goodScores=projection(points,best).scores, badScores=projection(points,bad).scores;
  let chosen=[0,1], merit=-1;
  for(let i=0;i<points.length;i++) for(let j=i+1;j<points.length;j++) {
    const score=Math.abs(goodScores[i]-goodScores[j])/(1+30*Math.abs(badScores[i]-badScores[j]));
    if(score>merit){merit=score;chosen=[i,j];}
  }
  // A is the lower-score person, B the higher-score person. Identities never swap.
  const pair=chosen.sort((a,b)=>goodScores[a]-goodScores[b]);
  let angle=bad, travel=1, geo, dragging=false, touched=false, movie=false;
  slider.value=Math.round(angle);
  function draw() {
    const mobile=canvas.clientWidth<600;
    canvas.style.height=`${mobile?Math.min(canvas.clientWidth-64,260)+340:480}px`;
    const C=getColors(), p=projection(points,angle), {ctx,w,h}=resizeCanvas(canvas);
    const side=Math.min(mobile?w-64:w*.48-40,mobile?260:340), ox=mobile?(w-side)/2:37, oy=55;
    const {xToPx:x,yToPx:y}=makeAxisMap({w,h,lo:-3.4,hi:3.4,yLo:-3.4,yHi:3.4,marginLeft:ox,marginRight:w-ox-side,marginTop:oy,marginBottom:h-oy-side});
    const sx=mobile?30:w*.60, ex=w-26, sy=mobile?side+223:oy+side*.55;
    const {xToPx:scoreX}=makeAxisMap({w,h,lo:-3.4,hi:3.4,peak:1,marginLeft:sx,marginRight:w-ex});
    geo={cx:x(0),cy:y(0),radius:side*.5,side};
    const txt=(s,xx,yy,color=C.text,size=12,align='left')=>{ctx.font=`${size}px 'Hiragino Sans','Segoe UI',sans-serif`;ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillText(s,xx,yy);};
    const line=(a,b,color=C.grid,width=1,dash=[])=>{ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash);ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke();ctx.setLineDash([]);};
    const dot=(xx,yy,color,r=3,shape=0,glow=false)=>{
      ctx.beginPath();ctx.fillStyle=color;ctx.strokeStyle=color;ctx.lineWidth=1.6;
      if(glow){ctx.shadowColor=color;ctx.shadowBlur=document.body.classList.contains('theme-light')?0:12;}
      if(shape){ctx.moveTo(xx,yy-r-1);ctx.lineTo(xx+r+1,yy);ctx.lineTo(xx,yy+r+1);ctx.lineTo(xx-r-1,yy);ctx.closePath();}
      else ctx.arc(xx,yy,r,0,Math.PI*2);
      ctx.fill();ctx.shadowBlur=0;
    };
    txt(tr("2つの評価で見る", "Two ratings"),ox,22,C.text,14);
    txt(tr("1つの数値にすると", "One new value"),sx,mobile?sy-71:22,C.text,14);
    [-2,0,2].forEach(v=>{
      line([x(v),oy],[x(v),oy+side]);line([ox,y(v)],[ox+side,y(v)]);
      txt(String(v),x(v),oy+side+15,C.dim,10,'center');txt(String(v),ox-8,y(v),C.dim,10,'right');
    });
    txt(tr("接客", "Service"),ox+3,oy-13,C.dim,11);txt(tr("味", "Taste"),ox+side,oy+side+32,C.dim,11,'right');
    ctx.beginPath();ctx.strokeStyle=C.grid;ctx.lineWidth=1;ctx.setLineDash([3,5]);ctx.arc(x(0),y(0),side*.45,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
    const len=3.1;
    line([x(-len*p.u[0]),y(-len*p.u[1])],[x(len*p.u[0]),y(len*p.u[1])],C.narrative,2.5);
    dot(x(len*p.u[0]),y(len*p.u[1]),C.narrative,6,0,true);
    txt(mobile ? tr("下のスライダーで向きを変えられます", "Use the slider below to rotate") : tr("線の端をドラッグして回す", "Drag the end of the line to rotate"),ox+side/2,oy+side+54,C.dim,11,'center');

    line([sx,sy],[ex,sy],C.dim,1.2);
    [-3,0,3].forEach(v=>{line([scoreX(v),sy-5],[scoreX(v),sy+5],C.dim);txt(String(v),scoreX(v),sy+23,C.dim,11,'center');});
    // A fixed scale is essential: a bad projection must visibly contract.
    const low=Math.min(...p.scores),high=Math.max(...p.scores);
    ctx.globalAlpha=.16;ctx.fillStyle=C.narrative;ctx.fillRect(scoreX(low),sy-9,scoreX(high)-scoreX(low),18);ctx.globalAlpha=1;
    for(let i=0;i<points.length;i++) {
      const pt=points[i],q=p.scores[i], highlighted=pair.includes(i), color=i===pair[0]?C.primary:i===pair[1]?C.narrative:C.dim;
      const from=[x(pt[0]),y(pt[1])],shadow=[x(q*p.u[0]),y(q*p.u[1])],target=[scoreX(q),sy];
      ctx.globalAlpha=highlighted?1:.46;dot(...from,color,highlighted?5:2.5,i===pair[1]?1:0,highlighted);ctx.globalAlpha=1;
      if(highlighted) {
        line(from,shadow,color,1.4,[3,4]);
        ctx.globalAlpha=.7;dot(...shadow,color,3,i===pair[1]?1:0);ctx.globalAlpha=1;
        const letter=i===pair[0]?'A':'B';txt(letter,from[0]+10,from[1]-12,color,15);
      }
      if(travel>=1) {ctx.globalAlpha=highlighted?1:.48;dot(...target,color,highlighted?5:2.3,i===pair[1]?1:0,highlighted);ctx.globalAlpha=1;}
      else {
        const first=Math.min(1,travel/.38),second=Math.max(0,(travel-.38)/.62);
        let moving=[mix(from[0],shadow[0],ease(first)),mix(from[1],shadow[1],ease(first))];
        if(second>0){const t=ease(second);moving=[mix(shadow[0],target[0],t),mix(shadow[1],target[1],t)-Math.sin(Math.PI*t)*(mobile?25:40)];}
        ctx.globalAlpha=highlighted?1:.6;dot(...moving,color,highlighted?6:3,i===pair[1]?1:0,highlighted);ctx.globalAlpha=1;
      }
    }
    const qa=p.scores[pair[0]],qb=p.scores[pair[1]],gap=Math.abs(qa-qb), pixels=Math.abs(scoreX(qa)-scoreX(qb));
    if(travel===1) {
      if(pixels<23) txt(tr("A・B", "A / B"),scoreX((qa+qb)/2),sy-25,C.text,14,'center');
      else {txt('A',scoreX(qa),sy-23,C.primary,14,'center');txt('B',scoreX(qb),sy-23,C.narrative,14,'center');}
    }
    const caption=gap<.35?tr("離れていた2人が、ほぼ同じ値に。", "Two different responses, almost one value."):gap>3?tr("2人の違いが、1本の上にも残る。", "Their difference remains on the line."):tr("向きだけで、2人の間隔が変わる。", "A different direction changes their gap.");
    txt(tr("横の位置が、その人の新しい数値。", "Position on the line is the new value."),(sx+ex)/2,sy+64,C.dim,11,'center');
    $('pca-angle-value').textContent=`${Math.round(angle)}°`;
    $('pca-output').textContent=`${(p.retained*100).toFixed(1)}%`;
    $('pca-meter').style.width=`${p.retained*100}%`;
    $('pca-a').textContent=qa.toFixed(2);$('pca-b').textContent=qb.toFixed(2);
    $('pca-insight').textContent=caption;
    $('pca-summary').textContent=tr(`角度${Math.round(angle)}度。Aは${qa.toFixed(2)}、Bは${qb.toFixed(2)}。残るばらつきは${(p.retained*100).toFixed(1)}%。${caption}`, `Angle ${Math.round(angle)} degrees. A ${qa.toFixed(2)}, B ${qb.toFixed(2)}. Variation retained ${(p.retained*100).toFixed(1)}%. ${caption}`);
    canvas.setAttribute('aria-valuenow',String(Math.round(angle)));
    canvas.setAttribute('aria-valuetext',tr(`${Math.round(angle)}度、残るばらつき${(p.retained*100).toFixed(1)}パーセント`, `${Math.round(angle)} degrees, ${(p.retained*100).toFixed(1)} percent of variation retained`));
    canvas.dataset.angle=angle.toFixed(3);canvas.dataset.travel=travel.toFixed(3);
  }
  function finish() {movie=false;travel=1;slider.value=Math.round(angle);$('pca-demo').textContent=tr("▶ 向きで見比べる", "▶ Compare directions");draw();}
  function rotateTo(target) {
    touched=true;stopMotion('pca');const from=angle;travel=1;
    animate('pca',1300,t=>{angle=mix(from,target,ease(t));slider.value=Math.round(angle);draw();},finish);
  }
  function trace() {touched=true;animate('pca',2200,t=>{travel=t;draw();},finish);}
  function demo() {
    touched=true;
    if(movie && $('fig-pca').dataset.animating==='true') {stopMotion('pca');return;}
    stopMotion('pca');movie=true;
    $('pca-demo').textContent=tr("■ 停止", "■ Stop");
    animate('pca',4800,t=>{
      if(t<.3){angle=bad;travel=t/.3;}
      else if(t<.43){angle=bad;travel=1;}
      else {angle=mix(bad,best,ease(Math.min(1,(t-.43)/.47)));travel=1;}
      slider.value=Math.round(angle);draw();
    },finish);
  }
  $('pca-bad').addEventListener('click',()=>rotateTo(bad));
  $('pca-best').addEventListener('click',()=>rotateTo(best));
  $('pca-trace').addEventListener('click',trace);
  $('pca-demo').addEventListener('click',demo);
  slider.addEventListener('input',e=>{const target=+slider.value;touched=touched||e.isTrusted;stopMotion('pca');angle=target;slider.value=target;travel=1;draw();});
  canvas.setAttribute('role','slider');canvas.tabIndex=0;
  canvas.setAttribute('aria-label',tr("主成分の向きを回す。左右キーで1度、Shiftと左右キーで10度。", "Rotate the projection. Arrow keys: 1 degree; Shift and arrow keys: 10 degrees."));
  canvas.setAttribute('aria-valuemin','-180');canvas.setAttribute('aria-valuemax','180');
  canvas.addEventListener('keydown',e=>{
    let target=angle;
    if(e.key==='ArrowRight'||e.key==='ArrowUp')target+=e.shiftKey?10:1;
    else if(e.key==='ArrowLeft'||e.key==='ArrowDown')target-=e.shiftKey?10:1;
    else if(e.key==='Home')target=-180;else if(e.key==='End')target=180;else return;
    e.preventDefault();touched=true;stopMotion('pca');angle=Math.max(-180,Math.min(180,target));slider.value=Math.round(angle);travel=1;draw();
  });
  function pointEvent(e) {
    const rect=canvas.getBoundingClientRect(),xx=e.clientX-rect.left-geo.cx,yy=geo.cy-(e.clientY-rect.top);
    let target=Math.atan2(yy,xx)*180/Math.PI;
    angle=target;travel=1;slider.value=Math.round(angle);draw();
  }
  canvas.addEventListener('pointerdown',e=>{
    // Touch scrolling remains native; the range/buttons provide touch rotation.
    if(e.pointerType==='touch')return;
    const rect=canvas.getBoundingClientRect(),xx=e.clientX-rect.left-geo.cx,yy=e.clientY-rect.top-geo.cy;
    if(Math.hypot(xx,yy)>geo.radius+22)return;
    touched=true;stopMotion('pca');dragging=true;canvas.setPointerCapture(e.pointerId);pointEvent(e);
  });
  canvas.addEventListener('pointermove',e=>{if(dragging)pointEvent(e);});
  const release=e=>{dragging=false;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);};
  canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);
  onSceneVisible(canvas,()=>{if(!touched)trace();},'pca');
  draw();return {draw};
}
