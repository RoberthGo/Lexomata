document.addEventListener('DOMContentLoaded', function () {

    // --- ELEMENTOS DEL DOM ---
    const modal = document.getElementById('multipleRunModal');
    const openModalBtn = document.getElementById('multipleRunBtn');
    const closeModalBtn = document.querySelector('#close-button');
    const addRowBtn = document.getElementById('addRowBtn');
    const runAllBtn = document.getElementById('runAllBtn');
    const inputTable = document.getElementById('inputTable');
    const inputTableBody = inputTable.querySelector('tbody');

    // --- 2. OBTENCIÓN DEL MODO DE TRABAJO ---
    const urlParams = new URLSearchParams(window.location.search);
    const currentMode = urlParams.get('mode') || 'automata';

    // --- ICONOS SVG ---
    const runIconSVG = `<svg class="run-icon" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/></svg>`;
    const deleteIconSVG = `<svg class="delete-icon" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16"><path d="M2.5 1a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1H3v9a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4h.5a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H10a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1H2.5zm3 4a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5zM8 5a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5zm3 .5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 1 0z"/></svg>`;

    // --- Column Output Visibility --- 
    const setupColumnVisibility = () => {
        const displayStyle = (currentMode === 'automata') ? 'none' : '';
        const outputColumns = document.querySelectorAll('.output-column');
        outputColumns.forEach(col => {
            col.style.display = displayStyle;
        });
    };


    // --- LÓGICA DE LA TABLA ---
    function createInputRow() {
        const placeholder = inputTableBody.querySelector('.placeholder-row');
        if (placeholder) placeholder.remove();

        const newRow = inputTableBody.insertRow();
        newRow.innerHTML = `
            <td><input type="text" placeholder="Cadena..."></td>
            <td class="output-column"></td>
            <td class="result-cell"></td>
            <td class="row-actions">
                <button class="icon-button run-row-btn" title="Ejecutar">${runIconSVG}</button>
                <button class="icon-button delete-row-btn" title="Borrar">${deleteIconSVG}</button>
            </td>
        `;

        setupColumnVisibility();
    }


    function simulateRun(row) {
        // Asegurarse de que el autómata exista globalmente
        if (typeof nodes === 'undefined' || typeof edges === 'undefined') {
            showMessage("Error: No hay un autómata definido para ejecutar.");
            return;
        }

        const inputEl = row.querySelector('input[type="text"]');
        const outputEl = row.querySelector('.output-column');
        const resultEl = row.querySelector('.result-cell');
        const inputValue = inputEl.value;

        // Limpiar celdas
        outputEl.textContent = '';
        resultEl.textContent = '-';
        resultEl.className = 'result-cell';

        if (!inputValue) return;

        // --- LÓGICA REAL USANDO EXECUTION CONTROLLER ---
        const controller = new ExecutionController(nodes, edges, inputValue);
        const finalState = controller.getHistory().pop();

        if (finalState.status === 'ACCEPTED') {
            resultEl.textContent = 'Aceptada';
            resultEl.classList.add('result-accept');
            outputEl.textContent = inputValue;
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

    const handleTableClick = (event) => {
        const target = event.target;
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
    openModalBtn.onclick = () => modal.style.display = 'flex';

    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    };

    addRowBtn.onclick = createInputRow;
    runAllBtn.onclick = runAllInputs;
    inputTableBody.addEventListener('click', handleTableClick);

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
                nextHeader = header.nextElementSibling; // La columna de al lado

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