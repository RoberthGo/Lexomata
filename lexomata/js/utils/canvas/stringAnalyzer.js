// ---------------------------------------------------------------------------------
// SECTION: String Analyzer Functionality for Finite Automata
// ---------------------------------------------------------------------------------

let stringAnalyzerState = {
    isCollapsed: false,
    inputString: '',
    currentPosition: 0,
    isAnalyzing: false,
    characters: [],
    maxVisibleChars: 15,
    executionController: null // Referencia al controlador de ejecución
};

// --- FUNCIONES DE CONTROL DEL PANEL ---

function showStringAnalyzer() {
    const analyzerContainer = document.querySelector('.string-analyzer-container');
    const turingContainer = document.querySelector('.turing-tape-container');
    
    if (analyzerContainer) {
        analyzerContainer.style.display = 'block';
        
        // Coordinar con la cinta de Turing si está visible
        if (turingContainer && turingContainer.style.display === 'block') {
            turingContainer.classList.add('with-string-analyzer');
            analyzerContainer.classList.add('with-turing-tape');
        }
        
        updateStringDisplay();
    }
}

function hideStringAnalyzer() {
    const analyzerContainer = document.querySelector('.string-analyzer-container');
    const turingContainer = document.querySelector('.turing-tape-container');
    
    if (analyzerContainer) {
        analyzerContainer.style.display = 'none';
        analyzerContainer.classList.remove('with-turing-tape');
        
        // Limpiar clases de coordinación de la cinta de Turing
        if (turingContainer) {
            turingContainer.classList.remove('with-string-analyzer');
        }
    }
}

function toggleStringAnalyzer() {
    const analyzerContainer = document.querySelector('.string-analyzer-container');
    if (analyzerContainer) {
        analyzerContainer.classList.toggle('collapsed');
    }
}

// --- FUNCIONES DE NAVEGACIÓN POR PASOS ---

function stepForward() {
    if (stringAnalyzerState.executionController) {
        const nextState = stringAnalyzerState.executionController.stepForward();
        updateFromExecutionState(nextState);
        updateStepButtons();
        showAvailableTransitions();
        
        // Resaltar el nodo actual durante la ejecución
        if (nextState && nextState.currentNodeId && typeof highlightCurrentExecutionNode === 'function') {
            highlightCurrentExecutionNode(nextState.currentNodeId);
        }
    }
}

function stepBackward() {
    if (stringAnalyzerState.executionController) {
        const prevState = stringAnalyzerState.executionController.stepBackward();
        updateFromExecutionState(prevState);
        updateStepButtons();
        showAvailableTransitions();
        
        // Resaltar el nodo actual durante la ejecución
        if (prevState && prevState.currentNodeId && typeof highlightCurrentExecutionNode === 'function') {
            highlightCurrentExecutionNode(prevState.currentNodeId);
        }
    }
}

function updateFromExecutionState(executionState) {
    if (!executionState) return;
    
    // Actualizar posición basada en caracteres consumidos
    const consumedLength = executionState.consumedInput.length;
    setAnalyzerPosition(consumedLength);
    
    // Destacar la última secuencia consumida si está disponible
    if (executionState.lastConsumedString) {
        highlightConsumedSequence(executionState.lastConsumedString, consumedLength);
    } else if (executionState.lastConsumedLabel) {
        highlightConsumedSequence(executionState.lastConsumedLabel, consumedLength);
    }
    
    // Mostrar información adicional del estado
    console.log('Estado actual:', executionState.message);
    updateAnalysisStatus(executionState);
}

function updateStepButtons() {
    const forwardButton = document.getElementById('stepForwardButton');
    const backwardButton = document.getElementById('stepBackwardButton');
    
    if (!stringAnalyzerState.executionController) {
        if (forwardButton) forwardButton.disabled = true;
        if (backwardButton) backwardButton.disabled = true;
        return;
    }
    
    const controller = stringAnalyzerState.executionController;
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

function showAvailableTransitions() {
    if (!stringAnalyzerState.executionController) return;
    
    const transitionsInfo = document.getElementById('transitionsInfo');
    if (!transitionsInfo) return;
    
    const availableTransitions = stringAnalyzerState.executionController.getAvailableTransitions();
    
    if (availableTransitions.length === 0) {
        transitionsInfo.innerHTML = '<div class="no-transitions">No hay transiciones disponibles</div>';
        return;
    }
    
    let html = '<div class="transitions-header">Transiciones disponibles:</div>';
    html += '<div class="transitions-list">';
    
    availableTransitions.forEach(transition => {
        const targetLabel = transition.targetNode ? transition.targetNode.label : 'Desconocido';
        
        transition.allLabelsInfo.forEach(labelInfo => {
            const matchingInfo = transition.matchingInfo.find(m => m.label === labelInfo.label);
            const isMatching = !!matchingInfo;
            const className = isMatching ? 'transition-item matching' : 'transition-item';
            
            html += `<div class="${className}">
                        <div class="transition-main-info">
                            <span class="transition-label ${labelInfo.isRegex ? 'regex-label' : 'literal-label'}">${labelInfo.label}</span>
                            <span class="transition-arrow">→</span>
                            <span class="transition-target">${targetLabel}</span>
                            ${isMatching ? '<span class="match-indicator">✓</span>' : ''}
                        </div>
                        <div class="transition-details">
                            <div class="label-description">${labelInfo.description}</div>
                            ${isMatching ? 
                                `<div class="match-result">Coincide: "<strong>${matchingInfo.match}</strong>"</div>` : 
                                ''
                            }
                            ${labelInfo.isRegex ? 
                                `<div class="regex-examples">Ejemplos: ${labelInfo.examples.join(', ')}</div>` : 
                                ''
                            }
                        </div>
                     </div>`;
        });
    });
    
    html += '</div>';
    transitionsInfo.innerHTML = html;
}

function validateAutomataRegexTransitions() {
    if (typeof edges === 'undefined' || !edges) {
        return { valid: true, errors: [] };
    }

    const errors = [];
    
    edges.forEach((edge, index) => {
        edge.labels.forEach((label, labelIndex) => {
            const validation = RegexHandler.validateRegex(label);
            if (!validation.valid) {
                errors.push({
                    edgeIndex: index,
                    labelIndex: labelIndex,
                    label: label,
                    error: validation.error,
                    from: edge.from,
                    to: edge.to
                });
            }
        });
    });

    return {
        valid: errors.length === 0,
        errors: errors
    };
}

function showRegexValidationErrors(errors) {
    if (errors.length === 0) return;

    let message = 'Se encontraron errores en las expresiones regulares:\n\n';
    errors.forEach(error => {
        message += `• Transición ${error.from} → ${error.to}: "${error.label}"\n`;
        message += `  Error: ${error.error}\n\n`;
    });

    /*// Agregar ayuda sobre caracteres de escape válidos
    if (errors.some(error => error.error.includes('escape'))) {
        message += '\n--- Caracteres de Escape Válidos ---\n';
        message += '\\d - dígitos (0-9)\n';
        message += '\\w - alfanuméricos (a-z, A-Z, 0-9, _)\n';
        message += '\\s - espacios en blanco\n';
        message += '\\n - nueva línea\n';
        message += '\\t - tabulación\n';
        message += '\\\\ - barra invertida literal\n';
        message += '\\. - punto literal\n';
        message += '\\* - asterisco literal\n';
        message += '\\+ - signo más literal\n';
        message += '\\? - interrogación literal\n';
        message += 'Y muchos más...\n';
    }*/
    showMessage(message);
}

// --- FUNCIONES DE INTEGRACIÓN CON EXECUTION CONTROLLER ---

function startAutomataAnalysis() {
    // Verificar que hay una cadena para analizar
    if (!stringAnalyzerState.inputString || stringAnalyzerState.inputString.trim() === '') {
        showMessage('Por favor, ingrese una cadena para analizar.');
        return;
    }
    
    // Verificar que hay nodos y aristas disponibles (esto debería venir del contexto global)
    if (typeof nodes === 'undefined' || typeof edges === 'undefined') {
        showMessage('Error: No se encontraron nodos o aristas del autómata.');
        return;
    }
    
    if (!nodes || nodes.length === 0) {
        showMessage('Error: No hay estados definidos en el autómata.');
        return;
    }
    
    if (!edges || edges.length === 0) {
        showMessage('Error: No hay transiciones definidas en el autómata.');
        return;
    }

    // Validar expresiones regulares en las transiciones
    const regexValidation = validateAutomataRegexTransitions();
    if (!regexValidation.valid) {
        showRegexValidationErrors(regexValidation.errors);
        return;
    }
    
    try {
        // Activar estado de ejecución para bloquear interacciones del canvas
        if (typeof startExecution === 'function') {
            startExecution();
        }
        
        // Crear una nueva instancia del ExecutionController
        const controller = new ExecutionController(nodes, edges, stringAnalyzerState.inputString.trim());
        
        // Conectar el analizador con el controlador
        setExecutionController(controller);
        
        // Mostrar mensaje de inicio
        console.log(`Iniciando análisis de la cadena: "${stringAnalyzerState.inputString}"`);
        
        // Actualizar interfaz
        updateStartButton();
        updateStepButtons();
        
        // Mostrar el analizador si no está visible
        showStringAnalyzer();
        
    } catch (error) {
        // En caso de error, desactivar el estado de ejecución
        if (typeof stopExecution === 'function') {
            stopExecution();
        }
        showMessage('Error al iniciar el análisis:', error);
    }
}

function updateStartButton() {
    const startButton = document.getElementById('startAutomata');
    if (!startButton) return;
    
    const hasString = stringAnalyzerState.inputString && stringAnalyzerState.inputString.trim() !== '';
    const hasController = stringAnalyzerState.executionController !== null;
    
    if (hasController) {
        startButton.disabled = false;
        startButton.innerHTML = '<i class="fas fa-redo"></i> Reiniciar Análisis';
        startButton.title = 'Reiniciar el análisis con la cadena actual';
    } else if (hasString) {
        startButton.disabled = false;
        startButton.innerHTML = '<i class="fas fa-play"></i> Iniciar Análisis';
        startButton.title = 'Iniciar análisis de la cadena';
    } else {
        startButton.disabled = true;
        startButton.innerHTML = '<i class="fas fa-play"></i> Iniciar Análisis';
        startButton.title = 'Ingrese una cadena para iniciar el análisis';
    }
}

function setExecutionController(controller) {
    stringAnalyzerState.executionController = controller;
    if (controller) {
        setAnalyzerString(controller.inputString);
        updateFromExecutionState(controller.getCurrentState());
        showAvailableTransitions();
        
        // Resaltar el nodo inicial al establecer el controlador
        const currentState = controller.getCurrentState();
        if (currentState && currentState.currentNodeId && typeof highlightCurrentExecutionNode === 'function') {
            highlightCurrentExecutionNode(currentState.currentNodeId);
        }
    }
    updateStepButtons();
    updateStartButton();
}

function setAnalyzerString(inputString) {
    stringAnalyzerState.inputString = inputString || '';
    stringAnalyzerState.characters = inputString ? inputString.split('') : [];
    stringAnalyzerState.currentPosition = 0;
    stringAnalyzerState.isAnalyzing = false;
    updateStringDisplay();
    updateStartButton();
}

function resetStringAnalyzer() {
    stringAnalyzerState.currentPosition = 0;
    stringAnalyzerState.isAnalyzing = false;
    stringAnalyzerState.executionController = null;
    
    // Desactivar estado de ejecución para restaurar interacciones del canvas
    if (typeof stopExecution === 'function') {
        stopExecution();
    }
    
    updateStringDisplay();
    updateStepButtons();
    updateStartButton();
}

function clearStringAnalyzer() {
    stringAnalyzerState.inputString = '';
    stringAnalyzerState.characters = [];
    stringAnalyzerState.currentPosition = 0;
    stringAnalyzerState.isAnalyzing = false;
    stringAnalyzerState.executionController = null;
    
    // Desactivar estado de ejecución para restaurar interacciones del canvas
    if (typeof stopExecution === 'function') {
        stopExecution();
    }
    
    const stringInput = document.getElementById('stringInput');
    if (stringInput) {
        stringInput.value = '';
    }
    
    updateStringDisplay();
    updateStepButtons();
    updateStartButton();
}

function moveAnalyzerPointer(direction) {
    if (direction === 'next' && stringAnalyzerState.currentPosition < stringAnalyzerState.characters.length) {
        stringAnalyzerState.currentPosition++;
    } else if (direction === 'prev' && stringAnalyzerState.currentPosition > 0) {
        stringAnalyzerState.currentPosition--;
    }
    updateStringDisplay();
}

function setAnalyzerPosition(position) {
    if (position >= 0 && position <= stringAnalyzerState.characters.length) {
        stringAnalyzerState.currentPosition = position;
        updateStringDisplay();
    }
}

function getCurrentCharacter() {
    if (stringAnalyzerState.currentPosition < stringAnalyzerState.characters.length) {
        return stringAnalyzerState.characters[stringAnalyzerState.currentPosition];
    }
    return null; // Fin de cadena
}

function isAtEndOfString() {
    return stringAnalyzerState.currentPosition >= stringAnalyzerState.characters.length;
}

// --- FUNCIONES DE VISUALIZACIÓN ---

function highlightConsumedSequence(consumedLabel, endPosition) {
    // Destacar la secuencia que se acaba de consumir
    const container = document.getElementById('stringCharacterContainer');
    if (!container) return;
    
    const startPosition = endPosition - consumedLabel.length;
    const wrappers = container.querySelectorAll('.character-wrapper');
    
    // Limpiar destacados anteriores
    wrappers.forEach(wrapper => {
        const char = wrapper.querySelector('.string-character');
        if (char) {
            char.classList.remove('just-consumed');
        }
    });
    
    // Destacar la nueva secuencia consumida
    setTimeout(() => {
        for (let i = 0; i < wrappers.length; i++) {
            const wrapper = wrappers[i];
            const indexElement = wrapper.querySelector('.character-index');
            if (indexElement) {
                const charIndex = parseInt(indexElement.textContent);
                if (charIndex >= startPosition && charIndex < endPosition) {
                    const char = wrapper.querySelector('.string-character');
                    if (char) {
                        char.classList.add('just-consumed');
                    }
                }
            }
        }
        
        // Remover el destacado después de un tiempo
        setTimeout(() => {
            wrappers.forEach(wrapper => {
                const char = wrapper.querySelector('.string-character');
                if (char) {
                    char.classList.remove('just-consumed');
                }
            });
        }, 1500);
    }, 100);
}

function updateAnalysisStatus(executionState) {
    const statusElement = document.getElementById('analysisStatus');
    if (!statusElement) return;
    
    let statusText = '';
    let statusClass = '';
    
    switch (executionState.status) {
        case 'RUNNING':
            statusText = 'Analizando...';
            statusClass = 'status-running';
            break;
        case 'ACCEPTED':
            statusText = 'Cadena Aceptada ✓';
            statusClass = 'status-accepted';
            break;
        case 'REJECTED':
            statusText = 'Cadena Rechazada ✗';
            statusClass = 'status-rejected';
            break;
        default:
            statusText = 'Preparado';
            statusClass = 'status-ready';
    }
    
    statusElement.textContent = statusText;
    statusElement.className = `analysis-status ${statusClass}`;
}

function updateStringDisplay() {
    const container = document.getElementById('stringCharacterContainer');
    if (!container) return;

    const characters = stringAnalyzerState.characters;
    const currentPos = stringAnalyzerState.currentPosition;

    // Si no hay caracteres, mostrar placeholder
    if (characters.length === 0) {
        container.innerHTML = '<div class="placeholder-text">Ingrese una cadena para comenzar el análisis...</div>';
        updatePointerPosition(-1);
        return;
    }

    // Limpiar contenedor
    container.innerHTML = '';

    // Calcular rango visible
    const maxVisible = stringAnalyzerState.maxVisibleChars;
    let startIndex = Math.max(0, currentPos - Math.floor(maxVisible / 2));
    let endIndex = Math.min(characters.length, startIndex + maxVisible);
    
    // Ajustar si estamos cerca del final
    if (endIndex - startIndex < maxVisible && startIndex > 0) {
        startIndex = Math.max(0, endIndex - maxVisible);
    }

    // Crear elementos para cada carácter visible
    for (let i = startIndex; i < endIndex; i++) {
        const charElement = document.createElement('div');
        charElement.className = 'string-character';
        charElement.textContent = characters[i];
        
        // Marcar carácter actual (siguiente a procesar)
        if (i === currentPos) {
            charElement.classList.add('current');
        }
        
        // Marcar caracteres ya procesados
        if (i < currentPos) {
            charElement.classList.add('processed');
        }
        
        // Agregar índice
        const indexElement = document.createElement('div');
        indexElement.className = 'character-index';
        indexElement.textContent = i;
        
        const wrapper = document.createElement('div');
        wrapper.className = 'character-wrapper';
        wrapper.appendChild(charElement);
        wrapper.appendChild(indexElement);
        
        container.appendChild(wrapper);
    }

    // Si estamos al final de la cadena, agregar indicador de fin
    if (currentPos >= characters.length && endIndex === characters.length) {
        const endElement = document.createElement('div');
        endElement.className = 'string-character end-of-string';
        endElement.innerHTML = '⊥'; // Símbolo de fin de cadena
        
        const indexElement = document.createElement('div');
        indexElement.className = 'character-index';
        indexElement.textContent = characters.length;
        
        const wrapper = document.createElement('div');
        wrapper.className = 'character-wrapper';
        wrapper.appendChild(endElement);
        wrapper.appendChild(indexElement);
        
        container.appendChild(wrapper);
    }

    // Actualizar posición del puntero
    updatePointerPosition(currentPos - startIndex);
}

function updatePointerPosition(relativePosition) {
    const pointer = document.querySelector('.string-analyzer-pointer');
    if (!pointer) return;

    if (relativePosition < 0) {
        pointer.style.display = 'none';
        return;
    }

    pointer.style.display = 'block';
    
    // Calcular posición del puntero
    const characterWidth = 45; // Ancho de cada carácter + margen
    const containerPadding = 20;
    const pointerOffset = containerPadding + (relativePosition * characterWidth) + (characterWidth / 2);
    
    pointer.style.left = `${pointerOffset}px`;
}

// --- FUNCIONES DE EVENTOS ---

function handleStringInput() {
    const stringInput = document.getElementById('stringInput');
    if (stringInput) {
        const inputValue = stringInput.value.trim();
        setAnalyzerString(inputValue);
        // Limpiar el controlador anterior cuando se cambia la cadena
        stringAnalyzerState.executionController = null;
        updateStepButtons();
        updateStartButton();
    }
}

function openStringInputDialog() {
    const modal = document.getElementById('stringInputModal');
    const modalInput = document.getElementById('modalStringInput');
    
    if (modal && modalInput) {
        // Llenar con el valor actual si existe
        modalInput.value = stringAnalyzerState.inputString;
        modal.style.display = 'block';
        setTimeout(() => {
            modalInput.focus();
            modalInput.select();
        }, 100);
    }
}

function closeStringInputModal() {
    const modal = document.getElementById('stringInputModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function applyStringFromModal() {
    const modalInput = document.getElementById('modalStringInput');
    if (modalInput) {
        const inputValue = modalInput.value.trim();
        setAnalyzerString(inputValue);
        
        // También actualizar el input inline
        const stringInput = document.getElementById('stringInput');
        if (stringInput) {
            stringInput.value = inputValue;
        }
        
        // Limpiar el controlador anterior cuando se cambia la cadena
        stringAnalyzerState.executionController = null;
        updateStepButtons();
        updateStartButton();
        
        closeStringInputModal();
        
        // Mostrar el analizador si no está visible
        showStringAnalyzer();
    }
}

// --- INICIALIZACIÓN ---

function initializeStringAnalyzer() {
    const toggleButton = document.getElementById('toggleStringButton');
    const resetButton = document.getElementById('resetStringButton');
    const clearButton = document.getElementById('clearStringButton');
    const closeButton = document.getElementById('closeStringContainerBtn');
    const setStringButton = document.getElementById('setStringButton');
    const applyButton = document.getElementById('applyStringButton');
    const stringInput = document.getElementById('stringInput');
    const confirmStringButton = document.getElementById('confirmStringButton');
    const modalStringInput = document.getElementById('modalStringInput');
    const stepForwardBtn = document.getElementById('stepForwardButton');
    const stepBackwardBtn = document.getElementById('stepBackwardButton');
    const startAutomataBtn = document.getElementById('startAutomata');

    if (toggleButton) {
        toggleButton.addEventListener('click', toggleStringAnalyzer);
    }
    
    if (resetButton) {
        resetButton.addEventListener('click', resetStringAnalyzer);
    }
    
    if (clearButton) {
        clearButton.addEventListener('click', clearStringAnalyzer);
    }
    
    if (closeButton) {
        closeButton.addEventListener('click', hideStringAnalyzer);
    }
    
    if (setStringButton) {
        setStringButton.addEventListener('click', openStringInputDialog);
    }
    
    if (applyButton) {
        applyButton.addEventListener('click', handleStringInput);
    }
    
    if (confirmStringButton) {
        confirmStringButton.addEventListener('click', applyStringFromModal);
    }
    
    if (stepForwardBtn) {
        stepForwardBtn.addEventListener('click', stepForward);
    }
    
    if (stepBackwardBtn) {
        stepBackwardBtn.addEventListener('click', stepBackward);
    }
    
    if (startAutomataBtn) {
        startAutomataBtn.addEventListener('click', startAutomataAnalysis);
    }
    
    if (stringInput) {
        stringInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleStringInput();
            }
        });
        
        // Limitar caracteres permitidos (opcional)
        stringInput.addEventListener('input', (e) => {
            // Remover caracteres no deseados si es necesario
            const value = e.target.value;
            // Ejemplo: solo permitir letras, números y algunos símbolos
            const filteredValue = value.replace(/[^a-zA-Z0-9\s\-_.,;:!?()[\]{}]/g, '');
            if (value !== filteredValue) {
                e.target.value = filteredValue;
            }
        });
    }
    
    if (modalStringInput) {
        modalStringInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                applyStringFromModal();
            }
        });
        
        // Aplicar el mismo filtro al modal
        modalStringInput.addEventListener('input', (e) => {
            const value = e.target.value;
            const filteredValue = value.replace(/[^a-zA-Z0-9\s\-_.,;:!?()[\]{}]/g, '');
            if (value !== filteredValue) {
                e.target.value = filteredValue;
            }
        });
    }

    // Cerrar modal al hacer clic fuera de él
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('stringInputModal');
        if (e.target === modal) {
            closeStringInputModal();
        }
    });

    // Inicializar con cadena vacía
    setAnalyzerString('');
    updateStepButtons(); // Inicializar botones como deshabilitados
    updateStartButton(); // Inicializar botón de inicio
}

// --- FUNCIONES PÚBLICAS PARA INTEGRACIÓN CON AUTÓMATAS ---

// Estas funciones pueden ser llamadas desde el motor de autómatas
function startStringAnalysis(inputString) {
    setAnalyzerString(inputString);
    stringAnalyzerState.isAnalyzing = true;
    showStringAnalyzer();
}

function advanceStringAnalysis() {
    if (stringAnalyzerState.isAnalyzing && !isAtEndOfString()) {
        moveAnalyzerPointer('next');
        return getCurrentCharacter();
    }
    return null;
}

function stopStringAnalysis() {
    stringAnalyzerState.isAnalyzing = false;
}

function getStringAnalyzerInfo() {
    return {
        string: stringAnalyzerState.inputString,
        position: stringAnalyzerState.currentPosition,
        currentChar: getCurrentCharacter(),
        isAtEnd: isAtEndOfString(),
        isAnalyzing: stringAnalyzerState.isAnalyzing
    };
}

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initializeStringAnalyzer, 100);
});

// Exponer funciones globalmente para uso en otros módulos
window.stringAnalyzer = {
    show: showStringAnalyzer,
    hide: hideStringAnalyzer,
    setString: setAnalyzerString,
    reset: resetStringAnalyzer,
    clear: clearStringAnalyzer,
    movePointer: moveAnalyzerPointer,
    setPosition: setAnalyzerPosition,
    getCurrentChar: getCurrentCharacter,
    isAtEnd: isAtEndOfString,
    startAnalysis: startStringAnalysis,
    advance: advanceStringAnalysis,
    stop: stopStringAnalysis,
    getInfo: getStringAnalyzerInfo,
    setExecutionController: setExecutionController,
    stepForward: stepForward,
    stepBackward: stepBackward,
    updateStepButtons: updateStepButtons,
    startAutomataAnalysis: startAutomataAnalysis,
    updateStartButton: updateStartButton,
    showAvailableTransitions: showAvailableTransitions,
    highlightConsumedSequence: highlightConsumedSequence,
    updateAnalysisStatus: updateAnalysisStatus,
    validateAutomataRegexTransitions: validateAutomataRegexTransitions,
    showRegexValidationErrors: showRegexValidationErrors
};

// Exponer funciones del modal globalmente
window.closeStringInputModal = closeStringInputModal;
window.showStringAnalyzer = showStringAnalyzer;
