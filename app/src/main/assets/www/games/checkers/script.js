'use strict';

/* =========================================================
   CHECKERS (Spanish Draughts / Dama)
   ========================================================= */

/* ---- i18n ------------------------------------------------ */
const STRINGS = {
  en: {
    'game.title': 'Checkers',
    'menu.subtitle': 'Spanish draughts \u2014 capture is mandatory',
    'menu.play': 'Play',
    'menu.exit': 'Quit',
    'setup.mode': 'Game mode',
    'setup.vsAI': 'Player 1 vs IA',
    'setup.twoPlayers': 'Player 1 vs Player 2',
    'setup.difficulty': 'Difficulty',
    'diff.easy': 'Easy',
    'diff.medium': 'Medium',
    'diff.hard': 'Hard',
    'diff.expert': 'Expert',
    'help.title': 'How To Play',
    'help.li1': 'Move your pieces diagonally, forward only, one square at a time.',
    'help.li2': 'Capturing is mandatory \u2014 if a capture is available, you must take it.',
    'help.li3': 'If several captures are possible, you must play the one that captures the most pieces.',
    'help.li4': 'Reach the last row to crown a king \u2014 kings move and capture any distance along the diagonal.',
    'help.close': 'Got it',
    'pause.title': 'Game Paused',
    'pause.resume': 'Resume',
    'pause.restart': 'Restart',
    'pause.home': 'Back Home',
    'result.difficulty': 'Difficulty',
    'result.time': 'Time',
    'result.playAgain': 'Play Again',
    'result.newGame': 'New Game',
    'result.youWin': 'You Win!',
    'result.youLose': 'You Lose',
    'result.draw': 'Draw',
    'result.p1Wins': 'Player 1 Wins!',
    'result.p2Wins': 'Player 2 Wins!'
  },
  fr: {
    'game.title': 'Dames',
    'menu.subtitle': 'Dames espagnoles \u2014 la prise est obligatoire',
    'menu.play': 'Commencer',
    'menu.exit': 'Quitter',
    'setup.mode': 'Mode de jeu',
    'setup.vsAI': "Joueur 1 vs IA",
    'setup.twoPlayers': 'Joueur 1 vs Joueur 2',
    'setup.difficulty': 'Difficult\u00e9',
    'diff.easy': 'Facile',
    'diff.medium': 'Moyen',
    'diff.hard': 'Difficile',
    'diff.expert': 'Expert',
    'help.title': 'Comment jouer',
    'help.li1': 'D\u00e9placez vos pions en diagonale, vers l\u2019avant uniquement, une case \u00e0 la fois.',
    'help.li2': 'La prise est obligatoire \u2014 si une prise est possible, vous devez la jouer.',
    'help.li3': 'S\u2019il existe plusieurs prises possibles, vous devez jouer celle qui capture le plus de pions.',
    'help.li4': 'Atteignez la derni\u00e8re rang\u00e9e pour devenir dame \u2014 les dames se d\u00e9placent et capturent \u00e0 toute distance en diagonale.',
    'help.close': 'Compris',
    'pause.title': 'Jeu en pause',
    'pause.resume': 'Continuer',
    'pause.restart': 'Recommencer',
    'pause.home': "Retour \u00e0 l'accueil",
    'result.difficulty': 'Difficult\u00e9',
    'result.time': 'Temps',
    'result.playAgain': 'Rejouer',
    'result.newGame': 'Nouvelle partie',
    'result.youWin': 'Vous gagnez !',
    'result.youLose': 'Vous perdez',
    'result.draw': 'Egalité',
    'result.p1Wins': 'Le joueur 1 gagne !',
    'result.p2Wins': 'Le joueur 2 gagne !'
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
   SOUND
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
  gain.gain.linearRampToValueAtTime(gainPeak || 0.16, t0 + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}
function playSound(type) {
  switch (type) {
    case 'click':   playTone(680, 0.05, 'square', 0.08, 0); break;
    case 'move':    playTone(520, 0.07, 'sine', 0.13, 0); break;
    case 'capture': [700, 480].forEach((f, i) => playTone(f, 0.09, 'triangle', 0.15, i * 0.06)); break;
    case 'crown':   [523, 659, 784].forEach((f, i) => playTone(f, 0.18, 'triangle', 0.15, i * 0.08)); break;
    case 'win':     [523, 659, 784, 1046].forEach((f, i) => playTone(f, 0.22, 'triangle', 0.16, i * 0.09)); break;
    case 'lose':    [400, 320, 260].forEach((f, i) => playTone(f, 0.26, 'sawtooth', 0.10, i * 0.12)); break;
    case 'pause':   playTone(420, 0.1, 'sine', 0.12, 0); break;
    case 'resume':  playTone(560, 0.1, 'sine', 0.12, 0); break;
  }
}

/* =========================================================
   ENGINE — Spanish draughts rules
   ========================================================= */
const SIZE = 8;
const DIRS_ALL = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

function isDark(r, c) { return (r + c) % 2 === 0; }
function inBounds(r, c) { return r >= 0 && r < SIZE && c >= 0 && c < SIZE; }
function owner(v) { return v === 0 ? 0 : (v > 0 ? 1 : 2); }
function isKingVal(v) { return Math.abs(v) === 2; }
function makeVal(player, king) { return king ? (player === 1 ? 2 : -2) : (player === 1 ? 1 : -1); }
function forwardDirsFor(player) { return player === 1 ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]]; }
function promotionRowFor(player) { return player === 1 ? 0 : 7; }
function cloneBoard(b) { return b.map(row => row.slice()); }

function createInitialBoard() {
  const b = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  for (let r = 0; r < 3; r++) for (let c = 0; c < SIZE; c++) if (isDark(r, c)) b[r][c] = -1;
  for (let r = 5; r < 8; r++) for (let c = 0; c < SIZE; c++) if (isDark(r, c)) b[r][c] = 1;
  return b;
}

function manCaptureSteps(board, r, c, player) {
  const steps = [];
  for (const [dr, dc] of forwardDirsFor(player)) {
    const mr = r + dr, mc = c + dc, lr = r + 2 * dr, lc = c + 2 * dc;
    if (!inBounds(lr, lc)) continue;
    const mv = board[mr][mc];
    if (mv === 0 || owner(mv) === player) continue;
    if (board[lr][lc] !== 0) continue;
    steps.push({ to: { r: lr, c: lc }, over: { r: mr, c: mc } });
  }
  return steps;
}
function manNormalMoves(board, r, c, player) {
  const moves = [];
  for (const [dr, dc] of forwardDirsFor(player)) {
    const nr = r + dr, nc = c + dc;
    if (inBounds(nr, nc) && board[nr][nc] === 0) moves.push({ to: { r: nr, c: nc } });
  }
  return moves;
}

// تعديل: إضافة تصفية يمنع أكل الملك في الاتجاه المعاكس المباشر لقفزته السابقة
function kingCaptureSteps(board, r, c, player, lastDir) {
  const steps = [];
  for (const [dr, dc] of DIRS_ALL) {
    if (lastDir && dr === -lastDir[0] && dc === -lastDir[1]) {
      continue; // منع العودة المباشرة في نفس القطر
    }
    let rr = r + dr, cc = c + dc;
    while (inBounds(rr, cc) && board[rr][cc] === 0) { rr += dr; cc += dc; }
    if (!inBounds(rr, cc)) continue;
    const v = board[rr][cc];
    if (owner(v) === player) continue;
    let lr = rr + dr, lc = cc + dc;
    while (inBounds(lr, lc) && board[lr][lc] === 0) {
      steps.push({ to: { r: lr, c: lc }, over: { r: rr, c: cc } });
      lr += dr; lc += dc;
    }
  }
  return steps;
}

function kingNormalMoves(board, r, c) {
  const moves = [];
  for (const [dr, dc] of DIRS_ALL) {
    let rr = r + dr, cc = c + dc;
    while (inBounds(rr, cc) && board[rr][cc] === 0) {
      moves.push({ to: { r: rr, c: cc } });
      rr += dr; cc += dc;
    }
  }
  return moves;
}

function findCaptureSequencesFrom(board, r, c, player) {
  const results = [];
  function dfs(curBoard, curR, curC, curVal, path, lastDir) {
    const king = isKingVal(curVal);
    const steps = king ? kingCaptureSteps(curBoard, curR, curC, player, lastDir) : manCaptureSteps(curBoard, curR, curC, player);
    if (steps.length === 0) {
      if (path.length > 0) results.push(path.slice());
      return;
    }
    for (const step of steps) {
      const nb = cloneBoard(curBoard);
      nb[step.over.r][step.over.c] = 0;
      nb[curR][curC] = 0;
      let newVal = curVal, promoted = false;
      if (!king && step.to.r === promotionRowFor(player)) { newVal = makeVal(player, true); promoted = true; }
      nb[step.to.r][step.to.c] = newVal;

      const stepDir = [Math.sign(step.to.r - curR), Math.sign(step.to.c - curC)];

      path.push({ from: { r: curR, c: curC }, to: step.to, over: step.over, promoted });
      if (promoted) results.push(path.slice());
      else dfs(nb, step.to.r, step.to.c, newVal, path, stepDir);
      path.pop();
    }
  }
  dfs(board, r, c, board[r][c], [], null);
  return results;
}

function getMandatoryCaptures(board, player) {
  const all = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (owner(board[r][c]) !== player) continue;
      for (const steps of findCaptureSequencesFrom(board, r, c, player)) {
        all.push({ from: { r, c }, steps });
      }
    }
  }
  if (all.length === 0) return [];
  const maxLen = Math.max(...all.map(s => s.steps.length));
  return all.filter(s => s.steps.length === maxLen);
}
function getAllNormalMoves(board, player) {
  const moves = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const v = board[r][c];
      if (owner(v) !== player) continue;
      const ms = isKingVal(v) ? kingNormalMoves(board, r, c) : manNormalMoves(board, r, c, player);
      for (const m of ms) moves.push({ from: { r, c }, to: m.to });
    }
  }
  return moves;
}
function getLegalActions(board, player) {
  const captures = getMandatoryCaptures(board, player);
  if (captures.length > 0) return { mandatory: true, sequences: captures };
  return { mandatory: false, moves: getAllNormalMoves(board, player) };
}

function applySequenceToBoard(board, from, steps) {
  let curR = from.r, curC = from.c;
  let val = board[curR][curC];
  board[curR][curC] = 0;
  for (const step of steps) {
    board[step.over.r][step.over.c] = 0;
    if (step.promoted) val = makeVal(owner(val), true);
    curR = step.to.r; curC = step.to.c;
  }
  board[curR][curC] = val;
}
function applyNormalMoveToBoard(board, player, from, to) {
  let val = board[from.r][from.c];
  board[from.r][from.c] = 0;
  if (!isKingVal(val) && to.r === promotionRowFor(player)) val = makeVal(player, true);
  board[to.r][to.c] = val;
}
function countPieces(board, player) {
  let n = 0;
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (owner(board[r][c]) === player) n++;
  return n;
}

/* =========================================================
   AI
   ========================================================= */
const DIFFS = ['easy', 'medium', 'hard', 'expert'];
const AI_TIME_BUDGET = { easy: 120, medium: 300, hard: 650, expert: 1100 };
const AI_MAX_DEPTH = { easy: 3, medium: 6, hard: 9, expert: 12 };

function evaluateBoard(board, aiPlayer) {
  let score = 0;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const v = board[r][c];
      if (v === 0) continue;
      const p = owner(v);
      const king = isKingVal(v);
      let val = king ? 260 : 100;
      if (!king) {
        const advance = p === 1 ? (7 - r) : r;
        val += advance * 4;
      }
      if (c >= 2 && c <= 5) val += 4;
      score += (p === aiPlayer) ? val : -val;
    }
  }
  return score;
}

function generatePlyActions(board, player) {
  const actions = getLegalActions(board, player);
  if (actions.mandatory) {
    return actions.sequences.map(s => ({ capture: true, from: s.from, steps: s.steps }));
  }
  return actions.moves.map(m => ({ capture: false, from: m.from, to: m.to }));
}
function applyAction(board, player, action) {
  const nb = cloneBoard(board);
  if (action.capture) applySequenceToBoard(nb, action.from, action.steps);
  else applyNormalMoveToBoard(nb, player, action.from, action.to);
  return nb;
}

function minimax(board, depth, alpha, beta, player, aiPlayer, deadline) {
  const opponent = player === 1 ? 2 : 1;
  const actions = generatePlyActions(board, player);

  if (actions.length === 0) {
    return player === aiPlayer ? -100000 - depth : 100000 + depth;
  }
  if (depth === 0 || Date.now() > deadline) {
    return evaluateBoard(board, aiPlayer);
  }

  const maximizing = player === aiPlayer;
  let best = maximizing ? -Infinity : Infinity;
  for (const action of actions) {
    const nb = applyAction(board, player, action);
    const val = minimax(nb, depth - 1, alpha, beta, opponent, aiPlayer, deadline);
    if (maximizing) {
      if (val > best) best = val;
      alpha = Math.max(alpha, best);
    } else {
      if (val < best) best = val;
      beta = Math.min(beta, best);
    }
    if (beta <= alpha) break;
    if (Date.now() > deadline) break;
  }
  return best;
}

function chooseAIAction(board, aiPlayer, difficulty) {
  const actions = generatePlyActions(board, aiPlayer);
  if (actions.length === 0) return null;
  if (actions.length === 1) return actions[0];

  const budget = AI_TIME_BUDGET[difficulty] || 300;
  const maxDepth = AI_MAX_DEPTH[difficulty] || 4;
  const deadline = Date.now() + budget;
  const opponent = aiPlayer === 1 ? 2 : 1;

  let bestAction = actions[0];
  for (let depth = 1; depth <= maxDepth; depth++) {
    let localBest = null, localBestScore = -Infinity;
    let alpha = -Infinity, beta = Infinity;
    for (const action of actions) {
      const nb = applyAction(board, aiPlayer, action);
      const val = minimax(nb, depth - 1, alpha, beta, opponent, aiPlayer, deadline);
      if (val > localBestScore) { localBestScore = val; localBest = action; }
      alpha = Math.max(alpha, localBestScore);
      if (Date.now() > deadline) break;
    }
    if (localBest) bestAction = localBest;
    if (Date.now() > deadline) break;
  }
  return bestAction;
}

/* =========================================================
   GAME STATE
   ========================================================= */
const STATE = {
  board: null,
  currentPlayer: 1,
  nextStartingPlayer: 1, // حقل لتناوب البداية بين الجولات
  gameMode: 'pvp',
  difficulty: 'easy',
  selected: null,
  matchingSequences: [],
  progress: 0,
  seconds: 0,
  timerHandle: null,
  running: false,
  paused: false,
  gameOver: false,
  aiThinking: false,
  drawCountdownActive: false,
  drawPliesCount: 0
};
let setupModeIdx = 0; // 0 = PVP, 1 = AI
let setupDiffIdx = 0;

/* DOM refs */
const elScreenMenu = document.getElementById('screen-menu');
const elScreenGame = document.getElementById('screen-game');
const elBoard = document.getElementById('board');
const elDiffSection = document.getElementById('diffSection');
const elDiffValue = document.getElementById('diff-value');
const elIvoryCount = document.getElementById('ivoryCount');
const elRedCount = document.getElementById('redCount');
const elTimer = document.getElementById('timerDisplay');

const overlays = {
  help: document.getElementById('helpOverlay'),
  pause: document.getElementById('pauseOverlay'),
  result: document.getElementById('resultOverlay')
};
function showOverlay(name) { overlays[name].classList.remove('hidden'); }
function hideOverlay(name) { overlays[name].classList.add('hidden'); }
function hideAllOverlays() { Object.values(overlays).forEach(el => el.classList.add('hidden')); }

/* =========================================================
   BOARD BUILD
   ========================================================= */
const squareEls = [];
for (let r = 0; r < SIZE; r++) {
  for (let c = 0; c < SIZE; c++) {
    const sq = document.createElement('div');
    sq.className = 'square ' + (isDark(r, c) ? 'dark' : 'light');
    sq.dataset.row = r;
    sq.dataset.col = c;
    sq.addEventListener('click', () => onSquareClick(r, c));
    elBoard.appendChild(sq);
    squareEls.push(sq);
  }
}
function squareAt(r, c) { return squareEls[r * SIZE + c]; }

const CROWN_SVG = '<svg viewBox="0 0 24 24"><path d="M3 18h18l-1.6-8.4-3.9 3-2.5-5.2-2.5 5.2-3.9-3L3 18z" fill="currentColor"/><rect x="3" y="18.4" width="18" height="2.2" rx="1.1" fill="currentColor"/></svg>';

/* =========================================================
   RENDERING
   ========================================================= */
function clearSquareStates() {
  for (const sq of squareEls) sq.classList.remove('is-selected', 'is-legal', 'is-capture');
}

function renderBoard() {
  elBoard.querySelectorAll('.piece').forEach(el => el.remove());

  const mandatoryPieceKeys = new Set();
  if (!STATE.gameOver && !STATE.selected && STATE.running && !STATE.paused) {
    const actions = getLegalActions(STATE.board, STATE.currentPlayer);
    if (actions.mandatory) {
      for (const s of actions.sequences) {
        mandatoryPieceKeys.add(s.from.r + '_' + s.from.c);
      }
    }
  }

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const v = STATE.board[r][c];
      if (v === 0) continue;
      const piece = document.createElement('div');
      const p = owner(v);
      let pieceClass = 'piece ' + (p === 1 ? 'ivory' : 'red') + (isKingVal(v) ? ' is-king' : '');
      
      if (mandatoryPieceKeys.has(r + '_' + c)) {
        pieceClass += ' must-capture-glow';
      }

      piece.className = pieceClass;
      piece.style.left = (c * 12.5) + '%';
      piece.style.top = (r * 12.5) + '%';
      piece.style.width = '12.5%';
      piece.style.height = '12.5%';
      piece.dataset.row = r;
      piece.dataset.col = c;
      piece.innerHTML = `<div class="piece-body"><div class="piece-ring"></div><div class="crown">${CROWN_SVG}</div></div>`;
      piece.addEventListener('click', (e) => { e.stopPropagation(); onSquareClick(r, c); });
      elBoard.appendChild(piece);
    }
  }
  updateCounts();
  clearSquareStates();
  if (STATE.selected) squareAt(STATE.selected.r, STATE.selected.c).classList.add('is-selected');
  highlightTargets();
}

function updateCounts() {
  elIvoryCount.textContent = countPieces(STATE.board, 1);
  elRedCount.textContent = countPieces(STATE.board, 2);
  const live = STATE.running && !STATE.gameOver;
  document.getElementById('chipIvory').classList.toggle('is-turn', live && STATE.currentPlayer === 1);
  document.getElementById('chipRed').classList.toggle('is-turn', live && STATE.currentPlayer === 2);
}

function highlightTargets() {
  if (!STATE.selected) return;
  const mandatory = STATE.matchingSequences.length > 0;
  if (mandatory) {
    const targets = uniqueTargets(STATE.matchingSequences.map(s => s.steps[STATE.progress].to));
    for (const tpos of targets) squareAt(tpos.r, tpos.c).classList.add('is-legal', 'is-capture');
  } else if (STATE.normalMoveTargets) {
    for (const tpos of STATE.normalMoveTargets) squareAt(tpos.r, tpos.c).classList.add('is-legal');
  }
}
function uniqueTargets(list) {
  const seen = new Set(); const out = [];
  for (const p of list) { const k = p.r + '_' + p.c; if (!seen.has(k)) { seen.add(k); out.push(p); } }
  return out;
}

/* =========================================================
   TURN / INTERACTION
   ========================================================= */
function beginTurn() {
  STATE.selected = null;
  STATE.matchingSequences = [];
  STATE.progress = 0;
  STATE.normalMoveTargets = null;
  renderBoard();

  if (STATE.gameMode === 'ai' && STATE.currentPlayer === 2 && !STATE.gameOver) {
    STATE.aiThinking = true;
    setTimeout(runAIMove, 260);
  }
}

function onSquareClick(r, c) {
  if (!STATE.running || STATE.paused || STATE.gameOver || STATE.aiThinking) return;
  if (STATE.gameMode === 'ai' && STATE.currentPlayer === 2) return;

  const board = STATE.board;
  const clickedVal = board[r][c];
  const actions = getLegalActions(board, STATE.currentPlayer);

  // 1. إذا تم تحديد قطعة سابقاً
  if (STATE.selected) {
    if (STATE.matchingSequences.length > 0) {
      const step = STATE.progress;
      const matches = STATE.matchingSequences.filter(s => s.steps[step].to.r === r && s.steps[step].to.c === c);
      if (matches.length > 0) {
        applyOneCaptureStep(matches);
        return;
      }
    } else if (STATE.normalMoveTargets) {
      const hit = STATE.normalMoveTargets.find(p => p.r === r && p.c === c);
      if (hit) {
        finishNormalMove(STATE.selected, { r, c });
        return;
      }
    }

    if (STATE.progress === 0) {
      if (owner(clickedVal) === STATE.currentPlayer) {
        if (actions.mandatory) {
          const seqs = actions.sequences.filter(s => s.from.r === r && s.from.c === c);
          if (seqs.length > 0) {
            STATE.selected = { r, c };
            STATE.matchingSequences = seqs;
            STATE.progress = 0;
            playSound('click');
            renderBoard();
            return;
          }
        } else {
          const myMoves = actions.moves.filter(m => m.from.r === r && m.from.c === c);
          if (myMoves.length > 0) {
            STATE.selected = { r, c };
            STATE.normalMoveTargets = myMoves.map(m => m.to);
            playSound('click');
            renderBoard();
            return;
          }
        }
      }

      STATE.selected = null;
      STATE.matchingSequences = [];
      STATE.normalMoveTargets = null;
      renderBoard();
      return;
    }
    return;
  }

  // 2. التحديد لأول مرة
  if (actions.mandatory) {
    if (owner(clickedVal) === STATE.currentPlayer) {
      const seqs = actions.sequences.filter(s => s.from.r === r && s.from.c === c);
      if (seqs.length === 0) { return; }
      STATE.selected = { r, c };
      STATE.matchingSequences = seqs;
      STATE.progress = 0;
      playSound('click');
      renderBoard();
    }
    return;
  }

  if (owner(clickedVal) === STATE.currentPlayer) {
    const myMoves = actions.moves.filter(m => m.from.r === r && m.from.c === c);
    if (myMoves.length === 0) { playSound('click'); return; }
    STATE.selected = { r, c };
    STATE.normalMoveTargets = myMoves.map(m => m.to);
    playSound('click');
    renderBoard();
  }
}

function applyOneCaptureStep(matches) {
  const step = STATE.progress;
  const sample = matches[0].steps[step];
  const board = STATE.board;

  board[sample.over.r][sample.over.c] = 0;
  const movingVal = board[STATE.selected.r][STATE.selected.c];
  board[STATE.selected.r][STATE.selected.c] = 0;
  let newVal = movingVal;
  if (sample.promoted) newVal = makeVal(owner(movingVal), true);
  board[sample.to.r][sample.to.c] = newVal;

  playSound('capture');
  if (sample.promoted) setTimeout(() => playSound('crown'), 120);

  STATE.selected = { r: sample.to.r, c: sample.to.c };
  STATE.matchingSequences = matches;
  STATE.progress = step + 1;

  const stillGoing = STATE.matchingSequences.some(s => s.steps.length > STATE.progress) && !sample.promoted;
  if (stillGoing) {
    renderBoard();
  } else {
    completeTurn();
  }
}

function finishNormalMove(from, to) {
  applyNormalMoveToBoard(STATE.board, STATE.currentPlayer, from, to);
  playSound('move');
  if (STATE.board[to.r][to.c] === makeVal(STATE.currentPlayer, true) && to.r === promotionRowFor(STATE.currentPlayer)) {
    setTimeout(() => playSound('crown'), 120);
  }
  completeTurn();
}

/* =========================================================
   DRAW RULE CHECK (12 Moves limit)
   ========================================================= */
function checkEndgameDrawCondition() {
  const p1 = countPieces(STATE.board, 1);
  const p2 = countPieces(STATE.board, 2);
  
  return (
    (p1 === 1 && p2 === 3) || (p1 === 3 && p2 === 1) ||
    (p1 === 2 && p2 === 3) || (p1 === 3 && p2 === 2) ||
    (p1 === 2 && p2 === 2) ||
    (p1 === 2 && p2 === 1) || (p1 === 1 && p2 === 2) ||
    (p1 === 1 && p2 === 1)
  );
}

function completeTurn() {
  STATE.selected = null;
  STATE.matchingSequences = [];
  STATE.normalMoveTargets = null;

  updateCounts();

  if (!STATE.drawCountdownActive && checkEndgameDrawCondition()) {
    STATE.drawCountdownActive = true;
    STATE.drawPliesCount = 0;
  }

  if (STATE.drawCountdownActive) {
    STATE.drawPliesCount++;
    if (STATE.drawPliesCount >= 24) {
      renderBoard();
      setTimeout(() => endGame(0), 350);
      return;
    }
  }

  const nextPlayer = STATE.currentPlayer === 1 ? 2 : 1;
  const nextActions = getLegalActions(STATE.board, nextPlayer);
  const nextHasPieces = countPieces(STATE.board, nextPlayer) > 0;
  const nextCanMove = nextHasPieces && (nextActions.mandatory ? nextActions.sequences.length > 0 : nextActions.moves.length > 0);

  if (!nextCanMove) {
    renderBoard();
    setTimeout(() => endGame(STATE.currentPlayer), 350);
    return;
  }

  STATE.currentPlayer = nextPlayer;
  beginTurn();
}

/* =========================================================
   AI TURN
   ========================================================= */
function runAIMove() {
  if (STATE.gameOver || STATE.paused) { STATE.aiThinking = false; return; }
  const action = chooseAIAction(STATE.board, 2, STATE.difficulty);
  STATE.aiThinking = false;
  if (!action) { completeTurn(); return; }

  if (action.capture) {
    animateAISequence(action.from, action.steps, 0);
  } else {
    applyNormalMoveToBoard(STATE.board, 2, action.from, action.to);
    playSound('move');
    renderBoard();
    setTimeout(completeTurn, 200);
  }
}
function animateAISequence(from, steps, idx) {
  const board = STATE.board;
  const step = steps[idx];
  board[step.over.r][step.over.c] = 0;
  const curFrom = idx === 0 ? from : steps[idx - 1].to;
  const movingVal = board[curFrom.r][curFrom.c];
  board[curFrom.r][curFrom.c] = 0;
  let newVal = movingVal;
  if (step.promoted) newVal = makeVal(owner(movingVal), true);
  board[step.to.r][step.to.c] = newVal;

  playSound('capture');
  if (step.promoted) setTimeout(() => playSound('crown'), 120);
  renderBoard();

  if (idx + 1 < steps.length && !step.promoted) {
    setTimeout(() => animateAISequence(from, steps, idx + 1), 260);
  } else {
    setTimeout(completeTurn, 220);
  }
}

/* =========================================================
   TIMER
   ========================================================= */
function startTimer() {
  stopTimer();
  STATE.timerHandle = setInterval(() => {
    STATE.seconds++;
    elTimer.textContent = formatTime(STATE.seconds);
  }, 1000);
}
function stopTimer() { if (STATE.timerHandle) clearInterval(STATE.timerHandle); STATE.timerHandle = null; }
function formatTime(total) {
  const m = String(Math.floor(total / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${m}:${s}`;
}

/* =========================================================
   GAME FLOW
   ========================================================= */
function showGameScreen() { elScreenMenu.classList.add('hidden'); elScreenGame.classList.remove('hidden'); scheduleBoardSizeUpdate(); }
function showMenuScreen() { stopTimer(); elScreenGame.classList.add('hidden'); elScreenMenu.classList.remove('hidden'); }

function startNewGame(mode, difficulty) {
  STATE.board = createInitialBoard();
  
  // تناول دور البداية مع كل مباراة جديدة
  STATE.currentPlayer = STATE.nextStartingPlayer;
  STATE.nextStartingPlayer = STATE.nextStartingPlayer === 1 ? 2 : 1;

  STATE.gameMode = mode;
  STATE.difficulty = difficulty;
  STATE.seconds = 0;
  STATE.running = true;
  STATE.paused = false;
  STATE.gameOver = false;
  STATE.aiThinking = false;
  STATE.drawCountdownActive = false;
  STATE.drawPliesCount = 0;

  elTimer.textContent = '00:00';
  hideAllOverlays();
  showGameScreen();
  beginTurn();
  startTimer();
}

function endGame(winner) {
  STATE.gameOver = true;
  STATE.running = false;
  stopTimer();

  const banner = document.getElementById('resultBanner');
  let title, cls = '';
  
  if (winner === 0) {
    title = t('result.draw');
    cls = 'lose';
    playSound('lose');
  } else if (STATE.gameMode === 'ai') {
    if (winner === 1) { title = t('result.youWin'); playSound('win'); triggerConfetti(); }
    else { title = t('result.youLose'); cls = 'lose'; playSound('lose'); }
  } else {
    title = winner === 1 ? t('result.p1Wins') : t('result.p2Wins');
    playSound('win');
    triggerConfetti();
  }
  
  banner.textContent = title;
  banner.className = 'banner' + (cls ? ' ' + cls : '');
  document.getElementById('resDifficulty').textContent = STATE.gameMode === 'ai' ? t('diff.' + STATE.difficulty) : '\u2014';
  document.getElementById('resTime').textContent = formatTime(STATE.seconds);
  showOverlay('result');
}

function triggerConfetti() {
  const container = document.getElementById('confetti-container');
  const colors = ['#6C5CE7', '#17B6CE', '#FF5E72', '#FFA93E', '#1FC79B', '#F154B3'];
  for (let i = 0; i < 60; i++) {
    const conf = document.createElement('div');
    conf.className = 'confetti';
    conf.style.left = Math.random() * 100 + 'vw';
    conf.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    conf.style.animationDuration = (Math.random() * 2 + 2) + 's';
    conf.style.animationDelay = Math.random() * 0.5 + 's';
    container.appendChild(conf);
  }
  setTimeout(() => { container.innerHTML = ''; }, 4500);
}

/* =========================================================
   SETUP UI
   ========================================================= */
function updateSetupUI() {
  elDiffValue.textContent = t('diff.' + DIFFS[setupDiffIdx]);
  elDiffSection.style.display = setupModeIdx === 1 ? '' : 'none';
}
document.querySelectorAll('.optbtn.mode').forEach((btn) => {
  btn.addEventListener('click', () => {
    playSound('click');
    document.querySelectorAll('.optbtn.mode').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    setupModeIdx = btn.dataset.mode === 'pvp' ? 0 : 1;
    updateSetupUI();
  });
});
document.getElementById('diff-prev').addEventListener('click', () => { setupDiffIdx = (setupDiffIdx + 3) % 4; updateSetupUI(); playSound('click'); });
document.getElementById('diff-next').addEventListener('click', () => { setupDiffIdx = (setupDiffIdx + 1) % 4; updateSetupUI(); playSound('click'); });

document.getElementById('btn-play').addEventListener('click', () => {
  playSound('click');
  const mode = setupModeIdx === 0 ? 'pvp' : 'ai';
  startNewGame(mode, DIFFS[setupDiffIdx]);
});
document.getElementById('btn-home').addEventListener('click', () => {
  playSound('click');
  GC.goHome();
});
document.getElementById('btn-exit').addEventListener('click', () => {
  playSound('click');
  GC.goHome();
});
document.getElementById('btn-help').addEventListener('click', () => { playSound('click'); showOverlay('help'); });
document.getElementById('helpCloseBtn').addEventListener('click', () => { playSound('click'); hideOverlay('help'); });

/* Pause */
document.getElementById('btn-pause').addEventListener('click', () => {
  if (!STATE.running || STATE.paused || STATE.gameOver) return;
  playSound('pause');
  STATE.paused = true;
  stopTimer();
  showOverlay('pause');
});
document.getElementById('resumeBtn').addEventListener('click', () => {
  playSound('resume');
  STATE.paused = false;
  hideOverlay('pause');
  startTimer();
  if (STATE.gameMode === 'ai' && STATE.currentPlayer === 2 && !STATE.aiThinking) {
    STATE.aiThinking = true;
    setTimeout(runAIMove, 200);
  }
});
document.getElementById('pauseRestartBtn').addEventListener('click', () => {
  playSound('click');
  startNewGame(STATE.gameMode, STATE.difficulty);
});
document.getElementById('pauseMenuBtn').addEventListener('click', () => {
  playSound('click');
  STATE.running = false;
  hideAllOverlays();
  showMenuScreen();
});

/* Result */
document.getElementById('playAgainBtn').addEventListener('click', () => {
  playSound('click');
  startNewGame(STATE.gameMode, STATE.difficulty);
});
document.getElementById('resultNewGameBtn').addEventListener('click', () => {
  playSound('click');
  hideAllOverlays();
  showMenuScreen();
});
document.getElementById('resultHomeBtn').addEventListener('click', () => {
  playSound('click');
  hideAllOverlays();
  showMenuScreen();
});

/* =========================================================
   RESPONSIVE BOARD SIZING
   The board must stay a perfect square and use the actual space
   available on screen — never just viewport width, since a device
   can be tall (portrait) or wide/short (landscape tablets, laptops).
   We measure the real box (.board-wrap) with ResizeObserver /
   resize / orientationchange / visualViewport, and set the result
   as a CSS variable (--board-size) that the CSS reads. No fixed,
   device-specific numbers are used anywhere.
   ========================================================= */
const BOARD_MAX_PX = 620; // sensible ceiling so the board doesn't balloon on huge desktop monitors
const BOARD_MIN_PX = 200; // sensible floor so the board stays usable on very small/short screens

function updateBoardSize() {
  const wrap = document.querySelector('.board-wrap');
  if (!wrap || !elScreenGame || elScreenGame.classList.contains('hidden')) return;
  const w = wrap.clientWidth;
  const h = wrap.clientHeight;
  if (!w || !h) return;
  const size = Math.max(BOARD_MIN_PX, Math.min(w, h, BOARD_MAX_PX));
  document.documentElement.style.setProperty('--board-size', size + 'px');
}

let boardSizeRAF = null;
function scheduleBoardSizeUpdate() {
  if (boardSizeRAF) cancelAnimationFrame(boardSizeRAF);
  boardSizeRAF = requestAnimationFrame(updateBoardSize);
}

window.addEventListener('resize', scheduleBoardSizeUpdate);
window.addEventListener('orientationchange', scheduleBoardSizeUpdate);
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', scheduleBoardSizeUpdate);
}
if (window.ResizeObserver) {
  const boardWrapEl = document.querySelector('.board-wrap');
  if (boardWrapEl) new ResizeObserver(scheduleBoardSizeUpdate).observe(boardWrapEl);
}

/* ===== INIT ===== */
applyTranslations();
scheduleBoardSizeUpdate();
updateSetupUI();