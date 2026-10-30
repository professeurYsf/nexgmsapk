'use strict';

// ==========================================================================
// Fruit Fusion — game logic (custom circle physics + canvas rendering)
// ==========================================================================

// ---- world geometry (logical units; scaled to the screen) ------------------
const W = 360, H = 560;
const WALL_L = 16, WALL_R = 344;       // inner walls
const FLOOR = 528;                      // inner floor
const TOP = 98;                         // top edge of the glass box
const LINE = 132;                       // danger line
const DROP_Y = 64;                      // height of the dropper

// ---- physics -------------------------------------------------------------
const STEP = 1 / 120;
const GRAVITY = 1500;
const MU_PAIR = 0.30, MU_WALL = 0.25;
const MAX_SPAWN_LEVEL = 4;              // cherry..orange can be dropped
const DROP_COOLDOWN = 0.5;
const OVER_TIME = 1.8;                  // seconds above the line before game over

const STATE = {
    score: 0, best: 0, isSoundOn: true, lang: 'fr',
    mode: 'setup',          // setup | playing | paused | over
    hammers: 1, hammerBusy: false,
    held: null, next: 0, cooldown: 0, aimX: W / 2,
    bigWon: false
};

let bodies = [], particles = [], floats = [];
let uid = 0, clock = 0;

// ==========================================================================
// i18n
// ==========================================================================
const LANG_KEY = 'gc_lang', SOUND_KEY = 'gc_sound', BEST_KEY = 'fruitFusionBest';
const HOME_URL = '../../index.html';

const STRINGS = {
    en: {
        'game.title': 'Fruit Fusion', 'game.subtitle': 'Merge matching fruits all the way to the watermelon',
        'game.start': 'Start', 'game.quit': 'Quit', 'game.score': 'Score', 'game.best': 'Best', 'game.next': 'Next',
        'pause.title': '🎮 Game paused', 'pause.resume': 'Resume', 'pause.restart': 'Restart', 'pause.menu': 'Game menu',
        'help.title': 'How to play',
        'help.li1': 'Touch or slide to position the fruit, then release to drop it.',
        'help.li2': 'Two identical fruits that touch merge into the next, bigger fruit.',
        'help.li3': 'Don’t let the pile rise above the dashed line.',
        'help.li4': 'The hammer removes every small fruit (cherry to mangosteen). The first one is free; extra hammers need a short ad.',
        'help.close': 'Got it',
        'hammer.title': 'Use the hammer?',
        'hammer.text': 'It removes all the small fruits, from the cherry to the mangosteen. The first one is free; extra hammers need a short ad.',
        'hammer.use': 'Use it', 'hammer.cancel': 'Cancel',
        'toast.none': 'No small fruit to remove yet',
        'over.banner': 'Game over', 'result.record': 'New record!', 'result.again': 'Play again', 'result.menu': 'Game menu',
        'aria.pause': 'Pause', 'aria.home': 'Home', 'aria.help': 'How to play', 'aria.hammer': 'Hammer'
    },
    fr: {
        'game.title': 'Fusion de Fruits', 'game.subtitle': 'Fusionne les fruits identiques jusqu’à la pastèque',
        'game.start': 'Commencer', 'game.quit': 'Quitter', 'game.score': 'Score', 'game.best': 'Record', 'game.next': 'Suivant',
        'pause.title': '🎮 Jeu en pause', 'pause.resume': 'Continuer', 'pause.restart': 'Recommencer', 'pause.menu': 'Menu des jeux',
        'help.title': 'Comment jouer',
        'help.li1': 'Touche ou glisse pour placer le fruit, puis relâche pour le lâcher.',
        'help.li2': 'Deux fruits identiques qui se touchent fusionnent en un fruit plus gros.',
        'help.li3': 'Ne laisse pas la pile dépasser la ligne en pointillés.',
        'help.li4': 'Le marteau supprime tous les petits fruits (de la cerise au mangoustan). Le premier est gratuit ; les suivants demandent une courte publicité.',
        'help.close': 'Compris',
        'hammer.title': 'Utiliser le marteau ?',
        'hammer.text': 'Il supprime tous les petits fruits, de la cerise au mangoustan. Le premier est gratuit ; les suivants demandent une courte publicité.',
        'hammer.use': 'Utiliser', 'hammer.cancel': 'Annuler',
        'toast.none': 'Aucun petit fruit à supprimer pour l’instant',
        'over.banner': 'Partie terminée', 'result.record': 'Nouveau record !', 'result.again': 'Rejouer', 'result.menu': 'Menu des jeux',
        'aria.pause': 'Pause', 'aria.home': 'Accueil', 'aria.help': 'Comment jouer', 'aria.hammer': 'Marteau'
    }
};
const t = k => (STRINGS[STATE.lang] && STRINGS[STATE.lang][k]) || STRINGS.fr[k] || k;

function applyLanguage() {
    document.documentElement.lang = STATE.lang;
    document.title = t('game.title');
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.getAttribute('data-i18n')); });
    $('btnHelp').setAttribute('aria-label', t('aria.help'));
    $('btnPause').setAttribute('aria-label', t('aria.pause'));
    $('btnHome').setAttribute('aria-label', t('aria.home'));
    $('btnHammer').setAttribute('aria-label', t('aria.hammer'));
}

// ==========================================================================
// DOM helpers
// ==========================================================================
const $ = id => document.getElementById(id);
const show = el => el.classList.remove('hidden');
const hide = el => el.classList.add('hidden');
const goHome = () => { GC.goHome(); };

const canvas = $('board'), ctx = canvas.getContext('2d');
const elWrap = $('boardWrap'), elFrame = $('boardFrame');

// ==========================================================================
// Audio
// ==========================================================================
const wav = { win: new Audio('sounds/win.wav'), click: new Audio('sounds/click.wav') };
function playSound(type) {
    if (!STATE.isSoundOn || !wav[type]) return;
    wav[type].cloneNode(true).play().catch(() => {});
}
let actx = null;
function tone(f0, f1, dur, type, vol) {
    if (!STATE.isSoundOn) return;
    try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!actx) actx = new AC();
        if (actx.state === 'suspended') actx.resume();
        const o = actx.createOscillator(), g = actx.createGain(), n = actx.currentTime;
        o.type = type || 'sine';
        o.frequency.setValueAtTime(f0, n);
        o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), n + dur);
        g.gain.setValueAtTime(vol || .25, n);
        g.gain.exponentialRampToValueAtTime(.001, n + dur);
        o.connect(g); g.connect(actx.destination);
        o.start(n); o.stop(n + dur + .02);
    } catch (e) {}
}
const sfxDrop = () => tone(220, 90, .12, 'sine', .3);
const sfxMerge = lv => { tone(300 + lv * 60, 520 + lv * 90, .16, 'triangle', .28); };
const sfxPop = () => tone(700, 260, .09, 'square', .1);

// ==========================================================================
// Rendering setup: sizing, sprites, icons
// ==========================================================================
let VIEW = { s: 1, dpr: 1 };
let sprites = [];
let theme = {};

function readTheme() {
    const cs = getComputedStyle(document.documentElement);
    const v = n => cs.getPropertyValue(n).trim();
    theme = { surfaceSoft: v('--surface-soft'), border: v('--border'), borderSoft: v('--border-soft'), coral: v('--coral'), textLo: v('--text-lo'), violet: v('--violet') };
}

function resize() {
    const availW = Math.max(120, elWrap.clientWidth - 28 - 12);
    const availH = Math.max(160, elWrap.clientHeight - 10 - 12);
    const s = Math.min(availW / W, availH / H);
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.style.width = Math.floor(W * s) + 'px';
    canvas.style.height = Math.floor(H * s) + 'px';
    canvas.width = Math.round(W * s * dpr);
    canvas.height = Math.round(H * s * dpr);
    const changed = Math.abs(s * dpr - VIEW.s * VIEW.dpr) > 0.01 || !sprites.length;
    VIEW = { s, dpr };
    if (changed) sprites = FRUITS.map((_, i) => makeSprite(i, s * dpr));
}

const iconCache = {};
function iconURL(level, px) {
    const key = level + ':' + px;
    if (iconCache[key]) return iconCache[key];
    const c = document.createElement('canvas'); c.width = c.height = px;
    const x = c.getContext('2d'); x.translate(px / 2, px / 2);
    const r = FRUITS[level].r; x.scale(px * .34 / r, px * .34 / r);
    DRAW[level](x, r);
    return (iconCache[key] = c.toDataURL());
}

function buildChain() {
    const el = $('chain'); el.innerHTML = '';
    FRUITS.forEach((f, i) => {
        const im = new Image(); im.src = iconURL(i, 64); im.alt = ''; im.draggable = false; el.appendChild(im);
        if (i === CLEAN_MAX_LEVEL) { const sp = document.createElement('span'); sp.className = 'sep'; el.appendChild(sp); }
    });
    const ar = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    ar.setAttribute('viewBox', '0 0 24 24'); ar.setAttribute('class', 'arrow'); ar.setAttribute('fill', 'none');
    ar.setAttribute('stroke', 'currentColor'); ar.setAttribute('stroke-width', '3'); ar.setAttribute('stroke-linecap', 'round'); ar.setAttribute('stroke-linejoin', 'round');
    ar.innerHTML = '<path d="M9 5l7 7-7 7"/>'; el.appendChild(ar);
    const cf = $('confirmFruits'); cf.innerHTML = '';
    for (let i = 0; i <= CLEAN_MAX_LEVEL; i++) { const im = new Image(); im.src = iconURL(i, 64); im.alt = ''; cf.appendChild(im); }
}

// ==========================================================================
// Game flow
// ==========================================================================
function randLevel() {
    const w = [30, 27, 21, 14, 8]; let r = Math.random() * 100;
    for (let i = 0; i < w.length; i++) { if ((r -= w[i]) < 0) return i; }
    return 0;
}

function newGame() {
    bodies = []; particles = []; floats = [];
    STATE.prevBest = STATE.best;
    STATE.score = 0; STATE.hammers = 1; STATE.hammerBusy = false; STATE.bigWon = false;
    STATE.held = randLevel(); STATE.next = randLevel(); STATE.cooldown = 0; STATE.aimX = W / 2;
    STATE.mode = 'playing';
    ['pauseOverlay', 'overOverlay', 'hammerOverlay', 'helpOverlay'].forEach(id => hide($(id)));
    $('confetti-container').innerHTML = '';
    updateHud();
}

function updateHud() {
    $('scoreDisplay').textContent = STATE.score;
    $('bestDisplay').textContent = STATE.best;
    $('nextImg').src = iconURL(STATE.next, 64);
    $('hammerCount').textContent = STATE.hammers > 0 ? STATE.hammers : 'AD';
    $('btnHammer').disabled = false;
}

function addScore(n) {
    STATE.score += n;
    if (STATE.score > STATE.best) { STATE.best = STATE.score; try { localStorage.setItem(BEST_KEY, String(STATE.best)); } catch (e) {} }
    updateHud();
}

function pauseGame() { if (STATE.mode !== 'playing') return; STATE.mode = 'paused'; show($('pauseOverlay')); }
function resumeGame() { if (STATE.mode !== 'paused') return; STATE.mode = 'playing'; hide($('pauseOverlay')); hide($('hammerOverlay')); }

function clampAim(x, level) {
    const r = FRUITS[level == null ? STATE.held : level].r;
    return Math.max(WALL_L + r, Math.min(WALL_R - r, x));
}

function dropFruit() {
    if (STATE.mode !== 'playing' || STATE.held == null) return;
    const lv = STATE.held, r = FRUITS[lv].r;
    const b = makeBody(lv, clampAim(STATE.aimX), DROP_Y);
    b.vy = 80; b.w = (Math.random() - .5) * .6;
    bodies.push(b);
    STATE.held = null; STATE.cooldown = DROP_COOLDOWN;
    sfxDrop();
}

function makeBody(level, x, y) {
    const r = FRUITS[level].r;
    return { id: ++uid, level, x, y, vx: 0, vy: 0, a: 0, w: 0, r, im: 1 / (r * r), born: clock, anim: 1, pop: 0, over: 0, dead: false, ghost: false, dying: -1, delay: 0 };
}

// ==========================================================================
// Physics
// ==========================================================================
function step(dt) {
    for (const b of bodies) {
        if (b.dying >= 0) continue;
        b.vy += GRAVITY * dt;
        b.vx *= 1 - .15 * dt; b.vy *= 1 - .05 * dt;
        b.w *= 1 - 2.2 * dt;
        b.x += b.vx * dt; b.y += b.vy * dt; b.a += b.w * dt;
        b.a -= b.a * 5 * dt;   // gently turns the face back upright
    }
    for (let it = 0; it < 5; it++) {
        for (const b of bodies) if (b.dying < 0) wallsFor(b);
        for (let i = 0; i < bodies.length; i++) {
            const a = bodies[i]; if (a.dying >= 0) continue;
            for (let j = i + 1; j < bodies.length; j++) {
                const c = bodies[j]; if (c.dying >= 0) continue;
                pairSolve(a, c);
            }
        }
    }
    for (const b of bodies) {
        if (b.dying >= 0) continue;
        if (b.vx * b.vx + b.vy * b.vy < 9) { b.vx = 0; b.vy = 0; }
        if (Math.abs(b.w) < .05) b.w = 0;
        if (b.w > 5) b.w = 5; else if (b.w < -5) b.w = -5;
    }
    mergePass();
}

function pairSolve(a, b) {
    const dx = b.x - a.x, dy = b.y - a.y, rr = a.r + b.r;
    if (dx * dx + dy * dy >= rr * rr) return;
    let d = Math.sqrt(dx * dx + dy * dy);
    let nx, ny;
    if (d < 1e-4) { nx = 0; ny = 1; d = 0; } else { nx = dx / d; ny = dy / d; }
    const imS = a.im + b.im, pen = rr - d;
    if (pen > .02) {
        const corr = (pen - .02) * .55 / imS;
        a.x -= nx * corr * a.im; a.y -= ny * corr * a.im;
        b.x += nx * corr * b.im; b.y += ny * corr * b.im;
    }
    const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
    if (vn >= 0) return;
    const e = vn < -120 ? .12 : 0;
    const jn = -(1 + e) * vn / imS;
    a.vx -= jn * a.im * nx; a.vy -= jn * a.im * ny;
    b.vx += jn * b.im * nx; b.vy += jn * b.im * ny;
    // friction (also makes the fruits roll)
    const tx = -ny, ty = nx;
    const vt = (b.vx - a.vx) * tx + (b.vy - a.vy) * ty - b.w * b.r - a.w * a.r;
    let jt = -vt / (3 * imS);
    const lim = MU_PAIR * jn; if (jt > lim) jt = lim; else if (jt < -lim) jt = -lim;
    a.vx -= jt * a.im * tx; a.vy -= jt * a.im * ty; b.vx += jt * b.im * tx; b.vy += jt * b.im * ty;
    a.w -= 2 * jt * a.im / a.r; b.w -= 2 * jt * b.im / b.r;
}

function wallContact(b, nx, ny, pen) {
    // n points from the body toward the wall
    b.x -= nx * pen; b.y -= ny * pen;
    const vn = b.vx * nx + b.vy * ny;
    if (vn <= 0) return;
    const e = vn > 120 ? .1 : 0;
    b.vx -= (1 + e) * vn * nx; b.vy -= (1 + e) * vn * ny;
    const tx = -ny, ty = nx;
    const vt = b.vx * tx + b.vy * ty + b.w * b.r;
    let dv = vt / 3;                               // velocity change along t (3 = 1 + 2 for a solid disc)
    const lim = MU_WALL * (1 + e) * vn; if (dv > lim) dv = lim; else if (dv < -lim) dv = -lim;
    b.vx -= dv * tx; b.vy -= dv * ty; b.w -= 2 * dv / b.r;
}
function wallsFor(b) {
    if (b.x - b.r < WALL_L) wallContact(b, -1, 0, b.r - (b.x - WALL_L));
    if (b.x + b.r > WALL_R) wallContact(b, 1, 0, b.r - (WALL_R - b.x));
    if (b.y + b.r > FLOOR) wallContact(b, 0, 1, b.r - (FLOOR - b.y));
}

// ==========================================================================
// Merging
// ==========================================================================
function mergePass() {
    let any = false;
    const born = [];
    for (let i = 0; i < bodies.length; i++) {
        const a = bodies[i]; if (a.dead || a.dying >= 0) continue;
        for (let j = i + 1; j < bodies.length; j++) {
            const b = bodies[j];
            if (b.dead || b.dying >= 0 || a.level !== b.level) continue;
            const dx = b.x - a.x, dy = b.y - a.y, rr = a.r + b.r + 1.2;
            if (dx * dx + dy * dy > rr * rr) continue;
            a.dead = b.dead = true; any = true;
            const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
            if (a.level === FRUITS.length - 1) {
                addScore(FRUITS[a.level].pts * 2);
                burst(mx, my, a.level, 26, 1.6);
                floatText(mx, my, '+' + FRUITS[a.level].pts * 2, a.level);
                sfxMerge(10); playSound('win'); confetti();
            } else {
                const lv = a.level + 1, n = makeBody(lv, mx, my);
                n.vx = (a.vx + b.vx) / 2; n.vy = (a.vy + b.vy) / 2; n.w = (a.w + b.w) / 2; n.a = (a.a + b.a) / 2;
                n.anim = 0; n.pop = 1; born.push(n);
                addScore(FRUITS[lv].pts);
                burst(mx, my, lv, 10 + lv, 1);
                floatText(mx, my, '+' + FRUITS[lv].pts, lv);
                sfxMerge(lv);
                if (lv === FRUITS.length - 1 && !STATE.bigWon) { STATE.bigWon = true; confetti(); playSound('win'); }
            }
            break;
        }
    }
    if (any) { bodies = bodies.filter(b => !b.dead); bodies.push(...born); }
}

// ==========================================================================
// Effects
// ==========================================================================
const PCOL = ['#e8283a', '#ec2f3f', '#9238cc', '#ffdc22', '#ff8a0d', '#ffa98e', '#e0222c', '#ffb800', '#9a6038', '#aee266', '#33b83f'];
function burst(x, y, level, n, power) {
    for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, sp = (60 + Math.random() * 160) * power;
        particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, life: 0, max: .45 + Math.random() * .35, size: 2.5 + Math.random() * 3.5 + level * .15, color: Math.random() < .3 ? '#ffffff' : PCOL[level] });
    }
}
function floatText(x, y, text, level) { floats.push({ x, y, text, life: 0, max: .9, color: PCOL[level] }); }

function confetti() {
    const box = $('confetti-container'); const cols = ['#FF5E72', '#FFA93E', '#1FC79B', '#6C5CE7', '#17B6CE', '#FFD23E'];
    for (let i = 0; i < 46; i++) {
        const d = document.createElement('div'); d.className = 'confetti';
        d.style.left = Math.random() * 100 + '%'; d.style.background = cols[i % cols.length];
        d.style.animationDuration = (1.6 + Math.random() * 1.6) + 's'; d.style.animationDelay = Math.random() * .4 + 's';
        box.appendChild(d); setTimeout(() => d.remove(), 3800);
    }
}

function toast(msg) {
    const el = $('toast'); el.textContent = msg; el.classList.add('show');
    clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), 1700);
}

// ==========================================================================
// Hammer: removes every small fruit (cherry .. mangosteen), once per game
// ==========================================================================
const smallFruits = () => bodies.filter(b => b.level <= CLEAN_MAX_LEVEL && b.dying < 0);

function askHammer() {
    if (STATE.mode !== 'playing' || STATE.hammerBusy) return;
    if (STATE.hammers <= 0) {
        STATE.mode = 'paused';
        GC.ads.reward('hammer', function () { STATE.mode = 'playing'; STATE.hammers = 1; updateHud(); askHammer(); },
            function () { if (STATE.mode === 'paused') STATE.mode = 'playing'; });
        return;
    }
    if (!smallFruits().length) { elFrame.classList.remove('shake'); void elFrame.offsetWidth; elFrame.classList.add('shake'); toast(t('toast.none')); return; }
    show($('hammerOverlay')); STATE.mode = 'paused';
}

function useHammer() {
    hide($('hammerOverlay')); STATE.mode = 'playing';
    if (STATE.hammers <= 0) return;
    STATE.hammers--; STATE.hammerBusy = true; updateHud();
    const fx = $('hammerFx'); fx.classList.remove('swing'); void fx.getBoundingClientRect(); fx.classList.add('swing');
    setTimeout(() => {
        elFrame.classList.remove('shake'); void elFrame.offsetWidth; elFrame.classList.add('shake');
        tone(140, 50, .25, 'sawtooth', .22);
        const list = smallFruits();
        list.forEach(b => { b.dying = 0; b.delay = Math.random() * .35; b.vx = b.vy = b.w = 0; });
    }, 380);
    setTimeout(() => { STATE.hammerBusy = false; $('hammerFx').classList.remove('swing'); }, 1000);
}

// ==========================================================================
// Update (visual timers, game over)
// ==========================================================================
function update(dt) {
    clock += dt;
    if (STATE.held == null) {
        STATE.cooldown -= dt;
        if (STATE.cooldown <= 0) { STATE.held = STATE.next; STATE.next = randLevel(); STATE.aimX = clampAim(STATE.aimX, STATE.held); updateHud(); }
    }
    let danger = false;
    for (const b of bodies) {
        if (b.anim < 1) b.anim = Math.min(1, b.anim + dt / .22);
        if (b.dying >= 0) {
            if (b.delay > 0) { b.delay -= dt; }
            else {
                b.dying += dt / .3;
                b.a += 6 * dt;
                if (b.dying >= 1) { b.dead = true; burst(b.x, b.y, b.level, 8 + b.level, .8); sfxPop(); }
            }
            continue;
        }
        const speed = Math.hypot(b.vx, b.vy);
        if (b.y - b.r < LINE && clock - b.born > 1.2 && speed < 70) { b.over += dt; danger = true; } else b.over = 0;
    }
    if (bodies.some(b => b.dead)) bodies = bodies.filter(b => !b.dead);
    STATE.danger = danger;
    for (const p of particles) { p.life += dt; p.vy += 600 * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    particles = particles.filter(p => p.life < p.max);
    for (const f of floats) { f.life += dt; f.y -= 34 * dt; }
    floats = floats.filter(f => f.life < f.max);
    if (bodies.some(b => b.over > OVER_TIME)) endGame();
}

function endGame() {
    STATE.mode = 'over';
    $('overScore').textContent = STATE.score; $('overBest').textContent = STATE.best;
    const rec = STATE.score > 0 && STATE.score >= STATE.best && STATE.score > STATE.prevBest;
    $('overNewRecord').classList.toggle('hidden', !rec);
    tone(330, 110, .5, 'sawtooth', .2);
    setTimeout(() => { if (STATE.mode === 'over') show($('overOverlay')); }, 500);
}

// ==========================================================================
// Drawing
// ==========================================================================
function rrect(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

function drawFruit(level, x, y, ang, sc, alpha) {
    const s = sprites[level]; if (!s) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); if (sc !== 1) ctx.scale(sc, sc);
    if (alpha < 1) ctx.globalAlpha = alpha;
    ctx.drawImage(s.canvas, -s.ext, -s.ext, s.ext * 2, s.ext * 2);
    ctx.restore();
}

function drawScene() {
    const k = VIEW.s * VIEW.dpr;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // backdrop
    let g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, theme.surfaceSoft); g.addColorStop(1, theme.surfaceSoft);
    ctx.fillStyle = g; rrect(0, 0, W, H, 18); ctx.fill();

    // glass box
    g = ctx.createLinearGradient(0, TOP, 0, FLOOR);
    g.addColorStop(0, 'rgba(23,182,206,.05)'); g.addColorStop(1, 'rgba(108,92,231,.14)');
    ctx.fillStyle = g; rrect(WALL_L - 8, TOP, WALL_R - WALL_L + 16, FLOOR - TOP + 12, 14); ctx.fill();
    ctx.lineWidth = 3.5; ctx.strokeStyle = theme.border;
    ctx.beginPath(); ctx.moveTo(WALL_L - 5, TOP); ctx.lineTo(WALL_L - 5, FLOOR); ctx.moveTo(WALL_R + 5, TOP); ctx.lineTo(WALL_R + 5, FLOOR); ctx.stroke();
    ctx.fillStyle = theme.border; rrect(WALL_L - 9, FLOOR, WALL_R - WALL_L + 18, 14, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.18)'; rrect(WALL_L - 9, FLOOR, WALL_R - WALL_L + 18, 4, 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.10)'; ctx.fillRect(WALL_L, TOP + 6, 10, FLOOR - TOP - 10);

    // danger line
    const pulse = STATE.danger ? .55 + .45 * Math.sin(clock * 10) : .38;
    ctx.save(); ctx.setLineDash([9, 8]); ctx.lineWidth = 2.5; ctx.strokeStyle = theme.coral; ctx.globalAlpha = pulse;
    ctx.beginPath(); ctx.moveTo(WALL_L - 4, LINE); ctx.lineTo(WALL_R + 4, LINE); ctx.stroke(); ctx.restore();

    // aim guide + held fruit
    if (STATE.mode !== 'setup' && STATE.held != null) {
        const lv = STATE.held, r = FRUITS[lv].r, x = clampAim(STATE.aimX);
        let land = FLOOR - r;
        for (const b of bodies) {
            if (b.dying >= 0) continue;
            const dx = Math.abs(b.x - x), rr = r + b.r;
            if (dx < rr) land = Math.min(land, b.y - Math.sqrt(rr * rr - dx * dx));
        }
        ctx.save(); ctx.fillStyle = theme.violet; ctx.globalAlpha = .45;
        for (let y = DROP_Y + r + 8; y < land - r - 4; y += 14) { ctx.beginPath(); ctx.arc(x, y, 2.2, 0, TAU); ctx.fill(); }
        ctx.restore();
        drawFruit(lv, x, land, 0, 1, .2);
        const bob = Math.sin(clock * 3) * 1.5;
        drawFruit(lv, x, DROP_Y + bob, 0, 1, 1);
    }

    // fruits
    for (const b of bodies) {
        let sc = 1;
        if (b.dying >= 0) { if (b.delay <= 0) sc = Math.max(0, 1 - b.dying) * (1 + .15 * Math.sin(b.dying * Math.PI)); }
        else if (b.anim < 1) { const u = b.anim; sc = b.pop ? 0.7 + 0.3 * (1 + 2.2 * Math.pow(u - 1, 3) + 1.2 * Math.pow(u - 1, 2)) : 1; }
        if (sc > 0) drawFruit(b.level, b.x, b.y, b.a, sc, 1);
    }

    // particles
    for (const p of particles) {
        ctx.globalAlpha = Math.max(0, 1 - p.life / p.max); ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1 - .4 * p.life / p.max), 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // floating scores
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    for (const f of floats) {
        const u = f.life / f.max; ctx.globalAlpha = Math.max(0, 1 - u * u);
        ctx.font = '700 22px Fredoka, ui-rounded, system-ui, sans-serif';
        ctx.lineWidth = 5; ctx.strokeStyle = f.color; ctx.strokeText(f.text, f.x, f.y);
        ctx.fillStyle = '#fff'; ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
}

// ==========================================================================
// Main loop
// ==========================================================================
let lastTs = 0, acc = 0;
function frame(ts) {
    requestAnimationFrame(frame);
    const dt = Math.min(.05, (ts - lastTs) / 1000 || 0); lastTs = ts;
    if (STATE.mode === 'playing' || STATE.mode === 'over') {
        acc += dt;
        let n = 0;
        while (acc >= STEP && n++ < 8) { step(STEP); acc -= STEP; }
        if (n >= 8) acc = 0;
        if (STATE.mode === 'playing') update(dt);
    }
    drawScene();
}

// ==========================================================================
// Input
// ==========================================================================
function worldX(e) { const r = canvas.getBoundingClientRect(); return (e.clientX - r.left) / r.width * W; }

function setupInput() {
    canvas.addEventListener('pointerdown', e => {
        if (STATE.mode !== 'playing') return;
        try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
        STATE.aimX = worldX(e);
    });
    canvas.addEventListener('pointermove', e => { if (STATE.mode === 'playing') STATE.aimX = worldX(e); });
    canvas.addEventListener('pointerup', e => { if (STATE.mode !== 'playing') return; STATE.aimX = worldX(e); dropFruit(); });
    window.addEventListener('keydown', e => {
        if (STATE.mode === 'playing') {
            if (e.key === 'ArrowLeft') { STATE.aimX -= 14; e.preventDefault(); }
            else if (e.key === 'ArrowRight') { STATE.aimX += 14; e.preventDefault(); }
            else if (e.key === ' ' || e.key === 'ArrowDown' || e.key === 'Enter') { dropFruit(); e.preventDefault(); }
            else if (e.key === 'p' || e.key === 'Escape') pauseGame();
            else if (e.key === 'h') askHammer();
        } else if (STATE.mode === 'paused' && (e.key === 'p' || e.key === 'Escape')) resumeGame();
    });
}

function setupEvents() {
    setupInput();
    const click = (id, fn) => $(id).addEventListener('click', () => { playSound('click'); fn(); });
    click('btnStart', () => { hide($('setupOverlay')); newGame(); });
    click('btnExitSetup', goHome);
    click('btnHome', goHome);
    click('btnHelp', () => show($('helpOverlay')));
    click('btnHelpClose', () => hide($('helpOverlay')));
    click('btnPause', pauseGame);
    click('btnResume', resumeGame);
    click('btnPauseRestart', () => { hide($('pauseOverlay')); newGame(); });
    click('btnPauseMenu', goHome);
    click('btnHammer', askHammer);
    click('btnHammerUse', useHammer);
    click('btnHammerCancel', resumeGame);
    click('btnOverRestart', () => { hide($('overOverlay')); newGame(); });
    click('btnOverMenu', goHome);
    document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); });
    window.addEventListener('resize', resize);
    if (window.ResizeObserver) new ResizeObserver(resize).observe(elWrap);
    new MutationObserver(readTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    window.addEventListener('storage', e => { if (e.key === LANG_KEY) { STATE.lang = e.newValue === 'fr' ? 'fr' : 'en'; applyLanguage(); } });
}

function init() {
    let sv = null, lg = null, bs = null;
    try { sv = localStorage.getItem(SOUND_KEY); lg = localStorage.getItem(LANG_KEY); bs = localStorage.getItem(BEST_KEY); } catch (e) {}
    STATE.isSoundOn = sv !== 'off';
    STATE.lang = lg === 'en' ? 'en' : 'fr';
    STATE.best = Number(bs) || 0;
    STATE.held = null; STATE.next = randLevel();
    readTheme(); applyLanguage(); resize(); buildChain(); updateHud(); setupEvents();
    requestAnimationFrame(frame);
}
init();
