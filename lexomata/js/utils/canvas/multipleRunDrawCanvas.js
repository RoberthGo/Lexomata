// --- LÓGICA PARA LA PREVISUALIZACIÓN DE RESULTADOS DE MULTI-RUN ---

// Referencias a los elementos del DOM
const attachResultsCheckbox = document.getElementById('attachResultsCheckbox');
const resultsPreviewContainer = document.getElementById('resultsPreviewContainer');
const automataPreviewContainer = document.querySelector('.automata-preview-container');
const zoomControlsContainer = document.getElementById('zoomControlsContainer');

// Configuración del canvas de resultados
let tableExportZoom = 1;
let resultsZoom = 1;
let resultsPanX = 0;
let resultsPanY = 0;
let isPanningResults = false;
let lastMouseX, lastMouseY;

// Referencias a los botones de zoom
const zoomInBtn = document.getElementById('zoomInBtn');
const zoomOutBtn = document.getElementById('zoomOutBtn');
const zoomResetBtn = document.getElementById('zoomResetBtn');
const zoomLevelDisplay = document.getElementById('zoomLevelDisplay');

/**
 * Muestra u oculta el panel de previsualización de resultados
 */
function toggleResultsPreview() {
    zoomControlsContainer.style.display = attachResultsCheckbox.checked ? 'flex' : 'none';
    updateExportPreview(); // Siempre actualizamos la preview al cambiar el check
}

/**
 * Actualiza la variable de zoom y la UI, luego refresca la previsualización.
 */
function updateTableZoom(newZoom) {
    tableExportZoom = Math.max(0.2, Math.min(newZoom, 2)); // Limitar zoom
    zoomLevelDisplay.textContent = `${Math.round(tableExportZoom * 100)}%`;
    updateExportPreview(); // Refrescar la preview para ver el cambio
}

/**
 * Dibuja la tabla de resultados en el canvas de la VISTA PREVIA.
 * El zoom ahora afecta el tamaño del texto y la tabla se ajusta dinámicamente.
 */
function drawResultsToCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const rect = resultsCanvas.getBoundingClientRect();
    resultsCanvas.width = rect.width * dpr;
    resultsCanvas.height = rect.height * dpr;
    resultsCtx.scale(dpr, dpr);

    // --- LÓGICA DE TAMAÑO DINÁMICO ---
    // El zoom ahora actúa como un multiplicador sobre los tamaños base
    const BASE_FONT_SIZE = 14;
    const BASE_ROW_HEIGHT = 30;
    const BASE_PADDING = 15;
    const MAX_INPUT_CHARS = 20;

    const currentFontSize = BASE_FONT_SIZE * resultsZoom;
    const currentRowHeight = BASE_ROW_HEIGHT * resultsZoom;
    const currentPadding = BASE_PADDING * resultsZoom;

    // --- Estilos (se mantienen) ---
    const HEADER_FILL = '#f2f2f2';
    const TEXT_COLOR = '#333';
    const BORDER_COLOR = '#ddd';
    const REJECT_COLOR = '#dc3545';
    const ACCEPT_COLOR = '#28a745';

    resultsCtx.clearRect(0, 0, resultsCanvas.width, resultsCanvas.height);
    resultsCtx.save();

    // YA NO USAMOS resultsCtx.scale() para el zoom aquí

    resultsCtx.font = `bold ${currentFontSize}px Arial`;

    const multiRunTable = document.getElementById('inputTable');
    if (!multiRunTable) { /* ...código de error... */ return; }

    const rows = Array.from(multiRunTable.querySelectorAll('tbody tr:not(.placeholder-row)'));
    const data = rows.filter(row => {
        const inputEl = row.querySelector('input[type="text"]');
        return inputEl && inputEl.value.trim() !== '';
    }).map(row => {
        const inputEl = row.querySelector('input[type="text"]');
        let inputText = inputEl ? inputEl.value : 'N/A';
        // Aplicar límite de caracteres
        if (inputText.length > MAX_INPUT_CHARS) {
            inputText = inputText.substring(0, MAX_INPUT_CHARS) + '...';
        }
        return {
            input: inputText,
            result: row.querySelector('.result-cell')?.textContent.trim() || 'N/A'
        };
    });

    if (data.length === 0) { /* ...código de no hay datos... */ return; }

    // --- CÁLCULO DE ANCHO DE COLUMNA DINÁMICO ---
    let maxInputWidth = resultsCtx.measureText("Input").width; // Iniciar con el ancho del header
    data.forEach(item => {
        const width = resultsCtx.measureText(item.input).width;
        if (width > maxInputWidth) {
            maxInputWidth = width;
        }
    });

    const inputColWidth = maxInputWidth + 20 * resultsZoom; // Ancho del texto + padding
    const resultColWidth = resultsCtx.measureText("Rechazado").width + 20 * resultsZoom; // Ancho fijo para resultado

    // --- DIBUJAR TABLA ---
    resultsCtx.fillStyle = HEADER_FILL;
    resultsCtx.fillRect(currentPadding, currentPadding, inputColWidth + resultColWidth, currentRowHeight);

    resultsCtx.fillStyle = TEXT_COLOR;
    resultsCtx.textAlign = 'left';
    resultsCtx.textBaseline = 'middle';
    resultsCtx.fillText("Input", currentPadding + 10, currentPadding + currentRowHeight / 2);
    resultsCtx.fillText("Result", currentPadding + inputColWidth + 10, currentPadding + currentRowHeight / 2);

    resultsCtx.strokeStyle = BORDER_COLOR;
    resultsCtx.strokeRect(currentPadding, currentPadding, inputColWidth + resultColWidth, currentRowHeight);

    resultsCtx.font = `${currentFontSize}px Arial`;
    data.forEach((item, index) => {
        const y = currentPadding + currentRowHeight * (index + 1);

        resultsCtx.fillStyle = TEXT_COLOR;
        resultsCtx.fillText(item.input, currentPadding + 10, y + currentRowHeight / 2);

        resultsCtx.fillStyle = (item.result.toLowerCase() === 'aceptado') ? ACCEPT_COLOR : REJECT_COLOR;
        resultsCtx.fillText(item.result, currentPadding + inputColWidth + 10, y + currentRowHeight / 2);

        resultsCtx.strokeRect(currentPadding, y, inputColWidth + resultColWidth, currentRowHeight);
    });

    resultsCtx.restore();
}

zoomInBtn.addEventListener('click', () => updateTableZoom(tableExportZoom + 0.1));
zoomOutBtn.addEventListener('click', () => updateTableZoom(tableExportZoom - 0.1));
zoomResetBtn.addEventListener('click', () => updateTableZoom(1));

// Finalmente, agrega el listener principal al checkbox
attachResultsCheckbox.addEventListener('change', toggleResultsPreview);