// StatPlay — module: REVEAL ON SCROLL

export function initReveal(){
  // A long section may never fit 10% of its height into a short viewport.
  // Reveal it as soon as its edge enters, then keep it visible.
  const io=new IntersectionObserver(entries=>entries.forEach(entry=>{
    if (!entry.isIntersecting) return;
    entry.target.classList.add('in');
    io.unobserve(entry.target);
  }),{threshold:0});
  document.querySelectorAll('.reveal').forEach(el=>io.observe(el));
}
