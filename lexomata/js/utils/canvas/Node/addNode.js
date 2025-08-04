function createState(x, y, nodes, redrawCanvasCallback) {
    const newNode = new State(nodeCounter, 'q' + nodeCounter, x, y);
    nodeCounter++;
    nodes.push(newNode);
    redrawCanvasCallback();
    saveState();
}