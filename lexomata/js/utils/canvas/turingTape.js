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
//    - Bloqueo automático del canvas durante la ejecución
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
//    - Resaltado automático del nodo actual durante la ejecución
//    - Bloqueo de interacciones del canvas durante la ejecución
//
// ---------------------------------------------------------------------------------

let turingTapeState = {
    isCollapsed: false,
    cells: [],
    headPosition: 0,
    cellWidth: 55,
    totalCells: 20,
    executionController: null, // Referencia al controlador de ejecución de Turing
    autoExecutionTimer: null, // Timer para la ejecución automática
    isAutoExecuting: false, // Flag para indicar si está en modo automático
    autoExecutionSpeed: 1000 // Velocidad por defecto en milisegundos
};

// --- FUNCIONES DE CONTROL DEL MODAL DE VELOCIDAD ---

/**
 * Abre el modal de configuración de velocidad de ejecución automática
 */
function openAutoExecutionSpeedModal() {
    const modal = document.getElementById('autoExecutionSpeedModal');
    if (modal) {
        modal.style.display = 'block';

        // Restablecer la selección por defecto
        const defaultRadio = document.getElementById('speed1000');
        if (defaultRadio) {
            defaultRadio.checked = true;
        }

        // Limpiar el campo personalizado
        const customInput = document.getElementById('customSpeedInput');
        if (customInput) {
            customInput.value = '1000';
        }
    }
}

/**
 * Cierra el modal de configuración de velocidad
 */
function closeAutoExecutionSpeedModal() {
    const modal = document.getElementById('autoExecutionSpeedModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Obtiene la velocidad seleccionada del modal
 * @returns {number} Velocidad en milisegundos
 */
function getSelectedExecutionSpeed() {
    const selectedRadio = document.querySelector('input[name="executionSpeed"]:checked');

    if (!selectedRadio) {
        return 1000; // Valor por defecto
    }

    if (selectedRadio.value === 'custom') {
        const customInput = document.getElementById('customSpeedInput');
        if (customInput) {
            let customValue = parseInt(customInput.value);

            // Validar el rango
            if (isNaN(customValue) || customValue < 100) {
                customValue = 100;
            } else if (customValue > 10000) {
                customValue = 10000;
            }

            return customValue;
        }
        return 1000;
    }

    return parseInt(selectedRadio.value);
}

/**
 * Maneja el inicio de la ejecución automática desde el modal
 */
function handleStartAutoExecution() {
    const speed = getSelectedExecutionSpeed();

    // Cerrar el modal
    closeAutoExecutionSpeedModal();

    // Iniciar la ejecución automática
    const success = startTuringAutoExecutionFromInput(speed);

    if (success) {
        // Cambiar el botón de auto ejecución para mostrar que está activo
        const autoButton = document.getElementById('autoExecuteTuringButton');
        if (autoButton) {
            autoButton.innerHTML = '<i class="fas fa-stop"></i> Auto';
            autoButton.classList.add('auto-executing');
        }

        // También cambiar el botón de ejecutar
        const executeButton = document.getElementById('executeTuringButton');
        if (executeButton) {
            executeButton.innerHTML = '<i class="fas fa-stop"></i> Detener';
        }
    }
}

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

function clearTuringTape() {
    turingTapeState.cells = [];
    const input = document.getElementById('turingStringInput');
    if (input) {
        input.value = '';
    }
    resizeTuringCanvas();
}

function writeTuringCell(symbol) {
    while (turingTapeState.cells.length <= turingTapeState.headPosition) {
        turingTapeState.cells.push('');
    }
    turingTapeState.cells[turingTapeState.headPosition] = symbol;
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

    // Siempre reiniciar la posición del cabezal a 0 al insertar la cadena
    turingTapeState.headPosition = 0;

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

    console.log('Estado Turing:', executionState.message);

    // Resaltar el nodo actual durante la ejecución
    let nodeToHighlight = executionState.currentNodeId;

    // Si no hay currentNodeId, buscar el nodo inicial como fallback
    if (!nodeToHighlight && typeof nodes !== 'undefined') {
        const startNode = nodes.find(node => node.IsStart);
        if (startNode) {
            nodeToHighlight = startNode.id;
        }
    }

    if (nodeToHighlight && typeof highlightCurrentExecutionNode === 'function') {
        highlightCurrentExecutionNode(nodeToHighlight);
    }
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

// --- FUNCIONES DE EJECUCIÓN AUTOMÁTICA ---

/**
 * Inicia la ejecución automática de la máquina de Turing
 * @param {number} intervalMs - Intervalo en milisegundos entre cada paso
 */
function startTuringAutoExecution(intervalMs = 1000) {
    // Validar el intervalo
    if (intervalMs < 100) {
        console.warn("El intervalo mínimo es de 100ms");
        intervalMs = 100;
    }

    if (intervalMs > 10000) {
        console.warn("El intervalo máximo es de 10000ms (10 segundos)");
        intervalMs = 10000;
    }

    // Verificar que hay un controlador de ejecución activo
    if (!turingTapeState.executionController) {
        console.error("No hay un controlador de ejecución activo");
        return false;
    }

    // Si ya está ejecutando automáticamente, detener primero
    if (turingTapeState.isAutoExecuting) {
        stopTuringAutoExecution();
    }

    turingTapeState.autoExecutionSpeed = intervalMs;
    turingTapeState.isAutoExecuting = true;

    // Función recursiva para ejecutar pasos automáticamente
    function executeAutoStep() {
        if (!turingTapeState.isAutoExecuting || !turingTapeState.executionController) {
            return;
        }

        // Verificar si la ejecución ha terminado
        const controller = turingTapeState.executionController;
        const history = controller.getHistory();
        const currentStep = controller.currentStep;

        // Si ya llegamos al final, detener la ejecución automática
        if (currentStep >= history.length - 1) {
            console.log("Ejecución automática completada");
            stopTuringAutoExecution();
            return;
        }

        // Ejecutar el siguiente paso
        stepForwardTuring();

        // Programar el siguiente paso
        turingTapeState.autoExecutionTimer = setTimeout(executeAutoStep, turingTapeState.autoExecutionSpeed);
    }

    // Iniciar la ejecución automática
    turingTapeState.autoExecutionTimer = setTimeout(executeAutoStep, turingTapeState.autoExecutionSpeed);

    console.log(`Ejecución automática iniciada con intervalo de ${intervalMs}ms`);
    return true;
}

/**
 * Detiene la ejecución automática de la máquina de Turing
 */
function stopTuringAutoExecution() {
    if (turingTapeState.autoExecutionTimer) {
        clearTimeout(turingTapeState.autoExecutionTimer);
        turingTapeState.autoExecutionTimer = null;
    }

    turingTapeState.isAutoExecuting = false;
    console.log("Ejecución automática detenida");
}

/**
 * Cambia la velocidad de la ejecución automática
 * @param {number} newIntervalMs - Nuevo intervalo en milisegundos
 */
function changeTuringAutoExecutionSpeed(newIntervalMs) {
    if (newIntervalMs < 100) {
        console.warn("El intervalo mínimo es de 100ms");
        newIntervalMs = 100;
    }

    if (newIntervalMs > 10000) {
        console.warn("El intervalo máximo es de 10000ms (10 segundos)");
        newIntervalMs = 10000;
    }

    turingTapeState.autoExecutionSpeed = newIntervalMs;

    // Si está ejecutando automáticamente, reiniciar con la nueva velocidad
    if (turingTapeState.isAutoExecuting) {
        stopTuringAutoExecution();
        startTuringAutoExecution(newIntervalMs);
    }

    console.log(`Velocidad de ejecución automática cambiada a ${newIntervalMs}ms`);
}

/**
 * Verifica si la ejecución automática está activa
 * @returns {boolean} True si está ejecutando automáticamente
 */
function isTuringAutoExecuting() {
    return turingTapeState.isAutoExecuting;
}

/**
 * Inicia la ejecución automática desde la entrada de la cinta
 * @param {number} intervalMs - Intervalo en milisegundos entre cada paso
 * @returns {boolean} True si se inició correctamente, false si hubo error
 */
function startTuringAutoExecutionFromInput(intervalMs = 1000) {
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

        // Luego iniciar la ejecución automática
        const success = startTuringAutoExecution(intervalMs);

        if (success) {
            return true;
        } else {
            // Si falló la ejecución automática, detener la ejecución paso a paso
            stopTuringStepExecution();
            return false;
        }

    } catch (error) {
        console.error("Error al iniciar la ejecución automática:", error);
        showMessage("Error al iniciar la ejecución automática de la máquina de Turing.");
        return false;
    }
}

/**
 * Inicia la ejecución paso a paso
 * @param {Object} controller - Controlador de ejecución de Turing
 */
function startTuringStepExecution(controller) {
    turingTapeState.executionController = controller;

    // Activar el estado de ejecución y bloquear el canvas
    if (typeof startExecution === 'function') {
        startExecution();
    }

    // Mostrar el primer estado
    const initialState = controller.getCurrentState();
    updateFromTuringExecutionState(initialState);
    updateTuringStepButtons();

    // Asegurar que el nodo inicial se resalte
    setTimeout(() => {
        let nodeToHighlight = initialState.currentNodeId;

        // Si no hay currentNodeId, buscar el nodo inicial
        if (!nodeToHighlight && typeof nodes !== 'undefined') {
            const startNode = nodes.find(node => node.IsStart);
            if (startNode) {
                nodeToHighlight = startNode.id;
            }
        }

        if (nodeToHighlight && typeof highlightCurrentExecutionNode === 'function') {
            highlightCurrentExecutionNode(nodeToHighlight);
        }
    }, 100);

    // Activar modo de ejecución paso a paso
    setTuringTapeStepMode(true);
}

/**
 * Detiene la ejecución paso a paso
 */
function stopTuringStepExecution() {
    // Detener la ejecución automática si está activa
    if (turingTapeState.isAutoExecuting) {
        stopTuringAutoExecution();
    }
    if (stringInput) {
        stringInput.readOnly = false;
    }
    turingTapeState.executionController = null;
    setTuringTapeStepMode(false);

    // Desactivar el estado de ejecución y desbloquear el canvas
    if (typeof stopExecution === 'function') {
        stopExecution();
    }

    // Restablecer el botón de ejecutar
    const executeButton = document.getElementById('executeTuringButton');
    if (executeButton) {
        executeButton.innerHTML = '<i class="fas fa-play"></i> Ejecutar';
    }

    // Restablecer el botón de auto ejecución
    const autoButton = document.getElementById('autoExecuteTuringButton');
    if (autoButton) {
        autoButton.innerHTML = '<i class="fas fa-forward"></i> Auto';
        autoButton.classList.remove('auto-executing');
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
        return false;
    }

    // Limpiar y validar la cadena
    const cleanString = inputString.trim();
    if (cleanString.length === 0) {
        showMessage("La cadena no puede estar vacía.");
        return false;
    }

    // Validar caracteres permitidos (letras, números, algunos símbolos)
    const validChars = /^[a-zA-Z0-9\s.,;:!?()[\]{}_\-+=*\/#$%&@^~`|\\<>'"]+$/;
    if (!validChars.test(cleanString)) {
        showMessage("La cadena contiene caracteres no permitidos. Use solo letras, números y símbolos básicos.");
        return false;
    }

    try {
        // Inicializar la cinta con la cadena
        initializeTuringTapeWithInput(cleanString, 0);
        return true;
        console.log(`Cadena aplicada a la cinta de Turing: "${cleanString}"`);
    } catch (error) {
        console.error("Error al aplicar la cadena a la cinta:", error);
        showMessage("Error al aplicar la cadena a la cinta de Turing.");
        return false;
    }
}

/**
 * Maneja el evento de aplicar cadena desde el botón
 */
function handleApplyTuringString() {
    const input = document.getElementById('turingStringInput');
    if (!input) return;

    const inputString = input.value;
    return applyStringToTuringTape(inputString);
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
    const stringInput = document.getElementById('turingStringInput');

    if (inputSection) {
        if (isExecuting) {
            inputSection.classList.add('execution-mode');
        } else {
            inputSection.classList.remove('execution-mode');
        }
    }

    if (stringInput) {
        stringInput.readOnly = !!isExecuting;
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
    const clearButton = document.getElementById('clearTapeButton');
    const closeButton = document.getElementById('closeTapeContainerBtn');
    const stringInput = document.getElementById('turingStringInput');
    const executeButton = document.getElementById('executeTuringButton');
    const autoExecuteButton = document.getElementById('autoExecuteTuringButton');

    // Botones de navegación paso a paso
    const stepForwardButton = document.getElementById('turingStepForwardButton');
    const stepBackwardButton = document.getElementById('turingStepBackwardButton');
    const stopStepButton = document.getElementById('turingStopStepButton');

    // Elementos del modal de velocidad
    const startAutoExecutionButton = document.getElementById('startAutoExecutionButton');
    const customSpeedRadio = document.getElementById('speedCustom');
    const customSpeedInput = document.getElementById('customSpeedInput');

    if (toggleButton) toggleButton.addEventListener('click', toggleTuringTape);
    if (clearButton) clearButton.addEventListener('click', clearTuringTape);

    // Event listeners para la entrada de cadena
    if (stringInput) stringInput.addEventListener('keydown', handleTuringStringInputKeydown);

    // Event listener para el botón de auto ejecución
    if (autoExecuteButton) {
        autoExecuteButton.addEventListener('click', () => {
            // Si ya está ejecutando automáticamente, detener
            if (turingTapeState.isAutoExecuting) {
                stopTuringStepExecution();
            } else {
                // Abrir el modal de configuración de velocidad
                openAutoExecutionSpeedModal();
            }
        });
    }

    // Event listener para el botón de iniciar auto ejecución del modal
    if (startAutoExecutionButton) {
        startAutoExecutionButton.addEventListener('click', handleStartAutoExecution);
    }

    // Event listener para habilitar el input personalizado cuando se selecciona la opción
    if (customSpeedRadio && customSpeedInput) {
        customSpeedRadio.addEventListener('change', () => {
            if (customSpeedRadio.checked) {
                customSpeedInput.focus();
            }
        });

        customSpeedInput.addEventListener('focus', () => {
            customSpeedRadio.checked = true;
        });
    }

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
            if (stringInput) {
                stringInput.readOnly = false;
            }
            // Restablecer el botón de ejecutar
            if (executeButton) {
                executeButton.innerHTML = '<i class="fas fa-play"></i> Ejecutar';
                const input = document.getElementById('turingStringInput');
                if (input) input.readOnly = false;
            }
        });
    }

    // Event listener para el botón de ejecutar (ahora ejecuta paso a paso)
    if (executeButton) {
        executeButton.addEventListener('click', () => {
            // Verificar si ya está en modo paso a paso
            if (turingTapeState.executionController) {
                const input = document.getElementById('turingStringInput');
                // Si ya está ejecutando, detener
                handleApplyTuringString();
                stopTuringStepExecution();
                if (input) input.readOnly = false;
                executeButton.innerHTML = '<i class="fas fa-play"></i> Ejecutar';
            } else {
                const input = document.getElementById('turingStringInput');
                // Iniciar ejecución paso a paso
                const assignationString = handleApplyTuringString();
                if (!assignationString) return;

                const success = startTuringStepExecutionFromInput();
                if (success) {
                    if (input) input.readOnly = true;
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

            // Si hay una ejecución activa, detenerla antes de cerrar
            if (turingTapeState.executionController) {
                stopTuringStepExecution();
            }

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

    // Funciones de ejecución automática
    window.startTuringAutoExecution = startTuringAutoExecution;
    window.stopTuringAutoExecution = stopTuringAutoExecution;
    window.changeTuringAutoExecutionSpeed = changeTuringAutoExecutionSpeed;
    window.isTuringAutoExecuting = isTuringAutoExecuting;
    window.startTuringAutoExecutionFromInput = startTuringAutoExecutionFromInput;

    // Funciones del modal de velocidad
    window.openAutoExecutionSpeedModal = openAutoExecutionSpeedModal;
    window.closeAutoExecutionSpeedModal = closeAutoExecutionSpeedModal;
    window.getSelectedExecutionSpeed = getSelectedExecutionSpeed;
    window.handleStartAutoExecution = handleStartAutoExecution;
}