document.addEventListener('DOMContentLoaded', function () {

    // --- ELEMENTOS DEL DOM ---
    const modal = document.getElementById('multipleRunModal');
    const openModalBtn = document.getElementById('multipleRunBtn');
    const closeModalBtn = document.querySelector('#close-button');
    const addRowBtn = document.getElementById('addRowBtn');
    const runAllBtn = document.getElementById('runAllBtn');
    const inputTable = document.getElementById('inputTable');
    const inputTableBody = inputTable.querySelector('tbody');

    // --- ICONOS SVG ---
    const runIconSVG = `<svg class="run-icon" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/></svg>`;
    const deleteIconSVG = `<svg class="delete-icon" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16"><path d="M2.5 1a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1H3v9a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4h.5a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H10a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1H2.5zm3 4a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5zM8 5a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5zm3 .5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 1 0z"/></svg>`;

    // --- LÓGICA DE LA TABLA ---
    function createInputRow() {
        const placeholder = inputTableBody.querySelector('.placeholder-row');
        if (placeholder) placeholder.remove();

        const newRow = inputTableBody.insertRow();
        newRow.innerHTML = `
            <td><input type="text" placeholder="Cadena..."></td>
            <td class="result-cell"></td>
            <td class="row-actions">
                <button class="icon-button run-row-btn" title="Ejecutar">${runIconSVG}</button>
                <button class="icon-button delete-row-btn" title="Borrar">${deleteIconSVG}</button>
            </td>
        `;
        applyZoomToRow(newRow); // Aplica el zoom actual a la nueva fila
    }


    function simulateRun(row) {
        // Asegurarse de que el autómata exista globalmente
        if (typeof nodes === 'undefined' || typeof edges === 'undefined') {
            showMessage("Error: No hay un autómata definido para ejecutar.");
            return;
        }

        const inputEl = row.querySelector('input[type="text"]');
        const resultEl = row.querySelector('.result-cell');
        const inputValue = inputEl.value;

        // Limpiar celdas
        resultEl.textContent = '-';
        resultEl.className = 'result-cell';

        if (!inputValue) return;

        // Determinar modo actual (automata o turing)
        const mode = (typeof getCurrentMode === 'function') ? getCurrentMode() : 'automata';
        let controller;
        if (mode === 'turing') {
            // Máquina de Turing: headPosition por defecto 0
            controller = new TuringExecutionController(nodes, edges, inputValue, 0);
        } else {
            // Autómata finito
            controller = new ExecutionController(nodes, edges, inputValue);
        }
        const finalState = controller.getHistory().pop();

        // Mostrar resultado según status
        if (finalState.status === 'ACCEPTED') {
            resultEl.textContent = 'Aceptada';
            resultEl.classList.add('result-accept');
        } else if (finalState.status === 'TIMEOUT') {
            resultEl.textContent = 'Timeout';
            resultEl.classList.add('result-reject');
        } else {
            resultEl.textContent = 'Rechazado';
            resultEl.classList.add('result-reject');
        }
    }

    function runAllInputs() {
        inputTableBody.querySelectorAll('tr:not(.placeholder-row)').forEach(row => {
            simulateRun(row);
        });
    }

    // --- EVENTOS DEL MODAL ---

    const handleTableClick = (e) => {
        const target = e.target;
        const row = target.closest('tr');

        if (target.closest('.delete-row-btn')) {
            row.remove();
            if (inputTableBody.querySelectorAll('tr:not(.placeholder-row)').length === 0) {
                const placeholderRow = document.createElement('tr');
                placeholderRow.classList.add('placeholder-row');
                placeholderRow.innerHTML = `<td colspan="4">Presiona "Añadir Fila" para ingresar datos...</td>`;
                inputTableBody.appendChild(placeholderRow);
            }
        } else if (target.closest('.run-row-btn')) {
            simulateRun(row);
        }
    };

    closeModalBtn.onclick = () => modal.style.display = 'none';
    openModalBtn.onclick = () => {
        modal.style.display = 'flex';
    };

    addRowBtn.onclick = createInputRow;
    runAllBtn.onclick = runAllInputs;
    inputTableBody.addEventListener('click', handleTableClick);

    // --- LÓGICA PARA ZOOM ---
    let zoomLevel = 1;
    const baseFontSize = 14; // px
    const baseIconSize = 18; // px
    const baseInputPadding = 8; // px
    const minZoom = 0.5;
    const maxZoom = 5;
    const zoomSpeed = 0.1;

    function applyZoomToRow(row) {
        const newFontSize = baseFontSize * zoomLevel;
        const newIconSize = baseIconSize * zoomLevel;
        const newPadding = baseInputPadding * zoomLevel;

        // Inputs
        const input = row.querySelector('input[type="text"]');
        if (input) {
            input.style.fontSize = `${newFontSize}px`;
            input.style.padding = `${newPadding}px`;
        }

        // Otras celdas de texto
        const textCells = row.querySelectorAll('.result-cell');
        textCells.forEach(cell => {
            cell.style.fontSize = `${newFontSize}px`;
        });

        // Iconos
        const icons = row.querySelectorAll('.icon-button svg');
        icons.forEach(icon => {
            icon.style.width = `${newIconSize}px`;
            icon.style.height = `${newIconSize}px`;
        });
    }

    function applyZoom(newZoomLevel) {
        // Limitar el nivel de zoom
        zoomLevel = Math.max(minZoom, Math.min(maxZoom, newZoomLevel));

        // Aplicar a todas las filas del body
        const rows = inputTableBody.querySelectorAll('tr');
        rows.forEach(row => applyZoomToRow(row));
    }

    modal.addEventListener('wheel', (e) => {
        // Hacer zoom solo cuando la tecla Ctrl está presionada
        if (e.ctrlKey) {
            e.preventDefault(); // Evita el scroll de la página
            // Determinar la dirección del zoom
            const delta = e.deltaY > 0 ? -1 : 1;
            applyZoom(zoomLevel + delta * zoomSpeed);
        }
        e.stopPropagation();
    });

    // Listener para zoom con teclado (+ y -)
    document.addEventListener('keydown', (e) => {
        // Solo actuar si el modal está visible
        if (modal.style.display !== 'flex') return;

        // Zoom In con '+'
        if (e.key === '+' || e.key === '=') {
            e.preventDefault();
            applyZoom(zoomLevel + zoomSpeed);
        }
        // Zoom Out con '-'
        else if (e.key === '-') {
            e.preventDefault();
            applyZoom(zoomLevel - zoomSpeed);
        }
        e.stopPropagation();
    });

    // --- LÓGICA PARA REDIMENSIONAR COLUMNAS ---

    const headers = inputTable.querySelectorAll('th');
    const minWidth = 60;
    let headerBeingResized;

    headers.forEach((header, index) => {
        // Solo añadir el tirador a las columnas que no sean la última
        if (index < headers.length - 1) {
            const resizeHandle = document.createElement('div');
            resizeHandle.classList.add('resize-handle');
            header.appendChild(resizeHandle);

            resizeHandle.addEventListener('mousedown', (e) => {
                headerBeingResized = header;

                // Find the next VISIBLE header to be the resize partner
                let nextVisibleHeader = header.nextElementSibling;
                while (nextVisibleHeader && nextVisibleHeader.offsetParent === null) {
                    nextVisibleHeader = nextVisibleHeader.nextElementSibling;
                }

                // If no visible header is found, we can't resize.
                if (!nextVisibleHeader) return;

                nextHeader = nextVisibleHeader;

                startX = e.pageX;
                startWidth = headerBeingResized.offsetWidth;
                nextStartWidth = nextHeader.offsetWidth;

                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
                e.preventDefault();
            });
        }
    });

    function onMouseMove(e) {
        if (!headerBeingResized) return;

        const deltaX = e.pageX - startX;

        const newWidth = startWidth + deltaX;
        const newNextWidth = nextStartWidth - deltaX;

        // Evitar que las columnas sean demasiado pequeñas
        if (newWidth > minWidth && newNextWidth > minWidth) {
            headerBeingResized.style.width = newWidth + 'px';
            nextHeader.style.width = newNextWidth + 'px';
        }
    }

    function onMouseUp() {
        headerBeingResized = null;
        nextHeader = null;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    }
});