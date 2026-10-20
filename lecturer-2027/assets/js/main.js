(function(){
var d=document,root=d.documentElement;root.classList.add('js');
var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
// stagger siblings
d.querySelectorAll('.grid,.rows,.nums,.path,.kv,.olist,.cities,.quad,.gallery,.ex,.hero-copy').forEach(function(g){
  [].slice.call(g.children).forEach(function(c,i){if(c.classList.contains('rv'))c.style.setProperty('--d',Math.min(i*0.07,0.5)+'s')})});
d.querySelectorAll('.hero-title .ln').forEach(function(c,i){c.style.setProperty('--d',(0.15+i*0.14)+'s')});
function count(el){var to=+el.dataset.to,t0=null,dur=1400;if(reduce||!to){el.textContent=to;return}
  function f(t){t0=t0||t;var p=Math.min((t-t0)/dur,1);el.textContent=Math.round(to*(1-Math.pow(1-p,3)));if(p<1)requestAnimationFrame(f)}requestAnimationFrame(f)}
if('IntersectionObserver' in window&&!reduce){
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{rootMargin:'0px 0px -8% 0px',threshold:.08});
  d.querySelectorAll('.rv').forEach(function(el){io.observe(el)});
  var co=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){count(e.target);co.unobserve(e.target)}})},{threshold:.6});
  d.querySelectorAll('.cu').forEach(function(el){co.observe(el)});
}else{d.querySelectorAll('.rv').forEach(function(el){el.classList.add('in')})}
// sticky CTA: show after hero, hide when apply visible
var st=d.querySelector('.sticky'),hero=d.querySelector('.hero'),ap=d.getElementById('apply');
function upd(){var h=hero.getBoundingClientRect().bottom<0,a=ap.getBoundingClientRect();var inA=a.top<innerHeight&&a.bottom>0;st.classList.toggle('on',h&&!inA)}
addEventListener('scroll',upd,{passive:true});upd();
// checkout (same contract as current site: POST /api/payuni/create)
var f=d.getElementById('checkout'),msg=f.querySelector('.form-msg'),btn=f.querySelector('button');
f.addEventListener('submit',async function(e){e.preventDefault();
  if(!f.checkValidity()){f.reportValidity();return}
  btn.disabled=true;msg.textContent='';
  var s=Object.fromEntries(new FormData(f));
  try{var id=sessionStorage.getItem('win-checkout-id');if(!id){id=crypto.randomUUID();sessionStorage.setItem('win-checkout-id',id)}
    var r=await fetch('/api/payuni/create',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.assign({},s,{consent:s.consent==='on',requestId:id}))});
    var j=await r.json();if(j.resetRequest)sessionStorage.removeItem('win-checkout-id');
    if(!r.ok||!j.checkoutUrl)throw Error(j.error||'目前無法前往付款。');
    msg.textContent='報名資料已保存，即將前往付款…';location.assign(j.checkoutUrl)
  }catch(err){msg.textContent=err instanceof Error?err.message:'暫時無法建立付款，請稍後再試。';btn.disabled=false}
});
})();
