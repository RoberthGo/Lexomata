let labelEditState = {
    isActive: false,
    edge: null,
    labelIndex: null,
    originalText: '',
    blinkInterval: null,
    showCursor: true,
    cursorPosition: 0
};

/**
 * Detecta si se hizo clic en una etiqueta específica de una arista
 * @param {number} x - Coordenada X del clic
 * @param {number} y - Coordenada Y del clic
 * @returns {Object|null} - Objeto con información de la etiqueta clickeada o null
 */
function detectLabelClick(x, y) {
    for (let edge of edges) {
        if (!edge.labels) continue;

        for (let i = 0; i < edge.labels.length; i++) {
            const label = edge.labels[i];
            if (
                x >= label.x &&
                x <= label.x + label.width &&
                y >= label.y &&
                y <= label.y + label.height
            ) {
                return {
                    edge: edge,
                    labelIndex: i,
                    labelText: typeof label === 'object' ? label.text : label
                };
            }
        }
    }
    return null;
}

/**
 * Inicia el modo de edición para una etiqueta específica
 * @param {Object} labelInfo - Información de la etiqueta a editar
 */
function startLabelEdit(labelInfo) {
    // Si ya hay una edición activa, terminarla primero
    if (labelEditState.isActive) {
        finishLabelEdit();
    }

    labelEditState.isActive = true;
    labelEditState.edge = labelInfo.edge;
    labelEditState.labelIndex = labelInfo.labelIndex;
    labelEditState.originalText = labelInfo.labelText;
    labelEditState.cursorPosition = labelInfo.labelText.length;

    // Iniciar el efecto titilante
    startBlinkingEffect();

    // Agregar listeners para teclas
    document.addEventListener('keydown', handleLabelEditKeydown);
    document.addEventListener('click', handleLabelEditClickOutside);

    redrawCanvas();
}

/**
 * Inicia el efecto titilante de la etiqueta
 */
function startBlinkingEffect() {
    labelEditState.showCursor = true;
    labelEditState.blinkInterval = setInterval(() => {
        labelEditState.showCursor = !labelEditState.showCursor;
        redrawCanvas();
    }, 500); // Parpadeo cada 500ms
}

/**
 * Detiene el efecto titilante
 */
function stopBlinkingEffect() {
    if (labelEditState.blinkInterval) {
        clearInterval(labelEditState.blinkInterval);
        labelEditState.blinkInterval = null;
    }
}

/**
 * Maneja las teclas presionadas durante la edición
 * @param {KeyboardEvent} e - Evento de teclado
 */
function handleLabelEditKeydown(e) {
    if (!labelEditState.isActive) return;

    e.preventDefault();
    e.stopPropagation();

    const currentText = getCurrentLabelText();

    switch (e.key) {
        case 'Enter':
            finishLabelEdit();
            break;
        case 'Escape':
            cancelLabelEdit();
            break;
        case 'Backspace':
            if (labelEditState.cursorPosition > 0) {
                const newText = currentText.slice(0, labelEditState.cursorPosition - 1) +
                    currentText.slice(labelEditState.cursorPosition);
                updateLabelText(newText);
                labelEditState.cursorPosition--;
            }
            break;
        case 'Delete':
            if (labelEditState.cursorPosition < currentText.length) {
                const newText = currentText.slice(0, labelEditState.cursorPosition) +
                    currentText.slice(labelEditState.cursorPosition + 1);
                updateLabelText(newText);
            }
            break;
        case 'ArrowLeft':
            if (labelEditState.cursorPosition > 0) {
                labelEditState.cursorPosition--;
            }
            break;
        case 'ArrowRight':
            if (labelEditState.cursorPosition < currentText.length) {
                labelEditState.cursorPosition++;
            }
            break;
        case 'Home':
            labelEditState.cursorPosition = 0;
            break;
        case 'End':
            labelEditState.cursorPosition = currentText.length;
            break;
        default:
            // Solo permitir caracteres imprimibles
            if (e.key.length === 1 && !e.ctrlKey && !e.altKey) {
                const newText = currentText.slice(0, labelEditState.cursorPosition) +
                    e.key +
                    currentText.slice(labelEditState.cursorPosition);
                updateLabelText(newText);
                labelEditState.cursorPosition++;
            }
            break;
    }

    redrawCanvas();
}

/**
 * Maneja clics fuera de la etiqueta para terminar la edición
 * @param {MouseEvent} e - Evento de clic
 */
function handleLabelEditClickOutside(e) {
    if (!labelEditState.isActive) return;

    // Si el clic es en el canvas, verificar si es fuera de la etiqueta
    if (e.target === canvas) {
        const worldCoords = getCanvasPoint(e.clientX, e.clientY);
        const clickedLabel = detectLabelClick(worldCoords.x, worldCoords.y);

        // Si no se hizo clic en la etiqueta que se está editando, terminar edición
        if (!clickedLabel ||
            clickedLabel.edge !== labelEditState.edge ||
            clickedLabel.labelIndex !== labelEditState.labelIndex) {
            finishLabelEdit();
        }
    }
}

/**
 * Obtiene el texto actual de la etiqueta en edición
 * @returns {string} - Texto actual de la etiqueta
 */
function getCurrentLabelText() {
    const edge = labelEditState.edge;
    const labelIndex = labelEditState.labelIndex;

    if (edge.labels && edge.labels[labelIndex]) {
        return typeof edge.labels[labelIndex] === 'object' ?
            edge.labels[labelIndex].text :
            edge.labels[labelIndex];
    }
    return '';
}

/**
 * Obtiene una preview del texto normalizado para mostrar al usuario (solo para Turing)
 * @returns {string} - Texto con preview de normalización
 */
function getPreviewText() {
    const currentText = getCurrentLabelText();
    
    // Solo aplicar preview para modo Turing
    if (currentMode !== 'turing') {
        return currentText;
    }
    
    // Si la función de normalización está disponible, usarla
    if (typeof normalizeTuringLabel === 'function') {
        return normalizeTuringLabel(currentText);
    }
    
    return currentText;
}

/**
 * Actualiza el texto de la etiqueta en edición
 * @param {string} newText - Nuevo texto para la etiqueta
 */
function updateLabelText(newText) {
    const edge = labelEditState.edge;
    const labelIndex = labelEditState.labelIndex;

    if (edge.labels && edge.labels[labelIndex]) {
        if (typeof edge.labels[labelIndex] === 'object') {
            edge.labels[labelIndex].text = newText;
        } else {
            edge.labels[labelIndex] = newText;
        }
    }
}

/**
 * Termina la edición y guarda los cambios
 */
function finishLabelEdit() {
    if (!labelEditState.isActive) return;

    const newText = getCurrentLabelText().trim();

    // Validar el nuevo texto
    if (!newText) {
        // Si está vacío, restaurar el texto original
        updateLabelText(labelEditState.originalText);
        cancelLabelEdit();
        return;
    }

    const validation = validateTransitionLabel(newText, currentMode);
    if (!validation.isValid) {
        // Si no es válido, restaurar el texto original
        updateLabelText(labelEditState.originalText);
        showMessage(`Error en la etiqueta: ${validation.error}`);
        cancelLabelEdit();
        return;
    }

    // Si es modo Turing y hay una etiqueta normalizada, usarla
    let finalText = newText;
    if (currentMode === 'turing' && validation.normalizedLabel) {
        finalText = validation.normalizedLabel;
        // Actualizar la etiqueta con el texto normalizado
        updateLabelText(finalText);
    }

    // Guardar estado si el texto cambió
    if (finalText !== labelEditState.originalText) {
        saveState();
    }

    resetLabelEditState();
    redrawCanvas();
}

/**
 * Cancela la edición y restaura el texto original
 */
function cancelLabelEdit() {
    if (!labelEditState.isActive) return;

    // Restaurar texto original
    updateLabelText(labelEditState.originalText);

    resetLabelEditState();
    redrawCanvas();
}

/**
 * Resetea el estado de edición de etiquetas
 */
function resetLabelEditState() {
    stopBlinkingEffect();

    // Remover listeners
    document.removeEventListener('keydown', handleLabelEditKeydown);
    document.removeEventListener('click', handleLabelEditClickOutside);

    labelEditState.isActive = false;
    labelEditState.edge = null;
    labelEditState.labelIndex = null;
    labelEditState.originalText = '';
    labelEditState.showCursor = true;
    labelEditState.cursorPosition = 0;
}