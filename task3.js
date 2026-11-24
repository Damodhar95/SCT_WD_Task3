
// ==========================================
// NEON ARENA - TIC TAC TOE GAME ENGINE
// ==========================================

// DOM ELEMENTS
const gameBoard = document.getElementById("gameBoard");
const statusDisplay = document.getElementById("status");
const statusLabel = document.getElementById("statusLabel");
const turnSymbol = document.getElementById("turnSymbol");
const turnIndicator = document.getElementById("turnIndicator");

const modeSelect = document.getElementById("mode");
const difficultySelect = document.getElementById("difficulty");

const restartButton = document.getElementById("restart");
const resetScoresButton = document.getElementById("resetScores");

const scoreXDisplay = document.getElementById("scoreX");
const scoreODisplay = document.getElementById("scoreO");
const scoreDrawDisplay = document.getElementById("scoreDraw");

const streakXDisplay = document.getElementById("streakX");
const streakODisplay = document.getElementById("streakO");

const totalRoundsDisplay = document.getElementById("totalRounds");
const lastResultDisplay = document.getElementById("lastResult");
const winRateDisplay = document.getElementById("winRate");

const playerXRole = document.getElementById("playerXRole");
const playerORole = document.getElementById("playerORole");

const roundNumberDisplay = document.getElementById("roundNumber");
const moveHistoryDisplay = document.getElementById("moveHistory");

const matchMessage = document.getElementById("matchMessage");
const difficultyNote = document.getElementById("difficultyNote");

const soundToggle = document.getElementById("soundToggle");
const soundIcon = document.getElementById("soundIcon");
const soundText = document.getElementById("soundText");

// ==========================================
// GAME VARIABLES
// ==========================================

let board = Array(9).fill("");
let currentPlayer = "X";
let gameActive = true;

let gameMode = "pvp";
let difficulty = "medium";

let computerThinking = false;
let computerTimer = null;

let soundEnabled = false;
let audioContext = null;

let round = 1;
let moveHistory = [];

let scores = {
    X: 0,
    O: 0,
    draws: 0,
    total: 0
};

let streaks = {
    X: 0,
    O: 0
};

let lastResult = "--";

// ==========================================
// WINNING COMBINATIONS
// ==========================================

const winningConditions = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
];

// ==========================================
// SOUND ENGINE
// ==========================================

function playSound(frequency = 500, duration = 0.09, type = "sine") {
    if (!soundEnabled) return;

    try {
        audioContext ??= new (
            window.AudioContext || window.webkitAudioContext
        )();

        if (audioContext.state === "suspended") {
            audioContext.resume();
        }

        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();

        oscillator.type = type;

        oscillator.frequency.setValueAtTime(
            frequency,
            audioContext.currentTime
        );

        gain.gain.setValueAtTime(0.07, audioContext.currentTime);

        gain.gain.exponentialRampToValueAtTime(
            0.001,
            audioContext.currentTime + duration
        );

        oscillator.connect(gain);
        gain.connect(audioContext.destination);

        oscillator.start();
        oscillator.stop(audioContext.currentTime + duration);

    } catch (error) {
        console.warn("Sound could not be played:", error);
    }
}

function playWinSound() {
    playSound(520, 0.12);

    setTimeout(() => playSound(660, 0.12), 120);
    setTimeout(() => playSound(820, 0.22), 240);
}

// ==========================================
// STATUS DISPLAY
// ==========================================

function updateTurnDisplay(message, label = "CURRENT PLAYER") {
    statusDisplay.textContent = message;
    statusLabel.textContent = label;

    turnSymbol.textContent = currentPlayer;

    turnSymbol.classList.toggle(
        "is-o",
        currentPlayer === "O"
    );
}

function updateMessage(message, color = "cyan") {
    const dot = matchMessage.querySelector(".message-dot");

    matchMessage.lastChild.textContent = " " + message;

    if (color === "green") {
        dot.style.background = "var(--green)";
        dot.style.boxShadow = "0 0 8px var(--green)";
    } else if (color === "purple") {
        dot.style.background = "var(--purple)";
        dot.style.boxShadow = "0 0 8px var(--purple)";
    } else {
        dot.style.background = "var(--cyan)";
        dot.style.boxShadow = "0 0 8px var(--cyan)";
    }
}

// ==========================================
// BOARD RENDERING
// ==========================================

function renderBoard(winningCells = []) {
    gameBoard.innerHTML = "";

    board.forEach((value, index) => {
        const cell = document.createElement("button");

        cell.type = "button";
        cell.className = "cell";
        cell.textContent = value;

        cell.setAttribute(
            "aria-label",
            `Cell ${index + 1}${value ? `, ${value}` : ", empty"}`
        );

        if (value === "O") {
            cell.classList.add("o");
        }

        if (winningCells.includes(index)) {
            cell.classList.add("winner");
        }

        cell.disabled =
            Boolean(value) ||
            !gameActive ||
            computerThinking;

        cell.addEventListener("click", () => {
            handleCellClick(index);
        });

        gameBoard.appendChild(cell);
    });
}

// ==========================================
// MOVE HISTORY
// ==========================================

function updateMoveHistory() {
    moveHistoryDisplay.innerHTML = "";

    if (moveHistory.length === 0) {
        const empty = document.createElement("div");

        empty.className = "history-empty";
        empty.textContent = "WAITING FOR FIRST MOVE...";

        moveHistoryDisplay.appendChild(empty);
        return;
    }

    moveHistory.forEach((move, index) => {
        const item = document.createElement("div");

        item.className =
            "history-item" +
            (move.player === "O" ? " o-move" : "");

        const playerText = document.createElement("span");
        const positionText = document.createElement("span");

        playerText.textContent =
            `${String(index + 1).padStart(2, "0")} / ${move.player}` +
            (move.isComputer ? " · AI" : "");

        positionText.textContent = `CELL ${move.position}`;

        item.appendChild(playerText);
        item.appendChild(positionText);

        moveHistoryDisplay.appendChild(item);
    });

    moveHistoryDisplay.scrollTop =
        moveHistoryDisplay.scrollHeight;
}

function recordMove(index, player) {
    moveHistory.push({
        player,
        position: index + 1,
        isComputer: gameMode === "pvc" && player === "O"
    });

    updateMoveHistory();
}

// ==========================================
// SCOREBOARD AND ANALYTICS
// ==========================================

function updateScores() {
    scoreXDisplay.textContent = scores.X;
    scoreODisplay.textContent = scores.O;
    scoreDrawDisplay.textContent = scores.draws;

    streakXDisplay.textContent = streaks.X;
    streakODisplay.textContent = streaks.O;

    totalRoundsDisplay.textContent = scores.total;
    lastResultDisplay.textContent = lastResult;

    const winRate = scores.total === 0
        ? 0
        : Math.round((scores.X / scores.total) * 100);

    winRateDisplay.textContent = `${winRate}%`;
}

// ==========================================
// GAME RESULT CHECK
// ==========================================

function checkResult(currentBoard = board) {
    for (const condition of winningConditions) {
        const [a, b, c] = condition;

        if (
            currentBoard[a] &&
            currentBoard[a] === currentBoard[b] &&
            currentBoard[a] === currentBoard[c]
        ) {
            return {
                winner: currentBoard[a],
                cells: condition
            };
        }
    }

    if (!currentBoard.includes("")) {
        return {
            winner: "draw",
            cells: []
        };
    }

    return null;
}

// ==========================================
// MAIN PLAYER ACTION
// ==========================================

function handleCellClick(index) {
    if (
        !gameActive ||
        computerThinking ||
        board[index] !== ""
    ) {
        return;
    }

    makeMove(index, currentPlayer);
}

function makeMove(index, player) {
    if (!gameActive || board[index] !== "") return;

    board[index] = player;

    recordMove(index, player);

    playSound(
        player === "X" ? 570 : 390,
        0.08,
        "triangle"
    );

    const result = checkResult();

    if (result) {
        finishGame(result);
        return;
    }

    if (gameMode === "pvc" && player === "X") {
        currentPlayer = "O";
        computerThinking = true;

        updateTurnDisplay(
            "AI ANALYZING GRID...",
            "ARTIFICIAL INTELLIGENCE"
        );

        updateMessage("COMPUTER IS CALCULATING ITS NEXT MOVE.");

        renderBoard();

        computerTimer = setTimeout(computerMove, 650);
        return;
    }

    currentPlayer = player === "X" ? "O" : "X";

    updateTurnDisplay(
        gameMode === "pvc"
            ? "YOUR TURN"
            : `PLAYER ${currentPlayer}'S TURN`
    );

    updateMessage("GRID UPDATED. NEXT MOVE REQUIRED.");

    renderBoard();
}

// ==========================================
// FINISH THE ROUND
// ==========================================

function finishGame(result) {
    gameActive = false;
    computerThinking = false;

    scores.total++;

    if (result.winner === "draw") {
        scores.draws++;

        streaks.X = 0;
        streaks.O = 0;

        lastResult = "DRAW";

        updateTurnDisplay(
            "MATCH DRAWN",
            "FINAL RESULT"
        );

        updateMessage(
            "EQUAL STRATEGY. NO WINNER THIS ROUND.",
            "purple"
        );

        playSound(300, 0.2, "triangle");

    } else {
        const winner = result.winner;
        const loser = winner === "X" ? "O" : "X";

        scores[winner]++;

        streaks[winner]++;
        streaks[loser] = 0;

        lastResult =
            gameMode === "pvc" && winner === "X"
                ? "YOU WON"
                : gameMode === "pvc" && winner === "O"
                    ? "AI WON"
                    : `${winner} WON`;

        let message;

        if (gameMode === "pvc") {
            message = winner === "X"
                ? "YOU DEFEATED THE MACHINE!"
                : "THE AI CLAIMED THIS ROUND.";
        } else {
            message = `PLAYER ${winner} CLAIMS VICTORY!`;
        }

        updateTurnDisplay(
            message,
            "MATCH COMPLETE"
        );

        updateMessage(
            "WINNING COMBINATION DETECTED.",
            "green"
        );

        playWinSound();
    }

    updateScores();
    renderBoard(result.cells);
}

// ==========================================
// COMPUTER AI
// ==========================================

function computerMove() {
    computerTimer = null;

    if (!gameActive || gameMode !== "pvc") {
        computerThinking = false;
        renderBoard();
        return;
    }

    const index = chooseComputerMove();

    computerThinking = false;

    if (index !== -1) {
        makeMove(index, "O");
    }
}

function chooseComputerMove() {
    if (difficulty === "easy") {
        return randomMove();
    }

    if (difficulty === "medium") {
        return mediumMove();
    }

    return findBestMove();
}

// EASY AI: RANDOM MOVES

function randomMove() {
    const emptyCells = board
        .map((value, index) => value === "" ? index : -1)
        .filter(index => index !== -1);

    if (emptyCells.length === 0) return -1;

    return emptyCells[
        Math.floor(Math.random() * emptyCells.length)
    ];
}

// MEDIUM AI: WIN AND BLOCK

function mediumMove() {
    const winningMove = findImmediateMove("O");

    if (winningMove !== -1) {
        return winningMove;
    }

    const blockingMove = findImmediateMove("X");

    if (blockingMove !== -1) {
        return blockingMove;
    }

    if (board[4] === "") {
        return 4;
    }

    const corners = [0, 2, 6, 8].filter(
        index => board[index] === ""
    );

    if (corners.length > 0) {
        return corners[
            Math.floor(Math.random() * corners.length)
        ];
    }

    return randomMove();
}

function findImmediateMove(player) {
    for (const condition of winningConditions) {
        const empty = condition.filter(
            index => board[index] === ""
        );

        const filled = condition.filter(
            index => board[index] === player
        );

        if (empty.length === 1 && filled.length === 2) {
            return empty[0];
        }
    }

    return -1;
}

// ==========================================
// IMPOSSIBLE AI: MINIMAX
// ==========================================

function findBestMove() {
    let bestScore = -Infinity;
    let bestMoves = [];

    for (let i = 0; i < 9; i++) {
        if (board[i] === "") {
            board[i] = "O";

            const score = minimax(board, 0, false);

            board[i] = "";

            if (score > bestScore) {
                bestScore = score;
                bestMoves = [i];
            } else if (score === bestScore) {
                bestMoves.push(i);
            }
        }
    }

    if (bestMoves.length === 0) return -1;

    return bestMoves[
        Math.floor(Math.random() * bestMoves.length)
    ];
}

function minimax(currentBoard, depth, isMaximizing) {
    const result = checkResult(currentBoard);

    if (result) {
        if (result.winner === "O") return 10 - depth;
        if (result.winner === "X") return depth - 10;

        return 0;
    }

    if (isMaximizing) {
        let bestScore = -Infinity;

        for (let i = 0; i < 9; i++) {
            if (currentBoard[i] === "") {
                currentBoard[i] = "O";

                const score = minimax(
                    currentBoard,
                    depth + 1,
                    false
                );

                currentBoard[i] = "";

                bestScore = Math.max(bestScore, score);
            }
        }

        return bestScore;
    }

    let bestScore = Infinity;

    for (let i = 0; i < 9; i++) {
        if (currentBoard[i] === "") {
            currentBoard[i] = "X";

            const score = minimax(
                currentBoard,
                depth + 1,
                true
            );

            currentBoard[i] = "";

            bestScore = Math.min(bestScore, score);
        }
    }

    return bestScore;
}

// ==========================================
// GAME SETTINGS
// ==========================================

function updateGameSettings() {
    gameMode = modeSelect.value;
    difficulty = difficultySelect.value;

    playerXRole.textContent = "HUMAN PLAYER";

    if (gameMode === "pvc") {
        playerORole.textContent = "ARTIFICIAL INTELLIGENCE";
        difficultySelect.disabled = false;
    } else {
        playerORole.textContent = "HUMAN PLAYER";
        difficultySelect.disabled = true;
    }

    const notes = {
        easy: "Random AI moves. A good starting challenge.",
        medium: "Tactical AI blocks threats and takes winning chances.",
        hard: "Minimax AI calculates every possible outcome. It cannot be beaten with perfect play."
    };

    difficultyNote.textContent = notes[difficulty];
}

// ==========================================
// TIMER MANAGEMENT
// ==========================================

function clearComputerTimer() {
    if (computerTimer !== null) {
        clearTimeout(computerTimer);
        computerTimer = null;
    }

    computerThinking = false;
}

// ==========================================
// NEW ROUND
// ==========================================

function restartGame() {
    clearComputerTimer();

    board = Array(9).fill("");
    currentPlayer = "X";
    gameActive = true;

    moveHistory = [];

    round++;

    roundNumberDisplay.textContent =
        String(round).padStart(2, "0");

    updateMoveHistory();

    updateTurnDisplay(
        "PLAYER X'S TURN",
        "CURRENT PLAYER"
    );

    updateMessage("NEW ROUND INITIALIZED.");

    renderBoard();
}

// ==========================================
// RESET COMPLETE MATCH
// ==========================================

function resetMatch() {
    clearComputerTimer();

    scores = {
        X: 0,
        O: 0,
        draws: 0,
        total: 0
    };

    streaks = {
        X: 0,
        O: 0
    };

    lastResult = "--";
    round = 1;

    updateScores();

    board = Array(9).fill("");
    currentPlayer = "X";
    gameActive = true;

    moveHistory = [];

    roundNumberDisplay.textContent = "01";

    updateMoveHistory();

    updateTurnDisplay("PLAYER X'S TURN");

    updateMessage("MATCH RECORDS RESET.");

    renderBoard();
}

// ==========================================
// SOUND TOGGLE
// ==========================================

soundToggle.addEventListener("click", async () => {
    soundEnabled = !soundEnabled;

    soundToggle.setAttribute(
        "aria-pressed",
        String(soundEnabled)
    );

    soundIcon.textContent = soundEnabled ? "♫" : "♪";

    soundText.textContent = soundEnabled
        ? "SOUND ON"
        : "SOUND OFF";

    if (soundEnabled) {
        playSound(620, 0.12);
    }
});

// ==========================================
// EVENT LISTENERS
// ==========================================

modeSelect.addEventListener("change", () => {
    updateGameSettings();
    resetMatch();
});

difficultySelect.addEventListener("change", () => {
    difficulty = difficultySelect.value;

    updateGameSettings();
    resetMatch();
});

restartButton.addEventListener("click", restartGame);

resetScoresButton.addEventListener("click", resetMatch);

// ==========================================
// INITIALIZE GAME
// ==========================================

updateGameSettings();

updateScores();
updateMoveHistory();

updateTurnDisplay("PLAYER X'S TURN");

updateMessage("SYSTEM READY. MAKE YOUR MOVE.");

renderBoard();
