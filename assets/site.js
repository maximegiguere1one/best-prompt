/* Pro Remorque — comportements partagés (toutes les pages) */
(function(){
'use strict';
var PR=window.PR=window.PR||{pins:[],unpins:[]};
var reduced=matchMedia('(prefers-reduced-motion: reduce)');

/* =========================================================================
   CONFIGURATION DE LA REMISE — la seule chose a changer avant la mise en ligne
   -------------------------------------------------------------------------
   LEAD_ENDPOINT : URL qui recoit les soumissions du formulaire. N'importe
   quel service qui accepte un POST JSON fait l'affaire (Formspree,
   Web3Forms, Netlify Forms, ou un script maison). Exemple :
       var LEAD_ENDPOINT='https://formspree.io/f/xxxxxxxx';

   Tant que LEAD_ENDPOINT est vide, le formulaire ouvre le client courriel
   du visiteur, pre-rempli, vers LEAD_EMAIL. Le site est donc fonctionnel
   des la premiere minute en ligne, sans aucun backend a installer.
   ========================================================================= */
var LEAD_ENDPOINT='';
var LEAD_EMAIL='info@proremorque.com';
var LEAD_TEL='1 877 939-9494';
PR.config={endpoint:LEAD_ENDPOINT,email:LEAD_EMAIL,tel:LEAD_TEL};
function clamp(v,lo,hi){return Math.min(hi,Math.max(lo,v))}
function rng(seed){var s=seed>>>0;return function(){s=(s*1664525+1013904223)>>>0;return s/4294967296}}
PR.reduced=reduced;
PR.clamp=clamp;

/* ===== boot ===== */
var yrEl=document.getElementById('yr');
if(yrEl)yrEl.textContent=new Date().getFullYear();
addEventListener('load',function(){document.body.classList.add('ready')});
setTimeout(function(){document.body.classList.add('ready')},600);

var contactEl=document.querySelector('.contact');
if(contactEl)contactEl.style.setProperty('--contact-bg',"url('assets/hero-ending.jpg')");

/* ===== nav: fond opaque + barre de progression ===== */
var navEl=document.querySelector('.nav');
var progEl=document.querySelector('.progress');
var navSolid=false,lastProg=-1;
function navCheck(){
  if(navEl){
    var want=scrollY>40;
    if(want!==navSolid){navSolid=want;navEl.classList.toggle('solid',want)}
  }
  if(progEl){
    var max=document.documentElement.scrollHeight-innerHeight;
    var pr=max>0?Math.min(1,scrollY/max):0;
    if(Math.abs(pr-lastProg)>0.004){lastProg=pr;progEl.style.transform='scaleX('+pr.toFixed(3)+')'}
  }
}
addEventListener('scroll',navCheck,{passive:true});navCheck();

/* ===== menu mobile ===== */
(function(){
  var btn=document.getElementById('nav-toggle');
  var panel=document.getElementById('nav-panel');
  if(!btn||!panel)return;
  function setOpen(open){
    btn.setAttribute('aria-expanded',open?'true':'false');
    panel.classList.toggle('open',open);
    document.body.classList.toggle('nav-open',open);
  }
  btn.addEventListener('click',function(){setOpen(btn.getAttribute('aria-expanded')!=='true')});
  panel.addEventListener('click',function(e){if(e.target.closest('a'))setOpen(false)});
  addEventListener('keydown',function(e){if(e.key==='Escape')setOpen(false)});
  matchMedia('(min-width: 981px)').addEventListener('change',function(e){if(e.matches)setOpen(false)});
})();

/* ===== scrollspy: souligne le lien de la section visible ===== */
(function(){
  var links=[].slice.call(document.querySelectorAll('.nav-links a[href^="#"]'));
  var pairs=links.map(function(a){
    var el=document.getElementById(a.getAttribute('href').slice(1));
    return el?{a:a,el:el}:null;
  }).filter(Boolean);
  if(!pairs.length)return;
  var current=null;
  var spy=new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      var p=pairs.filter(function(x){return x.el===e.target})[0];
      if(!p)return;
      if(e.isIntersecting){
        if(current)current.a.removeAttribute('aria-current');
        current=p;p.a.setAttribute('aria-current','true');
      }else if(current===p){
        p.a.removeAttribute('aria-current');current=null;
      }
    });
  },{rootMargin:'-30% 0px -50% 0px'});
  pairs.forEach(function(p){spy.observe(p.el)});
})();

/* ===== tilt 3D des cartes (pointeur fin, mouvement permis) ===== */
(function(){
  if(!matchMedia('(pointer: fine)').matches||reduced.matches)return;
  document.querySelectorAll('.cat,.tiltable').forEach(function(card){
    var tRaf=null,tx=0,ty=0,cur={x:0,y:0};
    function apply(){
      cur.x+=(tx-cur.x)*0.2;cur.y+=(ty-cur.y)*0.2;
      card.style.transform='rotateX('+cur.y.toFixed(2)+'deg) rotateY('+cur.x.toFixed(2)+'deg) translateY('+(tx||ty?-4:0)+'px)';
      if(Math.abs(tx-cur.x)>0.05||Math.abs(ty-cur.y)>0.05)tRaf=requestAnimationFrame(apply);
      else tRaf=null;
    }
    card.addEventListener('pointermove',function(e){
      var r=card.getBoundingClientRect();
      tx=((e.clientX-r.left)/r.width-0.5)*7;
      ty=-((e.clientY-r.top)/r.height-0.5)*6;
      card.classList.add('tilting');
      if(tRaf===null)tRaf=requestAnimationFrame(apply);
    });
    card.addEventListener('pointerleave',function(){
      tx=0;ty=0;
      if(tRaf===null)tRaf=requestAnimationFrame(apply);
      setTimeout(function(){card.classList.remove('tilting');card.style.transform=''},450);
    });
  });
})();

/* ===== entrées au scroll ===== */
var io=new IntersectionObserver(function(entries){
  entries.forEach(function(e){
    if(e.isIntersecting){
      e.target.classList.add('in');
      setTimeout(function(){e.target.classList.add('settled')},1400);
      io.unobserve(e.target);
    }
  });
},{threshold:0,rootMargin:'0px 0px -10% 0px'});
/* seuil 0 + marge basse: une section plus haute que la fenetre (la grille
   d'inventaire sur telephone) n'atteint jamais un ratio de 12% et ne serait
   jamais revelee. */
document.querySelectorAll('.reveal').forEach(function(s){io.observe(s)});

/* ===== cordon de soudure qui se dessine ===== */
(function(){
  var seamPath=document.getElementById('seam-path');
  var svcSection=document.querySelector('.services');
  if(!seamPath||!svcSection)return;
  var svcItems=[].slice.call(document.querySelectorAll('.svc'));
  var seamShown=-1,seamPinned=false;
  function seamUpdate(){
    if(seamPinned)return;
    var rect=svcSection.getBoundingClientRect();
    var p=clamp((innerHeight*0.82-rect.top)/(rect.height*0.85),0,1);
    var off=100-Math.round(p*100);
    if(off!==seamShown){seamShown=off;seamPath.style.strokeDashoffset=off;
      svcItems.forEach(function(el,i){
        var lit=p>(i+0.5)/svcItems.length;
        if(el.lit!==lit){el.lit=lit;el.classList.toggle('lit',lit)}
      });
    }
  }
  addEventListener('scroll',seamUpdate,{passive:true});seamUpdate();
  PR.pins.push(function(){
    seamPinned=true;seamPath.style.strokeDashoffset=0;
    svcItems.forEach(function(el){el.lit=true;el.classList.add('lit')});
  });
  PR.unpins.push(function(){seamPinned=false;seamShown=-1;seamUpdate()});
})();

/* ===== maintenir pour atteler ===== */
(function(){
  var hitchSect=document.querySelector('.hitch');
  var holdBtn=document.getElementById('hold-btn');
  if(!hitchSect||!holdBtn)return;
  var hp=0,holding=false,hitchDone=false,hRaf=null,hLast=0;
  function hitchApply(){
    hitchSect.style.setProperty('--hp',hp.toFixed(3));
    hitchSect.style.setProperty('--hd',hitchDone?1:0);
  }
  function finish(){
    hitchDone=true;hitchSect.classList.add('done');
    var svg=holdBtn.querySelector('svg');
    if(svg)svg.outerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M20 7L9 18l-5-5"/></svg>';
    holdBtn.lastChild.textContent=' Attelée. Bonne route.';
  }
  function hitchTick(now){
    var dt=Math.min(80,now-(hLast||now));hLast=now;
    if(holding)hp=Math.min(1,hp+dt/1300);
    else hp=Math.max(0,hp-dt/900);
    hitchApply();
    if(!hitchDone&&hp>=1)finish();
    if((holding||hp>0)&&!hitchDone)hRaf=requestAnimationFrame(hitchTick);
    else{hRaf=null;hLast=0}
  }
  function holdStart(e){
    if(hitchDone)return;
    if(e.type==='keydown'&&e.repeat)return;
    holding=true;
    if(hRaf===null)hRaf=requestAnimationFrame(hitchTick);
  }
  function holdEnd(){holding=false;
    if(hRaf===null&&hp>0&&!hitchDone)hRaf=requestAnimationFrame(hitchTick)}
  holdBtn.addEventListener('pointerdown',holdStart);
  addEventListener('pointerup',holdEnd);
  addEventListener('pointercancel',holdEnd);
  holdBtn.addEventListener('keydown',function(e){if(e.key===' '||e.key==='Enter'){e.preventDefault();holdStart(e)}});
  holdBtn.addEventListener('keyup',function(e){if(e.key===' '||e.key==='Enter')holdEnd()});
  holdBtn.addEventListener('click',function(e){e.preventDefault()});
  PR.pins.push(function(){if(!hitchDone){hp=1;finish();hitchApply()}});
})();

/* ===== marquees: chaque piste doit dépasser 2560px ===== */
document.querySelectorAll('.marq-track,.rb-track').forEach(function(track){
  var base=track.innerHTML;
  var guard=0;
  while(track.scrollWidth<2660&&guard++<12)track.innerHTML+=base;
  track.innerHTML+=track.innerHTML; /* seconde moitié pour la boucle -50% */
});

/* ===== curseur signature (pointeur fin, mouvement permis) ===== */
(function(){
  if(!matchMedia('(pointer: fine)').matches||reduced.matches)return;
  var dot=document.querySelector('.cur-dot'),ringEl=document.querySelector('.cur-ring');
  if(!dot||!ringEl)return;
  var cx=0,cy=0,rx=0,ry=0,cRaf=null,on=false;
  function cTick(){
    rx+=(cx-rx)*0.18;ry+=(cy-ry)*0.18;
    ringEl.style.left=rx+'px';ringEl.style.top=ry+'px';
    if(Math.abs(cx-rx)>0.3||Math.abs(cy-ry)>0.3)cRaf=requestAnimationFrame(cTick);
    else cRaf=null;
  }
  addEventListener('mousemove',function(e){
    cx=e.clientX;cy=e.clientY;
    dot.style.left=cx+'px';dot.style.top=cy+'px';
    if(!on){on=true;document.body.classList.add('cur-on')}
    if(cRaf===null)cRaf=requestAnimationFrame(cTick);
  },{passive:true});
  document.addEventListener('mouseleave',function(){document.body.classList.remove('cur-on');on=false});
  document.addEventListener('mouseover',function(e){
    var hit=e.target.closest&&e.target.closest('a,button,summary,input,textarea,select,.cat');
    document.body.classList.toggle('cur-hover',!!hit);
  });
})();

/* ===== braises du fond ===== */
(function(){
  var env=document.querySelector('.env');
  if(!env)return;
  var r=rng(99);
  for(var i=0;i<12;i++){
    var e=document.createElement('span');e.className='ember';
    e.style.left=(r()*100).toFixed(1)+'%';
    e.style.setProperty('--ex',((r()*2-1)*90).toFixed(0)+'px');
    e.style.setProperty('--eo',(0.12+r()*0.22).toFixed(2));
    var dur=34+r()*46;
    e.style.animationDuration=dur.toFixed(1)+'s';
    e.style.animationDelay=(-r()*dur).toFixed(1)+'s';
    env.appendChild(e);
  }
})();
document.addEventListener('visibilitychange',function(){
  document.body.classList.toggle('paused',document.hidden);
});

/* ===== formulaires: validation reelle + envoi reel ===== */
var RE_TEL=/^[\d\s().+-]{10,20}$/;
var RE_MAIL=/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function digits(v){return (v||'').replace(/\D/g,'')}

function validateField(el){
  var v=(el.value||'').trim();
  if(el.hasAttribute('required')&&!v)return false;
  if(!v)return true; /* optionnel et vide: valide */
  if(el.type==='tel')return RE_TEL.test(v)&&digits(v).length>=10&&digits(v).length<=15;
  if(el.type==='email')return RE_MAIL.test(v);
  return true;
}

function leadBody(data){
  var lines=['Nouvelle demande depuis proremorque.com',''];
  Object.keys(data).forEach(function(k){
    if(data[k])lines.push(k+' : '+data[k]);
  });
  lines.push('','Recue le '+new Date().toLocaleString('fr-CA'));
  return lines.join('\n');
}

document.querySelectorAll('form[data-validate]').forEach(function(form){
  var fields=[].slice.call(form.querySelectorAll('input,textarea,select'))
    .filter(function(el){return el.type!=='submit'&&el.name!=='site-web'});
  var btn=form.querySelector('[type=submit]');
  var btnLabel=btn?btn.querySelector('span'):null;
  var btnText=btnLabel?btnLabel.textContent:'';
  var failBox=form.parentNode.querySelector('.form-fail');

  function fieldErr(input,on){
    var f=input.closest('.field');
    if(f)f.classList.toggle('err',on);
    input.setAttribute('aria-invalid',on?'true':'false');
  }
  fields.forEach(function(el){
    /* on ne signale l'erreur qu'a la sortie du champ, jamais pendant la frappe */
    el.addEventListener('blur',function(){if(el.value.trim())fieldErr(el,!validateField(el))});
    el.addEventListener('input',function(){if(validateField(el))fieldErr(el,false)});
  });

  function busy(on){
    if(!btn)return;
    btn.disabled=on;
    btn.setAttribute('aria-busy',on?'true':'false');
    if(btnLabel)btnLabel.textContent=on?'Envoi…':btnText;
  }
  function succeed(){
    form.classList.add('sent');
    if(failBox)failBox.hidden=true;
    var ok=form.parentNode.querySelector('.form-ok');
    if(ok)ok.scrollIntoView({block:'center',behavior:reduced.matches?'auto':'smooth'});
  }
  function failOver(data){
    /* dernier recours: on ouvre le client courriel pre-rempli, puis on
       affiche le numero pour que personne ne reste sans porte de sortie */
    var href='mailto:'+LEAD_EMAIL
      +'?subject='+encodeURIComponent('Demande web — '+(data['Nom']||'client'))
      +'&body='+encodeURIComponent(leadBody(data));
    try{location.href=href}catch(_){}
    if(failBox)failBox.hidden=false;
    busy(false);
  }

  form.addEventListener('submit',function(e){
    e.preventDefault();
    var bad=null;
    fields.forEach(function(el){
      var ok=validateField(el);
      fieldErr(el,!ok);
      if(!ok&&!bad)bad=el;
    });
    if(bad){bad.focus();return}

    /* piege a robots: rempli seulement par un script, jamais par un humain */
    var hp=form.querySelector('[name="site-web"]');
    if(hp&&hp.value){succeed();return}

    var data={};
    fields.forEach(function(el){
      var lab=form.querySelector('label[for="'+el.id+'"]');
      var key=lab?lab.textContent.replace(/\s*\(optionnel\)\s*/i,'').trim():el.name;
      data[key]=el.value.trim();
    });
    data['Page']=location.pathname.split('/').pop()||'index.html';

    if(!LEAD_ENDPOINT){failOver(data);return}

    busy(true);
    var payload=Object.assign({_subject:'Demande web — '+(data['Nom']||'client')},data);
    fetch(LEAD_ENDPOINT,{
      method:'POST',
      headers:{'Content-Type':'application/json',Accept:'application/json'},
      body:JSON.stringify(payload)
    }).then(function(r){
      if(!r.ok)throw new Error('http '+r.status);
      busy(false);succeed();
    }).catch(function(){failOver(data)});
  });
});

/* ===== barre d'action mobile: apparait une fois le heros passe ===== */
(function(){
  var bar=document.querySelector('.callbar');
  if(!bar)return;
  /* le second bouton ne doit jamais pointer vers la page courante */
  var ici=(location.pathname.split('/').pop()||'index.html');
  var alt=bar.querySelector('.cb-inv');
  if(alt&&/inventaire\.html$/.test(ici)){
    alt.setAttribute('href','contact.html');
    alt.querySelector('span').textContent='Nous écrire';
    alt.querySelector('svg').innerHTML='<path d="M4 5h16v14H4z"/><path d="m4 7 8 6 8-6"/>';
  }else if(alt&&/contact\.html$/.test(ici)){
    alt.setAttribute('href','inventaire.html');
  }
  var last=null;
  function place(){
    /* sur l'accueil le heros fait 1000vh: on attend d'en etre sorti */
    var hero=document.querySelector('.hero-static, .hero, .phero');
    var seuil=hero?Math.min(hero.offsetTop+hero.offsetHeight,innerHeight*1.2):innerHeight*0.6;
    var up=scrollY>Math.max(320,seuil*0.55);
    if(up!==last){last=up;bar.classList.toggle('up',up)}
  }
  addEventListener('scroll',place,{passive:true});
  addEventListener('resize',place);
  place();
})();

/* ===== FAQ: une seule ouverte ===== */
document.querySelectorAll('.faq').forEach(function(d){
  d.addEventListener('toggle',function(){
    if(d.open)document.querySelectorAll('.faq[open]').forEach(function(o){if(o!==d)o.open=false});
  });
});

/* ===== mouvement réduit, en direct et dans les deux sens ===== */
function pinAll(){
  document.querySelectorAll('.reveal').forEach(function(s){s.classList.add('in','settled')});
  PR.pins.forEach(function(f){try{f()}catch(_){}});
}
function unpinAll(){PR.unpins.forEach(function(f){try{f()}catch(_){}})}
PR.pinAll=pinAll;PR.unpinAll=unpinAll;
reduced.addEventListener('change',function(e){
  if(e.matches)pinAll();else unpinAll();
});
if(reduced.matches)pinAll();
})();
