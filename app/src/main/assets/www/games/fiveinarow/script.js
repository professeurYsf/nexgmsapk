'use strict';

/* =========================================================
   FIVE IN A ROW
   Linked to the Game Collection home screen via localStorage:
   - "gc_lang"  -> "en" | "fr"
   - "gc_sound" -> "on" | "off"
   ========================================================= */

/* ---- i18n ------------------------------------------------ */
const STRINGS = {
  en: {
    'game.title': 'Five in a Row',
    'setup.subtitle': 'Line up 5 in a row to win',
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
    'help.title': 'How to play',
    'help.li1': 'Take turns placing a piece on the grid.',
    'help.li2': 'Be the first to line up 5 pieces in a row — horizontally, vertically, or diagonally.',
    'help.li3': 'Play against a friend or against the AI, with adjustable difficulty.',
    'help.li4': "Block your opponent's line while building your own!",
    'help.close': 'Got it',
    'pause.title': 'Game Paused',
    'pause.resume': 'Resume',
    'pause.restart': 'Restart',
    'pause.gameMenu': 'Five in a Row Menu',
    'result.rematch': 'Rematch',
    'player.you': 'You',
    'player.p2': 'Player 2',
    'player.ai': 'AI',
    'result.draw': 'DRAW!',
    'result.youWin': 'YOU WIN!',
    'result.youLose': 'YOU LOSE!',
    'result.p1Wins': 'PLAYER 1 WINS!',
    'result.p2Wins': 'PLAYER 2 WINS!'
  },
  fr: {
    'game.title': 'Cinq en ligne',
    'setup.subtitle': 'Alignez 5 pions pour gagner',
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
    'help.title': 'Comment jouer',
    'help.li1': 'Placez un pion à tour de rôle sur la grille.',
    'help.li2': 'Soyez le premier à aligner 5 pions — horizontalement, verticalement ou en diagonale.',
    'help.li3': "Jouez contre un ami ou contre l'IA, avec une difficulté réglable.",
    'help.li4': "Bloquez la ligne de l'adversaire tout en construisant la vôtre !",
    'help.close': 'Compris',
    'pause.title': 'Jeu en pause',
    'pause.resume': 'Continuer',
    'pause.restart': 'Recommencer',
    'pause.gameMenu': 'Menu de Cinq en ligne',
    'result.rematch': 'Revanche',
    'player.you': 'Vous',
    'player.p2': 'Joueur 2',
    'player.ai': 'IA',
    'result.draw': 'ÉGALITÉ !',
    'result.youWin': 'VOUS GAGNEZ !',
    'result.youLose': 'VOUS PERDEZ !',
    'result.p1Wins': 'JOUEUR 1 GAGNE !',
    'result.p2Wins': 'JOUEUR 2 GAGNE !'
  }
};

const lang = (localStorage.getItem('gc_lang') === 'fr') ? 'fr' : 'en';
const soundOn = localStorage.getItem('gc_sound') !== 'off';

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

/* =========================================================
   SOUND — synthesized with the Web Audio API, no asset files.
   Muted automatically when the home screen's sound switch is OFF.
   ========================================================= */
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

function sndPlace(player) {
  playTone(player === 1 ? 520 : 400, 0.09, 'sine', 0.16, 0);
}
function sndClick() {
  playTone(680, 0.06, 'square', 0.08, 0);
}
function sndWin() {
  [523, 659, 784, 1046].forEach((f, i) => playTone(f, 0.22, 'triangle', 0.16, i * 0.09));
}
function sndLose() {
  [400, 320, 260].forEach((f, i) => playTone(f, 0.28, 'sawtooth', 0.10, i * 0.12));
}
function sndDraw() {
  [440, 440].forEach((f, i) => playTone(f, 0.18, 'sine', 0.12, i * 0.16));
}

/* =========================================================
   CONFIG / STATE
   ========================================================= */
const SIZE = 15;
const WIN_LEN = 5;
let CELL = 34;

let board = [];
let currentPlayer = 1;
let gameMode = 'pvp';
let difficulty = 'easy';
let gameOver = false;
let paused = false;
let scoreP1 = 0, scoreP2 = 0;
let moveHistory = [];
let aiThinking = false;
let nextStarter = 1;

/* =========================================================
   REAL VIEWPORT HEIGHT (--app-vh)
   Some WebViews (older Android WebView, Sketchware APK builds) support
   the CSS `dvh` unit inconsistently and can report a taller-than-actual
   height, which then makes the board canvas compute a size bigger than
   the real visible area. To stay correct everywhere, we measure the
   real height with window.innerHeight and publish it as a CSS variable
   that style.css consumes instead (with dvh only as a same-frame CSS
   fallback before this runs).
   ========================================================= */
function setAppViewportHeight() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--app-vh', vh + 'px');
}
setAppViewportHeight();
window.addEventListener('resize', setAppViewportHeight);
window.addEventListener('orientationchange', setAppViewportHeight);
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', setAppViewportHeight);
}

/* ===== CANVAS ===== */
const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');

const BOARD_MAX_PX = 640; // sensible ceiling so the board doesn't balloon on huge desktop monitors
const BOARD_MIN_PX = 200; // sensible floor so the board stays usable on very small/short screens

function resizeCanvas() {
  const wrap = document.querySelector('.board-wrap');
  const availW = wrap.clientWidth - 12;
  const availH = wrap.clientHeight - 12;
  const dim = Math.max(BOARD_MIN_PX, Math.min(availW, availH, BOARD_MAX_PX));
  CELL = Math.floor(dim / SIZE);
  const px = CELL * SIZE;
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = px + 'px';
  canvas.style.height = px + 'px';
  canvas.width = px * dpr;
  canvas.height = px * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw();
}

/* Measure/redraw is scheduled via rAF so rapid resize/orientation events
   (rotating a tablet, on-screen keyboard, browser chrome changes) don't
   thrash layout. Triggers cover resize, orientation change, the visual
   viewport (mobile browser UI showing/hiding), a ResizeObserver on the
   board wrapper itself, plus page-load and web-font-load — the two
   moments most likely to silently reflow the layout (avatar/player bar
   growing once the real font metrics land) after the very first
   measurement — so the canvas always tracks the real available space. */
let boardResizeRAF = null;
function scheduleResizeCanvas() {
  setAppViewportHeight();
  if (boardResizeRAF) cancelAnimationFrame(boardResizeRAF);
  boardResizeRAF = requestAnimationFrame(resizeCanvas);
}
window.addEventListener('resize', scheduleResizeCanvas);
window.addEventListener('orientationchange', scheduleResizeCanvas);
window.addEventListener('load', scheduleResizeCanvas);
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', scheduleResizeCanvas);
}
if (window.ResizeObserver) {
  const boardWrapEl = document.querySelector('.board-wrap');
  if (boardWrapEl) new ResizeObserver(scheduleResizeCanvas).observe(boardWrapEl);
}
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(scheduleResizeCanvas);
}

/* ===== BOARD LOGIC ===== */
function newBoard() {
  board = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
}
function inBounds(r, c) { return r >= 0 && r < SIZE && c >= 0 && c < SIZE; }
const DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]];

function checkWinAt(b, r, c, player) {
  for (const [dr, dc] of DIRS) {
    let count = 1;
    let cells = [[r, c]];
    let rr = r + dr, cc = c + dc;
    while (inBounds(rr, cc) && b[rr][cc] === player) { count++; cells.push([rr, cc]); rr += dr; cc += dc; }
    rr = r - dr; cc = c - dc;
    while (inBounds(rr, cc) && b[rr][cc] === player) { count++; cells.push([rr, cc]); rr -= dr; cc -= dc; }
    if (count >= WIN_LEN) return cells;
  }
  return null;
}
function isFull(b) {
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (b[r][c] === 0) return false;
  return true;
}

/* ===== DRAWING (colors match the app's design tokens) ===== */
let winningCells = null;
let lastMove = null;

const COLOR_GRID = '#E4F2FB';
const COLOR_LAST = 'rgba(255, 169, 62, 0.30)';
const COLOR_WIN = 'rgba(31, 199, 155, 0.30)';
const COLOR_X = '#6C5CE7';   // violet — you
const COLOR_O = '#FF5E72';   // coral  — opponent / AI

function draw() {
  const px = CELL * SIZE;
  ctx.clearRect(0, 0, px, px);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, px, px);

  ctx.strokeStyle = COLOR_GRID;
  ctx.lineWidth = 1;
  for (let i = 0; i <= SIZE; i++) {
    ctx.beginPath(); ctx.moveTo(i * CELL + 0.5, 0); ctx.lineTo(i * CELL + 0.5, px); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * CELL + 0.5); ctx.lineTo(px, i * CELL + 0.5); ctx.stroke();
  }

  if (lastMove) {
    ctx.fillStyle = COLOR_LAST;
    ctx.fillRect(lastMove[1] * CELL, lastMove[0] * CELL, CELL, CELL);
  }
  if (winningCells) {
    ctx.fillStyle = COLOR_WIN;
    for (const [r, c] of winningCells) ctx.fillRect(c * CELL, r * CELL, CELL, CELL);
  }

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] === 1) drawX(r, c);
      else if (board[r][c] === 2) drawO(r, c);
    }
  }
}
function drawX(r, c) {
  const cx = c * CELL + CELL / 2, cy = r * CELL + CELL / 2, s = CELL * 0.28;
  ctx.strokeStyle = COLOR_X;
  ctx.lineWidth = Math.max(2, CELL * 0.13);
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx - s, cy - s); ctx.lineTo(cx + s, cy + s); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + s, cy - s); ctx.lineTo(cx - s, cy + s); ctx.stroke();
}
function drawO(r, c) {
  const cx = c * CELL + CELL / 2, cy = r * CELL + CELL / 2, rad = CELL * 0.30;
  ctx.strokeStyle = COLOR_O;
  ctx.lineWidth = Math.max(2, CELL * 0.13);
  ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.stroke();
}

/* ===== GAME FLOW ===== */
function startGame() {
  newBoard();
  currentPlayer = nextStarter;
  nextStarter = nextStarter === 1 ? 2 : 1;
  gameOver = false;
  paused = false;
  winningCells = null;
  lastMove = null;
  moveHistory = [];
  aiThinking = false;
  resizeCanvas();
  updateTurnUI();
  document.getElementById('resultOverlay').classList.add('hidden');
  document.getElementById('pauseOverlay').classList.add('hidden');

  if (gameMode === 'ai' && currentPlayer === 2) {
    aiThinking = true;
    setTimeout(aiMove, 500);
  }
}

function updateTurnUI() {
  const isTopTurn = currentPlayer === 2;
  const isBottomTurn = currentPlayer === 1;
  document.getElementById('dotTop').classList.toggle('on', isTopTurn);
  document.getElementById('dotBottom').classList.toggle('on', isBottomTurn);
  document.getElementById('playerTopBar').classList.toggle('active-turn', isTopTurn);
  document.getElementById('playerBottomBar').classList.toggle('active-turn', isBottomTurn);
}

function placeMove(r, c) {
  if (gameOver || paused || board[r][c] !== 0 || aiThinking) return;
  board[r][c] = currentPlayer;
  lastMove = [r, c];
  moveHistory.push([r, c]);
  sndPlace(currentPlayer);
  draw();

  const win = checkWinAt(board, r, c, currentPlayer);
  if (win) {
    winningCells = win;
    draw();
    endGame(currentPlayer);
    return;
  }
  if (isFull(board)) { endGame(0); return; }

  currentPlayer = currentPlayer === 1 ? 2 : 1;
  updateTurnUI();

  if (gameMode === 'ai' && currentPlayer === 2 && !gameOver) {
    aiThinking = true;
    setTimeout(aiMove, 380);
  }
}

function endGame(winner) {
  gameOver = true;
  let title, cls, trophy;
  if (winner === 0) {
    title = t('result.draw'); cls = 'draw'; trophy = '+0';
    sndDraw();
  } else if (winner === 1) {
    title = t('result.youWin'); cls = '';
    sndWin();
    scoreP1 += 1;
    trophy = '+1';
    if (gameMode === 'pvp') title = t('result.p1Wins');
  } else {
    trophy = '+1';
    if (gameMode === 'ai') { title = t('result.youLose'); cls = 'lose'; sndLose(); scoreP2 += 1; }
    else { title = t('result.p2Wins'); cls = ''; sndWin(); scoreP2 += 1; }
  }
  document.getElementById('scoreTop').textContent = scoreP2;
  document.getElementById('scoreBottom').textContent = scoreP1;
  setTimeout(() => showResult(title, cls, trophy), 550);
}

function showResult(title, cls, trophy) {
  const ov = document.getElementById('resultOverlay');
  const banner = document.getElementById('resultBanner');
  banner.textContent = title;
  banner.className = 'banner' + (cls ? (' ' + cls) : '');
  document.getElementById('resultScore').textContent = scoreP1 + ' - ' + scoreP2;
  document.getElementById('resultTrophy').textContent = trophy;
  const resRight = document.getElementById('resAvatarRight');
  resRight.innerHTML = gameMode === 'ai' ? AI_AVATAR_SVG : P2_AVATAR_SVG;
  ov.classList.remove('hidden');
}

/* ===== INPUT ===== */
canvas.addEventListener('click', (e) => {
  if (gameOver || paused || aiThinking) return;
  if (gameMode === 'ai' && currentPlayer === 2) return;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const c = Math.floor(x / CELL);
  const r = Math.floor(y / CELL);
  if (inBounds(r, c)) placeMove(r, c);
});

/* ===== AI =====
   Every difficulty first checks hard tactics — take a winning move,
   block the opponent's winning move — before anything else. This fixes
   the old AI, which only weighed "attack vs defense" scores and could
   walk past a free win or an open block.

   Difficulty then scales how far ahead it looks:
   - Easy:   tactics + a little randomness among decent moves (still not blind)
   - Medium: full single-move tactics, always plays its best move
   - Hard:   tactics + 2-ply minimax search (beatable, but a real fight)
   - Expert: tactics + 3-ply minimax search with wider candidate lists
   ===== */
const AI_MARK = 2;
const HUMAN_MARK = 1;

function aiMove() {
  aiThinking = false;
  if (gameOver || paused) return;
  let move;
  switch (difficulty) {
    case 'easy':   move = pickMoveEasy(); break;
    case 'medium': move = pickMoveMedium(); break;
    case 'hard':   move = pickMoveSearch(2, 10); break;
    default:       move = pickMoveSearch(3, 8); // expert
  }
  if (move) placeMove(move.r, move.c);
}

function candidateCells(b) {
  const cells = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (b[r][c] !== 0) continue;
      if (hasNeighborOnBoard(b, r, c)) cells.push({ r, c });
    }
  }
  if (cells.length === 0) cells.push({ r: Math.floor(SIZE / 2), c: Math.floor(SIZE / 2) });
  return cells;
}
function hasNeighborOnBoard(b, r, c) {
  for (let i = -2; i <= 2; i++) {
    for (let j = -2; j <= 2; j++) {
      if (i === 0 && j === 0) continue;
      const nr = r + i, nc = c + j;
      if (inBounds(nr, nc) && b[nr][nc] !== 0) return true;
    }
  }
  return false;
}

// Analyze the run created if `player` places at (r,c) along one axis.
// Returns { count, openEnds } — count includes the stone at (r,c) itself.
function analyzeAxis(b, r, c, dr, dc, player) {
  let fwd = 0, fr = r + dr, fc = c + dc;
  while (inBounds(fr, fc) && b[fr][fc] === player) { fwd++; fr += dr; fc += dc; }
  const fwdOpen = inBounds(fr, fc) && b[fr][fc] === 0;

  let bwd = 0, br = r - dr, bc = c - dc;
  while (inBounds(br, bc) && b[br][bc] === player) { bwd++; br -= dr; bc -= dc; }
  const bwdOpen = inBounds(br, bc) && b[br][bc] === 0;

  return { count: 1 + fwd + bwd, openEnds: (fwdOpen ? 1 : 0) + (bwdOpen ? 1 : 0) };
}

function axisScore({ count, openEnds }) {
  if (count >= 5) return 1000000;
  if (count === 4 && openEnds === 2) return 100000;  // open four — unstoppable next move
  if (count === 4 && openEnds === 1) return 12000;   // simple four — forces a block
  if (count === 3 && openEnds === 2) return 6000;    // open three — becomes an open four if ignored
  if (count === 3 && openEnds === 1) return 700;
  if (count === 2 && openEnds === 2) return 250;
  if (count === 2 && openEnds === 1) return 40;
  if (count === 1 && openEnds === 2) return 8;
  return 1;
}

// How good is it for `player` to place a stone at (r,c), from the patterns
// that stone alone would complete. Rewards double threats (forks) heavily.
function cellScoreFor(b, r, c, player) {
  let total = 0;
  let openThrees = 0;
  let fours = 0;
  for (const [dr, dc] of DIRS) {
    const a = analyzeAxis(b, r, c, dr, dc, player);
    total += axisScore(a);
    if (a.count === 3 && a.openEnds === 2) openThrees++;
    if (a.count === 4 && a.openEnds >= 1) fours++;
  }
  if (openThrees >= 2) total += 20000;
  if (fours >= 2) total += 200000;
  return total;
}

function findImmediateWin(b, player) {
  for (const { r, c } of candidateCells(b)) {
    for (const [dr, dc] of DIRS) {
      if (analyzeAxis(b, r, c, dr, dc, player).count >= 5) return { r, c };
    }
  }
  return null;
}

// A move that gives `player` an open four — two separate cells that would
// each complete five, so the opponent can only block one of them.
function findOpenFourMove(b, player) {
  for (const { r, c } of candidateCells(b)) {
    for (const [dr, dc] of DIRS) {
      const a = analyzeAxis(b, r, c, dr, dc, player);
      if (a.count === 4 && a.openEnds === 2) return { r, c };
    }
  }
  return null;
}

function rankedCandidates(b, topN) {
  const scored = candidateCells(b).map(({ r, c }) => ({
    r, c,
    score: cellScoreFor(b, r, c, AI_MARK) + cellScoreFor(b, r, c, HUMAN_MARK) * 1.05
  }));
  scored.sort((a, bb) => bb.score - a.score);
  return scored.slice(0, topN);
}

/* ---- Easy: takes free wins/blocks, otherwise a little unpredictable ---- */
function pickMoveEasy() {
  const win = findImmediateWin(board, AI_MARK);
  if (win) return win;
  const block = findImmediateWin(board, HUMAN_MARK);
  if (block) return block;

  const ranked = rankedCandidates(board, 6);
  if (ranked.length === 0) return { r: Math.floor(SIZE / 2), c: Math.floor(SIZE / 2) };
  const pool = ranked.slice(0, Math.min(3, ranked.length));
  return pool[Math.floor(Math.random() * pool.length)];
}

/* ---- Medium: full single-move tactics, always plays its best move ---- */
function pickMoveMedium() {
  const win = findImmediateWin(board, AI_MARK);
  if (win) return win;
  const block = findImmediateWin(board, HUMAN_MARK);
  if (block) return block;
  const ownOpenFour = findOpenFourMove(board, AI_MARK);
  if (ownOpenFour) return ownOpenFour;
  const blockOpenFour = findOpenFourMove(board, HUMAN_MARK);
  if (blockOpenFour) return blockOpenFour;

  const ranked = rankedCandidates(board, 6);
  return ranked.length ? ranked[0] : { r: Math.floor(SIZE / 2), c: Math.floor(SIZE / 2) };
}

/* ---- Hard / Expert: tactics first, then alpha-beta minimax search ---- */
function pickMoveSearch(depth, breadth) {
  const win = findImmediateWin(board, AI_MARK);
  if (win) return win;
  const block = findImmediateWin(board, HUMAN_MARK);
  if (block) return block;
  const ownOpenFour = findOpenFourMove(board, AI_MARK);
  if (ownOpenFour) return ownOpenFour;
  const blockOpenFour = findOpenFourMove(board, HUMAN_MARK);
  if (blockOpenFour) return blockOpenFour;

  const candidates = rankedCandidates(board, breadth);
  if (candidates.length === 0) return { r: Math.floor(SIZE / 2), c: Math.floor(SIZE / 2) };

  let best = candidates[0];
  let bestScore = -Infinity;
  let alpha = -Infinity;
  const beta = Infinity;
  const nextBreadth = Math.max(4, breadth - 2);

  for (const cand of candidates) {
    board[cand.r][cand.c] = AI_MARK;
    const winNow = checkWinAt(board, cand.r, cand.c, AI_MARK);
    const score = winNow ? 1000000 : minimax(board, depth - 1, alpha, beta, false, nextBreadth);
    board[cand.r][cand.c] = 0;

    if (score > bestScore) { bestScore = score; best = cand; }
    alpha = Math.max(alpha, bestScore);
  }
  return best;
}

// Scores the whole board from the AI's perspective by summing the pattern
// value of every run exactly once (only counted from its starting stone).
function evaluateBoard(b) {
  let score = 0;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const player = b[r][c];
      if (player === 0) continue;
      for (const [dr, dc] of DIRS) {
        const pr = r - dr, pc = c - dc;
        if (inBounds(pr, pc) && b[pr][pc] === player) continue; // not this run's start
        const s = axisScore(analyzeAxis(b, r, c, dr, dc, player));
        score += player === AI_MARK ? s : -s * 1.05;
      }
    }
  }
  return score;
}

function minimax(b, depth, alpha, beta, maximizing, breadth) {
  if (depth === 0) return evaluateBoard(b);

  const player = maximizing ? AI_MARK : HUMAN_MARK;
  const candidates = rankedCandidates(b, breadth);
  if (candidates.length === 0) return evaluateBoard(b);
  const nextBreadth = Math.max(4, breadth - 2);

  if (maximizing) {
    let value = -Infinity;
    for (const cand of candidates) {
      b[cand.r][cand.c] = player;
      const win = checkWinAt(b, cand.r, cand.c, player);
      const s = win ? 900000 + depth : minimax(b, depth - 1, alpha, beta, false, nextBreadth);
      b[cand.r][cand.c] = 0;
      value = Math.max(value, s);
      alpha = Math.max(alpha, value);
      if (beta <= alpha) break;
    }
    return value;
  } else {
    let value = Infinity;
    for (const cand of candidates) {
      b[cand.r][cand.c] = player;
      const win = checkWinAt(b, cand.r, cand.c, player);
      const s = win ? -900000 - depth : minimax(b, depth - 1, alpha, beta, true, nextBreadth);
      b[cand.r][cand.c] = 0;
      value = Math.min(value, s);
      beta = Math.min(beta, value);
      if (beta <= alpha) break;
    }
    return value;
  }
}

/* ===== UI WIRING ===== */
const AI_AVATAR_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="8" width="16" height="12" rx="3"/><circle cx="9" cy="14" r="1.4" fill="currentColor" stroke="none"/><circle cx="15" cy="14" r="1.4" fill="currentColor" stroke="none"/><path d="M12 8V4"/><circle cx="12" cy="3" r="1.2" fill="currentColor" stroke="none"/><path d="M2 13v3M22 13v3"/></svg>';
const P2_AVATAR_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8"/></svg>';

document.querySelectorAll('.optbtn.mode').forEach(btn => {
  btn.addEventListener('click', () => {
    sndClick();
    document.querySelectorAll('.optbtn.mode').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    gameMode = btn.dataset.mode;
    document.getElementById('diffSection').style.display = gameMode === 'ai' ? 'block' : 'none';
  });
});
document.querySelectorAll('.optbtn.diff').forEach(btn => {
  btn.addEventListener('click', () => {
    sndClick();
    document.querySelectorAll('.optbtn.diff').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    difficulty = btn.dataset.diff;
  });
});

function applyModeLabels() {
  if (gameMode === 'ai') {
    document.getElementById('nameTop').textContent = t('player.ai');
    document.getElementById('avatarTopIcon').outerHTML = AI_AVATAR_SVG.replace('<svg ', '<svg id="avatarTopIcon" ');
    document.querySelector('#avatarTop .badge').textContent = 'O';
  } else {
    document.getElementById('nameTop').textContent = t('player.p2');
    document.getElementById('avatarTopIcon').outerHTML = P2_AVATAR_SVG.replace('<svg ', '<svg id="avatarTopIcon" ');
    document.querySelector('#avatarTop .badge').textContent = 'O';
  }
}

document.getElementById('startBtn').addEventListener('click', () => {
  sndClick();
  applyModeLabels();
  scoreP1 = 0; scoreP2 = 0;
  nextStarter = 1;
  document.getElementById('scoreTop').textContent = 0;
  document.getElementById('scoreBottom').textContent = 0;
  document.getElementById('setupOverlay').classList.add('hidden');
  startGame();
});

document.getElementById('rematchBtn').addEventListener('click', () => { sndClick(); startGame(); });

/* ---- Help sheet ---- */
document.getElementById('helpBtn').addEventListener('click', () => {
  sndClick();
  document.getElementById('helpOverlay').classList.remove('hidden');
});
document.getElementById('helpCloseBtn').addEventListener('click', () => {
  sndClick();
  document.getElementById('helpOverlay').classList.add('hidden');
});

/* ---- Quit straight from the setup sheet ---- */
document.getElementById('exitSetupBtn').addEventListener('click', () => {
  sndClick();
  GC.goHome();
});

function goToGameMenu() {
  sndClick();
  document.getElementById('resultOverlay').classList.add('hidden');
  document.getElementById('pauseOverlay').classList.add('hidden');
  document.getElementById('setupOverlay').classList.remove('hidden');
  paused = false;
}
document.getElementById('quitBtn').addEventListener('click', goToGameMenu);
document.getElementById('pauseMenuBtn').addEventListener('click', goToGameMenu);

/* ---- Pause ---- */
document.getElementById('pauseBtn').addEventListener('click', () => {
  const setupOpen = !document.getElementById('setupOverlay').classList.contains('hidden');
  const resultOpen = !document.getElementById('resultOverlay').classList.contains('hidden');
  if (setupOpen || resultOpen || gameOver) return; // nothing to pause
  sndClick();
  paused = true;
  document.getElementById('pauseOverlay').classList.remove('hidden');
});
document.getElementById('resumeBtn').addEventListener('click', () => {
  sndClick();
  paused = false;
  document.getElementById('pauseOverlay').classList.add('hidden');
});
document.getElementById('pauseRestartBtn').addEventListener('click', () => {
  sndClick();
  startGame();
});

/* ---- Home (back to Game Collection) ---- */
document.getElementById('homeBtn').addEventListener('click', () => {
  sndClick();
  GC.goHome();
});

document.getElementById('diffSection').style.display = 'none';

/* ===== INIT ===== */
applyTranslations();
newBoard();
resizeCanvas();
