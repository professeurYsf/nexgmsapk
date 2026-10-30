'use strict';

// ==========================================================================
// Puzzle Couleurs — game state
// ==========================================================================
const STATE = {
    target: [0, 1, 2, 3, 4, 5, 6, 7, 8], // 8 = case vide
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

// ==========================================================================
// i18n — language is controlled from the main Game Collection screen
// (index.html) and shared through the 'gc_lang' localStorage key, exactly
// like the 'gc_sound' key is shared for audio.
// ==========================================================================
const LANG_KEY = 'gc_lang';

const STRINGS = {
    en: {
        'game.title': 'Color Puzzle',
        'game.target': 'Target',
        'game.subtitle': 'Reproduce the target color grid',
        'game.start': 'Start',
        'game.quit': 'Quit',
        'pause.title': '🎮 Game paused',
        'pause.resume': 'Resume',
        'pause.restart': 'Restart',
        'pause.menu': 'Game menu',
        'help.title': 'How to play',
        'help.li1': 'Reproduce the color layout shown in the "Target" panel.',
        'help.li2': 'Tap a block next to the empty space to move it.',
        'help.li3': 'Turn on "Move multiple tiles" to slide two aligned blocks at once.',
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
        'game.title': 'Puzzle Couleurs',
        'game.target': 'Cible',
        'game.subtitle': 'Reproduis la grille de couleurs cible',
        'game.start': 'Commencer',
        'game.quit': 'Quitter',
        'pause.title': '🎮 Jeu en pause',
        'pause.resume': 'Continuer',
        'pause.restart': 'Recommencer',
        'pause.menu': 'Menu des jeux',
        'help.title': 'Comment jouer',
        'help.li1': "Reproduis l'arrangement de couleurs montré dans « Cible ».",
        'help.li2': 'Touche un bloc voisin de la case vide pour la déplacer.',
        'help.li3': "Active « Déplacer plusieurs tuiles » pour glisser deux blocs alignés d'un coup.",
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

    // Values already displayed (best score, win stats) use formatting helpers
    // rather than translated strings, so no extra refresh is needed here.
}

const sounds = {
    move: new Audio('sounds/move.wav'),
    win: new Audio('sounds/win.wav'),
    click: new Audio('sounds/click.wav')
};

// ---- element refs ---------------------------------------------------------
const elMainBoard = document.getElementById('main-board');
const elRefBoard = document.getElementById('reference-board');
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
const MOVE_TWO_KEY = 'colorPuzzleMoveTwo';
const BEST_MOVES_KEY = 'colorPuzzleBestMoves';
const BEST_TIME_KEY = 'colorPuzzleBestTime';

const HOME_URL = '../../index.html';

function init() {
    loadSettings();
    applyLanguage();
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
// Target reference mini board
// ==========================================================================
function renderReferenceBoard() {
    elRefBoard.innerHTML = '';
    STATE.target.forEach(tileId => {
        const div = document.createElement('div');
        div.className = `ref-tile ${tileId === 8 ? 'empty' : 'color-' + tileId}`;
        elRefBoard.appendChild(div);
    });
}

// ==========================================================================
// Puzzle generation
// ==========================================================================
function generateRandomTarget() {
    const arr = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function generateSolvableBoard() {
    STATE.current = [...STATE.target];
    let emptyIdx = STATE.current.indexOf(8);
    let prevIdx = -1;

    for (let i = 0; i < 150; i++) {
        const neighbors = getNeighbors(emptyIdx);
        const validNeighbors = neighbors.filter(n => n !== prevIdx);
        const pick = validNeighbors.length > 0
            ? validNeighbors[Math.floor(Math.random() * validNeighbors.length)]
            : neighbors[0];

        [STATE.current[emptyIdx], STATE.current[pick]] = [STATE.current[pick], STATE.current[emptyIdx]];
        prevIdx = emptyIdx;
        emptyIdx = pick;
    }
}

function startNewPuzzle() {
    STATE.target = generateRandomTarget();
    renderReferenceBoard();
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

function getNeighbors(index) {
    const row = Math.floor(index / 3);
    const col = index % 3;
    const neighbors = [];
    if (row > 0) neighbors.push(index - 3);
    if (row < 2) neighbors.push(index + 3);
    if (col > 0) neighbors.push(index - 1);
    if (col < 2) neighbors.push(index + 1);
    return neighbors;
}

// if the clicked tile is exactly 2 cells away from the empty space in a
// straight line, returns the index of the tile sitting between them.
function getMoveTwoMiddleIndex(tileIdx, emptyIdx) {
    const row1 = Math.floor(tileIdx / 3), col1 = tileIdx % 3;
    const row2 = Math.floor(emptyIdx / 3), col2 = emptyIdx % 3;

    if (row1 === row2 && Math.abs(col1 - col2) === 2) {
        return row1 * 3 + 1;
    }
    if (col1 === col2 && Math.abs(row1 - row2) === 2) {
        return 3 + col1;
    }
    return null;
}

// ---- rendering --------------------------------------------------------
function renderMainBoard() {
    elMainBoard.innerHTML = '';
    STATE.current.forEach((tileId, index) => {
        if (tileId === 8) return;

        const col = index % 3;
        const row = Math.floor(index / 3);

        const tile = document.createElement('div');
        tile.className = `tile color-${tileId}`;
        tile.dataset.id = tileId;
        tile.style.transform = `translate(${col * 100}%, ${row * 100}%)`;

        const inner = document.createElement('div');
        inner.className = 'tile-inner';

        const circle = document.createElement('div');
        circle.className = 'tile-circle';

        inner.appendChild(circle);
        tile.appendChild(inner);

        tile.addEventListener('click', () => handleTileClick(tileId));
        elMainBoard.appendChild(tile);
    });
}

function moveTileToSlot(tileId, slotIdx) {
    const col = slotIdx % 3;
    const row = Math.floor(slotIdx / 3);
    const domTile = document.querySelector(`.tile[data-id="${tileId}"]`);
    domTile.style.transform = `translate(${col * 100}%, ${row * 100}%)`;
}

function handleTileClick(tileId) {
    if (STATE.isGameWon || STATE.isPaused) return;

    const tileIdx = STATE.current.indexOf(tileId);
    const emptyIdx = STATE.current.indexOf(8);
    const validMoves = getNeighbors(emptyIdx);

    if (validMoves.includes(tileIdx)) {
        [STATE.current[tileIdx], STATE.current[emptyIdx]] = [STATE.current[emptyIdx], STATE.current[tileIdx]];
        moveTileToSlot(tileId, emptyIdx);

        STATE.moves++;
        elMoves.textContent = STATE.moves;
        playSound('move');

        if (!STATE.timerStarted) startTimer();

        checkWinCondition();
        return;
    }

    if (STATE.moveTwoEnabled) {
        const middleIdx = getMoveTwoMiddleIndex(tileIdx, emptyIdx);
        if (middleIdx !== null && STATE.current[middleIdx] !== 8) {
            const middleTileId = STATE.current[middleIdx];

            STATE.current[emptyIdx] = middleTileId;
            STATE.current[middleIdx] = tileId;
            STATE.current[tileIdx] = 8;

            moveTileToSlot(middleTileId, emptyIdx);
            moveTileToSlot(tileId, middleIdx);

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
// Best score
// ==========================================================================
function getBest() {
    const moves = localStorage.getItem(BEST_MOVES_KEY);
    const time = localStorage.getItem(BEST_TIME_KEY);
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
        localStorage.setItem(BEST_MOVES_KEY, String(STATE.moves));
        localStorage.setItem(BEST_TIME_KEY, String(STATE.seconds));
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

    // Change shape = new puzzle (new target + freshly shuffled)
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
