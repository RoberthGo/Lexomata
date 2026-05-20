export function drawNode(ctx, node, selectedNodeIds, theme) {
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
    ctx.fillStyle = theme.nodeFill || '#f0f0f0';
    ctx.fill();
    ctx.lineWidth = selectedNodeIds.includes(node.id) ? 3 : 2;
    ctx.strokeStyle = selectedNodeIds.includes(node.id) ? theme.selectedNode || '#4a90e2' : theme.nodeStroke || '#333';
    ctx.stroke();

    if (node.IsStart) {
        ctx.beginPath();
        ctx.moveTo(node.x - node.radius - 20, node.y);
        ctx.lineTo(node.x - node.radius, node.y);
        ctx.lineTo(node.x - node.radius - 10, node.y - 10);
        ctx.moveTo(node.x - node.radius, node.y);
        ctx.lineTo(node.x - node.radius - 10, node.y + 10);
        ctx.stroke();
    }

    if (node.IsEnd) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius - 5, 0, 2 * Math.PI);
        ctx.stroke();
    }

    ctx.fillStyle = theme.nodeText || '#000';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(node.label, node.x, node.y);
}
