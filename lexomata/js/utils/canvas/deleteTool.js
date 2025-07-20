function handleDeleteClick(x, y, nodes, edges, redrawCanvasCallback, isClickOnEdgeCallback) {
    let somethingWasDeleted = false;

    for (let i = edges.length - 1; i >= 0; i--) {
        if (isClickOnEdgeCallback(x, y, edges[i], nodes)) {
            edges.splice(i, 1); 
            somethingWasDeleted = true;
            break;
        }
    }

    if (!somethingWasDeleted) {
        for (let i = nodes.length - 1; i >= 0; i--) {
            const node = nodes[i];
            const distance = Math.sqrt((x - node.x) ** 2 + (y - node.y) ** 2);

            if (distance < node.radius) {
                const nodeIdToDelete = node.id;
                
                const updatedEdges = edges.filter(edge => edge.from !== nodeIdToDelete && edge.to !== nodeIdToDelete);
                edges.length = 0;
                Array.prototype.push.apply(edges, updatedEdges);
                
                nodes.splice(i, 1);
                
                somethingWasDeleted = true;
                break;
            }
        }
    }

    if (somethingWasDeleted) {
        redrawCanvasCallback();
    }
}