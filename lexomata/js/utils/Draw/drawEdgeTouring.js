function showTuringEdgeModal(fromNode, toNode) {
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
    addTuringEdgeTransitionRow(inputsContainer);

    // Crear contenedor para botones
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'modal-actions';

    // Crear botón Guardar
    const saveButton = document.createElement('button');
    saveButton.className = 'modal-button';
    saveButton.textContent = 'Guardar';
    saveButton.onclick = function () {
        saveTuringEdgeTransitions(fromNode, toNode);
    };

    // Crear botón Añadir otra transición
    const addMoreButton = document.createElement('button');
    addMoreButton.className = 'modal-button secondary';
    addMoreButton.textContent = 'Añadir otra transición';
    addMoreButton.onclick = function () {
        addTuringEdgeTransitionRow(inputsContainer);
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

/**
 * Añade una fila de inputs (leer, escribir, mover) al contenedor del modal.
 */
function addTuringEdgeTransitionRow(container) {
    const transitionGroup = document.createElement('div');
    transitionGroup.className = 'tm-edge-transition-group';

    const readInput = document.createElement('input');
    readInput.type = 'text';
    readInput.className = 'tm-edge-input tm-edge-read-char';
    readInput.placeholder = 'Leer';
    readInput.maxLength = 1;

    const writeInput = document.createElement('input');
    writeInput.type = 'text';
    writeInput.className = 'tm-edge-input tm-edge-write-char';
    writeInput.placeholder = 'Escribir';
    writeInput.maxLength = 1;

    const moveSelect = document.createElement('select');
    moveSelect.className = 'tm-edge-select tm-edge-move-dir';
    const options = [
        { value: 'R', text: 'R (Derecha)' },
        { value: 'L', text: 'L (Izquierda)' },
        { value: 'M', text: 'M (Mantener)' }
    ];
    options.forEach(opt => {
        const optionEl = document.createElement('option');
        optionEl.value = opt.value;
        optionEl.textContent = opt.text;
        moveSelect.appendChild(optionEl);
    });

    transitionGroup.appendChild(readInput);
    transitionGroup.appendChild(writeInput);
    transitionGroup.appendChild(moveSelect);
    container.appendChild(transitionGroup);
}

function saveTuringEdgeTransitions(fromNode, toNode) {
    const allTransitionGroups = document.querySelectorAll('.tm-edge-transition-group');
    const newLabels = [];

    allTransitionGroups.forEach(group => {
        const readChar = group.querySelector('.tm-edge-read-char').value.trim();
        const writeChar = group.querySelector('.tm-edge-write-char').value.trim();
        const moveDir = group.querySelector('.tm-edge-move-dir').value;

        if (readChar && writeChar) {
            // Formateamos la transición al formato "leer,escribir,mover"
            const formattedLabel = `${readChar},${writeChar},${moveDir}`;
            newLabels.push(formattedLabel);
        }
    });

    if (newLabels.length === 0) {
        closeMessage('customEdgeModal');
        return;
    }

    // Reutilizamos TU LÓGICA EXACTA para añadir o crear aristas
    let existingEdge = edges.find(e => e.from === fromNode.id && e.to === toNode.id);

    if (existingEdge) {
        if (!Array.isArray(existingEdge.labels)) {
            existingEdge.labels = [existingEdge.label];
        }
        newLabels.forEach(label => {
            if (!existingEdge.labels.includes(label)) {
                existingEdge.labels.push(label);
            }
        });
    } else {
        const newEdge = new EdgeAutomata(fromNode.id, toNode.id, newLabels);
        edges.push(newEdge);
    }
    console.log("Transiciones guardadas:", newLabels);
    redrawCanvas();
    saveState();
    closeMessage('customEdgeModal');
}