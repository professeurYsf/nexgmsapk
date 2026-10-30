'use strict';

// ==========================================================================
// 4096 — game state
// ==========================================================================
const N = 4;               // grille 4x4
const WIN_VALUE = 4096;
const MAX_VALUE = 16384;   // 8192 + 8192 : fin du jeu

const STATE = {
    score: 0,
    best: 0,
    isSoundOn: true,
    isPaused: false,
    hasStarted: false,
    gameOver: false,
    wonShown: false,        // l'écran "4096 !" a déjà été montré pour cette partie
    continueAfterWin: false,
    maxShown: false,        // l'écran de fin (16384) a déjà été montré
    recordBroken: false,    // le record a été battu pendant cette partie
    lang: 'fr'
};

let grid = [];              // grid[r][c] = tile id | null
let tiles = {};             // id -> { id, value, r, c }
let uid = 0;

// ==========================================================================
// i18n — French / English, controlled from the main Game Collection screen
// (index.html) via the shared 'gc_lang' localStorage key.
// ==========================================================================
const LANG_KEY = 'gc_lang';

const STRINGS = {
    en: {
        'game.title': '4096',
        'game.subtitle': 'Merge matching numbers all the way to 4096',
        'game.start': 'Start',
        'game.quit': 'Quit',
        'game.score': 'Score',
        'game.best': 'Best',
        'pause.title': '🎮 Game paused',
        'pause.resume': 'Resume',
        'pause.restart': 'Restart',
        'pause.menu': 'Game menu',
        'help.title': 'How to play',
        'help.li1': 'Swipe with your finger to move every tile at once.',
        'help.li2': 'Two tiles with the same number and color merge into one tile of double the value.',
        'help.li3': 'Reach the 4096 tile to win, then keep going or stop. The maximum is 16384 (8192 + 8192).',
        'help.li4': 'The game ends when the grid is full and no merge is possible.',
        'help.close': 'Got it',
        'win.banner': '🎉 4096! Well done!',
        'win.continue': 'Keep going to 16384',
        'win.stop': 'Stop here',
        'max.banner': '🏆 You reached the end!',
        'max.sub': 'Tile 16384 reached: that is the maximum of the game.',
        'over.banner': 'Game over',
        'result.record': 'New record!',
        'result.again': 'Play again',
        'result.menu': 'New game',
        'aria.pause': 'Pause',
        'aria.help': 'How to play',
        'aria.home': 'Home'
    },
    fr: {
        'game.title': '4096',
        'game.subtitle': "Fusionne les nombres identiques jusqu'à 4096",
        'game.start': 'Commencer',
        'game.quit': 'Quitter',
        'game.score': 'Score',
        'game.best': 'Record',
        'pause.title': '🎮 Jeu en pause',
        'pause.resume': 'Continuer',
        'pause.restart': 'Recommencer',
        'pause.menu': 'Menu des jeux',
        'help.title': 'Comment jouer',
        'help.li1': 'Glisse le doigt sur la grille pour déplacer toutes les tuiles à la fois.',
        'help.li2': 'Deux tuiles portant le même nombre et la même couleur fusionnent en une seule tuile de valeur double.',
        'help.li3': "Atteins la tuile 4096 pour gagner, puis continue ou arrête-toi. Le maximum est 16384 (8192 + 8192).",
        'help.li4': "La partie se termine quand la grille est pleine et qu'aucune fusion n'est possible.",
        'help.close': 'Compris',
        'win.banner': '🎉 4096 ! Bravo !',
        'win.continue': "Continuer jusqu'à 16384",
        'win.stop': 'Arrêter ici',
        'max.banner': '🏆 Tu es arrivé à la fin !',
        'max.sub': "Tuile 16384 atteinte : c'est le maximum du jeu.",
        'over.banner': 'Partie terminée',
        'result.record': 'Nouveau record !',
        'result.again': 'Rejouer',
        'result.menu': 'Nouvelle partie',
        'aria.pause': 'Pause',
        'aria.help': 'Comment jouer',
        'aria.home': 'Accueil'
    }
};

function t(key) {
    return (STRINGS[STATE.lang] && STRINGS[STATE.lang][key]) || STRINGS.fr[key] || key;
}

function applyLanguage() {
    document.documentElement.lang = STATE.lang;
    document.title = t('game.title');

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.textContent = t(key);
    });

    document.getElementById('btnHelp').setAttribute('aria-label', t('aria.help'));
    document.getElementById('btnPause').setAttribute('aria-label', t('aria.pause'));
    document.getElementById('btnHome').setAttribute('aria-label', t('aria.home'));
}

const sounds = {
    move: new Audio('sounds/move.wav'),
    win: new Audio('sounds/win.wav'),
    click: new Audio('sounds/click.wav')
};

function playSound(type) {
    if (STATE.isSoundOn && sounds[type]) {
        const node = sounds[type].cloneNode(true);
        node.play().catch(() => {});
    }
}

// ---- element refs ---------------------------------------------------------
const elMainBoard = document.getElementById('main-board');
const elScore = document.getElementById('scoreDisplay');
const elBest = document.getElementById('bestDisplay');

const elSetupOverlay = document.getElementById('setupOverlay');
const elPauseOverlay = document.getElementById('pauseOverlay');
const elHelpOverlay = document.getElementById('helpOverlay');
const elWinOverlay = document.getElementById('winOverlay');
const elMaxOverlay = document.getElementById('maxOverlay');
const elOverOverlay = document.getElementById('overOverlay');

// Sound / language are controlled from the main Game Collection screen (index.html).
const SOUND_KEY = 'gc_sound';
const BEST_KEY = 'game4096Best';

const HOME_URL = '../../index.html';

function init() {
    loadSettings();
    applyLanguage();
    updateScoreDisplay();
    setupEventListeners();
}

function loadSettings() {
    const savedSound = localStorage.getItem(SOUND_KEY);
    STATE.isSoundOn = savedSound !== 'off';

    const savedLang = localStorage.getItem(LANG_KEY);
    STATE.lang = savedLang === 'fr' ? 'fr' : 'en';

    STATE.best = Number(localStorage.getItem(BEST_KEY)) || 0;
}

// ==========================================================================
// Overlay helpers
// ==========================================================================
function show(el) { el.classList.remove('hidden'); }
function hide(el) { el.classList.add('hidden'); }
function anyBlockingOverlayOpen() {
    return !elPauseOverlay.classList.contains('hidden') ||
           !elHelpOverlay.classList.contains('hidden') ||
           !elWinOverlay.classList.contains('hidden') ||
           !elMaxOverlay.classList.contains('hidden') ||
           !elOverOverlay.classList.contains('hidden');
}

function goHome() {
    GC.goHome();
}

// ==========================================================================
// Grid helpers
// ==========================================================================
function emptyGrid() {
    return Array.from({ length: N }, () => Array(N).fill(null));
}

function newGame() {
    grid = emptyGrid();
    tiles = {};
    uid = 0;
    STATE.score = 0;
    STATE.gameOver = false;
    STATE.wonShown = false;
    STATE.continueAfterWin = false;
    STATE.maxShown = false;
    STATE.recordBroken = false;
    updateScoreDisplay();
    elMainBoard.classList.remove('win-animate');

    spawnRandomTile();
    spawnRandomTile();
    render(new Set(), null);
}

function emptyCells() {
    const cells = [];
    for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
            if (!grid[r][c]) cells.push({ r, c });
        }
    }
    return cells;
}

function spawnRandomTile() {
    const cells = emptyCells();
    if (cells.length === 0) return null;
    const { r, c } = cells[Math.floor(Math.random() * cells.length)];
    const value = Math.random() < 0.9 ? 2 : 4;
    const id = 't' + (++uid);
    tiles[id] = { id, value, r, c };
    grid[r][c] = id;
    return id;
}

// ==========================================================================
// Move logic — a single generic line processor reused for all 4 directions.
// ==========================================================================
function lineCoords(dir, index) {
    const coords = [];
    if (dir === 'left') {
        for (let c = 0; c < N; c++) coords.push({ r: index, c });
    } else if (dir === 'right') {
        for (let c = N - 1; c >= 0; c--) coords.push({ r: index, c });
    } else if (dir === 'up') {
        for (let r = 0; r < N; r++) coords.push({ r, c: index });
    } else if (dir === 'down') {
        for (let r = N - 1; r >= 0; r--) coords.push({ r, c: index });
    }
    return coords;
}

function move(dir) {
    const newGridState = emptyGrid();
    let moved = false;
    let scoreGained = 0;
    const mergedIds = new Set();
    const removeIds = [];

    for (let index = 0; index < N; index++) {
        const coords = lineCoords(dir, index);

        const lineTiles = [];
        for (const { r, c } of coords) {
            const id = grid[r][c];
            if (id) lineTiles.push(tiles[id]);
        }

        const result = [];
        let i = 0;
        while (i < lineTiles.length) {
            const cur = lineTiles[i];
            const next = lineTiles[i + 1];
            if (next && next.value === cur.value && cur.value !== MAX_VALUE) {
                const newValue = cur.value * 2;
                result.push({ id: cur.id, value: newValue, mergedAwayId: next.id });
                scoreGained += newValue;
                i += 2;
            } else {
                result.push({ id: cur.id, value: cur.value, mergedAwayId: null });
                i += 1;
            }
        }

        for (let k = 0; k < coords.length; k++) {
            const { r, c } = coords[k];
            if (k < result.length) {
                const item = result[k];
                const tile = tiles[item.id];
                if (tile.r !== r || tile.c !== c) moved = true;
                tile.r = r;
                tile.c = c;
                if (item.mergedAwayId) {
                    tile.value = item.value;
                    mergedIds.add(tile.id);
                    removeIds.push(item.mergedAwayId);
                    moved = true;
                }
                newGridState[r][c] = tile.id;
            }
        }
    }

    if (moved) {
        for (const id of removeIds) delete tiles[id];
        grid = newGridState;
    }

    return { moved, scoreGained, mergedIds };
}

function canMerge() {
    for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
            const id = grid[r][c];
            if (!id) return true; // une case vide existe encore
            const value = tiles[id].value;
            if (c + 1 < N) {
                const rightId = grid[r][c + 1];
                if (!rightId) return true;
                if (tiles[rightId].value === value && value !== MAX_VALUE) return true;
            }
            if (r + 1 < N) {
                const downId = grid[r + 1][c];
                if (!downId) return true;
                if (tiles[downId].value === value && value !== MAX_VALUE) return true;
            }
        }
    }
    return false;
}

// ==========================================================================
// Rendering
// ==========================================================================
function digitClass(value) {
    const len = String(value).length;
    return len >= 5 ? 'digits-5' : len === 4 ? 'digits-4' : '';
}

function render(mergedIds, spawnedId) {
    elMainBoard.style.setProperty('--n', N);

    // grille de fond (cases vides)
    if (!elMainBoard.dataset.cellsBuilt) {
        for (let r = 0; r < N; r++) {
            for (let c = 0; c < N; c++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.style.transform = `translate(${c * 100}%, ${r * 100}%)`;
                elMainBoard.appendChild(cell);
            }
        }
        elMainBoard.dataset.cellsBuilt = '1';
    }

    const seenIds = new Set();

    for (const id in tiles) {
        seenIds.add(id);
        const tile = tiles[id];
        let el = elMainBoard.querySelector(`.tile[data-id="${id}"]`);

        if (!el) {
            el = document.createElement('div');
            el.dataset.id = id;
            el.className = 'tile';
            el.innerHTML = '<div class="tile-inner"><span class="tile-label"></span></div>';
            el.style.transform = `translate(${tile.c * 100}%, ${tile.r * 100}%)`;
            elMainBoard.appendChild(el);
            if (id === spawnedId) {
                el.classList.add('spawn');
                el.addEventListener('animationend', () => el.classList.remove('spawn'), { once: true });
            }
        } else {
            el.style.transform = `translate(${tile.c * 100}%, ${tile.r * 100}%)`;
        }

        el.className = `tile tile-v${tile.value} ${digitClass(tile.value)}`.trim();
        el.querySelector('.tile-label').textContent = tile.value;

        if (mergedIds.has(id)) {
            el.classList.add('merged');
            el.addEventListener('animationend', () => el.classList.remove('merged'), { once: true });
        }
    }

    // retire les tuiles fusionnées / disparues
    elMainBoard.querySelectorAll('.tile').forEach(el => {
        if (!seenIds.has(el.dataset.id)) el.remove();
    });
}

function updateScoreDisplay() {
    elScore.textContent = STATE.score;
    elBest.textContent = STATE.best;
}

function maybeSaveRecord() {
    if (STATE.score > STATE.best) {
        STATE.best = STATE.score;
        STATE.recordBroken = true;
        try { localStorage.setItem(BEST_KEY, String(STATE.best)); } catch (e) {}
    }
    return STATE.recordBroken;
}

// ==========================================================================
// Turn handling
// ==========================================================================
function canPlay() {
    return STATE.hasStarted && !STATE.isPaused && !STATE.gameOver && !anyBlockingOverlayOpen();
}

function handleMove(dir) {
    if (!canPlay()) return;

    const { moved, scoreGained, mergedIds } = move(dir);
    if (!moved) return;

    STATE.score += scoreGained;
    maybeSaveRecord();          // le record se met à jour en direct
    updateScoreDisplay();
    playSound('move');

    const spawnedId = spawnRandomTile();
    render(mergedIds, spawnedId);

    checkGameEvents();
}

function maxTileValue() {
    let max = 0;
    for (const id in tiles) max = Math.max(max, tiles[id].value);
    return max;
}

function checkGameEvents() {
    const maxVal = maxTileValue();

    // 16384 (8192 + 8192) : fin du jeu, plus aucun mouvement possible
    if (maxVal >= MAX_VALUE && !STATE.maxShown) {
        STATE.maxShown = true;
        STATE.gameOver = true;
        playSound('win');
        elMainBoard.classList.add('win-animate');
        setTimeout(() => {
            const isRecord = maybeSaveRecord();
            updateScoreDisplay();
            document.getElementById('maxScore').textContent = STATE.score;
            document.getElementById('maxBest').textContent = STATE.best;
            document.getElementById('maxNewRecord').classList.toggle('hidden', !isRecord);
            show(elMaxOverlay);
            triggerConfetti();
        }, 350);
        return;
    }

    // 4096 : victoire — le joueur peut continuer ou s'arrêter
    if (maxVal >= WIN_VALUE && !STATE.wonShown && !STATE.continueAfterWin) {
        STATE.wonShown = true;
        playSound('win');
        elMainBoard.classList.add('win-animate');
        setTimeout(() => {
            const isRecord = maybeSaveRecord();
            updateScoreDisplay();
            document.getElementById('winScore').textContent = STATE.score;
            document.getElementById('winBest').textContent = STATE.best;
            document.getElementById('winNewRecord').classList.toggle('hidden', !isRecord);
            show(elWinOverlay);
            triggerConfetti();
        }, 350);
        return;
    }

    if (!canMerge()) {
        STATE.gameOver = true;
        const isRecord = maybeSaveRecord();
        updateScoreDisplay();
        document.getElementById('overScore').textContent = STATE.score;
        document.getElementById('overBest').textContent = STATE.best;
        document.getElementById('overNewRecord').classList.toggle('hidden', !isRecord);
        show(elOverOverlay);
    }
}

function triggerConfetti() {
    const container = document.getElementById('confetti-container');
    const colors = ['#6C5CE7', '#17B6CE', '#FF5E72', '#FFA93E', '#1FC79B', '#FFD23E'];

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

// ==========================================================================
// Pause
// ==========================================================================
function pauseGame() {
    if (!STATE.hasStarted || STATE.gameOver || anyBlockingOverlayOpen()) return;
    STATE.isPaused = true;
    show(elPauseOverlay);
}
function resumeGame() {
    STATE.isPaused = false;
    hide(elPauseOverlay);
}

// ==========================================================================
// Controls: keyboard + swipe
// ==========================================================================
function setupControls() {
    // Movement is swipe/touch only — drag a finger up/down/left/right across the board.
    const frame = document.querySelector('.board-frame');
    let startX = 0, startY = 0, tracking = false;

    frame.addEventListener('pointerdown', (e) => {
        tracking = true;
        startX = e.clientX;
        startY = e.clientY;
    });

    frame.addEventListener('pointerup', (e) => {
        if (!tracking) return;
        tracking = false;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        const absX = Math.abs(dx), absY = Math.abs(dy);
        const threshold = 22;
        if (Math.max(absX, absY) < threshold) return;

        if (absX > absY) {
            handleMove(dx > 0 ? 'right' : 'left');
        } else {
            handleMove(dy > 0 ? 'down' : 'up');
        }
    });
}

// ==========================================================================
// Event wiring
// ==========================================================================
function setupEventListeners() {
    setupControls();

    // Setup screen
    document.getElementById('btnStart').addEventListener('click', () => {
        playSound('click');
        STATE.hasStarted = true;
        hide(elSetupOverlay);
        newGame();
    });
    document.getElementById('btnExitSetup').addEventListener('click', () => {
        playSound('click');
        goHome();
    });
    document.getElementById('btnHelp').addEventListener('click', () => {
        playSound('click');
        show(elHelpOverlay);
    });

    // Top bar
    document.getElementById('btnHome').addEventListener('click', () => {
        playSound('click');
        goHome();
    });
    document.getElementById('btnPause').addEventListener('click', () => {
        playSound('click');
        pauseGame();
    });

    // Help sheet
    document.getElementById('btnHelpClose').addEventListener('click', () => {
        playSound('click');
        hide(elHelpOverlay);
    });

    // Pause sheet
    document.getElementById('btnResume').addEventListener('click', () => {
        playSound('click');
        resumeGame();
    });
    document.getElementById('btnPauseRestart').addEventListener('click', () => {
        playSound('click');
        hide(elPauseOverlay);
        STATE.isPaused = false;
        newGame();
    });
    document.getElementById('btnPauseMenu').addEventListener('click', () => {
        playSound('click');
        goHome();
    });

    // Win sheet (4096 reached)
    document.getElementById('btnContinue').addEventListener('click', () => {
        playSound('click');
        STATE.continueAfterWin = true;
        hide(elWinOverlay);
        document.getElementById('confetti-container').innerHTML = '';
        elMainBoard.classList.remove('win-animate');
        checkGameEvents();
    });
    document.getElementById('btnWinRestart').addEventListener('click', () => {
        playSound('click');
        hide(elWinOverlay);
        document.getElementById('confetti-container').innerHTML = '';
        newGame();
    });
    document.getElementById('btnWinMenu').addEventListener('click', () => {
        playSound('click');
        goHome();
    });

    // End sheet (16384 reached)
    document.getElementById('btnMaxRestart').addEventListener('click', () => {
        playSound('click');
        hide(elMaxOverlay);
        document.getElementById('confetti-container').innerHTML = '';
        newGame();
    });
    document.getElementById('btnMaxMenu').addEventListener('click', () => {
        playSound('click');
        goHome();
    });

    // Game over sheet
    document.getElementById('btnOverRestart').addEventListener('click', () => {
        playSound('click');
        hide(elOverOverlay);
        newGame();
    });
    document.getElementById('btnOverMenu').addEventListener('click', () => {
        playSound('click');
        goHome();
    });

    // Keep this game's language in sync if the user comes back to it after
    // switching EN/FR on the main menu in another tab.
    window.addEventListener('storage', (e) => {
        if (e.key === LANG_KEY) {
            STATE.lang = e.newValue === 'fr' ? 'fr' : 'en';
            applyLanguage();
        }
    });
}

init();
