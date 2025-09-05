function drawNode(ctx, node, selectedNodeIds,theme) {
    const isSelected = selectedNodeIds.includes(node.id);
    const fontSize = 16;
    const lineWidth = (isSelected ? 4 : 2);

    ctx.beginPath();
    ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
    // Usa un estilo diferente si el nodo está seleccionado
    ctx.fillStyle = isSelected ? theme.selectedNodeFill : theme.nodeFill;
    ctx.fill();

    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = isSelected ? theme.selectedNodeStroke : theme.nodeStroke;
    ctx.stroke();

    // Dibuja la etiqueta del nodo
    ctx.fillStyle = isSelected ? theme.selectedNodeText : theme.nodeText;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${fontSize}px Arial`;

    ctx.fillText(node.label, node.x, node.y);
    if (node.IsStart) {
        // Draw arrow at the left side of the node
        const arrowLength = 10;
        const arrowWidth = 20;
        const startX = node.x - node.radius - arrowLength;
        // Calculate the triangle (arrow) pointing towards the node
        // The triangle will be placed to the left of the node, pointing right
        const startY = node.y;
        const tipX = node.x - node.radius; // tip of the triangle (touching the node)
        const tipY = node.y;
        const baseX = tipX - arrowLength; // base of the triangle (farther left)
        const baseY1 = tipY - arrowWidth / 2;
        const baseY2 = tipY + arrowWidth / 2;
        ctx.beginPath();
        ctx.moveTo(tipX, tipY); // tip (points to node)
        ctx.lineTo(baseX, baseY1); // upper base
        ctx.lineTo(baseX, baseY2); // lower base
        ctx.closePath();
        ctx.fillStyle = theme.nodeStroke;
        ctx.fill();
    }
    if (node.IsEnd) {
        const endCircleRadius = node.radius * 0.8;
        ctx.beginPath();
        ctx.arc(node.x, node.y, endCircleRadius, 0, 2 * Math.PI);
        ctx.strokeStyle = theme.nodeStroke;
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}