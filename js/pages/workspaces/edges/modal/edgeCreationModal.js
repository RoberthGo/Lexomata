function showEdgeLabelModal(fromNode, toNode) {
    const modal = document.getElementById('customEdgeModal');
    const modalMessageEdge = document.getElementById('modalMessageEdge');
    const modalInputContainer = document.getElementById('modalEdgeContainer');

    // Configurar el mensaje
    modalMessageEdge.textContent = `Crear transiciones de ${fromNode.label} a ${toNode.label}`;

    // Limpiar y preparar el contenedor existente
    modalInputContainer.innerHTML = '';
    modalInputContainer.style.display = 'block';

    // Crear contenedor específico para los inputs
    const inputsContainer = document.createElement('div');
    inputsContainer.id = 'edgeInputsContainer';

    // Añadir primera caja de texto
    addEdgeInput(inputsContainer);

    // Crear contenedor para botones
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'modal-actions';

    // Crear botón Guardar
    const saveButton = document.createElement('button');
    saveButton.className = 'modal-button';
    saveButton.textContent = 'Guardar';
    saveButton.onclick = function () {

        saveEdgeLabels(fromNode, toNode);
    };

    // Crear botón Añadir otra transición
    const addMoreButton = document.createElement('button');
    addMoreButton.className = 'modal-button secondary';
    addMoreButton.textContent = 'Añadir otra transición';
    addMoreButton.onclick = function () {
        addEdgeInput(inputsContainer);
    };

    // Añadir botones al contenedor
    buttonContainer.appendChild(saveButton);
    buttonContainer.appendChild(addMoreButton);

    // Añadir elementos al contenedor principal en el orden correcto
    modalInputContainer.appendChild(inputsContainer);  // Primero los inputs
    modalInputContainer.appendChild(buttonContainer);  // Luego los botones

    // Mostrar el modal
    modal.style.display = 'flex';

}
// Función para añadir cajas de texto (sin cambios)
function addEdgeInput(container) {
    const inputGroup = document.createElement('div');
    inputGroup.className = 'input-group';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'modal-input edge-input';
    input.placeholder = 'Ingrese etiqueta de transición';

    inputGroup.appendChild(input);
    container.appendChild(inputGroup);
}

function saveEdgeLabels(fromNode, toNode) {
    const inputs = document.querySelectorAll('.edge-input');
    const newLabels = [];
    const validationErrors = [];

    inputs.forEach((input, index) => {
        const value = input.value.trim();
        if (!value) return; // Ignorar campos vacíos

        const validation = validateTransitionLabel(value, currentMode);
        if (validation.isValid) {
            // Si es modo Turing y hay una etiqueta normalizada, usarla
            const finalLabel = (currentMode === 'turing' && validation.normalizedLabel) 
                ? validation.normalizedLabel 
                : value;
            newLabels.push(finalLabel);
        } else {
            validationErrors.push(`Campo ${index + 1}: ${validation.error}`);
        }
    });

    if (validationErrors.length > 0) {
        let errorMessage;
        if (currentMode === 'turing') {
            errorMessage = "Error al procesar la transición de Turing. Formato requerido: 'leer,escribir,mover' (ej: 'a,b,R')\n\n";
            errorMessage += validationErrors.join('\n');

            // Agregar sugerencias para cada error
            const suggestions = inputs.map((input, index) => {
                const value = input.value.trim();
                if (value) {
                    const validation = validateTransitionLabel(value, currentMode);
                    if (!validation.isValid) {
                        return `Sugerencia para campo ${index + 1}: ${suggestTuringTransitionFix(value)}`;
                    }
                }
                return null;
            }).filter(s => s !== null);

            if (suggestions.length > 0) {
                errorMessage += '\n\nSugerencias:\n' + suggestions.join('\n');
            }
        } else {
            errorMessage = "Error al procesar la transicion, verifica que tenga caracteres validos\no no uses un caracter de escape invalido (\\)\n" + validationErrors.join('\n');
        }
        showMessage(errorMessage);
        return;
    }

    if (newLabels.length === 0) {
        closeMessage('customEdgeModal');
        return;
    }

    // 2. Busca si YA EXISTE una arista entre estos dos nodos.
    let existingEdge = edges.find(e => e.from === fromNode.id && e.to === toNode.id);

    if (existingEdge) {
        // 3. SI EXISTE: simplemente añade las nuevas etiquetas a su arreglo.
        if (!Array.isArray(existingEdge.labels)) {
            existingEdge.labels = [existingEdge.label];
        }

        // Añade solo las etiquetas que no estén ya incluidas para evitar duplicados.
        newLabels.forEach(label => {
            const labelExists = existingEdge.labels.some(existingLabel => {
                const existingLabelText = typeof existingLabel === 'object' ? existingLabel.text : existingLabel;
                const newLabelText = typeof label === 'object' ? label.text : label;
                return existingLabelText === newLabelText;
            });

            if (!labelExists) {
                existingEdge.labels.push(label);
            }
        });

    } else {
        // 4. SI NO EXISTE: crea una arista nueva con las etiquetas recolectadas según el modo.
        let newEdge;
        if (currentMode === 'turing') {
            // Para máquinas de Turing, crear EdgeTuring con las transiciones parseadas
            newEdge = createTuringEdge(fromNode.id, toNode.id, newLabels);
        } else {
            // Para autómatas, usar EdgeAutomata
            newEdge = new EdgeAutomata(fromNode.id, toNode.id, newLabels);
        }
        edges.push(newEdge);
    }

    // 5. Redibuja el canvas y guarda el estado.
    redrawCanvas();
    saveState();
    closeMessage('customEdgeModal');
}

/**
 * Crea una arista de máquina de Turing con las transiciones especificadas
 * @param {string} fromId - ID del nodo origen
 * @param {string} toId - ID del nodo destino
 * @param {Array} transitionLabels - Array de etiquetas en formato "leer,escribir,mover"
 * @returns {EdgeTuring} - Nueva arista de Turing
 */
function createTuringEdge(fromId, toId, transitionLabels) {
    // Parsear la primera transición para los parámetros del constructor
    const firstTransition = parseTuringTransition(transitionLabels[0]);

    // Crear la arista con los parámetros de la primera transición
    const turingEdge = new EdgeTuring(
        fromId,
        toId,
        [], // transitions array se inicializa vacío
        firstTransition.read,
        firstTransition.write,
        firstTransition.move
    );

    // Asignar todas las etiquetas al array labels para compatibilidad con el sistema existente
    turingEdge.labels = transitionLabels;
    turingEdge.note = "";

    return turingEdge;
}

/**
 * Parsea una transición de Turing en formato "leer,escribir,mover"
 * @param {string} transitionStr - String de transición
 * @returns {Object} - Objeto con propiedades read, write, move
 */
function parseTuringTransition(transitionStr) {
    transitionStr = String(transitionStr);
    const parts = transitionStr.split(',');
    return {
        read: parts[0] || '',
        write: parts[1] || '',
        move: parts[2] || 'R'
    };
}