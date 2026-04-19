/* global katex */
document.querySelectorAll('.formula').forEach(function(el){
  var t=el.getAttribute('data-tex');
  if(t&&typeof katex!=='undefined') katex.render(t,el,{displayMode:false,throwOnError:false});
});
