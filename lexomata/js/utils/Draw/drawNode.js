function drawNode(x, y, text) {
    ctx.beginPath();
    let pos = getCanvasPoint(x, y);
    ctx.arc(pos.x, pos.y, NODE_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = 'lightblue';
    ctx.fill();
    ctx.strokeStyle = 'black';
    ctx.fillStyle = 'black';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, pos.x, pos.y);
    ctx.lineWidth = 2;
    ctx.stroke();
}