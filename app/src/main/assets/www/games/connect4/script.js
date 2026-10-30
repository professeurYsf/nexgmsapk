'use strict';

/* =========================================================
   LINE UP 4
   Linked to the Game Collection home screen via localStorage:
   - "gc_lang"  -> "en" | "fr"
   - "gc_sound" -> "on" | "off"
   ========================================================= */

/* ---- i18n ------------------------------------------------ */
const STRINGS = {
  en: {
    'game.title': 'Line Up 4',
    'setup.subtitle': 'Line up 4 discs to win',
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
    'pause.gameMenu': 'Line Up 4 Menu',
    'result.rematch': 'Rematch',
    'player.you': 'You',
    'player.p2': 'Player 2',
    'player.ai': 'AI',
    'result.draw': 'DRAW!',
    'result.youWin': 'YOU WIN!',
    'result.youLose': 'YOU LOSE!',
    'result.p1Wins': 'PLAYER 1 WINS!',
    'result.p2Wins': 'PLAYER 2 WINS!',
    'help.title': 'How To Play',
    'help.line1': 'Take turns dropping a disc into one of the 7 columns.',
    'help.line2': 'The disc falls to the lowest empty spot in that column.',
    'help.line3': 'Line up 4 discs in a row — horizontally, vertically or diagonally — to win.',
    'help.line4': 'Play against a friend, or choose Vs AI and pick a difficulty.',
    'help.close': 'Got it'
  },
  fr: {
    'game.title': 'Aligne 4',
    'setup.subtitle': 'Alignez 4 jetons pour gagner',
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
    'pause.resume': 'Continuer',
    'pause.restart': 'Recommencer',
    'pause.gameMenu': 'Menu Aligne 4',
    'result.rematch': 'Revanche',
    'player.you': 'Vous',
    'player.p2': 'Joueur 2',
    'player.ai': 'IA',
    'result.draw': 'ÉGALITÉ !',
    'result.youWin': 'VOUS GAGNEZ !',
    'result.youLose': 'VOUS PERDEZ !',
    'result.p1Wins': 'JOUEUR 1 GAGNE !',
    'result.p2Wins': 'JOUEUR 2 GAGNE !',
    'help.title': 'Comment jouer',
    'help.line1': 'Laissez tomber un jeton dans l\u2019une des 7 colonnes, à tour de rôle.',
    'help.line2': 'Le jeton descend jusqu\u2019à la case vide la plus basse de la colonne.',
    'help.line3': 'Alignez 4 jetons — horizontalement, verticalement ou en diagonale — pour gagner.',
    'help.line4': "Jouez contre un ami, ou choisissez Contre l'IA et une difficulté.",
    'help.close': 'Compris'
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
const COLS = 7;
const ROWS = 6;
let CELL = 46;

let board = [];              // board[row][col], row 0 = top
let currentPlayer = 1;       // 1 = red (you / player1), 2 = yellow (player2 / AI)
let gameMode = 'pvp';
let difficulty = 'easy';
let gameOver = false;
let paused = false;
let scoreP1 = 0, scoreP2 = 0;
let aiThinking = false;
let dropping = false;        // true while the falling-disc animation is playing
let hoverCol = -1;

/* ===== CANVAS ===== */
const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  const wrap = document.querySelector('.board-wrap');
  const availW = wrap.clientWidth - 12;
  const availH = wrap.clientHeight - 12;
  const cellW = Math.floor(availW / COLS);
  const cellH = Math.floor(availH / ROWS);
  CELL = Math.max(28, Math.min(cellW, cellH));
  const pxW = CELL * COLS;
  const pxH = CELL * ROWS;
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = pxW + 'px';
  canvas.style.height = pxH + 'px';
  canvas.width = pxW * dpr;
  canvas.height = pxH * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw();
}
window.addEventListener('resize', resizeCanvas);

/* ===== BOARD LOGIC ===== */
function newBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}
function getOpenRow(b, col) {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (b[r][col] === 0) return r;
  }
  return -1;
}
function isValidColumn(b, col) {
  return b[0][col] === 0;
}
function isFull(b) {
  for (let c = 0; c < COLS; c++) if (isValidColumn(b, c)) return false;
  return true;
}

const DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]];
function checkWinAt(b, r, c, player) {
  for (const [dr, dc] of DIRS) {
    let count = 1;
    let cells = [[r, c]];
    let rr = r + dr, cc = c + dc;
    while (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS && b[rr][cc] === player) { count++; cells.push([rr, cc]); rr += dr; cc += dc; }
    rr = r - dr; cc = c - dc;
    while (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS && b[rr][cc] === player) { count++; cells.push([rr, cc]); rr -= dr; cc -= dc; }
    if (count >= 4) return cells;
  }
  return null;
}

/* ===== DRAWING ===== */
let winningCells = null;
let lastMove = null;

const COLOR_HOLE = '#EAF6FF';
const COLOR_RED = '#FF5E5E';
const COLOR_RED_DEEP = '#D9342F';
const COLOR_YELLOW = '#FFCF44';
const COLOR_YELLOW_DEEP = '#E8A400';
const COLOR_WIN_RING = '#1FC79B';
const COLOR_HOVER = 'rgba(255,255,255,0.18)';

// falling-disc animation state
let fallingDisc = null; // { col, fromY, toY, y, player, row }

function drawDisc(cx, cy, radius, player) {
  const grad = ctx.createRadialGradient(cx - radius * 0.35, cy - radius * 0.35, radius * 0.15, cx, cy, radius);
  if (player === 1) {
    grad.addColorStop(0, COLOR_RED);
    grad.addColorStop(1, COLOR_RED_DEEP);
  } else {
    grad.addColorStop(0, COLOR_YELLOW);
    grad.addColorStop(1, COLOR_YELLOW_DEEP);
  }
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.lineWidth = Math.max(1, radius * 0.06);
  ctx.strokeStyle = 'rgba(0,0,0,0.08)';
  ctx.stroke();
}

function draw() {
  const pxW = CELL * COLS;
  const pxH = CELL * ROWS;
  ctx.clearRect(0, 0, pxW, pxH);

  const radius = CELL * 0.38;

  // column hover highlight
  if (hoverCol >= 0 && !gameOver && !paused && !aiThinking && !dropping) {
    ctx.fillStyle = COLOR_HOVER;
    ctx.fillRect(hoverCol * CELL, 0, CELL, pxH);
  }

  // holes + placed discs
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cx = c * CELL + CELL / 2;
      const cy = r * CELL + CELL / 2;
      const piece = board[r][c];

      if (piece === 0) {
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = COLOR_HOLE;
        ctx.fill();
      } else {
        drawDisc(cx, cy, radius, piece);
      }

      if (winningCells && winningCells.some(([wr, wc]) => wr === r && wc === c)) {
        ctx.beginPath();
        ctx.arc(cx, cy, radius + 3, 0, Math.PI * 2);
        ctx.lineWidth = 3;
        ctx.strokeStyle = COLOR_WIN_RING;
        ctx.stroke();
      }
    }
  }

  // falling disc drawn on top, mid-animation
  if (fallingDisc) {
    const cx = fallingDisc.col * CELL + CELL / 2;
    drawDisc(cx, fallingDisc.y, radius, fallingDisc.player);
  }
}

function animateDrop(col, row, player, onDone) {
  dropping = true;
  const cellCenter = (r) => r * CELL + CELL / 2;
  const fromY = -CELL * 1.4;
  const toY = cellCenter(row);
  const fallDuration = 160 + row * 55;
  const bounceDuration = 130;
  const bounceHeight = CELL * 0.16;
  const start = performance.now();

  fallingDisc = { col, y: fromY, player };

  function fallStep(now) {
    const elapsed = now - start;
    let progress = Math.min(1, elapsed / fallDuration);
    // ease-in (accelerating fall, like gravity)
    const eased = progress * progress;
    fallingDisc.y = fromY + (toY - fromY) * eased;
    draw();
    if (progress < 1) {
      requestAnimationFrame(fallStep);
    } else {
      bounceStep(performance.now());
    }
  }

  function bounceStep(bounceStart) {
    function step(now) {
      const elapsed = now - bounceStart;
      const progress = Math.min(1, elapsed / bounceDuration);
      // single settling bounce: up then back down (sine ease-out)
      const offset = Math.sin(progress * Math.PI) * bounceHeight * (1 - progress * 0.3);
      fallingDisc.y = toY - offset;
      draw();
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        fallingDisc = null;
        dropping = false;
        draw();
        onDone();
      }
    }
    requestAnimationFrame(step);
  }

  requestAnimationFrame(fallStep);
}

/* ===== MOVES ===== */
function placeMove(col) {
  if (gameOver || paused || aiThinking || dropping) return;
  if (!isValidColumn(board, col)) return;

  const row = getOpenRow(board, col);
  if (row < 0) return;

  sndPlace(currentPlayer);
  const player = currentPlayer;

  animateDrop(col, row, player, () => {
    board[row][col] = player;
    lastMove = [row, col];
    draw();

    const win = checkWinAt(board, row, col, player);
    if (win) {
      winningCells = win;
      draw();
      endGame(player);
      return;
    }
    if (isFull(board)) { endGame(0); return; }

    currentPlayer = currentPlayer === 1 ? 2 : 1;
    updateTurnUI();

    if (gameMode === 'ai' && currentPlayer === 2 && !gameOver) {
      aiThinking = true;
      setTimeout(aiMove, 400);
    }
  });
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
  setTimeout(() => showResult(title, cls, trophy), 500);
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
function colFromEvent(e) {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  return Math.floor(x / CELL);
}
canvas.addEventListener('click', (e) => {
  if (gameOver || paused || aiThinking || dropping) return;
  if (gameMode === 'ai' && currentPlayer === 2) return;
  const c = colFromEvent(e);
  if (c >= 0 && c < COLS) placeMove(c);
});
canvas.addEventListener('mousemove', (e) => {
  const c = colFromEvent(e);
  const next = (c >= 0 && c < COLS) ? c : -1;
  if (next !== hoverCol) { hoverCol = next; draw(); }
});
canvas.addEventListener('mouseleave', () => { hoverCol = -1; draw(); });

/* ===== AI (minimax with alpha-beta pruning) ===== */
const DEPTH_BY_DIFFICULTY = { medium: 3, hard: 5, expert: 6 };

const COL_SEARCH_ORDER = [3, 2, 4, 1, 5, 0, 6].filter(c => c < COLS);

function getValidColumns(b) {
  return COL_SEARCH_ORDER.filter(c => isValidColumn(b, c));
}

function evaluateWindow(cells, piece) {
  const oppPiece = piece === 1 ? 2 : 1;
  const countPiece = cells.filter(v => v === piece).length;
  const countEmpty = cells.filter(v => v === 0).length;
  const countOpp = cells.filter(v => v === oppPiece).length;

  if (countPiece === 4) return 100000;
  if (countPiece === 3 && countEmpty === 1) return 50;
  if (countPiece === 2 && countEmpty === 2) return 8;
  if (countOpp === 3 && countEmpty === 1) return -60;
  if (countOpp === 2 && countEmpty === 2) return -6;
  return 0;
}

function scorePosition(b, piece) {
  let score = 0;

  // center column preference
  const centerCol = Math.floor(COLS / 2);
  let centerCount = 0;
  for (let r = 0; r < ROWS; r++) if (b[r][centerCol] === piece) centerCount++;
  score += centerCount * 6;

  // horizontal
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      score += evaluateWindow([b[r][c], b[r][c + 1], b[r][c + 2], b[r][c + 3]], piece);
    }
  }
  // vertical
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS - 3; r++) {
      score += evaluateWindow([b[r][c], b[r + 1][c], b[r + 2][c], b[r + 3][c]], piece);
    }
  }
  // diagonal (down-right)
  for (let r = 0; r < ROWS - 3; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      score += evaluateWindow([b[r][c], b[r + 1][c + 1], b[r + 2][c + 2], b[r + 3][c + 3]], piece);
    }
  }
  // diagonal (up-right)
  for (let r = 3; r < ROWS; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      score += evaluateWindow([b[r][c], b[r - 1][c + 1], b[r - 2][c + 2], b[r - 3][c + 3]], piece);
    }
  }

  return score;
}

function minimax(b, depth, alpha, beta, maximizing, lastMoveInfo) {
  const validCols = getValidColumns(b);
  const lastWin = lastMoveInfo ? checkWinAt(b, lastMoveInfo.row, lastMoveInfo.col, lastMoveInfo.piece) : null;
  const isTerminal = !!lastWin || validCols.length === 0;

  if (depth === 0 || isTerminal) {
    if (isTerminal) {
      if (lastWin) return [null, lastMoveInfo.piece === 2 ? 10000000 : -10000000];
      return [null, 0]; // draw
    }
    return [null, scorePosition(b, 2)];
  }

  if (maximizing) {
    let value = -Infinity;
    let bestCol = validCols[0];
    for (const col of validCols) {
      const row = getOpenRow(b, col);
      b[row][col] = 2;
      const [, newScore] = minimax(b, depth - 1, alpha, beta, false, { row, col, piece: 2 });
      b[row][col] = 0;
      if (newScore > value) { value = newScore; bestCol = col; }
      alpha = Math.max(alpha, value);
      if (alpha >= beta) break;
    }
    return [bestCol, value];
  } else {
    let value = Infinity;
    let bestCol = validCols[0];
    for (const col of validCols) {
      const row = getOpenRow(b, col);
      b[row][col] = 1;
      const [, newScore] = minimax(b, depth - 1, alpha, beta, true, { row, col, piece: 1 });
      b[row][col] = 0;
      if (newScore < value) { value = newScore; bestCol = col; }
      beta = Math.min(beta, value);
      if (alpha >= beta) break;
    }
    return [bestCol, value];
  }
}

function findImmediateMove(b, piece) {
  for (const col of getValidColumns(b)) {
    const row = getOpenRow(b, col);
    b[row][col] = piece;
    const win = checkWinAt(b, row, col, piece);
    b[row][col] = 0;
    if (win) return col;
  }
  return null;
}

function aiMove() {
  aiThinking = false;
  if (gameOver || paused) return;

  let col;
  if (difficulty === 'easy') {
    // mostly random, but never miss a free immediate win
    col = findImmediateMove(board, 2);
    if (col === null) {
      const valid = getValidColumns(board);
      col = valid[Math.floor(Math.random() * valid.length)];
    }
  } else {
    // always take an immediate win, always block an immediate opponent win,
    // otherwise search with minimax at a depth based on difficulty.
    col = findImmediateMove(board, 2);
    if (col === null) col = findImmediateMove(board, 1);
    if (col === null) {
      const depth = DEPTH_BY_DIFFICULTY[difficulty] || 3;
      const [bestCol] = minimax(board, depth, -Infinity, Infinity, true, null);
      col = bestCol;
    }
  }

  if (col !== null && col !== undefined && isValidColumn(board, col)) {
    placeMove(col);
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
  } else {
    document.getElementById('nameTop').textContent = t('player.p2');
    document.getElementById('avatarTopIcon').outerHTML = P2_AVATAR_SVG.replace('<svg ', '<svg id="avatarTopIcon" ');
  }
}

function startGame() {
  board = newBoard();
  currentPlayer = 1;
  gameOver = false;
  paused = false;
  aiThinking = false;
  dropping = false;
  fallingDisc = null;
  winningCells = null;
  lastMove = null;
  updateTurnUI();
  resizeCanvas();
}

function updateTurnUI() {
  document.getElementById('dotTop').classList.toggle('on', currentPlayer === 2);
  document.getElementById('dotBottom').classList.toggle('on', currentPlayer === 1);
  document.getElementById('playerTopBar').classList.toggle('active-turn', currentPlayer === 2);
  document.getElementById('playerBottomBar').classList.toggle('active-turn', currentPlayer === 1);
}

document.getElementById('startBtn').addEventListener('click', () => {
  sndClick();
  applyModeLabels();
  scoreP1 = 0; scoreP2 = 0;
  document.getElementById('scoreTop').textContent = 0;
  document.getElementById('scoreBottom').textContent = 0;
  document.getElementById('setupOverlay').classList.add('hidden');
  startGame();
});

document.getElementById('rematchBtn').addEventListener('click', () => {
  sndClick();
  document.getElementById('resultOverlay').classList.add('hidden');
  startGame();
});

function goHome() {
  sndClick();
  GC.goHome();
}
document.getElementById('setupQuitBtn').addEventListener('click', goHome);

/* ---- Help ---- */
document.getElementById('helpBtn').addEventListener('click', () => {
  sndClick();
  document.getElementById('helpOverlay').classList.remove('hidden');
});
document.getElementById('helpCloseBtn').addEventListener('click', () => {
  sndClick();
  document.getElementById('helpOverlay').classList.add('hidden');
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
  document.getElementById('pauseOverlay').classList.add('hidden');
  startGame();
});

/* ---- Home (back to Game Collection) ---- */
document.getElementById('homeBtn').addEventListener('click', goHome);

document.getElementById('diffSection').style.display = 'none';

/* ===== INIT ===== */
applyTranslations();
board = newBoard();
resizeCanvas();
