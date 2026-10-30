'use strict';

/* =========================================================
   UNBLOCK PUZZLE  (Débloque le Bloc)
   Linked to the Game Collection home screen via localStorage:
   - "gc_lang"  -> "en" | "fr"
   - "gc_sound" -> "on" | "off"
   Levels come from levels.js (UNBLOCK_LEVELS, 40 levels, easy -> hard).
   Hints are UNLIMITED: a breadth-first solver finds the best next move
   from the current position (so every level can be checked).
   ========================================================= */

const STRINGS = {
  en: {
    'game.title': 'Unblock Puzzle',
    'setup.subtitle': 'Slide the blocks to free the red one',
    'setup.quit': 'Quit', 'setup.start': 'Start', 'setup.back': 'Back', 'levels.pick': 'Choose a level',
    'stat.level': 'Level', 'stat.moves': 'Moves', 'stat.min': 'Best', 'stat.hint': 'Hint',
    'pause.title': 'Game Paused', 'pause.resume': 'Resume', 'pause.restart': 'Restart level', 'pause.gameMenu': 'Levels',
    'result.complete': 'LEVEL COMPLETE!', 'result.allDone': 'ALL 40 LEVELS DONE!',
    'result.next': 'Next level', 'result.retry': 'Replay', 'result.levels': 'Levels',
    'result.moves': 'moves', 'result.optimal': 'Best possible', 'result.perfect': 'Perfect solution!',
    'help.title': 'How To Play',
    'help.line1': 'Slide the wooden blocks: each one moves only along its own direction.',
    'help.line2': 'Clear the way so the red block can reach the exit on the right.',
    'help.line3': 'Fewer moves = more stars. Sliding a block any distance counts as one move.',
    'help.line4': 'Stuck? Tap Hint: 2 free per level, then watch a short ad for each extra hint.',
    'help.close': 'Got it',
    'hint.right': 'Slide the highlighted block {n} to the right',
    'hint.left': 'Slide the highlighted block {n} to the left',
    'hint.down': 'Slide the highlighted block {n} down',
    'hint.up': 'Slide the highlighted block {n} up',
    'cell.one': '1 square', 'cell.many': '{n} squares'
  },
  fr: {
    'game.title': 'Débloque le Bloc',
    'setup.subtitle': 'Fais glisser les blocs pour libérer le rouge',
    'setup.quit': 'Quitter', 'setup.start': 'Commencer', 'setup.back': 'Retour', 'levels.pick': 'Choisissez un niveau',
    'stat.level': 'Niveau', 'stat.moves': 'Coups', 'stat.min': 'Idéal', 'stat.hint': 'Indice',
    'pause.title': 'Jeu en pause', 'pause.resume': 'Continuer', 'pause.restart': 'Recommencer le niveau', 'pause.gameMenu': 'Niveaux',
    'result.complete': 'NIVEAU TERMINÉ !', 'result.allDone': 'LES 40 NIVEAUX TERMINÉS !',
    'result.next': 'Niveau suivant', 'result.retry': 'Rejouer', 'result.levels': 'Niveaux',
    'result.moves': 'coups', 'result.optimal': 'Meilleur score possible', 'result.perfect': 'Solution parfaite !',
    'help.title': 'Comment jouer',
    'help.line1': 'Fais glisser les blocs de bois : chacun ne bouge que dans sa direction.',
    'help.line2': 'Dégage le chemin pour que le bloc rouge atteigne la sortie à droite.',
    'help.line3': 'Moins de coups = plus d’étoiles. Glisser un bloc sur n’importe quelle distance compte pour un coup.',
    'help.line4': 'Bloqué ? Utilise l’indice : 2 gratuits par niveau, puis une courte publicité pour chaque indice supplémentaire.',
    'help.close': 'Compris',
    'hint.right': 'Glisse le bloc en surbrillance de {n} vers la droite',
    'hint.left': 'Glisse le bloc en surbrillance de {n} vers la gauche',
    'hint.down': 'Glisse le bloc en surbrillance de {n} vers le bas',
    'hint.up': 'Glisse le bloc en surbrillance de {n} vers le haut',
    'cell.one': '1 case', 'cell.many': '{n} cases'
  }
};
const lang = (localStorage.getItem('gc_lang') === 'fr') ? 'fr' : 'en';
const soundOn = localStorage.getItem('gc_sound') !== 'off';
const $ = (id) => document.getElementById(id);
const t = (k, v) => {
  let s = (STRINGS[lang] && STRINGS[lang][k]) || STRINGS.en[k] || k;
  if (v) Object.keys(v).forEach((x) => { s = s.replace('{' + x + '}', v[x]); });
  return s;
};
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
const sndSlide = () => playTone(220, 0.09, 'triangle', 0.16);
const sndHint = () => [660, 880].forEach((f, i) => playTone(f, 0.12, 'triangle', 0.12, i * 0.07));
const sndWin = () => [523, 659, 784, 1046].forEach((f, i) => playTone(f, 0.22, 'triangle', 0.16, i * 0.09));

/* =========================================================
   SOLVER (breadth-first search) — used for hints
   N = 6; a move = sliding one block any distance.
   ========================================================= */
const N = 6;
function pieceMasks(p) {            // occupancy of every possible position, split in 2 x 18 bits
  const res = [];
  for (let pos = 0; pos + p.len <= N; pos++) {
    let lo = 0, hi = 0;
    for (let k = 0; k < p.len; k++) {
      const r = p.o === 0 ? p.r : pos + k, c = p.o === 0 ? pos + k : p.c;
      const bit = r * N + c;
      if (bit < 18) lo |= 1 << bit; else hi |= 1 << (bit - 18);
    }
    res.push([lo, hi]);
  }
  return res;
}
/* defs: [{r,c,len,o}] (fixed axis + length), cells: current position along the movement axis.
   returns the list of moves [{i, to}] of a shortest solution, [] if already solved, null if unsolvable. */
function solve(defs, cells) {
  const n = defs.length, M = defs.map(pieceMasks);
  const keyOf = (s) => { let k = 0; for (let i = 0; i < n; i++) k = k * 6 + s[i]; return k; };
  if (cells[0] === N - 2) return [];
  let lo0 = 0, hi0 = 0;
  for (let i = 0; i < n; i++) { lo0 |= M[i][cells[i]][0]; hi0 |= M[i][cells[i]][1]; }
  const startKey = keyOf(cells);
  const parent = new Map(); parent.set(startKey, null);
  let queue = [[cells.slice(), lo0, hi0, startKey]];
  for (let head = 0; head < queue.length; head++) {
    const [st, lo, hi, key] = queue[head];
    for (let i = 0; i < n; i++) {
      const cur = st[i], mc = M[i][cur];
      const olo = lo & ~mc[0], ohi = hi & ~mc[1];
      for (let dir = -1; dir <= 1; dir += 2) {
        let np = cur + dir;
        while (np >= 0 && np < M[i].length && !(M[i][np][0] & olo) && !(M[i][np][1] & ohi)) {
          const ns = st.slice(); ns[i] = np;
          const nk = keyOf(ns);
          if (!parent.has(nk)) {
            parent.set(nk, { prev: key, i, to: np, from: cur });
            if (i === 0 && np === N - 2) {
              const path = []; let k = nk;
              while (parent.get(k)) { const q = parent.get(k); path.push({ i: q.i, to: q.to, from: q.from }); k = q.prev; }
              return path.reverse();
            }
            queue.push([ns, olo | M[i][np][0], ohi | M[i][np][1], nk]);
          }
          np += dir;
        }
      }
    }
  }
  return null;
}

/* =========================================================
   STATE
   ========================================================= */
const PROG_KEY = 'unblockProgress';
const readJSON = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } };
const writeJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } };

let lv = 0, pieces = [], moves = 0, solved = false, paused = false, hint = null, winTimer = 0, exitAnim = 0;
let drag = null, CS = 50, PAD = 14, FR = 12, W = 320, dpr = 1;
const canvas = $('board'), ctx = canvas.getContext('2d');

const PALETTES = [
  ['#F9B254', '#EE922C'], ['#F6A848', '#EA8A24'], ['#FBBA5F', '#F19732'], ['#F3A343', '#E8871F']
];
const RED = ['#F44A3E', '#D52B23'];
const GAPF = 0.05;
let boardCache = null, spriteCache = {};

function loadLevel(i) {
  clearTimeout(winTimer);
  lv = i; moves = 0; solved = false; hint = null; drag = null; exitAnim = 0; spriteCache = {}; hintBadge();
  const L = UNBLOCK_LEVELS[i];
  pieces = L.p.map((p, k) => ({
    id: k, r: p[0], c: p[1], len: p[2], o: p[3], red: k === 0,
    cell: p[3] === 0 ? p[1] : p[0], pos: p[3] === 0 ? p[1] : p[0],
    pal: PALETTES[(k * 3 + (k >> 1)) % PALETTES.length], seed: (k + 1) * 977 + i * 31
  }));
  updateHud();
}
function updateHud() {
  $('lvlNum').textContent = lv + 1;
  $('moveNum').textContent = moves;
  $('minNum').textContent = UNBLOCK_LEVELS[lv].m;
}

/* occupancy grid of integer cells, optionally ignoring one piece */
function grid(skip) {
  const g = new Array(N * N).fill(-1);
  pieces.forEach((p) => {
    if (p === skip) return;
    for (let k = 0; k < p.len; k++) {
      const r = p.o === 0 ? p.r : p.cell + k, c = p.o === 0 ? p.cell + k : p.c;
      g[r * N + c] = p.id;
    }
  });
  return g;
}
function range(p) {                      // free movement range [lo, hi] along the piece's axis
  const g = grid(p);
  const at = (x) => (p.o === 0 ? g[p.r * N + x] : g[x * N + p.c]);
  let lo = p.cell, hi = p.cell;
  while (lo - 1 >= 0 && at(lo - 1) < 0) lo--;
  while (hi + p.len < N && at(hi + p.len) < 0) hi++;
  return [lo, hi];
}

/* =========================================================
   RENDER
   ========================================================= */
function resize() {
  const wrap = document.querySelector('.board-wrap');
  const side = Math.floor(Math.max(200, Math.min(wrap.clientWidth - 24 - 16, wrap.clientHeight - 24 - 16, 560)));
  dpr = Math.min(window.devicePixelRatio || 1, 3);
  W = side; FR = W * 0.05; PAD = W * 0.07; CS = (W - 2 * PAD) / N;
  canvas.style.width = W + 'px'; canvas.style.height = W + 'px';
  canvas.width = Math.round(W * dpr); canvas.height = Math.round(W * dpr);
  spriteCache = {}; buildBoardCache();
}
function rrOn(c, x, y, w, h, r) {
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
const rr = (x, y, w, h, r) => rrOn(ctx, x, y, w, h, r);
function rand(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

function buildBoardCache() {
  const c = document.createElement('canvas'); c.width = canvas.width; c.height = canvas.height;
  const g = c.getContext('2d'); g.scale(dpr, dpr);
  const R = rand(20240);
  const cr = W * 0.045;
  // light wood frame with fine vertical grain
  const fg = g.createLinearGradient(0, 0, W, 0);
  fg.addColorStop(0, '#EDA640'); fg.addColorStop(.5, '#F7B955'); fg.addColorStop(1, '#E99A33');
  g.fillStyle = fg; rrOn(g, 0, 0, W, W, cr); g.fill();
  g.save(); rrOn(g, 0, 0, W, W, cr); g.clip(); g.lineCap = 'round';
  for (let x = -2; x < W + 2; x += 1.5) {
    const light = R() > .5, x1 = x + R() * 2;
    g.strokeStyle = light ? 'rgba(255,226,150,' + (.10 + R() * .25) + ')' : 'rgba(170,88,8,' + (.08 + R() * .22) + ')';
    g.lineWidth = .6 + R() * 1.4;
    g.beginPath(); g.moveTo(x1, 0); g.bezierCurveTo(x1 + R() * 3 - 1.5, W * .33, x1 + R() * 3 - 1.5, W * .66, x1 + R() * 3 - 1.5, W); g.stroke();
  }
  g.restore();
  g.strokeStyle = 'rgba(125,62,0,.55)'; g.lineWidth = 2; rrOn(g, 1, 1, W - 2, W - 2, cr); g.stroke();
  // dark tray
  const tx = FR, tw = W - 2 * FR, tr = W * 0.03;
  g.save(); g.shadowColor = 'rgba(255,215,140,.55)'; g.shadowBlur = 0; g.shadowOffsetY = 1.5;
  g.fillStyle = '#5E3A1C'; rrOn(g, tx - 1.5, tx - 1.5, tw + 3, tw + 3, tr + 1.5); g.fill(); g.restore();
  const tg = g.createLinearGradient(0, tx, 0, tx + tw);
  tg.addColorStop(0, '#2E1A0B'); tg.addColorStop(1, '#42280F');
  g.fillStyle = tg; rrOn(g, tx, tx, tw, tw, tr); g.fill();
  // exit notch cut through the right frame, row 2
  const ny = PAD + 2 * CS + CS * 0.05, nh = CS * 0.9;
  g.fillStyle = '#35200E'; rrOn(g, W - FR - 6, ny, FR + 12, nh, 7); g.fill();
  g.strokeStyle = 'rgba(125,62,0,.55)'; g.lineWidth = 1.5; rrOn(g, W - FR - 6, ny, FR + 12, nh, 7); g.stroke();
  const cx = W - FR * 0.45, cy = ny + nh / 2, s = FR * 0.3;
  g.strokeStyle = '#F6B83E'; g.lineWidth = Math.max(2.2, s * .8); g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(cx - s * .6, cy - s * 1.15); g.lineTo(cx + s * .6, cy); g.lineTo(cx - s * .6, cy + s * 1.15); g.stroke();
  boardCache = c;
}
function drawBoard() { if (boardCache) ctx.drawImage(boardCache, 0, 0, W, W); }

function pieceSprite(p) {
  const key = p.id + ':' + p.seed + ':' + W + ':' + dpr;
  if (spriteCache[key]) return spriteCache[key];
  const gap = CS * GAPF;
  const w = (p.o === 0 ? p.len * CS : CS) - 2 * gap, h = (p.o === 0 ? CS : p.len * CS) - 2 * gap;
  const c = document.createElement('canvas'); c.width = Math.ceil(w * dpr); c.height = Math.ceil(h * dpr);
  const g = c.getContext('2d'); g.scale(c.width / w, c.height / h);
  const pal = p.red ? RED : p.pal, L = Math.max(w, h), Hh = Math.min(w, h), rad = Hh * 0.1;
  g.save(); rrOn(g, 0, 0, w, h, rad); g.clip();
  const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, pal[0]); bg.addColorStop(1, pal[1]);
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  // fine grain streaks along the long side
  g.save(); g.translate(w / 2, h / 2); if (p.o === 1) g.rotate(Math.PI / 2); g.lineCap = 'round';
  const R = rand(p.seed), n = Math.round(Hh * 0.8);
  for (let k = 0; k < n; k++) {
    const y = -Hh / 2 + R() * Hh, len = L * (.25 + R() * .75), x0 = -L / 2 + R() * (L - len) - L * .05, light = R() > .45;
    g.strokeStyle = p.red
      ? (light ? 'rgba(255,140,125,' + (.12 + R() * .25) + ')' : 'rgba(150,15,10,' + (.10 + R() * .22) + ')')
      : (light ? 'rgba(255,214,140,' + (.14 + R() * .3) + ')' : 'rgba(190,95,10,' + (.10 + R() * .25) + ')');
    g.lineWidth = .5 + R() * 1.4;
    g.beginPath(); g.moveTo(x0, y); g.quadraticCurveTo(x0 + len / 2, y + (R() - .5) * Hh * .05, x0 + len, y + (R() - .5) * Hh * .03); g.stroke();
  }
  g.restore();
  // soft light from the top, darker lower edge
  const hg = g.createLinearGradient(0, 0, 0, h * .45); hg.addColorStop(0, 'rgba(255,255,255,.16)'); hg.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = hg; g.fillRect(0, 0, w, h * .45);
  const bh = Math.max(3, Hh * 0.07);
  g.fillStyle = p.red ? 'rgba(120,10,5,.30)' : 'rgba(125,55,0,.30)'; g.fillRect(0, h - bh, w, bh);
  g.restore();
  g.strokeStyle = p.red ? 'rgba(120,12,8,.45)' : 'rgba(120,55,0,.42)'; g.lineWidth = 1;
  rrOn(g, .5, .5, w - 1, h - 1, rad); g.stroke();
  return (spriteCache[key] = { c, w, h });
}

function drawPiece(p) {
  const s = pieceSprite(p), gap = CS * GAPF;
  const x = PAD + (p.o === 0 ? p.pos * CS : p.c * CS) + gap + (p.dx || 0);
  const y = PAD + (p.o === 0 ? p.r * CS : p.pos * CS) + gap;
  const dragging = drag && drag.p === p;
  ctx.save();
  if (p.alpha != null) ctx.globalAlpha = p.alpha;
  ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = dragging ? 12 : 5; ctx.shadowOffsetY = dragging ? 5 : 2.5;
  ctx.drawImage(s.c, x, y, s.w, s.h);
  ctx.restore();
}

function drawHint(time) {
  if (!hint || solved) return;
  const p = pieces[hint.i], gap = CS * GAPF;
  const tx = PAD + (p.o === 0 ? hint.to * CS : p.c * CS) + gap, ty = PAD + (p.o === 0 ? p.r * CS : hint.to * CS) + gap;
  const w = (p.o === 0 ? p.len * CS : CS) - 2 * gap, h = (p.o === 0 ? CS : p.len * CS) - 2 * gap;
  const pulse = .5 + .5 * Math.sin(time / 220);
  // destination (dashed)
  ctx.save(); ctx.setLineDash([7, 6]); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(31,199,155,' + (.55 + .4 * pulse) + ')';
  ctx.fillStyle = 'rgba(31,199,155,.16)'; rr(tx, ty, w, h, CS * .14); ctx.fill(); ctx.stroke(); ctx.restore();
  // glow around the block to move
  const x = PAD + (p.o === 0 ? p.pos * CS : p.c * CS) + gap, y = PAD + (p.o === 0 ? p.r * CS : p.pos * CS) + gap;
  ctx.save(); ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,169,62,' + (.6 + .4 * pulse) + ')';
  ctx.shadowColor = 'rgba(255,169,62,.9)'; ctx.shadowBlur = 10 + 8 * pulse;
  rr(x - 2, y - 2, (p.o === 0 ? p.len * CS : CS) - 2 * gap + 4, (p.o === 0 ? CS : p.len * CS) - 2 * gap + 4, CS * .17); ctx.stroke(); ctx.restore();
  // direction chevrons on the block
  const dir = hint.to > p.cell ? 1 : -1, off = ((time / 90) % 10) - 5;
  ctx.save(); ctx.translate(x + (p.o === 0 ? p.len * CS : CS) / 2 - gap, y + (p.o === 1 ? p.len * CS : CS) / 2 - gap);
  if (p.o === 1) ctx.rotate(Math.PI / 2);
  ctx.scale(dir, 1); ctx.translate(off, 0);
  ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(3, CS * .07); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 4;
  const s = CS * .15; ctx.beginPath(); ctx.moveTo(-s, -s); ctx.lineTo(s * .6, 0); ctx.lineTo(-s, s); ctx.stroke();
  ctx.restore();
}

function frame(time) {
  requestAnimationFrame(frame);
  // snap / slide animation
  pieces.forEach((p) => {
    if (drag && drag.p === p) return;
    const d = p.cell - p.pos;
    if (Math.abs(d) > 0.002) p.pos += d * 0.35; else p.pos = p.cell;
  });
  if (exitAnim > 0) {
    exitAnim = Math.min(1, exitAnim + 0.035);
    const red = pieces[0]; red.dx = exitAnim * CS * 2.6; red.alpha = 1 - exitAnim * exitAnim;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, W);
  drawBoard();
  pieces.forEach((p) => { if (!(drag && drag.p === p)) drawPiece(p); });
  if (drag) drawPiece(drag.p);
  drawHint(time);
}

/* =========================================================
   INPUT
   ========================================================= */
function pt(e) { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (W / r.height) }; }
function pieceAt(x, y) {
  for (let i = pieces.length - 1; i >= 0; i--) {
    const p = pieces[i];
    const px = PAD + (p.o === 0 ? p.pos * CS : p.c * CS), py = PAD + (p.o === 0 ? p.r * CS : p.pos * CS);
    const w = p.o === 0 ? p.len * CS : CS, h = p.o === 0 ? CS : p.len * CS;
    if (x >= px && x <= px + w && y >= py && y <= py + h) return p;
  }
  return null;
}
canvas.addEventListener('pointerdown', (e) => {
  if (solved || paused) return;
  const q = pt(e), p = pieceAt(q.x, q.y); if (!p) return;
  try { canvas.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ }
  const [lo, hi] = range(p);
  drag = { p, lo, hi, start: p.cell, from: p.o === 0 ? q.x : q.y, startPos: p.pos };
  getAudioCtx();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const q = pt(e), cur = drag.p.o === 0 ? q.x : q.y;
  drag.p.pos = Math.max(drag.lo, Math.min(drag.hi, drag.startPos + (cur - drag.from) / CS));
});
function endDrag() {
  if (!drag) return;
  const p = drag.p, to = Math.max(drag.lo, Math.min(drag.hi, Math.round(p.pos)));
  const changed = to !== drag.start;
  p.cell = to; drag = null;
  if (changed) { moves++; hint = null; sndSlide(); updateHud(); checkWin(); }
}
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);

/* =========================================================
   WIN
   ========================================================= */
function checkWin() {
  if (solved || pieces[0].cell !== N - 2) return;
  solved = true; hint = null;
  const best = UNBLOCK_LEVELS[lv].m;
  const stars = moves <= best ? 3 : moves <= Math.ceil(best * 1.5) ? 2 : 1;
  const prog = readJSON(PROG_KEY, { done: {} });
  const old = prog.done[lv];
  prog.done[lv] = { moves: old ? Math.min(old.moves, moves) : moves, stars: old ? Math.max(old.stars, stars) : stars };
  writeJSON(PROG_KEY, prog);
  sndWin();
  exitAnim = 0.001;
  const last = lv >= UNBLOCK_LEVELS.length - 1;
  $('resultBanner').textContent = t(last ? 'result.allDone' : 'result.complete');
  $('resultStars').innerHTML = [1, 2, 3].map((n) => '<span class="' + (n <= stars ? '' : 'off') + '">★</span>').join('');
  $('resultScore').textContent = moves + ' ' + t('result.moves');
  $('resultTrophy').textContent = moves <= best ? t('result.perfect') : t('result.optimal') + ': ' + best;
  $('nextBtn').classList.toggle('hidden', last);
  winTimer = setTimeout(() => $('resultOverlay').classList.remove('hidden'), 750);
}

/* =========================================================
   HINT (unlimited)
   ========================================================= */
function toast(msg) {
  const el = $('toast'); el.textContent = msg; el.classList.remove('hidden');
  clearTimeout(toast.tm); toast.tm = setTimeout(() => el.classList.add('hidden'), 2600);
}
function currentHint() {
  const defs = pieces.map((p) => ({ r: p.r, c: p.c, len: p.len, o: p.o }));
  const path = solve(defs, pieces.map((p) => p.cell));
  return path && path.length ? path : null;
}
const HU = {}; let HX = 0;
const hintFree = () => Math.max(0, 2 - (HU[lv] || 0));
const hintBadge = () => { const e = $('hintBadge'); if (e) e.textContent = hintFree() > 0 ? hintFree() : 'AD'; };
function useHint() {
  if (solved || paused || drag) return;
  if (hintFree() <= 0 && !HX) { GC.ads.reward('hint', function () { HX = 1; useHint(); }); return; }
  const path = currentHint(); if (!path) return;
  if (hintFree() > 0) HU[lv] = (HU[lv] || 0) + 1; else HX = 0;
  hintBadge();
  const m = path[0], p = pieces[m.i], n = Math.abs(m.to - p.cell);
  hint = { i: m.i, to: m.to };
  const dirKey = p.o === 0 ? (m.to > p.cell ? 'right' : 'left') : (m.to > p.cell ? 'down' : 'up');
  toast(t('hint.' + dirKey, { n: n === 1 ? t('cell.one') : t('cell.many', { n }) }));
  sndHint();
}

/* =========================================================
   UI WIRING
   ========================================================= */
function buildLevels() {
  const done = readJSON(PROG_KEY, { done: {} }).done;
  const next = UNBLOCK_LEVELS.findIndex((_, i) => !done[i]);
  const gridEl = $('levelsGrid'); gridEl.innerHTML = '';
  UNBLOCK_LEVELS.forEach((L, i) => {
    const b = document.createElement('button');
    const locked = next >= 0 && i > next;
    b.className = 'lvl' + (done[i] ? ' done' : '') + (i === next ? ' cur' : '') + (locked ? ' locked' : '');
    b.textContent = i + 1;
    const s = document.createElement('small'); s.textContent = done[i] ? '★'.repeat(done[i].stars) : L.m; b.appendChild(s);
    b.addEventListener('click', () => { if (locked) return; sndClick(); $('setupOverlay').classList.add('hidden'); loadLevel(i); });
    gridEl.appendChild(b);
  });
}
function showSetupView(levels) {
  $('startView').classList.toggle('hidden', levels);
  $('levelsView').classList.toggle('hidden', !levels);
}
function openLevels() {
  paused = false;
  ['resultOverlay', 'pauseOverlay'].forEach((id) => $(id).classList.add('hidden'));
  buildLevels();
  showSetupView(true);
  $('setupOverlay').classList.remove('hidden');
}
function goHome() { sndClick(); GC.goHome(); }

$('hintBtn').addEventListener('click', useHint);
$('restartLvlBtn').addEventListener('click', () => { if (paused) return; sndClick(); loadLevel(lv); });
$('nextBtn').addEventListener('click', () => { sndClick(); $('resultOverlay').classList.add('hidden'); loadLevel(Math.min(lv + 1, UNBLOCK_LEVELS.length - 1)); });
$('rematchBtn').addEventListener('click', () => { sndClick(); $('resultOverlay').classList.add('hidden'); loadLevel(lv); });
$('quitBtn').addEventListener('click', () => { sndClick(); openLevels(); });
$('pauseMenuBtn').addEventListener('click', () => { sndClick(); openLevels(); });
$('setupQuitBtn').addEventListener('click', goHome);
$('startBtn').addEventListener('click', () => { sndClick(); buildLevels(); showSetupView(true); });
$('levelsBackBtn').addEventListener('click', () => { sndClick(); showSetupView(false); });
$('homeBtn').addEventListener('click', goHome);
$('helpBtn').addEventListener('click', () => { sndClick(); $('helpOverlay').classList.remove('hidden'); });
$('helpCloseBtn').addEventListener('click', () => { sndClick(); $('helpOverlay').classList.add('hidden'); });
$('pauseBtn').addEventListener('click', () => {
  const blocked = ['setupOverlay', 'resultOverlay'].some((id) => !$(id).classList.contains('hidden'));
  if (blocked || solved) return;
  sndClick(); paused = true; $('pauseOverlay').classList.remove('hidden');
});
$('resumeBtn').addEventListener('click', () => { sndClick(); paused = false; $('pauseOverlay').classList.add('hidden'); });
$('pauseRestartBtn').addEventListener('click', () => { sndClick(); paused = false; $('pauseOverlay').classList.add('hidden'); loadLevel(lv); });
window.addEventListener('resize', resize);
if (window.ResizeObserver) new ResizeObserver(resize).observe(document.querySelector('.board-wrap'));

/* ===== INIT ===== */
applyTranslations();
loadLevel(0);
resize();
buildLevels();
requestAnimationFrame(frame);
