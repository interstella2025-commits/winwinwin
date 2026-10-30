// F motion layer — Tetr-style (reveal .9s cubic-bezier(.22,1,.36,1), stagger, hover lift/zoom)
// Patterns per Motion Prompt #074 #002 #081 #082 #004 · MIT License (c) 2026 Shohei Ohtaki (vocabulary); own implementation
(()=>{const d=document,h=d.documentElement;
if(!('IntersectionObserver'in window))return;
const rm=matchMedia('(prefers-reduced-motion: reduce)');if(rm.matches)return;
h.classList.add('mo');
const G='.outs,.week,.imm-cards,.stats,.faq,.steps,.panes .pane.on .pane-t,.rail,.hfacts,.days,.cta-row,.intro-p';
d.querySelectorAll(G).forEach(g=>{g.classList.add('sg');[...g.children].forEach((c,i)=>c.style.setProperty('--i',Math.min(i,8)))});
d.querySelectorAll('.sec h2,.stage h2,.final h2').forEach(x=>x.classList.add('hu'));
d.querySelectorAll('section figure').forEach(f=>f.classList.add('kz'));
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{rootMargin:'0px 0px -10% 0px',threshold:.08});
d.querySelectorAll('.sg,.hu,.kz').forEach(el=>io.observe(el));
requestAnimationFrame(()=>h.classList.add('mo-go'));
rm.addEventListener&&rm.addEventListener('change',e=>{if(e.matches){h.classList.remove('mo');d.querySelectorAll('.sg,.hu,.kz').forEach(el=>el.classList.add('in'))}});
})();
