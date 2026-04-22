// StatPlay — module: REVEAL ON SCROLL

export function initReveal(){
  const io=new IntersectionObserver(es=>es.forEach(e=>e.isIntersecting&&e.target.classList.add('in')),{threshold:.1});
  document.querySelectorAll('.reveal').forEach(el=>io.observe(el));
}
