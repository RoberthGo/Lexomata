const exportModal = document.getElementById('exportModal');

function openExportModal() {
    if (exportModal) {
        document.getElementById('exportFilename').value = projectName;
        exportModal.style.display = 'flex';
        updateExportPreview(); // Genera la primera previsualización
    }
}

function closeExportModal() {
    if (exportModal) {
        exportModal.style.display = 'none';
    }
}


/**
 * Actualiza la vista previa llamando al renderizador maestro con una
 * resolución baja para que sea rápido.
 */
function updateExportPreview() {
    const previewImage = document.getElementById('exportPreviewImage');
    if (!previewImage) return;

    const PREVIEW_RESOLUTION = 1024; // Resolución fija y ligera para la preview

    // Generamos la imagen combinada en baja resolución
    const previewCanvas = generateCombinedImage(PREVIEW_RESOLUTION);

    // Mostramos el resultado en el <img>
    previewImage.src = previewCanvas.toDataURL('image/png', 0.9);
}


/**
 * Función Maestra de Renderizado: Genera la imagen combinada (autómata + tabla)
 * en un tamaño específico.
 * @param {number} targetWidth - El ancho base para la imagen del autómata.
 * @returns {HTMLCanvasElement} - El canvas final con la imagen combinada.
 */
function generateCombinedImage(targetWidth) {
    // 1. Lee todas las opciones del modal, ya que afectan el renderizado
    const themeKey = document.getElementById('exportTheme').value;
    const exportArea = document.querySelector('input[name="exportArea"]:checked').value;
    const shouldAttachResults = document.getElementById('attachResultsCheckbox').checked;
    const charLimits = {
        input: parseInt(document.getElementById('inputCharLimit').value) || 20,
        result: parseInt(document.getElementById('resultCharLimit').value) || 15,
    };
    let theme = colorPalette[themeKey] || colorPalette.light;

    // 2. Dibuja el canvas del autómata al tamaño solicitado (targetWidth)
    const automataCanvas = document.createElement('canvas');
    const automataCtx = automataCanvas.getContext('2d');

    // (La lógica de dibujado del autómata es la misma de siempre, pero usa targetWidth)
    let renderPanX, renderPanY, renderScale;
    if (exportArea === 'current') {
        const aspectRatio = canvas.height / canvas.width;
        automataCanvas.width = targetWidth;
        automataCanvas.height = targetWidth * aspectRatio > 0 ? targetWidth * aspectRatio : targetWidth;
        const scaleFactor = targetWidth / canvas.width;
        renderScale = scale * scaleFactor;
        renderPanX = panX * scaleFactor;
        renderPanY = panY * scaleFactor;
    } else {
        const padding = 50;
        const bounds = calculateContentBoundingBox();
        const contentWidth = (bounds.maxX - bounds.minX) + (padding * 2);
        const contentHeight = (bounds.maxY - bounds.minY) + (padding * 2);
        const contentAspectRatio = contentHeight > 0 && contentWidth > 0 ? contentHeight / contentWidth : 1;
        automataCanvas.width = targetWidth;
        automataCanvas.height = targetWidth * contentAspectRatio;
        renderScale = contentWidth > 0 ? targetWidth / contentWidth : 1;
        renderPanX = (-bounds.minX + padding) * renderScale;
        renderPanY = (-bounds.minY + padding) * renderScale;
    }
    if (themeKey !== 'transparent') {
        automataCtx.fillStyle = theme.background;
        automataCtx.fillRect(0, 0, automataCanvas.width, automataCanvas.height);
    }
    automataCtx.save();
    automataCtx.translate(renderPanX, renderPanY);
    automataCtx.scale(renderScale, renderScale);
    let tempEdgeDrawCounts = {};
    edges.forEach(edge => drawEdge(automataCtx, edge, nodes, tempEdgeDrawCounts, [], theme));
    nodes.forEach(node => drawNode(automataCtx, node, [], theme));
    automataCtx.restore();

    // Si no se adjuntan resultados, simplemente devolvemos el canvas del autómata
    if (!shouldAttachResults) {
        return automataCanvas;
    }

    // 3. Si se adjuntan, calcula el ancho de la tabla y dibújala
    const dummyCtx = document.createElement('canvas').getContext('2d');
    const calculatedTableWidth = drawResultsToCanvasForExport(dummyCtx, 1000, 1000, theme, tableExportZoom, charLimits);

    // Si la tabla está vacía, devuelve solo el autómata
    if (calculatedTableWidth <= 0) {
        return automataCanvas;
    }

    const tableCanvas = document.createElement('canvas');
    tableCanvas.width = calculatedTableWidth;
    tableCanvas.height = automataCanvas.height;
    const tableCtx = tableCanvas.getContext('2d');
    drawResultsToCanvasForExport(tableCtx, tableCanvas.width, tableCanvas.height, theme, tableExportZoom, charLimits);

    // 4. Combina ambos en un canvas final
    const finalCanvas = document.createElement('canvas');
    const finalCtx = finalCanvas.getContext('2d');
    finalCanvas.width = automataCanvas.width + tableCanvas.width;
    finalCanvas.height = automataCanvas.height;

    finalCtx.drawImage(automataCanvas, 0, 0);
    finalCtx.drawImage(tableCanvas, automataCanvas.width, 0);

    finalCtx.strokeStyle = theme.edgeLine || 'black';
    finalCtx.lineWidth = 2;
    finalCtx.beginPath();
    finalCtx.moveTo(automataCanvas.width, 0);
    finalCtx.lineTo(automataCanvas.width, finalCanvas.height);
    finalCtx.stroke();

    // 5. Devuelve el canvas final y combinado
    return finalCanvas;
}


/**
 * Dibuja la tabla para la exportación y DEVUELVE el ancho calculado.
 */
function drawResultsToCanvasForExport(ctx, width, height, theme, zoom, charLimits) {
    // --- Lógica de tamaño y estilo ---
    const scaleFactor = (width / 400) * zoom;
    const FONT_SIZE = 16 * scaleFactor;
    // ... (resto de las constantes de estilo)
    const PADDING = 20 * scaleFactor;
    const ROW_HEIGHT = 35 * scaleFactor;
    const HEADER_FILL = theme.nodeFill;
    const TEXT_COLOR = theme.nodeText;
    const BORDER_COLOR = theme.edgeLine;
    const REJECT_COLOR = '#dc3545';
    const ACCEPT_COLOR = '#28a745';

    ctx.save();
    if (theme.background) {
        ctx.fillStyle = theme.background;
        ctx.fillRect(0, 0, width, height);
    }

    ctx.font = `bold ${FONT_SIZE}px Arial`;

    // --- Obtener y truncar datos usando los nuevos límites ---
    const multiRunTable = document.getElementById('inputTable');
    const rows = Array.from(multiRunTable.querySelectorAll('tbody tr:not(.placeholder-row)'));
    const data = rows.filter(row => {
        const inputEl = row.querySelector('input[type="text"]');
        return inputEl && inputEl.value.trim() !== '';
    }).map(row => {
        let inputText = row.querySelector('input[type="text"]')?.value || 'N/A';
        if (inputText.length > charLimits.input) {
            inputText = inputText.substring(0, charLimits.input) + '...';
        }
        let resultText = row.querySelector('.result-cell')?.textContent.trim() || 'N/A';
        if (resultText.length > charLimits.result) {
            resultText = resultText.substring(0, charLimits.result) + '...';
        }
        return { input: inputText, result: resultText };
    });

    if (data.length === 0) { /* ... */ return 0; }

    // --- CÁLCULO DE ANCHO DE COLUMNA DINÁMICO ---
    let maxInputWidth = ctx.measureText("Input").width;
    data.forEach(item => {
        const textWidth = ctx.measureText(item.input).width;
        if (textWidth > maxInputWidth) maxInputWidth = textWidth;
    });

    let maxResultWidth = ctx.measureText("Result").width;
    data.forEach(item => {
        const textWidth = ctx.measureText(item.result).width;
        if (textWidth > maxResultWidth) maxResultWidth = textWidth;
    });

    const inputColWidth = maxInputWidth + 20 * scaleFactor;
    const resultColWidth = maxResultWidth + 20 * scaleFactor;
    const tableTotalWidth = inputColWidth + resultColWidth;

    // --- DIBUJAR TABLA ---
    // (La lógica de dibujo es la misma que antes, usando las variables calculadas)
    ctx.fillStyle = HEADER_FILL;
    ctx.fillRect(PADDING, PADDING, tableTotalWidth, ROW_HEIGHT);
    ctx.fillStyle = TEXT_COLOR;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText("Input", PADDING + 10 * scaleFactor, PADDING + ROW_HEIGHT / 2);
    ctx.fillText("Result", PADDING + inputColWidth + 10 * scaleFactor, PADDING + ROW_HEIGHT / 2);
    ctx.strokeStyle = BORDER_COLOR;
    ctx.strokeRect(PADDING, PADDING, tableTotalWidth, ROW_HEIGHT);

    ctx.font = `${FONT_SIZE}px Arial`;
    data.forEach((item, index) => {
        const y = PADDING + ROW_HEIGHT * (index + 1);
        if (y > height - (ROW_HEIGHT / 2)) return;
        ctx.fillStyle = TEXT_COLOR;
        ctx.fillText(item.input, PADDING + 10 * scaleFactor, y + ROW_HEIGHT / 2);
        ctx.fillStyle = (item.result.toLowerCase() === 'aceptado') ? ACCEPT_COLOR : REJECT_COLOR;
        ctx.fillText(item.result, PADDING + inputColWidth + 10 * scaleFactor, y + ROW_HEIGHT / 2);
        ctx.strokeRect(PADDING, y, tableTotalWidth, ROW_HEIGHT);
    });

    ctx.restore();

    // --- Devolver el ancho calculado ---
    return tableTotalWidth + PADDING * 2;
}

// Listeners para actualizar la previsualización en tiempo real
document.getElementById('noFormat').addEventListener('change', updateExportPreview);
document.getElementById('exportResolution').addEventListener('change', updateExportPreview);
document.getElementById('exportTheme').addEventListener('change', updateExportPreview);
document.querySelectorAll('input[name="exportArea"]').forEach(radio => {
    radio.addEventListener('change', updateExportPreview);
});