/* Pro Remorque — hero scrub (accueil seulement) */
(function(){
'use strict';
if(!document.querySelector('.stage')||!document.getElementById('hero-video'))return;
var PR=window.PR=window.PR||{pins:[],unpins:[]};
var vid=document.getElementById('hero-video');
var stage=document.querySelector('.stage');
var posterLayer=document.querySelector('.poster');
var hero=document.querySelector('.hero');
var ringWrap=document.querySelector('.ring-wrap');
var ring=document.querySelector('.ring circle');
var VIDEO_URL='assets/hero-scrub.mp4';
var VIDEO_BYTES=10149333; /* real byte size of hero-scrub.mp4 */
var POSTER_URL='assets/hero-poster.jpg';
var STATIC_URL='assets/hero-ending.jpg';
var reduced=matchMedia('(prefers-reduced-motion: reduce)');

/* static hero background, set from JS so it participates in the gate story.
   URL absolue: une url() relative dans une custom property se resout contre
   la feuille de style (assets/site.css), pas contre le document. */
document.querySelector('.hero-static').style.setProperty('--static-bg',"url('"+new URL(STATIC_URL,document.baseURI).href+"')");

/* ===== seeded split ===== */
function rng(seed){var s=seed>>>0;return function(){s=(s*1664525+1013904223)>>>0;return s/4294967296}}
function splitEl(el){
  var seed=parseInt(el.getAttribute('data-seed')||'1',10);
  var r=rng(seed);
  var text=el.textContent;
  var emIdx=(el.getAttribute('data-em')||'').split(',').filter(Boolean).map(Number);
  el.textContent='';
  var sr=document.createElement('span');sr.className='sr-only';sr.textContent=text;el.appendChild(sr);
  var vis=document.createElement('span');vis.setAttribute('aria-hidden','true');
  var words=text.split(/(\s+)/);
  var wi=0,ci=0,total=text.replace(/\s/g,'').length;
  words.forEach(function(word){
    if(/^\s+$/.test(word)){vis.appendChild(document.createTextNode(word));return}
    var w=document.createElement('span');w.className='w';
    if(emIdx.indexOf(wi)>=0)w.classList.add('em');
    w.style.setProperty('--th',(wi*0.09+r()*0.05).toFixed(3));
    for(var i=0;i<word.length;i++){
      var c=document.createElement('span');c.className='c';c.textContent=word[i];
      c.style.setProperty('--th',(ci/Math.max(1,total)*0.4+r()*0.12).toFixed(3));
      c.style.setProperty('--jx',((r()*2-1)*46).toFixed(1)+'px');
      c.style.setProperty('--jy',((r()*2-1)*34).toFixed(1)+'px');
      c.style.setProperty('--jr',((r()*2-1)*14).toFixed(1)+'deg');
      w.appendChild(c);ci++;
    }
    vis.appendChild(w);wi++;
  });
  el.appendChild(vis);
}
document.querySelectorAll('.split').forEach(splitEl);

/* ===== bands ===== */
var bands=[].slice.call(document.querySelectorAll('.band')).map(function(el,i){
  return {el:el,a:parseFloat(el.getAttribute('data-a')),b:parseFloat(el.getAttribute('data-b')),
    sa:el.getAttribute('data-sa')||'0.62',first:i===0,last:false,op:-1,k:-1};
});
bands[bands.length-1].last=true;
bands.forEach(function(b){b.el.style.setProperty('--sa',b.sa)});
function smoothstep(p,e0,e1){var t=Math.min(1,Math.max(0,(p-e0)/(e1-e0)));return t*t*(3-2*t)}
function clamp(v,lo,hi){return Math.min(hi,Math.max(lo,v))}
/* chapter dots: one per band, click scrolls to that beat */
var cueEl=document.querySelector('.cue'),cueOff=false;
var chWrap=document.getElementById('chapters');
var chBtns=bands.map(function(b,i){
  var bt=document.createElement('button');
  bt.type='button';
  bt.setAttribute('aria-label','Aller au chapitre '+(i+1));
  bt.addEventListener('click',function(){
    var range=hero.getBoundingClientRect().height-innerHeight;
    scrollTo({top:Math.round(hero.offsetTop+range*(b.a+Math.min(0.03,(b.b-b.a)/2))),behavior:reduced.matches?'auto':'smooth'});
  });
  chWrap.appendChild(bt);
  return bt;
});
var chActive=-1;
var loadK=0,loadK0=null;
function updateCaptions(p,now){
  var wantOff=p>0.04;
  if(wantOff!==cueOff){cueOff=wantOff;cueEl.classList.toggle('off',wantOff)}
  var act=0;
  for(var i=0;i<bands.length;i++){if(p>=bands[i].a-0.02)act=i}
  if(act!==chActive){
    if(chActive>=0)chBtns[chActive].classList.remove('on');
    chBtns[act].classList.add('on');chActive=act;
  }
  if(bands[0]&&loadK<1&&now!=null){
    if(loadK0===null)loadK0=now;
    loadK=clamp((now-loadK0)/1400,0,1);
    loadK=loadK*loadK*(3-2*loadK);
  }
  bands.forEach(function(b){
    var f=Math.min(0.02,(b.b-b.a)/3);
    var op=(b.first?1:smoothstep(p,b.a,b.a+f))*(b.last?1:(1-smoothstep(p,b.b-f,b.b)));
    if(b.first)op=op*(1-smoothstep(p,b.b-f,b.b));
    if(b.last)op=smoothstep(p,b.a,b.a+f);
    var ramp=Math.min(0.025,(b.b-b.a)*0.35);
    var k=clamp((p-b.a)/ramp,0,1);
    if(b.first)k=Math.max(k,loadK);
    if(Math.abs(op-b.op)>0.008){b.op=op;b.el.style.opacity=op.toFixed(3);
      var on=op>0.02;
      if(on)b.el.setAttribute('data-on','');else b.el.removeAttribute('data-on');
      try{b.el.inert=!on}catch(_){}}
    if(Math.abs(k-b.k)>0.008){b.k=k;b.el.style.setProperty('--k',k.toFixed(3));
      if(b.last){
        b.el.style.setProperty('--ks',clamp((k-0.66)*4,0,1).toFixed(3));
        b.el.style.setProperty('--kb',clamp((k-0.78)*5,0,1).toFixed(3));
      }
    }
  });
}

/* ===== scrub drive ===== */
var target=0,shown=0,rafId=null,lastTick=0,heroOnScreen=true;
function heroProgress(){
  var rect=hero.getBoundingClientRect();
  var range=rect.height-innerHeight;
  if(range<=0)return 0;
  return clamp(-rect.top/range,0,1);
}
var seekBusy=false,pendingTime=null;
function requestSeek(t){
  if(!vid.duration)return;
  if(seekBusy){pendingTime=t;return}
  seekBusy=true;vid.currentTime=t;
}
vid.addEventListener('seeked',function(){seekBusy=false;
  if(pendingTime!==null){var t=pendingTime;pendingTime=null;requestSeek(t)}});
vid.addEventListener('error',function(){seekBusy=false;pendingTime=null});
function tick(now){
  var dt=Math.min(100,now-(lastTick||now));lastTick=now;
  var k=0.16;
  shown+=(target-shown)*(1-Math.pow(1-k,dt/16.667));
  if(Math.abs(target-shown)<0.0005&&loadK>=1){shown=target;rafId=null;lastTick=0}
  else{rafId=requestAnimationFrame(tick)}
  if(vid.duration)requestSeek(shown*vid.duration);
  updateCaptions(shown,now);
}
function onScroll(){
  target=heroProgress();
  if(rafId===null&&heroOnScreen)rafId=requestAnimationFrame(tick);
}
new IntersectionObserver(function(en){heroOnScreen=en[0].isIntersecting;
  if(heroOnScreen)onScroll();
},{rootMargin:'80px'}).observe(hero);

/* ===== blob loader ===== */
var started=false,heroInit=false;
function startBlobFetch(){if(started)return;started=true;loadHeroBlob().catch(failVideo)}
function initHeroOnce(){
  if(heroInit)return;heroInit=true;
  posterLayer.style.backgroundImage="url('"+POSTER_URL+"')";
  var pi=new Image();pi.onload=startBlobFetch;pi.onerror=startBlobFetch;pi.src=POSTER_URL;
  setTimeout(startBlobFetch,4000);
}
function loadHeroBlob(){
  var ctrl=new AbortController();
  var watchdog=setTimeout(function(){ctrl.abort()},20000);
  ringWrap.hidden=false;
  return fetch(VIDEO_URL,{priority:'low',signal:ctrl.signal}).then(function(res){
    if(!res.ok)throw new Error('http '+res.status);
    var total=Number(res.headers.get('Content-Length'))||VIDEO_BYTES;
    var reader=res.body.getReader();
    var chunks=[],got=0,lastRing=0;
    function pump(){
      return reader.read().then(function(r){
        if(r.done)return;
        clearTimeout(watchdog);
        watchdog=setTimeout(function(){ctrl.abort()},20000);
        chunks.push(r.value);got+=r.value.length;
        var frac=Math.min(1,got/total);
        var now=performance.now();
        if(now-lastRing>100||frac===1){lastRing=now;
          ring.style.setProperty('--ld',Math.round(126*(1-frac)))}
        return pump();
      });
    }
    return pump().then(function(){
      clearTimeout(watchdog);
      ring.style.setProperty('--ld',0);
      vid.src=URL.createObjectURL(new Blob(chunks));
      vid.load();
      vid.addEventListener('canplay',function(){
        requestSeek(heroProgress()*vid.duration);
        stage.classList.add('video-ready');
        setTimeout(function(){ringWrap.hidden=true},600);
      },{once:true});
    });
  });
}
function failVideo(){
  ringWrap.hidden=true;
  stage.classList.add('video-failed');
}
vid.addEventListener('error',failVideo);

/* ===== the five gates, live ===== */
var GATES=[
  '(max-width: 720px)',
  '(orientation: portrait) and (max-width: 1024px)',
  '(orientation: portrait) and (pointer: coarse)',
  '(orientation: landscape) and (pointer: coarse) and (max-height: 560px)',
  '(prefers-reduced-motion: reduce)'
];
var scrubOn=false;
function enableScrub(){
  if(scrubOn)return;scrubOn=true;
  initHeroOnce();
  addEventListener('scroll',onScroll,{passive:true});
  bands.forEach(function(b){b.op=-1;b.k=-1});
  if(PR.unpinAll)PR.unpinAll();
  updateCaptions(heroProgress(),performance.now());
  onScroll();
}
function disableScrub(){
  if(!scrubOn)return;scrubOn=false;
  removeEventListener('scroll',onScroll);
  if(rafId!==null){cancelAnimationFrame(rafId);rafId=null}
}
function applyHeroMode(){
  var gated=GATES.some(function(q){return matchMedia(q).matches});
  if(gated)disableScrub();else enableScrub();
}
var MQLS=GATES.map(function(q){return matchMedia(q)});
MQLS.forEach(function(m){m.addEventListener('change',applyHeroMode)});

/* hero registers itself with the shared reduced-motion coordinator */
PR.pins.push(function(){
  bands.forEach(function(b){b.el.style.opacity=1;b.el.style.setProperty('--k',1);
    b.el.style.setProperty('--ks',1);b.el.style.setProperty('--kb',1);
    b.el.removeAttribute('data-on');try{b.el.inert=false}catch(_){}});
  disableScrub();
});
PR.unpins.push(applyHeroMode);
applyHeroMode();
if(reduced.matches)PR.pins.forEach(function(f){f()});
})();
