'use strict';

/* =========================================================
   TAP THE CIRCLE  (Touche le Cercle)
   Linked to the Game Collection home screen via localStorage:
   - "gc_lang"  -> "en" | "fr"
   - "gc_sound" -> "on" | "off"
   Solo: 5 hearts, a wrong tap costs one, best score saved.
   2 players: same device, each plays 60 s (same target sequence), highest score wins.
   ========================================================= */

const STRINGS = {
  en: {
    'game.title': 'Tap the Circle',
    'setup.subtitle': 'Tap at the right moment to hit the target', 'setup.mode': 'Mode', 'setup.starter': 'Who starts?',
    'setup.vsnote': 'Each player gets 1 minute. The highest score wins.', 'setup.start': 'Start', 'setup.quit': 'Quit',
    'mode.solo': 'Solo', 'mode.vs': '2 players', 'player.1': 'Player 1', 'player.2': 'Player 2',
    'stat.score': 'Score', 'stat.best': 'Best', 'stat.time': 'Time', 'stat.level': 'Level',
    'turn.note': 'You have 60 seconds. Tap when the white dot is inside the target!', 'turn.go': 'I’m ready',
    'turn.recap': '{name}: {n} pts',
    'pause.title': 'Game Paused', 'pause.resume': 'Resume', 'pause.restart': 'Restart', 'pause.menu': 'Menu',
    'help.title': 'How To Play',
    'help.line1': 'A white dot runs around the circle. Tap when it is inside the glowing target zone.',
    'help.line2': 'Hit = +1 point, a tap right in the middle = Perfect, +2 points.',
    'help.line3': 'Solo: you have 5 hearts and lose one for every wrong tap. Try to beat your best score!',
    'help.line4': '2 players: each player plays 60 seconds, a wrong tap costs 1 point. The faster it gets, the harder it is!',
    'help.close': 'Got it',
    'over.banner': 'Game over', 'result.record': 'New record!', 'result.again': 'Play again', 'result.menu': 'Menu',
    'result.wins': '{name} wins!', 'result.draw': 'Draw!',
    'game.perfect': 'PERFECT!', 'game.level': 'Level {n}'
  },
  fr: {
    'game.title': 'Touche le Cercle',
    'setup.subtitle': 'Touche au bon moment pour atteindre la cible', 'setup.mode': 'Mode', 'setup.starter': 'Qui commence ?',
    'setup.vsnote': 'Chaque joueur a 1 minute. Le meilleur score gagne.', 'setup.start': 'Commencer', 'setup.quit': 'Quitter',
    'mode.solo': 'Solo', 'mode.vs': '2 joueurs', 'player.1': 'Joueur 1', 'player.2': 'Joueur 2',
    'stat.score': 'Score', 'stat.best': 'Record', 'stat.time': 'Temps', 'stat.level': 'Niveau',
    'turn.note': 'Tu as 60 secondes. Touche quand le point blanc est dans la cible !', 'turn.go': 'Je suis prêt',
    'turn.recap': '{name} : {n} pts',
    'pause.title': 'Jeu en pause', 'pause.resume': 'Continuer', 'pause.restart': 'Recommencer', 'pause.menu': 'Menu',
    'help.title': 'Comment jouer',
    'help.line1': 'Un point blanc tourne autour du cercle. Touche quand il est dans la zone cible lumineuse.',
    'help.line2': 'Réussi = +1 point, un tir en plein milieu = Parfait, +2 points.',
    'help.line3': 'Solo : tu as 5 cœurs et tu en perds un à chaque erreur. Bats ton record !',
    'help.line4': '2 joueurs : chacun joue 60 secondes, une erreur coûte 1 point. Plus ça avance, plus c’est rapide !',
    'help.close': 'Compris',
    'over.banner': 'Partie terminée', 'result.record': 'Nouveau record !', 'result.again': 'Rejouer', 'result.menu': 'Menu',
    'result.wins': '{name} gagne !', 'result.draw': 'Égalité !',
    'game.perfect': 'PARFAIT !', 'game.level': 'Niveau {n}'
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
const show = (id) => $(id).classList.remove('hidden');
const hide = (id) => $(id).classList.add('hidden');

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
const sndHit = (combo, perfect) => { const f = 520 * Math.pow(1.045, Math.min(combo, 24)); playTone(f, 0.11, 'triangle', 0.2); if (perfect) playTone(f * 1.5, 0.14, 'sine', 0.14, 0.05); };
const sndMiss = () => { playTone(160, 0.22, 'sawtooth', 0.16); };
const sndTick = (hi) => playTone(hi ? 880 : 600, 0.1, 'square', 0.1);
const sndEnd = () => [523, 659, 784, 1046].forEach((f, i) => playTone(f, 0.22, 'triangle', 0.16, i * 0.09));
const sndOver = () => [392, 330, 262].forEach((f, i) => playTone(f, 0.25, 'triangle', 0.16, i * 0.13));

/* =========================================================
   CONFIG / STATE
   ========================================================= */
const TAU = Math.PI * 2;
const MAX_HEARTS = 5, TURN_SECONDS = 60, BEST_KEY = 'tapCircleBest';
const speedFor = (hits) => Math.min(8.6, 2.3 + 0.085 * hits);        // rad / s
const widthFor = (hits) => Math.max(0.42, 1.25 - 0.016 * hits);      // target arc width (rad)
const levelFor = (hits) => 1 + Math.floor(hits / 8);
const norm = (a) => { a %= TAU; return a < 0 ? a + TAU : a; };
const angDiff = (a, b) => { let d = norm(a - b); if (d > Math.PI) d -= TAU; return d; };
function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let x = Math.imul(a ^ a >>> 15, 1 | a); x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x; return ((x ^ x >>> 14) >>> 0) / 4294967296; }; }

let mode = 'solo', starter = 1, order = [1, 2], turnIdx = 0, vsScores = [0, 0], vsSeed = 1;
let state = 'menu';        // menu | turnwait | countdown | playing | paused | over
let best = parseInt(localStorage.getItem(BEST_KEY) || '0', 10) || 0;
let g = null;               // current run
let countdown = 0, resumeState = 'playing';
let S = 320, dpr = 1, last = 0, clock = 0, demoTheta = 0;
const canvas = $('board'), ctx = canvas.getContext('2d');

function newRun(seed) {
  g = { score: 0, hits: 0, combo: 0, hearts: MAX_HEARTS, theta: -Math.PI / 2, dir: 1, arc: 0, timeLeft: TURN_SECONDS,
        rng: mulberry32(seed), guard: 0, pulses: [], parts: [], floats: [], shake: 0, flashMiss: 0, flashHit: 0, trail: [], lastSec: 99 };
  placeTarget();
  buildHearts(); updateHud();
}
function placeTarget() {
  const off = 1.45 + g.rng() * 2.75;                 // distance ahead of the dot, in the (new) direction
  g.arc = norm(g.theta + g.dir * off);
}

/* =========================================================
   HUD
   ========================================================= */
function buildHearts() {
  const box = $('hearts'); box.innerHTML = '';
  for (let i = 0; i < MAX_HEARTS; i++) {
    box.insertAdjacentHTML('beforeend', '<svg class="heart" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>');
  }
}
function updateHearts(popIndex) {
  const hs = $('hearts').children;
  for (let i = 0; i < hs.length; i++) hs[i].classList.toggle('lost', i >= g.hearts);
  if (popIndex != null && hs[popIndex]) { hs[popIndex].classList.remove('pop'); void hs[popIndex].getBoundingClientRect(); hs[popIndex].classList.add('pop'); }
}
const fmtTime = (s) => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
function updateHud() {
  if (!g) return;
  if (mode === 'solo') {
    $('scoreNum').textContent = g.score; $('bestNum').textContent = Math.max(best, g.score);
    updateHearts();
  } else {
    const cur = order[turnIdx];
    $('scoreP1').textContent = cur === 1 ? g.score : vsScores[0];
    $('scoreP2').textContent = cur === 2 ? g.score : vsScores[1];
    $('chipP1').classList.toggle('active', cur === 1 && state !== 'turnwait');
    $('chipP2').classList.toggle('active', cur === 2 && state !== 'turnwait');
    $('timerNum').textContent = fmtTime(g.timeLeft);
    $('timerChip').classList.toggle('low', g.timeLeft <= 10 && state === 'playing');
  }
}
function setBars() {
  $('soloBar').classList.toggle('hidden', mode !== 'solo');
  $('vsBar').classList.toggle('hidden', mode !== 'vs');
  $('nameP1').textContent = t('player.1'); $('nameP2').textContent = t('player.2');
}

/* =========================================================
   FLOW
   ========================================================= */
function startGame() {
  setBars(); hide('setupOverlay'); hide('resultOverlay');
  if (mode === 'solo') {
    newRun((Math.random() * 1e9) | 0);
    beginCountdown();
  } else {
    order = starter === 1 ? [1, 2] : [2, 1]; turnIdx = 0; vsScores = [0, 0]; vsSeed = (Math.random() * 1e9) | 0;
    newRun(vsSeed); showTurn();
  }
}
function showTurn() {
  state = 'turnwait';
  const who = order[turnIdx];
  $('turnWho').textContent = t('player.' + who);
  $('turnWho').className = 'turn-who p' + who;
  const rec = $('turnRecap');
  if (turnIdx === 1) { const f = order[0]; rec.textContent = t('turn.recap', { name: t('player.' + f), n: vsScores[f - 1] }); rec.classList.remove('hidden'); }
  else rec.classList.add('hidden');
  updateHud(); show('turnOverlay');
}
function beginCountdown() { state = 'countdown'; countdown = 3.0; g.lastCd = 4; }
function endTurn() {
  // versus: time is up
  state = 'over'; const who = order[turnIdx]; vsScores[who - 1] = g.score; sndEnd();
  setTimeout(() => {
    if (turnIdx === 0) { turnIdx = 1; newRun(vsSeed); showTurn(); }
    else showResult();
  }, 900);
}
function gameOverSolo() {
  state = 'over'; sndOver();
  const rec = g.score > best && g.score > 0;
  if (g.score > best) { best = g.score; try { localStorage.setItem(BEST_KEY, String(best)); } catch (e) { /* ignore */ } }
  setTimeout(() => {
    $('resBanner').textContent = t('over.banner'); $('resBanner').className = 'banner lose';
    $('resScore').textContent = g.score; $('resBest').textContent = best;
    $('resRecord').classList.toggle('hidden', !rec);
    show('resSolo'); hide('resVs'); show('resultOverlay');
  }, 700);
}
function showResult() {
  const [a, b] = vsScores;
  $('vsName1').textContent = t('player.1'); $('vsName2').textContent = t('player.2');
  $('vsScore1').textContent = a; $('vsScore2').textContent = b;
  $('vsCard1').classList.toggle('win', a > b); $('vsCard2').classList.toggle('win', b > a);
  const banner = $('resBanner');
  if (a === b) { banner.textContent = t('result.draw'); banner.className = 'banner draw'; }
  else { banner.textContent = t('result.wins', { name: t('player.' + (a > b ? 1 : 2)) }); banner.className = 'banner'; }
  hide('resSolo'); show('resVs'); show('resultOverlay'); state = 'over';
}
function openMenu() {
  state = 'menu'; g = null;
  ['turnOverlay', 'pauseOverlay', 'resultOverlay', 'helpOverlay'].forEach(hide);
  show('setupOverlay'); setBars();
}

/* =========================================================
   GAMEPLAY
   ========================================================= */
function tap() {
  if (state !== 'playing' || !g || g.guard > 0) return;
  getAudioCtx();
  const d = Math.abs(angDiff(g.theta, g.arc)), half = widthFor(g.hits) / 2;
  if (d <= half + 0.05) hit(d <= half * 0.34); else miss();
}
function hit(perfect) {
  g.hits++; g.combo++;
  const pts = perfect ? 2 : 1; g.score += pts;
  sndHit(g.combo, perfect);
  const R = S * 0.355, px = S / 2 + Math.cos(g.theta) * R, py = S / 2 + Math.sin(g.theta) * R;
  g.pulses.push({ r: R, life: 0 });
  for (let i = 0; i < (perfect ? 16 : 9); i++) {
    const a = Math.random() * TAU, sp = 60 + Math.random() * 160;
    g.parts.push({ x: px, y: py, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, max: .5 + Math.random() * .3, c: Math.random() < .5 ? '#1FC79B' : (perfect ? '#FFC93C' : '#FFFFFF') });
  }
  g.floats.push({ x: S / 2, y: S / 2 - S * 0.21, text: perfect ? t('game.perfect') + ' +2' : '+1', life: 0, max: .8, c: perfect ? '#FFC93C' : '#7DF3CF' });
  g.dir = -g.dir; placeTarget(); g.flashHit = .25;
  updateHud();
}
function miss() {
  g.combo = 0; g.guard = .12; g.flashMiss = .35; g.shake = .3; sndMiss();
  g.floats.push({ x: S / 2, y: S / 2 + S * 0.27, text: mode === 'vs' ? '−1' : '✕', life: 0, max: .7, c: '#FF7A8A' });
  if (mode === 'solo') {
    g.hearts--; updateHearts(g.hearts); updateHud();
    if (g.hearts <= 0) gameOverSolo();
  } else {
    g.score = Math.max(0, g.score - 1); updateHud();
  }
}
function update(dt) {
  clock += dt;
  if (state === 'countdown') {
    countdown -= dt;
    const n = Math.ceil(countdown);
    if (n !== g.lastCd && n >= 1) { g.lastCd = n; sndTick(false); }
    if (countdown <= 0) { sndTick(true); state = 'playing'; updateHud(); }
    demoTheta += dt * 1.6;
  } else if (state === 'menu' || state === 'turnwait') {
    demoTheta += dt * 1.6;
  }
  if (state === 'playing' && g) {
    g.theta = norm(g.theta + g.dir * speedFor(g.hits) * dt);
    g.guard = Math.max(0, g.guard - dt);
    g.trail.unshift({ a: g.theta }); if (g.trail.length > 14) g.trail.pop();
    if (mode === 'vs') {
      g.timeLeft -= dt; updateHud();
      if (g.timeLeft <= 0) { g.timeLeft = 0; updateHud(); endTurn(); }
    }
  }
  if (g) {
    g.shake = Math.max(0, g.shake - dt); g.flashMiss = Math.max(0, g.flashMiss - dt); g.flashHit = Math.max(0, g.flashHit - dt);
    g.pulses.forEach((p) => { p.life += dt; }); g.pulses = g.pulses.filter((p) => p.life < .5);
    g.parts.forEach((p) => { p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 220 * dt; }); g.parts = g.parts.filter((p) => p.life < p.max);
    g.floats.forEach((f) => { f.life += dt; f.y -= 30 * dt; }); g.floats = g.floats.filter((f) => f.life < f.max);
  }
}

/* =========================================================
   RENDER
   ========================================================= */
function resize() {
  const wrap = $('boardWrap');
  const side = Math.floor(Math.max(200, Math.min(wrap.clientWidth - 24 - 16, wrap.clientHeight - 24 - 16, 480)));
  dpr = Math.min(window.devicePixelRatio || 1, 3); S = side;
  canvas.style.width = S + 'px'; canvas.style.height = S + 'px';
  canvas.width = Math.round(S * dpr); canvas.height = Math.round(S * dpr);
}
function draw() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, S, S);
  const cx = S / 2, cy = S / 2, R = S * 0.355, tw = S * 0.075;
  ctx.save();
  if (g && g.shake > 0) ctx.translate(Math.sin(clock * 90) * 6 * (g.shake / .3), 0);

  // soft centre glow
  const bg = ctx.createRadialGradient(cx, cy, R * .2, cx, cy, R * 1.35);
  bg.addColorStop(0, 'rgba(255,255,255,.10)'); bg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, S, S);

  // track
  ctx.lineCap = 'butt';
  ctx.lineWidth = tw; ctx.strokeStyle = (g && g.flashMiss > 0) ? 'rgba(255,94,114,' + (.25 + .5 * g.flashMiss / .35) + ')' : 'rgba(255,255,255,.16)';
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
  ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,.22)';
  ctx.beginPath(); ctx.arc(cx, cy, R + tw / 2 + 4, 0, TAU); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, R - tw / 2 - 4, 0, TAU); ctx.stroke();

  const playing = !!g && (state === 'playing' || state === 'countdown' || state === 'paused' || state === 'over');
  const theta = playing ? g.theta : demoTheta;
  if (playing) {
    // target arc
    const w = widthFor(g.hits), a0 = g.arc - w / 2, a1 = g.arc + w / 2, pulse = .5 + .5 * Math.sin(clock * 6);
    ctx.save(); ctx.shadowColor = 'rgba(31,199,155,.9)'; ctx.shadowBlur = 12 + 8 * pulse;
    ctx.lineWidth = tw; ctx.lineCap = 'round'; ctx.strokeStyle = '#1FC79B';
    ctx.beginPath(); ctx.arc(cx, cy, R, a0, a1); ctx.stroke(); ctx.restore();
    ctx.lineWidth = tw * .42; ctx.lineCap = 'round'; ctx.strokeStyle = '#B8FFE8';
    ctx.beginPath(); ctx.arc(cx, cy, R, g.arc - w * .17, g.arc + w * .17); ctx.stroke();
  } else {
    ctx.lineWidth = tw; ctx.lineCap = 'round'; ctx.strokeStyle = '#1FC79B';
    ctx.beginPath(); ctx.arc(cx, cy, R, -0.5, 0.5); ctx.stroke();
  }
  // trail
  if (playing && state === 'playing') {
    for (let i = g.trail.length - 1; i > 0; i--) {
      const a = g.trail[i].a, k = 1 - i / g.trail.length;
      ctx.fillStyle = 'rgba(255,255,255,' + (.28 * k) + ')'; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * R, cy + Math.sin(a) * R, tw * .5 * (.35 + .6 * k), 0, TAU); ctx.fill();
    }
  }
  // dot
  const dx = cx + Math.cos(theta) * R, dy = cy + Math.sin(theta) * R;
  ctx.save(); ctx.shadowColor = 'rgba(255,255,255,.95)'; ctx.shadowBlur = 16; ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(dx, dy, tw * .56, 0, TAU); ctx.fill(); ctx.restore();

  if (g) {
    // pulses
    g.pulses.forEach((p) => {
      const u = p.life / .5; ctx.strokeStyle = 'rgba(125,243,207,' + (.7 * (1 - u)) + ')'; ctx.lineWidth = 4 * (1 - u) + 1;
      ctx.beginPath(); ctx.arc(cx, cy, R + u * S * .12, 0, TAU); ctx.stroke();
    });
    g.parts.forEach((p) => { ctx.globalAlpha = Math.max(0, 1 - p.life / p.max); ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, 3.4, 0, TAU); ctx.fill(); });
    ctx.globalAlpha = 1;
  }

  // centre text
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
  if (state === 'countdown') {
    ctx.font = '700 ' + (S * .26) + 'px Fredoka, ui-rounded, system-ui, sans-serif';
    ctx.fillText(String(Math.max(1, Math.ceil(countdown))), cx, cy);
  } else if (playing) {
    const sc = 1 + (g.flashHit > 0 ? .18 * (g.flashHit / .25) : 0);
    ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc);
    ctx.font = '700 ' + (S * .22) + 'px Fredoka, ui-rounded, system-ui, sans-serif'; ctx.fillText(String(g.score), 0, -S * .01);
    ctx.restore();
    ctx.font = '600 ' + (S * .042) + 'px Fredoka, ui-rounded, system-ui, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.fillText(t('game.level', { n: levelFor(g.hits) }), cx, cy + S * .12);
    if (g.combo >= 3) { ctx.fillStyle = '#FFC93C'; ctx.font = '700 ' + (S * .05) + 'px Fredoka, ui-rounded, system-ui, sans-serif'; ctx.fillText('x' + g.combo, cx, cy + S * .19); }
  } else {
    ctx.font = '700 ' + (S * .075) + 'px Fredoka, ui-rounded, system-ui, sans-serif'; ctx.fillText('TAP', cx, cy);
  }
  if (g) g.floats.forEach((f) => {
    ctx.globalAlpha = Math.max(0, 1 - (f.life / f.max) * (f.life / f.max)); ctx.fillStyle = f.c;
    ctx.font = '700 ' + (S * .06) + 'px Fredoka, ui-rounded, system-ui, sans-serif'; ctx.fillText(f.text, f.x, f.y);
  });
  ctx.globalAlpha = 1;
  ctx.restore();
}
function frame(ts) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (ts - last) / 1000 || 0); last = ts;
  if (state !== 'paused') update(dt);
  draw();
}

/* =========================================================
   INPUT + UI WIRING
   ========================================================= */
$('boardWrap').addEventListener('pointerdown', (e) => { e.preventDefault(); tap(); });
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.key === 'Enter') { if (state === 'playing') { e.preventDefault(); tap(); } }
  else if (e.key === 'Escape' || e.key === 'p') { if (state === 'playing') pauseGame(); else if (state === 'paused') resumeGame(); }
});
function pauseGame() { if (state !== 'playing' && state !== 'countdown') return; resumeState = state; state = 'paused'; show('pauseOverlay'); }
function resumeGame() { if (state !== 'paused') return; state = resumeState; hide('pauseOverlay'); }
function goHome() { sndClick(); GC.goHome(); }

document.querySelectorAll('#modeRow .optbtn').forEach((b) => b.addEventListener('click', () => {
  sndClick(); mode = b.dataset.mode;
  document.querySelectorAll('#modeRow .optbtn').forEach((x) => x.classList.toggle('active', x === b));
  $('starterBox').classList.toggle('hidden', mode !== 'vs');
}));
document.querySelectorAll('#starterRow .optbtn').forEach((b) => b.addEventListener('click', () => {
  sndClick(); starter = parseInt(b.dataset.starter, 10);
  document.querySelectorAll('#starterRow .optbtn').forEach((x) => x.classList.toggle('active', x === b));
}));
$('startBtn').addEventListener('click', () => { sndClick(); getAudioCtx(); startGame(); });
$('turnGoBtn').addEventListener('click', () => { sndClick(); getAudioCtx(); hide('turnOverlay'); beginCountdown(); updateHud(); });
$('turnMenuBtn').addEventListener('click', () => { sndClick(); openMenu(); });
$('setupQuitBtn').addEventListener('click', goHome);
$('homeBtn').addEventListener('click', goHome);
$('helpBtn').addEventListener('click', () => { sndClick(); show('helpOverlay'); });
$('helpCloseBtn').addEventListener('click', () => { sndClick(); hide('helpOverlay'); });
$('pauseBtn').addEventListener('click', () => { if (state === 'playing' || state === 'countdown') { sndClick(); pauseGame(); } });
$('resumeBtn').addEventListener('click', () => { sndClick(); resumeGame(); });
$('pauseRestartBtn').addEventListener('click', () => { sndClick(); hide('pauseOverlay'); startGame(); });
$('pauseMenuBtn').addEventListener('click', () => { sndClick(); openMenu(); });
$('resAgainBtn').addEventListener('click', () => { sndClick(); hide('resultOverlay'); startGame(); });
$('resMenuBtn').addEventListener('click', () => { sndClick(); openMenu(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); });
window.addEventListener('resize', resize);
if (window.ResizeObserver) new ResizeObserver(resize).observe($('boardWrap'));

/* ===== INIT ===== */
applyTranslations(); setBars(); buildHearts(); $('bestNum').textContent = best;
resize(); requestAnimationFrame(frame);
