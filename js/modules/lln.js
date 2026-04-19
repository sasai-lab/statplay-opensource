// StatPlay — module: 3) LLN
import { $, TAU, rng_normal, rng_exp, rng_uniform, rng_bimodal, erf, normCDF, normPDF, zCritical, lgamma, gamma, tPDF, chi2PDF, fPDF, resizeCanvas, drawGrid, neonLine, neonFill, themeColors, withAlpha} from '../utils.js';

(function lln(){
  if(!document.getElementById('llnCanvas')) return;
  const canvas=$('llnCanvas');const history=[];let running=false;let head=0,n=0;
  const pSlider=$('llnP');pSlider.oninput=()=>{$('llnPVal').textContent=parseFloat(pSlider.value).toFixed(2);$('llnTrue').textContent=parseFloat(pSlider.value).toFixed(2);reset();};
  const LLN_MAX=3000;
  $('llnRun').onclick=()=>{if(running) return; if(n>=LLN_MAX) reset(); running=true; run();};
  $('llnReset').onclick=reset;
  function reset(){history.length=0;head=0;n=0;running=false;draw();}
  function run(){
    const p=parseFloat(pSlider.value);const MAX=LLN_MAX;const TARGET_MS=10000;
    const t0=performance.now();
    function frame(){
      const elapsed=performance.now()-t0;
      const frac=Math.min(1,elapsed/TARGET_MS);
      // 3-segment piecewise easing — slow slow slow … then どどど
      let eased;
      if(frac<0.45){
        eased = Math.pow(frac/0.45, 4) * 0.05;
      } else if(frac<0.75){
        const r=(frac-0.45)/0.30;
        eased = 0.05 + r*r * 0.25;
      } else {
        const r=(frac-0.75)/0.25;
        eased = 0.30 + (1 - Math.pow(1-r, 2)) * 0.70;
      }
      const targetN=Math.min(MAX,Math.ceil(eased*MAX));
      while(n<targetN){const flip=Math.random()<p?1:0;head+=flip;n++;if(n%2===0)history.push(head/n);}
      if(history.length>2000) history.splice(0,history.length-2000);
      $('llnN').textContent=n;$('llnCur').textContent=(head/n).toFixed(4);
      draw();
      if((n<MAX||frac<1)&&running) requestAnimationFrame(frame);else {running=false;window.__notifyDone&&window.__notifyDone('llnRun');}
    }
    frame();
  }
  function draw(){
    const {ctx,w,h}=resizeCanvas(canvas);drawGrid(ctx,w,h);const tc=themeColors();
    const p=parseFloat(pSlider.value);
    // target line
    ctx.strokeStyle=withAlpha(tc.yellow,.7);ctx.setLineDash([6,4]);
    const yTrue=h-20-p*(h-40);
    ctx.beginPath();ctx.moveTo(0,yTrue);ctx.lineTo(w,yTrue);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle=tc.yellow;ctx.font='11px "Courier New"';ctx.fillText((window.__LANG==='en'?'True value ':'真の値 ')+p.toFixed(2),w-120,yTrue-6);
    // running average
    if(history.length>1){
      const pts=history.map((v,i)=>[i/history.length*w,h-20-v*(h-40)]);
      neonLine(ctx,pts,tc.cyan,10,2);
    }
    // axis ticks
    ctx.fillStyle=tc.dim;
    ctx.fillText('0.0',4,h-6);ctx.fillText('1.0',4,16);
    ctx.fillText(window.__LANG==='en'?'Trials →':'試行 →',w-70,h-6);
  }
  draw();
})();
