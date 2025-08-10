const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

function redrawCanvas() {
    if (!ctx) return;

    const isDarkMode = document.body.classList.contains('dark');
    const currentTheme = isDarkMode ? colorPalette.dark : colorPalette.light;

    edgeDrawCounts = {};
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    // genera un paneo
    ctx.translate(panX, panY);
    // Aplica el zoom (escalado)
    ctx.scale(scale, scale);

    edges.forEach(edge => {
        drawEdge(ctx, edge, nodes, edgeDrawCounts, selectedEdgeIds, currentTheme);
    });

    // Llama a la función de su archivo correspondiente
    nodes.forEach(node => {
        drawNode(ctx, node, selectedNodeIds, currentTheme);
    });

    drawSelectionBox(ctx);

    // Dibujar líneas de reasignación si está activo el modo
    if (edgeReassignmentState.isActive) {
        drawReassignmentLines(ctx, currentTheme);
    }

    ctx.restore();
}

function drawSelectionBox(ctx) {
    if (!isSelecting) return;

    const isDarkMode = document.body.classList.contains('dark');
    const theme = isDarkMode ? colorPalette.dark : colorPalette.light;

    const startX = selectionStart.x;
    const startY = selectionStart.y;
    const width = selectionEnd.x - startX;
    const height = selectionEnd.y - startY;

    ctx.save();

    // Relleno semi-transparente
    ctx.fillStyle = theme.selectionBoxFill;
    ctx.strokeStyle = theme.selectionBoxStroke;
    ctx.globalAlpha = 0.2;

    // Borde sólido
    ctx.lineWidth = 1 / scale; // Mantiene el grosor del borde consistente con el zoom
    ctx.globalAlpha = 1.0;
    ctx.fillRect(startX, startY, width, height);

    ctx.strokeRect(startX, startY, width, height);

    ctx.restore();
}


