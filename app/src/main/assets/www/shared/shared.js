/* NexGms shared runtime: viewport fit, theme, volume, game id */
(function(){
var d=document.documentElement;
try{var p=location.pathname.split('/');var i=p.indexOf('games');if(i>-1&&p[i+1])d.setAttribute('data-game',p[i+1])}catch(e){}
/* Layout fit: tablets get a scaled-up phone layout, tiny phones a scaled-down one.
   Inside the Android app the real window size comes from the native bridge (correct in split-screen). */
if(window.GC_FIT!==false){
var m=document.querySelector('meta[name=viewport]');
if(m){
function dims(){var n=window.GCNative;
 try{if(n&&n.viewW){var w=n.viewW(),h=n.viewH();if(w>0&&h>0)return[w,h]}}catch(e){}
 return[screen.width,screen.height]}
function fit(){var a=dims(),sw=a[0],sh=a[1],sc;
 if(sw<360)sc=sw/360;else sc=Math.max(1,Math.min(sw/520,sh/700));
 var W=Math.round(sw/sc);
 m.setAttribute('content','width='+W+',user-scalable=no');
 d.style.setProperty('--gc-scale',sc.toFixed(3))}
window.GCFit=fit;fit();
window.addEventListener('orientationchange',function(){setTimeout(fit,200)});
}}
function ls(k){try{return localStorage.getItem(k)}catch(e){return null}}
function apply(){var t=ls('gc_theme')||'auto';var dark=t==='dark'||(t==='auto'&&window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches);
 d.setAttribute('data-theme',dark?'dark':'light');try{window.GCNative&&GCNative.setDark(dark)}catch(e){}}
var v=parseFloat(ls('gc_volume'));window.GC={applyTheme:apply};window.GC_VOLUME=isNaN(v)?0.8:v;
apply();
var P=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){this.volume=window.GC_VOLUME;return P.apply(this,arguments)};
['AudioContext','webkitAudioContext'].forEach(function(n){var A=window[n];if(!A)return;
 var W=function(){var c=new A();var g=c.createGain();g.gain.value=window.GC_VOLUME;g.connect(c.destination);Object.defineProperty(c,'destination',{value:g});return c};
 W.prototype=A.prototype;window[n]=W});
})();

/* =====================================================================
   NexGms central layer: interstitial policy, rewarded ads, Home, Back
   Everything configurable lives in GC_ADS_CONFIG (override it before this file if needed).
   Native side (Android) exposes: GCNative.adsReady(type) / adsShow(type,id,lang) / openUrl(url)
   type: 1 = interstitial, 2 = rewarded.  Result callback: GCAdsResult(id,status)
   status: interstitial -> 'closed' | 'failed' ; rewarded -> 'rewarded' (once) then 'closed' | 'failed'
   ===================================================================== */
(function(){
var W=window,D=document;
var C=W.GC_ADS_CONFIG=Object.assign({
  minIntervalMs:90000,   /* minimum time between two interstitials (global, across games) */
  minEvents:2, maxEvents:5, /* an ad may appear after 2..5 eligible events (random threshold) */
  showProbability:0.8,   /* extra randomness once the threshold is reached */
  minPlayMs:25000,       /* no ad if the game page was opened less than this ago */
  dedupeMs:2500,         /* events closer than this count as one (win then Home) */
  resultDelayMs:1200,    /* round-end event fires after the result is visible */
  adTimeoutMs:120000,
  privacyUrl:'https://nexgms.vercel.app/',
  homeUrl:'../../index.html'
},W.GC_ADS_CONFIG||{});
function lg(){try{var l=localStorage.getItem('gc_lang');if(l==='fr'||l==='en')return l;var nav=(navigator.language||navigator.userLanguage||'').toLowerCase();if(nav.indexOf('fr')===0)return'fr';return'en'}catch(e){return'fr'}}
var M={
 fr:{ok:'Regarder la publicité',cancel:'Annuler',hint:['Obtenir un indice','Regardez une publicité complète pour obtenir un indice supplémentaire.'],
  hammer:['Obtenir un marteau','Regardez une publicité complète pour obtenir un marteau supplémentaire.'],
  noAd:'Publicité en cours de chargement. Veuillez réessayer dans quelques secondes.',
  noInternet:'Aucune connexion Internet ! Veuillez vous connecter à Internet pour regarder la publicité et obtenir votre récompense.',
  notCompleted:'Publicité non terminée ! La récompense n’est accordée que si vous regardez la publicité jusqu’à la fin.',
  got:'Récompense obtenue !',
  fail:'La publicité n’a pas pu être affichée. Veuillez vérifier votre connexion.',exit:'Appuyez encore pour quitter',privFail:'Impossible d’ouvrir la page.'},
 en:{ok:'Watch Ad',cancel:'Cancel',hint:['Get a hint','Watch a complete ad to get an additional hint.'],
  hammer:['Get a hammer','Watch an ad to get an extra hammer.'],
  noAd:'Ad is loading. Please wait a few seconds and try again.',
  noInternet:'No internet connection! Please connect to the internet to watch the ad and earn your reward.',
  notCompleted:'Ad not completed! You must watch the entire ad to receive your reward.',
  got:'Reward received!',
  fail:'The ad could not be shown. Please check your internet connection and try again.',exit:'Press again to exit',privFail:'Could not open the page.'}
};
function T(k){var l=lg();return(M[l]&&M[l][k])||M.fr[k]||M.en[k]||''}
function N(){return W.GCNative&&W.GCNative.adsShow?W.GCNative:null}
function isOnline(){if(W.GCNative&&typeof W.GCNative.isOnline==='function'){try{return!!W.GCNative.isOnline()}catch(e){}}return navigator.onLine!==false}
function ready(type){try{var n=N();return !!(n&&n.adsReady(type))}catch(e){return false}}
var cbs={},seq=0;
W.GCAdsResult=function(id,st){var f=cbs[id];if(f)f(st)};
function show(type,cb){
  var n=N();if(!n){cb('failed');return}
  var id='a'+(++seq),tm=setTimeout(function(){fin('failed')},C.adTimeoutMs);
  function fin(s){if(!cbs[id])return;if(s==='closed'||s==='failed'||s==='not_completed'||s==='no_internet'){clearTimeout(tm);delete cbs[id]}cb(s)}
  cbs[id]=fin;
  try{n.adsShow(type,id,lg())}catch(e){fin('failed')}
}
/* ---- small UI helpers ---- */
function toast(msg){var t=D.createElement('div');t.className='gcad-toast';t.textContent=msg;D.body.appendChild(t);
  setTimeout(function(){t.classList.add('out');setTimeout(function(){t.remove()},300)},2600)}
function dialog(title,text,okLabel,cancelLabel,onOk,onCancel){
  var bg=D.createElement('div');bg.className='gcad-bg';
  bg.innerHTML='<div class="gcad" role="dialog" aria-modal="true"><h3></h3><p></p><button class="gcad-ok"></button><button class="gcad-no"></button></div>';
  bg.querySelector('h3').textContent=title;bg.querySelector('p').textContent=text;
  var ok=bg.querySelector('.gcad-ok'),no=bg.querySelector('.gcad-no');ok.textContent=okLabel;no.textContent=cancelLabel;
  var done=false;function close(){if(done)return false;done=true;bg.remove();return true}
  ok.onclick=function(){if(close())onOk()};no.onclick=function(){if(close())onCancel&&onCancel()};
  bg._cancel=function(){if(close())onCancel&&onCancel()};
  D.body.appendChild(bg);return bg}
/* ---- interstitial policy ---- */
var KEY='gc_adstate',pageStart=Date.now(),lastEv=0,busy=false;
function rnd(a,b){return a+Math.floor(Math.random()*(b-a+1))}
var mem=null;function rd(){try{return sessionStorage.getItem(KEY)}catch(e){return mem}}
function load(){var s;try{s=JSON.parse(rd())}catch(e){}
  if(!s||typeof s.cnt!=='number'){s={cnt:0,thr:rnd(C.minEvents,C.maxEvents),last:Date.now()}}return s}
function save(s){mem=JSON.stringify(s);try{sessionStorage.setItem(KEY,mem)}catch(e){}}
save(load());
function event(kind,proceed){
  proceed=proceed||function(){};
  if(busy){return}
  var now=Date.now(),s=load(),dup=(now-lastEv)<C.dedupeMs;lastEv=now;
  if(!dup)s.cnt++;
  var ok=!dup&&s.cnt>=s.thr&&(now-s.last)>=C.minIntervalMs&&(now-pageStart)>=C.minPlayMs&&Math.random()<C.showProbability&&isOnline()&&ready(1);
  save(s);
  if(!ok){proceed();return}
  busy=true;var went=false;
  show(1,function(st){
    if(st==='closed'){var n=load();n.cnt=0;n.thr=rnd(C.minEvents,C.maxEvents);n.last=Date.now();save(n)}
    if(st==='closed'||st==='failed'||st==='no_internet'){busy=false;if(!went){went=true;proceed()}}
  });
}
/* ---- rewarded (strict: reward given ONLY when ad is fully watched) ---- */
function reward(kind,onOk,onDeny){
  var l=lg(),m=(M[l]&&M[l][kind])||(M[l]&&M[l].hint)||M.en.hint,deny=function(){onDeny&&onDeny()};
  if(!isOnline()){
    toast(T('noInternet'));
    deny();
    return;
  }
  dialog(m[0],m[1],T('ok'),T('cancel'),function(){
    if(!isOnline()){
      toast(T('noInternet'));
      deny();
      return;
    }
    if(!ready(2)){
      toast(T('noAd'));
      deny();
      return;
    }
    var got=false;
    show(2,function(st){
      if(st==='rewarded'&&!got){
        got=true;
        toast(T('got'));
        onOk();
      } else if(st==='not_completed'||(st==='closed'&&!got)){
        toast(T('notCompleted'));
        deny();
      } else if(st==='no_internet'){
        toast(T('noInternet'));
        deny();
      } else if(st==='failed'&&!got){
        toast(T('fail'));
        deny();
      }
    });
  },deny);
}
W.GCNetwork=function(online){};
/* ---- navigation ---- */
function goHome(){event('home',function(){location.href=C.homeUrl})}
function openPrivacy(){
  try{var n=W.GCNative;if(n&&n.openUrl){n.openUrl(C.privacyUrl);return}}catch(e){}
  try{W.open(C.privacyUrl,'_blank')}catch(e){toast(T('privFail'))}
}
W.GC=W.GC||{};
W.GC.ads={event:event,reward:reward,ready:ready,config:C,toast:toast};
W.GC.goHome=goHome;W.GC.openPrivacy=openPrivacy;
/* Android Back: pause menu while playing; resume from pause; leave from start/result screens */
function vis(e){if(!e||e.classList.contains('hidden'))return false;var c=getComputedStyle(e);return c.display!=='none'&&c.visibility!=='hidden'}
function click(sel){var e=D.querySelector(sel);if(e&&!e.disabled){e.click();return true}return false}
W.GCBack=function(){
  var dlg=D.querySelector('.gcad-bg');if(dlg){dlg._cancel&&dlg._cancel();return true}
  var po=D.getElementById('pauseOverlay');
  if(po&&vis(po)){return click('#resumeBtn,#btnResume')}
  var ov=[].slice.call(D.querySelectorAll('.overlay')).filter(vis);
  if(ov.length){
    var help=ov.filter(function(o){return /help/i.test(o.id)})[0];
    if(help){var b=help.querySelector('button');if(b){b.click();return true}}
    var lv=ov.filter(function(o){return /level/i.test(o.id)})[0];
    if(lv){var c=lv.querySelector('[id*=lose],[id*=Close],[class*=close]');if(c){c.click();return true}}
    goHome();return true}
  if(click('#pauseBtn,#btnPause,#btn-pause'))return true;
  if(click('#homeBtn,#btnHome,#btn-home,#btnBack')){return true}
  return false;
};
/* Round-end event: fires once a result / game-over overlay becomes visible */
if(W.MutationObserver){
  var seen=new WeakMap();
  new MutationObserver(function(ms){ms.forEach(function(m){var e=m.target;
    if(!e.classList||!e.classList.contains('overlay')||!/^(result|over|win|gameover|end)/i.test(e.id||''))return;
    var v=vis(e),was=seen.get(e)||false;seen.set(e,v);
    if(v&&!was)setTimeout(function(){if(vis(e))event('round_end')},C.resultDelayMs)})})
  .observe(D.documentElement,{attributes:true,subtree:true,attributeFilter:['class','style']});
}
})();
