'use strict';

/* =========================================================
   COIN SHUFFLE MEMORY
   Linked to the Game Collection via localStorage:
   - "gc_lang"  -> "en" | "fr"      - "gc_sound" -> "on" | "off"
   Own storage: "gc_coinshuffle_best2" -> best solo score (out of 4)

   Truth lives in data only: `occ[slot] = coinId`, `slotOf[coinId] = slot`,
   `redId` / `blueId`. The permutation is updated when each swap finishes;
   answers are checked against it, never against the DOM.
   A single requestAnimationFrame loop drives every timer and animation,
   so pause / restart can never stack timers.
   ========================================================= */

const STRINGS = {
  en: {
    title:'Coin Shuffle Memory', subtitle:'Follow the coin. Trust your memory.', mode:'Game mode', solo:'1 Player', duo:'2 Players',
    difficulty:'Difficulty', easy:'Easy', medium:'Medium', hard:'Hard', expert:'Very Hard', best:'Best',
    soloNote:'4 rounds, harder each time: Easy, Medium, Hard, Very Hard.', duoNote:'4 stages, harder each time. P1 follows the red coin, P2 the blue one.', rotateTip:'Tip: rotate your phone to landscape for a bigger board.',
    start:'Start Game', quit:'Quit', paused:'Game Paused', resume:'Resume', restart:'Restart', home:'Back Home',
    helpTitle:'How To Play', gotit:'Got it',
    h1:'Memorise where the special coin is: red for you (and blue for Player 2).',
    h2:'All coins flip face down and swap places.',
    h3:'When they stop you have 5 seconds to pick the coin you followed. No pick = stage lost.',
    h4:'1 player: 4 coins, 4 rounds: Easy, Medium, Hard, Very Hard.',
    h5:'2 players: 5 coins, 4 stages. Each player picks on their own side (P1 bottom, P2 top). You may pick the same coin.',
    p1:'Player 1', p2:'Player 2', round:'Round', stage:'Stage', score:'Score', level:'Level',
    mRevealSolo:'Memorise the red coin!', mRevealDuo:'P1: red coin · P2: blue coin', mFlip:'Get ready…', mShuffle:'Follow your coin!',
    mPickSolo:'Where is the red coin?', mPickDuo:'Pick your coin!', mWait:'Waiting for the other player…',
    mCorrect:'Correct! +1', mWrong:'Wrong!', mTime:"Time's up!", lockedTxt:'Locked', timeoutTxt:"Time's up",
    again:'Play Again', newGame:'New Game', gameover:'Game Over', great:'Great memory!', goodjob:'Good job!', tryagain:'Keep practising!',
    draw:'DRAW!', wins:'WINS!', record:'New best!', points:'pts', next:'Next'
  },
  fr: {
    title:'Mémoire des Pièces', subtitle:'Suivez la pièce. Fiez-vous à votre mémoire.', mode:'Mode de jeu', solo:'1 Joueur', duo:'2 Joueurs',
    difficulty:'Difficulté', easy:'Facile', medium:'Moyen', hard:'Difficile', expert:'Très difficile', best:'Record',
    soloNote:'4 tours, de plus en plus durs : Facile, Moyen, Difficile, Très difficile.', duoNote:'4 manches, de plus en plus dures. J1 suit la pièce rouge, J2 la bleue.', rotateTip:'Astuce : tournez votre téléphone en paysage pour un plateau plus grand.',
    start:'Commencer', quit:'Quitter', paused:'Jeu en pause', resume:'Continuer', restart:'Recommencer', home:"Retour à l'accueil",
    helpTitle:'Comment jouer', gotit:'Compris',
    h1:'Mémorisez la place de la pièce spéciale : rouge pour vous (et bleue pour le joueur 2).',
    h2:'Toutes les pièces se retournent et échangent leur place.',
    h3:'Quand elles s’arrêtent, vous avez 5 secondes pour choisir la pièce suivie. Pas de choix = manche perdue.',
    h4:'1 joueur : 4 pièces, 4 tours : Facile, Moyen, Difficile, Très difficile.',
    h5:'2 joueurs : 5 pièces, 4 manches. Chacun choisit de son côté (J1 en bas, J2 en haut). Vous pouvez choisir la même pièce.',
    p1:'Joueur 1', p2:'Joueur 2', round:'Tour', stage:'Manche', score:'Score', level:'Niveau',
    mRevealSolo:'Mémorisez la pièce rouge !', mRevealDuo:'J1 : pièce rouge · J2 : pièce bleue', mFlip:'Préparez-vous…', mShuffle:'Suivez votre pièce !',
    mPickSolo:'Où est la pièce rouge ?', mPickDuo:'Choisissez votre pièce !', mWait:"En attente de l'autre joueur…",
    mCorrect:'Correct ! +1', mWrong:'Raté !', mTime:'Temps écoulé !', lockedTxt:'Validé', timeoutTxt:'Temps écoulé',
    again:'Rejouer', newGame:'Nouvelle partie', gameover:'Partie terminée', great:'Super mémoire !', goodjob:'Bien joué !', tryagain:'Continuez à vous entraîner !',
    draw:'ÉGALITÉ !', wins:'GAGNE !', record:'Nouveau record !', points:'pts', next:'Suivant'
  }
};
const lang = localStorage.getItem('gc_lang') === 'fr' ? 'fr' : 'en';
const t = (k) => STRINGS[lang][k] || STRINGS.en[k] || k;
const $ = (id) => document.getElementById(id);
document.documentElement.lang = lang;
document.title = t('title');
document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });

/* ---- sound ---- */
const soundOn = localStorage.getItem('gc_sound') !== 'off';
let actx = null;
function tone(f, d, type, v, delay) {
  if (!soundOn) return;
  try {
    if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
    const t0 = actx.currentTime + (delay || 0), o = actx.createOscillator(), g = actx.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t0);
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(v || .1, t0 + .01);
    g.gain.exponentialRampToValueAtTime(.001, t0 + d);
    o.connect(g).connect(actx.destination); o.start(t0); o.stop(t0 + d + .02);
  } catch (e) { /* ignore */ }
}
const sfx = {
  click: () => tone(680, .06, 'square', .07),
  tick: () => tone(900, .05, 'sine', .06),
  flip: () => tone(420, .12, 'triangle', .12),
  swap: () => tone(260, .07, 'sine', .05),
  pick: () => tone(560, .08, 'triangle', .12),
  good: () => [660, 880].forEach((f, i) => tone(f, .16, 'triangle', .14, i * .08)),
  bad: () => tone(200, .22, 'sawtooth', .09),
  win: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, .22, 'triangle', .15, i * .09))
};

/* ---- config ---- */
const LEVELS = {
  easy:   { swaps: 5,  dur: 620, dbl: 0 },
  medium: { swaps: 10, dur: 440, dbl: .15 },
  hard:   { swaps: 17, dur: 320, dbl: .4 },
  expert: { swaps: 22, dur: 230, dbl: .6 }
};
const LEVEL_ORDER = ['easy', 'medium', 'hard', 'expert'];
const PICK_MS = 5000;                 // time to answer once the coins stop
const REVEAL_MS = { solo: 2200, duo: 3200 };
const SOLO_ROUNDS = 4, DUO_STAGES = 4;

/* ---- state ---- */
let mode = 'solo';
let N = 4, total = SOLO_ROUNDS, round = 0;
let score = [0, 0], history = [];
let redId = 0, blueId = -1;
let occ = [], slotOf = [], coinEls = [];
let steps = [], stepIdx = 0, tw = null;
let phase = 'setup';                  // setup | reveal | flip | shuffle | settle | pick | result | over
let timer = 0, timerMax = 1, lastCount = -1;
let choices = [null, null];
let paused = false, lastT = 0, rafId = 0, runId = 0;
let D = 60, areaW = 300, areaH = 200;

const areaEl = $('area'), stageEl = $('stage'), msgEl = $('msg');
const picksTop = $('picksTop'), picksBot = $('picksBot');

const show = (el) => el.classList.remove('hidden');
const hide = (el) => el.classList.add('hidden');
function goHome() {
  sfx.click();
  try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch (e) { /* ignore */ }
  GC.goHome();
}
const rnd = (n) => Math.floor(Math.random() * n);
const ease = (p) => (p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);

/* ---- best scores ---- */
const BEST_KEY = 'gc_coinshuffle_best2';
function loadBest() { try { return parseInt(localStorage.getItem(BEST_KEY), 10) || 0; } catch (e) { return 0; } }
function saveBest(v) { try { localStorage.setItem(BEST_KEY, String(v)); } catch (e) { /* ignore */ } }
function renderBest() { const v = loadBest(); $('bestVal').textContent = v ? v + '/' + SOLO_ROUNDS : '–'; }

/* ---- svg bits ---- */
const STAR = '<svg viewBox="0 0 24 24"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6L2.5 9.4l6.6-.8z"/></svg>';
const EMBLEM = '<svg viewBox="0 0 24 24"><path d="M12 3l8 9-8 9-8-9z"/></svg>';
const CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>';

/* ---- layout ---- */
function sizeArea() {
  areaW = areaEl.clientWidth; areaH = areaEl.clientHeight;
  if (areaW <= 0 || areaH <= 0) return;
  D = Math.max(34, Math.floor(Math.min(areaW / N * 0.8, areaH * 0.58)));
  areaEl.style.setProperty('--D', D + 'px');
  stageEl.style.setProperty('--n', N);
  if (!tw) placeAll();
}
const slotX = (s) => (s + .5) * areaW / N - D / 2;
const baseY = () => (areaH - D) / 2;
function setPos(el, x, y) { el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)'; }
function placeAll() { for (let c = 0; c < coinEls.length; c++) setPos(coinEls[c], slotX(slotOf[c]), baseY()); }
let sizeRAF = 0;
const scheduleSize = () => { cancelAnimationFrame(sizeRAF); sizeRAF = requestAnimationFrame(sizeArea); };
window.addEventListener('resize', scheduleSize);
window.addEventListener('orientationchange', () => setTimeout(scheduleSize, 250));
if (window.ResizeObserver) new ResizeObserver(scheduleSize).observe(areaEl);

/* ---- HUD / messages ---- */
function chip(cls, inner) { return '<div class="chip ' + cls + '">' + inner + '</div>'; }
function renderHud() {
  const lv = t(currentLevel());
  if (mode === 'solo') {
    $('hud').innerHTML =
      chip('', t('round') + ' <b>' + Math.min(round + 1, total) + '/' + total + '</b>') +
      chip('', t('score') + ' <b>' + score[0] + '</b>') +
      chip('', t('level') + ' <b>' + lv + '</b>');
  } else {
    $('hud').innerHTML =
      chip('red', '<i class="dot"></i><b>' + score[0] + '</b>') +
      chip('grow', t('stage') + ' <b>' + Math.min(round + 1, total) + '/' + total + '</b> · <b>' + t(LEVEL_ORDER[Math.min(round, 3)]) + '</b>') +
      chip('blue', '<b>' + score[1] + '</b><i class="dot"></i>');
  }
}
function setMsg(text, cls) { $('msgText').textContent = text; msgEl.className = 'msg' + (cls ? ' ' + cls : ''); }
function setCount(ms, max) {
  const bar = $('bar');
  if (max) { bar.style.transform = 'scaleX(' + Math.max(0, ms / max).toFixed(4) + ')'; const c = Math.ceil(ms / 1000); if (c !== lastCount) { lastCount = c; $('msgCount').textContent = c > 0 ? c : ''; if (c > 0 && phase === 'pick' && c <= 3) sfx.tick(); } }
  else { bar.style.transform = 'scaleX(0)'; $('msgCount').textContent = ''; lastCount = -1; }
}

/* ---- pickers (2 players) ---- */
function buildPickers() {
  [[picksBot, 'red', 0], [picksTop, 'blue', 1]].forEach(([el, color, p]) => {
    el.className = 'picks ' + color + (el === picksTop ? ' top' : ' bottom');
    el.innerHTML = '';
    for (let s = 0; s < N; s++) {
      const b = document.createElement('button');
      b.className = 'pick'; b.textContent = s + 1; b.setAttribute('aria-label', (p ? 'P2 ' : 'P1 ') + (s + 1));
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); choose(p, s); });
      el.appendChild(b);
    }
    const lock = document.createElement('div'); lock.className = 'lock'; lock.innerHTML = CHECK + '<span></span>';
    el.appendChild(lock);
  });
}
function setPickers(state) {   // 'idle' | 'ready'
  [picksTop, picksBot].forEach((el) => { el.classList.remove('ready', 'locked'); if (state === 'ready') el.classList.add('ready'); });
}
function lockPicker(p, timeout) {
  const el = p === 0 ? picksBot : picksTop;
  el.classList.remove('ready'); el.classList.add('locked');
  el.querySelector('.lock span').textContent = timeout ? t('timeoutTxt') : t('lockedTxt');   // never shows WHICH coin was chosen
}

/* ---- coins ---- */
function buildCoins() {
  areaEl.innerHTML = '';
  coinEls = [];
  for (let c = 0; c < N; c++) {
    const el = document.createElement('div');
    const kind = c === redId ? 'red' : (mode === 'duo' && c === blueId) ? 'blue' : 'silver';
    el.className = 'coin pop';
    el.style.animationDelay = (c * 50) + 'ms';
    el.innerHTML = '<div class="inner"><div class="face front ' + kind + '">' + STAR + '</div><div class="face back">' + EMBLEM + '</div></div>';
    el.dataset.slot = '';
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); if (mode === 'solo') choose(0, slotOf[c]); });
    areaEl.appendChild(el);
    coinEls.push(el);
  }
  placeAll();
}

/* ---- shuffle generation ---- */
function interleaved(a, b, c, d) { // pairs (a,b) and (c,d), a<b, c<d
  const inC = c > a && c < b, inD = d > a && d < b;
  return inC !== inD;
}
function genSteps(cfg) {
  for (let attempt = 0; attempt < 60; attempt++) {
    const list = []; let prev = '';
    while (list.length < cfg.swaps) {
      let a = rnd(N), b = rnd(N); if (a === b) continue;
      if (a > b) [a, b] = [b, a];
      const key = a + '-' + b; if (key === prev) continue;
      const step = [[a, b]];
      if (Math.random() < cfg.dbl && N >= 4) {
        const rest = []; for (let s = 0; s < N; s++) if (s !== a && s !== b) rest.push(s);
        let c = rest[rnd(rest.length)], d = rest[rnd(rest.length)];
        if (c !== d) { if (c > d) [c, d] = [d, c]; if (!interleaved(a, b, c, d)) step.push([c, d]); }
      }
      list.push(step); prev = key;
    }
    // the tracked coin(s) must really move (at least 2 times)
    const moves = (id) => { let pos = id, n = 0; list.forEach((st) => st.forEach(([a, b]) => { if (pos === a) { pos = b; n++; } else if (pos === b) { pos = a; n++; } })); return n; };
    if (moves(redId) >= 2 && (mode !== 'duo' || moves(blueId) >= 2)) return list;
  }
  return [[[0, N - 1]], [[1, 2]], [[0, 2]], [[1, N - 1]]];
}

/* ---- game flow ---- */
function currentLevel() { return LEVEL_ORDER[Math.min(round, 3)]; }

function newGame() {
  runId++;
  N = mode === 'duo' ? 5 : 4;
  total = mode === 'duo' ? DUO_STAGES : SOLO_ROUNDS;
  round = 0; score = [0, 0]; history = [];
  stageEl.classList.toggle('duo', mode === 'duo');
  if (mode === 'duo') buildPickers();
  startRound();
  cancelAnimationFrame(rafId); lastT = performance.now(); paused = false;
  rafId = requestAnimationFrame(loop);
}
function startRound() {
  redId = rnd(N);
  if (mode === 'duo') { do { blueId = rnd(N); } while (blueId === redId); } else blueId = -1;
  occ = []; slotOf = [];
  for (let i = 0; i < N; i++) { occ[i] = i; slotOf[i] = i; }
  choices = [null, null]; tw = null; steps = []; stepIdx = 0;
  sizeArea();
  buildCoins();
  coinEls[redId].classList.add('target');
  if (mode === 'duo') coinEls[blueId].classList.add('target');
  if (mode === 'duo') setPickers('idle');
  renderHud();
  phase = 'reveal'; timerMax = timer = REVEAL_MS[mode]; lastCount = -1;
  setMsg(mode === 'duo' ? t('mRevealDuo') : t('mRevealSolo'));
}

function loop(now) {
  const dt = Math.min(100, now - lastT); lastT = now;
  if (!paused) step(dt);
  if (phase !== 'over' && phase !== 'setup') rafId = requestAnimationFrame(loop);
}

function step(dt) {
  switch (phase) {
    case 'reveal':
      timer -= dt; setCount(timer, timerMax);
      if (timer <= 0) {
        coinEls.forEach((el) => el.classList.remove('target'));
        coinEls.forEach((el) => el.classList.add('back'));    // flip face down
        sfx.flip(); phase = 'flip'; timer = 700; setCount(0); setMsg(t('mFlip'));
      }
      break;
    case 'flip':
      timer -= dt;
      if (timer <= 0) { steps = genSteps(LEVELS[currentLevel()]); stepIdx = 0; phase = 'shuffle'; setMsg(t('mShuffle')); startStep(); }
      break;
    case 'shuffle':
      if (tw) {
        tw.t += dt;
        const cfg = LEVELS[currentLevel()], p = Math.min(1, tw.t / cfg.dur), e = ease(p);
        tw.pairs.forEach((pr) => {
          const xa = slotX(pr.a), xb = slotX(pr.b), arc = Math.min(Math.abs(xb - xa) * .32 + D * .12, (areaH - D) / 2 - 2) * Math.sin(Math.PI * p);
          setPos(coinEls[pr.ca], xa + (xb - xa) * e, baseY() - arc);
          setPos(coinEls[pr.cb], xb + (xa - xb) * e, baseY() + arc);
        });
        if (p >= 1) {
          tw.pairs.forEach((pr) => { occ[pr.a] = pr.cb; occ[pr.b] = pr.ca; slotOf[pr.cb] = pr.a; slotOf[pr.ca] = pr.b; });
          placeAll(); tw = null; stepIdx++; timer = cfg.dur * .1;
        }
      } else {
        timer -= dt;
        if (timer <= 0) startStep();
      }
      break;
    case 'settle':
      timer -= dt;
      if (timer <= 0) beginPick();
      break;
    case 'pick':
      timer -= dt; setCount(timer, PICK_MS);
      if (timer <= 0) resolve();
      break;
    case 'result':
      timer -= dt;
      if (timer <= 0) afterResult();
      break;
    default: break;
  }
}
function startStep() {
  if (stepIdx >= steps.length) { phase = 'settle'; timer = 350; tw = null; return; }
  tw = { t: 0, pairs: steps[stepIdx].map(([a, b]) => ({ a, b, ca: occ[a], cb: occ[b] })) };
  sfx.swap();
}
function beginPick() {
  phase = 'pick'; timer = PICK_MS; lastCount = -1;
  choices = [null, null];
  setMsg(mode === 'duo' ? t('mPickDuo') : t('mPickSolo'));
  if (mode === 'duo') setPickers('ready');
  else coinEls.forEach((el) => el.classList.add('pick-me'));
}
function choose(p, slot) {
  if (phase !== 'pick' || paused || choices[p] !== null) return;
  if (mode === 'solo' && p !== 0) return;
  choices[p] = slot; sfx.pick();
  if (mode === 'duo') lockPicker(p, false);
  const need = mode === 'duo' ? 2 : 1;
  if (choices.slice(0, need).every((c) => c !== null)) resolve();
  else if (mode === 'duo') setMsg(t('mWait'));
}

/** Compare the stored choices with the permutation, then flip every coin face up. */
function resolve() {
  if (phase !== 'pick') return;
  phase = 'result'; timer = 2600; setCount(0);
  const need = mode === 'duo' ? 2 : 1;
  const correct = [slotOf[redId], mode === 'duo' ? slotOf[blueId] : -1];
  const res = [];
  for (let p = 0; p < need; p++) {
    const ok = choices[p] !== null && choices[p] === correct[p];
    res.push({ ok, none: choices[p] === null });
    if (ok) score[p]++;
    if (mode === 'duo' && choices[p] === null) lockPicker(p, true);
  }
  history.push(res.map((r) => r.ok));
  setPickers('idle');
  // reveal
  coinEls.forEach((el) => { el.classList.remove('back', 'pick-me'); });
  coinEls[redId].classList.add('answer');
  if (mode === 'duo') coinEls[blueId].classList.add('answer');
  res.forEach((r, p) => {
    if (choices[p] === null) return;
    const bd = document.createElement('div');
    bd.className = 'badge ' + (r.ok ? 'ok' : 'no') + (mode === 'duo' ? (p === 0 ? ' p1 b' : ' p2 t') : ' b');
    bd.innerHTML = (mode === 'duo' ? 'P' + (p + 1) + ' ' : '') + (r.ok ? '✓' : '✗');
    coinEls[occ[choices[p]]].appendChild(bd);
  });
  sfx.flip();
  if (mode === 'solo') {
    const r = res[0];
    setMsg(r.none ? t('mTime') : r.ok ? t('mCorrect') : t('mWrong'), r.ok ? 'good' : 'bad');
    setTimeout(() => (r.ok ? sfx.good() : sfx.bad()), 250);
  } else {
    setMsg('P1 ' + (res[0].ok ? '✓' : '✗') + '   ·   P2 ' + (res[1].ok ? '✓' : '✗'), res[0].ok || res[1].ok ? 'good' : 'bad');
    setTimeout(() => ((res[0].ok || res[1].ok) ? sfx.good() : sfx.bad()), 250);
  }
  renderHud();
}
function afterResult() {
  round++;
  if (round >= total) { finish(); return; }
  renderHud();
  startRound();
}

/* ---- finish ---- */
function finish() {
  phase = 'over'; cancelAnimationFrame(rafId);
  let banner = '', record = '', stats = '', cls = '';
  if (mode === 'solo') {
    if (score[0] > loadBest()) { saveBest(score[0]); record = t('record'); }
    banner = score[0] >= 4 ? t('great') : score[0] >= 3 ? t('goodjob') : t('tryagain');
    stats = '<div class="win-stat"><span>' + t('score') + '</span><strong>' + score[0] + '/' + total + '</strong></div>' +
            '<div class="win-stat"><span>' + t('best') + '</span><strong>' + loadBest() + '/' + total + '</strong></div>';
  } else {
    if (score[0] === score[1]) { banner = t('draw'); cls = 'draw'; }
    else banner = (score[0] > score[1] ? t('p1') : t('p2')).toUpperCase() + ' ' + t('wins');
    stats = '<div class="win-stat red"><span>' + t('p1') + '</span><strong>' + score[0] + ' ' + t('points') + '</strong></div>' +
            '<div class="win-stat blue"><span>' + t('p2') + '</span><strong>' + score[1] + ' ' + t('points') + '</strong></div>';
  }
  $('banner').textContent = banner; $('banner').className = 'banner' + (cls ? ' ' + cls : '');
  const rm = $('recordMsg'); rm.textContent = record; rm.classList.toggle('hidden', !record);
  $('resultStats').innerHTML = stats;
  $('roundsList').innerHTML = history.map((h, i) => '<span class="r">' + (i + 1) + ': ' + h.map((ok, p) => (mode === 'duo' ? 'P' + (p + 1) + ' ' : '') + '<b class="' + (ok ? 'ok">✓' : 'no">✗') + '</b>').join(' ') + '</span>').join('');
  sfx.win();
  const id = runId;
  setTimeout(() => { if (id === runId && phase === 'over') { show($('resultOverlay')); confetti(); } }, 400);
}
function confetti() {
  const c = $('confetti-container'); c.innerHTML = '';
  const cols = ['#6C5CE7', '#17B6CE', '#FF5E72', '#FFA93E', '#1FC79B'];
  for (let i = 0; i < 50; i++) {
    const d = document.createElement('div'); d.className = 'confetti';
    d.style.left = Math.random() * 100 + '%'; d.style.backgroundColor = cols[rnd(cols.length)];
    d.style.animationDuration = (Math.random() * 2 + 2) + 's'; d.style.animationDelay = Math.random() * .5 + 's';
    c.appendChild(d);
  }
}

/* ---- pause ---- */
function pauseGame() {
  if (paused || phase === 'setup' || phase === 'over') return;
  paused = true; show($('pauseOverlay'));
}
function resumeGame() { paused = false; lastT = performance.now(); hide($('pauseOverlay')); }
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); });

/* ---- UI wiring ---- */
document.querySelectorAll('.optbtn.mode').forEach((b) => b.addEventListener('click', () => {
  sfx.click();
  document.querySelectorAll('.optbtn.mode').forEach((x) => x.classList.remove('active')); b.classList.add('active');
  mode = b.dataset.mode;
  $('levelSection').classList.toggle('hidden', mode === 'duo');
  $('duoNote').classList.toggle('hidden', mode !== 'duo');
}));
function beginFromSetup() {
  hide($('setupOverlay')); hide($('pauseOverlay')); hide($('resultOverlay'));
  try { if (matchMedia('(pointer:coarse)').matches && screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {}); } catch (e) { /* ignore */ }
  newGame();
}
$('startBtn').onclick = () => { sfx.click(); beginFromSetup(); };
$('setupQuit').onclick = goHome;
$('helpBtn').onclick = () => { sfx.click(); show($('helpOverlay')); };
$('helpClose').onclick = () => { sfx.click(); hide($('helpOverlay')); };
$('pauseBtn').onclick = () => { if (phase === 'setup' || phase === 'over') return; sfx.click(); pauseGame(); };
$('resumeBtn').onclick = () => { sfx.click(); resumeGame(); };
$('pauseRestart').onclick = () => { sfx.click(); hide($('pauseOverlay')); beginFromSetup(); };
$('pauseHome').onclick = goHome;
$('againBtn').onclick = () => { sfx.click(); beginFromSetup(); };
$('newBtn').onclick = () => { sfx.click(); hide($('resultOverlay')); phase = 'setup'; runId++; renderBest(); show($('setupOverlay')); };
$('resultHome').onclick = goHome;
$('homeBtn').onclick = goHome;

/* ---- init ---- */
renderBest(); renderHud();
setMsg(t('subtitle'));
sizeArea();
