'use strict';
// ==========================================================================
// Tubes de Couleurs (Color Sort) — 50 niveaux, tous vérifiés résolubles
// ==========================================================================
const CAP = 4, TOTAL = 50, UNLOCK_ALL = false; // UNLOCK_ALL=false => niveaux déverrouillés un par un
const PALETTE = ['#FF9800','#1565C0','#E53935','#795548','#2E7D32','#EC407A','#FFEB3B','#8E24AA','#00BCD4','#9E9E9E','#8BC34A','#3F51B5'];

// ---------- Core (pur, testable sous Node) ----------
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function levelSpec(l){
  const colors = l<=5?3 : l<=10?4 : l<=15?5 : l<=20?6 : l<=25?7 : l<=30?8 : l<=36?9 : l<=42?10 : l<=47?11 : 12;
  return {colors, empty:2};
}
const key = s => s.map(t=>t.join(',')).sort().join('|');
function runLen(t){let i=t.length-1,c=t[i],n=0;while(i>=0&&t[i]===c){n++;i--}return n}
function uniform(t){return t.length>0&&t.every(x=>x===t[0])}
function isWon(s){return s.every(t=>t.length===0||(t.length===CAP&&uniform(t)))}
function canPour(s,a,b){
  const A=s[a],B=s[b];
  if(a===b||!A.length||B.length>=CAP)return false;
  return !B.length||B[B.length-1]===A[A.length-1];
}
function pour(s,a,b){ // mutates, returns number of segments moved
  const n=Math.min(runLen(s[a]),CAP-s[b].length);
  for(let i=0;i<n;i++)s[b].push(s[a].pop());
  return n;
}
function movesOf(s){
  const out=[];let emptySeen=false;
  for(let a=0;a<s.length;a++){
    const A=s[a];if(!A.length)continue;
    if(A.length===CAP&&uniform(A))continue;
    emptySeen=false;
    for(let b=0;b<s.length;b++){
      if(!canPour(s,a,b))continue;
      if(!s[b].length){if(uniform(A)||emptySeen)continue;emptySeen=true}
      out.push([a,b]);
    }
  }
  return out;
}
function heur(s){let v=0;for(const t of s){if(!t.length)continue;let i=0;while(i<t.length&&t[i]===t[0])i++;v+=t.length-i}return v}
function solve(start,maxNodes){
  maxNodes=maxNodes||250000;
  if(isWon(start))return [];
  const seen=new Set([key(start)]);
  const heap=[];
  const push=n=>{heap.push(n);let i=heap.length-1;while(i>0){const p=(i-1)>>1;if(heap[p].f<=heap[i].f)break;[heap[p],heap[i]]=[heap[i],heap[p]];i=p}};
  const pop=()=>{const top=heap[0],last=heap.pop();if(heap.length){heap[0]=last;let i=0;for(;;){let l=2*i+1,r=l+1,m=i;if(l<heap.length&&heap[l].f<heap[m].f)m=l;if(r<heap.length&&heap[r].f<heap[m].f)m=r;if(m===i)break;[heap[m],heap[i]]=[heap[i],heap[m]];i=m}}return top};
  push({s:start,p:null,mv:null,d:0,f:heur(start)*3});
  let nodes=0;
  while(heap.length&&nodes<maxNodes){
    const n=pop();nodes++;
    for(const [a,b] of movesOf(n.s)){
      const ns=n.s.map(t=>t.slice());pour(ns,a,b);
      const k=key(ns);if(seen.has(k))continue;seen.add(k);
      const c={s:ns,p:n,mv:[a,b],d:n.d+1,f:heur(ns)*3+(n.d+1)*0.5};
      if(isWon(ns)){const path=[];for(let x=c;x.p;x=x.p)path.push(x.mv);return path.reverse()}
      push(c);
    }
  }
  return null;
}
const _cache={};
function generate(l){
  if(_cache[l])return _cache[l].map(t=>t.slice());
  const {colors,empty}=levelSpec(l);
  for(let at=0;at<200;at++){
    const r=rng(l*1009+at*7919+13);
    const bag=[];for(let c=0;c<colors;c++)for(let i=0;i<CAP;i++)bag.push(c);
    for(let i=bag.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]]}
    const tubes=[];for(let i=0;i<colors;i++)tubes.push(bag.slice(i*CAP,(i+1)*CAP));
    if(tubes.some(uniform))continue;
    for(let i=0;i<empty;i++)tubes.push([]);
    const sol=solve(tubes,200000);
    if(!sol||sol.length<colors)continue;
    _cache[l]=tubes.map(t=>t.slice());
    return tubes;
  }
  throw new Error('Level '+l+' not generated');
}
// ---------- Géométrie : tube de verre + niveaux d'eau toujours horizontaux ----------
const RATIO = 4.4; // hauteur du tube / largeur
function clipBelow(pts,y){const out=[];for(let i=0;i<pts.length;i++){const p=pts[i],q=pts[(i+1)%pts.length],pi=p[1]>=y,qi=q[1]>=y;if(pi)out.push(p);if(pi!==qi){const t=(y-p[1])/(q[1]-p[1]);out.push([p[0]+t*(q[0]-p[0]),y])}}return out}
function polyArea(p){let a=0;for(let i=0;i<p.length;i++){const q=p[(i+1)%p.length];a+=p[i][0]*q[1]-q[0]*p[i][1]}return Math.abs(a)/2}
function areaBelow(pts,y){return polyArea(clipBelow(pts,y))}
function levelFor(pts,A){let lo=Infinity,hi=-Infinity;for(const p of pts){if(p[1]<lo)lo=p[1];if(p[1]>hi)hi=p[1]}for(let i=0;i<26;i++){const m=(lo+hi)/2;if(areaBelow(pts,m)>A)lo=m;else hi=m}return(lo+hi)/2}
function rotPts(pts,th,ox){const c=Math.cos(th),s=Math.sin(th);return pts.map(p=>{const x=p[0]-(ox||0),y=p[1];return[x*c-y*s,x*s+y*c]})}
function xformPts(pts,tx,ty,th){const c=Math.cos(th),s=Math.sin(th);return pts.map(p=>[tx+p[0]*c-p[1]*s,ty+p[0]*s+p[1]*c])}
function tubePoly(xi,L){const pts=[[-xi,0]];for(let i=0;i<=14;i++){const a=Math.PI-i*Math.PI/14;pts.push([xi*Math.cos(a),L-xi+xi*Math.sin(a)])}pts.push([xi,0]);return pts}
// angle d'inclinaison pour que la surface horizontale de l'eau passe exactement par le bord du tube
function thetaFor(poly,lipX,V){let lo=0,hi=1.75;for(let i=0;i<24;i++){const m=(lo+hi)/2;if(areaBelow(rotPts(poly,m,lipX),0)>V)lo=m;else hi=m}return(lo+hi)/2}

if(typeof document==='undefined'){module.exports={generate,solve,isWon,levelSpec,TOTAL,CAP,tubePoly,areaBelow,thetaFor,levelFor,RATIO};}
else{
const STR={
 en:{'hint.label':'Hint','game.title':'Color Tubes','game.subtitle':'Sort the colors until each tube is one color','game.start':'Start','game.quit':'Quit','level':'Level','levels':'Levels','help.title':'How to play','help.li1':'Tap a tube, then tap another one to pour the top color into it.','help.li2':'You can only pour onto the same color or into an empty tube.','help.li3':'Fill every tube with a single color to win.','help.li4':'Hint is unlimited, and Undo takes back your last move.','help.close':'Got it','result.banner':'🎉 Level complete!','result.record':'New record!','result.moves':'Moves','result.time':'Time','result.best':'Best','result.next':'Next level','result.again':'Replay','result.menu':'Levels','hint.none':'No solution from here — undo or restart','done.all':'All 50 levels done! 🏆','aria.back':'Back','aria.levels':'Levels','aria.undo':'Undo','aria.hint':'Hint','aria.restart':'Restart','aria.help':'How to play'},
 fr:{'hint.label':'Indice','game.title':'Tubes de Couleurs','game.subtitle':'Trie les couleurs : un tube = une couleur','game.start':'Commencer','game.quit':'Quitter','level':'Niveau','levels':'Niveaux','help.title':'Comment jouer','help.li1':'Touche un tube, puis un autre pour y verser la couleur du dessus.','help.li2':'On ne peut verser que sur la même couleur ou dans un tube vide.','help.li3':'Remplis chaque tube avec une seule couleur pour gagner.','help.li4':'L’indice est illimité, et Annuler reprend ton dernier coup.','help.close':'Compris','result.banner':'🎉 Niveau terminé !','result.record':'Nouveau record !','result.moves':'Coups','result.time':'Temps','result.best':'Record','result.next':'Niveau suivant','result.again':'Rejouer','result.menu':'Niveaux','hint.none':'Aucune solution d’ici — annule ou recommence','done.all':'Les 50 niveaux sont finis ! 🏆','aria.back':'Retour','aria.levels':'Niveaux','aria.undo':'Annuler','aria.hint':'Indice','aria.restart':'Recommencer','aria.help':'Comment jouer'}
};
const LANG_KEY='gc_lang',SOUND_KEY='gc_sound',LVL_KEY='colorSortLevel',DONE_KEY='colorSortDone',HOME_URL='../../index.html';

const S={hu:{},hx:0,token:0,busy:false,lang:'fr',sound:true,level:1,tubes:[],hist:[],sel:null,moves:0,secs:0,timer:null,won:false,path:null,done:{},hint:null,lift:[],anim:null,pose:null,raf:0};
const $=id=>document.getElementById(id);
const t=k=>(STR[S.lang]&&STR[S.lang][k])||STR.fr[k]||k;
const ls={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
const snd={};['move','click','win'].forEach(n=>{snd[n]=new Audio('sounds/'+n+'.wav')});
function play(n){if(S.sound&&snd[n]){const a=snd[n].cloneNode(true);a.play().catch(()=>{})}}
const show=e=>e.classList.remove('hidden'),hide=e=>e.classList.add('hidden');
const fmt=s=>String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');
const cv=$('cv'),ctx=cv.getContext('2d');
let G=null;

function applyLanguage(){
  document.documentElement.lang=S.lang;
  document.querySelectorAll('[data-i18n]').forEach(e=>{e.textContent=t(e.getAttribute('data-i18n'))});
  [['btnBack','aria.back'],['btnLevels','aria.levels'],['btnUndo','aria.undo'],['btnHint','aria.hint'],['btnRestart','aria.restart'],['btnHelp','aria.help']].forEach(([i,k])=>$(i).setAttribute('aria-label',t(k)));
  $('topTitle').textContent=t('level')+' '+S.level;
}
function toast(msg){const e=$('toast');e.textContent=msg;show(e);clearTimeout(toast.h);toast.h=setTimeout(()=>hide(e),2400)}

// ---------- layout responsive (canvas) ----------
function layout(){
  const fr=$('boardFrame'),W=fr.clientWidth,H=fr.clientHeight,dpr=Math.min(window.devicePixelRatio||1,3);
  if(!W||!H)return;
  cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);
  const n=S.tubes.length;let best=null;
  for(let r=1;r<=3;r++){
    const cols=Math.ceil(n/r);
    const tw=Math.min(70,(W-16)/(1.3*cols-0.3),(H-10)/(1.9+RATIO*r+0.55*(r-1)));
    if(!best||tw>best.tw*1.12)best={tw,cols,r};
  }
  const tw=best.tw,L=RATIO*tw,b=Math.max(2,tw*0.055),xi=tw/2-b;
  const poly=tubePoly(xi,L),yFull=tw*0.45;
  const unit=areaBelow(poly,yFull)/CAP;
  const contentH=1.9*tw+best.r*L+(best.r-1)*0.55*tw,top=(H-contentH)/2+1.9*tw;
  const pos=[];
  for(let i=0;i<n;i++){
    const row=Math.floor(i/best.cols),idx=i%best.cols,rc=Math.min(best.cols,n-row*best.cols);
    const x0=(W-(1.3*rc-0.3)*tw)/2;
    pos.push({cx:x0+idx*1.3*tw+tw/2,my:top+row*(L+0.55*tw)});
  }
  G={W,H,dpr,tw,L,b,xi,poly,unit,pos};
}

// ---------- dessin ----------
function drawTube(layers,vol,tx,ty,th,edge,glow){
  const c=ctx,g=G,dark=document.documentElement.getAttribute('data-theme')==='dark';
  const path=(r)=>{c.beginPath();c.moveTo(-r,0);c.lineTo(-r,g.L-g.xi);c.arc(0,g.L-g.xi,r,Math.PI,0,true);c.lineTo(r,0);if(r===g.xi)c.closePath()};
  c.save();c.translate(tx,ty);c.rotate(th);
  path(g.xi);c.fillStyle=dark?'rgba(255,255,255,.05)':'rgba(255,255,255,.55)';c.fill();
  c.save();c.clip();
  if(vol>1e-4){
    c.setTransform(g.dpr,0,0,g.dpr,0,0);
    const wp=xformPts(g.poly,tx,ty,th);
    let minX=1e9,maxX=-1e9,maxY=-1e9;for(const p of wp){if(p[0]<minX)minX=p[0];if(p[0]>maxX)maxX=p[0];if(p[1]>maxY)maxY=p[1]}
    let prev=maxY+3,top=prev;
    for(let k=0;k<layers.length;k++){
      const cs=k*g.unit,ce=Math.min((k+1)*g.unit,vol);if(ce<=cs+1e-4)break;
      const y=levelFor(wp,ce);
      c.fillStyle=PALETTE[layers[k]];c.fillRect(minX-3,y,maxX-minX+6,prev-y+0.5);
      prev=y;top=y;
    }
    c.fillStyle='rgba(255,255,255,.45)';c.fillRect(minX-3,top,maxX-minX+6,Math.max(2,g.tw*0.05));
    c.setTransform(g.dpr,0,0,g.dpr,0,0);c.translate(tx,ty);c.rotate(th);
  }
  const gr=c.createLinearGradient(-g.xi,0,g.xi,0);
  gr.addColorStop(0,'rgba(255,255,255,.3)');gr.addColorStop(.3,'rgba(255,255,255,0)');gr.addColorStop(1,'rgba(0,0,0,.1)');
  c.fillStyle=gr;c.fillRect(-g.xi,0,2*g.xi,g.L);
  c.restore();
  // reflet
  c.fillStyle='rgba(255,255,255,'+(dark?.25:.6)+')';
  const rx=-g.xi+g.tw*0.1,rw=g.tw*0.1,ry=g.tw*0.35,rh=g.L*0.55;
  if(c.roundRect){c.beginPath();c.roundRect(rx,ry,rw,rh,rw/2);c.fill()}else c.fillRect(rx,ry,rw,rh);
  // contour (tube ouvert, sans col)
  path(g.xi+g.b/2);c.lineWidth=g.b;c.lineCap='round';c.lineJoin='round';
  c.strokeStyle=edge;if(glow){c.shadowColor=glow;c.shadowBlur=14}
  c.stroke();
  c.restore();
}
function paint(){
  if(!G)return;
  const c=ctx,g=G,dark=document.documentElement.getAttribute('data-theme')==='dark';
  c.setTransform(g.dpr,0,0,g.dpr,0,0);c.clearRect(0,0,g.W,g.H);
  const base=dark?'#6F7FAE':'#A9B9CF',skip=S.anim?[S.anim.a,S.anim.b]:[];
  S.tubes.forEach((tb,i)=>{
    if(skip.includes(i))return;
    let edge=base,glow=null;
    if(tb.length===CAP&&uniform(tb))edge='#1FC79B';
    if(S.sel===i)edge='#6C5CE7';
    if(S.hint&&S.hint.a===i){edge='#FFA93E';glow='rgba(255,169,62,.7)'}
    if(S.hint&&S.hint.b===i){edge='#1FC79B';glow='rgba(31,199,155,.7)'}
    drawTube(tb,tb.length*g.unit,g.pos[i].cx,g.pos[i].my-S.lift[i],0,edge,glow);
  });
  const P=S.pose;
  if(S.anim&&P){
    drawTube(P.dst.layers,P.dst.vol,P.dst.tx,P.dst.ty,0,base,null);
    if(P.stream&&P.stream.e>0){
      const s=P.stream,w=s.w*s.e;
      c.fillStyle=PALETTE[S.anim.color];
      c.beginPath();
      if(c.roundRect)c.roundRect(s.x-w/2,s.y1,w,Math.max(1,s.y2-s.y1),w/2);else c.rect(s.x-w/2,s.y1,w,s.y2-s.y1);
      c.fill();
      c.fillStyle='rgba(255,255,255,.35)';c.fillRect(s.x-w/2+w*0.15,s.y1,w*0.22,Math.max(1,s.y2-s.y1));
      c.beginPath();c.ellipse(s.x,s.y2,w*1.5,w*0.35,0,0,6.2832);c.fillStyle='rgba(255,255,255,.4)';c.fill();
    }
    drawTube(P.src.layers,P.src.vol,P.src.tx,P.src.ty,P.src.th,base,null);
  }
}

// ---------- animation de versement ----------
function animatePour(a,b,n,color,done){
  const g=G,tw=g.tw,unit=g.unit;
  const A={a,b,n,color,done,token:S.token,t0:performance.now(),side:g.pos[a].cx<g.pos[b].cx?1:-1,cl:S.lift[a],layersA:S.tubes[a].concat(Array(n).fill(color)),snd:false};
  A.V0=A.layersA.length*unit;A.Vb0=(S.tubes[b].length-n)*unit;
  A.lx=g.pos[b].cx-A.side*tw*0.12;A.ly=g.pos[b].my-tw*0.95;
  A.thP=A.side*thetaFor(g.poly,tw/2,A.V0);
  A.tx0=g.pos[a].cx;A.ty0=g.pos[a].my-A.cl;
  S.lift[a]=0;S.anim=A;S.busy=true;requestDraw();
}
const ease=u=>u<=0?0:u>=1?1:u*u*(3-2*u);
function poseAt(A,th){const tw=G.tw;return{tx:A.lx-A.side*tw/2*Math.cos(th),ty:A.ly-A.side*tw/2*Math.sin(th),th}}
function poseAnim(now){
  const A=S.anim,g=G,tw=g.tw,unit=g.unit,t=now-A.t0;
  if(A.token!==S.token){S.anim=null;S.pose=null;return}
  const T1=480,T2=520+A.n*430,T3=430,V1=A.V0-A.n*unit,Vb1=A.Vb0+A.n*unit;
  let p,vol=A.V0,volb=A.Vb0,e=0;
  if(t<T1){
    const u=ease(t/T1),pp=poseAt(A,A.thP);
    p={tx:A.tx0+(pp.tx-A.tx0)*u,ty:A.ty0+(pp.ty-A.ty0)*u,th:A.thP*u};
  }else if(t<T1+T2){
    if(!A.snd){A.snd=true;play('move')}
    const s=(t-T1)/T2;vol=A.V0-A.n*unit*s;volb=A.Vb0+A.n*unit*s;
    p=poseAt(A,A.side*thetaFor(g.poly,tw/2,Math.max(vol,0)));
    e=Math.min(1,(t-T1)/140,(T1+T2-t)/140);
  }else if(t<T1+T2+T3){
    const u=ease((t-T1-T2)/T3),L=poseAt(A,A.side*thetaFor(g.poly,tw/2,Math.max(V1,0)));
    vol=V1;volb=Vb1;
    p={tx:L.tx+(g.pos[A.a].cx-L.tx)*u,ty:L.ty+(g.pos[A.a].my-L.ty)*u,th:L.th*(1-u)};
  }else{
    S.anim=null;S.pose=null;S.busy=false;A.done();return;
  }
  const dst=g.pos[A.b],dw=xformPts(g.poly,dst.cx,dst.my,0);
  let y2=dst.my+g.L;if(volb>1e-4)y2=levelFor(dw,volb);
  S.pose={
    src:{layers:A.layersA,vol,tx:p.tx,ty:p.ty,th:p.th},
    dst:{layers:S.tubes[A.b],vol:volb,tx:dst.cx,ty:dst.my},
    stream:{x:A.lx-A.side*tw*0.03,y1:A.ly,y2:y2+1,w:tw*0.2,e}
  };
}
function tick(now){
  S.raf=0;let moving=false;
  S.tubes.forEach((_,i)=>{const tg=S.sel===i&&!S.anim?G.tw*0.55:0,d=tg-(S.lift[i]||0);if(Math.abs(d)>0.4){S.lift[i]=(S.lift[i]||0)+d*0.35;moving=true}else S.lift[i]=tg});
  if(S.anim){poseAnim(now);moving=true}
  paint();
  if(moving||S.anim)S.raf=requestAnimationFrame(tick);
}
function requestDraw(){if(!S.raf)S.raf=requestAnimationFrame(tick)}
function render(){
  $('movesDisplay').textContent=S.moves;
  $('timerDisplay').textContent=fmt(S.secs);
  $('btnUndo').disabled=!S.hist.length;
  requestDraw();
}

// ---------- gameplay ----------
function startTimer(){if(S.timer)return;S.timer=setInterval(()=>{S.secs++;$('timerDisplay').textContent=fmt(S.secs)},1000)}
function stopTimer(){clearInterval(S.timer);S.timer=null}
function firstOpen(){let i=1;while(i<TOTAL&&S.done[i])i++;return i}
function loadLevel(n){
  S.level=Math.max(1,Math.min(TOTAL,n,firstOpen()));ls.set(LVL_KEY,S.level);
  S.token++;S.busy=false;S.anim=null;S.pose=null;S.hint=null;
  S.tubes=generate(S.level);S.lift=S.tubes.map(()=>0);S.hist=[];S.sel=null;S.moves=0;S.secs=0;S.won=false;S.path=null;
  stopTimer();hide($('resultOverlay'));hide($('levelsOverlay'));
  $('topTitle').textContent=t('level')+' '+S.level;
  layout();render();hintBadge();
  $('confetti-container').innerHTML='';
}
function hitTest(x,y){
  if(!G)return -1;let best=-1,bd=1e9;
  G.pos.forEach((p,i)=>{
    const lift=S.lift[i]||0;
    if(Math.abs(x-p.cx)<=G.tw*0.75&&y>=p.my-lift-G.tw*0.3&&y<=p.my-lift+G.L+G.tw*0.2){const d=Math.abs(x-p.cx);if(d<bd){bd=d;best=i}}
  });
  return best;
}
function onTube(i){
  if(S.won||S.busy||i<0)return;
  const tb=S.tubes;S.hint=null;
  if(S.sel===null){if(tb[i].length){S.sel=i;play('click')}}
  else if(S.sel===i){S.sel=null}
  else if(canPour(tb,S.sel,i)){const a=S.sel;S.sel=null;move(a,i);return}
  else if(tb[i].length){S.sel=i;play('click')}
  else S.sel=null;
  render();
}
function move(a,b){
  S.hist.push({tubes:S.tubes.map(x=>x.slice()),moves:S.moves});
  const color=S.tubes[a][S.tubes[a].length-1];
  const n=pour(S.tubes,a,b);
  S.moves++;startTimer();S.hint=null;
  $('movesDisplay').textContent=S.moves;
  if(S.path&&S.path.length&&S.path[0][0]===a&&S.path[0][1]===b)S.path.shift();else S.path=null;
  animatePour(a,b,n,color,()=>{render();if(isWon(S.tubes))win()});
}
function undo(){
  if(S.won||S.busy||!S.hist.length)return;
  const h=S.hist.pop();S.tubes=h.tubes;S.moves=h.moves;S.sel=null;S.path=null;S.hint=null;play('click');render();
}
function hintFree(){return Math.max(0, 2 - (S.hu[S.level] || 0));}
function hintBadge(){const e=$('hintBadge');if(e)e.textContent=hintFree()>0?hintFree():'AD'}
function hint(){
  if(S.won||S.busy)return;
  if(hintFree()<=0&&!S.hx){GC.ads.reward('hint',function(){S.hx=1;hint()});return}
  if(!S.path)S.path=solve(S.tubes);
  if(!S.path||!S.path.length){S.path=null;toast(t('hint.none'));return}
  const [a,b]=S.path[0];if(hintFree()>0)S.hu[S.level]=(S.hu[S.level]||0)+1;else S.hx=0;S.sel=a;S.hint={a,b};hintBadge();play('click');render();
}
function win(){
  S.won=true;stopTimer();render();play('win');
  const prev=S.done[S.level];
  const rec=!prev||S.moves<prev.moves;
  if(rec){S.done[S.level]={moves:S.moves,time:S.secs};ls.set(DONE_KEY,JSON.stringify(S.done))}
  setTimeout(()=>{
    $('winMoves').textContent=S.moves;$('winTime').textContent=fmt(S.secs);
    const b=S.done[S.level];$('winBest').textContent=b?b.moves:'—';
    $('newRecord').classList.toggle('hidden',!(rec&&prev));
    const last=S.level>=TOTAL;
    $('btnNext').querySelector('span').textContent=last?t('done.all'):t('result.next');
    show($('resultOverlay'));confetti();
  },450);
}
function confetti(){
  const c=$('confetti-container'),cols=['#6C5CE7','#17B6CE','#FF5E72','#FFA93E','#1FC79B'];
  for(let i=0;i<60;i++){const e=document.createElement('div');e.className='confetti';e.style.left=Math.random()*100+'%';e.style.backgroundColor=cols[Math.floor(Math.random()*cols.length)];e.style.animationDuration=(Math.random()*2+2)+'s';e.style.animationDelay=Math.random()*.5+'s';c.appendChild(e)}
}
function buildLevels(){
  const g=$('lvlGrid');g.innerHTML='';
  for(let i=1;i<=TOTAL;i++){
    const b=document.createElement('button');
    const unlocked=UNLOCK_ALL||i===1||S.done[i-1];
    b.className='lvl'+(S.done[i]?' done':'')+(i===S.level?' cur':'');
    b.textContent=i;b.disabled=!unlocked;
    b.addEventListener('click',()=>{play('click');loadLevel(i)});
    g.appendChild(b);
  }
}
function init(){
  S.sound=ls.get(SOUND_KEY)!=='off';
  S.lang=ls.get(LANG_KEY)==='en'?'en':'fr';
  try{S.done=JSON.parse(ls.get(DONE_KEY)||'{}')||{}}catch(e){S.done={}}
  const lv=parseInt(ls.get(LVL_KEY),10);S.level=lv>=1&&lv<=TOTAL?lv:1;
  applyLanguage();
  cv.addEventListener('pointerdown',e=>{const r=cv.getBoundingClientRect();onTube(hitTest(e.clientX-r.left,e.clientY-r.top))});
  $('btnBack').onclick=()=>{GC.goHome()};
  $('btnExitSetup').onclick=()=>{GC.goHome()};
  $('btnStart').onclick=()=>{play('click');hide($('setupOverlay'));loadLevel(S.level)};
  $('btnUndo').onclick=undo;
  $('btnHint').onclick=hint;
  $('btnRestart').onclick=()=>loadLevel(S.level);
  $('btnLevels').onclick=()=>{buildLevels();show($('levelsOverlay'))};
  $('btnLevelsClose').onclick=()=>hide($('levelsOverlay'));
  $('btnHelp').onclick=()=>show($('helpOverlay'));
  $('btnHelpClose').onclick=()=>hide($('helpOverlay'));
  $('btnNext').onclick=()=>{if(S.level>=TOTAL){hide($('resultOverlay'));buildLevels();show($('levelsOverlay'))}else loadLevel(S.level+1)};
  $('btnPlayAgain').onclick=()=>loadLevel(S.level);
  $('btnResultMenu').onclick=()=>{hide($('resultOverlay'));buildLevels();show($('levelsOverlay'))};
  const relayout=()=>{layout();render()};
  window.addEventListener('resize',relayout);
  window.addEventListener('orientationchange',()=>setTimeout(relayout,250));
  window.addEventListener('storage',e=>{if(e.key===LANG_KEY){S.lang=e.newValue==='en'?'en':'fr';applyLanguage()}});
  S.tubes=generate(S.level);S.lift=S.tubes.map(()=>0);layout();render();
}
init();
}
