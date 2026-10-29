(()=>{const $=(s,c=document)=>c.querySelector(s),$$=(s,c=document)=>[...c.querySelectorAll(s)];
const RM=matchMedia('(prefers-reduced-motion:reduce)').matches;
// reveal
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{rootMargin:'0px 0px -8% 0px',threshold:.06});
$$('[data-rv]').forEach(el=>io.observe(el));
// nav + mbar
const nav=$('#nav'),mb=$('#mbar'),hero=$('.hero'),fin=$('#final');let ly=0;
function onS(){const y=scrollY;nav.classList.toggle('sc',y>40);nav.classList.toggle('hide',y>ly&&y>600);ly=y;
 if(mb){const fr=fin.getBoundingClientRect();mb.classList.toggle('on',y>hero.offsetHeight*.7&&fr.top>innerHeight)}
 par();imm();tl()}
// journey tabs (auto-advance)
const jt=$('.jt'),tabs=$$('.jt-tab'),panes=$$('.jt-p'),ims=$$('.jt-i');let ji=0,jtm;
function setJ(i,user){ji=i;tabs.forEach((t,k)=>{t.classList.toggle('on',k===i);t.classList.toggle('done',k<i);t.setAttribute('aria-selected',k===i)});
 panes.forEach((p,k)=>p.classList.toggle('on',k===i));ims.forEach((p,k)=>p.classList.toggle('on',k===i));
 tabs[i].querySelector('.jt-bar i').style.animation='none';void tabs[i].offsetWidth;tabs[i].querySelector('.jt-bar i').style.animation='';
 clearTimeout(jtm);if(!RM)jtm=setTimeout(()=>setJ((ji+1)%3),6500)}
tabs.forEach((t,k)=>t.addEventListener('click',()=>setJ(k,1)));
jt.addEventListener('mouseenter',()=>{jt.classList.add('paused');clearTimeout(jtm)});jt.addEventListener('mouseleave',()=>{jt.classList.remove('paused');setJ(ji)});
new IntersectionObserver(([e])=>{if(e.isIntersecting)setJ(ji);else clearTimeout(jtm)}).observe(jt);
// generic toggles
function grp(btns,panes,cb){btns.forEach(b=>b.addEventListener('click',()=>{const i=+b.dataset.i;btns.forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-selected',x===b)});panes.forEach(p=>p.classList.toggle('on',+p.dataset.i===i));cb&&cb(i)}))}
grp($$('.seg button'),$$('.gl'),i=>$('.seg').classList.toggle('r',i===1));
grp($$('.pills button'),$$('.wp'));grp($$('.cvt'),$$('.cvp'));
// gallery
const gm=$('#galm');$$('.gal-t button').forEach(b=>b.addEventListener('click',()=>{$$('.gal-t button').forEach(x=>x.classList.toggle('on',x===b));gm.style.opacity=0;setTimeout(()=>{gm.removeAttribute('srcset');gm.src=b.dataset.src;gm.alt=b.dataset.alt;gm.onload=()=>gm.style.opacity=1},200)}));
// count-up
const cio=new IntersectionObserver(es=>es.forEach(e=>{if(!e.isIntersecting)return;cio.unobserve(e.target);const el=e.target,to=+el.dataset.to;if(RM)return;const t0=performance.now();
 (function f(t){const p=Math.min(1,(t-t0)/1600),v=Math.round(to*(1-Math.pow(1-p,3)));el.textContent=v;if(p<1)requestAnimationFrame(f)})(t0)}),{threshold:.5});
$$('.cnt').forEach(c=>{if(!RM)c.textContent='0';cio.observe(c)});
// faculty carousel
const ft=$('#fct'),fd=$('#fcd');const cards=$$('.fc',ft);
function per(){return Math.max(1,Math.round(ft.clientWidth/cards[0].offsetWidth))}
function dots(){const n=Math.ceil(cards.length-per()+1);fd.innerHTML='<i></i>'.repeat(Math.max(1,n));upd()}
function upd(){const w=cards[0].offsetWidth+20,i=Math.round(ft.scrollLeft/w);$$('i',fd).forEach((d,k)=>d.classList.toggle('on',k===Math.min(i,fd.children.length-1)))}
$('#fcn').onclick=()=>ft.scrollBy({left:cards[0].offsetWidth+20});$('#fcp').onclick=()=>ft.scrollBy({left:-(cards[0].offsetWidth+20)});
ft.addEventListener('scroll',upd,{passive:true});addEventListener('resize',dots);dots();
// parallax stage
const pb=$('.pf-bg img'),ph=$('.pf-hero');function par(){if(RM||!pb)return;const r=ph.getBoundingClientRect();if(r.bottom<0||r.top>innerHeight)return;pb.style.transform=`translate3d(0,${(r.top/innerHeight)*-60}px,0)`}
// immersion sticky
const imd=$('#immd');let ci=-1;function imm(){const r=imd.getBoundingClientRect(),h=imd.offsetHeight-innerHeight,p=Math.min(.999,Math.max(0,-r.top/h)),i=Math.floor(p*3);if(i===ci)return;ci=i;
 $$('.imm-bg,.imm-t,.imm-big span').forEach(el=>el.classList.toggle('on',+el.dataset.i===i));$$('.imm-nav span').forEach((s,k)=>s.classList.toggle('on',k===i))}
// timeline
const tle=$('#tl');function tl(){const r=tle.getBoundingClientRect(),p=Math.min(1,Math.max(0,(innerHeight*.7-r.top)/r.height));tle.style.setProperty('--p',p*100+'%');
 $$('li',tle).forEach((li,k,a)=>li.classList.toggle('lit',p>=(k+.3)/a.length||p>=.98))}
// expanding cards
const exs=$$('.ex');exs.forEach(b=>{const go=()=>{exs.forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-expanded',x===b)})};b.addEventListener('click',go);b.addEventListener('mouseenter',()=>{if(matchMedia('(hover:hover) and (min-width:901px)').matches)go()})});
// faq: one open
$$('.fq').forEach(d=>d.addEventListener('toggle',()=>{if(d.open)$$('.fq').forEach(o=>{if(o!==d)o.open=false})}));
addEventListener('scroll',onS,{passive:true});onS();
})();
