function createState(x, y, nodes, redrawCanvasCallback) {
    console.log("x: " + x + "y: " + y);
    const newNode = {
        id: Date.now(),
        label: 'q' + nodes.length,
        x: x,
        y: y,
        radius: 30
    };
    
    nodes.push(newNode);

    redrawCanvasCallback();
}