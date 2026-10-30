(()=>{const d=document;d.documentElement.classList.add('js');
if('IntersectionObserver'in window){const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{rootMargin:'0px 0px -8% 0px'});d.querySelectorAll('.rv').forEach(el=>io.observe(el))}else d.querySelectorAll('.rv').forEach(el=>el.classList.add('in'));
const ts=[...d.querySelectorAll('.tab')];const act=i=>ts.forEach((t,j)=>{const on=i===j;t.classList.toggle('on',on);t.setAttribute('aria-selected',on);t.tabIndex=on?0:-1;const p=d.getElementById(t.getAttribute('aria-controls'));p&&p.classList.toggle('on',on)});
ts.forEach((t,i)=>{t.addEventListener('click',()=>act(i));t.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();const n=(i+(e.key==='ArrowRight'?1:-1)+ts.length)%ts.length;act(n);ts[n].focus()}})});
})();
;(function(){var m=document.querySelectorAll('mark.hl');if(!m.length||!('IntersectionObserver' in window))return;document.documentElement.classList.add('js-hl');
var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){var t=e.target;setTimeout(function(){t.classList.add('on')},250);io.unobserve(t)}})},{rootMargin:'0px 0px -15% 0px'});m.forEach(function(x){io.observe(x)})})();
;(function(){var g=document.querySelector('#faculty .fgrid');if(!g)return;var cs=[].slice.call(g.querySelectorAll('.pc'));if(cs.length<2)return;
g.classList.add('fc');g.setAttribute('role','region');g.setAttribute('aria-roledescription','carousel');
var nav=document.createElement('div');nav.className='fc-nav';nav.innerHTML='<button type="button" aria-label="上一位">←</button><div class="fc-dots" aria-hidden="true"></div><button type="button" aria-label="下一位">→</button>';g.parentNode.insertBefore(nav,g.nextSibling);
var dots=nav.querySelector('.fc-dots');cs.forEach(function(c,i){var d=document.createElement('i');d.onclick=function(){go(i)};dots.appendChild(d)});var ds=[].slice.call(dots.children),cur=0;
function go(i){i=(i+cs.length)%cs.length;var c=cs[i];g.scrollTo({left:c.offsetLeft-(g.clientWidth-c.offsetWidth)/2,behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'})}
function upd(){var m=g.scrollLeft+g.clientWidth/2,b=0,bd=1e9;cs.forEach(function(c,i){var d=Math.abs(c.offsetLeft+c.offsetWidth/2-m);if(d<bd){bd=d;b=i}});cur=b;cs.forEach(function(c,i){c.classList.toggle('is-c',i===b);c.setAttribute('aria-hidden',i===b?'false':'true')});ds.forEach(function(d,i){d.classList.toggle('on',i===b)})}
var t;g.addEventListener('scroll',function(){cancelAnimationFrame(t);t=requestAnimationFrame(upd)},{passive:true});
nav.children[0].onclick=function(){go(cur-1)};nav.children[2].onclick=function(){go(cur+1)};
cs.forEach(function(c,i){c.addEventListener('click',function(){if(i!==cur)go(i)})});
upd();go(0);
if(matchMedia('(prefers-reduced-motion:reduce)').matches)return;var paused=false,hold=0;
[g,nav].forEach(function(e){e.addEventListener('mouseenter',function(){paused=true});e.addEventListener('mouseleave',function(){paused=false});e.addEventListener('focusin',function(){paused=true});e.addEventListener('focusout',function(){paused=false})});
g.addEventListener('touchstart',function(){hold=Date.now()+8000},{passive:true});
var vis=false;new IntersectionObserver(function(e){vis=e[0].isIntersecting}).observe(g);
setInterval(function(){if(vis&&!paused&&Date.now()>hold&&!document.hidden)go(cur+1)},5000)})();
/* v8 orphan guard: keep last short phrase together */
(function(){document.querySelectorAll('main p,main li,main .qt,main h2,main h3').forEach(function(e){if(e.querySelector('p,li,div,br')||e.closest('.final-p'))return;var w=document.createTreeWalker(e,NodeFilter.SHOW_TEXT),n,last=null;while(n=w.nextNode())if(n.textContent.trim())last=n;if(!last||last.parentNode.closest('.nw,.ib,w-n'))return;var t=last.textContent.replace(/\s+$/,''),cut=-1;
if(t.indexOf('\u200b')>-1){var a=t.lastIndexOf('\u200b');var seg=t.slice(a+1).replace(/[，。！？：；」』）]/g,'');if(seg.length<=2){var b=t.lastIndexOf('\u200b',a-1);if(a-b-1+seg.length<=6)a=b}cut=a+1}else{var m=t.match(/[\u4e00-\u9fff]{2,4}[，。！？：；」』）]*$/);if(m)cut=t.length-m[0].length}
if(cut<4||cut>=t.length)return;var s=document.createElement('w-n');s.textContent=t.slice(cut);last.textContent=t.slice(0,cut);last.parentNode.insertBefore(s,last.nextSibling)})})();
