function createState(event) {
    const text = "q"
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    console.log("x: " + x + "y: " + y);
    drawNode(x, y, text);
    states[states.length] = new State(text + states.length.toString(), x, y);
}

//canvas.addEventListener('click', createState);