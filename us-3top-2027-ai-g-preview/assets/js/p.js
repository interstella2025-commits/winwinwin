(()=>{const d=document;d.documentElement.classList.add('js');
if('IntersectionObserver'in window){const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{rootMargin:'0px 0px -8% 0px'});d.querySelectorAll('.rv').forEach(el=>io.observe(el))}else d.querySelectorAll('.rv').forEach(el=>el.classList.add('in'));
const ts=[...d.querySelectorAll('.tab')];const act=i=>ts.forEach((t,j)=>{const on=i===j;t.classList.toggle('on',on);t.setAttribute('aria-selected',on);t.tabIndex=on?0:-1;const p=d.getElementById(t.getAttribute('aria-controls'));p&&p.classList.toggle('on',on)});
ts.forEach((t,i)=>{t.addEventListener('click',()=>act(i));t.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();const n=(i+(e.key==='ArrowRight'?1:-1)+ts.length)%ts.length;act(n);ts[n].focus()}})});
})();
;(function(){var m=document.querySelectorAll('mark.hl');if(!m.length||!('IntersectionObserver' in window))return;document.documentElement.classList.add('js-hl');
var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){var t=e.target;setTimeout(function(){t.classList.add('on')},250);io.unobserve(t)}})},{rootMargin:'0px 0px -15% 0px'});m.forEach(function(x){io.observe(x)})})();
