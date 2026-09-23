// Bounded, cancellable animations. All numeric end states also work without motion.
const active = new Map();
const preference = matchMedia('(prefers-reduced-motion: reduce)');
export const reducedMotion = () => preference.matches;
export const ease = t => t < .5 ? 4*t*t*t : 1-(-2*t+2)**3/2;
export const mix = (a,b,t) => a+(b-a)*t;
export function stopMotion(key, finish=false) {
  const a=active.get(key);
  if(!a) return;
  cancelAnimationFrame(a.raf); active.delete(key);
  if(finish) a.frame(1);
  const panel=document.getElementById(`fig-${key==='reg'?'regression':key}`);
  if(panel) { panel.dataset.animating='false'; panel.querySelectorAll('[data-motion-live]').forEach(el=>el.setAttribute('aria-live','polite')); }
  a.done?.();
}
export function animate(key,duration,frame,done) {
  stopMotion(key);
  const panel=document.getElementById(`fig-${key==='reg'?'regression':key}`);
  const a={frame,done,raf:0,start:performance.now()};
  active.set(key,a);
  if(panel) { panel.dataset.animating='true'; panel.querySelectorAll('[aria-live="polite"]').forEach(el=>{el.dataset.motionLive='true';el.setAttribute('aria-live','off');}); }
  if(reducedMotion()) { stopMotion(key,true); return; }
  const tick=now=>{
    if(!active.has(key))return;
    const t=Math.min(1,(now-a.start)/duration);frame(t);
    if(t===1) stopMotion(key); else a.raf=requestAnimationFrame(tick);
  };
  frame(0);a.raf=requestAnimationFrame(tick);
}
preference.addEventListener('change',()=>{if(reducedMotion())for(const key of [...active.keys()])stopMotion(key,true);});
document.addEventListener('visibilitychange',()=>{if(document.hidden)for(const key of [...active.keys()])stopMotion(key,true);});
export function onSceneVisible(element,onFirstView,key) {
  let seen=false;
  const observer=new IntersectionObserver(entries=>{
    for(const entry of entries) {
      if(entry.isIntersecting && entry.intersectionRatio>=.25 && !seen) {seen=true;if(!reducedMotion())onFirstView();}
      else if(!entry.isIntersecting) stopMotion(key,true);
    }
  },{threshold:[0,.25]});
  observer.observe(element);
}
