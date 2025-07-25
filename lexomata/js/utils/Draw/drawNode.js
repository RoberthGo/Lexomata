function drawNode(ctx, node, selectedNodeId) {
    const isSelected = (node.id === selectedNodeId);
    const fontSize = 16;
    const lineWidth = (isSelected ? 4 : 2);

    ctx.beginPath();
    ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);

    // Usa un estilo diferente si el nodo está seleccionado
    ctx.fillStyle = isSelected ? '#FFD700' : '#add8e6'; // Amarillo si está seleccionado
    ctx.fill();

    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = isSelected ? '#FFA500' : '#000000'; // Borde naranja
    ctx.stroke();

    // Dibuja la etiqueta del nodo
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '16px Arial';
    ctx.font = `${fontSize}px Arial`;
    ctx.fillText(node.label, node.x, node.y);
}