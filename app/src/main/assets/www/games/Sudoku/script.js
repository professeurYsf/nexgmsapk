'use strict';

/* =========================================================
   SUDOKU
   Linked to the Game Collection home screen via localStorage:
   - "gc_lang"  -> "en" | "fr"
   - "gc_sound" -> "on" | "off"
   ========================================================= */

/* ---- i18n ------------------------------------------------ */
const STRINGS = {
  en: {
    'game.title': 'Sudoku',
    'menu.subtitle': 'Fill the grid using logic alone',
    'menu.play': 'Play',
    'menu.help': 'How To Play',
    'menu.exit': 'Exit',
    'setup.title': 'New Game',
    'setup.difficulty': 'Select difficulty',
    'setup.play': 'Play',
    'diff.easy': 'Easy',
    'diff.medium': 'Medium',
    'diff.hard': 'Hard',
    'diff.expert': 'Expert',
    'help.title': 'How To Play',
    'help.li1': 'Fill every row, column, and 3\u00d73 box with the numbers 1 to 9.',
    'help.li2': 'No number can repeat inside the same row, column, or box.',
    'help.li3': 'Tap a cell, then tap a number to place it. Use Pencil to jot down candidates.',
    'help.li4': 'Three mistakes end the game \u2014 think before you tap.',
    'help.close': 'Got it',
    'pause.title': 'Game Paused',
    'pause.resume': 'Resume',
    'pause.restart': 'Restart',
    'pause.menu': 'Back to Home',
    'exit.title': 'Exit Game',
    'exit.message': 'Are you sure you want to exit?',
    'exit.no': 'No',
    'exit.yes': 'Yes',
    'over.title': 'Game Over',
    'over.body': "You've made 3 mistakes.",
    'over.restart': 'Restart',
    'tool.erase': 'Erase',
    'tool.hint': 'Hint',
    'tool.pencil': 'Pencil',
    'win.title': 'Congratulations!',
    'win.difficulty': 'Difficulty',
    'win.time': 'Time',
    'win.mistakes': 'Mistakes',
    'win.playAgain': 'Play Again',
    'resume.title': 'Continue previous game?',
    'resume.body': 'You have an unfinished puzzle saved on this device.',
    'resume.newGame': 'New Game',
    'resume.continue': 'Continue'
  },
  fr: {
    'game.title': 'Sudoku',
    'menu.subtitle': 'Remplissez la grille avec la seule logique',
    'menu.play': 'Commencer',
    'menu.help': 'Comment jouer',
    'menu.exit': 'Quitter',
    'setup.title': 'Nouvelle partie',
    'setup.difficulty': 'Choisir la difficulté',
    'setup.play': 'Commencer',
    'diff.easy': 'Facile',
    'diff.medium': 'Moyen',
    'diff.hard': 'Difficile',
    'diff.expert': 'Expert',
    'help.title': 'Comment jouer',
    'help.li1': 'Remplissez chaque ligne, colonne et bloc 3\u00d73 avec les chiffres de 1 à 9.',
    'help.li2': 'Aucun chiffre ne peut se répéter dans la même ligne, colonne ou bloc.',
    'help.li3': "Touchez une case puis un chiffre pour le placer. Utilisez le crayon pour noter des candidats.",
    'help.li4': "Trois erreurs terminent la partie \u2014 réfléchissez avant de toucher.",
    'help.close': 'Compris',
    'pause.title': 'Jeu en pause',
    'pause.resume': 'Continuer',
    'pause.restart': 'Recommencer',
    'pause.menu': "Retour à l'accueil",
    'exit.title': 'Quitter le jeu',
    'exit.message': 'Voulez-vous vraiment quitter ?',
    'exit.no': 'Non',
    'exit.yes': 'Oui',
    'over.title': 'Partie terminée',
    'over.body': 'Vous avez fait 3 erreurs.',
    'over.restart': 'Recommencer',
    'tool.erase': 'Effacer',
    'tool.hint': 'Indice',
    'tool.pencil': 'Crayon',
    'win.title': 'Félicitations !',
    'win.difficulty': 'Difficulté',
    'win.time': 'Temps',
    'win.mistakes': 'Erreurs',
    'win.playAgain': 'Rejouer',
    'resume.title': 'Continuer la partie précédente ?',
    'resume.body': 'Une grille inachevée est enregistrée sur cet appareil.',
    'resume.newGame': 'Nouvelle partie',
    'resume.continue': 'Continuer'
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
    case 'select':  playTone(520, 0.05, 'sine', 0.10, 0); break;
    case 'place':   playTone(600, 0.07, 'sine', 0.13, 0); break;
    case 'correct': playTone(720, 0.09, 'triangle', 0.14, 0); break;
    case 'wrong':   [340, 220].forEach((f, i) => playTone(f, 0.16, 'sawtooth', 0.13, i * 0.09)); break;
    case 'hint':    [500, 760].forEach((f, i) => playTone(f, 0.14, 'triangle', 0.13, i * 0.09)); break;
    case 'erase':   playTone(300, 0.06, 'square', 0.08, 0); break;
    case 'pause':   playTone(420, 0.1, 'sine', 0.12, 0); break;
    case 'resume':  playTone(560, 0.1, 'sine', 0.12, 0); break;
    case 'win':     [523, 659, 784, 1046].forEach((f, i) => playTone(f, 0.22, 'triangle', 0.16, i * 0.09)); break;
    case 'over':    [400, 320, 260].forEach((f, i) => playTone(f, 0.28, 'sawtooth', 0.10, i * 0.12)); break;
  }
}

/* =========================================================
   SUDOKU ENGINE — generator + uniqueness-checked solver
   ========================================================= */
function boxOf(r, c) { return (Math.floor(r / 3) * 3) + Math.floor(c / 3); }
function popcount(x) { let n = 0; while (x) { x &= x - 1; n++; } return n; }
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generateFullSolution() {
  const grid = new Array(81).fill(0);
  const rowMask = new Array(9).fill(0), colMask = new Array(9).fill(0), boxMask = new Array(9).fill(0);

  function fill() {
    let bestIdx = -1, bestMask = 0, bestCount = 10;
    for (let i = 0; i < 81; i++) {
      if (grid[i] !== 0) continue;
      const r = (i / 9) | 0, c = i % 9, b = boxOf(r, c);
      const mask = ~(rowMask[r] | colMask[c] | boxMask[b]) & 0x1FF;
      const cnt = popcount(mask);
      if (cnt === 0) return false;
      if (cnt < bestCount) { bestCount = cnt; bestMask = mask; bestIdx = i; if (cnt === 1) break; }
    }
    if (bestIdx === -1) return true;
    const r = (bestIdx / 9) | 0, c = bestIdx % 9, b = boxOf(r, c);
    const candidates = [];
    for (let v = 1; v <= 9; v++) if (bestMask & (1 << (v - 1))) candidates.push(v);
    shuffle(candidates);
    for (const v of candidates) {
      const bit = 1 << (v - 1);
      grid[bestIdx] = v;
      rowMask[r] |= bit; colMask[c] |= bit; boxMask[b] |= bit;
      if (fill()) return true;
      rowMask[r] ^= bit; colMask[c] ^= bit; boxMask[b] ^= bit;
      grid[bestIdx] = 0;
    }
    return false;
  }
  fill();
  return grid;
}

function countSolutions(initialGrid, limit) {
  const grid = initialGrid.slice();
  const rowMask = new Array(9).fill(0), colMask = new Array(9).fill(0), boxMask = new Array(9).fill(0);
  for (let i = 0; i < 81; i++) {
    const v = grid[i];
    if (v) {
      const r = (i / 9) | 0, c = i % 9, b = boxOf(r, c);
      const bit = 1 << (v - 1);
      rowMask[r] |= bit; colMask[c] |= bit; boxMask[b] |= bit;
    }
  }
  let count = 0;
  function backtrack() {
    if (count >= limit) return;
    let bestIdx = -1, bestMask = 0, bestCount = 10;
    for (let i = 0; i < 81; i++) {
      if (grid[i] !== 0) continue;
      const r = (i / 9) | 0, c = i % 9, b = boxOf(r, c);
      const mask = ~(rowMask[r] | colMask[c] | boxMask[b]) & 0x1FF;
      const cnt = popcount(mask);
      if (cnt === 0) return;
      if (cnt < bestCount) { bestCount = cnt; bestMask = mask; bestIdx = i; if (cnt === 1) break; }
    }
    if (bestIdx === -1) { count++; return; }
    const r = (bestIdx / 9) | 0, c = bestIdx % 9, b = boxOf(r, c);
    let m = bestMask;
    while (m) {
      const bit = m & (-m);
      const v = Math.round(Math.log2(bit)) + 1;
      grid[bestIdx] = v;
      rowMask[r] |= bit; colMask[c] |= bit; boxMask[b] |= bit;
      backtrack();
      rowMask[r] ^= bit; colMask[c] ^= bit; boxMask[b] ^= bit;
      grid[bestIdx] = 0;
      if (count >= limit) return;
      m ^= bit;
    }
  }
  backtrack();
  return count;
}

const DIFFICULTY_CLUES = { easy: 40, medium: 34, hard: 28, expert: 22 };

function generatePuzzle(difficulty) {
  const solution = generateFullSolution();
  const puzzle = solution.slice();
  const order = shuffle([...Array(81).keys()]);
  const targetClues = DIFFICULTY_CLUES[difficulty] || 36;
  let clueCount = 81;

  for (const idx of order) {
    if (clueCount <= targetClues) break;
    const backup = puzzle[idx];
    puzzle[idx] = 0;
    const solCount = countSolutions(puzzle, 2);
    if (solCount === 1) {
      clueCount--;
    } else {
      puzzle[idx] = backup;
    }
  }
  return { puzzle, solution };
}

/* =========================================================
   STATE
   ========================================================= */
const DIFFS = ['easy', 'medium', 'hard', 'expert'];
let setupDiffIdx = 0;

const STATE = {
  given: new Array(81).fill(false),
  values: new Array(81).fill(0),
  notes: new Array(81).fill(0),   // bitmask, bit (v-1) = candidate v noted
  solution: new Array(81).fill(0),
  difficulty: 'easy',
  selected: -1,
  pencilMode: false,
  mistakes: 0,
  seconds: 0,
  timerHandle: null,
  autoCheck: true,
  hintsLeft: 1,
  running: false,
  paused: false,
  gameOver: false,
  won: false
};
const MAX_MISTAKES = 3;
const MAX_HINTS = 1;
const SAVE_KEY = 'sudokuSave';

/* =========================================================
   DOM REFS
   ========================================================= */
const elScreenMenu = document.getElementById('screen-menu');
const elScreenGame = document.getElementById('screen-game');
const elBoard = document.getElementById('board');
const elNumberPad = document.getElementById('number-pad');
const elTimer = document.getElementById('timerDisplay');
const elMistakes = document.getElementById('mistakesDisplay');
const elMistakesChip = document.querySelector('.mistakes-chip');
const elHintBadge = document.getElementById('hintBadge');
const elBtnPencil = document.getElementById('btn-pencil');
const elBtnHint = document.getElementById('btn-hint');
const elDiffValue = document.getElementById('diff-value');
const elSetupPlayLabel = document.getElementById('setup-play-label');

const overlays = {
  resume: document.getElementById('resume-modal'),
  help: document.getElementById('help-modal'),
  pause: document.getElementById('pause-modal'),
  exit: document.getElementById('exit-modal'),
  gameover: document.getElementById('gameover-modal'),
  win: document.getElementById('win-modal')
};

/* =========================================================
   BOARD BUILD (once)
   ========================================================= */
const cellEls = [];
for (let i = 0; i < 81; i++) {
  const r = (i / 9) | 0, c = i % 9;
  const cell = document.createElement('div');
  cell.className = 'cell';
  cell.dataset.index = i;
  cell.dataset.row = r;
  cell.dataset.col = c;
  cell.innerHTML = '<span class="cell-value"></span><div class="notes-grid"></div>';
  cell.addEventListener('click', () => selectCell(i));
  elBoard.appendChild(cell);
  cellEls.push(cell);
}
const notesGridEls = cellEls.map(el => el.querySelector('.notes-grid'));
for (const ng of notesGridEls) {
  for (let v = 1; v <= 9; v++) {
    const span = document.createElement('span');
    span.dataset.v = v;
    ng.appendChild(span);
  }
}

/* Number pad build (once) */
const numBtns = [];
for (let v = 1; v <= 9; v++) {
  const btn = document.createElement('button');
  btn.className = 'num-btn';
  btn.dataset.value = v;
  btn.innerHTML = `<span class="num-value">${v}</span><span class="num-remain">9</span>`;
  btn.addEventListener('click', () => onNumberPad(v));
  elNumberPad.appendChild(btn);
  numBtns.push(btn);
}

/* =========================================================
   RENDERING
   ========================================================= */
function peersOf(idx) {
  const r = (idx / 9) | 0, c = idx % 9, b = boxOf(r, c);
  const list = [];
  for (let i = 0; i < 81; i++) {
    const ir = (i / 9) | 0, ic = i % 9;
    if (ir === r || ic === c || boxOf(ir, ic) === b) list.push(i);
  }
  return list;
}

function renderAll() {
  for (let i = 0; i < 81; i++) renderCell(i);
  updateNumberPad();
}

function renderCell(i) {
  const el = cellEls[i];
  const val = STATE.values[i];
  const valueSpan = el.querySelector('.cell-value');

  el.classList.remove('given', 'player', 'error', 'peer', 'selected', 'same-number');

  if (STATE.given[i]) el.classList.add('given');
  else if (val !== 0) el.classList.add('player');

  if (val !== 0) {
    valueSpan.textContent = val;
    if (STATE.autoCheck && !STATE.given[i] && val !== STATE.solution[i]) {
      el.classList.add('error');
    }
    notesGridEls[i].style.display = 'none';
  } else {
    valueSpan.textContent = '';
    notesGridEls[i].style.display = '';
    const mask = STATE.notes[i];
    const spans = notesGridEls[i].children;
    for (let v = 1; v <= 9; v++) {
      spans[v - 1].textContent = (mask & (1 << (v - 1))) ? v : '';
    }
  }

  if (STATE.selected === i) el.classList.add('selected');
  else if (STATE.selected !== -1) {
    const r = (i / 9) | 0, c = i % 9;
    const sr = (STATE.selected / 9) | 0, sc = STATE.selected % 9;
    if (r === sr || c === sc || boxOf(r, c) === boxOf(sr, sc)) el.classList.add('peer');
  }

  if (STATE.selected !== -1) {
    const selVal = STATE.values[STATE.selected];
    if (selVal !== 0 && val === selVal) el.classList.add('same-number');
  }
}

function updateNumberPad() {
  for (let v = 1; v <= 9; v++) {
    const placed = STATE.values.filter(x => x === v).length;
    const remain = Math.max(0, 9 - placed);
    const btn = numBtns[v - 1];
    btn.querySelector('.num-remain').textContent = remain;
    btn.disabled = remain === 0;
  }
}

function selectCell(i) {
  if (!STATE.running || STATE.paused || STATE.gameOver) return;
  STATE.selected = i;
  playSound('select');
  renderAll();
}

/* =========================================================
   GAMEPLAY
   ========================================================= */
function clearNotesInPeers(idx, value) {
  const bit = ~(1 << (value - 1));
  for (const p of peersOf(idx)) STATE.notes[p] &= bit;
}

function onNumberPad(v) {
  if (!STATE.running || STATE.paused || STATE.gameOver) return;
  const idx = STATE.selected;
  if (idx === -1 || STATE.given[idx]) return;

  if (STATE.pencilMode) {
    if (STATE.values[idx] !== 0) return;
    if (isCandidateBlocked(idx, v)) { playSound('erase'); return; }
    STATE.notes[idx] ^= (1 << (v - 1));
    playSound('click');
    renderCell(idx);
    saveGame();
    return;
  }

  STATE.values[idx] = v;
  STATE.notes[idx] = 0;
  clearNotesInPeers(idx, v);

  const correct = v === STATE.solution[idx];
  if (STATE.autoCheck) {
    if (correct) playSound('correct'); else { playSound('wrong'); registerMistake(); }
  } else {
    playSound('place');
  }

  cellEls[idx].classList.add('place-pop');
  setTimeout(() => cellEls[idx].classList.remove('place-pop'), 250);

  renderAll();
  saveGame();

  if (isBoardFull()) checkCompletion();
}

function isCandidateBlocked(idx, v) {
  for (const p of peersOf(idx)) {
    if (p !== idx && STATE.values[p] === v) return true;
  }
  return false;
}

function registerMistake() {
  STATE.mistakes++;
  elMistakes.textContent = `${STATE.mistakes}/${MAX_MISTAKES}`;
  elMistakesChip.classList.toggle('is-danger', STATE.mistakes > 0);
  const idx = STATE.selected;
  if (idx !== -1) {
    cellEls[idx].classList.add('error-flash');
    setTimeout(() => cellEls[idx].classList.remove('error-flash'), 350);
  }
  if (STATE.mistakes >= MAX_MISTAKES) {
    setTimeout(showGameOver, 300);
  }
}

function eraseCell() {
  if (!STATE.running || STATE.paused || STATE.gameOver) return;
  const idx = STATE.selected;
  if (idx === -1 || STATE.given[idx]) return;
  if (STATE.values[idx] === 0 && STATE.notes[idx] === 0) return;
  STATE.values[idx] = 0;
  STATE.notes[idx] = 0;
  playSound('erase');
  renderAll();
  saveGame();
}

function hintUI() {
  elHintBadge.textContent = STATE.hintsLeft > 0 ? STATE.hintsLeft : 'AD';
  elBtnHint.disabled = false;
}
function useHint() {
  if (!STATE.running || STATE.paused || STATE.gameOver) return;
  if (STATE.hintsLeft <= 0) {
    GC.ads.reward('hint', function () { STATE.hintsLeft = 1; hintUI(); useHint(); });
    return;
  }
  let idx = STATE.selected;
  if (idx === -1 || STATE.values[idx] !== 0) {
    const empties = [];
    for (let i = 0; i < 81; i++) if (STATE.values[i] === 0) empties.push(i);
    if (empties.length === 0) return;
    idx = empties[Math.floor(Math.random() * empties.length)];
    STATE.selected = idx;
  }
  STATE.values[idx] = STATE.solution[idx];
  STATE.notes[idx] = 0;
  clearNotesInPeers(idx, STATE.solution[idx]);
  STATE.hintsLeft--;
  hintUI();
  playSound('hint');
  cellEls[idx].classList.add('hint-glow');
  setTimeout(() => cellEls[idx].classList.remove('hint-glow'), 1000);
  renderAll();
  saveGame();
  if (isBoardFull()) checkCompletion();
}

function togglePencil() {
  STATE.pencilMode = !STATE.pencilMode;
  elBtnPencil.classList.toggle('is-active', STATE.pencilMode);
  playSound('click');
}

function isBoardFull() {
  return STATE.values.every(v => v !== 0);
}
function checkCompletion() {
  const allCorrect = STATE.values.every((v, i) => v === STATE.solution[i]);
  if (allCorrect) {
    showWin();
  } else if (!STATE.autoCheck) {
    for (let i = 0; i < 81; i++) {
      if (STATE.values[i] !== STATE.solution[i]) {
        cellEls[i].classList.add('error-flash');
        setTimeout(() => cellEls[i].classList.remove('error-flash'), 350);
      }
    }
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
    saveGame();
  }, 1000);
}
function stopTimer() {
  if (STATE.timerHandle) clearInterval(STATE.timerHandle);
  STATE.timerHandle = null;
}
function formatTime(total) {
  const m = String(Math.floor(total / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${m}:${s}`;
}

/* =========================================================
   SAVE / LOAD
   ========================================================= */
function saveGame() {
  if (!STATE.running || STATE.gameOver || STATE.won) return;
  const data = {
    given: STATE.given, values: STATE.values, notes: STATE.notes, solution: STATE.solution,
    difficulty: STATE.difficulty, mistakes: STATE.mistakes, seconds: STATE.seconds,
    hintsLeft: STATE.hintsLeft, pencilMode: STATE.pencilMode
  };
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (e) { /* storage unavailable */ }
}
function loadSavedGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}
function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
}

function restoreFromSave(data) {
  STATE.given = data.given;
  STATE.values = data.values;
  STATE.notes = data.notes;
  STATE.solution = data.solution;
  STATE.difficulty = data.difficulty;
  STATE.mistakes = data.mistakes;
  STATE.seconds = data.seconds;
  STATE.hintsLeft = data.hintsLeft;
  STATE.pencilMode = data.pencilMode;
  STATE.selected = -1;
  STATE.gameOver = false;
  STATE.won = false;
  STATE.paused = false;
  STATE.running = true;

  elMistakes.textContent = `${STATE.mistakes}/${MAX_MISTAKES}`;
  elMistakesChip.classList.toggle('is-danger', STATE.mistakes > 0);
  elTimer.textContent = formatTime(STATE.seconds);
  hintUI();
  elBtnPencil.classList.toggle('is-active', STATE.pencilMode);

  showGameScreen();
  renderAll();
  startTimer();
}

/* =========================================================
   GAME FLOW
   ========================================================= */
function showGameScreen() {
  elScreenMenu.classList.add('hidden');
  elScreenGame.classList.remove('hidden');
}
function showMenuScreen() {
  stopTimer();
  elScreenGame.classList.add('hidden');
  elScreenMenu.classList.remove('hidden');
}

function beginNewPuzzle(difficulty) {
  playSound('click');
  elSetupPlayLabel.textContent = '...';
  document.getElementById('btn-play').disabled = true;
  setTimeout(() => {
    const { puzzle, solution } = generatePuzzle(difficulty);
    STATE.given = puzzle.map(v => v !== 0);
    STATE.values = puzzle.slice();
    STATE.notes = new Array(81).fill(0);
    STATE.solution = solution;
    STATE.difficulty = difficulty;
    STATE.selected = -1;
    STATE.pencilMode = false;
    STATE.mistakes = 0;
    STATE.seconds = 0;
    STATE.hintsLeft = MAX_HINTS;
    STATE.gameOver = false;
    STATE.won = false;
    STATE.paused = false;
    STATE.running = true;

    elMistakes.textContent = `0/${MAX_MISTAKES}`;
    elMistakesChip.classList.remove('is-danger');
    elTimer.textContent = '00:00';
    hintUI();
    elBtnPencil.classList.remove('is-active');

    showGameScreen();
    renderAll();
    startTimer();
    saveGame();

    elSetupPlayLabel.textContent = t('menu.play');
    document.getElementById('btn-play').disabled = false;
  }, 30);
}

function restartSamePuzzle() {
  for (let i = 0; i < 81; i++) if (!STATE.given[i]) STATE.values[i] = 0;
  STATE.notes = new Array(81).fill(0);
  STATE.selected = -1;
  STATE.mistakes = 0;
  STATE.seconds = 0;
  STATE.hintsLeft = MAX_HINTS;
  STATE.gameOver = false;
  STATE.won = false;
  STATE.paused = false;
  STATE.running = true;

  elMistakes.textContent = `0/${MAX_MISTAKES}`;
  elMistakesChip.classList.remove('is-danger');
  elTimer.textContent = '00:00';
  hintUI();

  hideAllOverlays();
  showGameScreen();
  renderAll();
  startTimer();
  saveGame();
}

function hideOverlay(name) { overlays[name].classList.add('hidden'); }
function showOverlay(name) { overlays[name].classList.remove('hidden'); }
function hideAllOverlays() { Object.values(overlays).forEach(el => el.classList.add('hidden')); }

function showWin() {
  STATE.won = true;
  STATE.running = false;
  stopTimer();
  clearSave();
  playSound('win');
  document.getElementById('winDifficulty').textContent = t('diff.' + STATE.difficulty);
  document.getElementById('winTime').textContent = formatTime(STATE.seconds);
  document.getElementById('winMistakes').textContent = STATE.mistakes;
  showOverlay('win');
  triggerConfetti();
}

function showGameOver() {
  if (STATE.gameOver) return;
  STATE.gameOver = true;
  stopTimer();
  clearSave();
  playSound('over');
  showOverlay('gameover');
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
   SETUP STEPPER (difficulty)
   ========================================================= */
function updateSetupUI() {
  elDiffValue.textContent = t('diff.' + DIFFS[setupDiffIdx]);
}
function stepDiff(dir) {
  setupDiffIdx = (setupDiffIdx + dir + DIFFS.length) % DIFFS.length;
  updateSetupUI();
  playSound('click');
}

/* =========================================================
   EVENT WIRING
   ========================================================= */
document.getElementById('btn-play').addEventListener('click', () => beginNewPuzzle(DIFFS[setupDiffIdx]));
document.getElementById('btn-help').addEventListener('click', () => { playSound('click'); showOverlay('help'); });
document.getElementById('btn-help-close').addEventListener('click', () => { playSound('click'); hideOverlay('help'); });

document.getElementById('diff-prev').addEventListener('click', () => stepDiff(-1));
document.getElementById('diff-next').addEventListener('click', () => stepDiff(1));

document.getElementById('btn-exit').addEventListener('click', () => { playSound('click'); showOverlay('exit'); });
document.getElementById('btn-exit-no').addEventListener('click', () => { playSound('click'); hideOverlay('exit'); });
document.getElementById('btn-exit-yes').addEventListener('click', () => {
  playSound('click');
  GC.goHome();
});

document.getElementById('btn-home').addEventListener('click', () => {
  playSound('click');
  GC.goHome();
});

document.getElementById('btn-pause').addEventListener('click', () => {
  if (!STATE.running || STATE.paused || STATE.gameOver) return;
  playSound('pause');
  STATE.paused = true;
  stopTimer();
  showOverlay('pause');
});
document.getElementById('btn-resume-game').addEventListener('click', () => {
  playSound('resume');
  STATE.paused = false;
  hideOverlay('pause');
  startTimer();
});
document.getElementById('btn-pause-restart').addEventListener('click', () => { playSound('click'); restartSamePuzzle(); });
document.getElementById('btn-pause-menu').addEventListener('click', () => {
  playSound('click');
  STATE.running = false;
  hideAllOverlays();
  showMenuScreen();
});

document.getElementById('btn-over-restart').addEventListener('click', () => { playSound('click'); restartSamePuzzle(); });
document.getElementById('btn-over-home').addEventListener('click', () => {
  playSound('click');
  STATE.running = false;
  hideAllOverlays();
  showMenuScreen();
});

document.getElementById('btn-play-again').addEventListener('click', () => { playSound('click'); restartSamePuzzle(); });
document.getElementById('btn-win-newgame').addEventListener('click', () => {
  playSound('click');
  hideOverlay('win');
  showMenuScreen();
});
document.getElementById('btn-win-home').addEventListener('click', () => {
  playSound('click');
  hideAllOverlays();
  showMenuScreen();
});

document.getElementById('btn-erase').addEventListener('click', eraseCell);
document.getElementById('btn-hint').addEventListener('click', useHint);
elBtnPencil.addEventListener('click', togglePencil);

document.getElementById('btn-resume-continue').addEventListener('click', () => {
  playSound('click');
  const data = loadSavedGame();
  hideOverlay('resume');
  if (data) restoreFromSave(data);
});
document.getElementById('btn-resume-new').addEventListener('click', () => {
  playSound('click');
  clearSave();
  hideOverlay('resume');
});

document.addEventListener('keydown', (e) => {
  if (!STATE.running || STATE.paused || STATE.gameOver) return;
  if (e.key >= '1' && e.key <= '9') { onNumberPad(Number(e.key)); return; }
  if (e.key === 'Backspace' || e.key === 'Delete') eraseCell();
});

/* ===== INIT ===== */
applyTranslations();
updateSetupUI();

const existingSave = loadSavedGame();
if (existingSave) showOverlay('resume');
