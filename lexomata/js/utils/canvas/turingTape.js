// ---------------------------------------------------------------------------------
// SECTION: Turing Tape Functionality
// ---------------------------------------------------------------------------------

let turingTapeState = {
    isCollapsed: false,
    cells: [],
    headPosition: 0,
    cellWidth: 55,
    totalCells: 20
};

// --- FUNCIONES DE CONTROL DEL PANEL ---

function showTuringTape() {
    const tapeContainer = document.querySelector('.turing-tape-container');
    if (tapeContainer) {
        tapeContainer.style.display = 'block';
        resizeTuringCanvas();
    }
}

function toggleTuringTape() {
    const tapeContainer = document.querySelector('.turing-tape-container');
    if (tapeContainer) {
        tapeContainer.classList.toggle('collapsed');
    }
}

// --- FUNCIONES DE DIBUJO ---

function resizeTuringCanvas() {
    const turingCanvas = document.getElementById('turingTapeCanvas');
    if (!turingCanvas || !turingCanvas.parentElement) return;

    const ctx = turingCanvas.getContext('2d');
    const container = turingCanvas.parentElement;
    const dpr = window.devicePixelRatio || 1;
    const cssWidth = container.clientWidth > 40 ? container.clientWidth - 40 : 0;
    const cssHeight = 80;

    turingCanvas.width = cssWidth * dpr;
    turingCanvas.height = cssHeight * dpr;
    turingCanvas.style.width = cssWidth + 'px';
    turingCanvas.style.height = cssHeight + 'px';

    ctx.scale(dpr, dpr);

    drawTuringTape(ctx, cssWidth, cssHeight);
}

function drawTuringTape(ctx, canvasCssWidth, canvasCssHeight) {
    const turingCanvas = document.getElementById('turingTapeCanvas');
    if (!turingCanvas) return;

    const isDarkMode = document.body.classList.contains('dark');
    const currentTheme = isDarkMode ? (window.colorPalette?.dark || {}) : (window.colorPalette?.light || {});

    // Colores por defecto
    const cellFill = currentTheme.turingCellFill || (isDarkMode ? '#2a2a3e' : '#ffffff');
    const cellStroke = currentTheme.turingCellStroke || (isDarkMode ? '#3a3a50' : '#ccc');
    const headStroke = currentTheme.turingHeadStroke || '#20c997';
    const cellText = currentTheme.turingCellText || (isDarkMode ? '#e0e0e0' : '#333');
    const indexText = currentTheme.turingIndexText || (isDarkMode ? '#aaa' : '#666');

    // Limpiar el canvas
    ctx.clearRect(0, 0, turingCanvas.width, turingCanvas.height);

    const cellWidth = turingTapeState.cellWidth;
    const cellHeight = 50;
    const startY = (canvasCssHeight - cellHeight) / 2;
    const visibleCells = Math.floor(canvasCssWidth / cellWidth);
    const startIndex = Math.max(0, turingTapeState.headPosition - Math.floor(visibleCells / 2));

    for (let i = 0; i < visibleCells; i++) {
        const cellIndex = startIndex + i;
        const x = i * cellWidth;

        ctx.fillStyle = cellFill;
        ctx.fillRect(x, startY, cellWidth, cellHeight);

        ctx.strokeStyle = cellStroke;
        ctx.lineWidth = 1;
        ctx.strokeRect(x, startY, cellWidth, cellHeight);

        if (cellIndex === turingTapeState.headPosition) {
            ctx.strokeStyle = headStroke;
            ctx.lineWidth = 2;
            ctx.strokeRect(x, startY, cellWidth, cellHeight);
        }

        const cellContent = turingTapeState.cells[cellIndex] || '';
        if (cellContent) {
            ctx.fillStyle = cellText;
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(cellContent, x + cellWidth / 2, startY + cellHeight / 2);
        }

        ctx.fillStyle = indexText;
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(cellIndex.toString(), x + cellWidth / 2, startY - 5);;
    }
}

// --- FUNCIONES DE MANIPULACIÓN DE LA CINTA ---

function resetTuringTape() {
    turingTapeState.cells = [];
    turingTapeState.headPosition = 0;
    resizeTuringCanvas();
}

function clearTuringTape() {
    turingTapeState.cells = [];
    resizeTuringCanvas();
}

function writeTuringCell(symbol) {
    while (turingTapeState.cells.length <= turingTapeState.headPosition) {
        turingTapeState.cells.push('');
    }
    turingTapeState.cells [turingTapeState.headPosition] = symbol;
    resizeTuringCanvas();
}

function moveTuringHead(direction) {
    if (direction === 'L' && turingTapeState.headPosition > 0) {
        turingTapeState.headPosition--;
    } else if (direction === 'R') {
        turingTapeState.headPosition++;
        while (turingTapeState.cells.length <= turingTapeState.headPosition) {
            turingTapeState.cells.push('');
        }
    }
    resizeTuringCanvas();
}

function readTuringCell() {
    return turingTapeState.cells [turingTapeState.headPosition] || '';
}

// --- INICIALIZACIÓN ---

function initializeTuringTape() {
    const toggleButton = document.getElementById('toggleTapeButton');
    const resetButton = document.getElementById('resetTapeButton');
    const clearButton = document.getElementById('clearTapeButton');
    const closeButton = document.getElementById('closeTapeContainerBtn');

    if (toggleButton) toggleButton.addEventListener('click', toggleTuringTape);
    if (resetButton) resetButton.addEventListener('click', resetTuringTape);
    if (clearButton) clearButton.addEventListener('click', clearTuringTape);
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            document.querySelector('.turing-tape-container').style.display = 'none';
        });
    }

    window.addEventListener('resize', resizeTuringCanvas);
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initializeTuringTape, 100);
});