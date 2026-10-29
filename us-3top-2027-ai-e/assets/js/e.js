(()=>{const d=document;d.documentElement.classList.add('js');
const nav=d.getElementById('nav'),bar=d.querySelector('.mbar'),hero=d.getElementById('top'),fin=d.getElementById('contact');
const onS=()=>{nav&&nav.classList.toggle('sh',scrollY>10)};addEventListener('scroll',onS,{passive:true});onS();
if('IntersectionObserver'in window){const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{rootMargin:'0px 0px -8% 0px'});d.querySelectorAll('.rv').forEach(el=>io.observe(el));
if(bar&&fin){const bo=new IntersectionObserver(es=>es.forEach(e=>bar.classList.toggle('hide',e.isIntersecting)),{threshold:.2});bo.observe(fin)}}
else d.querySelectorAll('.rv').forEach(el=>el.classList.add('in'));
function tabs(sel,pane){const ts=[...d.querySelectorAll(sel)];ts.forEach((t,i)=>{t.addEventListener('click',()=>act(i));t.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();const n=(i+(e.key==='ArrowRight'?1:-1)+ts.length)%ts.length;act(n);ts[n].focus()}})});
function act(i){ts.forEach((t,j)=>{const on=i===j;t.classList.toggle('on',on);t.setAttribute('aria-selected',on);t.tabIndex=on?0:-1;const p=d.getElementById(t.getAttribute('aria-controls'));p&&p.classList.toggle('on',on)});if(ts[i].scrollIntoView&&ts[i].parentElement.scrollWidth>ts[i].parentElement.clientWidth){const pr=ts[i].parentElement;pr.scrollTo({left:ts[i].offsetLeft-pr.clientWidth/2+ts[i].clientWidth/2,behavior:'smooth'})}}}
tabs('.tab');tabs('.pill');
const rail=d.getElementById('rail'),dots=d.getElementById('dots');
if(rail){const cs=[...rail.children];if(dots){cs.forEach(()=>dots.appendChild(d.createElement('b')));}
const upd=()=>{const w=cs[0].getBoundingClientRect().width+14;const i=Math.round(rail.scrollLeft/w);dots&&[...dots.children].forEach((b,j)=>b.classList.toggle('on',j===Math.min(i,cs.length-1)))};rail.addEventListener('scroll',upd,{passive:true});upd();
d.querySelectorAll('.arr').forEach(b=>b.addEventListener('click',()=>{const w=cs[0].getBoundingClientRect().width+14;rail.scrollBy({left:w*+b.dataset.dir,behavior:'smooth'})}))}
})();
