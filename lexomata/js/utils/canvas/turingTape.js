// ---------------------------------------------------------------------------------
// SECTION: Turing Tape Functionality
// ---------------------------------------------------------------------------------

let turingTapeState = {
    isCollapsed: false,
    cells: [],
    headPosition: 0,
    cellWidth: 50,
    totalCells: 20
};

// Inicializar la cinta de Turing
function initializeTuringTape() {
    const turingCanvas = document.getElementById('turingTapeCanvas');
    const toggleButton = document.getElementById('toggleTapeButton');
    const resetButton = document.getElementById('resetTapeButton');
    const clearButton = document.getElementById('clearTapeButton');
    
    if (!turingCanvas) return;
    
    // Configurar el canvas
    resizeTuringCanvas();
    drawTuringTape();
    
    // Event listeners
    if (toggleButton) {
        toggleButton.addEventListener('click', toggleTuringTape);
    }
    
    if (resetButton) {
        resetButton.addEventListener('click', resetTuringTape);
    }
    
    if (clearButton) {
        clearButton.addEventListener('click', clearTuringTape);
    }
    
    // Redimensionar canvas cuando cambie el tamaño de la ventana
    window.addEventListener('resize', resizeTuringCanvas);
}

// Redimensionar el canvas de la cinta
function resizeTuringCanvas() {
    const turingCanvas = document.getElementById('turingTapeCanvas');
    if (!turingCanvas) return;
    
    const container = turingCanvas.parentElement;
    turingCanvas.width = container.clientWidth - 40; // Padding
    turingCanvas.height = 80;
    
    drawTuringTape();
}

// Dibujar la cinta de Turing
function drawTuringTape() {
    const turingCanvas = document.getElementById('turingTapeCanvas');
    if (!turingCanvas) return;
    
    const ctx = turingCanvas.getContext('2d');
    const isDarkMode = document.body.classList.contains('dark');
    
    // Usar el mismo sistema de colores que el resto del proyecto
    const currentTheme = isDarkMode ? colorPalette.dark : colorPalette.light;
    
    ctx.clearRect(0, 0, turingCanvas.width, turingCanvas.height);
    
    const cellWidth = turingTapeState.cellWidth;
    const cellHeight = 50;
    const startY = (turingCanvas.height - cellHeight) / 2;
    const visibleCells = Math.floor(turingCanvas.width / cellWidth);
    const startIndex = Math.max(0, turingTapeState.headPosition - Math.floor(visibleCells / 2));
    
    // Dibujar las celdas
    for (let i = 0; i < visibleCells; i++) {
        const cellIndex = startIndex + i;
        const x = i * cellWidth;
        
        // Dibujar celda
        ctx.fillStyle = currentTheme.turingCellFill;
        ctx.fillRect(x, startY, cellWidth, cellHeight);
        
        // Dibujar borde
        ctx.strokeStyle = currentTheme.turingCellStroke;
        ctx.lineWidth = 1;
        ctx.strokeRect(x, startY, cellWidth, cellHeight);
        
        // Resaltar la celda donde está la cabeza lectora
        if (cellIndex === turingTapeState.headPosition) {
            ctx.strokeStyle = currentTheme.turingHeadStroke;
            ctx.lineWidth = 3;
            ctx.strokeRect(x, startY, cellWidth, cellHeight);
        }
        
        // Dibujar contenido de la celda
        const cellContent = turingTapeState.cells[cellIndex] || '';
        if (cellContent) {
            ctx.fillStyle = currentTheme.turingCellText;
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(cellContent, x + cellWidth / 2, startY + cellHeight / 2);
        }
        
        // Dibujar índice de la celda (pequeño)
        ctx.fillStyle = currentTheme.turingIndexText;
        ctx.font = '10px Arial';
        ctx.fillText(cellIndex.toString(), x + cellWidth / 2, startY - 5);
    }
}

// Toggle mostrar/ocultar cinta
function toggleTuringTape() {
    const tapeContainer = document.querySelector('.turing-tape-wrapper');
    const toggleButton = document.getElementById('toggleTapeButton');
    const icon = toggleButton.querySelector('i');
    
    if (tapeContainer.style.display === 'none') {
        tapeContainer.style.display = 'block';
        icon.className = 'fas fa-chevron-down';
    } else {
        tapeContainer.style.display = 'none';
        icon.className = 'fas fa-chevron-up';
    }
}

// Reiniciar la cinta
function resetTuringTape() {
    turingTapeState.cells = [''];
    turingTapeState.headPosition = 0;
    drawTuringTape();
}

// Limpiar la cinta
function clearTuringTape() {
    turingTapeState.cells = new Array(turingTapeState.totalCells).fill('');
    drawTuringTape();
}

// Escribir en la celda actual
function writeTuringCell(symbol) {
    while (turingTapeState.cells.length <= turingTapeState.headPosition) {
        turingTapeState.cells.push('');
    }
    turingTapeState.cells[turingTapeState.headPosition] = symbol;
    drawTuringTape();
}

// Mover la cabeza lectora
function moveTuringHead(direction) {
    if (direction === 'L' && turingTapeState.headPosition > 0) {
        turingTapeState.headPosition--;
    } else if (direction === 'R') {
        turingTapeState.headPosition++;
        // Extender la cinta si es necesario
        while (turingTapeState.cells.length <= turingTapeState.headPosition) {
            turingTapeState.cells.push('');
        }
    }
    drawTuringTape();
}

// Leer la celda actual
function readTuringCell() {
    return turingTapeState.cells[turingTapeState.headPosition] || '';
}

// Inicializar cuando se cargue el DOM
document.addEventListener('DOMContentLoaded', () => {
    // Pequeño delay para asegurar que todos los elementos estén cargados
    setTimeout(initializeTuringTape, 100);
});
