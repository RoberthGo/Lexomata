function createState(event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    console.log("x: " + x + "y: " + y);
    drawNode(x, y);
    states[states.length] = new State("q" + states.length.toString(), x, y);
}

function drawNode(x, y) {
    ctx.beginPath();
    let pos = getCanvasPoint(x, y);
    ctx.arc(pos.x, pos.y, NODE_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = 'lightblue';
    ctx.fill();
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.stroke();
}

canvas.addEventListener('click', createState);