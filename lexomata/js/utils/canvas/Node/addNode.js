function createState(x, y, nodes, redrawCanvasCallback) {
    // console.log("x: " + x + "y: " + y);
    const newNode = {
        id: Date.now(),
         label: 'q' + nodeCounter,
        x: x,
        y: y,
        radius: 30
    };

    nodeCounter++;
    
    nodes.push(newNode);

    redrawCanvasCallback();
}