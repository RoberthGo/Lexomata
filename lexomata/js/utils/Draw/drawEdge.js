function drawEdge(ctx, edge, nodes, edgeDrawCounts, selectedEdgeId) {
    // Determina el tema actual
    const isDarkMode = document.body.classList.contains('dark');
    const theme = isDarkMode ? colorPalette.dark : colorPalette.light;
    
    const fromNode = nodes.find(n => n.id === edge.from);
    const toNode = nodes.find(n => n.id === edge.to);
    if (!fromNode || !toNode) return;

    const isSelected = (edge.id === selectedEdgeId);

    // Dibuja la línea
    ctx.beginPath();
    ctx.moveTo(fromNode.x, fromNode.y);
    ctx.lineTo(toNode.x, toNode.y);
    
    // Cambia el estilo si está seleccionada
    ctx.strokeStyle = isSelected ? theme.selectedEdge : theme.edgeLine;
    ctx.lineWidth = isSelected ? 3 : 2;
    ctx.stroke();

    const edgeKey = `${fromNode.id}-${toNode.id}`;
    if (!edgeDrawCounts[edgeKey]) {
        edgeDrawCounts[edgeKey] = 0;
    }
    const drawCount = edgeDrawCounts[edgeKey];
    edgeDrawCounts[edgeKey] += 1;

    // Store the drawCount on the edge for use when drawing the label
    edge._drawCount = drawCount;
    
    //console.log(`Drawing edge from ${fromNode.label} to ${toNode.label}, draw count: ${drawCount}`);
    // Dibuja la etiqueta
    const midX = (fromNode.x + toNode.x) / 2;
    const midY = (fromNode.y + toNode.y) / 2;
    ctx.fillStyle = isSelected ? theme.selectedEdge : theme.edgeText;
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(edge.label, midX, midY - (12 * (edge._drawCount + 1)));
}