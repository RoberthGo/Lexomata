// ---------------------------------------------------------------------------------
// SECTION: Turing Machine Execution System
// ---------------------------------------------------------------------------------

let turingExecutionState = {
    isExecuting: false,
    executionController: null,
    inputString: '',
    headPosition: 0
};

/**
 * Inicia la ejecución de una máquina de Turing
 * @param {string} inputString - Cadena inicial para la cinta
 * @param {number} headPosition - Posición inicial del cabezal (por defecto 0)
 */
function startTuringExecution(inputString, headPosition = 0) {
    // Validar que hay al menos un estado inicial y final
    const startNode = nodes.find(n => n.IsStart);
    if (!startNode) {
        showMessage("Error: No se encontró un estado inicial. Marca un nodo como estado inicial.");
        return false;
    }

    const hasFinalNode = nodes.some(n => n.IsEnd);
    if (!hasFinalNode) {
        showMessage("Error: No se ha definido ningún estado final. Marca al menos un nodo como estado final.");
        return false;
    }

    // Validar que el modo es Turing
    if (currentMode !== 'turing') {
        showMessage("Error: Esta función solo está disponible en modo máquina de Turing.");
        return false;
    }

    // Validar transiciones
    const validation = validateTuringTransitions();
    if (!validation.valid) {
        const errorMessage = "Error en las transiciones de la máquina de Turing:\n" +
            validation.errors.map(e => `• ${e.error}`).join('\n');
        showMessage(errorMessage);
        return false;
    }

    try {
        // Activar estado de ejecución para bloquear interacciones del canvas
        if (typeof startExecution === 'function') {
            startExecution();
        }

        // Crear el controlador de ejecución
        turingExecutionState.executionController = new TuringExecutionController(
            nodes,
            edges,
            inputString,
            headPosition
        );

        turingExecutionState.isExecuting = true;
        turingExecutionState.inputString = inputString;
        turingExecutionState.headPosition = headPosition;

        // Actualizar la visualización de la cinta
        updateTuringTapeFromExecution();

        // Highlighting del estado inicial
        highlightCurrentTuringState();

        console.log("Ejecución de máquina de Turing iniciada:", {
            inputString: inputString,
            headPosition: headPosition,
            totalSteps: turingExecutionState.executionController.getHistory().length
        });

        // Notificar a la interfaz de la cinta que la ejecución ha comenzado
        if (typeof setTuringTapeExecutionMode === 'function') {
            setTuringTapeExecutionMode(true);
        }

        return true;
    } catch (error) {
        // En caso de error, desactivar el estado de ejecución
        if (typeof stopExecution === 'function') {
            stopExecution();
        }
        showMessage(`Error al iniciar la ejecución: ${error.message}`);
        return false;
    }
}

/**
 * Detiene la ejecución actual de la máquina de Turing
 */
function stopTuringExecution() {
    turingExecutionState.isExecuting = false;
    turingExecutionState.executionController = null;

    // Desactivar estado de ejecución para restaurar interacciones del canvas
    if (typeof stopExecution === 'function') {
        stopExecution();
    }

    // Limpiar highlighting
    selectedNodeIds = [];
    redrawCanvas();

    // Notificar a la interfaz de la cinta que la ejecución ha terminado
    if (typeof setTuringTapeExecutionMode === 'function') {
        setTuringTapeExecutionMode(false);
    }

    console.log("Ejecución de máquina de Turing detenida");
}

/**
 * Avanza un paso en la ejecución de la máquina de Turing
 */
function stepForwardTuring() {
    if (!turingExecutionState.executionController) {
        console.warn("No hay ejecución activa de máquina de Turing");
        return;
    }

    const nextState = turingExecutionState.executionController.stepForward();
    if (nextState) {
        updateTuringTapeFromExecution();
        highlightCurrentTuringState();
        showCurrentTuringTransition();

        console.log("Paso adelante:", nextState.message);
    } else {
        console.log("No hay más pasos disponibles");
    }
}

/**
 * Retrocede un paso en la ejecución de la máquina de Turing
 */
function stepBackwardTuring() {
    if (!turingExecutionState.executionController) {
        console.warn("No hay ejecución activa de máquina de Turing");
        return;
    }

    const prevState = turingExecutionState.executionController.stepBackward();
    if (prevState) {
        updateTuringTapeFromExecution();
        highlightCurrentTuringState();
        showCurrentTuringTransition();

        console.log("Paso atrás:", prevState.message);
    } else {
        console.log("Ya está en el paso inicial");
    }
}

/**
 * Actualiza la visualización de la cinta de Turing basada en el estado de ejecución actual
 */
function updateTuringTapeFromExecution() {
    if (!turingExecutionState.executionController) return;

    const currentState = turingExecutionState.executionController.getCurrentState();
    if (!currentState || !currentState.tapeState) return;

    // Usar la función de integración de la cinta de Turing
    if (typeof updateTuringTapeFromState === 'function') {
        updateTuringTapeFromState(currentState.tapeState);
    } else {
        // Fallback: actualizar manualmente si la función no está disponible
        if (typeof turingTapeState !== 'undefined') {
            const tapeState = currentState.tapeState;

            // Convertir el objeto de cinta a array para la visualización
            const start = Math.min(tapeState.leftmost, tapeState.headPosition - 10);
            const end = Math.max(tapeState.rightmost, tapeState.headPosition + 10);

            turingTapeState.cells = [];
            for (let i = start; i <= end; i++) {
                turingTapeState.cells.push(tapeState.tape[i] || '□');
            }

            turingTapeState.headPosition = tapeState.headPosition - start; // Ajustar posición relativa

            // Redibujar la cinta si está visible
            if (typeof drawTuringTape === 'function') {
                drawTuringTape();
            }
        }
    }
}

/**
 * Resalta el estado actual en el canvas
 */
function highlightCurrentTuringState() {
    if (!turingExecutionState.executionController) return;

    const currentState = turingExecutionState.executionController.getCurrentState();
    if (!currentState) return;

    // Usar la función global para resaltar durante ejecución si está disponible
    if (typeof highlightCurrentExecutionNode === 'function' && currentState.currentNodeId) {
        highlightCurrentExecutionNode(currentState.currentNodeId);
    } else {
        // Fallback al método anterior
        selectedNodeIds = [];

        // Resaltar el nodo actual
        if (currentState.currentNodeId) {
            selectedNodeIds = [currentState.currentNodeId];
        }

        redrawCanvas();
    }
}

/**
 * Muestra información sobre la transición actual
 */
function showCurrentTuringTransition() {
    if (!turingExecutionState.executionController) return;

    const currentState = turingExecutionState.executionController.getCurrentState();
    if (!currentState) return;

    // Si hay información de transición, mostrarla
    if (currentState.transition) {
        const transition = currentState.transition;
        console.log(`Transición aplicada: ${transition.matchedLabel}`);
    }

    // Mostrar transiciones disponibles
    const availableTransitions = turingExecutionState.executionController.getAvailableTransitions();
    if (availableTransitions.length > 0) {
        console.log("Transiciones disponibles:", availableTransitions);
    }
}

/**
 * Valida que todas las transiciones de la máquina de Turing sean válidas
 * @returns {Object} Resultado de la validación
 */
function validateTuringTransitions() {
    const errors = [];

    edges.forEach((edge, edgeIndex) => {
        if (!edge.labels || !Array.isArray(edge.labels)) {
            errors.push({
                edgeIndex: edgeIndex,
                error: `La arista ${edgeIndex + 1} no tiene etiquetas válidas`
            });
            return;
        }

        edge.labels.forEach((label, labelIndex) => {
            const labelText = typeof label === 'object' ? label.text : label;
            const validation = validateTuringTransition(labelText);

            if (!validation.isValid) {
                const fromNode = nodes.find(n => n.id === edge.from);
                const toNode = nodes.find(n => n.id === edge.to);

                errors.push({
                    edgeIndex: edgeIndex,
                    labelIndex: labelIndex,
                    label: labelText,
                    error: `Transición de ${fromNode?.label || 'desconocido'} a ${toNode?.label || 'desconocido'}: ${validation.error}`,
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

/**
 * Reinicia la ejecución de la máquina de Turing al estado inicial
 */
function resetTuringExecution() {
    if (!turingExecutionState.executionController) return;

    // Si estamos reiniciando, mantener el estado de ejecución activo
    turingExecutionState.executionController.reset();
    updateTuringTapeFromExecution();
    highlightCurrentTuringState();

    console.log("Ejecución reiniciada al estado inicial");
}

/**
 * Obtiene el estado actual de la ejecución de la máquina de Turing
 * @returns {Object|null} Estado actual o null si no hay ejecución activa
 */
function getCurrentTuringExecutionState() {
    if (!turingExecutionState.executionController) return null;

    return {
        isExecuting: turingExecutionState.isExecuting,
        currentState: turingExecutionState.executionController.getCurrentState(),
        history: turingExecutionState.executionController.getHistory(),
        currentStep: turingExecutionState.executionController.currentStep,
        totalSteps: turingExecutionState.executionController.getHistory().length
    };
}

/**
 * Ejecuta la máquina de Turing hasta completarse o encontrar un estado final
 * @param {number} maxSteps - Máximo número de pasos a ejecutar (por defecto 100)
 */
function runTuringToCompletion(maxSteps = 100) {
    if (!turingExecutionState.executionController) {
        console.warn("No hay ejecución activa de máquina de Turing");
        return;
    }

    let steps = 0;
    const controller = turingExecutionState.executionController;

    // Avanzar hasta el final o hasta el límite de pasos
    while (steps < maxSteps && controller.currentStep < controller.getHistory().length - 1) {
        controller.stepForward();
        steps++;
    }

    // Actualizar visualización
    updateTuringTapeFromExecution();
    highlightCurrentTuringState();
    showCurrentTuringTransition();

    const finalState = controller.getCurrentState();
    if (finalState) {
        console.log(`Ejecución completada en ${steps} pasos:`, finalState.message);

        // Mostrar resultado final
        if (finalState.status === 'ACCEPTED') {
            console.log("✅ Cadena ACEPTADA por la máquina de Turing");
        } else if (finalState.status === 'REJECTED') {
            console.log("❌ Cadena RECHAZADA por la máquina de Turing");
        } else if (finalState.status === 'TIMEOUT') {
            console.log("⏰ Ejecución detenida por límite de tiempo");
        }

        // Si la ejecución se completó, notificar a la interfaz
        if (finalState.status === 'ACCEPTED' || finalState.status === 'REJECTED' || finalState.status === 'TIMEOUT') {
            if (typeof setTuringTapeExecutionMode === 'function') {
                setTuringTapeExecutionMode(false);
            }
        }
    }
}

// ---------------------------------------------------------------------------------
// SECTION: Turing Machine Interface Integration Functions
// ---------------------------------------------------------------------------------

/**
 * Inicia la ejecución usando la cadena actual del input de la cinta de Turing
 * @param {boolean} stepByStep - Si true, ejecuta paso a paso; si false, ejecuta completamente
 */
function startTuringExecutionFromInput(stepByStep = false) {
    const input = document.getElementById('turingStringInput');
    if (!input) {
        console.warn("No se encontró el campo de entrada de la cinta de Turing");
        return;
    }

    const inputString = input.value.trim();
    if (!inputString) {
        showMessage("Por favor, ingrese una cadena en el campo de entrada de la cinta.");
        return;
    }

    console.log(`🎯 Ejecutando máquina de Turing desde entrada de cinta: "${inputString}"`);

    // Aplicar la cadena a la cinta visual primero
    if (typeof applyStringToTuringTape === 'function') {
        applyStringToTuringTape(inputString);
    }

    // Iniciar la ejecución
    const success = startTuringExecution(inputString);
    if (!success) {
        console.error("❌ No se pudo iniciar la ejecución");
        return;
    }

    if (stepByStep) {
        console.log("✨ Ejecución iniciada en modo paso a paso desde la interfaz.");
    } else {
        console.log("🚀 Ejecutando automáticamente desde la interfaz...");
        runTuringToCompletion();
    }
}

/**
 * Obtiene la cadena actual del campo de entrada de la cinta
 * @returns {string|null} Cadena del input o null si no se encuentra
 */
function getTuringInputString() {
    const input = document.getElementById('turingStringInput');
    return input ? input.value.trim() : null;
}

/**
 * Establece una cadena en el campo de entrada de la cinta
 * @param {string} inputString - Cadena a establecer
 */
function setTuringInputString(inputString) {
    const input = document.getElementById('turingStringInput');
    if (input) {
        input.value = inputString || '';
    }
}

// ---------------------------------------------------------------------------------
// SECTION: Turing Machine Testing and Utility Functions
// ---------------------------------------------------------------------------------

/**
 * Función de conveniencia para probar rápidamente una máquina de Turing
 * @param {string} inputString - Cadena de entrada para probar
 * @param {boolean} stepByStep - Si true, permite navegación paso a paso; si false, ejecuta completamente
 */
function testTuringMachine(inputString, stepByStep = false) {
    if (currentMode !== 'turing') {
        console.warn("Esta función solo funciona en modo máquina de Turing");
        return;
    }

    console.log(`🔧 Probando máquina de Turing con entrada: "${inputString}"`);

    const success = startTuringExecution(inputString);
    if (!success) {
        console.error("❌ No se pudo iniciar la ejecución");
        return;
    }

    if (stepByStep) {
        console.log("✨ Ejecución iniciada en modo paso a paso. Use stepForwardTuring() y stepBackwardTuring() para navegar.");
        console.log("📋 Estado inicial:", turingExecutionState.executionController.getCurrentState().message);
    } else {
        console.log("🚀 Ejecutando automáticamente...");
        runTuringToCompletion();
    }
}

/**
 * Muestra información detallada sobre el estado actual de la ejecución
 */
function showTuringExecutionInfo() {
    if (!turingExecutionState.executionController) {
        console.log("❌ No hay ejecución activa");
        return;
    }

    const state = getCurrentTuringExecutionState();
    const currentState = state.currentState;

    console.log("📊 INFORMACIÓN DE EJECUCIÓN DE MÁQUINA DE TURING");
    console.log("================================================");
    console.log(`📍 Paso actual: ${state.currentStep + 1} de ${state.totalSteps}`);
    console.log(`📝 Estado: ${currentState.status}`);
    console.log(`💬 Mensaje: ${currentState.message}`);

    if (currentState.tapeState) {
        const tapeState = currentState.tapeState;
        const controller = turingExecutionState.executionController;
        console.log(`🎯 Posición del cabezal: ${tapeState.headPosition}`);
        console.log(`📖 Carácter actual: '${controller.readTape(tapeState)}'`);
        console.log(`📼 Contenido de la cinta: ${controller.tapeToString(tapeState)}`);
    }

    if (currentState.transition) {
        const t = currentState.transition;
        console.log(`🔄 Última transición: ${t.matchedLabel}`);
    }

    // Mostrar transiciones disponibles
    const availableTransitions = turingExecutionState.executionController.getAvailableTransitions();
    if (availableTransitions.length > 0) {
        console.log("\n🛤️  TRANSICIONES DISPONIBLES:");
        availableTransitions.forEach((trans, index) => {
            const targetLabel = trans.targetNode ? trans.targetNode.label : 'desconocido';
            trans.allLabelsInfo.forEach(labelInfo => {
                const status = labelInfo.isMatching ? "✅" : "❌";
                console.log(`   ${status} ${labelInfo.label} → ${targetLabel}`);
                console.log(`      ${labelInfo.description}`);
            });
        });
    } else {
        console.log("\n❌ No hay transiciones disponibles desde el estado actual");
    }

    console.log("================================================");
}

/**
 * Exporta el historial completo de ejecución de la máquina de Turing
 * @returns {Array|null} Historial de ejecución o null si no hay ejecución activa
 */
function exportTuringExecutionHistory() {
    if (!turingExecutionState.executionController) {
        console.warn("No hay ejecución activa");
        return null;
    }

    const history = turingExecutionState.executionController.getHistory();
    const exportData = history.map((step, index) => {
        const controller = turingExecutionState.executionController;
        return {
            step: index,
            status: step.status,
            message: step.message,
            currentNode: step.currentNodeId,
            headPosition: step.tapeState ? step.tapeState.headPosition : null,
            tapeContent: step.tapeState ? controller.tapeToString(step.tapeState) : null,
            transition: step.transition ? step.transition.matchedLabel : null
        };
    });

    console.log("📥 Historial de ejecución exportado:", exportData);
    return exportData;
}

/**
 * Función de ayuda que muestra los comandos disponibles para la máquina de Turing
 */
function showTuringHelp() {
    console.log("🆘 AYUDA - MÁQUINA DE TURING");
    console.log("============================");
    console.log("🔧 testTuringMachine(cadena, [pasoAPaso])");
    console.log("   - Prueba la máquina con una cadena");
    console.log("   - pasoAPaso: true para navegación manual, false para ejecución automática");
    console.log("");
    console.log("🎯 startTuringExecutionFromInput([pasoAPaso])");
    console.log("   - Ejecuta usando la cadena del campo de entrada de la cinta");
    console.log("   - pasoAPaso: true para navegación manual, false para ejecución automática");
    console.log("");
    console.log("▶️  stepForwardTuring() - Avanza un paso");
    console.log("◀️  stepBackwardTuring() - Retrocede un paso");
    console.log("🔄 resetTuringExecution() - Reinicia al estado inicial");
    console.log("⏹️  stopTuringExecution() - Detiene la ejecución");
    console.log("🏃 runTuringToCompletion([maxPasos]) - Ejecuta hasta completar");
    console.log("");
    console.log("📊 showTuringExecutionInfo() - Muestra información detallada");
    console.log("📥 exportTuringExecutionHistory() - Exporta el historial");
    console.log("📈 getCurrentTuringExecutionState() - Obtiene el estado actual");
    console.log("");
    console.log("🎪 FUNCIONES DE INTERFAZ:");
    console.log("📝 getTuringInputString() - Obtiene la cadena del campo de entrada");
    console.log("✏️  setTuringInputString(cadena) - Establece la cadena en el campo");
    console.log("🎨 applyStringToTuringTape(cadena) - Aplica cadena directamente a la cinta");
    console.log("");
    console.log("Ejemplos:");
    console.log('testTuringMachine("101", true);  // Ejecutar en modo paso a paso');
    console.log('testTuringMachine("abc", false); // Ejecutar automáticamente');
    console.log('startTuringExecutionFromInput(true); // Usar entrada de la interfaz');
    console.log("============================");
}

// Hacer las funciones disponibles globalmente para testing
if (typeof window !== 'undefined') {
    window.testTuringMachine = testTuringMachine;
    window.showTuringExecutionInfo = showTuringExecutionInfo;
    window.exportTuringExecutionHistory = exportTuringExecutionHistory;
    window.showTuringHelp = showTuringHelp;
    window.stepForwardTuring = stepForwardTuring;
    window.stepBackwardTuring = stepBackwardTuring;
    window.resetTuringExecution = resetTuringExecution;
    window.stopTuringExecution = stopTuringExecution;
    window.runTuringToCompletion = runTuringToCompletion;
    window.getCurrentTuringExecutionState = getCurrentTuringExecutionState;

    // Funciones de integración con la interfaz
    window.startTuringExecutionFromInput = startTuringExecutionFromInput;
    window.getTuringInputString = getTuringInputString;
    window.setTuringInputString = setTuringInputString;
}
