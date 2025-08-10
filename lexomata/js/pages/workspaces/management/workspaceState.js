let nodes = [];
let edges = [];
let nodeCounter = 0
let selectedNodeIds = [];
let selectedEdgeIds = [];
let currentTool = 'select';
let edgeCreationState = { firstNode: null };
let isSelecting = false;
let selectionStart = { x: 0, y: 0 };
let selectionEnd = { x: 0, y: 0 };
const urlParams = new URLSearchParams(window.location.search);
const currentMode = urlParams.get('mode') || 'automata';

// Estado global de ejecución para controlar interacciones del canvas
let isExecutionActive = false;

const exportFormatSelect = document.getElementById('exportFormat');
const transparentOption = document.getElementById('transparentOption');
const exportThemeSelect = document.getElementById('exportTheme');

/**
 * Activa el estado de ejecución y bloquea las interacciones del canvas
 */
function startExecution() {
    isExecutionActive = true;
    // Limpiar selecciones previas al iniciar ejecución
    selectedNodeIds = [];
    selectedEdgeIds = [];
    updateCanvasInteractionState();
}

/**
 * Desactiva el estado de ejecución y restaura las interacciones del canvas
 */
function stopExecution() {
    isExecutionActive = false;
    // Limpiar resaltado de ejecución al terminar
    selectedNodeIds = [];
    selectedEdgeIds = [];
    
    // Restaurar mensaje original del indicador
    const indicator = document.getElementById('execution-indicator');
    if (indicator) {
        indicator.innerHTML = '<i class="fas fa-play"></i> Ejecución activa - Canvas bloqueado';
    }
    
    updateCanvasInteractionState();
    redrawCanvas();
}

/**
 * Verifica si hay una ejecución activa
 * @returns {boolean} - True si hay una ejecución activa
 */
function isExecuting() {
    return isExecutionActive;
}

/**
 * Resalta el nodo actual durante la ejecución
 * @param {string} nodeId - ID del nodo a resaltar
 */
function highlightCurrentExecutionNode(nodeId) {
    if (isExecutionActive && nodeId) {
        selectedNodeIds = [nodeId];
        redrawCanvas();
        
        // Opcionalmente mostrar información del nodo actual
        showCurrentNodeInfo(nodeId);
    }
}

/**
 * Muestra información del nodo actual durante la ejecución
 * @param {string} nodeId - ID del nodo actual
 */
function showCurrentNodeInfo(nodeId) {
    if (typeof nodes === 'undefined') return;
    
    const currentNode = nodes.find(node => node.id === nodeId);
    if (!currentNode) return;
    
    // Actualizar el indicador de ejecución con información del nodo
    const indicator = document.getElementById('execution-indicator');
    if (indicator) {
        const nodeType = currentNode.IsStart ? 'inicial' : 
                        currentNode.IsEnd ? 'final' : 'normal';
        indicator.innerHTML = `<i class="fas fa-play"></i> Ejecutando - Estado: ${currentNode.label} (${nodeType})`;
    }
}

/**
 * Limpia el resaltado de ejecución
 */
function clearExecutionHighlight() {
    if (isExecutionActive) {
        selectedNodeIds = [];
        redrawCanvas();
        
        // Restaurar mensaje original del indicador
        const indicator = document.getElementById('execution-indicator');
        if (indicator) {
            indicator.innerHTML = '<i class="fas fa-play"></i> Ejecución activa - Canvas bloqueado';
        }
    }
}

/**
 * Actualiza el estado visual del canvas según el estado de ejecución
 */
function updateCanvasInteractionState() {
    const canvas = document.getElementById('canvas');
    if (!canvas) return;

    // Buscar o crear el indicador de ejecución
    let indicator = document.getElementById('execution-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'execution-indicator';
        indicator.className = 'execution-indicator';
        indicator.innerHTML = '<i class="fas fa-play"></i> Ejecución activa - Canvas bloqueado';
        document.body.appendChild(indicator);
    }

    if (isExecutionActive) {
        canvas.classList.add('execution-active');
        canvas.style.cursor = 'not-allowed';
        indicator.classList.add('active');
    } else {
        canvas.classList.remove('execution-active');
        canvas.style.cursor = 'default';
        indicator.classList.remove('active');
    }
}

// Hacer funciones disponibles globalmente
if (typeof window !== 'undefined') {
    window.highlightCurrentExecutionNode = highlightCurrentExecutionNode;
    window.clearExecutionHighlight = clearExecutionHighlight;
    window.showCurrentNodeInfo = showCurrentNodeInfo;
    window.updateCanvasInteractionState = updateCanvasInteractionState;
    window.startExecution = startExecution;
    window.stopExecution = stopExecution;
    window.isExecuting = isExecuting;
}