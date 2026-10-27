(function(){
 // scroll-spy
 var links=[].slice.call(document.querySelectorAll('.nav a[href^="#"]')).filter(function(a){return a.getAttribute('href').length>1&&a.getAttribute('href')!=='#apply'&&a.getAttribute('href')!=='#top'});
 var map={};links.forEach(function(a){var t=document.querySelector(a.getAttribute('href'));if(t)map[t.id]=a});
 if('IntersectionObserver' in window){
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){links.forEach(function(l){l.classList.remove('is-on')});var a=map[e.target.id];if(a)a.classList.add('is-on')}})},{rootMargin:'-45% 0px -50% 0px'});
  Object.keys(map).forEach(function(id){io.observe(document.getElementById(id))});
 }
 // 手機橫滑提示＋進度點
 [].forEach.call(document.querySelectorAll('[data-swipe]'),function(el){
  var n=el.children.length,h=document.createElement('p');h.className='swipe-hint';h.setAttribute('aria-hidden','true');
  var dots='';for(var i=0;i<n;i++)dots+='<b'+(i?'':' class="on"')+'></b>';
  h.innerHTML='<span>左右滑動看'+el.getAttribute('data-swipe')+'</span><i>'+dots+'</i>';
  el.parentNode.insertBefore(h,el.nextSibling);
  var bs=h.querySelectorAll('b');
  el.addEventListener('scroll',function(){var w=el.children[0].getBoundingClientRect().width+14,k=Math.round(el.scrollLeft/w);[].forEach.call(bs,function(b,j){b.classList.toggle('on',j===Math.min(k,n-1))})},{passive:true});
 });
})();
