function createState(event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    console.log("x: " + x + "y: " + y);
    drawNode(x, y);
    states[states.length] = new State("q" + states.length.toString(), x, y);
}

//canvas.addEventListener('click', createState);