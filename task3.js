const gameBoard = document.getElementById('gameBoard');
const statusDisplay = document.getElementById('status');
const restartButton = document.getElementById('restart');
const modeSelect = document.getElementById('mode');

let board = ['', '', '', '', '', '', '', '', ''];
let currentPlayer = 'X';
let gameActive = false;
let gameMode = 'pvp'; // Default mode: Player vs. Player

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

// Render the board
function renderBoard() {
    gameBoard.innerHTML = '';
    board.forEach((cell, index) => {
        const cellDiv = document.createElement('div');
        cellDiv.classList.add('cell');
        if (cell) cellDiv.classList.add('taken');
        cellDiv.textContent = cell;
        cellDiv.addEventListener('click', () => handleCellClick(index));
        gameBoard.appendChild(cellDiv);
    });
}

// Handle cell click
function handleCellClick(index) {
    if (board[index] || !gameActive) return;

    board[index] = currentPlayer;
    renderBoard();
    checkResult();

    if (gameActive) {
        if (gameMode === 'pvc' && currentPlayer === 'X') {
            currentPlayer = 'O';
            statusDisplay.textContent = `Computer's Turn`;
            setTimeout(computerMove, 500);
        } else {
            currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
            statusDisplay.textContent = `Player ${currentPlayer}'s Turn`;
        }
    }
}

// Computer's Move (Basic AI)
function computerMove() {
    const emptyCells = board.map((cell, index) => cell === '' ? index : null).filter(index => index !== null);
    if (emptyCells.length === 0) return;

    const randomIndex = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    board[randomIndex] = 'O';
    renderBoard();
    checkResult();

    if (gameActive) {
        currentPlayer = 'X';
        statusDisplay.textContent = `Player ${currentPlayer}'s Turn`;
    }
}

// Check for win or draw
function checkResult() {
    let roundWon = false;
    for (let condition of winningConditions) {
        const [a, b, c] = condition;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            roundWon = true;
            break;
        }
    }

    if (roundWon) {
        statusDisplay.textContent = `Player ${currentPlayer} Wins!`;
        gameActive = false;
        return;
    }

    if (!board.includes('')) {
        statusDisplay.textContent = `It's a Tie!`;
        gameActive = false;
        return;
    }
}

// Handle mode change
modeSelect.addEventListener('change', () => {
    gameMode = modeSelect.value;
    restartGame();
});

// Restart the game
function restartGame() {
    board = ['', '', '', '', '', '', '', '', ''];
    currentPlayer = 'X';
    gameActive = true;
    statusDisplay.textContent = gameMode === 'pvp' ? `Player X's Turn` : `Player X vs Computer`;
    renderBoard();
}

// Restart button
restartButton.addEventListener('click', restartGame);

// Initialize the game
renderBoard();
