'use strict';

/* =========================================================
   DOTS STRATEGY  (Dots & Boxes)
   Linked to the Game Collection home screen via localStorage:
   - "gc_lang"  -> "en" | "fr"      - "gc_sound" -> "on" | "off"
   Blue = X (you / player 1), Red = O (AI / player 2). Closing a box gives you another move.
   The starting player is random the first time, then alternates every new game.
   AI: ai.js (4 levels), run in a Web Worker so the screen never freezes.
   ========================================================= */

const STRINGS = {
  en: {
    'game.title': 'Dots Strategy', 'setup.subtitle': 'Close boxes to claim them and outsmart your opponent',
    'setup.opponent': 'Opponent', 'setup.level': 'AI level', 'setup.size': 'Board size', 'setup.start': 'Start', 'setup.quit': 'Quit',
    'mode.ai': 'vs AI', 'mode.pvp': 'vs Friend', 'lvl.0': 'Easy', 'lvl.1': 'Medium', 'lvl.2': 'Hard', 'lvl.3': 'Expert',
    'name.you': 'You', 'name.ai': 'AI', 'name.p1': 'Player 1', 'name.p2': 'Player 2',
    'turn.you': 'Your turn', 'turn.ai': 'AI is thinking', 'turn.p': '{name}’s turn', 'turn.again': 'Play again!',
    'start.you': 'You start!', 'start.ai': 'The AI starts', 'start.p': '{name} starts',
    'pause.title': 'Game Paused', 'pause.resume': 'Resume', 'pause.restart': 'Restart', 'pause.menu': 'Menu',
    'help.title': 'How To Play',
    'help.line1': 'Take turns drawing a line between two neighbouring dots.',
    'help.line2': 'Draw the 4th side of a box to claim it: your mark appears inside (X for blue, O for red).',
    'help.line3': 'Claiming a box gives you another move.',
    'help.line4': 'Most boxes wins. Careful: adding a 3rd side to a box lets your opponent claim it!',
    'help.close': 'Got it',
    'result.win': 'YOU WIN!', 'result.lose': 'THE AI WINS', 'result.draw': 'DRAW', 'result.pwin': '{name} wins!',
    'result.again': 'Play again', 'result.menu': 'Menu'
  },
  fr: {
    'game.title': 'Dots Strategy', 'setup.subtitle': 'Ferme des cases pour les gagner et déjoue ton adversaire',
    'setup.opponent': 'Adversaire', 'setup.level': 'Niveau de l’IA', 'setup.size': 'Taille de la grille', 'setup.start': 'Commencer', 'setup.quit': 'Quitter',
    'mode.ai': 'Contre l’IA', 'mode.pvp': 'Contre un ami', 'lvl.0': 'Facile', 'lvl.1': 'Moyen', 'lvl.2': 'Difficile', 'lvl.3': 'Expert',
    'name.you': 'Toi', 'name.ai': 'IA', 'name.p1': 'Joueur 1', 'name.p2': 'Joueur 2',
    'turn.you': 'À toi', 'turn.ai': 'L’IA réfléchit', 'turn.p': 'Tour de {name}', 'turn.again': 'Rejoue !',
    'start.you': 'Tu commences !', 'start.ai': 'L’IA commence', 'start.p': '{name} commence',
    'pause.title': 'Jeu en pause', 'pause.resume': 'Continuer', 'pause.restart': 'Recommencer', 'pause.menu': 'Menu',
    'help.title': 'Comment jouer',
    'help.line1': 'Chacun son tour, trace un trait entre deux points voisins.',
    'help.line2': 'Trace le 4e côté d’une case pour la gagner : ta marque apparaît dedans (X pour le bleu, O pour le rouge).',
    'help.line3': 'Gagner une case te donne un coup de plus.',
    'help.line4': 'Le plus de cases gagne. Attention : poser un 3e côté sur une case l’offre à ton adversaire !',
    'help.close': 'Compris',
    'result.win': 'TU AS GAGNÉ !', 'result.lose': 'L’IA GAGNE', 'result.draw': 'ÉGALITÉ', 'result.pwin': '{name} gagne !',
    'result.again': 'Rejouer', 'result.menu': 'Menu'
  }
};
const lang = (localStorage.getItem('gc_lang') === 'fr') ? 'fr' : 'en';
const soundOn = localStorage.getItem('gc_sound') !== 'off';
const $ = (id) => document.getElementById(id);
const t = (k, v) => {
  let s = (STRINGS[lang] && STRINGS[lang][k]) || STRINGS.en[k] || k;
  if (v) Object.keys(v).forEach((x) => { s = s.replace('{' + x + '}', v[x]); });
  return s;
};
function applyTranslations() {
  document.documentElement.lang = lang; document.title = t('game.title');
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.getAttribute('data-i18n')); });
}
const show = (id) => $(id).classList.remove('hidden');
const hide = (id) => $(id).classList.add('hidden');

/* ---- Sound ---- */
let audioCtx = null;
function getAudioCtx() {
  if (!soundOn) return null;
  if (!audioCtx) { try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}
function playTone(freq, duration, type, gain, delay) {
  const ctx = getAudioCtx(); if (!ctx) return;
  const t0 = ctx.currentTime + (delay || 0);
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(gain || 0.15, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
  o.connect(g).connect(ctx.destination); o.start(t0); o.stop(t0 + duration + 0.02);
}
const sndClick = () => playTone(680, 0.06, 'square', 0.08);
const sndLine = (p) => playTone(p === 0 ? 420 : 340, 0.08, 'triangle', 0.16);
const sndBox = () => { playTone(660, 0.12, 'triangle', 0.18); playTone(880, 0.16, 'triangle', 0.16, 0.09); };
const sndWin = () => [523, 659, 784, 1046].forEach((f, i) => playTone(f, 0.22, 'triangle', 0.16, i * 0.09));
const sndLose = () => [392, 330, 262].forEach((f, i) => playTone(f, 0.25, 'triangle', 0.16, i * 0.13));

/* =========================================================
   MODEL
   ========================================================= */
const BLUE = '#2F6BFF', RED = '#FF4A5E';
let mode = 'ai', level = 3, size = 4;
let R = 4, C = 4, B = 16, E = 40, HN = 20;
let owner = [], sides = [], boxOwner = [], scores = [0, 0], boxesLeft = 0;
let cur = 0, state = 'menu', lastEdge = -1, lastMoveTime = 0, againFlash = 0;
let edgeT = [], boxT = [];
let hover = -1, thinking = false, reqId = 0, pendingMove = null, aiStart = 0;
const canvas = $('board'), ctx = canvas.getContext('2d');
let S = 320, dpr = 1, M = 30, SP = 60;

function boxesOf(e) {
  const r = [];
  if (e < HN) { const rr = Math.floor(e / C), cc = e % C; if (rr > 0) r.push((rr - 1) * C + cc); if (rr < R) r.push(rr * C + cc); }
  else { const k = e - HN, rr = Math.floor(k / (C + 1)), cc = k % (C + 1); if (cc > 0) r.push(rr * C + cc - 1); if (cc < C) r.push(rr * C + cc); }
  return r;
}
function seg(e) {                    // [x1,y1,x2,y2] of an edge
  if (e < HN) { const rr = Math.floor(e / C), cc = e % C; return [M + cc * SP, M + rr * SP, M + (cc + 1) * SP, M + rr * SP]; }
  const k = e - HN, rr = Math.floor(k / (C + 1)), cc = k % (C + 1);
  return [M + cc * SP, M + rr * SP, M + cc * SP, M + (rr + 1) * SP];
}
const names = () => mode === 'ai' ? [t('name.you'), t('name.ai')] : [t('name.p1'), t('name.p2')];

/* =========================================================
   FLOW
   ========================================================= */
function newGame() {
  reqId++; thinking = false; pendingMove = null;
  R = C = size; B = R * C; HN = (R + 1) * C; E = HN + R * (C + 1);
  owner = new Array(E).fill(-1); sides = new Array(B).fill(0); boxOwner = new Array(B).fill(-1);
  edgeT = new Array(E).fill(0); boxT = new Array(B).fill(0);
  scores = [0, 0]; boxesLeft = B; lastEdge = -1; hover = -1; againFlash = 0;
  // random the first time, then the starter alternates every game
  let prev = localStorage.getItem('dotsStarter');
  const starter = (prev === '0' || prev === '1') ? 1 - parseInt(prev, 10) : (Math.random() < .5 ? 0 : 1);
  try { localStorage.setItem('dotsStarter', String(starter)); } catch (e) { /* ignore */ }
  cur = starter; state = 'playing';
  ['setupOverlay', 'pauseOverlay', 'resultOverlay', 'helpOverlay'].forEach(hide);
  resize(); updateHud();
  const nm = names();
  toast(mode === 'ai' ? (starter === 0 ? t('start.you') : t('start.ai')) : t('start.p', { name: nm[starter] }));
  maybeAI();
}
function updateHud() {
  const nm = names();
  $('nameP1').textContent = nm[0]; $('nameP2').textContent = nm[1];
  $('scoreP1').textContent = scores[0]; $('scoreP2').textContent = scores[1];
  $('chipP1').classList.toggle('active', state === 'playing' && cur === 0);
  $('chipP2').classList.toggle('active', state === 'playing' && cur === 1);
  const chip = $('turnChip'); chip.classList.toggle('p2', cur === 1);
  const tt = $('turnText'), sub = $('turnSub');
  if (mode === 'ai') {
    if (cur === 0) { tt.textContent = t('turn.you'); }
    else { tt.innerHTML = t('turn.ai') + '<span class="dots-anim"><i></i><i></i><i></i></span>'; }
  } else tt.textContent = t('turn.p', { name: nm[cur] });
  sub.textContent = againFlash > performance.now() ? t('turn.again') : '';
}
function toast(msg) {
  const el = $('toast'); el.textContent = msg; el.classList.remove('hidden');
  clearTimeout(toast.tm); toast.tm = setTimeout(() => el.classList.add('hidden'), 1700);
}
const humanTurn = () => state === 'playing' && (mode === 'pvp' || cur === 0);

function play(e) {
  if (owner[e] !== -1 || state !== 'playing') return;
  const now = performance.now();
  owner[e] = cur; edgeT[e] = now; lastEdge = e; lastMoveTime = now;
  let done = 0;
  for (const b of boxesOf(e)) {
    if (++sides[b] === 4) { boxOwner[b] = cur; boxT[b] = now + 120; scores[cur]++; boxesLeft--; done++; }
  }
  if (done) { sndBox(); againFlash = now + 1400; } else sndLine(cur);
  if (boxesLeft === 0) { updateHud(); endGame(); return; }
  if (!done) cur = 1 - cur;
  updateHud(); maybeAI();
  if (done) setTimeout(updateHud, 1450);
}
function endGame() {
  state = 'over'; thinking = false; hover = -1;
  const nm = names(), [a, b] = scores;
  const banner = $('resBanner');
  if (a === b) { banner.textContent = t('result.draw'); banner.className = 'banner draw'; }
  else if (mode === 'ai') { banner.textContent = a > b ? t('result.win') : t('result.lose'); banner.className = 'banner' + (a > b ? '' : ' lose'); }
  else { banner.textContent = t('result.pwin', { name: nm[a > b ? 0 : 1] }); banner.className = 'banner'; }
  $('resName1').textContent = nm[0]; $('resName2').textContent = nm[1];
  $('resScore1').textContent = a; $('resScore2').textContent = b;
  $('resCard1').classList.toggle('win', a > b); $('resCard2').classList.toggle('win', b > a);
  if (mode === 'ai') (a > b ? sndWin : (a < b ? sndLose : sndClick))(); else sndWin();
  setTimeout(() => { if (state === 'over') show('resultOverlay'); }, 900);
  updateHud();
}

/* ---------- AI (Web Worker with main-thread fallback) ---------- */
let worker = null, localAI = null, activeReq = null;
function initWorker() {
  try {
    const src = 'const createAI=' + createAI.toString() + ';const ai=createAI();' +
      'self.onmessage=function(e){const d=e.data;self.postMessage({id:d.id,move:ai.chooseMove(d.R,d.C,d.drawn,d.level)});};';
    worker = new Worker(URL.createObjectURL(new Blob([src], { type: 'application/javascript' })));
    worker.onmessage = (e) => onAIMove(e.data.id, e.data.move);
    worker.onerror = () => { worker = null; if (activeReq) runLocal(activeReq); };
  } catch (err) { worker = null; }
}
function runLocal(req) {
  if (!localAI) localAI = createAI();
  setTimeout(() => onAIMove(req.id, localAI.chooseMove(req.R, req.C, req.drawn, req.level)), 40);
}
function maybeAI() {
  if (state !== 'playing' || mode !== 'ai' || cur !== 1 || thinking) return;
  thinking = true; aiStart = performance.now();
  const req = { id: ++reqId, R, C, drawn: owner.map((o) => (o === -1 ? 0 : 1)), level };
  activeReq = req;
  setTimeout(() => {
    if (req.id !== reqId) return;
    if (worker) worker.postMessage(req); else runLocal(req);
  }, 380);
}
function onAIMove(id, mv) {
  if (id !== reqId || state === 'menu' || state === 'over') return;
  const wait = Math.max(0, 650 - (performance.now() - aiStart));
  setTimeout(() => {
    if (id !== reqId) return;
    if (state === 'paused') { pendingMove = mv; return; }
    applyAI(mv);
  }, wait);
}
function applyAI(mv) { thinking = false; pendingMove = null; if (mv >= 0 && owner[mv] === -1) play(mv); }

/* =========================================================
   RENDER
   ========================================================= */
function resize() {
  const wrap = $('boardWrap');
  const side = Math.floor(Math.max(220, Math.min(wrap.clientWidth - 28 - 12, wrap.clientHeight - 16 - 12, 520)));
  dpr = Math.min(window.devicePixelRatio || 1, 3); S = side;
  canvas.style.width = S + 'px'; canvas.style.height = S + 'px';
  canvas.width = Math.round(S * dpr); canvas.height = Math.round(S * dpr);
  M = S * 0.085; SP = (S - 2 * M) / size;
}
const ease = (u) => 1 - Math.pow(1 - Math.min(1, Math.max(0, u)), 3);
const backOut = (u) => { u = Math.min(1, Math.max(0, u)); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); };
function draw(now) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, S, S);
  if (!owner.length) return;
  const lw = Math.max(4, SP * 0.085);
  ctx.lineCap = 'round';
  // possible moves (very light guides)
  ctx.strokeStyle = '#EEF1F8'; ctx.lineWidth = lw * .55;
  for (let e = 0; e < E; e++) if (owner[e] === -1) { const [x1, y1, x2, y2] = seg(e); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
  // claimed boxes
  for (let b = 0; b < B; b++) {
    if (boxOwner[b] === -1) continue;
    const rr = Math.floor(b / C), cc = b % C, x = M + cc * SP, y = M + rr * SP, p = (now - boxT[b]) / 320;
    if (p < 0) continue;
    const col = boxOwner[b] === 0 ? BLUE : RED;
    ctx.globalAlpha = Math.min(1, p) * .13; ctx.fillStyle = col; ctx.fillRect(x + lw / 2, y + lw / 2, SP - lw, SP - lw); ctx.globalAlpha = 1;
    const sc = backOut(p), cx = x + SP / 2, cy = y + SP / 2, r = SP * 0.22 * sc;
    ctx.strokeStyle = col; ctx.lineWidth = Math.max(3, SP * 0.075); ctx.lineCap = 'round';
    if (boxOwner[b] === 0) { ctx.beginPath(); ctx.moveTo(cx - r, cy - r); ctx.lineTo(cx + r, cy + r); ctx.moveTo(cx + r, cy - r); ctx.lineTo(cx - r, cy + r); ctx.stroke(); }
    else { ctx.beginPath(); ctx.arc(cx, cy, r * 1.05, 0, Math.PI * 2); ctx.stroke(); }
  }
  // drawn lines
  for (let e = 0; e < E; e++) {
    if (owner[e] === -1) continue;
    const [x1, y1, x2, y2] = seg(e), p = ease((now - edgeT[e]) / 200), col = owner[e] === 0 ? BLUE : RED;
    if (e === lastEdge && state === 'playing') {                    // soft glow on the last move
      const k = Math.max(0, 1 - (now - lastMoveTime) / 1600);
      if (k > 0) { ctx.strokeStyle = col; ctx.globalAlpha = .22 * k; ctx.lineWidth = lw * 2.6; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.globalAlpha = 1; }
    }
    ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 + (x2 - x1) * p, y1 + (y2 - y1) * p); ctx.stroke();
  }
  // hover preview
  if (hover >= 0 && owner[hover] === -1 && humanTurn()) {
    const [x1, y1, x2, y2] = seg(hover); ctx.strokeStyle = cur === 0 ? BLUE : RED; ctx.globalAlpha = .5; ctx.lineWidth = lw;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.globalAlpha = 1;
  }
  // dots
  ctx.fillStyle = '#2B3350';
  for (let r = 0; r <= R; r++) for (let c = 0; c <= C; c++) { ctx.beginPath(); ctx.arc(M + c * SP, M + r * SP, Math.max(4.5, SP * 0.075), 0, Math.PI * 2); ctx.fill(); }
}
function frame(now) { requestAnimationFrame(frame); draw(now); }

/* =========================================================
   INPUT
   ========================================================= */
function nearestEdge(px, py) {
  let best = -1, bd = SP * 0.4;
  for (let e = 0; e < E; e++) {
    if (owner[e] !== -1) continue;
    const [x1, y1, x2, y2] = seg(e), dx = x2 - x1, dy = y2 - y1;
    let u = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy); u = Math.max(0, Math.min(1, u));
    const d = Math.hypot(px - (x1 + dx * u), py - (y1 + dy * u));
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}
function pt(e) { const r = canvas.getBoundingClientRect(); return [(e.clientX - r.left) * (S / r.width), (e.clientY - r.top) * (S / r.height)]; }
canvas.addEventListener('pointerdown', (e) => { if (!humanTurn()) return; getAudioCtx(); const [x, y] = pt(e); hover = nearestEdge(x, y); });
canvas.addEventListener('pointermove', (e) => { if (!humanTurn()) { hover = -1; return; } const [x, y] = pt(e); hover = nearestEdge(x, y); });
canvas.addEventListener('pointerleave', () => { hover = -1; });
canvas.addEventListener('pointerup', (e) => {
  if (!humanTurn()) return;
  const [x, y] = pt(e), ed = nearestEdge(x, y);
  hover = -1; if (ed >= 0) play(ed);
});

function pauseGame() { if (state !== 'playing') return; state = 'paused'; show('pauseOverlay'); }
function resumeGame() {
  if (state !== 'paused') return; state = 'playing'; hide('pauseOverlay'); updateHud();
  if (pendingMove !== null) { const m = pendingMove; setTimeout(() => applyAI(m), 200); }
}
function openMenu() { reqId++; thinking = false; pendingMove = null; state = 'menu'; ['pauseOverlay', 'resultOverlay', 'helpOverlay'].forEach(hide); show('setupOverlay'); }
function goHome() { sndClick(); GC.goHome(); }

function bindRow(rowId, attr, setter) {
  document.querySelectorAll('#' + rowId + ' .optbtn').forEach((b) => b.addEventListener('click', () => {
    sndClick(); setter(b.dataset[attr]);
    document.querySelectorAll('#' + rowId + ' .optbtn').forEach((x) => x.classList.toggle('active', x === b));
  }));
}
bindRow('modeRow', 'mode', (v) => { mode = v; $('levelBox').classList.toggle('hidden', mode !== 'ai'); });
bindRow('levelRow', 'level', (v) => { level = parseInt(v, 10); });
bindRow('sizeRow', 'size', (v) => { size = parseInt(v, 10); });
$('startBtn').addEventListener('click', () => { sndClick(); getAudioCtx(); newGame(); });
$('setupQuitBtn').addEventListener('click', goHome);
$('homeBtn').addEventListener('click', goHome);
$('helpBtn').addEventListener('click', () => { sndClick(); show('helpOverlay'); });
$('helpCloseBtn').addEventListener('click', () => { sndClick(); hide('helpOverlay'); });
$('pauseBtn').addEventListener('click', () => { if (state === 'playing') { sndClick(); pauseGame(); } });
$('resumeBtn').addEventListener('click', () => { sndClick(); resumeGame(); });
$('pauseRestartBtn').addEventListener('click', () => { sndClick(); newGame(); });
$('pauseMenuBtn').addEventListener('click', () => { sndClick(); openMenu(); });
$('resAgainBtn').addEventListener('click', () => { sndClick(); newGame(); });
$('resMenuBtn').addEventListener('click', () => { sndClick(); openMenu(); });
window.addEventListener('keydown', (e) => { if (e.key === 'Escape' || e.key === 'p') { if (state === 'playing') pauseGame(); else if (state === 'paused') resumeGame(); } });
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); });
window.addEventListener('resize', resize);
if (window.ResizeObserver) new ResizeObserver(resize).observe($('boardWrap'));

/* ===== INIT ===== */
applyTranslations(); initWorker(); resize(); updateHud(); requestAnimationFrame(frame);
