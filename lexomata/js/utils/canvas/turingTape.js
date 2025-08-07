// ---------------------------------------------------------------------------------
// SECTION: Turing Tape Functionality
// ---------------------------------------------------------------------------------
//
// Este archivo implementa la funcionalidad completa de la cinta de Turing, incluyendo:
// 
// 1. VISUALIZACIÓN DE LA CINTA:
//    - Dibujo interactivo de celdas con contenido
//    - Posicionamiento del cabezal de lectura/escritura
//    - Soporte para temas claro y oscuro
//    - Redimensionamiento automático responsivo
//
// 2. ENTRADA DE CADENAS INICIALES:
//    - Campo de texto para ingresar cadenas iniciales
//    - Validación de caracteres y longitud
//    - Aplicación automática a la cinta desde la posición 0
//    - Integración con el sistema de ejecución de máquinas de Turing
//
// 3. CONTROLES DE EJECUCIÓN:
//    - Botón para ejecutar directamente desde la interfaz
//    - Indicadores visuales del estado de ejecución
//    - Integración bidireccional con el motor de ejecución
//    - Funciones de reinicio y limpieza
//
// 4. FUNCIONES PRINCIPALES:
//    - applyStringToTuringTape(cadena): Aplica una cadena a la cinta
//    - initializeTuringTapeWithInput(cadena, posicion): Inicializa con entrada
//    - setTuringTapeExecutionMode(ejecutando): Controla el estado de la interfaz
//    - updateTuringTapeFromState(estado): Sincroniza con el controlador de ejecución
//
// 5. INTEGRACIÓN CON SISTEMA DE EJECUCIÓN:
//    - Sincronización automática durante la ejecución paso a paso
//    - Notificaciones de inicio y fin de ejecución
//    - Soporte para ejecución automática y manual
//    - Compatibilidad con todas las funciones de testing
//
// ---------------------------------------------------------------------------------

let turingTapeState = {
    isCollapsed: false,
    cells: [],
    headPosition: 0,
    cellWidth: 55,
    totalCells: 20,
    executionController: null // Referencia al controlador de ejecución de Turing
};

// --- FUNCIONES DE CONTROL DEL PANEL ---

function showTuringTape() {
    const tapeContainer = document.querySelector('.turing-tape-container');
    const stringContainer = document.querySelector('.string-analyzer-container');
    
    if (tapeContainer) {
        tapeContainer.style.display = 'block';
        
        // Coordinar con el analizador de cadenas si está visible
        if (stringContainer && stringContainer.style.display === 'block') {
            tapeContainer.classList.add('with-string-analyzer');
            stringContainer.classList.add('with-turing-tape');
        }
        
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

    // Si no se pasaron parámetros, obtenerlos del canvas
    if (!ctx) {
        ctx = turingCanvas.getContext('2d');
        if (!ctx) return;
    }
    
    if (!canvasCssWidth || !canvasCssHeight) {
        const container = turingCanvas.parentElement;
        if (!container) return;
        
        canvasCssWidth = container.clientWidth > 40 ? container.clientWidth - 40 : 0;
        canvasCssHeight = 80;
    }

    const isDarkMode = document.body.classList.contains('dark');
    const currentTheme = isDarkMode ? (window.colorPalette?.dark || {}) : (window.colorPalette?.light || {});

    // Colores por defecto
    const cellFill = currentTheme.turingCellFill || (isDarkMode ? '#2a2a3e' : '#ffffff');
    const cellStroke = currentTheme.turingCellStroke || (isDarkMode ? '#3a3a50' : '#ccc');
    const headStroke = currentTheme.turingHeadStroke || '#20c997';
    const cellText = currentTheme.turingCellText || (isDarkMode ? '#e0e0e0' : '#333');
    const indexText = currentTheme.turingIndexText || (isDarkMode ? '#aaa' : '#666');

    // Limpiar el canvas - usar las dimensiones CSS
    ctx.clearRect(0, 0, canvasCssWidth, canvasCssHeight);

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
    return turingTapeState.cells[turingTapeState.headPosition] || '□';
}

/**
 * Escribe un carácter en la celda actual del cabezal
 * @param {string} char - Carácter a escribir
 */
function writeTuringCell(char) {
    if (char === '□' || char === 'blank') {
        turingTapeState.cells[turingTapeState.headPosition] = '□';
    } else {
        turingTapeState.cells[turingTapeState.headPosition] = char;
    }
    drawTuringTape();
}

/**
 * Mueve el cabezal de la cinta de Turing
 * @param {string} direction - Dirección ('L', 'R', 'M', 'S')
 */
function moveTuringHead(direction) {
    const dir = direction.toUpperCase();
    
    switch (dir) {
        case 'L': // Izquierda
            if (turingTapeState.headPosition > 0) {
                turingTapeState.headPosition--;
            } else {
                // Expandir la cinta hacia la izquierda
                turingTapeState.cells.unshift('□');
                // La posición del cabezal se mantiene en 0
            }
            break;
            
        case 'R': // Derecha
            turingTapeState.headPosition++;
            // Expandir la cinta si es necesario
            while (turingTapeState.headPosition >= turingTapeState.cells.length) {
                turingTapeState.cells.push('□');
            }
            break;
            
        case 'M': // Mantener
        case 'S': // Stay
            // No mover el cabezal
            break;
            
        default:
            console.warn(`Dirección de movimiento desconocida: ${direction}`);
            break;
    }
    
    drawTuringTape();
}

/**
 * Inicializa la cinta con una cadena específica
 * @param {string} inputString - Cadena inicial para la cinta
 * @param {number} headPosition - Posición inicial del cabezal
 */
function initializeTuringTapeWithInput(inputString, headPosition = 0) {
    turingTapeState.cells = [];
    
    // Añadir la cadena de entrada directamente desde la posición 0
    for (let i = 0; i < inputString.length; i++) {
        turingTapeState.cells.push(inputString[i]);
    }
    
    // Añadir algunas celdas vacías al final
    for (let i = 0; i < 10; i++) {
        turingTapeState.cells.push('□');
    }
    
    // Establecer la posición del cabezal en la posición especificada (por defecto 0)
    turingTapeState.headPosition = Math.max(0, headPosition);
    
    drawTuringTape();
}

/**
 * Obtiene la representación actual de la cinta como string
 * @returns {string} Contenido de la cinta
 */
function getTuringTapeContent() {
    return turingTapeState.cells.join('').replace(/□+$/, '').replace(/^□+/, '');
}

/**
 * Actualiza la cinta desde un estado de ejecución externo
 * @param {Object} tapeState - Estado de la cinta desde el controlador de ejecución
 */
function updateTuringTapeFromState(tapeState) {
    if (!tapeState) return;
    
    // Determinar el rango de celdas a mostrar
    const padding = 10;
    const start = Math.min(tapeState.leftmost, tapeState.headPosition - padding);
    const end = Math.max(tapeState.rightmost, tapeState.headPosition + padding);
    
    // Reconstruir el array de celdas
    turingTapeState.cells = [];
    for (let i = start; i <= end; i++) {
        turingTapeState.cells.push(tapeState.tape[i] || '□');
    }
    
    // Ajustar la posición del cabezal al nuevo índice
    turingTapeState.headPosition = tapeState.headPosition - start;
    
    drawTuringTape();
}

// --- FUNCIONES DE NAVEGACIÓN POR PASOS ---

/**
 * Avanza un paso en la ejecución de la máquina de Turing
 */
function stepForwardTuring() {
    if (turingTapeState.executionController) {
        const nextState = turingTapeState.executionController.stepForward();
        updateFromTuringExecutionState(nextState);
        updateTuringStepButtons();
        showTuringTransitions();
    }
}

/**
 * Retrocede un paso en la ejecución de la máquina de Turing
 */
function stepBackwardTuring() {
    if (turingTapeState.executionController) {
        const prevState = turingTapeState.executionController.stepBackward();
        updateFromTuringExecutionState(prevState);
        updateTuringStepButtons();
        showTuringTransitions();
    }
}

/**
 * Actualiza la interfaz desde el estado de ejecución
 * @param {Object} executionState - Estado actual de la ejecución
 */
function updateFromTuringExecutionState(executionState) {
    if (!executionState) return;
    
    // Actualizar la cinta con el estado actual
    updateTuringTapeFromState(executionState.tapeState);
    
    // Mostrar información del estado actual
    updateTuringExecutionStatus(executionState);
    
    console.log('Estado Turing:', executionState.message);
}

/**
 * Actualiza el estado de los botones de navegación
 */
function updateTuringStepButtons() {
    const forwardButton = document.getElementById('turingStepForwardButton');
    const backwardButton = document.getElementById('turingStepBackwardButton');
    
    if (!turingTapeState.executionController) {
        if (forwardButton) forwardButton.disabled = true;
        if (backwardButton) backwardButton.disabled = true;
        return;
    }
    
    const controller = turingTapeState.executionController;
    const history = controller.getHistory();
    const currentStep = controller.currentStep;
    
    // Habilitar/deshabilitar botones según la posición en el historial
    if (forwardButton) {
        forwardButton.disabled = currentStep >= history.length - 1;
    }
    
    if (backwardButton) {
        backwardButton.disabled = currentStep <= 0;
    }
}

/**
 * Muestra las transiciones disponibles desde el estado actual
 */
function showTuringTransitions() {
    if (!turingTapeState.executionController) return;
    
    const transitionsInfo = document.getElementById('turingTransitionsInfo');
    if (!transitionsInfo) return;
    
    const availableTransitions = turingTapeState.executionController.getAvailableTransitions();
    
    if (availableTransitions.length === 0) {
        transitionsInfo.innerHTML = '<div class="no-transitions">No hay transiciones disponibles</div>';
        return;
    }
    
    let html = '<div class="transitions-header">Transiciones disponibles:</div>';
    html += '<div class="transitions-list">';
    
    availableTransitions.forEach(transition => {
        const targetLabel = transition.targetNode ? transition.targetNode.label : 'Desconocido';
        
        transition.allLabelsInfo.forEach(labelInfo => {
            const isMatching = labelInfo.isMatching;
            const className = isMatching ? 'transition-item matching' : 'transition-item';
            
            html += `<div class="${className}">
                        <div class="transition-main-info">
                            <span class="transition-label">${labelInfo.label}</span>
                            <span class="transition-arrow">→</span>
                            <span class="transition-target">${targetLabel}</span>
                            ${isMatching ? '<span class="match-indicator">✓</span>' : ''}
                        </div>
                        <div class="transition-details">
                            <div class="label-description">${labelInfo.description}</div>
                        </div>
                     </div>`;
        });
    });
    
    html += '</div>';
    transitionsInfo.innerHTML = html;
}

/**
 * Actualiza el estado de ejecución en la interfaz
 * @param {Object} executionState - Estado actual de la ejecución
 */
function updateTuringExecutionStatus(executionState) {
    const statusElement = document.getElementById('turingExecutionStatus');
    if (!statusElement) return;
    
    let statusClass = 'status-running';
    let statusText = 'Ejecutando...';
    
    switch (executionState.status) {
        case 'ACCEPTED':
            statusClass = 'status-accepted';
            statusText = 'ACEPTADA';
            break;
        case 'REJECTED':
            statusClass = 'status-rejected';
            statusText = 'RECHAZADA';
            break;
        case 'TIMEOUT':
            statusClass = 'status-timeout';
            statusText = 'TIMEOUT';
            break;
        case 'RUNNING':
            statusClass = 'status-running';
            statusText = 'EJECUTANDO';
            break;
    }
    
    statusElement.className = `execution-status ${statusClass}`;
    statusElement.innerHTML = `
        <div class="status-indicator">${statusText}</div>
        <div class="status-message">${executionState.message}</div>
        <div class="status-step">Paso: ${executionState.step}</div>
    `;
}

/**
 * Inicia la ejecución paso a paso
 * @param {Object} controller - Controlador de ejecución de Turing
 */
function startTuringStepExecution(controller) {
    turingTapeState.executionController = controller;
    
    // Mostrar el primer estado
    const initialState = controller.getCurrentState();
    updateFromTuringExecutionState(initialState);
    updateTuringStepButtons();
    showTuringTransitions();
    
    // Activar modo de ejecución paso a paso
    setTuringTapeStepMode(true);
}

/**
 * Detiene la ejecución paso a paso
 */
function stopTuringStepExecution() {
    turingTapeState.executionController = null;
    setTuringTapeStepMode(false);
    
    // Limpiar información de transiciones
    const transitionsInfo = document.getElementById('turingTransitionsInfo');
    if (transitionsInfo) {
        transitionsInfo.innerHTML = '';
    }
    
    // Limpiar estado de ejecución
    const statusElement = document.getElementById('turingExecutionStatus');
    if (statusElement) {
        statusElement.innerHTML = '';
    }
    
    // Restablecer el botón de ejecutar
    const executeButton = document.getElementById('executeTuringButton');
    if (executeButton) {
        executeButton.innerHTML = '<i class="fas fa-play"></i> Ejecutar';
    }
}

/**
 * Activa/desactiva el modo de ejecución paso a paso
 * @param {boolean} isStepMode - Si está en modo paso a paso
 */
function setTuringTapeStepMode(isStepMode) {
    const stepControls = document.querySelector('.turing-step-controls');
    const executionInfo = document.querySelector('.turing-execution-info');
    
    if (stepControls) {
        stepControls.style.display = isStepMode ? 'block' : 'none';
    }
    
    if (executionInfo) {
        executionInfo.style.display = isStepMode ? 'block' : 'none';
    }
}

/**
 * Inicia la ejecución paso a paso desde la entrada de la cinta
 * @returns {boolean} True si se inició correctamente, false si hubo error
 */
function startTuringStepExecutionFromInput() {
    // Verificar que hay un autómata de Turing válido
    if (typeof nodes === 'undefined' || !nodes || nodes.length === 0) {
        showMessage("No hay estados definidos en el autómata.");
        return false;
    }
    
    if (typeof edges === 'undefined' || !edges || edges.length === 0) {
        showMessage("No hay transiciones definidas en el autómata.");
        return false;
    }
    
    // Obtener la cadena inicial de la cinta
    const inputString = getTuringTapeContent() || '';
    
    try {
        // Crear el controlador de ejecución
        const controller = new TuringExecutionController(nodes, edges, inputString, 0);
        
        // Iniciar la ejecución paso a paso
        startTuringStepExecution(controller);
        
        console.log(`Iniciando ejecución paso a paso con cadena: "${inputString}"`);
        showMessage(`Ejecución paso a paso iniciada con cadena: "${inputString}"`);
        
        return true;
        
    } catch (error) {
        console.error("Error al iniciar la ejecución paso a paso:", error);
        showMessage("Error al iniciar la ejecución paso a paso de la máquina de Turing.");
        return false;
    }
}

// --- FUNCIONES DE ENTRADA DE CADENA ---

/**
 * Aplica una cadena inicial a la cinta de Turing
 * @param {string} inputString - Cadena a aplicar
 */
function applyStringToTuringTape(inputString) {
    if (!inputString || typeof inputString !== 'string') {
        showMessage("Por favor, ingrese una cadena válida.");
        return;
    }

    // Limpiar y validar la cadena
    const cleanString = inputString.trim();
    if (cleanString.length === 0) {
        showMessage("La cadena no puede estar vacía.");
        return;
    }

    if (cleanString.length > 50) {
        showMessage("La cadena no puede tener más de 50 caracteres.");
        return;
    }

    // Validar caracteres permitidos (letras, números, algunos símbolos)
    const validChars = /^[a-zA-Z0-9\s.,;:!?()[\]{}_\-+=*\/#$%&@^~`|\\<>'"]+$/;
    if (!validChars.test(cleanString)) {
        showMessage("La cadena contiene caracteres no permitidos. Use solo letras, números y símbolos básicos.");
        return;
    }

    try {
        // Inicializar la cinta con la cadena
        initializeTuringTapeWithInput(cleanString, 0);
        
        console.log(`Cadena aplicada a la cinta de Turing: "${cleanString}"`);
        showMessage(`Cadena "${cleanString}" aplicada exitosamente a la cinta.`);
        
        // Limpiar el campo de entrada
        const input = document.getElementById('turingStringInput');
        if (input) {
            input.value = '';
        }
        
    } catch (error) {
        console.error("Error al aplicar la cadena a la cinta:", error);
        showMessage("Error al aplicar la cadena a la cinta de Turing.");
    }
}

/**
 * Maneja el evento de aplicar cadena desde el botón
 */
function handleApplyTuringString() {
    const input = document.getElementById('turingStringInput');
    if (!input) return;
    
    const inputString = input.value;
    applyStringToTuringTape(inputString);
}

/**
 * Maneja el evento de presionar Enter en el campo de entrada
 * @param {KeyboardEvent} event - Evento de teclado
 */
function handleTuringStringInputKeydown(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        handleApplyTuringString();
    }
}

// --- FUNCIONES DE ESTADO DE INTERFAZ ---

/**
 * Activa el modo de ejecución en la interfaz de la cinta
 */
function setTuringTapeExecutionMode(isExecuting) {
    const inputSection = document.querySelector('.turing-tape-input-section');
    const executeButton = document.getElementById('executeTuringButton');
    
    if (inputSection) {
        if (isExecuting) {
            inputSection.classList.add('execution-mode');
        } else {
            inputSection.classList.remove('execution-mode');
        }
    }
    
    if (executeButton) {
        if (isExecuting) {
            executeButton.innerHTML = '<i class="fas fa-stop"></i> Detener';
            executeButton.onclick = () => {
                if (typeof stopTuringExecution === 'function') {
                    stopTuringExecution();
                    setTuringTapeExecutionMode(false);
                }
            };
        } else {
            executeButton.innerHTML = '<i class="fas fa-play"></i> Ejecutar';
            executeButton.onclick = () => {
                if (typeof startTuringExecutionFromInput === 'function') {
                    const success = startTuringExecutionFromInput(false);
                    if (success !== false) {
                        setTuringTapeExecutionMode(true);
                    }
                }
            };
        }
    }
}

// --- INICIALIZACIÓN ---

function initializeTuringTape() {
    const toggleButton = document.getElementById('toggleTapeButton');
    const resetButton = document.getElementById('resetTapeButton');
    const clearButton = document.getElementById('clearTapeButton');
    const closeButton = document.getElementById('closeTapeContainerBtn');
    const applyStringButton = document.getElementById('applyTuringStringButton');
    const stringInput = document.getElementById('turingStringInput');
    const executeButton = document.getElementById('executeTuringButton');
    
    // Botones de navegación paso a paso
    const stepForwardButton = document.getElementById('turingStepForwardButton');
    const stepBackwardButton = document.getElementById('turingStepBackwardButton');
    const stopStepButton = document.getElementById('turingStopStepButton');

    if (toggleButton) toggleButton.addEventListener('click', toggleTuringTape);
    if (resetButton) resetButton.addEventListener('click', resetTuringTape);
    if (clearButton) clearButton.addEventListener('click', clearTuringTape);
    
    // Event listeners para la entrada de cadena
    if (applyStringButton) applyStringButton.addEventListener('click', handleApplyTuringString);
    if (stringInput) stringInput.addEventListener('keydown', handleTuringStringInputKeydown);
    
    // Event listeners para navegación paso a paso
    if (stepForwardButton) {
        stepForwardButton.addEventListener('click', stepForwardTuring);
    }
    
    if (stepBackwardButton) {
        stepBackwardButton.addEventListener('click', stepBackwardTuring);
    }
    
    // Event listener para detener ejecución paso a paso
    if (stopStepButton) {
        stopStepButton.addEventListener('click', () => {
            stopTuringStepExecution();
            showMessage("Ejecución paso a paso detenida");
            // Restablecer el botón de ejecutar
            if (executeButton) {
                executeButton.innerHTML = '<i class="fas fa-play"></i> Ejecutar';
            }
        });
    }
    
    // Event listener para el botón de ejecutar (ahora ejecuta paso a paso)
    if (executeButton) {
        executeButton.addEventListener('click', () => {
            // Verificar si ya está en modo paso a paso
            if (turingTapeState.executionController) {
                // Si ya está ejecutando, detener
                stopTuringStepExecution();
                showMessage("Ejecución paso a paso detenida");
                executeButton.innerHTML = '<i class="fas fa-play"></i> Ejecutar';
            } else {
                // Iniciar ejecución paso a paso
                const success = startTuringStepExecutionFromInput();
                if (success) {
                    executeButton.innerHTML = '<i class="fas fa-stop"></i> Detener';
                    console.log("Ejecución paso a paso iniciada correctamente");
                }
            }
        });
    }
    
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            const tapeContainer = document.querySelector('.turing-tape-container');
            const stringContainer = document.querySelector('.string-analyzer-container');
            
            tapeContainer.style.display = 'none';
            tapeContainer.classList.remove('with-string-analyzer');
            
            // Limpiar clases de coordinación del analizador de cadenas
            if (stringContainer) {
                stringContainer.classList.remove('with-turing-tape');
            }
        });
    }

    window.addEventListener('resize', resizeTuringCanvas);
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initializeTuringTape, 100);
});

// Hacer funciones disponibles globalmente
if (typeof window !== 'undefined') {
    window.applyStringToTuringTape = applyStringToTuringTape;
    window.handleApplyTuringString = handleApplyTuringString;
    window.showTuringTape = showTuringTape;
    window.resetTuringTape = resetTuringTape;
    window.clearTuringTape = clearTuringTape;
    window.initializeTuringTapeWithInput = initializeTuringTapeWithInput;
    window.getTuringTapeContent = getTuringTapeContent;
    window.setTuringTapeExecutionMode = setTuringTapeExecutionMode;
    
    // Funciones de navegación paso a paso
    window.stepForwardTuring = stepForwardTuring;
    window.stepBackwardTuring = stepBackwardTuring;
    window.startTuringStepExecution = startTuringStepExecution;
    window.startTuringStepExecutionFromInput = startTuringStepExecutionFromInput;
    window.stopTuringStepExecution = stopTuringStepExecution;
    window.setTuringTapeStepMode = setTuringTapeStepMode;
    window.updateFromTuringExecutionState = updateFromTuringExecutionState;
}