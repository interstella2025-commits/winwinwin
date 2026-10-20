// reveal
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.12,rootMargin:'0px 0px -40px 0px'});
document.querySelectorAll('.rv').forEach(el=>io.observe(el));
if(location.hash==='#static'){document.documentElement.classList.add('static');}if(location.hash==='#static')document.querySelectorAll('.rv').forEach(el=>el.classList.add('in'));
// nav + mobile cta
const nav=document.getElementById('nav'),m=document.getElementById('mcta');
addEventListener('scroll',()=>{const y=scrollY;nav.classList.toggle('solid',y>40);m.classList.toggle('show',y>innerHeight*.7)},{passive:true});
// node network canvases
const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
document.querySelectorAll('canvas.net').forEach(c=>{
  const NC=(getComputedStyle(document.documentElement).getPropertyValue('--net')||'79,209,232').trim();const x=c.getContext('2d'),sparse=c.dataset.sparse;let W,H,P=[],dpr=Math.min(devicePixelRatio||1,2);
  function size(){const r=c.parentElement.getBoundingClientRect();W=r.width;H=r.height;c.width=W*dpr;c.height=H*dpr;x.setTransform(dpr,0,0,dpr,0,0);
    const n=Math.round(W*H/(sparse?26000:14000));P=Array.from({length:Math.min(n,140)},()=>({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.25,vy:(Math.random()-.5)*.25}))}
  function draw(){x.clearRect(0,0,W,H);const D=130;
    for(let i=0;i<P.length;i++){const p=P[i];p.x+=p.vx;p.y+=p.vy;if(p.x<0||p.x>W)p.vx*=-1;if(p.y<0||p.y>H)p.vy*=-1;
      for(let j=i+1;j<P.length;j++){const q=P[j],dx=p.x-q.x,dy=p.y-q.y,d=Math.hypot(dx,dy);if(d<D){x.strokeStyle=`rgba(${NC},${(1-d/D)*.22})`;x.lineWidth=1;x.beginPath();x.moveTo(p.x,p.y);x.lineTo(q.x,q.y);x.stroke()}}
      x.fillStyle=`rgba(${NC},.55)`;x.beginPath();x.arc(p.x,p.y,1.4,0,6.3);x.fill()}
    if(!reduce)requestAnimationFrame(draw)}
  size();draw();addEventListener('resize',size);
});
