'use strict';

/* =========================================================
   FRUIT MEMORY
   Linked to the Game Collection home screen via localStorage:
   - "gc_lang"  -> "en" | "fr"
   - "gc_sound" -> "on" | "off"
   Own storage:
   - "gc_fruitmemory_best" -> { time, acc, played }

   Rules
   - 12 different fruits are shown in 12 circles (3 cols x 4 rows) for 12 s.
   - They disappear; the 12 fruits show up on both sides (6 left / 6 right).
   - Drag each fruit to the circle where it was.
   - Solo: right = +1 point and you continue; wrong = a mistake is counted.
   - 2 players: right = +1 point and the turn passes to the other player.
     Wrong = a mistake and the other player plays. If that player answers
     right, he plays ALONE (keeps the turn); his first mistake ends the game
     and the higher score wins. If he is wrong straight away, the game ends too.
   The truth lives ONLY in `solution` (never read back from the DOM).
   ========================================================= */

/* ---- i18n ------------------------------------------------ */
const STRINGS = {
  en: {
    'game.title': 'Fruit Memory',
    'setup.subtitle': 'Remember where each fruit was',
    'setup.mode': 'Game mode',
    'setup.solo': '1 Player',
    'setup.duo': '2 Players',
    'setup.best': 'Best result',
    'setup.played': 'Games',
    'setup.start': 'Start Game',
    'setup.quit': 'Quit',
    'pause.title': 'Game Paused',
    'pause.resume': 'Resume',
    'pause.restart': 'Restart',
    'pause.home': 'Back Home',
    'player.p1': 'Player 1',
    'player.p2': 'Player 2',
    'stat.score': 'Score',
    'stat.mistakes': 'Mistakes',
    'stat.time': 'Time',
    'phase.memorize': 'Memorise the fruits!',
    'phase.solo': 'Drag each fruit to its circle',
    'phase.turn': "{name}'s turn",
    'toast.go': 'Go!',
    'toast.wrong': 'Not here!',
    'toast.taken': 'Circle already filled',
    'toast.turn': "{name}'s turn",
    'toast.first': '{name} starts!',
    'toast.alone': '{name} plays alone!',
    'toast.end': 'Game over!',
    'toast.good': 'Yes! +1',
    'result.title': 'Round complete!',
    'result.score': 'Score',
    'result.mistakes': 'Mistakes',
    'result.time': 'Time',
    'result.accuracy': 'Accuracy',
    'result.points': 'pts',
    'result.errors': 'mistakes',
    'result.record': 'New record!',
    'result.playAgain': 'Play Again',
    'result.newGame': 'New Game',
    'result.draw': 'DRAW!',
    'result.winsSuffix': 'WINS!',
    'help.title': 'How To Play',
    'help.line1': '12 fruits are shown in 12 circles for 12 seconds. Memorise their places!',
    'help.line2': 'Then they disappear and appear on both sides of the board.',
    'help.line3': 'Drag each fruit into the circle where it was.',
    'help.line4': 'Solo: a right place scores a point and you keep playing. 2 players: a right place scores a point and the turn passes to the other player. A wrong place is a mistake and the other player plays. If he is right, he plays alone: his first mistake ends the game and the higher score wins.',
    'help.line5': 'Place all 12 fruits to finish. Most points wins!',
    'help.close': 'Got it'
  },
  fr: {
    'game.title': 'Mémoire des Fruits',
    'setup.subtitle': 'Souvenez-vous de la place de chaque fruit',
    'setup.mode': 'Mode de jeu',
    'setup.solo': '1 Joueur',
    'setup.duo': '2 Joueurs',
    'setup.best': 'Meilleur résultat',
    'setup.played': 'Parties',
    'setup.start': 'Commencer',
    'setup.quit': 'Quitter',
    'pause.title': 'Jeu en pause',
    'pause.resume': 'Continuer',
    'pause.restart': 'Recommencer',
    'pause.home': "Retour à l'accueil",
    'player.p1': 'Joueur 1',
    'player.p2': 'Joueur 2',
    'stat.score': 'Score',
    'stat.mistakes': 'Erreurs',
    'stat.time': 'Temps',
    'phase.memorize': 'Mémorisez les fruits !',
    'phase.solo': 'Glissez chaque fruit dans son cercle',
    'phase.turn': 'Tour de {name}',
    'toast.go': 'Partez !',
    'toast.wrong': 'Pas ici !',
    'toast.taken': 'Cercle déjà rempli',
    'toast.turn': 'Tour de {name}',
    'toast.first': '{name} commence !',
    'toast.alone': '{name} joue seul !',
    'toast.end': 'Fin de la partie !',
    'toast.good': 'Oui ! +1',
    'result.title': 'Manche terminée !',
    'result.score': 'Score',
    'result.mistakes': 'Erreurs',
    'result.time': 'Temps',
    'result.accuracy': 'Précision',
    'result.points': 'pts',
    'result.errors': 'erreurs',
    'result.record': 'Nouveau record !',
    'result.playAgain': 'Rejouer',
    'result.newGame': 'Nouvelle partie',
    'result.draw': 'ÉGALITÉ !',
    'result.winsSuffix': 'GAGNE !',
    'help.title': 'Comment jouer',
    'help.line1': '12 fruits sont affichés dans 12 cercles pendant 12 secondes. Mémorisez leur place !',
    'help.line2': 'Ils disparaissent puis apparaissent de chaque côté du plateau.',
    'help.line3': 'Glissez chaque fruit dans le cercle où il se trouvait.',
    'help.line4': "Solo : un bon endroit marque un point et vous continuez. À 2 joueurs : un bon endroit marque un point et le tour passe à l'autre joueur. Un mauvais endroit est une erreur et l'autre joueur joue. S'il a juste, il joue seul : sa première erreur termine la partie et le meilleur score gagne.",
    'help.line5': 'Placez les 12 fruits pour terminer. Le plus de points gagne !',
    'help.close': 'Compris'
  }
};

const lang = (localStorage.getItem('gc_lang') === 'fr') ? 'fr' : 'en';
const soundOn = localStorage.getItem('gc_sound') !== 'off';

function t(key, vars) {
  let s = (STRINGS[lang] && STRINGS[lang][key]) || STRINGS.en[key] || key;
  if (vars) for (const k in vars) s = s.replace('{' + k + '}', vars[k]);
  return s;
}
function applyTranslations() {
  document.documentElement.lang = lang;
  document.title = t('game.title');
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.getAttribute('data-i18n')); });
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
function sndPick() { playTone(520, 0.07, 'sine', 0.12, 0); }
function sndTick() { playTone(900, 0.05, 'sine', 0.07, 0); }
function sndGo() { [523, 784].forEach((f, i) => playTone(f, 0.14, 'triangle', 0.14, i * 0.08)); }
function sndRight() { [660, 880].forEach((f, i) => playTone(f, 0.16, 'triangle', 0.14, i * 0.08)); }
function sndWrong() { playTone(220, 0.2, 'sawtooth', 0.1, 0); }
function sndWin() { [523, 659, 784, 1046].forEach((f, i) => playTone(f, 0.22, 'triangle', 0.16, i * 0.09)); }

/* =========================================================
   CONFIG / STATE
   ========================================================= */
const HOLES = 12;          // 3 columns x 4 rows
const COLS = 3, ROWS = 4;
const MEMO_MS = 12000;     // memorisation time, exactly 12 s of un-paused time
const ICON_PX = 128;
const PLAYER_COLORS = ['violet', 'coral'];

let mode = 'solo';         // 'solo' | 'duo'
let phase = 'setup';       // 'setup' | 'memorize' | 'play' | 'over'
let paused = false;

let solution = [];         // solution[hole] = fruit index (THE source of truth)
let filled = [];           // filled[hole] = true once correctly placed
let placed = 0;
let tiles = [];            // [{ fruit, el }]
let players = [];          // [{ name, color, score, errors }]
let cur = 0;               // current player (duo)
let lastChance = false;    // duo: the other player just made a mistake -> this answer decides
let soloOwner = -1;        // duo: player who plays alone (the other one failed)
let soloErrors = 0;
let memoLeft = MEMO_MS;
let playMs = 0;
let lastTick = 0;
let lastCount = -1;
let lastClock = '';
let rafId = 0;
let roundId = 0;           // invalidates stale timeouts after restart

/* ---- element refs ---------------------------------------------------------- */
const $ = (id) => document.getElementById(id);
const gridEl = $('grid'), trayL = $('trayL'), trayR = $('trayR'), stageEl = $('stage'), wrapEl = $('stageWrap');
const ghostEl = $('ghost'), toastEl = $('toast');
const elSetup = $('setupOverlay'), elPause = $('pauseOverlay'), elHelp = $('helpOverlay'), elResult = $('resultOverlay');
const phaseEl = $('phase'), phaseText = $('phaseText'), phaseCount = $('phaseCount'), phaseBar = $('phaseBar');

function show(el) { el.classList.remove('hidden'); }
function hide(el) { el.classList.add('hidden'); }
function goHome() { sndClick(); GC.goHome(); }

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
function fmtTime(ms) {
  const s = Math.floor(ms / 1000);
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}
function fmtTimeLong(ms) {
  const s = ms / 1000, m = Math.floor(s / 60);
  return m + ':' + (s - m * 60).toFixed(1).padStart(4, '0');
}

/* ---- best results ---------------------------------------------------------- */
const BEST_KEY = 'gc_fruitmemory_best';
function loadBest() {
  try {
    const b = JSON.parse(localStorage.getItem(BEST_KEY));
    if (b && typeof b === 'object') return { time: b.time || 0, acc: b.acc || 0, played: b.played || 0 };
  } catch (e) { /* ignore */ }
  return { time: 0, acc: 0, played: 0 };
}
function saveBest(b) { try { localStorage.setItem(BEST_KEY, JSON.stringify(b)); } catch (e) { /* ignore */ } }
function renderBest() {
  const b = loadBest();
  $('bestTime').textContent = b.time ? fmtTimeLong(b.time) : '–';
  $('bestAcc').textContent = b.acc ? b.acc + '%' : '–';
  $('bestPlayed').textContent = b.played;
  $('bestBox').classList.toggle('hidden', mode !== 'solo');
}

/* =========================================================
   BUILD A ROUND
   ========================================================= */
function buildRound() {
  roundId++;
  const pool = shuffle(Array.from({ length: FRUITS.length }, (_, i) => i));
  solution = pool.slice(0, HOLES);              // 12 different fruits, random circles
  filled = new Array(HOLES).fill(false);
  placed = 0;
  soloErrors = 0;
  memoLeft = MEMO_MS;
  playMs = 0;
  lastCount = -1; lastClock = '';
  paused = false;
  cancelDrag(true);

  if (mode === 'duo') {
    players = [
      { name: t('player.p1'), color: PLAYER_COLORS[0], score: 0, errors: 0 },
      { name: t('player.p2'), color: PLAYER_COLORS[1], score: 0, errors: 0 }
    ];
    cur = Math.random() < 0.5 ? 0 : 1;           // random starter
    lastChance = false; soloOwner = -1;
  } else {
    players = [{ name: '', color: 'violet', score: 0, errors: 0 }];
    cur = 0;
  }

  // circles: fruit pictures are shown now, the answer stays in `solution`
  gridEl.innerHTML = '';
  for (let h = 0; h < HOLES; h++) {
    const hole = document.createElement('div');
    hole.className = 'hole shown';
    hole.dataset.h = h;
    const img = document.createElement('img');
    img.alt = ''; img.draggable = false;
    img.src = fruitIcon(solution[h], ICON_PX);
    hole.appendChild(img);
    gridEl.appendChild(hole);
  }

  // trays: same 12 fruits, in a different random order, 6 left / 6 right
  trayL.innerHTML = ''; trayR.innerHTML = '';
  tiles = [];
  const order = shuffle(solution.slice());
  order.forEach((fruit, i) => {
    const el = document.createElement('div');
    el.className = 'tile';
    el.style.animationDelay = (i % 6) * 40 + 'ms';
    const img = document.createElement('img');
    img.alt = ''; img.draggable = false;
    img.src = fruitIcon(fruit, ICON_PX);
    el.appendChild(img);
    const tile = { fruit, el };
    el.addEventListener('pointerdown', (e) => onTileDown(e, tile));
    tiles.push(tile);
    (i < 6 ? trayL : trayR).appendChild(el);
  });

  stageEl.classList.add('memorize');
  renderBars();
  sizeStage();
}

/* =========================================================
   SCORE BARS
   ========================================================= */
const PERSON_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8"/></svg>';

function renderBars() {
  const bar = $('playerbar');
  bar.innerHTML = '';
  if (mode === 'solo') {
    bar.innerHTML =
      '<div class="statbar">' +
      '<div class="stat ok"><span>' + t('stat.score') + '</span><strong id="stScore">0/' + HOLES + '</strong></div>' +
      '<div class="stat bad"><span>' + t('stat.mistakes') + '</span><strong id="stErr">0</strong></div>' +
      '<div class="stat"><span>' + t('stat.time') + '</span><strong id="stTime">0:00</strong></div>' +
      '</div>';
  } else {
    players.forEach((p, i) => {
      const chip = document.createElement('div');
      chip.className = 'player card--' + p.color + (i === 1 ? ' reverse' : '');
      chip.dataset.index = i;
      chip.innerHTML =
        '<div class="avatar">' + PERSON_SVG + '</div>' +
        '<div class="pinfo' + (i === 1 ? ' reverse' : '') + '">' +
          '<div class="pname-row"><span class="pname">' + p.name + '</span><div class="turn-dot"></div></div>' +
          '<div class="pscore"><span>✓ <b class="sc">0</b></span><span>✕ <b class="er">0</b></span></div>' +
        '</div>';
      bar.appendChild(chip);
    });
  }
  updateScoresUI();
  updateTurnUI();
}

function updateScoresUI() {
  if (mode === 'solo') {
    const a = $('stScore'), b = $('stErr');
    if (a) a.textContent = placed + '/' + HOLES;
    if (b) b.textContent = soloErrors;
  } else {
    document.querySelectorAll('#playerbar .player').forEach((chip, i) => {
      chip.querySelector('.sc').textContent = players[i].score;
      chip.querySelector('.er').textContent = players[i].errors;
    });
  }
}
function updateTurnUI() {
  if (mode !== 'duo') return;
  document.querySelectorAll('#playerbar .player').forEach((chip, i) => {
    const on = phase === 'play' && i === cur;
    chip.classList.toggle('active-turn', on);
    chip.querySelector('.turn-dot').classList.toggle('on', on);
  });
}
function updateClock() {
  if (mode !== 'solo') return;
  const s = fmtTime(playMs);
  if (s !== lastClock) { lastClock = s; const el = $('stTime'); if (el) el.textContent = s; }
}

function setPhaseUI() {
  phaseEl.classList.remove('play', 'turn-violet', 'turn-coral');
  phaseEl.style.visibility = (phase === 'play' && mode === 'duo') ? 'hidden' : '';
  if (phase === 'memorize') {
    phaseText.textContent = t('phase.memorize');
  } else if (phase === 'play') {
    phaseEl.classList.add('play');
    phaseCount.textContent = '';
    if (mode === 'duo') {
      phaseText.textContent = '';
    } else {
      phaseText.textContent = t('phase.solo');
    }
  }
}

/* =========================================================
   RESPONSIVE SIZING
   d = circle diameter, s = tray tile size, gap between things.
   Fits 3 columns x 4 rows + two trays of 6 inside the free area.
   ========================================================= */
function sizeStage() {
  const cs = getComputedStyle(wrapEl);
  const availW = wrapEl.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const availH = wrapEl.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  if (availW <= 0 || availH <= 0) return;
  const gap = Math.max(5, Math.min(12, Math.round(Math.min(availW, availH) / 40)));
  const trayGap = 4;
  const RATIO = 0.8;
  let d = (availW - 4 * gap) / (3 + 2 * RATIO);            // width limit
  d = Math.min(d, (availH - 3 * gap) / 4);                  // grid height limit
  d = Math.min(d, (availH - 5 * trayGap) / (6 * RATIO));    // tray height limit
  d = Math.max(28, Math.min(d, 170));
  const s = Math.floor(d * RATIO);
  d = Math.floor(d);
  stageEl.style.setProperty('--d', d + 'px');
  stageEl.style.setProperty('--s', s + 'px');
  stageEl.style.setProperty('--gap', gap + 'px');
  // tray is at least as tall as the grid and tall enough to keep 6 tiles apart
  const gridH = 4 * d + 3 * gap;
  const th = Math.max(gridH, 6 * s + 5 * trayGap);
  trayL.style.height = trayR.style.height = th + 'px';
}
let sizeRAF = 0;
function scheduleSize() { cancelAnimationFrame(sizeRAF); sizeRAF = requestAnimationFrame(sizeStage); }
window.addEventListener('resize', scheduleSize);
window.addEventListener('orientationchange', scheduleSize);
if (window.visualViewport) window.visualViewport.addEventListener('resize', scheduleSize);
if (window.ResizeObserver) new ResizeObserver(scheduleSize).observe(wrapEl);

/* =========================================================
   GAME FLOW + TIMER
   ========================================================= */
function startRound() {
  buildRound();
  phase = 'memorize';
  setPhaseUI();
  phaseBar.style.transform = 'scaleX(1)';
  phaseCount.textContent = Math.ceil(MEMO_MS / 1000);
  hideToast();
  lastTick = performance.now();
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(loop);
}

function loop(now) {
  const dt = Math.min(100, now - lastTick);
  lastTick = now;
  if (!paused) {
    if (phase === 'memorize') {
      memoLeft = Math.max(0, memoLeft - dt);
      phaseBar.style.transform = 'scaleX(' + (memoLeft / MEMO_MS).toFixed(4) + ')';
      const c = Math.ceil(memoLeft / 1000);
      if (c !== lastCount) { lastCount = c; phaseCount.textContent = c; if (c > 0 && c < 12) sndTick(); }
      if (memoLeft <= 0) beginPlay();
    } else if (phase === 'play') {
      playMs += dt;
      updateClock();
    }
  }
  if (phase === 'memorize' || phase === 'play') rafId = requestAnimationFrame(loop);
}

function beginPlay() {
  phase = 'play';
  // hide every fruit: only `solution` remembers where they were
  gridEl.querySelectorAll('.hole').forEach((h) => {
    h.classList.remove('shown');
    const img = h.querySelector('img');
    if (img) img.remove();
  });
  stageEl.classList.remove('memorize');
  phaseCount.textContent = '';
  setPhaseUI();
  updateTurnUI();
  sndGo();
  if (mode === 'duo') showToast(t('toast.first', { name: players[cur].name }), 'good', 1200);
  else showToast(t('toast.go'), 'good', 800);
}

function pauseGame() {
  if (paused || (phase !== 'memorize' && phase !== 'play')) return;
  paused = true;
  cancelDrag(false);
  show(elPause);
}
function resumeGame() {
  paused = false;
  lastTick = performance.now();
  hide(elPause);
}
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); });

/* =========================================================
   DRAG & DROP  (pointer events: mouse + touch + pen)
   ========================================================= */
let drag = null;           // { tile, pid, size, dy }
let busy = false;          // short lock while a rejected fruit flies back

function onTileDown(e, tile) {
  if (phase !== 'play' || paused || drag || busy) return;
  if (tile.el.classList.contains('used')) return;
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  e.preventDefault();
  const r = tile.el.getBoundingClientRect();
  const size = Math.round(parseFloat(getComputedStyle(stageEl).getPropertyValue('--d')) * 0.92) || r.width;
  drag = { tile, pid: e.pointerId, size, dy: e.pointerType === 'touch' ? -size * 0.75 : 0 };
  tile.el.classList.add('drag');
  ghostEl.innerHTML = '';
  const img = document.createElement('img');
  img.src = tile.el.querySelector('img').src; img.alt = '';
  ghostEl.appendChild(img);
  ghostEl.style.width = ghostEl.style.height = size + 'px';
  ghostEl.classList.remove('back');
  ghostEl.classList.add('on');
  moveGhost(e.clientX, e.clientY);
  updateHover();
  sndPick();
  document.addEventListener('pointermove', onMove, { passive: false });
  document.addEventListener('pointerup', onUp);
  document.addEventListener('pointercancel', onCancel);
}

function ghostCenter() { return drag ? { x: drag.x, y: drag.y } : null; }
function moveGhost(cx, cy) {
  drag.x = cx; drag.y = cy + drag.dy;
  ghostEl.style.transform = 'translate(' + (drag.x - drag.size / 2) + 'px,' + (drag.y - drag.size / 2) + 'px)';
}
function nearestHole() {
  if (!drag) return -1;
  let best = -1, bestD = Infinity, limit = 0;
  const holes = gridEl.children;
  for (let i = 0; i < holes.length; i++) {
    const r = holes[i].getBoundingClientRect();
    const dx = drag.x - (r.left + r.width / 2), dy = drag.y - (r.top + r.height / 2);
    const dist = Math.hypot(dx, dy);
    if (dist < bestD) { bestD = dist; best = i; limit = r.width * 0.6; }
  }
  return bestD <= limit ? best : -1;
}
function updateHover() {
  const n = nearestHole();
  const holes = gridEl.children;
  for (let i = 0; i < holes.length; i++) holes[i].classList.toggle('hover', i === n && !filled[i]);
}
function clearHover() { for (const h of gridEl.children) h.classList.remove('hover'); }

function onMove(e) {
  if (!drag || e.pointerId !== drag.pid) return;
  e.preventDefault();
  moveGhost(e.clientX, e.clientY);
  updateHover();
}
function onUp(e) {
  if (!drag || e.pointerId !== drag.pid) return;
  moveGhost(e.clientX, e.clientY);
  const h = nearestHole();
  const tile = drag.tile;
  detachDragListeners();
  clearHover();
  if (h < 0) { flyBack(tile); return; }                       // dropped outside: no penalty
  if (filled[h]) { showToast(t('toast.taken'), 'bad', 900); flyBack(tile); return; }
  judge(tile, h);
}
function onCancel(e) {
  if (!drag || e.pointerId !== drag.pid) return;
  const tile = drag.tile;
  detachDragListeners(); clearHover();
  flyBack(tile);
}
function detachDragListeners() {
  document.removeEventListener('pointermove', onMove);
  document.removeEventListener('pointerup', onUp);
  document.removeEventListener('pointercancel', onCancel);
}
/** Abort any drag in progress (pause / restart). */
function cancelDrag(instant) {
  if (!drag) { ghostEl.classList.remove('on'); return; }
  const tile = drag.tile;
  detachDragListeners(); clearHover();
  if (instant) { tile.el.classList.remove('drag'); ghostEl.classList.remove('on'); drag = null; }
  else flyBack(tile);
}
function flyBack(tile) {
  const r = tile.el.getBoundingClientRect();
  const size = drag ? drag.size : r.width;
  busy = true;
  const my = roundId;
  ghostEl.classList.add('back');
  ghostEl.style.transform = 'translate(' + (r.left + r.width / 2 - size / 2) + 'px,' + (r.top + r.height / 2 - size / 2) + 'px)';
  drag = null;
  setTimeout(() => {
    ghostEl.classList.remove('on', 'back');
    tile.el.classList.remove('drag');
    busy = false;
  }, 230);
}

/** Check a drop against the stored solution — never against what is on screen. */
function judge(tile, h) {
  const holeEl = gridEl.children[h];
  if (solution[h] === tile.fruit) {
    // ---- correct ----
    filled[h] = true;
    placed++;
    if (mode === 'duo') players[cur].score++;
    tile.el.classList.remove('drag');
    tile.el.classList.add('used');
    ghostEl.classList.remove('on');
    drag = null;
    holeEl.classList.add('done');
    const img = document.createElement('img');
    img.alt = ''; img.draggable = false; img.src = fruitIcon(tile.fruit, ICON_PX);
    holeEl.appendChild(img);
    const sp = document.createElement('i'); sp.className = 'spark'; holeEl.appendChild(sp);
    setTimeout(() => sp.remove(), 600);
    sndRight();
    updateScoresUI();
    if (placed === HOLES) { finishGame(); return; }
    if (mode === 'duo') {
      if (soloOwner === cur) {
        // already playing alone: keeps the turn
        showToast(t('toast.good'), 'good', 600);
      } else if (lastChance) {
        // the other player failed and this one is right: he now plays alone
        soloOwner = cur; lastChance = false;
        setPhaseUI();
        showToast(t('toast.alone', { name: players[cur].name }), 'good', 1300);
      } else {
        // normal alternation: right answer -> the other player's turn
        cur = 1 - cur;
        updateTurnUI();
        setPhaseUI();
        showToast(t('toast.good'), 'good', 600);
      }
    } else {
      showToast(t('toast.good'), 'good', 600);
    }
  } else {
    // ---- wrong: the right place is NOT revealed ----
    if (mode === 'duo') players[cur].errors++; else soloErrors++;
    holeEl.classList.add('wrong');
    setTimeout(() => holeEl.classList.remove('wrong'), 450);
    sndWrong();
    updateScoresUI();
    flyBack(tile);
    if (mode === 'duo') {
      if (soloOwner === cur || lastChance) {
        // the player who was alone (or who had the last chance) is wrong: game over
        showToast(t('toast.end'), 'bad', 1000);
        finishGame();
        return;
      }
      lastChance = true;                          // the other player gets the chance to play alone
      cur = 1 - cur;
      updateTurnUI();
      setPhaseUI();
      showToast(t('toast.wrong'), 'bad', 800);
    } else {
      showToast(t('toast.wrong'), 'bad', 800);
    }
  }
}

/* =========================================================
   TOAST
   ========================================================= */
let toastTimer = 0;
function showToast(msg, kind, ms) {
  toastEl.textContent = msg;
  toastEl.className = 'toast show' + (kind ? ' ' + kind : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, ms || 900);
}
function hideToast() { toastEl.classList.remove('show'); }

/* =========================================================
   FINISH
   ========================================================= */
function finishGame() {
  phase = 'over';
  cancelAnimationFrame(rafId);
  const my = roundId;
  let title = '', cls = '', statsHTML = '', record = '';

  if (mode === 'solo') {
    const total = HOLES + soloErrors;
    const acc = Math.round((HOLES / total) * 100);
    const b = loadBest();
    const rec = [];
    if (!b.time || playMs < b.time) { b.time = Math.round(playMs); rec.push('time'); }
    if (acc > b.acc) { b.acc = acc; rec.push('acc'); }
    b.played++;
    saveBest(b);
    if (rec.length && b.played > 1) record = t('result.record');
    title = t('result.title');
    statsHTML =
      stat(t('result.score'), HOLES + '/' + HOLES, 'mint') +
      stat(t('result.mistakes'), soloErrors, soloErrors ? 'coral' : 'mint') +
      stat(t('result.time'), fmtTimeLong(playMs)) +
      stat(t('result.accuracy'), acc + '%');
    $('resultStats').className = 'win-stats grid2';
  } else {
    const [a, b2] = players;
    if (a.score === b2.score) { title = t('result.draw'); cls = 'draw'; }
    else { const w = a.score > b2.score ? a : b2; title = w.name.toUpperCase() + ' ' + t('result.winsSuffix'); }
    statsHTML = players.map((p) =>
      '<div class="win-stat ' + (p.color === 'coral' ? 'coral' : '') + '"><span>' + p.name + '</span>' +
      '<strong>' + p.score + ' ' + t('result.points') + '</strong>' +
      '<span class="pname-sm">' + p.errors + ' ' + t('result.errors') + '</span></div>').join('');
    $('resultStats').className = 'win-stats two';
  }

  sndWin();
  setTimeout(() => {
    if (my !== roundId || phase !== 'over') return;
    const banner = $('resultBanner');
    banner.textContent = title;
    banner.className = 'banner' + (cls ? ' ' + cls : '');
    $('resultStats').innerHTML = statsHTML;
    const rm = $('recordMsg');
    rm.textContent = record; rm.classList.toggle('hidden', !record);
    show(elResult);
    triggerConfetti();
  }, 650);
}
function stat(label, value, cls) {
  return '<div class="win-stat ' + (cls || '') + '"><span>' + label + '</span><strong>' + value + '</strong></div>';
}
function triggerConfetti() {
  const container = $('confetti-container');
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
   UI WIRING
   ========================================================= */
document.querySelectorAll('.optbtn.mode').forEach((btn) => {
  btn.addEventListener('click', () => {
    sndClick();
    document.querySelectorAll('.optbtn.mode').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    mode = btn.dataset.mode;
    renderBest();
  });
});
$('startBtn').addEventListener('click', () => { sndClick(); hide(elSetup); startRound(); });
$('setupQuitBtn').addEventListener('click', goHome);

$('helpBtn').addEventListener('click', () => { sndClick(); show(elHelp); });
$('helpCloseBtn').addEventListener('click', () => { sndClick(); hide(elHelp); });

$('pauseBtn').addEventListener('click', () => {
  if (phase !== 'memorize' && phase !== 'play') return;
  sndClick();
  pauseGame();
});
$('resumeBtn').addEventListener('click', () => { sndClick(); resumeGame(); });
$('pauseRestartBtn').addEventListener('click', () => { sndClick(); hide(elPause); startRound(); });
$('pauseMenuBtn').addEventListener('click', goHome);
$('homeBtn').addEventListener('click', goHome);

$('playAgainBtn').addEventListener('click', () => { sndClick(); hide(elResult); startRound(); });
$('newGameBtn').addEventListener('click', () => { sndClick(); hide(elResult); phase = 'setup'; renderBest(); show(elSetup); });
$('resultHomeBtn').addEventListener('click', goHome);

stageEl.addEventListener('contextmenu', (e) => e.preventDefault());

/* ===== INIT ===== */
applyTranslations();
renderBest();
// build a preview board behind the setup sheet so the screen is never empty
(function preview() { mode = 'solo'; buildRound(); stageEl.classList.remove('memorize'); gridEl.querySelectorAll('.hole').forEach((h) => { h.classList.remove('shown'); h.innerHTML = ''; }); phaseText.textContent = ''; })();
