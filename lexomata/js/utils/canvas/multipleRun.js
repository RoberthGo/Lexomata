document.addEventListener('DOMContentLoaded', function() {

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
        const newRow = document.createElement('tr');
        const inputCell = document.createElement('td');
        const outputCell = document.createElement('td');
        const resultCell = document.createElement('td');
        const actionsCell = document.createElement('td');

        const inputField = document.createElement('input');
        inputField.type = 'text';
        inputCell.appendChild(inputField);
        outputCell.classList.add('output-cell');
        resultCell.classList.add('result-cell');
        actionsCell.classList.add('row-actions');
        
        const runBtn = document.createElement('button');
        runBtn.classList.add('icon-button');
        runBtn.innerHTML = runIconSVG;
        //runBtn.title = "Ejecutar";
        runBtn.addEventListener('click', () => simulateRun(inputField, outputCell, resultCell));
        
        const deleteBtn = document.createElement('button');
        deleteBtn.classList.add('icon-button');
        deleteBtn.innerHTML = deleteIconSVG;
        //deleteBtn.title = "Borrar";
        deleteBtn.addEventListener('click', () => {
            newRow.remove();
            if (inputTableBody.querySelectorAll('tr:not(.placeholder-row)').length === 0) {
                const placeholderRow = document.createElement('tr');
                placeholderRow.classList.add('placeholder-row');
                const placeholderCell = document.createElement('td');
                placeholderCell.colSpan = 4;
                placeholderCell.textContent = 'Presiona "Añadir Fila" para ingresar datos...';
                placeholderRow.appendChild(placeholderCell);
                inputTableBody.appendChild(placeholderRow);
            }
        });

        actionsCell.appendChild(runBtn);
        actionsCell.appendChild(deleteBtn);

        newRow.appendChild(inputCell);
        newRow.appendChild(outputCell);
        newRow.appendChild(resultCell);
        newRow.appendChild(actionsCell);

        const placeholder = inputTableBody.querySelector('.placeholder-row');
        if (placeholder) placeholder.remove();

        inputTableBody.appendChild(newRow);
    }

    function simulateRun(inputEl, outputEl, resultEl) {
        const inputValue = inputEl.value;
        const outputValue = inputValue.split('').reverse().join('');
        outputEl.textContent = outputValue;
        
        resultEl.classList.remove('result-accept', 'result-reject');
        if (inputValue.toLowerCase().includes('a')) {
            resultEl.textContent = 'Aceptado';
            resultEl.classList.add('result-accept');
        } else {
            resultEl.textContent = 'Rechazado';
            resultEl.classList.add('result-reject');
        }
    }

    function runAllInputs() {
        inputTableBody.querySelectorAll('tr:not(.placeholder-row)').forEach(row => {
            const cells = row.querySelectorAll('td');
            const inputElement = cells[0].querySelector('input[type="text"]');
            const outputCellElement = cells[1];
            const resultCellElement = cells[2];
            simulateRun(inputElement, outputCellElement, resultCellElement);
        });
    }

    // --- EVENTOS DEL MODAL ---
    openModalBtn.onclick = () => modal.style.display = 'flex';
    closeModalBtn.onclick = () => modal.style.display = 'none';
    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    };
    addRowBtn.onclick = createInputRow;
    runAllBtn.onclick = runAllInputs;

    // --- LÓGICA PARA REDIMENSIONAR COLUMNAS ---
    const headers = inputTable.querySelectorAll('th');
    const minWidth = 60; // Ancho mínimo de una columna en píxeles
    let headerBeingResized;
    let nextHeader;
    let startX;
    let startWidth;
    let nextStartWidth;

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