function handleEdgeCreationClick(x, y, nodes, redrawCanvasCallback, state) {
    // 1. Busca si se hizo clic en un nodo
    const clickedNode = nodes.find(node => {
        const distance = Math.sqrt((x - node.x) ** 2 + (y - node.y) ** 2);
        return distance < node.radius;
    });

    // Si no se hizo clic en ningún nodo, cancela la operación
    if (!clickedNode) {
        state.firstNode = null;
        console.log("Creación de arista cancelada.");
        return;
    }
    // 2. Comprueba si es el primer o segundo clic
    if (state.firstNode === null) {
        // Es el primer clic: guarda el nodo de inicio
        state.firstNode = clickedNode;
        console.log("Nodo de inicio seleccionado:", clickedNode.label);
        // Aquí se podría añadir un resaltado visual para el primer nodo si se quisiera
    }else {
        // Es el segundo clic: obtenemos los dos nodos
        const fromNode = state.firstNode;
        const toNode = clickedNode;

        let params = new URLSearchParams(location.search);
        var mode = params.get('mode');

        if(mode == "automata") {
            // Llama a la función del modal para pedir la etiqueta
            showEdgeLabelModal(fromNode, toNode);
        } else {
            showTuringEdgeModal(fromNode, toNode);
        }

        // Limpia el estado, listo para la próxima arista
        state.firstNode = null;
    }
}