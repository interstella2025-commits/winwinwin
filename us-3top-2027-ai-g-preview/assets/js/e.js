/* 美國三校 2027 AI — E 版互動（Tetr 質感） */
(()=>{
const d=document,root=d.documentElement;
window.eReady=1;root.classList.add('js');
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const IO='IntersectionObserver' in window;

/* 首屏底圖：完整載入並解碼後才淡入 */
const hi=d.querySelector('.hero-bg img');
if(hi){const ok=()=>hi.classList.add('ok');const show=()=>(hi.decode?hi.decode():Promise.resolve()).then(ok,ok);
  if(hi.complete&&hi.naturalWidth)show();else{hi.addEventListener('load',show,{once:true});hi.addEventListener('error',ok,{once:true})}}

/* hero 進場 */
const ready=()=>requestAnimationFrame(()=>root.classList.add('ready'));
if(d.readyState==='complete')ready();else addEventListener('load',ready);
setTimeout(()=>root.classList.add('ready'),1200);

/* nav：捲動陰影、往下隱藏往上出現、閱讀進度條 */
const nav=d.getElementById('nav');
const prog=d.createElement('div');prog.className='prog';prog.setAttribute('aria-hidden','true');nav&&nav.appendChild(prog);

/* 子項目錯開 index */
['.intro-tags li','.nums li','.face-l li','.checks li','.outs li','.hfacts li','.steps li','.week .day','.days li','.imm-cards figure','.stats .st','.inv li','.mt-hl li','.faq details']
  .forEach(s=>d.querySelectorAll(s).forEach((el,i)=>el.style.setProperty('--i',Math.min(i,7))));

/* scroll reveal */
const rvs=d.querySelectorAll('.rv');
if(IO&&!RM){
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{rootMargin:'0px 0px -10% 0px',threshold:.01});
  rvs.forEach(el=>io.observe(el));
}else rvs.forEach(el=>el.classList.add('in'));

/* intro 逐句點亮 */
const lns=[...d.querySelectorAll('.intro-p .ln')];

/* 捲動連動效果 */
const heroImg=d.querySelector('.hero-bg img'),hero=d.getElementById('top');
const stage=d.querySelector('.stage-top'),stageImg=stage&&stage.querySelector('img');
const steps=d.querySelector('.steps'),stepLis=steps?[...steps.children]:[];
const ghosts=[...d.querySelectorAll('.imm-word')];
let lastY=scrollY,ticking=false,stopT;
const onScroll=()=>{
  const y=scrollY,vh=innerHeight;
  if(nav){
    nav.classList.toggle('sh',y>10);
    nav.classList.toggle('up',y>lastY&&y>vh*.9);
    const max=d.documentElement.scrollHeight-vh;prog.style.setProperty('--sp',max>0?(y/max).toFixed(4):0);
  }
  lastY=y;
  if(RM){lns.forEach(l=>l.classList.add('lit'));stepLis.forEach(l=>l.classList.add('on'));return}
  if(heroImg&&y<vh*1.2){root.classList.add('scrolling');clearTimeout(stopT);stopT=setTimeout(()=>root.classList.remove('scrolling'),120);heroImg.style.setProperty('--py',(y*.25).toFixed(1)+'px')}
  lns.forEach(l=>{const r=l.getBoundingClientRect();l.classList.toggle('lit',r.top<vh*.78)});
  if(stageImg){const r=stage.getBoundingClientRect();if(r.bottom>0&&r.top<vh){const p=Math.min(1,Math.max(0,(vh-r.top)/(vh+r.height)));stageImg.style.setProperty('--sc',(1.18-.18*p).toFixed(4))}}
  if(steps){const r=steps.getBoundingClientRect();const p=Math.min(1,Math.max(0,(vh*.6-r.top)/r.height));steps.style.setProperty('--p',p.toFixed(3));
    stepLis.forEach(li=>{const lr=li.getBoundingClientRect();li.classList.toggle('on',lr.top+22<vh*.6)})}
  ghosts.forEach(g=>{const s=g.parentElement.getBoundingClientRect();if(s.bottom>0&&s.top<vh){const p=(vh-s.top)/(vh+s.height);g.style.setProperty('--gx',((.5-p)*160).toFixed(1)+'px')}});
};
addEventListener('scroll',()=>{if(!ticking){ticking=true;requestAnimationFrame(()=>{onScroll();ticking=false})}},{passive:true});
addEventListener('resize',onScroll,{passive:true});
onScroll();

/* tabs（三校）：自動輪播＋進度線，互動後停止 */
const tabsEl=d.querySelector('.tabs'),ts=tabsEl?[...tabsEl.querySelectorAll('.tab')]:[];
let cur=0,timer=null,userStopped=false,inView=false;const DUR=6000;
function act(i,fromUser){
  cur=i;
  ts.forEach((t,j)=>{const on=i===j;t.classList.toggle('on',on);t.setAttribute('aria-selected',on);t.tabIndex=on?0:-1;
    const p=d.getElementById(t.getAttribute('aria-controls'));p&&p.classList.toggle('on',on)});
  const pr=tabsEl;if(pr.scrollWidth>pr.clientWidth)pr.scrollTo({left:ts[i].offsetLeft-pr.clientWidth/2+ts[i].clientWidth/2,behavior:'smooth'});
  if(fromUser){userStopped=true;stop();tabsEl.classList.remove('auto')}else restartBar();
}
function restartBar(){const t=ts[cur];t.classList.remove('on');void t.offsetWidth;t.classList.add('on')}
function stop(){clearInterval(timer);timer=null}
function start(){if(RM||userStopped||timer||!inView)return;tabsEl.classList.add('auto');tabsEl.style.setProperty('--dur',DUR+'ms');restartBar();timer=setInterval(()=>act((cur+1)%ts.length),DUR)}
ts.forEach((t,i)=>{t.addEventListener('click',()=>act(i,true));
  t.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();const n=(i+(e.key==='ArrowRight'?1:-1)+ts.length)%ts.length;act(n,true);ts[n].focus()}})});
if(tabsEl&&IO){const sec=tabsEl.closest('section');
  new IntersectionObserver(es=>es.forEach(e=>{inView=e.isIntersecting;if(inView)start();else{stop();tabsEl.classList.remove('auto')}}),{threshold:.35}).observe(sec);
  sec.addEventListener('mouseenter',()=>{if(timer){stop();tabsEl.classList.add('paused')}});
  sec.addEventListener('mouseleave',()=>{tabsEl.classList.remove('paused');if(!userStopped&&inView){tabsEl.classList.remove('auto');start()}});
}

/* 師資輪播：箭頭、圓點、滑鼠拖曳 */
const rail=d.getElementById('rail'),dots=d.getElementById('dots');
if(rail){
  const cs=[...rail.children];
  if(dots)cs.forEach(()=>dots.appendChild(d.createElement('b')));
  const step=()=>cs[0].getBoundingClientRect().width+16;
  const upd=()=>{const max=rail.scrollWidth-rail.clientWidth;let i=Math.round(rail.scrollLeft/step());if(rail.scrollLeft>=max-4)i=cs.length-1;
    dots&&[...dots.children].forEach((b,j)=>b.classList.toggle('on',j===Math.min(i,cs.length-1)))};
  rail.addEventListener('scroll',upd,{passive:true});upd();
  d.querySelectorAll('.arr').forEach(b=>b.addEventListener('click',()=>rail.scrollBy({left:step()*+b.dataset.dir,behavior:'smooth'})));
  let down=false,sx=0,sl=0,moved=false;
  rail.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse')return;down=true;moved=false;sx=e.clientX;sl=rail.scrollLeft});
  addEventListener('pointermove',e=>{if(!down)return;const dx=e.clientX-sx;if(Math.abs(dx)>4){moved=true;rail.classList.add('drag')}rail.scrollLeft=sl-dx});
  addEventListener('pointerup',()=>{if(!down)return;down=false;if(moved){rail.classList.remove('drag');const i=Math.round(rail.scrollLeft/step());rail.scrollTo({left:i*step(),behavior:'smooth'})}});
}

/* FAQ：平滑展開／收合 */
d.querySelectorAll('.faq details').forEach(det=>{
  const sum=det.querySelector('summary'),body=det.querySelector('p');
  sum.addEventListener('click',e=>{
    if(RM||!body.animate)return;
    e.preventDefault();
    if(det.open){
      const h=body.offsetHeight;
      const a=body.animate([{height:h+'px',opacity:1},{height:'0px',opacity:0,paddingBottom:'0px'}],{duration:450,easing:'cubic-bezier(.22,1,.36,1)'});
      det.classList.add('closing');a.onfinish=()=>{det.open=false;det.classList.remove('closing')};
    }else{
      det.open=true;const h=body.offsetHeight;
      body.animate([{height:'0px',opacity:0,paddingBottom:'0px'},{height:h+'px',opacity:1}],{duration:550,easing:'cubic-bezier(.22,1,.36,1)'});
    }
  });
});
})();

/* 數字跳動 */
(()=>{const ns=document.querySelectorAll('.st-n b[data-n]');if(!ns.length)return;
const rm=matchMedia('(prefers-reduced-motion: reduce)').matches;if(rm||!('IntersectionObserver'in window))return;
ns.forEach(b=>b.textContent='0');
const io=new IntersectionObserver(es=>es.forEach(e=>{if(!e.isIntersecting)return;io.unobserve(e.target);const b=e.target,n=+b.dataset.n,t0=performance.now(),D=1800;
  const f=t=>{const p=Math.min(1,(t-t0)/D),v=Math.round(n*(1-Math.pow(1-p,4)));b.textContent=v;if(p<1)requestAnimationFrame(f)};requestAnimationFrame(f)}),{threshold:.5});
ns.forEach(b=>io.observe(b))})();

/* 短句：依標點切成詞組小塊（inline-block），換行優先落在「，」「、」之後（只包標記，不改字） */
(()=>{const d=document;
const SEL='h3,.hfacts p,.steps p,.slot p,.mt-lead,.mt-hl p,.intro-tags li,.days li>span,.outs p,.pane p,.intro-p2,.sec-lede,.how-lede,.imm-lede,.notc>p:not(.notc-h),.inv-p,.faq details p,.nums li,.checks li,.face-l li,.inv p,.pc-t p:last-child,.gx-g li,.final-in>p';
const P='，、；：。？！｜',TAIL='」』）》〉…\u200b \u00a0';
const endsP=t=>{t=t.replace(/[\s\u200b」』）》〉]+$/,'');return !!t&&P.includes(t[t.length-1])};
d.querySelectorAll(SEL).forEach(el=>{
  const inner=el.textContent.replace(/[，、；：。？！｜」』）\s\u200b]+$/,'');
  if(!/[，、；：。？！｜]/.test(inner))return;
  const groups=[];let cur=[];const close=()=>{if(cur.length){groups.push(cur);cur=[]}};
  [...el.childNodes].forEach(n=>{
    if(n.nodeType===3){const s=n.data;let a=0;
      for(let i=0;i<s.length;i++){if(!P.includes(s[i]))continue;let j=i+1;while(j<s.length&&(TAIL.includes(s[j])||P.includes(s[j])))j++;
        cur.push(d.createTextNode(s.slice(a,j)));close();a=j;i=j-1}
      if(a<s.length)cur.push(d.createTextNode(s.slice(a)));
    }else if(n.nodeName==='BR'){close();groups.push([n])}else{cur.push(n);if(endsP(n.textContent))close()}
  });
  close();
  if(groups.length<2)return;
  el.textContent='';
  groups.forEach(g=>{if(!g.some(x=>x.textContent.trim())){g.forEach(x=>el.appendChild(x));return}
    const sp=d.createElement('span');sp.className='seg';g.forEach(x=>sp.appendChild(x));el.appendChild(sp)});
});
})();

/* 詞界斷點：長串中文在詞與詞之間加 <wbr>（瀏覽器內建中文斷詞），放不下時只在詞界換行，不切開詞（只加標記，不改字） */
(()=>{if(!(window.Intl&&Intl.Segmenter))return;const d=document;
const SEL='.intro-p2,.sec-lede,.how-lede,.imm-lede,.notc>p:not(.notc-h),.inv-p,.faq details p,.nums li,.checks li,.face-l li,.inv p,.pc-t p:last-child,.gx-note,.gx-g li,.mt-i,.outs p,.days li>span,.steps p,.mt-hl p,.pane p,.hfacts p,.inv h3,.final-in>p,.tab b,.slot p';
const sg=new Intl.Segmenter('zh-Hant',{granularity:'word'}),HAN=/[\u3400-\u9fff]/;
/* 不可拆開的專有名詞；「的了著…」不放行首；「與和在…」跟著後面的詞走 */
const KEEP=['創新創業實踐獎','一次性獲得','Visiting Scholar','不需長住美國','Post-doc','免英文門檻','商業向善獎','研習營委員會主委','研習營','主委','營運長','共創人兼營運長','用在','扶輪青年領袖獎','公共形象委員會','拉姆・查蘭管理實踐獎','創新企業與卓越人才獎學金','國會預算辦公室','哈佛商業評論','博士後研究員','加州州立大學','美國矽谷研究院','數智化運營','拉姆・查蘭','拉姆查蘭','博士後','訪問學者','史丹佛','柏克萊','加州州大','蒙特雷灣','研究院','華沃教育','商業顧問','數智化','中文版','委員會','副主委','獎學金','企業家','網路班','面對面','一對一','終身教授','學術地位','實踐獎','矽谷'];
const NOHEAD=/^[的之了著們地得嗎呢吧啊]/,NOTAIL=/^[與和及或並在把被將從對向於為]$/;
/* 原文裡的斷詞記號（零寬空格）也可能落在專有名詞中間或「的」前面：這些地方整組綁住不換行 */
const ZW='\u200b?',esc=c=>c.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const BIND=new RegExp('([「『（《〈(]*(?:'+KEEP.map(k=>[...k].map(esc).join(ZW)).join('|')+')[」』）》〉)，、。：；？！]*)|([\u3400-\u9fff]\u200b[的之了著們地得]|[與和及或並在把被將從對向於為]\u200b[\u3400-\u9fff]|[A-Za-z]+[）」』])','g');
d.querySelectorAll(SEL).forEach(el=>{const w=d.createTreeWalker(el,NodeFilter.SHOW_TEXT),ts=[];let t;while(t=w.nextNode())ts.push(t);
  ts.forEach(t=>{const s=t.data;BIND.lastIndex=0;if(!BIND.test(s))return;BIND.lastIndex=0;const f=d.createDocumentFragment();let a=0,m;
    while(m=BIND.exec(s)){if(m.index>a)f.appendChild(d.createTextNode(s.slice(a,m.index)));const k=d.createElement('span');k.className=m[1]?'kp':'kq';k.textContent=m[0];f.appendChild(k);a=m.index+m[0].length}
    if(a<s.length)f.appendChild(d.createTextNode(s.slice(a)));t.parentNode.replaceChild(f,t)})});
d.querySelectorAll(SEL).forEach(el=>{const w=d.createTreeWalker(el,NodeFilter.SHOW_TEXT),ts=[];let t;while(t=w.nextNode())ts.push(t);
  ts.forEach(t=>{const s=t.data;if(s.length<5)return;const parts=[...sg.segment(s)].map(x=>x.segment);if(parts.length<2)return;
    const block=new Set();if(!t.parentElement.classList.contains('kp'))KEEP.forEach(k=>{let j=s.indexOf(k);while(j>-1){for(let x=j+1;x<j+k.length;x++)block.add(x);j=s.indexOf(k,j+1)}});
    const f=d.createDocumentFragment();let pos=0;
    parts.forEach((p,i)=>{if(i){const q=parts[i-1];if(HAN.test(q[q.length-1])&&HAN.test(p[0])&&!block.has(pos)&&!NOHEAD.test(p)&&!NOTAIL.test(q))f.appendChild(d.createElement('wbr'))}f.appendChild(d.createTextNode(p));pos+=p.length});
    t.parentNode.replaceChild(f,t)})});
})();

/* 中文段落：段末最後 2 個字（連同後面的標點）黏在一起，最後一行至少 2 個字（只包標記，不改字） */
(()=>{const d=document;
const SEL='.gx-note';
const LAT=/[A-Za-z0-9]/,SKIP=/[\s\u200b，、；：。？！」』）》〉…—]/;
d.querySelectorAll(SEL).forEach(el=>{
  const w=d.createTreeWalker(el,NodeFilter.SHOW_TEXT),ts=[];let t;while(t=w.nextNode())ts.push(t);
  let need=2,node=null,off=0;
  for(let k=ts.length-1;k>=0&&need;k--){const s=ts[k].data;for(let j=s.length-1;j>=0;j--){if(SKIP.test(s[j]))continue;if(!--need){node=ts[k];off=j;break}}}
  if(!node)return;
  while(off>0&&LAT.test(node.data[off])&&LAT.test(node.data[off-1]))off--;
  if(node===ts[0]&&off===0)return;
  const r=d.createRange();r.setStart(node,off);r.setEnd(el,el.childNodes.length);
  const sp=d.createElement('span');sp.className='ow';sp.appendChild(r.extractContents());el.appendChild(sp);
});
})();

/* 螢光筆重點：捲到時才由左往右畫出 */
(()=>{const ms=document.querySelectorAll('.hl');if(!ms.length)return;
if(matchMedia('(prefers-reduced-motion: reduce)').matches||!('IntersectionObserver'in window)){ms.forEach(m=>m.classList.add('on'));return}
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('on');io.unobserve(e.target)}}),{rootMargin:'0px 0px -18% 0px'});
ms.forEach(m=>io.observe(m))})();
