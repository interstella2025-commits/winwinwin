/* A/B 比較頁互動：進場動畫、導覽列、手機固定 CTA、數字、節點網、預約視窗 */
(function(){
var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{threshold:.12,rootMargin:'0px 0px -40px 0px'});
document.querySelectorAll('.rv').forEach(function(el){io.observe(el)});
var nav=document.getElementById('nav');addEventListener('scroll',function(){nav.classList.toggle('solid',scrollY>40)},{passive:true});
var m=document.getElementById('mcta'),hc=document.querySelector('.hero .cta-row'),fm=document.getElementById('apply'),heroOut=false,formIn=false;
function up(){if(m)m.classList.toggle('show',heroOut&&!formIn)}
if(hc)new IntersectionObserver(function(x){heroOut=!x[0].isIntersecting&&x[0].boundingClientRect.top<0;up()}).observe(hc);
if(fm)new IntersectionObserver(function(x){formIn=x[0].isIntersecting;up()}).observe(fm);
var reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
document.querySelectorAll('canvas.net').forEach(function(c){var x=c.getContext('2d'),W,H,P=[],dpr=Math.min(devicePixelRatio||1,2);
 function size(){var r=c.parentElement.getBoundingClientRect();W=r.width;H=r.height;c.width=W*dpr;c.height=H*dpr;x.setTransform(dpr,0,0,dpr,0,0);var n=Math.min(Math.round(W*H/15000),130);P=[];for(var i=0;i<n;i++)P.push({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.25,vy:(Math.random()-.5)*.25})}
 function draw(){x.clearRect(0,0,W,H);for(var i=0;i<P.length;i++){var p=P[i];p.x+=p.vx;p.y+=p.vy;if(p.x<0||p.x>W)p.vx*=-1;if(p.y<0||p.y>H)p.vy*=-1;
  for(var j=i+1;j<P.length;j++){var q=P[j],d=Math.hypot(p.x-q.x,p.y-q.y);if(d<130){x.strokeStyle='rgba(79,209,232,'+((1-d/130)*.22)+')';x.lineWidth=1;x.beginPath();x.moveTo(p.x,p.y);x.lineTo(q.x,q.y);x.stroke()}}
  x.fillStyle='rgba(79,209,232,.55)';x.beginPath();x.arc(p.x,p.y,1.4,0,6.3);x.fill()}if(!reduce)requestAnimationFrame(draw)}
 size();draw();addEventListener('resize',size)});
var els=document.querySelectorAll('.cnt[data-to]');
if(els.length&&!reduce){var co=new IntersectionObserver(function(es){es.forEach(function(e){if(!e.isIntersecting)return;co.unobserve(e.target);var el=e.target,to=+el.dataset.to,t0=null;
 function f(t){if(!t0)t0=t;var k=Math.min(1,(t-t0)/1200);el.textContent=Math.round(to*(1-Math.pow(1-k,3)));if(k<1)requestAnimationFrame(f);else el.textContent=to}requestAnimationFrame(f)})},{threshold:.6});
 els.forEach(function(e){e.style.minWidth=Math.ceil(e.getBoundingClientRect().width)+'px';co.observe(e)})}
var dlg=document.getElementById('book');
if(dlg&&dlg.showModal){document.querySelectorAll('a[href="#book"]').forEach(function(a){a.addEventListener('click',function(e){e.preventDefault();dlg.showModal()})});
 dlg.addEventListener('click',function(e){if(e.target===dlg)dlg.close()});
 dlg.querySelector('.pop-x').addEventListener('click',function(){dlg.close()})}
})();
