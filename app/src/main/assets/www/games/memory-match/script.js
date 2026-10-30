'use strict';

/* =========================================================
   MEMORY MATCH
   Linked to the Game Collection home screen via localStorage:
   - "gc_lang"  -> "en" | "fr"
   - "gc_sound" -> "on" | "off"

   Card artwork: images/1.png ... images/40.png (transparent PNGs)
   Card back:    images/back.png
   ========================================================= */

/* ---- i18n ------------------------------------------------ */
const STRINGS = {
  en: {
    'game.title': 'Memory Match',
    'setup.subtitle': 'Find every matching pair',
    'setup.mode': 'Game mode',
    'setup.vsAI': 'Vs AI',
    'setup.twoPlayers': 'Multiplayer',
    'setup.playersCount': 'Number of players',
    'setup.difficulty': 'Difficulty',
    'setup.pvpNote': 'Multiplayer always plays on the 6×5 board (30 cards)',
    'setup.easy': 'Easy',
    'setup.medium': 'Medium',
    'setup.hard': 'Hard',
    'setup.expert': 'Expert',
    'setup.start': 'Start Game',
    'setup.quit': 'Quit',
    'pause.title': 'Game Paused',
    'pause.resume': 'Resume',
    'pause.restart': 'Restart',
    'pause.home': 'Back Home',
    'player.you': 'You',
    'player.p2': 'Player 2',
    'player.p3': 'Player 3',
    'player.p4': 'Player 4',
    'player.ai': 'AI',
    'result.difficulty': 'Difficulty',
    'result.playAgain': 'Play Again',
    'result.newGame': 'New Game',
    'result.draw': 'DRAW!',
    'result.youWin': 'YOU WIN!',
    'result.youLose': 'YOU LOSE!',
    'result.winsSuffix': 'WINS!',
    'help.title': 'How To Play',
    'help.line1': 'Flip two cards per turn to find a matching pair.',
    'help.line2': 'If they match, you score a pair and play again.',
    'help.line3': "If they don't match, the cards flip back and the turn changes.",
    'help.line4': 'Play against the AI, or 2 players on the same device.',
    'help.line5': 'Whoever finds the most pairs wins!',
    'help.close': 'Got it'
  },
  fr: {
    'game.title': 'Jeu de Mémoire',
    'setup.subtitle': 'Trouvez toutes les paires',
    'setup.mode': 'Mode de jeu',
    'setup.vsAI': "Contre l'IA",
    'setup.twoPlayers': 'Multijoueur',
    'setup.playersCount': 'Nombre de joueurs',
    'setup.difficulty': 'Difficulté',
    'setup.pvpNote': 'Le mode multijoueur se joue toujours sur la grille 6×5 (30 cartes)',
    'setup.easy': 'Facile',
    'setup.medium': 'Moyen',
    'setup.hard': 'Difficile',
    'setup.expert': 'Expert',
    'setup.start': 'Commencer',
    'setup.quit': 'Quitter',
    'pause.title': 'Jeu en pause',
    'pause.resume': 'Continuer',
    'pause.restart': 'Recommencer',
    'pause.home': "Retour à l'accueil",
    'player.you': 'Vous',
    'player.p2': 'Joueur 2',
    'player.p3': 'Joueur 3',
    'player.p4': 'Joueur 4',
    'player.ai': 'IA',
    'result.difficulty': 'Difficulté',
    'result.playAgain': 'Rejouer',
    'result.newGame': 'Nouvelle partie',
    'result.draw': 'ÉGALITÉ !',
    'result.youWin': 'VOUS GAGNEZ !',
    'result.youLose': 'VOUS PERDEZ !',
    'result.winsSuffix': 'GAGNE !',
    'help.title': 'Comment jouer',
    'help.line1': 'Retournez deux cartes par tour pour trouver une paire.',
    'help.line2': 'Si elles correspondent, vous marquez un point et rejouez.',
    'help.line3': 'Sinon, les cartes se retournent et le tour change.',
    'help.line4': "Jouez contre l'IA, ou à 2 joueurs sur le même appareil.",
    'help.line5': 'Celui qui trouve le plus de paires gagne !',
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
function sndClick() { playTone(680, 0.06, 'square', 0.08, 0); }
function sndFlip() { playTone(520, 0.07, 'sine', 0.12, 0); }
function sndMatch() { [660, 880].forEach((f, i) => playTone(f, 0.16, 'triangle', 0.14, i * 0.08)); }
function sndWrong() { playTone(220, 0.18, 'sawtooth', 0.1, 0); }
function sndAiTurn() { playTone(340, 0.09, 'sine', 0.08, 0); }
function sndWin() { [523, 659, 784, 1046].forEach((f, i) => playTone(f, 0.22, 'triangle', 0.16, i * 0.09)); }
function sndLose() { [400, 320, 260].forEach((f, i) => playTone(f, 0.28, 'sawtooth', 0.10, i * 0.12)); }

/* =========================================================
   CONFIG / STATE
   ========================================================= */
const DIFFICULTY_GRID = {
  easy:   { cols: 5, rows: 6 },
  medium: { cols: 5, rows: 6 },
  hard:   { cols: 5, rows: 6 },
  expert: { cols: 5, rows: 6 }
};
const IMAGE_POOL_SIZE = 40;
const AI_MEMORY_CAPACITY = { easy: 4, medium: 8, hard: 16, expert: 999 };
const AI_RECALL_CHANCE = { easy: 0.5, medium: 0.75, hard: 0.92, expert: 1 };

let gameMode = 'ai';
let difficulty = 'easy';
let playersCount = 2; // for multiplayer mode: 2, 3 or 4
let cols = 4, rows = 4, totalPairs = 8;

let deck = [];          // [{id, value}] length = totalPairs*2, id = board index
let flippedEls = [];    // currently face-up, unmatched card indices this turn
let matchedSet = new Set();
let players = [];       // [{ index, name, color, score, isAI }]
let currentPlayerIndex = 0;
let gamesStarted = 0;   // increments every startGame() call — drives the starting-player rotation
let paused = false;
let gameOver = false;
let inputLocked = false; // true while a mismatched pair is being shown/flipped back
let aiMemory = new Map(); // boardIndex -> value, capped by difficulty

const PLAYER_COLORS = ['violet', 'coral', 'amber', 'mint'];

/* ---- element refs ---------------------------------------------------------- */
const boardEl = document.getElementById('memoryBoard');

const elSetupOverlay = document.getElementById('setupOverlay');
const elPauseOverlay = document.getElementById('pauseOverlay');
const elHelpOverlay = document.getElementById('helpOverlay');
const elResultOverlay = document.getElementById('resultOverlay');

function show(el) { el.classList.remove('hidden'); }
function hide(el) { el.classList.add('hidden'); }
function goHome() { sndClick(); GC.goHome(); }

/* =========================================================
   DECK BUILDING
   ========================================================= */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildDeck() {
  const pool = shuffle(Array.from({ length: IMAGE_POOL_SIZE }, (_, i) => i + 1));
  const chosen = pool.slice(0, totalPairs);
  const values = shuffle(chosen.concat(chosen));
  deck = values.map((value, id) => ({ id, value }));
}

/* =========================================================
   RENDERING
   ========================================================= */
const AI_AVATAR_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="8" width="16" height="12" rx="3"/><circle cx="9" cy="14" r="1.4" fill="currentColor" stroke="none"/><circle cx="15" cy="14" r="1.4" fill="currentColor" stroke="none"/><path d="M12 8V4"/><circle cx="12" cy="3" r="1.2" fill="currentColor" stroke="none"/><path d="M2 13v3M22 13v3"/></svg>';
const PERSON_AVATAR_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8"/></svg>';

function buildPlayers() {
  players = [];
  if (gameMode === 'ai') {
    players.push({ name: t('player.you'), color: PLAYER_COLORS[0], score: 0, isAI: false });
    players.push({ name: t('player.ai'), color: PLAYER_COLORS[1], score: 0, isAI: true });
  } else if (playersCount <= 2) {
    const nameKeys = ['player.you', 'player.p2'];
    for (let i = 0; i < playersCount; i++) {
      players.push({ name: t(nameKeys[i]), color: PLAYER_COLORS[i], score: 0, isAI: false });
    }
  } else {
    // 3-4 players: abbreviate (P1..P4 / J1..J4 in French) so every name
    // fits on a single row instead of wrapping or getting truncated.
    const prefix = lang === 'fr' ? 'J' : 'P';
    for (let i = 0; i < playersCount; i++) {
      players.push({ name: prefix + (i + 1), color: PLAYER_COLORS[i], score: 0, isAI: false });
    }
  }
}

function renderPlayerbar() {
  const bar = document.getElementById('playerbar');
  bar.innerHTML = '';
  bar.classList.toggle('players-3', players.length === 3);
  bar.classList.toggle('players-4', players.length === 4);

  players.forEach((p, i) => {
    const chip = document.createElement('div');
    chip.className = `player card--${p.color}`;
    chip.dataset.index = i;

    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.innerHTML = p.isAI ? AI_AVATAR_SVG : PERSON_AVATAR_SVG;

    const pinfo = document.createElement('div');
    pinfo.className = 'pinfo';
    pinfo.innerHTML = `
      <div class="pname-row"><span class="pname">${p.name}</span><div class="turn-dot"></div></div>
      <div class="pscore">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <span class="pscore-value">${p.score}</span>
      </div>`;

    chip.append(avatar, pinfo);
    bar.appendChild(chip);
  });
}

function updateScoresUI() {
  const chips = document.querySelectorAll('#playerbar .player');
  chips.forEach((chip, i) => {
    chip.querySelector('.pscore-value').textContent = players[i].score;
  });
}

function updateTurnUI() {
  const chips = document.querySelectorAll('#playerbar .player');
  chips.forEach((chip, i) => {
    const active = i === currentPlayerIndex;
    chip.classList.toggle('active-turn', active);
    chip.querySelector('.turn-dot').classList.toggle('on', active);
  });
}
function renderBoard() {
  boardEl.innerHTML = '';

  deck.forEach((cardData) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.id = cardData.id;

    const inner = document.createElement('div');
    inner.className = 'card-inner';

    const cover = document.createElement('div');
    cover.className = 'card-face card-cover';
    const backImg = document.createElement('img');
    backImg.src = 'images/back.png';
    backImg.alt = '';
    backImg.loading = 'lazy';
    cover.appendChild(backImg);

    const symbol = document.createElement('div');
    symbol.className = 'card-face card-symbol';
    const img = document.createElement('img');
    img.src = `images/${cardData.value}.png`;
    img.alt = '';
    img.loading = 'lazy';
    symbol.appendChild(img);

    inner.append(cover, symbol);
    card.appendChild(inner);
    card.addEventListener('click', () => handleCardClick(cardData.id));
    boardEl.appendChild(card);
  });

  sizeBoard();
}

function cardEl(id) { return boardEl.querySelector(`.card[data-id="${id}"]`); }

/* =========================================================
   RESPONSIVE BOARD SIZING
   ---------------------------------------------------------
   Computes the largest card size that:
     - keeps the original image ratio (640×800 => 4:5, width:height)
     - fits every card for the current cols×rows grid inside the
       board-wrap's available width AND height at the same time
     - never causes scrolling or overflow, on any screen size
   The base gap shrinks as the grid gets denser (more cards) and grows
   as it gets sparser. Whichever axis (rows or columns) isn't the tight
   constraint ends up with leftover space — instead of leaving that as
   dead margin around a narrow/short grid, it's converted into extra
   gap along that axis so the cards spread out and the board actually
   fills the screen, capped so gaps never blow out of proportion.
   ========================================================= */
const CARD_ASPECT_H_OVER_W = 800 / 640; // 4:5 → height = width * 1.25
const CARD_MIN_W = 26; // px floor so cards never disappear on extreme viewports

function computeCardLayout(availW, availH, gridCols, gridRows) {
  const cellCount = gridCols * gridRows;

  // Base gap: denser grids (more cells) get a tighter gap, sparse grids get more breathing room.
  let gap = Math.max(4, Math.min(14, 14 - 0.35 * (cellCount - 16)));

  const fit = (g) => Math.max(
    0,
    Math.min(
      (availW - g * (gridCols - 1)) / gridCols,
      (availH - g * (gridRows - 1)) / gridRows / CARD_ASPECT_H_OVER_W
    )
  );

  let cardW = fit(gap);

  // Re-balance the gap relative to the resulting card size, then resolve once more
  // (a smaller gap only ever frees up space, so this pass is guaranteed to converge).
  const balancedGap = Math.max(4, Math.min(gap, cardW * 0.12));
  if (balancedGap < gap) {
    gap = balancedGap;
    cardW = fit(gap);
  }

  cardW = Math.max(cardW, CARD_MIN_W);
  const cardH = cardW * CARD_ASPECT_H_OVER_W;

  // Grow the gap on whichever axis has leftover room, so the grid spreads
  // out to fill the available space instead of sitting in a narrow column
  // with dead margins on the sides (or floating with empty space above/below).
  const axisGap = (count, cardSize, avail, baseGap) => {
    if (count <= 1) return baseGap;
    const leftover = avail - (cardSize * count + baseGap * (count - 1));
    if (leftover <= 0) return baseGap;
    const extraPerGap = leftover / (count - 1);
    const maxExtra = cardSize * 0.2; // cap: never more than half a card's size extra
    return baseGap + Math.min(extraPerGap, maxExtra);
  };

  const gapX = axisGap(gridCols, cardW, availW, gap);
  const gapY = axisGap(gridRows, cardH, availH, gap);

  return { cardW, cardH, gapX, gapY };
}

function sizeBoard() {
  if (!cols || !rows || !boardEl.children.length) return;

  const wrap = boardEl.parentElement; // .board-wrap
  const wrapStyle = getComputedStyle(wrap);
  const padX = parseFloat(wrapStyle.paddingLeft) + parseFloat(wrapStyle.paddingRight);
  const padY = parseFloat(wrapStyle.paddingTop) + parseFloat(wrapStyle.paddingBottom);
  const availW = Math.max(0, wrap.clientWidth - padX);
  const availH = Math.max(0, wrap.clientHeight - padY);

  const { cardW, cardH, gapX, gapY } = computeCardLayout(availW, availH, cols, rows);

  boardEl.style.gridTemplateColumns = `repeat(${cols}, ${cardW}px)`;
  boardEl.style.gridTemplateRows = `repeat(${rows}, ${cardH}px)`;
  boardEl.style.columnGap = `${gapX}px`;
  boardEl.style.rowGap = `${gapY}px`;
  boardEl.style.width = `${cardW * cols + gapX * (cols - 1)}px`;
  boardEl.style.height = `${cardH * rows + gapY * (rows - 1)}px`;
}

/* Recompute on any viewport change: resize, orientation flip, mobile browser
   chrome show/hide (visualViewport), or the player bar changing height. */
let sizeBoardRAF = null;
function scheduleSizeBoard() {
  if (sizeBoardRAF) cancelAnimationFrame(sizeBoardRAF);
  sizeBoardRAF = requestAnimationFrame(sizeBoard);
}
window.addEventListener('resize', scheduleSizeBoard);
window.addEventListener('orientationchange', scheduleSizeBoard);
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', scheduleSizeBoard);
}
if (window.ResizeObserver) {
  new ResizeObserver(scheduleSizeBoard).observe(document.getElementById('memoryBoard').parentElement);
}

/* =========================================================
   GAME FLOW
   ========================================================= */
function startGame() {
  const grid = (gameMode === 'pvp') ? DIFFICULTY_GRID.expert : DIFFICULTY_GRID[difficulty];
  cols = grid.cols; rows = grid.rows;
  totalPairs = (cols * rows) / 2;

  buildDeck();
  buildPlayers();

  flippedEls = [];
  matchedSet = new Set();
  currentPlayerIndex = gamesStarted % players.length;
  gamesStarted++;

  paused = false;
  gameOver = false;
  inputLocked = false;
  aiMemory = new Map();

  renderPlayerbar();
  renderBoard();
  updateTurnUI();

  // if the rotation picked the AI to start, let it play immediately
  if (gameMode === 'ai' && players[currentPlayerIndex].isAI) {
    setTimeout(aiTakeTurn, 600);
  }
}

/** Restart keeps the exact same starting player as the current attempt (no rotation). */
function restartSameGame() {
  gamesStarted = Math.max(0, gamesStarted - 1);
  startGame();
}

function handleCardClick(id) {
  if (paused || gameOver || inputLocked) return;
  if (players[currentPlayerIndex].isAI) return; // AI plays itself
  attemptFlip(id);
}

function attemptFlip(id) {
  if (matchedSet.has(id) || flippedEls.includes(id)) return;
  if (flippedEls.length >= 2) return;

  const el = cardEl(id);
  el.classList.add('flipped');
  sndFlip();
  rememberCard(id);
  flippedEls.push(id);

  if (flippedEls.length === 2) {
    inputLocked = true;
    setTimeout(resolveTurn, 550);
  }
}

function resolveTurn() {
  const [a, b] = flippedEls;
  const isMatch = deck[a].value === deck[b].value;
  const activePlayer = players[currentPlayerIndex];

  if (isMatch) {
    matchedSet.add(a); matchedSet.add(b);
    cardEl(a).classList.add('matched');
    cardEl(b).classList.add('matched');
    sndMatch();
    aiMemory.delete(a); aiMemory.delete(b);

    activePlayer.score++;
    updateScoresUI();

    flippedEls = [];
    inputLocked = false;

    if (matchedSet.size === deck.length) { finishGame(); return; }

    // matching player keeps their turn
    if (activePlayer.isAI) {
      setTimeout(aiTakeTurn, 500);
    }
  } else {
    sndWrong();
    cardEl(a).classList.add('shake');
    cardEl(b).classList.add('shake');
    setTimeout(() => {
      cardEl(a).classList.remove('flipped', 'shake');
      cardEl(b).classList.remove('flipped', 'shake');
      flippedEls = [];
      inputLocked = false;
      currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
      updateTurnUI();

      if (players[currentPlayerIndex].isAI && !gameOver) {
        setTimeout(aiTakeTurn, 500);
      }
    }, 700);
  }
}

function finishGame() {
  gameOver = true;

  const topScore = Math.max(...players.map(p => p.score));
  const winners = players.filter(p => p.score === topScore);

  let title, cls;
  if (winners.length > 1) {
    title = t('result.draw'); cls = 'draw';
    sndWin();
  } else {
    const winner = winners[0];
    if (gameMode === 'ai') {
      if (winner.isAI) { title = t('result.youLose'); cls = 'lose'; sndLose(); }
      else { title = t('result.youWin'); cls = ''; sndWin(); }
    } else {
      title = `${winner.name.toUpperCase()} ${t('result.winsSuffix')}`;
      cls = '';
      sndWin();
    }
  }

  setTimeout(() => showResult(title, cls), 400);
}

function showResult(title, cls) {
  const banner = document.getElementById('resultBanner');
  banner.textContent = title;
  banner.className = 'banner' + (cls ? (' ' + cls) : '');
  document.getElementById('winDifficulty').textContent = (gameMode === 'pvp')
    ? t('setup.expert')
    : t('setup.' + difficulty);
  show(elResultOverlay);
  triggerConfetti();
}

function triggerConfetti() {
  const container = document.getElementById('confetti-container');
  container.innerHTML = '';
  const colors = ['#6C5CE7', '#17B6CE', '#FF5E72', '#FFA93E', '#1FC79B'];
  for (let i = 0; i < 60; i++) {
    const conf = document.createElement('div');
    conf.className = 'confetti';
    conf.style.left = Math.random() * 100 + '%';
    conf.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    conf.style.animationDuration = (Math.random() * 2 + 2) + 's';
    conf.style.animationDelay = Math.random() * 0.5 + 's';
    container.appendChild(conf);
  }
}

/* =========================================================
   AI — remembers previously revealed cards according to difficulty.
   ========================================================= */
function rememberCard(id) {
  if (gameMode !== 'ai') return;
  const capacity = AI_MEMORY_CAPACITY[difficulty] || 4;
  aiMemory.set(id, deck[id].value);
  if (aiMemory.size > capacity) {
    const oldestKey = aiMemory.keys().next().value;
    if (oldestKey !== id) aiMemory.delete(oldestKey);
  }
}

function forgetRandomly() {
  // simulates imperfect recall for lower difficulties
  const recallChance = AI_RECALL_CHANCE[difficulty] ?? 0.6;
  for (const key of Array.from(aiMemory.keys())) {
    if (Math.random() > recallChance) aiMemory.delete(key);
  }
}

function getUnrevealedIds() {
  const ids = [];
  for (let i = 0; i < deck.length; i++) if (!matchedSet.has(i)) ids.push(i);
  return ids;
}

function findKnownPair() {
  const byValue = new Map();
  for (const [id, value] of aiMemory.entries()) {
    if (matchedSet.has(id)) continue;
    if (!byValue.has(value)) byValue.set(value, []);
    byValue.get(value).push(id);
  }
  for (const ids of byValue.values()) {
    if (ids.length >= 2) return [ids[0], ids[1]];
  }
  return null;
}

function aiTakeTurn() {
  if (paused || gameOver) return;
  sndAiTurn();
  forgetRandomly();

  const knownPair = findKnownPair();
  if (knownPair) {
    attemptFlip(knownPair[0]);
    setTimeout(() => attemptFlip(knownPair[1]), 500);
    return;
  }

  const unrevealed = getUnrevealedIds().filter(id => !flippedEls.includes(id));
  const unknownFirst = unrevealed.filter(id => !aiMemory.has(id));
  const firstPick = (unknownFirst.length ? unknownFirst : unrevealed)[
    Math.floor(Math.random() * (unknownFirst.length ? unknownFirst.length : unrevealed.length))
  ];

  attemptFlip(firstPick);

  setTimeout(() => {
    // after seeing the first card, check if a known match just became available
    const remaining = getUnrevealedIds().filter(id => id !== firstPick && !flippedEls.includes(id));
    const firstValue = deck[firstPick].value;
    const matchId = remaining.find(id => aiMemory.get(id) === firstValue);

    if (matchId !== undefined) {
      attemptFlip(matchId);
    } else {
      const unknownSecond = remaining.filter(id => !aiMemory.has(id));
      const pool = unknownSecond.length ? unknownSecond : remaining;
      const secondPick = pool[Math.floor(Math.random() * pool.length)];
      attemptFlip(secondPick);
    }
  }, 550);
}

/* =========================================================
   UI WIRING
   ========================================================= */
document.querySelectorAll('.optbtn.mode').forEach(btn => {
  btn.addEventListener('click', () => {
    sndClick();
    document.querySelectorAll('.optbtn.mode').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    gameMode = btn.dataset.mode;
    const isPvp = gameMode === 'pvp';
    document.getElementById('diffSection').style.display = isPvp ? 'none' : 'block';
    document.getElementById('playersCountSection').classList.toggle('hidden', !isPvp);
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
document.querySelectorAll('.optbtn.pcount').forEach(btn => {
  btn.addEventListener('click', () => {
    sndClick();
    document.querySelectorAll('.optbtn.pcount').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    playersCount = Number(btn.dataset.count);
  });
});

document.getElementById('startBtn').addEventListener('click', () => {
  sndClick();
  hide(elSetupOverlay);
  gamesStarted = 0; // fresh session: You (or Player 1) always starts the first round
  startGame();
});
document.getElementById('setupQuitBtn').addEventListener('click', goHome);
document.getElementById('homeBtn').addEventListener('click', goHome);

/* ---- Help ---- */
document.getElementById('helpBtn').addEventListener('click', () => { sndClick(); show(elHelpOverlay); });
document.getElementById('helpCloseBtn').addEventListener('click', () => { sndClick(); hide(elHelpOverlay); });

/* ---- Pause ---- */
document.getElementById('pauseBtn').addEventListener('click', () => {
  if (!elSetupOverlay.classList.contains('hidden')) return;
  if (!elResultOverlay.classList.contains('hidden')) return;
  if (gameOver) return;
  sndClick();
  paused = true;
  show(elPauseOverlay);
});
document.getElementById('resumeBtn').addEventListener('click', () => {
  sndClick();
  paused = false;
  hide(elPauseOverlay);
});
document.getElementById('pauseRestartBtn').addEventListener('click', () => {
  sndClick();
  hide(elPauseOverlay);
  restartSameGame(); // same starting player as this attempt, no rotation
});
document.getElementById('pauseMenuBtn').addEventListener('click', goHome);

/* ---- Result ---- */
document.getElementById('playAgainBtn').addEventListener('click', () => {
  sndClick();
  hide(elResultOverlay);
  startGame(); // rotates the starting player to the next one in line
});
document.getElementById('newGameBtn').addEventListener('click', () => {
  sndClick();
  hide(elResultOverlay);
  show(elSetupOverlay);
});
document.getElementById('resultHomeBtn').addEventListener('click', goHome);

/* ===== INIT ===== */
applyTranslations();
