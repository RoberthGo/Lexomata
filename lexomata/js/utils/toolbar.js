function changeTool(clickedButton, tool) {
    const toolButtons = document.querySelectorAll('.tool-button');

    toolButtons.forEach(button => {
        button.classList.remove('active');
    });

    clickedButton.classList.add('active');
    currentTool = tool;
}


const toolMap = {
    's': { tool: 'select', buttonId: 'select' },
    'a': { tool: 'addNode', buttonId: 'node' },
    't': { tool: 'addEdge', buttonId: 'edge' },
    'd': { tool: 'delete', buttonId: 'delete' },
    'i': { tool: 'setStart', buttonId: 'initial-state' },
    'f': { tool: 'setEnd', buttonId: 'final-state' }
};

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
            handleDeleteClick(clickedObject, x, y, nodes, edges, redrawCanvas, isClickOnEdge);
            break;
        case 'setStart':
            if (clickedObject.type === 'node') {
                if (clickedObject.object.IsStart)
                    clickedObject.object.IsStart = false;
                else {
                    nodes.forEach(node => {
                        node.IsStart = false;
                    });
                    clickedObject.object.IsStart = true;
                }
                redrawCanvas();
                saveState();
            }
            break;
        case 'setEnd':
            if (clickedObject.type === 'node') {
                if (clickedObject.object.IsEnd)
                    clickedObject.object.IsEnd = false;
                else
                    clickedObject.object.IsEnd = true;
                redrawCanvas();
                saveState();
            }
            break;
        case 'select':
        default:
            break;
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const toolbarToggleButton = document.getElementById('toolbarToggleButton');
    const toolbar = document.querySelector('.toolbar');

    if (toolbarToggleButton && toolbar) {
        toolbarToggleButton.addEventListener('click', () => {
            toolbar.classList.toggle('collapsed');
        });
    }
});