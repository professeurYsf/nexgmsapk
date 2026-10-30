'use strict';

/* =========================================================
   COLOR CONNECT  (Couleurs connectées)
   Linked to the Game Collection home screen via localStorage:
   - "gc_lang"  -> "en" | "fr"
   - "gc_sound" -> "on" | "off"
   Levels come from levels.js (FLOW_LEVELS, 40 levels, easy -> hard).
   ========================================================= */

const STRINGS = {
  en: {
    'game.title': 'Color Connect',
    'setup.subtitle': 'Connect matching colours and fill the grid',
    'setup.quit': 'Quit',
    'levels.pick': 'Choose a level',
    'stat.level': 'Level', 'stat.moves': 'Moves', 'stat.hint': 'Hint',
    'pause.title': 'Game Paused', 'pause.resume': 'Resume', 'pause.restart': 'Restart level', 'pause.gameMenu': 'Levels',
    'result.complete': 'LEVEL COMPLETE!', 'result.allDone': 'ALL 40 LEVELS DONE!',
    'result.next': 'Next level', 'result.retry': 'Replay', 'result.levels': 'Levels',
    'result.moves': 'moves', 'result.noHint': 'No hint used', 'result.hints': 'hints used',
    'toast.points': 'Not enough points',
    'help.title': 'How To Play',
    'help.line1': 'Drag from a dot to the dot of the same colour to connect them.',
    'help.line2': 'Paths cannot cross: drawing over another path cuts it.',
    'help.line3': 'Fill every square of the grid to complete the level.',
    'help.line4': 'Stuck? Use a hint: 2 free per level, then watch a short ad for each extra hint.',
    'help.close': 'Got it'
  },
  fr: {
    'game.title': 'Couleurs connectées',
    'setup.subtitle': 'Reliez les couleurs et remplissez la grille',
    'setup.quit': 'Quitter',
    'levels.pick': 'Choisissez un niveau',
    'stat.level': 'Niveau', 'stat.moves': 'Coups', 'stat.hint': 'Indice',
    'pause.title': 'Jeu en pause', 'pause.resume': 'Reprendre', 'pause.restart': 'Recommencer le niveau', 'pause.gameMenu': 'Niveaux',
    'result.complete': 'NIVEAU TERMINÉ !', 'result.allDone': 'LES 40 NIVEAUX TERMINÉS !',
    'result.next': 'Niveau suivant', 'result.retry': 'Rejouer', 'result.levels': 'Niveaux',
    'result.moves': 'coups', 'result.noHint': 'Aucun indice utilisé', 'result.hints': 'indices utilisés',
    'toast.points': 'Points insuffisants',
    'help.title': 'Comment jouer',
    'help.line1': 'Glissez d’un point vers le point de la même couleur pour les relier.',
    'help.line2': 'Les chemins ne peuvent pas se croiser : tracer sur un autre chemin le coupe.',
    'help.line3': 'Remplissez toutes les cases de la grille pour terminer le niveau.',
    'help.line4': 'Bloqué ? Utilisez un indice : 2 gratuits par niveau, puis une courte publicité par indice supplémentaire.',
    'help.close': 'Compris'
  }
};
const lang = (localStorage.getItem('gc_lang') === 'fr') ? 'fr' : 'en';
const soundOn = localStorage.getItem('gc_sound') !== 'off';
const $ = (id) => document.getElementById(id);
const t = (k) => (STRINGS[lang] && STRINGS[lang][k]) || STRINGS.en[k] || k;
function applyTranslations() {
  document.documentElement.lang = lang;
  document.title = t('game.title');
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.getAttribute('data-i18n')); });
}

/* ---- Sound ---- */
let audioCtx = null;
function getAudioCtx() {
  if (!soundOn) return null;
  if (!audioCtx) { try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}
function playTone(freq, duration, type, gain, delay) {
  const ctx = getAudioCtx(); if (!ctx) return;
  const t0 = ctx.currentTime + (delay || 0);
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(gain || 0.15, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
  o.connect(g).connect(ctx.destination); o.start(t0); o.stop(t0 + duration + 0.02);
}
const sndClick = () => playTone(680, 0.06, 'square', 0.08);
const sndLink = () => [600, 800].forEach((f, i) => playTone(f, 0.12, 'triangle', 0.13, i * 0.07));
const sndWin = () => [523, 659, 784, 1046].forEach((f, i) => playTone(f, 0.22, 'triangle', 0.16, i * 0.09));

/* =========================================================
   CONFIG
   ========================================================= */
const COLORS = ['#FF5E72', '#4B8BFF', '#1FC79B', '#FFC93C', '#FF8A3D', '#8E5CF7', '#17B6CE', '#FF7AC6', '#A0674B', '#7BC24A'];
const FREE_HINTS = 2;
let HX = 0;
/* Points hook: the points system is not linked yet, so extra hints are free for now.
   When the main interface has a points wallet, set enabled:true (it reads/writes "gc_points"). */
const POINTS = { enabled: false, hintCost: 1 };
function payForHint() {
  if (!POINTS.enabled) return true;
  const p = parseInt(localStorage.getItem('gc_points') || '0', 10) || 0;
  if (p < POINTS.hintCost) return false;
  localStorage.setItem('gc_points', String(p - POINTS.hintCost));
  return true;
}
const PROG_KEY = 'flowProgress', HINT_KEY = 'flowHints';
const readJSON = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } };
const writeJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } };

/* =========================================================
   STATE
   ========================================================= */
let lv = 0, n = 5, K = 0;
let ends = [], sol = [], paths = [], endColor = [], own = [];
let winTimer = 0;
let active = -1, snapshot = '', moves = 0, hintsUsed = 0, solved = false, paused = false, CS = 40;

const canvas = $('board');
const ctx = canvas.getContext('2d');

function rebuildOwner() {
  own = new Array(n * n).fill(-1);
  paths.forEach((p, c) => p.forEach((x) => { own[x] = c; }));
}
function complete(c) {
  const p = paths[c];
  return p.length >= 2 && p[0] !== p[p.length - 1] && ends[c].includes(p[0]) && ends[c].includes(p[p.length - 1]);
}
function allSolved() {
  let cnt = 0;
  for (let c = 0; c < K; c++) { if (!complete(c)) return false; cnt += paths[c].length; }
  return cnt === n * n;
}

function loadLevel(i) {
  clearTimeout(winTimer);        // a pending 'level complete' popup must never leak into another level
  lv = i;
  const L = FLOW_LEVELS[i];
  n = L.n; K = L.p.length; sol = L.p;
  ends = sol.map((p) => [p[0], p[p.length - 1]]);
  paths = ends.map(() => []);
  endColor = new Array(n * n).fill(-1);
  ends.forEach((e, c) => { endColor[e[0]] = c; endColor[e[1]] = c; });
  rebuildOwner();
  active = -1; moves = 0; solved = false; paused = false;
  hintsUsed = readJSON(HINT_KEY, {})[i] || 0;
  $('lvlNum').textContent = (i + 1);
  updateHud();
  resizeCanvas();
}
function updateHud() {
  $('moveNum').textContent = moves;
  const free = Math.max(0, FREE_HINTS - hintsUsed);
  $('hintBadge').textContent = free > 0 ? String(free) : 'AD';
}

/* ===== CANVAS (responsive) ===== */
function resizeCanvas() {
  const wrap = document.querySelector('.board-wrap');
  const avail = Math.min(wrap.clientWidth - 24 - 18, wrap.clientHeight - 24 - 18);
  CS = Math.max(24, Math.floor(avail / n));
  const S = CS * n, dpr = window.devicePixelRatio || 1;
  canvas.style.width = S + 'px'; canvas.style.height = S + 'px';
  canvas.width = S * dpr; canvas.height = S * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw();
}
window.addEventListener('resize', resizeCanvas);

function draw() {
  const S = CS * n, css = getComputedStyle(document.documentElement);
  const bg = css.getPropertyValue('--surface-soft').trim() || '#F3FAFF';
  const line = css.getPropertyValue('--border').trim() || '#D7EAF7';
  ctx.clearRect(0, 0, S, S);
  const rr = (x, y, w, h, r) => { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); };
  for (let i = 0; i < n * n; i++) {
    const x = (i % n) * CS, y = Math.floor(i / n) * CS;
    rr(x + 1.5, y + 1.5, CS - 3, CS - 3, CS * 0.18);
    ctx.fillStyle = bg; ctx.fill(); ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.stroke();
    if (own[i] >= 0) { ctx.globalAlpha = 0.2; ctx.fillStyle = COLORS[own[i]]; ctx.fill(); ctx.globalAlpha = 1; }
  }
  const ctr = (i) => [(i % n) * CS + CS / 2, Math.floor(i / n) * CS + CS / 2];
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = CS * 0.3;
  paths.forEach((p, c) => {
    if (p.length < 2) return;
    ctx.strokeStyle = COLORS[c]; ctx.beginPath();
    p.forEach((x, k) => { const [px, py] = ctr(x); k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
    ctx.stroke();
  });
  ends.forEach((e, c) => e.forEach((x) => {
    const [px, py] = ctr(x);
    if (active === c) { ctx.globalAlpha = 0.22; ctx.fillStyle = COLORS[c]; ctx.beginPath(); ctx.arc(px, py, CS * 0.46, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
    ctx.fillStyle = COLORS[c]; ctx.beginPath(); ctx.arc(px, py, CS * 0.3, 0, 7); ctx.fill();
    if (complete(c)) { ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.arc(px, py, CS * 0.1, 0, 7); ctx.fill(); }
  }));
}

/* =========================================================
   INPUT  (pointer events: mouse + touch)
   ========================================================= */
function cellAt(e) {
  const r = canvas.getBoundingClientRect();
  const col = Math.min(n - 1, Math.max(0, Math.floor((e.clientX - r.left) / (r.width / n))));
  const row = Math.min(n - 1, Math.max(0, Math.floor((e.clientY - r.top) / (r.height / n))));
  return row * n + col;
}
const rowOf = (x) => Math.floor(x / n), colOf = (x) => x % n;

function step(c, z) {                       // try to extend colour c's path onto cell z
  const p = paths[c];
  if (p.length >= 2 && z === p[p.length - 2]) { p.pop(); return true; }            // go back one cell
  const at = p.indexOf(z);
  if (at >= 0) { p.length = at + 1; return true; }                                  // touched own path: cut back to it
  if (endColor[z] >= 0 && endColor[z] !== c) return false;                          // other colour's dot
  if (complete(c)) return false;                                                    // already linked: can't extend
  const o = own[z];
  if (o >= 0 && o !== c) paths[o] = paths[o].slice(0, paths[o].indexOf(z));         // cut the other path here
  p.push(z);
  return true;
}
function advance(c, target) {
  for (let guard = 0; guard < n * 3; guard++) {
    const p = paths[c], h = p[p.length - 1];
    if (h === target) return;
    const dr = rowOf(target) - rowOf(h), dc = colOf(target) - colOf(h);
    const vert = h + (dr > 0 ? n : -n), horiz = h + (dc > 0 ? 1 : -1);
    const tries = Math.abs(dr) >= Math.abs(dc) ? [dr ? vert : null, dc ? horiz : null] : [dc ? horiz : null, dr ? vert : null];
    let moved = false;
    for (const z of tries) { if (z === null) continue; rebuildOwner(); if (step(c, z)) { moved = true; break; } }
    if (!moved) return;
  }
}

canvas.addEventListener('pointerdown', (e) => {
  if (solved || paused) return;
  e.preventDefault();
  rebuildOwner();
  const x = cellAt(e);
  let c = endColor[x];
  if (c >= 0) paths[c] = [x];
  else if (own[x] >= 0) { c = own[x]; paths[c] = paths[c].slice(0, paths[c].indexOf(x) + 1); }
  else return;
  active = c; snapshot = JSON.stringify(paths);
  try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  rebuildOwner(); draw();
});
canvas.addEventListener('pointermove', (e) => {
  if (active < 0) return;
  advance(active, cellAt(e));
  rebuildOwner(); draw();
});
function release() {
  if (active < 0) return;
  const c = active; active = -1;
  rebuildOwner();
  if (complete(c)) sndLink();
  if (JSON.stringify(paths) !== snapshot) { moves++; updateHud(); }
  draw();
  checkWin();
}
canvas.addEventListener('pointerup', release);
canvas.addEventListener('pointercancel', release);

/* =========================================================
   WIN / PROGRESS
   ========================================================= */
function checkWin() {
  if (solved || !allSolved()) return;
  solved = true;
  const prog = readJSON(PROG_KEY, { done: {} });
  prog.done[lv] = Math.min(prog.done[lv] || 1e9, moves);
  writeJSON(PROG_KEY, prog);
  const hints = readJSON(HINT_KEY, {}); const used = hints[lv] || 0; delete hints[lv]; writeJSON(HINT_KEY, hints);
  sndWin();
  const last = lv >= FLOW_LEVELS.length - 1;
  $('resultBanner').textContent = t(last ? 'result.allDone' : 'result.complete');
  $('resultScore').textContent = moves + ' ' + t('result.moves');
  $('resultTrophy').textContent = used ? (used + ' ' + t('result.hints')) : t('result.noHint');
  $('nextBtn').classList.toggle('hidden', last);
  winTimer = setTimeout(() => $('resultOverlay').classList.remove('hidden'), 450);
}

/* =========================================================
   HINT
   ========================================================= */
const same = (a, b) => a.length === b.length && (a.every((v, i) => v === b[i]) || a.every((v, i) => v === b[b.length - 1 - i]));
function toast(msg) {
  const el = $('toast'); el.textContent = msg; el.classList.remove('hidden');
  clearTimeout(toast.tm); toast.tm = setTimeout(() => el.classList.add('hidden'), 1800);
}
function useHint() {
  if (solved || paused || active >= 0) return;
  const c = sol.findIndex((p, i) => !same(paths[i], p));
  if (c < 0) return;
  if (hintsUsed >= FREE_HINTS && !HX) { GC.ads.reward('hint', function () { HX = 1; useHint(); }); return; }
  if (hintsUsed >= FREE_HINTS) HX = 0;
  rebuildOwner();
  sol[c].forEach((z) => { const o = own[z]; if (o >= 0 && o !== c) paths[o] = paths[o].slice(0, paths[o].indexOf(z)); });
  paths[c] = sol[c].slice();
  hintsUsed++;
  const h = readJSON(HINT_KEY, {}); h[lv] = hintsUsed; writeJSON(HINT_KEY, h);
  rebuildOwner(); sndLink(); updateHud(); draw(); checkWin();
}

/* =========================================================
   UI WIRING
   ========================================================= */
function buildLevels() {
  const done = readJSON(PROG_KEY, { done: {} }).done;
  let nxt = FLOW_LEVELS.findIndex((_, i) => !done[i]); if (nxt < 0) nxt = FLOW_LEVELS.length;
  const maxDone = nxt - 1;
  const grid = $('levelsGrid'); grid.innerHTML = '';
  FLOW_LEVELS.forEach((L, i) => {
    const b = document.createElement('button');
    const locked = i > maxDone + 1;
    b.className = 'lvl' + (done[i] ? ' done' : '') + (i === maxDone + 1 ? ' cur' : '') + (locked ? ' locked' : '');
    b.textContent = i + 1;
    const s = document.createElement('small'); s.textContent = L.n + '×' + L.n; b.appendChild(s);
    b.addEventListener('click', () => {
      if (locked) return;
      sndClick(); $('setupOverlay').classList.add('hidden'); loadLevel(i);
    });
    grid.appendChild(b);
  });
}
function openLevels() {
  paused = false;
  ['resultOverlay', 'pauseOverlay'].forEach((id) => $(id).classList.add('hidden'));
  buildLevels();
  $('setupOverlay').classList.remove('hidden');
}
function goHome() { sndClick(); GC.goHome(); }

$('hintBtn').addEventListener('click', () => { useHint(); });
$('restartLvlBtn').addEventListener('click', () => { if (paused) return; sndClick(); loadLevel(lv); });
$('nextBtn').addEventListener('click', () => { sndClick(); $('resultOverlay').classList.add('hidden'); loadLevel(Math.min(lv + 1, FLOW_LEVELS.length - 1)); });
$('rematchBtn').addEventListener('click', () => { sndClick(); $('resultOverlay').classList.add('hidden'); loadLevel(lv); });
$('quitBtn').addEventListener('click', () => { sndClick(); openLevels(); });
$('pauseMenuBtn').addEventListener('click', () => { sndClick(); openLevels(); });
$('setupQuitBtn').addEventListener('click', goHome);
$('homeBtn').addEventListener('click', goHome);
$('helpBtn').addEventListener('click', () => { sndClick(); $('helpOverlay').classList.remove('hidden'); });
$('helpCloseBtn').addEventListener('click', () => { sndClick(); $('helpOverlay').classList.add('hidden'); });
$('pauseBtn').addEventListener('click', () => {
  const blocked = ['setupOverlay', 'resultOverlay'].some((id) => !$(id).classList.contains('hidden'));
  if (blocked || solved) return;
  sndClick(); paused = true; $('pauseOverlay').classList.remove('hidden');
});
$('resumeBtn').addEventListener('click', () => { sndClick(); paused = false; $('pauseOverlay').classList.add('hidden'); });
$('pauseRestartBtn').addEventListener('click', () => { sndClick(); $('pauseOverlay').classList.add('hidden'); loadLevel(lv); });

/* ===== INIT ===== */
applyTranslations();
loadLevel(0);
buildLevels();
