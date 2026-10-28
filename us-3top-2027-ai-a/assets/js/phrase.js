/* CJK phrase-aware line breaking: keeps words & short clauses together */
(function(){
 if(!('Segmenter' in Intl))return;
 var seg=new Intl.Segmenter('zh-Hant',{granularity:'word'});
 var CJK=/[\u3400-\u9fff]/, CL=/[，、。；：！？」』）》・｜|]$/;
 var KEEP=/(\d+\s?月底|每月\s?\d+\s?次|週[一二三四五六日](?:上午|下午|晚上)?|第\s?\d+\s?[期張屆名]|\d+\s?(?:個月|月|次|天\s?\d+\s?夜|張|堂|門課|天|夜|人|期|家|年|位)|（[^（）]{1,8}）|加州大學柏克萊分校|加州柏克萊大學|柏克萊大學|柏克萊分校|加州州立大學|史丹佛大學|矽谷研究院|胡佛研究所|實體校園班|研究計畫|訪問學者|博士後研究|說明會|結業證書|[A-Za-z]+商學院)/;
 var SEL='h1,h2,h3,h4,.eyebrow,.btn,figcaption,b,strong,td,th,dd,dt,li,p,.u-k,.aff,.qx-zh,.lead,.sub,label,button';
 function words(t){var a=[];for(var s of seg.segment(t))a.push(s.segment);return a}
 // merge particles/very short tokens onto neighbours to avoid 1-char fragments
 function join(ws){var o=[];ws.forEach(function(w){var p=o[o.length-1];
   if(p!==undefined&&(/^[，、。；：！？」』）》…—・｜|,.!?;:)\]]+$/.test(w)||/[「『（《(\[]$/.test(p)||(/^[\u3400-\u9fff]$/.test(w)&&/^(的|了|們|嗎|呢|吧|中|上|後|前|者|性|化|式|班|期|張|堂|門|位|人|年|月|天|夜|校|院|國|會|課|證|生|家|師|間)$/.test(w))||(/^[A-Za-z0-9.]+$/.test(w)&&/^[\u3400-\u9fff]/.test(p)===false&&/^[A-Za-z0-9.]+$/.test(p))))o[o.length-1]=p+w;else o.push(w)});return o}
 function wrap(node,clauses){
  var t=node.nodeValue;if(!CJK.test(t))return;
  var f=document.createDocumentFragment();
  // keep punctuation that touches a neighbouring inline element (e.g. <strong>經歷</strong>，…) as plain text so it glues to it;
  // inline-block clause boxes would otherwise allow a break right before 「，」
  var lead=(t.match(/^[，、。；：！？」』）》…—・｜|,.!?;:)\]]+/)||[''])[0],tail=(t.match(/[「『（《(\[]+$/)||[''])[0];
  if(lead.length+tail.length>=t.length)return;
  t=t.slice(lead.length,t.length-tail.length);
  if(lead)f.appendChild(document.createTextNode(lead));
  var parts=clauses?t.split(/(?<=[，、；：！？・｜|。＋])(?![」』）》。，、])/):[t];
  if(clauses){var m=[];parts.forEach(function(x){if(m.length&&m[m.length-1].replace(/[\s，、；：！？・｜|。＋「」『』]/g,'').length<=3)m[m.length-1]+=x;else m.push(x)});
    if(m.length>1&&m[m.length-1].replace(/[\s，、；：！？・｜|。＋「」『』]/g,'').length<=2){var y=m.pop();m[m.length-1]+=y}parts=m}
  parts.forEach(function(part){
   var box=f;
   if(clauses&&parts.length>1){box=document.createElement('span');box.className='cjp';f.appendChild(box)}
   var ws=[];part.split(KEEP).forEach(function(x,i){if(!x)return;if(i%2)ws.push(x);else ws=ws.concat(join(words(x)))});
   for(var k=ws.length-1;k>0;k--){if(/^（[^（）]{1,4}）$/.test(ws[k])&&!/\s$/.test(ws[k-1])){ws[k-1]+=ws[k];ws.splice(k,1)}}
   for(var k=ws.length-1;k>0;k--){if(/^／/.test(ws[k])||/／$/.test(ws[k-1])){ws[k-1]+=ws[k];ws.splice(k,1)}}
   var vis=function(w){return w.replace(/[\s，。、！？」』）》：；・]/g,'').length};
   while(ws.length&&/^\s+$/.test(ws[ws.length-1])&&ws.length>1){var sp=ws.pop();ws[ws.length-1]+=sp}
   if(ws.length>=2&&vis(ws[ws.length-1])<=2){var z=ws.pop();ws[ws.length-1]+=z}
   if(ws.length>=2&&vis(ws[0])<=2&&CJK.test(ws[0])&&!/\s$/.test(ws[0])){var a0=ws.shift();ws[0]=a0+ws[0]}
      ws.forEach(function(w){
     if(/^\s+$/.test(w)||!CJK.test(w)&&w.length<2){box.appendChild(document.createTextNode(w));return}
     var s=document.createElement('span');s.className='cjw';var mm=w.match(/^(.*?)(\s*[・｜]\s*)$/);
     if(mm&&mm[1]){s.textContent=mm[1];var q=document.createElement('span');q.className='sep';q.textContent=mm[2];s.appendChild(q)}else s.textContent=w;box.appendChild(s)});
  });
  if(tail)f.appendChild(document.createTextNode(tail));
  var par=node.parentNode,d=getComputedStyle(par).display;
  if(/flex|grid/.test(d)){var g=document.createElement('span');g.className='cjg';g.appendChild(f);f=g}
  par.replaceChild(f,node);
 }
 function run(){
  var tw=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,{acceptNode:function(n){
    if(!CJK.test(n.nodeValue))return 2;
    for(var p=n.parentNode;p&&p!==document.body;p=p.parentNode){if(/^(SCRIPT|STYLE|svg|TEXTAREA|OPTION|TITLE)$/i.test(p.tagName))return 2;if(p.classList&&(p.classList.contains('nw')||p.classList.contains('cjw')||p.classList.contains('cjp')))return 2}
    return 1}});
  var ns=[],n;while(n=tw.nextNode())ns.push(n);
  ns.forEach(function(x){var b=x.parentNode;while(b!==document.body&&/^inline/.test(getComputedStyle(b).display))b=b.parentNode;
    wrap(x,(b.textContent||'').trim().length<=48)});
 }
 // hide a ・／｜ separator when it lands at the end of a line
 function nextTop(el){var w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);w.currentNode=el.lastChild||el;var n;
   while(n=w.nextNode()){if(el.contains(n))continue;var t=n.nodeValue,i=t.search(/\S/);if(i<0)continue;var r=document.createRange();r.setStart(n,i);r.setEnd(n,i+1);var b=r.getClientRects()[0];return b?b.top:null}return null}
 function edges(){document.querySelectorAll('.sep').forEach(function(s){s.style.visibility='';var r=s.getBoundingClientRect();if(!r.width)return;var t=nextTop(s);
   s.style.visibility=(t!==null&&t>r.bottom-2)?'hidden':''})}
 var et;function sched(){clearTimeout(et);et=setTimeout(edges,120)}
 function start(){run();edges();if(document.fonts)document.fonts.ready.then(edges);addEventListener('resize',sched);addEventListener('load',edges)}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
