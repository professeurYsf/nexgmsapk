'use strict';
// ==========================================================================
// Stop the Timer — jeu de précision (solo 3 manches / 2 joueurs 1 manche)
// Temps mesuré avec performance.now() (horloge monotone, haute résolution),
// durées cibles de 7,00 s à 17,00 s au centième de seconde.
// Le compteur visible démarre à 1,00 (centièmes) ; dès 3,00 un rideau se ferme (haut + bas), fermeture totale à 4,00 : ce temps compte dans la cible.
// ==========================================================================

// ---------- logique pure (testable) ----------
const MIN_CS = 700, MAX_CS = 1700, ROUNDS = 3, START_CS = 100, CLOSE_CS = 300, HIDE_CS = 400;
function randomTarget(prev) {
  let v;
  do { v = MIN_CS + Math.floor(Math.random() * (MAX_CS - MIN_CS + 1)); } while (v === prev);
  return v;                                   // centisecondes (entier)
}
const toCs = ms => Math.round(ms / 10);       // ms -> centisecondes
const gapOf = (cs, target) => Math.abs(cs - target);
const pointsOf = gap => Math.max(0, 1000 - Math.round(gap * 2.5));            // 0 s d'écart = 1000 pts, 4 s = 0
const precisionOf = (gap, target) => Math.max(0, 100 * (1 - gap / target));   // en %
function duoWinner(target, c1, c2) {          // 1, 2 ou 0 (match nul)
  const g1 = c1 == null ? Infinity : gapOf(c1, target), g2 = c2 == null ? Infinity : gapOf(c2, target);
  return g1 === g2 ? 0 : (g1 < g2 ? 1 : 2);
}
if (typeof document === 'undefined') { module.exports = { randomTarget, toCs, gapOf, pointsOf, precisionOf, duoWinner, MIN_CS, MAX_CS }; }
else {

// ---------- i18n ----------
const STR = {
  fr: { subtitle: 'Jeu de précision : arrête le chrono au bon moment', mode: 'Mode de jeu', solo: 'Solo', duo: '2 joueurs', start: 'Commencer', quit: 'Quitter',
    target: 'Cible', actual: 'Réel', gap: 'Écart', ready: 'Je suis prêt', stop: 'STOP', close: 'Compris',
    'help.title': 'Comment jouer', 'help.li1': 'Une durée cible (entre 7 et 17 secondes) s’affiche.', 'help.li2': 'Le chrono démarre à 1,00. À partir de 3,00 un rideau se ferme et le cache totalement à 4,00 : il continue en secret, compte dans ta tête à partir de 4.',
    'help.li3': 'Compte dans ta tête et appuie sur STOP quand tu penses avoir atteint la cible.', 'help.li4': 'Solo : 3 manches, le score dépend de ta précision.', 'help.li5': '2 joueurs : le plus proche de la cible gagne (rouge = joueur 1, bleu = joueur 2).',
    'hint.ready': 'Mémorise la cible, puis lance la manche', 'hint.ready2': 'Mémorisez la cible, puis lancez la manche', 'hint.run': 'Compte dans ta tête…', 'hint.run2': 'Comptez dans votre tête…', 'hint.count': 'Suis le compteur, il va disparaître…',
    round: 'Manche', 'p1': 'Joueur 1', 'p2': 'Joueur 2', locked: 'Verrouillé',
    early: 'Trop tôt de', late: 'Trop tard de', exact: 'Pile à l’heure !', 'r.perfect': '🎯 Parfait !', 'r.great': '🔥 Excellent !', 'r.good': '👍 Bien joué', 'r.meh': '😅 Peut mieux faire',
    pts: 'pts', nextRound: 'Manche suivante', seeFinal: 'Voir le résultat final',
    'final.banner': '🏁 Partie terminée', 'final.score': 'Score total', 'final.precision': 'Précision moy.', 'final.best': 'Meilleur écart', record: 'Nouveau record !',
    replay: 'Rejouer', menu: 'Retour au menu', changeMode: 'Changer de mode', 'duo.win': 'gagne !', 'duo.draw': '🤝 Match nul', 'duo.none': 'Pas d’appui', 'duo.gap': 'Écart', aborted: 'Manche interrompue, on recommence',
    'aria.back': 'Retour', 'aria.restart': 'Recommencer', 'aria.help': 'Comment jouer' },
  en: { subtitle: 'Precision game: stop the timer at the right moment', mode: 'Game mode', solo: 'Solo', duo: '2 players', start: 'Start', quit: 'Quit',
    target: 'Target', actual: 'Actual', gap: 'Gap', ready: 'I’m ready', stop: 'STOP', close: 'Got it',
    'help.title': 'How to play', 'help.li1': 'A target time (between 7 and 17 seconds) is shown.', 'help.li2': 'The timer starts at 1.00. From 3.00 a curtain closes and fully hides it at 4.00: it keeps running secretly, keep counting in your head from 4.',
    'help.li3': 'Count in your head and press STOP when you think the target is reached.', 'help.li4': 'Solo: 3 rounds, your score depends on your precision.', 'help.li5': '2 players: the closest to the target wins (red = player 1, blue = player 2).',
    'hint.ready': 'Memorize the target, then start the round', 'hint.ready2': 'Memorize the target, then start the round', 'hint.run': 'Count in your head…', 'hint.run2': 'Count in your heads…', 'hint.count': 'Follow the counter, it will disappear…',
    round: 'Round', 'p1': 'Player 1', 'p2': 'Player 2', locked: 'Locked',
    early: 'Too early by', late: 'Too late by', exact: 'Right on time!', 'r.perfect': '🎯 Perfect!', 'r.great': '🔥 Excellent!', 'r.good': '👍 Well done', 'r.meh': '😅 Could be better',
    pts: 'pts', nextRound: 'Next round', seeFinal: 'See final result',
    'final.banner': '🏁 Game over', 'final.score': 'Total score', 'final.precision': 'Avg. precision', 'final.best': 'Best gap', record: 'New record!',
    replay: 'Play again', menu: 'Back to menu', changeMode: 'Change mode', 'duo.win': 'wins!', 'duo.draw': '🤝 It’s a draw', 'duo.none': 'No press', 'duo.gap': 'Gap', aborted: 'Round interrupted, restarting',
    'aria.back': 'Back', 'aria.restart': 'Restart', 'aria.help': 'How to play' }
};
const LANG_KEY = 'gc_lang', SOUND_KEY = 'gc_sound', HOME_URL = '../../index.html';
const BEST_SCORE_KEY = 'stopTimerBestScore', BEST_GAP_KEY = 'stopTimerBestGap', MODE_KEY = 'stopTimerMode';
const $ = id => document.getElementById(id);
const ls = { get(k) { try { return localStorage.getItem(k) } catch (e) { return null } }, set(k, v) { try { localStorage.setItem(k, v) } catch (e) {} } };
let lang = 'fr', soundOn = true;
const t = k => (STR[lang] && STR[lang][k]) || STR.fr[k] || k;
const fmtClock = cs => (cs / 100).toFixed(2).replace('.', lang === 'fr' ? ',' : '.');
const fmt = cs => (cs / 100).toFixed(2).replace('.', lang === 'fr' ? ',' : '.') + ' s';
const snd = {}; ['click', 'move', 'win'].forEach(n => { snd[n] = new Audio('sounds/' + n + '.wav') });
function play(n) { if (soundOn && snd[n]) { const a = snd[n].cloneNode(true); a.play().catch(() => {}) } }
const show = e => e.classList.remove('hidden'), hide = e => e.classList.add('hidden');

// ---------- état ----------
const G = { mode: 'solo', round: 1, rounds: [], total: 0, target: 0, phase: 'ready', t0: 0, p1: null, p2: null, wins: [0, 0], timers: [], bestScore: 0, bestGap: null };
const later = (fn, ms) => { const id = setTimeout(fn, ms); G.timers.push(id); return id };
const clearTimers = () => { G.timers.forEach(clearTimeout); G.timers = []; cancelAnimationFrame(G.raf) };
function toast(msg) { const e = $('toast'); e.textContent = msg; show(e); clearTimeout(toast.h); toast.h = setTimeout(() => hide(e), 2300) }

function applyLanguage() {
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach(e => { e.textContent = t(e.getAttribute('data-i18n')) });
  [['btnBack', 'aria.back'], ['btnRestart', 'aria.restart'], ['btnHelp', 'aria.help']].forEach(([i, k]) => $(i).setAttribute('aria-label', t(k)));
  $('lblP1').textContent = t('p1'); $('lblP2').textContent = t('p2');
  refreshHud(); setPhase(G.phase);
}
function refreshHud() {
  const duo = G.mode === 'duo';
  $('roundChip').textContent = duo ? t('duo') : G.round + '/' + ROUNDS;
  $('scoreChip').textContent = duo ? G.wins[0] + ' – ' + G.wins[1] : G.total;
  $('bestChip').textContent = duo ? '🔴🔵' : (G.bestScore ? G.bestScore : '—');
}
function setPhase(p) {
  G.phase = p;
  const st = $('stage'); st.dataset.phase = p; st.dataset.mode = G.mode;
  const duo = G.mode === 'duo', run = p === 'run';
  const card = $('targetCard');
  card.classList.toggle('gone', duo && run);                 // 2 joueurs : la cible disparaît au démarrage du chrono
  card.classList.toggle('mini', !duo && (run || p === 'count'));
  $('btnStop').disabled = !(run && !duo);
  $('btnP1').disabled = !(run && G.p1 == null); $('btnP2').disabled = !(run && G.p2 == null);
  const hint = $('hintText');
  if (p === 'ready') hint.textContent = t(duo ? 'hint.ready2' : 'hint.ready');
  else if (p === 'count') hint.textContent = t('hint.count');
  else if (p === 'run') hint.textContent = t(duo ? 'hint.run2' : 'hint.run');
  else hint.textContent = '';
}
function curtain(p) { const h = (Math.min(1, Math.max(0, p)) * 50.4).toFixed(2) + '%'; $('cTop').style.height = h; $('cBot').style.height = h }
function ring(text, pop, clock) { const r = $('ringText'); r.textContent = text; r.classList.toggle('clock', !!clock); r.classList.remove('pop'); if (pop) { void r.offsetWidth; r.classList.add('pop') } }

// ---------- déroulement d'une manche ----------
function prepareRound(keepTarget) {
  clearTimers();
  if (!keepTarget) G.target = randomTarget(G.target);
  G.p1 = G.p2 = null;
  $('btnP1').classList.remove('locked'); $('btnP2').classList.remove('locked');
  $('lblP1').textContent = t('p1'); $('lblP2').textContent = t('p2');
  $('targetVal').textContent = fmt(G.target);
  curtain(0); ring('⏱', false); setPhase('ready'); refreshHud();
}
function beginCountdown() {
  if (G.phase !== 'ready') return;
  play('click');
  G.t0 = performance.now();                                  // départ du chronomètre (monotone) : le compteur visible commence à 1,00
  G.sec = 1; curtain(0); setPhase('count'); ring(fmtClock(START_CS), false, true);
  G.raf = requestAnimationFrame(clockLoop);
  later(timeout, (G.target * 2 + 500) * 10);                 // sécurité : personne n'appuie
}
function clockLoop() {                                       // affichage 1,00 -> 3,00 avec les centièmes, puis la valeur disparaît
  if (G.phase !== 'count') return;
  const cs = START_CS + Math.floor((performance.now() - G.t0) / 10);
  if (cs >= HIDE_CS) { curtain(1); ring('?', false, false); play('click'); setPhase('run'); return }
  curtain((cs - CLOSE_CS) / (HIDE_CS - CLOSE_CS));                         // 3,00 -> 4,00 : le rideau se ferme
  const sec = Math.floor(cs / 100); if (sec > G.sec) { G.sec = sec; play('click') }
  ring(fmtClock(cs), false, true);
  G.raf = requestAnimationFrame(clockLoop);
}
function stamp(e) {                                          // horodatage haute précision de l'appui
  const n = performance.now();
  return (e && typeof e.timeStamp === 'number' && e.timeStamp >= G.t0 - 1 && e.timeStamp <= n + 1) ? e.timeStamp : n;
}
function press(player, e) {
  if (G.phase !== 'run') return;
  const cs = START_CS + toCs(stamp(e) - G.t0);          // le temps affiché au départ (1,00) fait partie de la mesure
  if (G.mode === 'solo') { endSolo(cs); return }
  if (player === 1 && G.p1 == null) G.p1 = cs; else if (player === 2 && G.p2 == null) G.p2 = cs; else return;
  play('move');
  const b = $(player === 1 ? 'btnP1' : 'btnP2'); b.disabled = true; b.classList.add('locked'); $(player === 1 ? 'lblP1' : 'lblP2').textContent = '✔ ' + t('locked');
  if (G.p1 != null && G.p2 != null) endDuo();
}
function timeout() {
  if (G.phase !== 'run') return;
  if (G.mode === 'solo') endSolo(Math.round(G.target * 2 + 500)); else endDuo();
}

// ---------- solo ----------
function endSolo(cs) {
  clearTimers(); setPhase('done'); play('move');
  const gap = gapOf(cs, G.target), pts = pointsOf(gap), prec = precisionOf(gap, G.target);
  G.rounds.push({ target: G.target, actual: cs, gap, pts, prec }); G.total += pts; refreshHud();
  later(() => {
    const perfect = gap <= 5;
    $('roundBanner').textContent = t(gap <= 5 ? 'r.perfect' : gap <= 30 ? 'r.great' : gap <= 100 ? 'r.good' : 'r.meh');
    $('roundSub').textContent = cs === G.target ? t('exact') : (cs < G.target ? t('early') : t('late')) + ' ' + fmt(gap);
    $('rTarget').textContent = fmt(G.target); $('rActual').textContent = fmt(cs); $('rGap').textContent = fmt(gap);
    $('rPts').textContent = '+' + pts + ' ' + t('pts');
    $('nextRoundLbl').textContent = G.round >= ROUNDS ? t('seeFinal') : t('nextRound') + ' (' + (G.round + 1) + '/' + ROUNDS + ')';
    show($('roundOverlay')); if (perfect) { play('win'); confetti() }
  }, 450);
}
function nextRound() {
  hide($('roundOverlay')); $('confetti-container').innerHTML = '';
  if (G.round >= ROUNDS) { showFinal(); return }
  G.round++; prepareRound(false);
}
function showFinal() {
  const R = G.rounds, avg = R.reduce((s, r) => s + r.prec, 0) / R.length;
  const bestR = R.reduce((b, r) => r.gap < b.gap ? r : b, R[0]);
  const rec = G.total > G.bestScore;
  if (rec) { G.bestScore = G.total; ls.set(BEST_SCORE_KEY, G.total) }
  if (G.bestGap == null || bestR.gap < G.bestGap) { G.bestGap = bestR.gap; ls.set(BEST_GAP_KEY, bestR.gap) }
  refreshHud();
  $('fScore').textContent = G.total; $('fPrec').textContent = avg.toFixed(1).replace('.', lang === 'fr' ? ',' : '.') + ' %'; $('fBest').textContent = fmt(bestR.gap);
  $('newRecord').classList.toggle('hidden', !rec);
  $('roundList').innerHTML = R.map((r, i) => '<div class="round-row' + (r === bestR ? ' best' : '') + '"><span>' + t('round') + ' ' + (i + 1) + ' · ' + fmt(r.target) + ' → ' + fmt(r.actual) + '</span><b>±' + fmt(r.gap) + '</b></div>').join('');
  show($('finalOverlay')); play('win'); if (rec || bestR.gap <= 5) confetti();
}

// ---------- 2 joueurs ----------
function endDuo() {
  clearTimers(); setPhase('done'); play('move');
  const w = duoWinner(G.target, G.p1, G.p2);
  if (w) G.wins[w - 1]++; refreshHud();
  later(() => {
    $('duoBanner').textContent = w === 0 ? t('duo.draw') : (w === 1 ? '🔴 ' : '🔵 ') + t(w === 1 ? 'p1' : 'p2') + ' ' + t('duo.win');
    $('duoBanner').style.color = w === 1 ? 'var(--coral-deep)' : w === 2 ? '#1F5FE0' : 'var(--amber-deep)';
    $('duoTarget').textContent = t('target') + ' : ' + fmt(G.target);
    const row = (n, cs) => {
      const has = cs != null, g = has ? gapOf(cs, G.target) : null;
      return '<div class="duo-row p' + n + (w === n ? ' win' : '') + '"><div class="dot">' + n + '</div><div><div class="who">' + t('p' + n) + '</div><div class="time">' + (has ? fmt(cs) : '—') + '</div></div><div class="gap">' + t('duo.gap') + '<b>' + (has ? fmt(g) : t('duo.none')) + '</b></div></div>';
    };
    $('duoRows').innerHTML = row(1, G.p1) + row(2, G.p2);
    show($('duoOverlay')); if (w) { play('win'); confetti() }
  }, 450);
}

// ---------- divers ----------
function confetti() {
  const c = $('confetti-container'), cols = ['#6C5CE7', '#17B6CE', '#FF5E72', '#FFA93E', '#1FC79B'];
  for (let i = 0; i < 60; i++) { const e = document.createElement('div'); e.className = 'confetti'; e.style.left = Math.random() * 100 + '%'; e.style.backgroundColor = cols[Math.floor(Math.random() * cols.length)]; e.style.animationDuration = (Math.random() * 2 + 2) + 's'; e.style.animationDelay = Math.random() * .5 + 's'; c.appendChild(e) }
}
function newGame() {
  clearTimers(); ['roundOverlay', 'finalOverlay', 'duoOverlay', 'setupOverlay', 'helpOverlay'].forEach(i => hide($(i))); $('confetti-container').innerHTML = '';
  G.round = 1; G.rounds = []; G.total = 0; G.p1 = G.p2 = null; G.target = 0;
  prepareRound(false);
}
function showSetup() { clearTimers(); ['roundOverlay', 'finalOverlay', 'duoOverlay', 'helpOverlay'].forEach(i => hide($(i))); $('confetti-container').innerHTML = ''; prepareRound(false); show($('setupOverlay')) }
function goHome() { play('click'); GC.goHome() }
function setMode(m) {
  G.mode = m; ls.set(MODE_KEY, m);
  $('modeSolo').classList.toggle('active', m === 'solo'); $('modeDuo').classList.toggle('active', m === 'duo');
  refreshHud(); setPhase(G.phase);
}

function init() {
  lang = ls.get(LANG_KEY) === 'en' ? 'en' : 'fr'; soundOn = ls.get(SOUND_KEY) !== 'off';
  G.bestScore = parseInt(ls.get(BEST_SCORE_KEY), 10) || 0;
  const bg = parseInt(ls.get(BEST_GAP_KEY), 10); G.bestGap = isNaN(bg) ? null : bg;
  G.mode = ls.get(MODE_KEY) === 'duo' ? 'duo' : 'solo';
  $('modeSolo').onclick = () => { play('click'); setMode('solo') };
  $('modeDuo').onclick = () => { play('click'); setMode('duo') };
  $('btnStart').onclick = () => { play('click'); newGame() };
  $('btnExitSetup').onclick = goHome; $('btnBack').onclick = goHome; $('btnMenu1').onclick = goHome; $('btnMenu2').onclick = goHome;
  $('btnRestart').onclick = () => { play('click'); newGame() };
  $('btnMode1').onclick = () => { play('click'); showSetup() }; $('btnMode2').onclick = () => { play('click'); showSetup() };
  $('btnReplay1').onclick = () => { play('click'); newGame() };
  $('btnReplay2').onclick = () => { play('click'); hide($('duoOverlay')); $('confetti-container').innerHTML = ''; prepareRound(false) };
  $('btnNextRound').onclick = () => { play('click'); nextRound() };
  $('btnReady').onclick = beginCountdown;
  $('btnHelp').onclick = () => show($('helpOverlay')); $('btnHelpClose').onclick = () => hide($('helpOverlay'));
  // pointerdown = latence minimale pour les boutons de jeu
  $('btnStop').addEventListener('pointerdown', e => { e.preventDefault(); press(0, e) });
  $('btnP1').addEventListener('pointerdown', e => { e.preventDefault(); press(1, e) });
  $('btnP2').addEventListener('pointerdown', e => { e.preventDefault(); press(2, e) });
  document.addEventListener('keydown', e => {
    if (e.repeat) return;
    const k = e.key.toLowerCase();
    if (G.phase === 'ready' && $('setupOverlay').classList.contains('hidden') && (k === ' ' || k === 'enter') && !document.querySelector('.overlay:not(.hidden)')) { e.preventDefault(); beginCountdown(); return }
    if (G.phase !== 'run') return;
    if (G.mode === 'solo' && (k === ' ' || k === 'enter')) { e.preventDefault(); press(0, e) }
    else if (G.mode === 'duo' && k === 'a') press(1, e);
    else if (G.mode === 'duo' && k === 'l') press(2, e);
  });
  // si l'onglet/l'app est masqué pendant une manche : on la rejoue (équité)
  document.addEventListener('visibilitychange', () => { if (document.hidden && (G.phase === 'count' || G.phase === 'run')) { prepareRound(true); toast(t('aborted')) } });
  window.addEventListener('storage', e => { if (e.key === LANG_KEY) { lang = e.newValue === 'en' ? 'en' : 'fr'; applyLanguage(); if (G.target) $('targetVal').textContent = fmt(G.target) } });
  setMode(G.mode); G.target = randomTarget(0); $('targetVal').textContent = fmt(G.target);
  applyLanguage(); ring('⏱', false); setPhase('ready'); refreshHud();
}
init();
}
