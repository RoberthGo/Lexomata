function drawEdge(ctx, edge, nodes, selectedEdgeId) {
    const fromNode = nodes.find(n => n.id === edge.from);
    const toNode = nodes.find(n => n.id === edge.to);
    if (!fromNode || !toNode) return;
    
    // Comprueba si esta arista es la seleccionada
    const isSelected = (edge.id === selectedEdgeId);

    // Dibuja la línea
    ctx.beginPath();
    ctx.moveTo(fromNode.x, fromNode.y);
    ctx.lineTo(toNode.x, toNode.y);
    
    // Cambia el estilo si está seleccionada
    ctx.strokeStyle = isSelected ? '#D62828' : '#000000'; // Rojo si está seleccionada
    ctx.lineWidth = isSelected ? 3 : 2; // Más gruesa si está seleccionada
    ctx.stroke();

    // Dibuja la etiqueta
    const midX = (fromNode.x + toNode.x) / 2;
    const midY = (fromNode.y + toNode.y) / 2;
    ctx.fillStyle = isSelected ? '#D62828' : '#000000'; // También cambia el color del texto
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(edge.label, midX, midY - 10);
}