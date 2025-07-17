function drawEdge(x1, y1, x2, y2) {
    ctx.save();
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    const centerX = (x1 + x2) / 2;
    const centerY = (y1 + y2) / 2;
    const text = "Edge"; 
    ctx.font = "16px Arial";
    ctx.fillStyle = "#222";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(text, centerX, centerY - 8); 
}