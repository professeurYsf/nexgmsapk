'use strict';

/* =========================================================
   TIC TAC TOE  (Morpion)
   Linked to the Game Collection home screen via localStorage:
   - "gc_lang"  -> "en" | "fr"
   - "gc_sound" -> "on" | "off"
   ========================================================= */

const STRINGS = {
  en: {
    'game.title': 'Tic Tac Toe',
    'setup.subtitle': 'Line up 3 marks to win',
    'setup.mode': 'Game mode',
    'setup.twoPlayers': '2 Players',
    'setup.vsAI': 'Vs AI',
    'setup.difficulty': 'Difficulty',
    'setup.easy': 'Easy',
    'setup.medium': 'Medium',
    'setup.hard': 'Hard',
    'setup.expert': 'Expert',
    'setup.start': 'Start Game',
    'setup.quit': 'Quit',
    'pause.title': 'Game Paused',
    'pause.resume': 'Resume',
    'pause.restart': 'Restart',
    'pause.gameMenu': 'Tic Tac Toe Menu',
    'result.rematch': 'Rematch',
    'player.you': 'You',
    'player.p1': 'Player 1',
    'player.p2': 'Player 2',
    'player.ai': 'AI',
    'result.draw': 'DRAW!',
    'result.youWin': 'YOU WIN!',
    'result.youLose': 'YOU LOSE!',
    'result.p1Wins': 'PLAYER 1 WINS!',
    'result.p2Wins': 'PLAYER 2 WINS!',
    'help.title': 'How To Play',
    'help.line1': 'Take turns placing your mark (X or O) on the 3×3 grid.',
    'help.line2': 'Line up 3 of your marks — in a row, a column or a diagonal — to win.',
    'help.line3': 'If the grid fills up with no line, the round is a draw.',
    'help.line4': 'Play a friend, or choose Vs AI: Easy, Medium, Hard or Expert (unbeatable). The first move alternates each round.',
    'help.close': 'Got it'
  },
  fr: {
    'game.title': 'Morpion',
    'setup.subtitle': 'Alignez 3 symboles pour gagner',
    'setup.mode': 'Mode de jeu',
    'setup.twoPlayers': '2 joueurs',
    'setup.vsAI': "Contre l'IA",
    'setup.difficulty': 'Difficulté',
    'setup.easy': 'Facile',
    'setup.medium': 'Moyen',
    'setup.hard': 'Difficile',
    'setup.expert': 'Expert',
    'setup.start': 'Commencer',
    'setup.quit': 'Quitter',
    'pause.title': 'Jeu en pause',
    'pause.resume': 'Reprendre',
    'pause.restart': 'Recommencer',
    'pause.gameMenu': 'Menu du Morpion',
    'result.rematch': 'Revanche',
    'player.you': 'Vous',
    'player.p1': 'Joueur 1',
    'player.p2': 'Joueur 2',
    'player.ai': 'IA',
    'result.draw': 'ÉGALITÉ !',
    'result.youWin': 'VOUS GAGNEZ !',
    'result.youLose': 'VOUS PERDEZ !',
    'result.p1Wins': 'JOUEUR 1 GAGNE !',
    'result.p2Wins': 'JOUEUR 2 GAGNE !',
    'help.title': 'Comment jouer',
    'help.line1': 'Placez à tour de rôle votre symbole (X ou O) sur la grille 3×3.',
    'help.line2': 'Alignez 3 de vos symboles — en ligne, en colonne ou en diagonale — pour gagner.',
    'help.line3': 'Si la grille est pleine sans alignement, la manche est nulle.',
    'help.line4': "Jouez contre un ami, ou contre l'IA : Facile, Moyen, Difficile ou Expert (imbattable). Le premier coup alterne à chaque manche.",
    'help.close': 'Compris'
  }
};

const lang = (localStorage.getItem('gc_lang') === 'fr') ? 'fr' : 'en';
const soundOn = localStorage.getItem('gc_sound') !== 'off';
const $ = (id) => document.getElementById(id);

function t(key) {
  return (STRINGS[lang] && STRINGS[lang][key]) || STRINGS.en[key] || key;
}
function applyTranslations() {
  document.documentElement.lang = lang;
  document.title = t('game.title');
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
}

/* ---- Sound (Web Audio, no asset files) ---- */
let audioCtx = null;
function getAudioCtx() {
  if (!soundOn) return null;
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch (e) { return null; }
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}
function playTone(freq, duration, type, gainPeak, delay) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const t0 = ctx.currentTime + (delay || 0);
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type || 'sine';
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(gainPeak || 0.18, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}
const sndPlace = (p) => playTone(p === 1 ? 520 : 400, 0.09, 'sine', 0.16, 0);
const sndClick = () => playTone(680, 0.06, 'square', 0.08, 0);
const sndWin = () => [523, 659, 784, 1046].forEach((f, i) => playTone(f, 0.22, 'triangle', 0.16, i * 0.09));
const sndLose = () => [400, 320, 260].forEach((f, i) => playTone(f, 0.28, 'sawtooth', 0.10, i * 0.12));
const sndDraw = () => [440, 440].forEach((f, i) => playTone(f, 0.18, 'sine', 0.12, i * 0.16));

/* =========================================================
   GAME STATE
   ========================================================= */
const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
const COLOR_X = '#FF5E72';
const COLOR_O = '#E8A400';
const COLOR_WIN = '#1FC79B';

let cells = new Array(9).fill(0);   // 0 empty, 1 = X (Player 1 / You), 2 = O (Player 2 / AI)
let born = new Array(9).fill(0);    // timestamp of each mark, for the draw animation
let cur = 1;
let gameMode = 'pvp';
let difficulty = 'easy';
let over = false;
let paused = false;
let scoreP1 = 0, scoreP2 = 0;
let round = 0;
let aiToken = 0;
let winLine = null, winAt = 0;
let SIZE = 300;

/* ===== CANVAS (responsive) ===== */
const canvas = $('board');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  const wrap = document.querySelector('.board-wrap');
  const avail = Math.min(wrap.clientWidth - 24 - 22, wrap.clientHeight - 22 - 22);
  SIZE = Math.max(180, Math.min(460, Math.floor(avail / 3) * 3));
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = SIZE + 'px';
  canvas.style.height = SIZE + 'px';
  canvas.width = SIZE * dpr;
  canvas.height = SIZE * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  requestDraw();
}
window.addEventListener('resize', resizeCanvas);

const ease = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
let rafOn = false;
function requestDraw() {
  if (rafOn) return;
  rafOn = true;
  requestAnimationFrame(frame);
}
function frame() {
  rafOn = false;
  const animating = draw();
  if (animating) requestDraw();
}

function draw() {
  const now = performance.now();
  const cs = SIZE / 3;
  let animating = false;
  ctx.clearRect(0, 0, SIZE, SIZE);

  // grid lines
  const css = getComputedStyle(document.documentElement);
  ctx.strokeStyle = css.getPropertyValue('--text-faint').trim() || '#9FB0C7';
  ctx.lineWidth = Math.max(4, cs * 0.045);
  ctx.lineCap = 'round';
  const pad = cs * 0.1;
  for (let k = 1; k <= 2; k++) {
    ctx.beginPath(); ctx.moveTo(cs * k, pad); ctx.lineTo(cs * k, SIZE - pad); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pad, cs * k); ctx.lineTo(SIZE - pad, cs * k); ctx.stroke();
  }

  // marks
  for (let i = 0; i < 9; i++) {
    if (!cells[i]) continue;
    const p = ease((now - born[i]) / 260);
    if (p < 1) animating = true;
    const cx = (i % 3) * cs + cs / 2, cy = Math.floor(i / 3) * cs + cs / 2;
    const r = cs * 0.27;
    ctx.lineWidth = cs * 0.11;
    ctx.lineCap = 'round';
    if (cells[i] === 1) {
      ctx.strokeStyle = COLOR_X;
      const a = Math.min(1, p * 2), b = Math.max(0, p * 2 - 1);
      ctx.beginPath(); ctx.moveTo(cx - r, cy - r); ctx.lineTo(cx - r + 2 * r * a, cy - r + 2 * r * a); ctx.stroke();
      if (b > 0) { ctx.beginPath(); ctx.moveTo(cx + r, cy - r); ctx.lineTo(cx + r - 2 * r * b, cy - r + 2 * r * b); ctx.stroke(); }
    } else {
      ctx.strokeStyle = COLOR_O;
      ctx.beginPath(); ctx.arc(cx, cy, r * 1.05, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p); ctx.stroke();
    }
  }

  // winning line
  if (winLine) {
    const p = ease((now - winAt) / 420);
    if (p < 1) animating = true;
    const [a, , c] = winLine;
    const ax = (a % 3) * cs + cs / 2, ay = Math.floor(a / 3) * cs + cs / 2;
    const cx2 = (c % 3) * cs + cs / 2, cy2 = Math.floor(c / 3) * cs + cs / 2;
    ctx.strokeStyle = COLOR_WIN;
    ctx.lineWidth = cs * 0.09;
    ctx.globalAlpha = 0.9;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + (cx2 - ax) * p, ay + (cy2 - ay) * p); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  return animating;
}

/* =========================================================
   RULES
   ========================================================= */
function findWin(b) {
  for (const l of LINES) {
    if (b[l[0]] && b[l[0]] === b[l[1]] && b[l[1]] === b[l[2]]) return l;
  }
  return null;
}
const isFull = (b) => b.every((v) => v !== 0);
const emptyCells = (b) => b.reduce((a, v, i) => (v ? a : (a.push(i), a)), []);

/* =========================================================
   AI  — easy: random · medium: win/block · hard: minimax with slips · expert: perfect minimax
   ========================================================= */
function minimax(b, turn, me, depth) {
  const w = findWin(b);
  if (w) return b[w[0]] === me ? 10 - depth : depth - 10;
  if (isFull(b)) return 0;
  const other = 3 - me;
  let best = turn === me ? -Infinity : Infinity;
  for (const i of emptyCells(b)) {
    b[i] = turn;
    const s = minimax(b, 3 - turn, me, depth + 1);
    b[i] = 0;
    best = turn === me ? Math.max(best, s) : Math.min(best, s);
  }
  return best;
}
function bestMoves(b, me) {
  let best = -Infinity, list = [];
  for (const i of emptyCells(b)) {
    b[i] = me;
    const s = minimax(b, 3 - me, me, 1);
    b[i] = 0;
    if (s > best) { best = s; list = [i]; } else if (s === best) list.push(i);
  }
  return list;
}
function immediate(b, player) {
  for (const i of emptyCells(b)) {
    b[i] = player;
    const w = findWin(b);
    b[i] = 0;
    if (w) return i;
  }
  return -1;
}
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function chooseAIMove(b, me) {
  const empty = emptyCells(b);
  if (difficulty === 'easy') return pick(empty);
  if (difficulty === 'medium') {
    let m = immediate(b, me); if (m >= 0) return m;
    m = immediate(b, 3 - me); if (m >= 0) return m;
    if (!b[4] && Math.random() < 0.6) return 4;
    return pick(empty);
  }
  if (difficulty === 'hard' && Math.random() < 0.15) return pick(empty); // occasional slip
  return pick(bestMoves(b, me));
}

function aiTurn() {
  const tk = ++aiToken;
  const run = () => {
    if (tk !== aiToken || over) return;
    if (paused) { setTimeout(run, 200); return; }
    place(chooseAIMove(cells.slice(), 2), true);
  };
  setTimeout(run, 450 + Math.random() * 350);
}

/* =========================================================
   FLOW
   ========================================================= */
function updateTurnUI() {
  $('dotTop').classList.toggle('on', cur === 2 && !over);
  $('dotBottom').classList.toggle('on', cur === 1 && !over);
  $('playerTopBar').classList.toggle('active-turn', cur === 2 && !over);
  $('playerBottomBar').classList.toggle('active-turn', cur === 1 && !over);
}

function place(i, fromAI) {
  if (over || paused || cells[i]) return;
  if (gameMode === 'ai' && cur === 2 && !fromAI) return;
  cells[i] = cur;
  born[i] = performance.now();
  sndPlace(cur);
  const w = findWin(cells);
  if (w) { winLine = w; winAt = performance.now(); endGame(cur); }
  else if (isFull(cells)) endGame(0);
  else {
    cur = 3 - cur;
    updateTurnUI();
    if (gameMode === 'ai' && cur === 2) aiTurn();
  }
  requestDraw();
}

function endGame(winner) {
  over = true;
  aiToken++;
  updateTurnUI();
  let title, cls = '', trophy = '+1';
  if (winner === 0) { title = t('result.draw'); cls = 'draw'; trophy = '+0'; sndDraw(); }
  else if (winner === 1) {
    scoreP1++; sndWin();
    title = gameMode === 'pvp' ? t('result.p1Wins') : t('result.youWin');
  } else {
    scoreP2++;
    if (gameMode === 'ai') { title = t('result.youLose'); cls = 'lose'; sndLose(); }
    else { title = t('result.p2Wins'); sndWin(); }
  }
  $('scoreTop').textContent = scoreP2;
  $('scoreBottom').textContent = scoreP1;
  setTimeout(() => showResult(title, cls, trophy), winner === 0 ? 450 : 900);
}

function showResult(title, cls, trophy) {
  const banner = $('resultBanner');
  banner.textContent = title;
  banner.className = 'banner' + (cls ? ' ' + cls : '');
  $('resultScore').textContent = scoreP1 + ' - ' + scoreP2;
  $('resultTrophy').textContent = trophy;
  $('resAvatarRight').innerHTML = gameMode === 'ai' ? AI_AVATAR_SVG : P2_AVATAR_SVG;
  $('resultOverlay').classList.remove('hidden');
}

canvas.addEventListener('click', (e) => {
  if (over || paused) return;
  const r = canvas.getBoundingClientRect();
  const col = Math.min(2, Math.max(0, Math.floor((e.clientX - r.left) / (r.width / 3))));
  const row = Math.min(2, Math.max(0, Math.floor((e.clientY - r.top) / (r.height / 3))));
  place(row * 3 + col, false);
});

/* ===== UI WIRING ===== */
const AI_AVATAR_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="8" width="16" height="12" rx="3"/><circle cx="9" cy="14" r="1.4" fill="currentColor" stroke="none"/><circle cx="15" cy="14" r="1.4" fill="currentColor" stroke="none"/><path d="M12 8V4"/><circle cx="12" cy="3" r="1.2" fill="currentColor" stroke="none"/><path d="M2 13v3M22 13v3"/></svg>';
const P2_AVATAR_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8"/></svg>';

document.querySelectorAll('.optbtn.mode').forEach((btn) => {
  btn.addEventListener('click', () => {
    sndClick();
    document.querySelectorAll('.optbtn.mode').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    gameMode = btn.dataset.mode;
    $('diffSection').style.display = gameMode === 'ai' ? 'block' : 'none';
  });
});
document.querySelectorAll('.optbtn.diff').forEach((btn) => {
  btn.addEventListener('click', () => {
    sndClick();
    document.querySelectorAll('.optbtn.diff').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    difficulty = btn.dataset.diff;
  });
});

function applyModeLabels() {
  const top = gameMode === 'ai' ? AI_AVATAR_SVG : P2_AVATAR_SVG;
  $('avatarTopIcon').outerHTML = top.replace('<svg ', '<svg id="avatarTopIcon" ');
  $('nameTop').textContent = gameMode === 'ai' ? t('player.ai') : t('player.p2');
  $('nameBottom').textContent = gameMode === 'ai' ? t('player.you') : t('player.p1');
}

function startGame(keepStarter) {
  aiToken++;
  cells = new Array(9).fill(0);
  born = new Array(9).fill(0);
  winLine = null;
  over = false;
  paused = false;
  if (!keepStarter) round++;
  cur = (round % 2 === 1) ? 1 : 2;      // the starter alternates every round
  updateTurnUI();
  resizeCanvas();
  if (gameMode === 'ai' && cur === 2) aiTurn();
}

$('startBtn').addEventListener('click', () => {
  sndClick();
  applyModeLabels();
  scoreP1 = 0; scoreP2 = 0; round = 0;
  $('scoreTop').textContent = 0;
  $('scoreBottom').textContent = 0;
  $('setupOverlay').classList.add('hidden');
  startGame(false);
});
$('rematchBtn').addEventListener('click', () => {
  sndClick();
  $('resultOverlay').classList.add('hidden');
  startGame(false);
});

function goHome() { sndClick(); GC.goHome(); }
$('setupQuitBtn').addEventListener('click', goHome);
$('homeBtn').addEventListener('click', goHome);

$('helpBtn').addEventListener('click', () => { sndClick(); $('helpOverlay').classList.remove('hidden'); });
$('helpCloseBtn').addEventListener('click', () => { sndClick(); $('helpOverlay').classList.add('hidden'); });

function goToGameMenu() {
  sndClick();
  aiToken++;
  paused = false;
  $('resultOverlay').classList.add('hidden');
  $('pauseOverlay').classList.add('hidden');
  $('setupOverlay').classList.remove('hidden');
}
$('quitBtn').addEventListener('click', goToGameMenu);
$('pauseMenuBtn').addEventListener('click', goToGameMenu);

$('pauseBtn').addEventListener('click', () => {
  const setupOpen = !$('setupOverlay').classList.contains('hidden');
  const resultOpen = !$('resultOverlay').classList.contains('hidden');
  if (setupOpen || resultOpen || over) return;
  sndClick();
  paused = true;
  $('pauseOverlay').classList.remove('hidden');
});
$('resumeBtn').addEventListener('click', () => {
  sndClick();
  paused = false;
  $('pauseOverlay').classList.add('hidden');
});
$('pauseRestartBtn').addEventListener('click', () => {
  sndClick();
  $('pauseOverlay').classList.add('hidden');
  startGame(true);
});

$('diffSection').style.display = 'none';

/* ===== INIT ===== */
applyTranslations();
resizeCanvas();
