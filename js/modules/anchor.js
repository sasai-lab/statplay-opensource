// StatPlay - module: ANCHOR - click h2 to copy section URL
import { $ } from '../utils.js';

(function anchor(){
  const titles = document.querySelectorAll('.sec-title');
  if(!titles.length) return;

  function copyURL(sectionId, el){
    const url = location.origin + location.pathname + '#' + sectionId;
    const feedback = () => {
      el.classList.add('copied');
      setTimeout(()=> el.classList.remove('copied'), 1400);
      try{ history.replaceState(null, '', '#' + sectionId); }catch(_){}
    };
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(url).then(feedback).catch(feedback);
    } else {
      // Fallback: use a temporary textarea
      const ta = document.createElement('textarea');
      ta.value = url; document.body.appendChild(ta);
      ta.select();
      try{ document.execCommand('copy'); }catch(_){}
      document.body.removeChild(ta);
      feedback();
    }
  }

  titles.forEach(h => {
    const section = h.closest('section[id]');
    if(!section) return;
    const id = section.id;
    h.setAttribute('tabindex', '0');
    h.setAttribute('role', 'button');
    h.setAttribute('aria-label', 'Copy link to section: ' + (h.textContent || id).trim());
    h.setAttribute('title', 'Click to copy section URL');
    h.addEventListener('click', () => copyURL(id, h));
    h.addEventListener('keydown', e => {
      if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); copyURL(id, h); }
    });
  });
})();
