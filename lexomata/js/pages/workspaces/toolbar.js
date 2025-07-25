function changeTool(clickedButton, tool) {
    const toolButtons = document.querySelectorAll('.tool-button');

    toolButtons.forEach(button => {
        button.classList.remove('active');
    });

    clickedButton.classList.add('active');

    currentTool = tool;
}

// Tools with click
canvas.addEventListener('click', (event) => {
    const { x, y } = getCanvasPoint(event.clientX, event.clientY);
    const clickedObject = getObjectAt(x, y);

    switch (currentTool) {
        case 'addNode':
            createState(x, y, nodes, redrawCanvas);
            break;
        case 'addEdge':
            handleEdgeCreationClick(x, y, nodes, redrawCanvas, edgeCreationState);
            break;
        case 'delete':
            handleDeleteClick(x, y, nodes, edges, redrawCanvas, isClickOnEdge);
            break;
        case 'setStart':
            if(clickedObject.type === 'node'){
                if(clickedObject.object.IsStart==true)
                    clickedObject.object.IsStart=false;
                else{
                    nodes.forEach(node => {
                        node.IsStart = false;
                    });
                    clickedObject.object.IsStart=true;
                }
                redrawCanvas();
            }
            break;
        case 'setEnd':
            if(clickedObject.type === 'node'){
                clickedObject.object.IsEnd=true;
                redrawCanvas();
            }
            break;
        default:
            if (clickedObject === null) {
                // Clic en el vacío: Deseleccionar todo
                selectedNodeId = null;
                selectedEdgeId = null;
            } else if (clickedObject.type === 'node') {
                // Clic en un nodo: Seleccionarlo
                selectedNodeId = clickedObject.object.id;
                selectedEdgeId = null; // Deseleccionar arista si se selecciona un nodo
            } else if (clickedObject.type === 'edge') {
                // Clic en una arista: Seleccionarla
                selectedEdgeId = clickedObject.object.id;
                selectedNodeId = null; // Deseleccionar nodo si se selecciona una arista
            }
            redrawCanvas();
            break;
    }
});