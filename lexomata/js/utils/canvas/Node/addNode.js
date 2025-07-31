function createState(x, y, nodes, redrawCanvasCallback) {
    const newNode = {
        id: nodeCounter,
        label: 'q' + nodeCounter++,
        x: x,
        y: y,
        radius: 30,
        note: ""
    };

    nodes.push(newNode);
    redrawCanvasCallback();
    saveState();
}