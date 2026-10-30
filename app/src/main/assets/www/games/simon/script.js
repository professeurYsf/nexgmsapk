'use strict';

/* =========================================================
   SOUND MEMORY  (Mémoire sonore)
   Linked to the Game Collection home screen via localStorage:
   - "gc_lang"  -> "en" | "fr"
   - "gc_sound" -> "on" | "off"
   Modes:
   - Solo : the sequence grows by one colour every round; one mistake ends the run.
   - Duel : players alternate. Repeat the whole sequence, then ADD one colour.
            The first player to make a mistake loses.
   ========================================================= */

const STRINGS = {
  en: {
    'game.title': 'Sound Memory',
    'setup.subtitle': 'Repeat the sequence of colours and sounds',
    'setup.mode': 'Game mode',
    'setup.solo': 'Solo',
    'setup.duel': 'Vs a friend',
    'note.solo': 'Repeat the growing sequence. One mistake ends the run — beat your record!',
    'note.duel': 'The computer picks the colours. Both players repeat the same sequence, and the one who goes first alternates every round. If one fails, the other keeps playing until they fail too.',
    'setup.start': 'Start Game',
    'setup.quit': 'Quit',
    'pause.title': 'Game Paused',
    'pause.resume': 'Resume',
    'pause.restart': 'Restart',
    'pause.gameMenu': 'Sound Memory Menu',
    'result.rematch': 'Play again',
    'player.you': 'You',
    'player.p1': 'Player 1',
    'player.p2': 'Player 2',
    'player.best': 'Record', 'player.p1s': 'P1', 'player.p2s': 'P2', 'status.out': 'Out', 'result.draw': 'DRAW!',
    'status.watch': 'Watch…',
    'status.yourTurn': 'Your turn',
    'status.repeat': 'Repeat',
    'status.add': 'Add a colour',
    'result.gameOver': 'GAME OVER',
    'result.newRecord': 'NEW RECORD!',
    'result.best': 'Record',
    'result.p1Wins': 'PLAYER 1 WINS!',
    'result.p2Wins': 'PLAYER 2 WINS!',
    'help.title': 'How To Play',
    'help.line1': 'Watch the colours light up and listen to the sounds.',
    'help.line2': 'Solo: repeat the sequence — it grows by one colour every round and gets faster.',
    'help.line3': 'Vs a friend: the computer picks each new colour (it can repeat the previous one). Both players repeat the sequence; the first player alternates every round.',
    'help.line4': 'One mistake and you are out. If one player fails, the other keeps playing until they fail too — the longest run wins. Your solo record is saved.',
    'help.close': 'Got it'
  },
  fr: {
    'game.title': 'Mémoire Sonore',
    'setup.subtitle': 'Répétez la séquence de couleurs et de sons',
    'setup.mode': 'Mode de jeu',
    'setup.solo': 'Solo',
    'setup.duel': 'Contre un ami',
    'note.solo': 'Répétez la séquence qui s’allonge. Une erreur et c’est fini — battez votre record !',
    'note.duel': 'L’ordinateur choisit les couleurs. Les deux joueurs répètent la même séquence, et celui qui commence change à chaque manche. Si l’un échoue, l’autre continue jusqu’à son échec.',
    'setup.start': 'Commencer',
    'setup.quit': 'Quitter',
    'pause.title': 'Jeu en pause',
    'pause.resume': 'Reprendre',
    'pause.restart': 'Recommencer',
    'pause.gameMenu': 'Menu Mémoire Sonore',
    'result.rematch': 'Rejouer',
    'player.you': 'Vous',
    'player.p1': 'Joueur 1',
    'player.p2': 'Joueur 2',
    'player.best': 'Record', 'player.p1s': 'J1', 'player.p2s': 'J2', 'status.out': 'Éliminé', 'result.draw': 'ÉGALITÉ !',
    'status.watch': 'Regardez…',
    'status.yourTurn': 'À vous',
    'status.repeat': 'Répétez',
    'status.add': 'Ajoutez une couleur',
    'result.gameOver': 'PERDU',
    'result.newRecord': 'NOUVEAU RECORD !',
    'result.best': 'Record',
    'result.p1Wins': 'JOUEUR 1 GAGNE !',
    'result.p2Wins': 'JOUEUR 2 GAGNE !',
    'help.title': 'Comment jouer',
    'help.line1': 'Regardez les couleurs s’allumer et écoutez les sons.',
    'help.line2': 'Solo : répétez la séquence — elle s’allonge d’une couleur à chaque manche et accélère.',
    'help.line3': 'Contre un ami : l’ordinateur choisit chaque nouvelle couleur (il peut répéter la précédente). Les deux joueurs répètent la séquence ; le premier joueur change à chaque manche.',
    'help.line4': 'Une seule erreur et vous êtes éliminé. Si un joueur échoue, l’autre continue jusqu’à son échec — la plus longue série gagne. Votre record solo est enregistré.',
    'help.close': 'Compris'
  }
};

const lang = (localStorage.getItem('gc_lang') === 'fr') ? 'fr' : 'en';
const soundOn = localStorage.getItem('gc_sound') !== 'off';
const $ = (id) => document.getElementById(id);
const t = (key) => (STRINGS[lang] && STRINGS[lang][key]) || STRINGS.en[key] || key;

function applyTranslations() {
  document.documentElement.lang = lang;
  document.title = t('game.title');
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.getAttribute('data-i18n')); });
  const note = $('modeNote');
  if (note) note.textContent = t('note.' + gameMode);
}

/* ---- Sound ---- */
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
  gain.gain.linearRampToValueAtTime(gainPeak || 0.18, t0 + 0.012);
  gain.gain.setValueAtTime(gainPeak || 0.18, t0 + Math.max(0.013, duration - 0.05));
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}
const PAD_FREQ = [415.3, 310.0, 252.0, 209.0];   // the four pad notes
const sndPad = (i, ms) => playTone(PAD_FREQ[i], Math.max(0.12, ms / 1000), 'sine', 0.24, 0);
const sndClick = () => playTone(680, 0.06, 'square', 0.08, 0);
const sndOk = () => [660, 880].forEach((f, k) => playTone(f, 0.12, 'triangle', 0.10, k * 0.08));
const sndWrong = () => playTone(110, 0.55, 'sawtooth', 0.20, 0);
const sndWin = () => [523, 659, 784, 1046].forEach((f, i) => playTone(f, 0.22, 'triangle', 0.16, i * 0.09));

/* =========================================================
   STATE
   ========================================================= */
const BEST_KEY = 'simonBest';
const ABORT = { abort: true };
let gameMode = 'solo';       // 'solo' | 'duel'
let seq = [];                // sequence of pad indexes
let idx = 0;                 // position the player must tap next
let phase = 'idle';          // idle | show | input | add | wait | over
let paused = false;
let flow = 0;                // incremented to cancel any running timed sequence
let cur = 1;                 // duel: player to move
let score = 0;               // solo: completed rounds
let duelScore = [0, 0, 0];   // duel: rounds completed per player (index 1, 2)
let alive = [false, true, true];   // duel: false once a player has made a mistake
let duelFirst = 1;           // duel: who goes first in odd rounds; flips after every finished game
let turnResolve = null;      // duel: resolves when the current player finishes (true) or fails (false)
let best = parseInt(localStorage.getItem(BEST_KEY) || '0', 10) || 0;
let prevBestSnapshot = best;   // record at the start of the current run
let failedPlayer = 1;

const simon = $('simon');
const pads = Array.from(document.querySelectorAll('.pad'));

/* ---- responsive sizing: the pad ring is always the largest square that fits ---- */
function fit() {
  const wrap = document.querySelector('.board-wrap');
  const s = Math.max(180, Math.min(wrap.clientWidth - 24, wrap.clientHeight - 24, 520));
  simon.style.width = s + 'px';
  simon.style.height = s + 'px';
}
window.addEventListener('resize', fit);

/* ---- timing helpers (pause-aware, cancellable) ---- */
async function sleep(ms, tk) {
  let left = ms;
  while (left > 0) {
    if (tk !== flow) throw ABORT;
    const step = Math.min(left, 40);
    await new Promise((r) => setTimeout(r, step));
    if (!paused) left -= step;
  }
  if (tk !== flow) throw ABORT;
}
function guard(fn) {
  return fn().catch((e) => { if (e !== ABORT) throw e; });
}
const stepMs = () => Math.max(230, 660 - Math.max(0, seq.length - 1) * 26);   // gets faster as the sequence grows

function lock(on) { simon.classList.toggle('locked', on); }
function setStatus(key) { $('statusText').textContent = key ? t('status.' + key) : '\u00A0'; }
function setRound() { $('roundNum').textContent = seq.length; }

async function flash(i, ms, tk) {
  pads[i].classList.add('lit');
  sndPad(i, ms);
  await sleep(ms, tk);
  pads[i].classList.remove('lit');
}
function flashUser(i) {
  pads[i].classList.add('lit');
  sndPad(i, 220);
  setTimeout(() => pads[i].classList.remove('lit'), 200);
}
async function playSeq(tk) {
  const step = stepMs();
  for (const i of seq) {
    await sleep(step * 0.38, tk);
    await flash(i, step * 0.62, tk);
  }
  await sleep(150, tk);
}

/* =========================================================
   GAME FLOW
   ========================================================= */
function updateBars() {
  if (gameMode === 'solo') {
    $('scoreBottom').textContent = score;
    $('scoreTop').textContent = best;
    $('dotTop').classList.remove('on'); $('playerTopBar').classList.remove('active-turn');
    $('dotBottom').classList.add('on'); $('playerBottomBar').classList.add('active-turn');
  } else {
    $('scoreBottom').textContent = duelScore[1];
    $('scoreTop').textContent = duelScore[2];
    const finished = phase === 'over';
    [[1, 'Bottom'], [2, 'Top']].forEach(([p, side]) => {
      const turn = cur === p && !finished && alive[p];
      $('dot' + side).classList.toggle('on', turn);
      $('player' + side + 'Bar').classList.toggle('active-turn', turn);
      $('player' + side + 'Bar').classList.toggle('out', !alive[p]);
    });
  }
}

function startGame() {
  flow++;
  const tk = flow;
  seq = []; idx = 0; score = 0; duelScore = [0, 0, 0]; alive = [false, true, true]; turnResolve = null;
  cur = gameMode === 'duel' ? duelFirst : 1; paused = false; phase = 'wait';
  simon.classList.remove('wrong');
  pads.forEach((p) => p.classList.remove('lit'));
  $('nameBottom').textContent = gameMode === 'solo' ? t('player.you') : t('player.p1');
  $('nameTop').textContent = gameMode === 'solo' ? t('player.best') : t('player.p2');
  setRound(); updateBars(); fit();
  guard(async () => {
    lock(true); setStatus('watch');
    await sleep(500, tk);
    if (gameMode === 'solo') await soloNext(tk); else await duelLoop(tk);
  });
}

async function soloNext(tk) {
  phase = 'show'; lock(true); setStatus('watch');
  seq.push(Math.floor(Math.random() * 4));
  setRound();
  await sleep(350, tk);
  await playSeq(tk);
  phase = 'input'; idx = 0; lock(false); setStatus('yourTurn');
}

const who = (p) => t(p === 1 ? 'player.p1s' : 'player.p2s');
const setTurnStatus = (p, key) => { $('statusText').textContent = who(p) + ' · ' + t('status.' + key); };

/* Duel: the COMPUTER adds one colour per round (it may repeat the previous one). Every player still in
   the game repeats the whole sequence; who goes first alternates each round. A player who fails is
   out, the other keeps playing alone until they fail too. Most rounds completed wins. */
async function duelLoop(tk) {
  while (alive[1] || alive[2]) {
    seq.push(Math.floor(Math.random() * 4));
    setRound();
    const act = [1, 2].filter((p) => alive[p]);
    const first = (seq.length % 2 === 1) ? duelFirst : 3 - duelFirst;
    const order = act.length === 2 ? [first, 3 - first] : act;
    for (const p of order) {
      cur = p; phase = 'show'; lock(true); updateBars(); setTurnStatus(p, 'watch');
      await sleep(650, tk);
      await playSeq(tk);
      phase = 'input'; idx = 0; setTurnStatus(p, 'repeat'); lock(false);
      const ok = await new Promise((res) => { turnResolve = res; });
      if (tk !== flow) return;
      phase = 'wait'; lock(true);
      if (ok) { duelScore[p] = seq.length; sndOk(); }
      else { alive[p] = false; setTurnStatus(p, 'out'); }
      updateBars();
      await sleep(ok ? 650 : 1100, tk);
    }
  }
  phase = 'over'; lock(true); updateBars(); setStatus(null);
  setTimeout(showResult, 300);
}
function resolveTurn(ok) {
  const r = turnResolve; turnResolve = null; phase = 'wait';
  if (r) r(ok);
}
function wrongFeedback() {
  sndWrong();
  simon.classList.add('wrong');
  setTimeout(() => simon.classList.remove('wrong'), 500);
}

function onPad(i) {
  if (paused || phase !== 'input') return;
  flashUser(i);
  if (i !== seq[idx]) {
    if (gameMode === 'solo') fail(); else { wrongFeedback(); resolveTurn(false); }
    return;
  }
  idx++;
  if (idx < seq.length) return;
  if (gameMode === 'duel') { resolveTurn(true); return; }
  const tk = flow;
  score = seq.length;
  if (score > best) { best = score; localStorage.setItem(BEST_KEY, String(best)); }
  phase = 'wait'; lock(true); updateBars(); sndOk();
  guard(async () => { await sleep(750, tk); await soloNext(tk); });
}

function fail() {                  // solo only: one mistake ends the run
  flow++;
  phase = 'over'; lock(true);
  sndWrong();
  simon.classList.add('wrong');
  setStatus(null);
  updateBars();
  setTimeout(showResult, 900);
}

function showResult() {
  const panel = document.querySelector('.result-panel');
  const banner = $('resultBanner');
  if (gameMode === 'solo') {
    const record = score > 0 && score > prevBestSnapshot;       // beat the record held when this run started
    panel.classList.add('solo');
    banner.textContent = record ? t('result.newRecord') : t('result.gameOver');
    banner.className = 'banner' + (record ? '' : ' lose');
    $('resultScore').textContent = String(score);
    $('resultTrophy').textContent = t('result.best') + ' ' + best;
    if (record) sndWin();
  } else {
    panel.classList.remove('solo');
    const a1 = duelScore[1], a2 = duelScore[2];
    banner.textContent = a1 === a2 ? t('result.draw') : (a1 > a2 ? t('result.p1Wins') : t('result.p2Wins'));
    banner.className = 'banner' + (a1 === a2 ? ' draw' : '');
    $('resultScore').textContent = a1 + ' - ' + a2;
    $('resultTrophy').textContent = a1 === a2 ? '+0' : '+1';
    $('resAvatarRight').innerHTML = P2_AVATAR_SVG;
    if (a1 !== a2) sndWin();
    duelFirst = 3 - duelFirst;      // next game: the other player starts
  }
  $('resultOverlay').classList.remove('hidden');
}

/* ===== INPUT ===== */
pads.forEach((p) => {
  p.addEventListener('pointerdown', (e) => { e.preventDefault(); onPad(parseInt(p.dataset.i, 10)); });
});

/* ===== UI WIRING ===== */
const P2_AVATAR_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8"/></svg>';

document.querySelectorAll('.optbtn.mode').forEach((btn) => {
  btn.addEventListener('click', () => {
    sndClick();
    document.querySelectorAll('.optbtn.mode').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    gameMode = btn.dataset.mode;
    $('modeNote').textContent = t('note.' + gameMode);
  });
});

$('startBtn').addEventListener('click', () => {
  sndClick();
  prevBestSnapshot = best;
  $('avatarTopIcon').outerHTML = P2_AVATAR_SVG.replace('<svg ', '<svg id="avatarTopIcon" ');
  $('setupOverlay').classList.add('hidden');
  startGame();
});
$('rematchBtn').addEventListener('click', () => {
  sndClick();
  prevBestSnapshot = best;
  $('resultOverlay').classList.add('hidden');
  startGame();
});

function goHome() { flow++; sndClick(); GC.goHome(); }
$('setupQuitBtn').addEventListener('click', goHome);
$('homeBtn').addEventListener('click', goHome);

$('helpBtn').addEventListener('click', () => { sndClick(); $('helpOverlay').classList.remove('hidden'); });
$('helpCloseBtn').addEventListener('click', () => { sndClick(); $('helpOverlay').classList.add('hidden'); });

function goToGameMenu() {
  sndClick();
  flow++; paused = false; phase = 'idle'; turnResolve = null;
  pads.forEach((p) => p.classList.remove('lit'));
  $('resultOverlay').classList.add('hidden');
  $('pauseOverlay').classList.add('hidden');
  $('setupOverlay').classList.remove('hidden');
}
$('quitBtn').addEventListener('click', goToGameMenu);
$('pauseMenuBtn').addEventListener('click', goToGameMenu);

$('pauseBtn').addEventListener('click', () => {
  const setupOpen = !$('setupOverlay').classList.contains('hidden');
  const resultOpen = !$('resultOverlay').classList.contains('hidden');
  if (setupOpen || resultOpen || phase === 'over' || phase === 'idle') return;
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
  prevBestSnapshot = best;
  startGame();
});

/* ===== INIT ===== */
applyTranslations();
fit();
