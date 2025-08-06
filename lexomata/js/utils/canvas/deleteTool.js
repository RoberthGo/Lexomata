function isClickOnLabel(x, y, edge, nodes) {
    // Supón que cada label tiene {text, x, y, width, height}
    if (!edge.labels) return null;
    for (let i = 0; i < edge.labels.length; i++) {
        const label = edge.labels[i];
        if (
            x >= label.x &&
            x <= label.x + label.width &&
            y >= label.y &&
            y <= label.y + label.height
        ) {
            return i; // Retorna el índice del label clickeado
        }
    }
    return null;
}

function handleDeleteClick(clickedObject, x, y, nodes, edges, redrawCanvasCallback, isClickOnEdgeCallback) {
    let somethingWasDeleted = false;
    
    if (clickedObject) {
        // Si el objeto clickeado es un label, se asume que viene
        // con dos propiedades: .edge (la arista a la que pertenece)
        // y .labelIndex (el índice dentro de edge.labels)
        if (clickedObject.type === 'label' && clickedObject.edge && clickedObject.labelIndex !== undefined) {
            clickedObject.edge.labels.splice(clickedObject.labelIndex, 1);
            somethingWasDeleted = true;

        // Si es una arista, la borramos directamente
        } else if (clickedObject.type === 'edge' && clickedObject.object) {
            const edgeIndex = edges.findIndex(edge => edge === clickedObject.object);
            if (edgeIndex !== -1) {
                edges.splice(edgeIndex, 1);
                somethingWasDeleted = true;
            }

        // Si es un nodo, se elimina el nodo y las aristas asociadas
        } else if (clickedObject.type === 'node' && clickedObject.object) {
            const nodeToDelete = clickedObject.object;
            const nodeIdToDelete = nodeToDelete.id;
            const updatedEdges = edges.filter(edge => edge.from !== nodeIdToDelete && edge.to !== nodeIdToDelete);
            edges.length = 0;
            Array.prototype.push.apply(edges, updatedEdges);

            const nodeIndex = nodes.findIndex(node => node.id === nodeIdToDelete);
            if (nodeIndex !== -1) {
                nodes.splice(nodeIndex, 1);
            }
            somethingWasDeleted = true;
        }
    }
    
    // Si no se pudo determinar el objeto por clickedObject, se hace la detección manual por hitbox.
    if (!somethingWasDeleted) {
        // Intentar borrar un label de una arista mediante coordenadas
        for (let i = edges.length - 1; i >= 0; i--) {
            const labelIndex = isClickOnLabel(x, y, edges[i], nodes);
            if (labelIndex !== null) {
                edges[i].labels.splice(labelIndex, 1);
                somethingWasDeleted = true;
                break;
            }
        }
    
        // Si no se borró ningún label, intenta borrar la arista completa
        if (!somethingWasDeleted) {
            for (let i = edges.length - 1; i >= 0; i--) {
                if (isClickOnEdgeCallback(x, y, edges[i], nodes)) {
                    edges.splice(i, 1);
                    somethingWasDeleted = true;
                    break;
                }
            }
        }
    
        // Si aún no se borró nada, intenta borrar un nodo por cercanía
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
    }
    
    if (somethingWasDeleted) {
        redrawCanvasCallback();
        saveState();
    }
}