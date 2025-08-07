const exportModal = document.getElementById('exportModal');

function openExportModal() {
    if (exportModal) {
        // Actualiza el campo del nombre del archivo con el nombre del proyecto actual
        document.getElementById('exportFilename').value = projectName;
        exportModal.style.display = 'flex';
        setTimeout(updateExportPreview, 50);
    }
}

function closeExportModal() {
    if (exportModal) {
        exportModal.style.display = 'none';
    }
}


/**
 * Actualiza la imagen de previsualización en el modal de exportación.
 * Reutiliza la lógica de exportImage pero en lugar de descargar,
 * muestra el resultado en una etiqueta <img>.
 */
function updateExportPreview() {
    const previewImage = document.getElementById('exportPreviewImage');
    if (!previewImage) return;

    // 1. Obtener opciones del modal
    const format = document.getElementById('exportFormat').value;
    const themeKey = document.getElementById('exportTheme').value;
    const exportArea = document.querySelector('input[name="exportArea"]:checked').value;
    // Usamos un ancho fijo para la previsualización para que sea rápida
    const previewWidth = 600;

    // 2. Crear un canvas temporal para dibujar
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');

    // 3. Calcular escala y paneo (lógica idéntica a exportImage)
    let renderPanX, renderPanY, renderScale;

    if (exportArea === 'current') {
        const aspectRatio = canvas.height / canvas.width;
        const previewHeight = previewWidth * aspectRatio;
        tempCanvas.width = previewWidth;
        tempCanvas.height = previewHeight;

        const scaleFactor = previewWidth / canvas.width;
        renderScale = scale * scaleFactor;
        renderPanX = panX * scaleFactor;
        renderPanY = panY * scaleFactor;
    } else { // 'all'
        const padding = 50;
        const bounds = calculateContentBoundingBox();
        const contentWidth = (bounds.maxX - bounds.minX) + (padding * 2);
        const contentHeight = (bounds.maxY - bounds.minY) + (padding * 2);

        const contentAspectRatio = contentHeight > 0 && contentWidth > 0 ? contentHeight / contentWidth : 1;
        const previewHeight = previewWidth * contentAspectRatio;
        tempCanvas.width = previewWidth;
        tempCanvas.height = previewHeight;

        renderScale = contentWidth > 0 ? previewWidth / contentWidth : 1;
        renderPanX = (-bounds.minX + padding) * renderScale;
        renderPanY = (-bounds.minY + padding) * renderScale;
    }

    // 4. Dibujar el autómata en el canvas temporal
    let theme;
    if (themeKey !== 'transparent') {
        theme = colorPalette[themeKey];
        tempCtx.fillStyle = theme.background;
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    } else {
        theme = colorPalette.light; // Usar colores claros para la previsualización transparente
    }

    tempCtx.save();
    tempCtx.translate(renderPanX, renderPanY);
    tempCtx.scale(renderScale, renderScale);

    let tempEdgeDrawCounts = {};
    // Dibujamos sin mostrar elementos seleccionados en la previsualización
    edges.forEach(edge => drawEdge(tempCtx, edge, nodes, tempEdgeDrawCounts, [], theme));
    nodes.forEach(node => drawNode(tempCtx, node, [], theme));
    tempCtx.restore();

    // 5. Asignar el resultado a la imagen de previsualización
    previewImage.src = tempCanvas.toDataURL(format, 0.9);
}



// Listeners para actualizar la previsualización en tiempo real
document.getElementById('exportFormat').addEventListener('change', updateExportPreview);
document.getElementById('exportResolution').addEventListener('change', updateExportPreview);
document.getElementById('exportTheme').addEventListener('change', updateExportPreview);

document.querySelectorAll('input[name="exportArea"]').forEach(radio => {
    radio.addEventListener('change', updateExportPreview);
});