function drawEdge(x1, y1, x2, y2) {
    ctx.save();
    ctx.strokeStyle = '#222'; // dark color
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
}