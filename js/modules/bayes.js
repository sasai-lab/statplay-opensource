// StatPlay — module: 8) BAYES
import { $, resizeCanvas, drawGrid, themeColors, withAlpha, throttledDraw } from '../utils.js';

export function initBayes(){
  if(!document.getElementById('bayesCanvas')) return;
  const canvas=$('bayesCanvas');
  const ids=['bPd','bSens','bSpec'];
  const fmt={
    bPd:v=>{const n=Math.round(v*1000);return (window.__LANG==='en'?n+' / 1,000':n+'人 / 1000');},
    bSens:v=>(v*100).toFixed(1)+'%',
    bSpec:v=>(v*100).toFixed(1)+'%'
  };
  const sched=throttledDraw(()=>draw());
  ids.forEach(id=>{const el=$(id);el.oninput=()=>{const v=parseFloat(el.value);$(id+'Val').textContent=fmt[id](v);sched();};});
  window.addEventListener('langchange',()=>{
    ids.forEach(id=>{const el=$(id);$(id+'Val').textContent=fmt[id](parseFloat(el.value));});
    draw();
  });

  function layoutDots(rect,n){
    if(n<=0) return {cellW:0,cellH:0,cols:0,rows:0};
    const ratio=rect.w/rect.h;
    let cols=Math.max(1,Math.round(Math.sqrt(n*ratio)));
    let rows=Math.ceil(n/cols);
    while(cols*(rows-1)>=n && rows>1) rows--;
    return {cols,rows,cellW:rect.w/cols,cellH:rect.h/rows};
  }
  function drawDots(ctx,rect,n,color){
    if(n<=0) return;
    const {cellW,cellH,cols,rows}=layoutDots(rect,n);
    const r=Math.max(1,Math.min(cellW,cellH)*0.32);
    ctx.fillStyle=color;
    let drawn=0;
    for(let row=0;row<rows && drawn<n;row++){
      for(let col=0;col<cols && drawn<n;col++){
        const cx=rect.x+col*cellW+cellW/2;
        const cy=rect.y+row*cellH+cellH/2;
        ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fill();
        drawn++;
      }
    }
  }
  function zoneBox(ctx,rect,stroke,tag,count,labelColor,fs){
    const tc=themeColors();
    ctx.strokeStyle=stroke;ctx.lineWidth=1;
    ctx.strokeRect(rect.x+0.5,rect.y+0.5,rect.w-1,rect.h-1);
    const pad=3;
    const tagFs=Math.max(9,fs);
    const cntFs=Math.max(8,fs-1);
    ctx.font='bold '+tagFs+'px "Courier New"';
    const tagW=ctx.measureText(tag).width;
    ctx.font=cntFs+'px "Courier New"';
    const cntW=ctx.measureText(count).width;
    const chipW=Math.min(rect.w-4,Math.max(tagW,cntW)+pad*2);
    const chipH=Math.min(rect.h-4,tagFs+cntFs+10);
    ctx.fillStyle=withAlpha(tc.bg,.82);
    ctx.fillRect(rect.x+2,rect.y+2,chipW,chipH);
    ctx.strokeStyle=withAlpha(tc.cyan,.12);
    ctx.strokeRect(rect.x+2.5,rect.y+2.5,chipW-1,chipH-1);
    ctx.fillStyle=labelColor||stroke;
    ctx.font='bold '+tagFs+'px "Courier New"';
    ctx.fillText(tag,rect.x+pad+2,rect.y+tagFs+3);
    ctx.fillStyle=tc.text;
    ctx.font=cntFs+'px "Courier New"';
    ctx.fillText(count,rect.x+pad+2,rect.y+tagFs+cntFs+6);
  }

  function wrapText(ctx,text,x,y,maxW,lineH){
    const words=text.split(' ');
    let line='';
    for(const w of words){
      const test=line?line+' '+w:w;
      if(ctx.measureText(test).width>maxW && line){
        ctx.fillText(line,x,y); y+=lineH; line=w;
      } else line=test;
    }
    if(line) ctx.fillText(line,x,y);
  }

  function draw(){
    const mobile=canvas.clientWidth<420;
    const targetH=mobile?Math.max(280,Math.round(canvas.clientWidth*0.85)):380;
    canvas.style.height=targetH+'px';

    const {ctx,w,h} = resizeCanvas(canvas);
    drawGrid(ctx,w,h);
    const tc = themeColors();
    const pd = parseFloat($('bPd').value);
    const sens = parseFloat($('bSens').value);
    const spec = parseFloat($('bSpec').value);
    const total = 1000;
    const D = pd * total;
    const notD = total - D;
    const TP = D * sens;
    const FN = D - TP;
    const FP = notD * (1 - spec);
    const TN = notD - FP;
    const ppv = TP / (TP + FP) || 0;
    const npv = TN / (TN + FN) || 0;

    const isEn=window.__LANG==='en';

    const fs=mobile?10:13;
    const fsSmall=mobile?9:12;
    const fsTiny=mobile?8:10;
    const padL=mobile?24:34;
    const padR=mobile?8:16;
    const gap=mobile?8:14;

    const titleY=mobile?14:20;
    const headerY=mobile?30:44;
    const plotTop=mobile?40:56;
    const plotBottom=h-(mobile?18:28);
    const plotW=w-padL-padR,plotH=plotBottom-plotTop;

    const minFrac=0.10;
    const fracD=Math.max(minFrac,Math.min(1-minFrac,pd));
    const colWSick=Math.floor((plotW-gap)*fracD);
    const colWHealthy=plotW-gap-colWSick;
    const xSick=padL;
    const xHealthy=padL+colWSick+gap;

    const rowGap=mobile?4:8;
    const minRowH=mobile?36:48;
    const totalH=plotH-rowGap;
    function splitRows(posFrac){
      let pos=Math.floor(totalH*posFrac);
      let neg=totalH-pos;
      if(pos<minRowH){ pos=minRowH; neg=totalH-minRowH; }
      else if(neg<minRowH){ neg=minRowH; pos=totalH-minRowH; }
      return [Math.max(12,pos),Math.max(12,neg)];
    }
    const [sickPosH, sickNegH]=splitRows(sens);
    const [healthPosH, healthNegH]=splitRows(1-spec);

    const rects={
      TP:{x:xSick,    y:plotTop,                     w:colWSick,    h:sickPosH},
      FN:{x:xSick,    y:plotTop+sickPosH+rowGap,     w:colWSick,    h:sickNegH},
      FP:{x:xHealthy, y:plotTop,                     w:colWHealthy, h:healthPosH},
      TN:{x:xHealthy, y:plotTop+healthPosH+rowGap,   w:colWHealthy, h:healthNegH}
    };

    ctx.fillStyle=withAlpha(tc.cyan,.06); ctx.fillRect(rects.TP.x,rects.TP.y,rects.TP.w,rects.TP.h);
    ctx.fillStyle=withAlpha(tc.purple,.06);ctx.fillRect(rects.FN.x,rects.FN.y,rects.FN.w,rects.FN.h);
    ctx.fillStyle=withAlpha(tc.magenta,.08);ctx.fillRect(rects.FP.x,rects.FP.y,rects.FP.w,rects.FP.h);
    ctx.fillStyle=withAlpha(tc.dim,.05);ctx.fillRect(rects.TN.x,rects.TN.y,rects.TN.w,rects.TN.h);

    ctx.fillStyle=tc.yellow;ctx.font='bold '+fs+'px "Courier New"';
    ctx.fillText(isEn?'TOWN OF 1,000 ▸ test everyone':'1000人の町 ▸ 全員に検査',padL,titleY);

    ctx.font='bold '+fsSmall+'px "Courier New"';
    ctx.fillStyle=tc.cyan;
    const sickLabel=isEn?'SICK·'+Math.round(D):'病気·'+Math.round(D)+(mobile?'':'人');
    ctx.fillText(sickLabel,xSick,headerY);
    ctx.fillStyle=tc.dim;
    const healthLabel=isEn?'HEALTHY·'+Math.round(notD):'健康·'+Math.round(notD)+(mobile?'':'人');
    ctx.fillText(healthLabel,xHealthy,headerY);

    ctx.fillStyle=tc.yellow;ctx.font='bold '+(mobile?9:11)+'px "Courier New"';
    ctx.fillText(isEn?'+':'陽', mobile?2:4, plotTop+Math.min(14,sickPosH/2+4));
    ctx.fillStyle=tc.dim;
    ctx.fillText(isEn?'−':'陰', mobile?2:4, plotTop+sickPosH+rowGap+Math.min(14,sickNegH/2+4));

    const chipH=mobile?28:36;
    function dotArea(r){return {x:r.x+2,y:r.y+(r.h>chipH+8?chipH+2:4),w:r.w-4,h:r.h-(r.h>chipH+8?chipH+6:8)};}
    drawDots(ctx,dotArea(rects.TP),Math.round(TP),tc.cyan);
    drawDots(ctx,dotArea(rects.FN),Math.round(FN),tc.purple);
    drawDots(ctx,dotArea(rects.FP),Math.round(FP),tc.magenta);
    drawDots(ctx,dotArea(rects.TN),Math.round(TN),withAlpha(tc.dim,.7));

    const chipFs=mobile?9:11;
    zoneBox(ctx,rects.TP,withAlpha(tc.cyan,.9),
      'TP',(isEn?Math.round(TP)+' ppl':Math.round(TP)+'人'),tc.cyan,chipFs);
    zoneBox(ctx,rects.FN,withAlpha(tc.purple,.9),
      'FN',(isEn?Math.round(FN)+' ppl':Math.round(FN)+'人'),tc.purple,chipFs);
    zoneBox(ctx,rects.FP,withAlpha(tc.magenta,.9),
      'FP',(isEn?Math.round(FP)+' ppl':Math.round(FP)+'人'),tc.magenta,chipFs);
    zoneBox(ctx,rects.TN,withAlpha(tc.dim,.9),
      'TN',(isEn?Math.round(TN)+' ppl':Math.round(TN)+'人'),tc.dim,chipFs);

    ctx.strokeStyle=withAlpha(tc.yellow,.5);ctx.setLineDash([5,4]);ctx.lineWidth=1;
    const yPos0=plotTop-3;
    const yPos1=plotTop+Math.max(sickPosH,healthPosH)+3;
    ctx.beginPath();
    ctx.moveTo(xSick-(mobile?4:8),yPos0);ctx.lineTo(xSick-(mobile?4:8),yPos1);ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(xHealthy+colWHealthy+(mobile?4:8),yPos0);ctx.lineTo(xHealthy+colWHealthy+(mobile?4:8),yPos1);ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle=tc.dim;ctx.font=fsTiny+'px "Courier New"';
    const hintText=isEn
      ? 'Column width ≈ population.  Row height ≈ test accuracy.'
      : '列幅≒人数　行の高さ≒検査の正解率';
    if(mobile){
      wrapText(ctx,hintText,padL,h-8,w-padL-padR,fsTiny+2);
    } else {
      ctx.fillText(isEn
        ? 'Column width ≈ population size.  Row height ≈ test-correctness ratio.'
        : '列の幅 ≒ 人数（病気の人は少ない）。行の高さ ≒ 検査で正しく判定された割合。',
        padL, h-10);
    }

    $('bPpv').textContent=(ppv*100).toFixed(2)+'%';
    $('bNpv').textContent=(npv*100).toFixed(2)+'%';
    $('bTp').textContent=Math.round(TP);
    $('bFp').textContent=Math.round(FP);
  }
  draw();
  window.addEventListener('resize',()=>{clearTimeout(window.__bayesTimer);window.__bayesTimer=setTimeout(draw,150);});
}
