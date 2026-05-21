let history = [];
let historyIndex = -1;
const undoButton = document.getElementById('undoButton');
const redoButton = document.getElementById('redoButton');
const undoMenuItem = document.getElementById('undoMenuItem');
const redoMenuItem = document.getElementById('redoMenuItem');

function undo() {
    if (historyIndex > 0) {
        historyIndex--;
        restoreState();
    }
}

function redo() {
    if (historyIndex < history.length - 1) {
        historyIndex++;
        restoreState();
    }
}

function restoreState() {
    const stateToRestore = history[historyIndex];
    // Restaura el estado desde la copia
    nodes = JSON.parse(JSON.stringify(stateToRestore.nodes));
    edges = JSON.parse(JSON.stringify(stateToRestore.edges));
    nodeCounter = stateToRestore.nodeCounter;

    // Limpia la selección actual para evitar inconsistencias
    selectedNodeIds = [];
    selectedEdgeIds = [];

    redrawCanvas();
    updateUndoRedoButtons();
}

function saveState() {
    // Si hemos deshecho acciones, eliminamos el "futuro" que ya no es válido
    if (historyIndex < history.length - 1) {
        history = history.slice(0, historyIndex + 1);
    }

    // Se guarda una copia del estado actual
    const currentState = {
        nodes: JSON.parse(JSON.stringify(nodes)),   // Guarda las aristas
        edges: JSON.parse(JSON.stringify(edges)),   // Guarda los nodos
        nodeCounter: nodeCounter                    // Guarda el contador de nodos
    };

    history.push(currentState);
    historyIndex++;

    // Actualizar el estado de los botones de la UI
    updateUndoRedoButtons();
}


function updateUndoRedoButtons() {
    const canUndo = historyIndex > 0;
    const canRedo = historyIndex < history.length - 1;

    // Actualiza los botones de la barra de herramientas
    if (undoButton) undoButton.disabled = !canUndo;
    if (redoButton) redoButton.disabled = !canRedo;

    // Actualiza las opciones del menú de edición
    if (undoMenuItem) undoMenuItem.classList.toggle('disabled', !canUndo);
    if (redoMenuItem) redoMenuItem.classList.toggle('disabled', !canRedo);
}
