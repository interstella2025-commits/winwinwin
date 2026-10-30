// G motion: partner marquee controls, crossfade showcase, scroll-reveal (progressive enhancement)
(()=>{const d=document,h=d.documentElement,rm=matchMedia('(prefers-reduced-motion: reduce)');
const IO='IntersectionObserver'in window;
// marquee pause button (WCAG 2.2.2)
const pm=d.getElementById('partners'),mb=pm&&pm.querySelector('.mq-btn');
if(pm&&mb&&!rm.matches){mb.hidden=false;mb.addEventListener('click',()=>{const p=!pm.classList.contains('paused');pm.classList.toggle('paused',p);mb.setAttribute('aria-pressed',p);mb.textContent=p?'播放':'暫停'})}
// crossfade
const xf=d.getElementById('showcase');
if(xf&&!rm.matches){const ss=[...xf.querySelectorAll('.xf-s')],ns=[...xf.querySelectorAll('.xf-n li')],b=xf.querySelector('.xf-btn');let i=0,t=null,vis=false,user=false,left=6200,t0=0;
const show=k=>{ss.forEach((s,j)=>{s.classList.toggle('on',j===k);s.setAttribute('aria-hidden',j!==k)});ns.forEach((n,j)=>{n.classList.toggle('on',j===k);n.classList.toggle('done',j<k)})};
const run=()=>{if(t||user||!vis||d.hidden)return;xf.classList.remove('paused');t0=performance.now();t=setTimeout(()=>{t=null;left=6200;i=(i+1)%ss.length;show(i);run()},left)};
const stop=()=>{if(t){clearTimeout(t);t=null;left=Math.max(300,left-(performance.now()-t0))}xf.classList.add('paused')};
show(0);
if(b){b.hidden=false;b.addEventListener('click',()=>{user=!user;b.setAttribute('aria-pressed',user);b.textContent=user?'播放':'暫停';user?stop():run()})}
if(IO){new IntersectionObserver(es=>es.forEach(e=>{vis=e.isIntersecting;vis?run():stop()}),{threshold:.35}).observe(xf)}else{vis=true;run()}
d.addEventListener('visibilitychange',()=>d.hidden?stop():run());
rm.addEventListener&&rm.addEventListener('change',e=>{if(e.matches){user=true;stop();i=0;show(0)}});}
// scroll-reveal
if(!IO||rm.matches)return;h.classList.add('gm');
d.querySelectorAll('.outs,.week,.imm-cards,.stats,.faq,.steps,.rail,.hfacts,.days,.inv').forEach(g=>{g.classList.add('sg');[...g.children].forEach((c,k)=>c.style.setProperty('--i',Math.min(k,8)))});
d.querySelectorAll('.sec h2,.stage h2,.final h2').forEach(x=>x.classList.add('hu'));
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{rootMargin:'0px 0px -10% 0px',threshold:.08});
d.querySelectorAll('.sg,.hu,.pmq').forEach(el=>io.observe(el));
rm.addEventListener&&rm.addEventListener('change',e=>{if(e.matches){h.classList.remove('gm')}});
})();
