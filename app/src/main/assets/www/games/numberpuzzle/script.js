'use strict';

// ==========================================================================
// Puzzle Numérique — game state
// ==========================================================================
const STATE = {
    n: 4,                // dimension de la grille (4 = 4x4, 5 = 5x5)
    type: 'numbers',     // 'numbers' | 'letters'
    target: [],
    current: [],
    startLayout: [],
    moves: 0,
    seconds: 0,
    timerHandle: null,
    timerStarted: false,
    isSoundOn: true,
    isGameWon: false,
    isPaused: false,
    hasStarted: false,   // becomes true once "Commencer" has been pressed at least once
    moveTwoEnabled: false,
    lang: 'fr'
};

let selectedType = 'numbers';
let selectedSize = 4;

// ==========================================================================
// i18n — language is controlled from the main Game Collection screen
// (index.html) and shared through the 'gc_lang' localStorage key, exactly
// like the 'gc_sound' key is shared for audio.
// ==========================================================================
const LANG_KEY = 'gc_lang';

const STRINGS = {
    en: {
        'game.title': 'Number Puzzle',
        'game.subtitle': 'Put the tiles back in order',
        'game.start': 'Start',
        'game.quit': 'Quit',
        'setup.tileType': 'Tile type',
        'setup.numbers': 'Numbers',
        'setup.letters': 'Letters',
        'setup.gridSize': 'Grid size',
        'pause.title': '🎮 Game paused',
        'pause.resume': 'Resume',
        'pause.restart': 'Restart',
        'pause.menu': 'Game menu',
        'help.title': 'How to play',
        'help.li1': 'Arrange the numbers (or letters) in order.',
        'help.li2': 'Tap a tile next to the empty space to move it.',
        'help.li3': 'Turn on "Move multiple tiles" to slide a whole row or column at once.',
        'help.li4': 'Finish it in as few moves as possible!',
        'help.close': 'Got it',
        'result.banner': '🎉 Congratulations!',
        'result.record': 'New record!',
        'result.moves': 'Moves',
        'result.time': 'Time',
        'result.best': 'Best',
        'result.again': 'Play again',
        'result.menu': 'New game',
        'aria.home': 'Home',
        'aria.pause': 'Pause',
        'aria.new': 'Change shape',
        'aria.restart': 'Restart',
        'aria.moveTwo': 'Move multiple tiles',
        'aria.help': 'How to play'
    },
    fr: {
        'game.title': 'Puzzle Numérique',
        'game.subtitle': 'Remets les tuiles dans le bon ordre',
        'game.start': 'Commencer',
        'game.quit': 'Quitter',
        'setup.tileType': 'Type de tuiles',
        'setup.numbers': 'Chiffres',
        'setup.letters': 'Lettres',
        'setup.gridSize': 'Taille de la grille',
        'pause.title': '🎮 Jeu en pause',
        'pause.resume': 'Continuer',
        'pause.restart': 'Recommencer',
        'pause.menu': 'Menu des jeux',
        'help.title': 'Comment jouer',
        'help.li1': "Range les chiffres (ou les lettres) dans l'ordre.",
        'help.li2': 'Touche une tuile voisine de la case vide pour la déplacer.',
        'help.li3': 'Active « Déplacer plusieurs tuiles » pour glisser toute une ligne d\'un coup.',
        'help.li4': 'Termine en un minimum de coups !',
        'help.close': 'Compris',
        'result.banner': '🎉 Félicitations !',
        'result.record': 'Nouveau record !',
        'result.moves': 'Coups',
        'result.time': 'Temps',
        'result.best': 'Record',
        'result.again': 'Rejouer',
        'result.menu': 'Nouvelle partie',
        'aria.home': 'Accueil',
        'aria.pause': 'Pause',
        'aria.new': 'Changer la forme',
        'aria.restart': 'Recommencer',
        'aria.moveTwo': 'Déplacer plusieurs tuiles',
        'aria.help': 'Comment jouer'
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

    document.getElementById('btnHome').setAttribute('aria-label', t('aria.home'));
    document.getElementById('btnPause').setAttribute('aria-label', t('aria.pause'));
    document.getElementById('btnNew').setAttribute('aria-label', t('aria.new'));
    btnMoveTwo.setAttribute('aria-label', t('aria.moveTwo'));
    document.getElementById('btnHelp').setAttribute('aria-label', t('aria.help'));
}

const sounds = {
    move: new Audio('sounds/move.wav'),
    win: new Audio('sounds/win.wav'),
    click: new Audio('sounds/click.wav')
};

// ---- element refs ---------------------------------------------------------
const elMainBoard = document.getElementById('main-board');
const elMoves = document.getElementById('movesDisplay');
const elTimer = document.getElementById('timerDisplay');
const elBest = document.getElementById('bestDisplay');

const elSetupOverlay = document.getElementById('setupOverlay');
const elPauseOverlay = document.getElementById('pauseOverlay');
const elHelpOverlay = document.getElementById('helpOverlay');
const elResultOverlay = document.getElementById('resultOverlay');

const btnMoveTwo = document.getElementById('btnMoveTwo');

// Sound is controlled from the main Game Collection screen (index.html), not from
// inside this game — 'gc_sound' is the same localStorage key it uses.
const SOUND_KEY = 'gc_sound';
const MOVE_TWO_KEY = 'numPuzzleMoveTwo';
const TYPE_KEY = 'numPuzzleType';
const SIZE_KEY = 'numPuzzleSize';

const HOME_URL = '../../index.html';

function init() {
    loadSettings();
    applyLanguage();
    updateSetupSelection();
    updateBestDisplay();
    setupEventListeners();
}

function loadSettings() {
    // gc_sound / gc_lang are written by the main Game Collection screen.
    const savedSound = localStorage.getItem(SOUND_KEY);
    STATE.isSoundOn = savedSound !== 'off';

    const savedLang = localStorage.getItem(LANG_KEY);
    STATE.lang = savedLang === 'en' ? 'en' : (savedLang === 'fr' ? 'fr' : 'en');

    const savedMoveTwo = localStorage.getItem(MOVE_TWO_KEY);
    STATE.moveTwoEnabled = savedMoveTwo === 'true';
    updateMoveTwoUI();

    const savedType = localStorage.getItem(TYPE_KEY);
    selectedType = savedType === 'letters' ? 'letters' : 'numbers';

    const savedSize = Number(localStorage.getItem(SIZE_KEY));
    selectedSize = savedSize === 5 ? 5 : 4;
}

function updateMoveTwoUI() {
    btnMoveTwo.setAttribute('aria-pressed', String(STATE.moveTwoEnabled));
}

function toggleMoveTwoMode() {
    STATE.moveTwoEnabled = !STATE.moveTwoEnabled;
    localStorage.setItem(MOVE_TWO_KEY, String(STATE.moveTwoEnabled));
    updateMoveTwoUI();
}

function playSound(type) {
    if (STATE.isSoundOn && sounds[type]) {
        const node = sounds[type].cloneNode(true);
        node.play().catch(() => {});
    }
}

// ==========================================================================
// Overlay helpers
// ==========================================================================
function show(el) { el.classList.remove('hidden'); }
function hide(el) { el.classList.add('hidden'); }

function goHome() {
    GC.goHome();
}

// ==========================================================================
// Setup (puzzle type + size) — button selection
// ==========================================================================
function updateSetupSelection() {
    document.querySelectorAll('.optbtn.mode').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === selectedType);
    });
    document.querySelectorAll('.optbtn.diff').forEach(btn => {
        btn.classList.toggle('active', Number(btn.dataset.size) === selectedSize);
    });
}

// ==========================================================================
// Puzzle generation (generalized for any grid size n)
// ==========================================================================
function letterFor(value) {
    return String.fromCharCode(64 + value); // 1 -> A, 2 -> B, ...
}

function buildTarget(n) {
    const total = n * n;
    const arr = [];
    for (let v = 1; v < total; v++) arr.push(v);
    arr.push(0); // 0 = case vide
    return arr;
}

function generateSolvableBoard() {
    STATE.current = [...STATE.target];
    let emptyIdx = STATE.current.indexOf(0);
    let prevIdx = -1;
    const shuffleSteps = STATE.n * STATE.n * 30;

    for (let i = 0; i < shuffleSteps; i++) {
        const neighbors = getNeighbors(emptyIdx, STATE.n);
        const validNeighbors = neighbors.filter(idx => idx !== prevIdx);
        const pick = validNeighbors.length > 0
            ? validNeighbors[Math.floor(Math.random() * validNeighbors.length)]
            : neighbors[0];

        [STATE.current[emptyIdx], STATE.current[pick]] = [STATE.current[pick], STATE.current[emptyIdx]];
        prevIdx = emptyIdx;
        emptyIdx = pick;
    }
}

function startNewPuzzle() {
    STATE.type = selectedType;
    STATE.n = selectedSize;
    localStorage.setItem(TYPE_KEY, STATE.type);
    localStorage.setItem(SIZE_KEY, String(STATE.n));

    STATE.target = buildTarget(STATE.n);
    generateSolvableBoard();
    STATE.startLayout = [...STATE.current];
    resetProgress();
    renderMainBoard();
    updateBestDisplay();
}

function restartSamePuzzle() {
    STATE.current = [...STATE.startLayout];
    resetProgress();
    renderMainBoard();
}

function resetProgress() {
    STATE.isGameWon = false;
    STATE.isPaused = false;
    STATE.moves = 0;
    STATE.seconds = 0;
    STATE.timerStarted = false;
    stopTimer();
    elMoves.textContent = '0';
    elTimer.textContent = '00:00';
    elMainBoard.classList.remove('win-animate');
}

function getNeighbors(index, n) {
    const row = Math.floor(index / n);
    const col = index % n;
    const neighbors = [];
    if (row > 0) neighbors.push(index - n);
    if (row < n - 1) neighbors.push(index + n);
    if (col > 0) neighbors.push(index - 1);
    if (col < n - 1) neighbors.push(index + 1);
    return neighbors;
}

// ---- rendering --------------------------------------------------------
function renderMainBoard() {
    elMainBoard.style.setProperty('--n', STATE.n);
    elMainBoard.dataset.n = STATE.n;
    elMainBoard.innerHTML = '';

    STATE.current.forEach((tileValue, index) => {
        if (tileValue === 0) return;

        const col = index % STATE.n;
        const row = Math.floor(index / STATE.n);

        const tile = document.createElement('div');
        const colorClass = tileValue % 2 === 1 ? 'tile-red' : 'tile-white';
        tile.className = `tile ${colorClass}`;
        tile.dataset.id = tileValue;
        tile.style.transform = `translate(${col * 100}%, ${row * 100}%)`;

        const inner = document.createElement('div');
        inner.className = 'tile-inner';

        const label = document.createElement('span');
        label.className = 'tile-label';
        label.textContent = STATE.type === 'letters' ? letterFor(tileValue) : String(tileValue);

        inner.appendChild(label);
        tile.appendChild(inner);

        tile.addEventListener('click', () => handleTileClick(tileValue));
        elMainBoard.appendChild(tile);
    });
}

function moveTileToSlot(tileValue, slotIdx) {
    const col = slotIdx % STATE.n;
    const row = Math.floor(slotIdx / STATE.n);
    const domTile = document.querySelector(`.tile[data-id="${tileValue}"]`);
    domTile.style.transform = `translate(${col * 100}%, ${row * 100}%)`;
}

// if the clicked tile shares a row or column with the empty space, returns
// the ordered chain of indices between them (nearest-to-empty first, the
// clicked tile last) so every tile in the line can slide together.
function getLineIndices(tileIdx, emptyIdx, n) {
    const row1 = Math.floor(tileIdx / n), col1 = tileIdx % n;
    const row2 = Math.floor(emptyIdx / n), col2 = emptyIdx % n;

    if (row1 === row2 && col1 !== col2) {
        const step = col1 < col2 ? -1 : 1;
        const indices = [];
        for (let c = col2 + step; ; c += step) {
            indices.push(row1 * n + c);
            if (c === col1) break;
        }
        return indices;
    }
    if (col1 === col2 && row1 !== row2) {
        const step = row1 < row2 ? -1 : 1;
        const indices = [];
        for (let r = row2 + step; ; r += step) {
            indices.push(r * n + col1);
            if (r === row1) break;
        }
        return indices;
    }
    return null;
}

function handleTileClick(tileValue) {
    if (STATE.isGameWon || STATE.isPaused) return;

    const tileIdx = STATE.current.indexOf(tileValue);
    const emptyIdx = STATE.current.indexOf(0);
    const validMoves = getNeighbors(emptyIdx, STATE.n);

    if (validMoves.includes(tileIdx)) {
        [STATE.current[tileIdx], STATE.current[emptyIdx]] = [STATE.current[emptyIdx], STATE.current[tileIdx]];
        moveTileToSlot(tileValue, emptyIdx);

        STATE.moves++;
        elMoves.textContent = STATE.moves;
        playSound('move');

        if (!STATE.timerStarted) startTimer();

        checkWinCondition();
        return;
    }

    if (STATE.moveTwoEnabled) {
        const line = getLineIndices(tileIdx, emptyIdx, STATE.n);
        if (line) {
            let currentEmptyIdx = emptyIdx;
            for (const idx of line) {
                const movingValue = STATE.current[idx];
                STATE.current[currentEmptyIdx] = movingValue;
                moveTileToSlot(movingValue, currentEmptyIdx);
                currentEmptyIdx = idx;
            }
            STATE.current[currentEmptyIdx] = 0;

            STATE.moves++;
            elMoves.textContent = STATE.moves;
            playSound('move');

            if (!STATE.timerStarted) startTimer();

            checkWinCondition();
        }
    }
}

// ==========================================================================
// Timer
// ==========================================================================
function startTimer() {
    STATE.timerStarted = true;
    STATE.timerHandle = setInterval(() => {
        STATE.seconds++;
        elTimer.textContent = formatTime(STATE.seconds);
    }, 1000);
}
function stopTimer() {
    if (STATE.timerHandle) clearInterval(STATE.timerHandle);
    STATE.timerHandle = null;
}
function formatTime(total) {
    const m = String(Math.floor(total / 60)).padStart(2, '0');
    const s = String(total % 60).padStart(2, '0');
    return `${m}:${s}`;
}

// ==========================================================================
// Pause — triggered by the Back button while a game is in progress
// ==========================================================================
function pauseGame() {
    if (STATE.isGameWon) return;
    STATE.isPaused = true;
    stopTimer();
    show(elPauseOverlay);
}
function resumeGame() {
    STATE.isPaused = false;
    hide(elPauseOverlay);
    if (STATE.timerStarted) startTimer();
}

function handleBackPress() {
    // Nothing started yet (still on the setup sheet) → go straight home.
    if (!STATE.hasStarted || STATE.isGameWon) { goHome(); return; }
    // A puzzle is in progress → show the pause sheet instead, like Five in a Row.
    pauseGame();
}

// ==========================================================================
// Best score — tracked per puzzle type + size combination
// ==========================================================================
function bestKey(suffix) {
    return `numPuzzleBest_${STATE.type}_${STATE.n}_${suffix}`;
}
function getBest() {
    const moves = localStorage.getItem(bestKey('moves'));
    const time = localStorage.getItem(bestKey('time'));
    if (moves === null || time === null) return null;
    return { moves: Number(moves), time: Number(time) };
}
function updateBestDisplay() {
    const best = getBest();
    elBest.textContent = best ? `${best.moves} · ${formatTime(best.time)}` : '—';
}
function maybeSaveRecord() {
    const best = getBest();
    const isBetter = !best || STATE.moves < best.moves || (STATE.moves === best.moves && STATE.seconds < best.time);
    if (isBetter) {
        localStorage.setItem(bestKey('moves'), String(STATE.moves));
        localStorage.setItem(bestKey('time'), String(STATE.seconds));
    }
    return isBetter;
}

// ==========================================================================
// Win
// ==========================================================================
function checkWinCondition() {
    const isWin = STATE.current.every((val, index) => val === STATE.target[index]);

    if (isWin) {
        STATE.isGameWon = true;
        stopTimer();
        playSound('win');
        elMainBoard.classList.add('win-animate');

        setTimeout(() => {
            const isRecord = maybeSaveRecord();
            updateBestDisplay();

            document.getElementById('winMoves').textContent = STATE.moves;
            document.getElementById('winTime').textContent = formatTime(STATE.seconds);
            const best = getBest();
            document.getElementById('winBest').textContent = best ? `${best.moves} · ${formatTime(best.time)}` : '—';
            document.getElementById('newRecord').classList.toggle('hidden', !isRecord);

            show(elResultOverlay);
            triggerConfetti();
        }, 450);
    }
}

function triggerConfetti() {
    const container = document.getElementById('confetti-container');
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

// ==========================================================================
// Event wiring
// ==========================================================================
function setupEventListeners() {
    // Home button (top bar) — straight to the games menu.
    document.getElementById('btnHome').addEventListener('click', () => {
        playSound('click');
        goHome();
    });

    // Pause button (top bar) — only while a puzzle is in progress.
    document.getElementById('btnPause').addEventListener('click', () => {
        if (!STATE.hasStarted || STATE.isGameWon || STATE.isPaused) return;
        playSound('click');
        pauseGame();
    });

    // Change shape = new puzzle (freshly shuffled)
    document.getElementById('btnNew').addEventListener('click', () => {
        if (!STATE.hasStarted) return;
        playSound('click');
        startNewPuzzle();
    });

    // Slide-multiple-tiles toggle (replaces the old sound button on the toolbar)
    btnMoveTwo.addEventListener('click', () => {
        playSound('click');
        toggleMoveTwoMode();
    });

    // Setup sheet: type / size selection
    document.querySelectorAll('.optbtn.mode').forEach(btn => {
        btn.addEventListener('click', () => {
            playSound('click');
            selectedType = btn.dataset.type;
            updateSetupSelection();
        });
    });
    document.querySelectorAll('.optbtn.diff').forEach(btn => {
        btn.addEventListener('click', () => {
            playSound('click');
            selectedSize = Number(btn.dataset.size);
            updateSetupSelection();
        });
    });

    document.getElementById('btnStart').addEventListener('click', () => {
        playSound('click');
        STATE.hasStarted = true;
        hide(elSetupOverlay);
        startNewPuzzle();
    });
    document.getElementById('btnExitSetup').addEventListener('click', () => {
        playSound('click');
        goHome();
    });

    // Help sheet
    document.getElementById('btnHelp').addEventListener('click', () => {
        playSound('click');
        show(elHelpOverlay);
    });
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
        restartSamePuzzle();
    });
    document.getElementById('btnPauseMenu').addEventListener('click', () => {
        playSound('click');
        goHome();
    });

    // Result sheet
    document.getElementById('btnPlayAgain').addEventListener('click', () => {
        playSound('click');
        hide(elResultOverlay);
        document.getElementById('confetti-container').innerHTML = '';
        startNewPuzzle();
    });
    document.getElementById('btnResultMenu').addEventListener('click', () => {
        playSound('click');
        hide(elResultOverlay);
        document.getElementById('confetti-container').innerHTML = '';
        updateSetupSelection();
        show(elSetupOverlay);
    });

    // Keep this game's language in sync if the user comes back to it after
    // switching EN/FR on the main menu in another tab (rare, but cheap to support).
    window.addEventListener('storage', (e) => {
        if (e.key === LANG_KEY) {
            STATE.lang = e.newValue === 'en' ? 'en' : 'fr';
            applyLanguage();
        }
    });
}

init();
