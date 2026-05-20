export function drawEdgeTuring(ctx, edge, nodes, edgeDrawCounts, selectedEdgeIds, theme) {
    const fromNode = nodes.find(n => n.id === edge.from);
    const toNode = nodes.find(n => n.id === edge.to);
    if (!fromNode || !toNode) return;

    ctx.beginPath();
    ctx.moveTo(fromNode.x, fromNode.y);
    ctx.lineTo(toNode.x, toNode.y);
    ctx.strokeStyle = selectedEdgeIds.includes(edge.id) ? theme.selectedEdge || '#4a90e2' : theme.edgeStroke || '#333';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Label logic placeholder for brevity
    if (edge.labels && edge.labels.length > 0) {
        const midX = (fromNode.x + toNode.x) / 2;
        const midY = (fromNode.y + toNode.y) / 2;
        ctx.fillStyle = theme.edgeText || '#000';
        ctx.font = '10px Arial';
        const labelText = edge.labels.map(l => `${l.read};${l.write},${l.direction}`).join(' | ');
        ctx.fillText(labelText, midX, midY - 10);
    }
}
