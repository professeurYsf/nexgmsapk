'use strict';

/* =========================================================
   NEON BLOCKS — plain HTML/CSS/JS, works offline.
   Linked to the Game Collection via localStorage:
   - "gc_lang"  -> "en" | "fr"
   - "gc_sound" -> "on" | "off"
   Own storage: "gc_tetrisneon_best"
   One single requestAnimationFrame loop drives gravity, held keys
   and animations, so pause / restart can never stack timers.
   ========================================================= */

/* ---- i18n ---- */
const STRINGS = {
  en: { next:'NEXT', score:'SCORE', best:'BEST', level:'LEVEL', lines:'LINES', left:'LEFT', right:'RIGHT', down:'DOWN', rotate:'ROTATE',
    start:'START', paused:'PAUSED', resume:'RESUME', restart:'RESTART', home:'Back Home', quit:'Quit', gameover:'GAME OVER', again:'PLAY AGAIN',
    title:'Neon Blocks', subtitle:'Stack, clear lines, beat your best', keys:'Keyboard: ← → move · ↓ drop · ↑ / Space rotate · P pause', record:'New best score!',
    helpTitle:'How To Play', gotit:'Got it',
    help1:'Use LEFT and RIGHT to move the falling piece, ROTATE to turn it.',
    help2:'Hold DOWN to drop the piece fast.',
    help3:'Fill a whole row to clear it. Clear several rows at once for more points.',
    help4:'The game speeds up every 10 lines. Do not let the stack reach the top!' },
  fr: { next:'SUIVANT', score:'SCORE', best:'RECORD', level:'NIVEAU', lines:'LIGNES', left:'GAUCHE', right:'DROITE', down:'BAS', rotate:'TOURNER',
    start:'JOUER', paused:'PAUSE', resume:'CONTINUER', restart:'RECOMMENCER', home:"Retour à l'accueil", quit:'Quitter', gameover:'PARTIE TERMINÉE', again:'REJOUER',
    title:'Blocs Néon', subtitle:'Empilez, effacez des lignes, battez votre record', keys:'Clavier : ← → bouger · ↓ descendre · ↑ / Espace tourner · P pause', record:'Nouveau record !',
    helpTitle:'Comment jouer', gotit:'Compris',
    help1:'GAUCHE et DROITE déplacent la pièce, TOURNER la fait pivoter.',
    help2:'Maintiens BAS pour la faire descendre vite.',
    help3:'Remplis une ligne entière pour l’effacer. Plusieurs lignes d’un coup = plus de points.',
    help4:'Le jeu accélère toutes les 10 lignes. Ne laisse pas la pile atteindre le haut !' }
};
const lang = localStorage.getItem('gc_lang') === 'fr' ? 'fr' : 'en';
const t = (k) => STRINGS[lang][k] || STRINGS.en[k] || k;
document.documentElement.lang = lang;
document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });

/* roundRect fallback for older Android WebView */
if (window.CanvasRenderingContext2D && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    r = Math.min(r || 0, w / 2, h / 2);
    this.moveTo(x + r, y); this.arcTo(x + w, y, x + w, y + h, r); this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r); this.arcTo(x, y, x + w, y, r); this.closePath();
  };
}

const $ = (id) => document.getElementById(id);

/* ---- sound (Web Audio, optional, toggle in the top bar) ---- */
let soundOn = localStorage.getItem('gc_sound') !== 'off';
let actx = null;
function tone(freq, dur, type, vol, delay) {
  if (!soundOn) return;
  try {
    if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
    const t0 = actx.currentTime + (delay || 0), o = actx.createOscillator(), g = actx.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol || 0.1, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g).connect(actx.destination); o.start(t0); o.stop(t0 + dur + 0.02);
  } catch (e) { /* ignore */ }
}
const sfx = {
  move: () => tone(300, 0.04, 'square', 0.04),
  rotate: () => tone(520, 0.06, 'triangle', 0.08),
  lock: () => tone(150, 0.09, 'sine', 0.12),
  clear: (n) => [523, 659, 784, 1046].slice(0, Math.min(4, n + 1)).forEach((f, i) => tone(f, 0.16, 'triangle', 0.13, i * 0.07)),
  level: () => [660, 880, 1175].forEach((f, i) => tone(f, 0.14, 'sine', 0.12, i * 0.08)),
  over: () => [400, 320, 240, 160].forEach((f, i) => tone(f, 0.22, 'sawtooth', 0.09, i * 0.14)),
  click: () => tone(680, 0.05, 'square', 0.06)
};

/* ---- pieces ---- */
const COLS = 10, ROWS = 20;
const SHAPES = {
  I: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
  O: [[1,1],[1,1]],
  T: [[0,1,0],[1,1,1],[0,0,0]],
  L: [[0,0,1],[1,1,1],[0,0,0]],
  J: [[1,0,0],[1,1,1],[0,0,0]],
  S: [[0,1,1],[1,1,0],[0,0,0]],
  Z: [[1,1,0],[0,1,1],[0,0,0]]
};
const COLORS = { I:'#22E3FF', O:'#FFD43B', T:'#B266FF', L:'#FF9F3B', J:'#4D7CFF', S:'#2DFF9A', Z:'#FF4D6D' };
const KEYS = Object.keys(SHAPES);

const rotateCW = (m) => m[0].map((_, c) => m.map((row) => row[c]).reverse());

/* ---- state ---- */
let grid, cur, nextType, bag = [];
let score, lines, level, best = 0;
let state = 'idle';            // idle | playing | paused | clearing | over
let dropAcc = 0, lastT = 0, rafId = 0;
let clearRows = [], clearT = 0;
let held = { left: false, right: false, down: false };
let hold = { dir: 0, since: 0, last: 0 };
let dirty = true, cell = 24;

try { best = parseInt(localStorage.getItem('gc_tetrisneon_best'), 10) || 0; } catch (e) { best = 0; }

const board = $('board'), bctx = board.getContext('2d');
const nextC = $('next'), nctx = nextC.getContext('2d');

/* ---- rules ---- */
function nextFromBag() {
  if (!bag.length) { bag = KEYS.slice(); for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; } }
  return bag.pop();
}
function dropInterval() { return Math.max(90, 800 - (level - 1) * 70); }   // L1 800ms … L11+ 100ms floor
function levelFor(l) { return Math.floor(l / 10) + 1; }
const LINE_POINTS = [0, 100, 300, 500, 800];

function collides(m, x, y) {
  for (let r = 0; r < m.length; r++) for (let c = 0; c < m[r].length; c++) {
    if (!m[r][c]) continue;
    const gx = x + c, gy = y + r;
    if (gx < 0 || gx >= COLS || gy >= ROWS) return true;
    if (gy >= 0 && grid[gy][gx]) return true;
  }
  return false;
}
function spawn() {
  const type = nextType; nextType = nextFromBag();
  const m = SHAPES[type].map((r) => r.slice());
  cur = { type, m, x: Math.floor((COLS - m[0].length) / 2), y: type === 'I' ? -1 : 0 };
  softBlockUntil = performance.now() + 170;      // a held DOWN does not slam the next piece instantly
  drawNext(); dirty = true;
  if (collides(cur.m, cur.x, cur.y)) { gameOver(); return false; }
  return true;
}
function tryMove(dx, dy) {
  if (state !== 'playing' || !cur) return false;
  if (collides(cur.m, cur.x + dx, cur.y + dy)) return false;
  cur.x += dx; cur.y += dy; dirty = true; return true;
}
function rotate() {
  if (state !== 'playing' || !cur || cur.type === 'O') { if (cur && cur.type === 'O' && state === 'playing') sfx.rotate(); return; }
  const m = rotateCW(cur.m);
  for (const k of [0, -1, 1, -2, 2]) {            // simple wall kicks
    if (!collides(m, cur.x + k, cur.y)) { cur.m = m; cur.x += k; dirty = true; sfx.rotate(); return; }
  }
  if (!collides(m, cur.x, cur.y - 1)) { cur.m = m; cur.y -= 1; dirty = true; sfx.rotate(); }   // floor kick
}
function softDrop() {
  if (tryMove(0, 1)) { dropAcc = 0; return true; }       // score only comes from cleared lines
  return false;
}
function lockPiece() {
  cur.m.forEach((row, r) => row.forEach((v, c) => {
    if (!v) return;
    const gy = cur.y + r, gx = cur.x + c;
    if (gy >= 0) grid[gy][gx] = cur.type;
  }));
  sfx.lock();
  const full = [];
  for (let r = 0; r < ROWS; r++) if (grid[r].every(Boolean)) full.push(r);
  cur = null; dirty = true;
  if (full.length) { clearRows = full; clearT = 0; state = 'clearing'; sfx.clear(full.length); }
  else spawn();
}
function finishClear() {
  const n = clearRows.length;
  grid = grid.filter((_, r) => !clearRows.includes(r));
  while (grid.length < ROWS) grid.unshift(new Array(COLS).fill(null));
  clearRows = [];
  score += LINE_POINTS[n] * level;
  lines += n;
  const nl = levelFor(lines);
  if (nl > level) { level = nl; sfx.level(); }
  updateHUD();
  state = 'playing';
  dropAcc = 0;
  spawn();
}

/* ---- HUD ---- */
function updateHUD() {
  $('score').textContent = score; $('lines').textContent = lines; $('level').textContent = level;
  if (score > best) { best = score; }
  $('best').textContent = best;
  $('startBest').textContent = best;
}

/* ---- flow ---- */
function newGame() {
  grid = Array.from({ length: ROWS }, () => new Array(COLS).fill(null));
  score = 0; lines = 0; level = 1; bag = [];
  held = { left: false, right: false, down: false }; hold.dir = 0;
  document.querySelectorAll('.cbtn.on').forEach((b) => b.classList.remove('on'));
  clearRows = []; dropAcc = 0;
  nextType = nextFromBag();
  best = loadBest();
  updateHUD();
  state = 'playing';
  spawn();
  startLoop();
}
function loadBest() { try { return parseInt(localStorage.getItem('gc_tetrisneon_best'), 10) || 0; } catch (e) { return 0; } }
function saveBest() { try { localStorage.setItem('gc_tetrisneon_best', String(best)); } catch (e) { /* ignore */ } }
function startLoop() {
  cancelAnimationFrame(rafId);
  lastT = performance.now();
  rafId = requestAnimationFrame(loop);
}
function pause() {
  if (state !== 'playing' && state !== 'clearing') return;
  prevState = state; state = 'paused';
  held = { left: false, right: false, down: false }; hold.dir = 0;
  document.querySelectorAll('.cbtn.on').forEach((b) => b.classList.remove('on'));
  $('pauseOverlay').classList.remove('hidden');
}
let prevState = 'playing';
function resume() {
  if (state !== 'paused') return;
  $('pauseOverlay').classList.add('hidden');
  state = prevState; lastT = performance.now();
}
function gameOver() {
  state = 'over'; cur = null; dirty = true;
  const isRecord = score > 0 && score >= best && score > loadBest();
  if (score > loadBest()) { best = score; saveBest(); }
  sfx.over();
  $('oScore').textContent = score; $('oLevel').textContent = level; $('oLines').textContent = lines; $('oBest').textContent = best;
  const rm = $('recordMsg'); rm.textContent = t('record'); rm.classList.toggle('hidden', !isRecord);
  updateHUD();
  setTimeout(() => { if (state === 'over') $('overOverlay').classList.remove('hidden'); }, 500);
}
function startFromUI() {
  $('startOverlay').classList.add('hidden'); $('pauseOverlay').classList.add('hidden'); $('overOverlay').classList.add('hidden');
  newGame();
}

/* ---- main loop ---- */
const DAS = 160, ARR = 55, SOFT = 34;
let softBlockUntil = 0;
function loop(now) {
  const dt = Math.min(100, now - lastT); lastT = now;
  if (state === 'playing' && cur) {
    // held left / right (auto-repeat with initial delay)
    const dir = held.left && !held.right ? -1 : held.right && !held.left ? 1 : 0;
    if (dir !== hold.dir) { hold.dir = dir; hold.since = now; hold.last = now; if (dir) { if (tryMove(dir, 0)) sfx.move(); } }
    else if (dir && now - hold.since >= DAS && now - hold.last >= ARR) { hold.last = now; if (tryMove(dir, 0)) sfx.move(); }
    // gravity (faster while DOWN is held)
    dropAcc += dt;
    const fast = held.down && now >= softBlockUntil;
    const iv = fast ? Math.min(SOFT, dropInterval()) : dropInterval();
    if (dropAcc >= iv) {
      dropAcc = 0;
      if (!tryMove(0, 1)) lockPiece();
    }
  } else if (state === 'clearing') {
    clearT += dt; dirty = true;
    if (clearT >= 220) finishClear();
  }
  if (dirty) { draw(); dirty = false; }
  if (state !== 'idle' && state !== 'over') rafId = requestAnimationFrame(loop);
  else if (state === 'over') { if (dirty) draw(); }
}

/* ---- drawing ---- */
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v + (amt > 0 ? (255 - v) * amt : v * amt))));
  return 'rgb(' + f(n >> 16) + ',' + f((n >> 8) & 255) + ',' + f(n & 255) + ')';
}
function block(ctx, x, y, s, type, alpha, glow) {
  const col = COLORS[type], pad = Math.max(1, s * 0.06);
  ctx.save();
  ctx.globalAlpha = alpha == null ? 1 : alpha;
  if (glow) { ctx.shadowColor = col; ctx.shadowBlur = s * 0.45; }
  const g = ctx.createLinearGradient(x, y, x + s, y + s);
  g.addColorStop(0, shade(col, 0.35)); g.addColorStop(0.5, col); g.addColorStop(1, shade(col, -0.35));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.roundRect(x + pad, y + pad, s - pad * 2, s - pad * 2, s * 0.2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = Math.max(1, s * 0.05);
  ctx.beginPath(); ctx.roundRect(x + pad + 1, y + pad + 1, s - pad * 2 - 2, s - pad * 2 - 2, s * 0.17); ctx.stroke();
  ctx.restore();
}
function ghostY() { let y = cur.y; while (!collides(cur.m, cur.x, y + 1)) y++; return y; }
function draw() {
  const W = COLS * cell, H = ROWS * cell, dpr = board.width / W;
  const ctx = bctx;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  // grid lines
  ctx.strokeStyle = 'rgba(80,110,200,.13)'; ctx.lineWidth = 1; ctx.beginPath();
  for (let c = 1; c < COLS; c++) { ctx.moveTo(c * cell + .5, 0); ctx.lineTo(c * cell + .5, H); }
  for (let r = 1; r < ROWS; r++) { ctx.moveTo(0, r * cell + .5); ctx.lineTo(W, r * cell + .5); }
  ctx.stroke();
  if (!grid) return;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const v = grid[r][c]; if (!v) continue;
    block(ctx, c * cell, r * cell, cell, v, 1, false);
  }
  if (state === 'clearing') {
    const k = Math.min(1, clearT / 220);
    clearRows.forEach((r) => {
      ctx.fillStyle = 'rgba(255,255,255,' + (0.35 + 0.6 * Math.sin(k * Math.PI)).toFixed(2) + ')';
      ctx.fillRect(0, r * cell, W, cell);
    });
  }
  if (cur) {
    const gy = ghostY();
    if (gy !== cur.y) cur.m.forEach((row, r) => row.forEach((v, c) => {
      if (!v || gy + r < 0) return;
      ctx.save(); ctx.strokeStyle = COLORS[cur.type]; ctx.globalAlpha = .45; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect((cur.x + c) * cell + 3, (gy + r) * cell + 3, cell - 6, cell - 6, cell * .18); ctx.stroke(); ctx.restore();
    }));
    cur.m.forEach((row, r) => row.forEach((v, c) => {
      if (v && cur.y + r >= 0) block(ctx, (cur.x + c) * cell, (cur.y + r) * cell, cell, cur.type, 1, true);
    }));
  }
}
function drawNext() {
  const w = nextC.width;
  nctx.clearRect(0, 0, w, w);
  if (!nextType) return;
  const m = SHAPES[nextType];
  // trim empty rows/cols so the piece is centred
  let r0 = 9, r1 = -1, c0 = 9, c1 = -1;
  m.forEach((row, r) => row.forEach((v, c) => { if (v) { r0 = Math.min(r0, r); r1 = Math.max(r1, r); c0 = Math.min(c0, c); c1 = Math.max(c1, c); } }));
  const s = Math.floor(w / 5), pw = (c1 - c0 + 1) * s, ph = (r1 - r0 + 1) * s;
  const ox = (w - pw) / 2, oy = (w - ph) / 2;
  m.forEach((row, r) => row.forEach((v, c) => { if (v) block(nctx, ox + (c - c0) * s, oy + (r - r0) * s, s, nextType, 1, false); }));
}

/* ---- responsive layout ---- */
function layout() {
  const play = $('play'), cs = getComputedStyle(play);
  const aw = play.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const ah = play.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  if (aw <= 0 || ah <= 0) return;
  const sw = Math.max(70, Math.min(104, Math.round(aw * 0.27)));
  const frame = 14, gap = 10;
  cell = Math.floor(Math.min((aw - sw - gap - frame) / COLS, (ah - frame) / ROWS));
  cell = Math.max(10, Math.min(cell, 44));
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  board.style.width = COLS * cell + 'px'; board.style.height = ROWS * cell + 'px';
  board.width = Math.round(COLS * cell * dpr); board.height = Math.round(ROWS * cell * dpr);
  $('side').style.setProperty('--sw', sw + 'px');
  // controls sit right under the play field: same width, small equal squares (3 left, 1 right)
  const fw = COLS * cell + frame + gap + sw;
  const sq = Math.max(44, Math.min(62, Math.floor((fw - 30) / 4), Math.round(window.innerHeight * 0.095)));
  const ctl = $('controls'); ctl.style.setProperty('--fw', fw + 'px'); ctl.style.setProperty('--sq', sq + 'px');
  nextC.width = nextC.height = Math.round(76 * dpr);
    drawNext(); dirty = true; draw();
}
let layoutRAF = 0;
const scheduleLayout = () => { cancelAnimationFrame(layoutRAF); layoutRAF = requestAnimationFrame(layout); };
window.addEventListener('resize', scheduleLayout);
window.addEventListener('orientationchange', () => setTimeout(scheduleLayout, 200));
if (window.ResizeObserver) new ResizeObserver(scheduleLayout).observe($('play'));

/* ---- input: on-screen buttons (touch + mouse via pointer events) ---- */
function bindHold(id, key) {
  const b = $(id); let pid = null;
  const press = (e) => {
    e.preventDefault();
    if (state === 'idle' || state === 'over' || state === 'paused') return;
    pid = e.pointerId; try { b.setPointerCapture(pid); } catch (x) { /* ignore */ }
    held[key] = true; b.classList.add('on');
    if (key === 'down' && state === 'playing' && cur) softDrop();          // immediate first step, then it keeps falling while held
  };
  const release = (e) => {
    if (pid === null || (e && e.pointerId !== undefined && e.pointerId !== pid)) return;
    pid = null; held[key] = false; b.classList.remove('on');
  };
  b.addEventListener('pointerdown', press);
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);
  b.addEventListener('contextmenu', (e) => e.preventDefault());
}
bindHold('btnLeft', 'left'); bindHold('btnRight', 'right'); bindHold('btnDown', 'down');
(function () {
  const b = $('btnRotate');
  b.addEventListener('pointerdown', (e) => { e.preventDefault(); b.classList.add('on'); rotate(); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => b.addEventListener(ev, () => b.classList.remove('on')));
  b.addEventListener('contextmenu', (e) => e.preventDefault());
})();

/* ---- input: keyboard ---- */
const KEYMAP = { ArrowLeft: 'left', ArrowRight: 'right', ArrowDown: 'down', a: 'left', d: 'right', s: 'down' };
document.addEventListener('keydown', (e) => {
  const k = e.key;
  if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' '].includes(k)) e.preventDefault();
  if (k === 'p' || k === 'P' || k === 'Escape') { state === 'paused' ? resume() : pause(); return; }
  if (state !== 'playing') return;
  if (KEYMAP[k]) { held[KEYMAP[k]] = true; return; }
  if ((k === 'ArrowUp' || k === ' ' || k === 'w' || k === 'x') && !e.repeat) rotate();
});
document.addEventListener('keyup', (e) => { if (KEYMAP[e.key]) held[KEYMAP[e.key]] = false; });
window.addEventListener('blur', () => { held = { left: false, right: false, down: false }; });
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
document.addEventListener('gesturestart', (e) => e.preventDefault());

/* ---- UI buttons ---- */
const goHome = () => { sfx.click(); GC.goHome(); };
$('startBtn').onclick = () => { sfx.click(); startFromUI(); };
$('startQuit').onclick = goHome;
$('pauseBtn').onclick = () => { sfx.click(); if (state === 'paused') resume(); else pause(); };
$('resumeBtn').onclick = () => { sfx.click(); resume(); };
$('homeBtn').onclick = goHome;
$('helpBtn').onclick = () => { sfx.click(); $('helpOverlay').classList.remove('hidden'); };
$('helpClose').onclick = () => { sfx.click(); $('helpOverlay').classList.add('hidden'); };
$('pauseRestart').onclick = () => { sfx.click(); startFromUI(); };
$('pauseHome').onclick = goHome;
$('againBtn').onclick = () => { sfx.click(); startFromUI(); };
$('overHome').onclick = goHome;

/* ---- init ---- */
best = loadBest(); $('best').textContent = best; $('startBest').textContent = best;
grid = Array.from({ length: ROWS }, () => new Array(COLS).fill(null));
layout();
