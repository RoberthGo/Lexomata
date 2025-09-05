let edgeReassignmentState = {
    isActive: false,
    selectedEdgeIds: [],
    selectedLabels: [], // Agregar array para información de etiquetas seleccionadas
    mouseX: 0,
    mouseY: 0,
    mode: 'destination' // 'destination' o 'origin'
};

/**
 * Inicia el modo de reasignación para etiquetas específicas
 * @param {Array} selectedLabels - Array de información de etiquetas seleccionadas
 */
function startLabelReassignment(selectedLabels) {
    if (!selectedLabels || selectedLabels.length === 0) return;

    edgeReassignmentState.isActive = true;
    edgeReassignmentState.selectedLabels = [...selectedLabels]; // Guardar info de etiquetas
    edgeReassignmentState.mode = 'destination';

    canvas.style.cursor = 'crosshair';
    canvas.addEventListener('mousemove', handleReassignmentMouseMove);
    canvas.addEventListener('click', handleLabelReassignmentClick);
    canvas.addEventListener('contextmenu', cancelEdgeReassignment);

    redrawCanvas();
}

/**
 * Inicia el modo de reasignación de origen para etiquetas específicas
 * @param {Array} selectedLabels - Array de información de etiquetas seleccionadas
 */
function startLabelOriginReassignment(selectedLabels) {
    if (!selectedLabels || selectedLabels.length === 0) return;

    edgeReassignmentState.isActive = true;
    edgeReassignmentState.selectedLabels = [...selectedLabels];
    edgeReassignmentState.mode = 'origin';

    canvas.style.cursor = 'crosshair';
    canvas.addEventListener('mousemove', handleReassignmentMouseMove);
    canvas.addEventListener('click', handleLabelReassignmentClick);
    canvas.addEventListener('contextmenu', cancelEdgeReassignment);

    redrawCanvas();
}

/**
 * Maneja el clic para reasignar etiquetas específicas
 * @param {Event} event - Evento del clic
 */
function handleLabelReassignmentClick(event) {
    if (!edgeReassignmentState.isActive) return;

    event.preventDefault();
    event.stopPropagation();

    const rect = canvas.getBoundingClientRect();
    const clickX = (event.clientX - rect.left - panX) / scale;
    const clickY = (event.clientY - rect.top - panY) / scale;

    const clickedNode = nodes.find(node => {
        const distance = Math.sqrt(
            Math.pow(clickX - node.x, 2) +
            Math.pow(clickY - node.y, 2)
        );
        return distance <= node.radius;
    });

    if (clickedNode) {
        if (edgeReassignmentState.mode === 'destination') {
            reassignLabelDestinations(edgeReassignmentState.selectedLabels, clickedNode.id);
        } else if (edgeReassignmentState.mode === 'origin') {
            reassignLabelOrigins(edgeReassignmentState.selectedLabels, clickedNode.id);
        }
    }

    cancelEdgeReassignment();
}
/**
 * Reasigna el destino de etiquetas específicas
 * @param {Array} selectedLabels - Array de información de etiquetas
 * @param {string} newDestinationNodeId - ID del nuevo nodo destino
 */
function reassignLabelDestinations(selectedLabels, newDestinationNodeId) {

    if (!selectedLabels || selectedLabels.length === 0) return;

    // Depurar transiciones que ya tienen como destino el nodo seleccionado
    const filteredLabels = selectedLabels.filter(labelInfo => {
        const edge = edges.find(e => e.id == labelInfo.edgeId);
        return edge && edge.to !== newDestinationNodeId;
    });

    if (filteredLabels.length === 0) return;

    const labelsByEdge = {};
    filteredLabels.forEach(labelInfo => {
        if (!labelsByEdge[labelInfo.edgeId]) {
            labelsByEdge[labelInfo.edgeId] = [];
        }
        labelsByEdge[labelInfo.edgeId].push(labelInfo);
    });

    const edgesToDelete = new Set();

    Object.keys(labelsByEdge).forEach(edgeId => {
        const edge = edges.find(e => e.id == edgeId); // Usar == para comparación flexible
        if (!edge) return;

        const labelsToMove = labelsByEdge[edgeId];

        if (labelsToMove.length === edge.labels.length) {
            // Mover toda la arista
            mergeOrUpdateEdge(edge, edge.from, newDestinationNodeId, edgesToDelete, [edgeId]);
        } else {
            // Mover solo etiquetas específicas
            const labelsToKeep = [];
            const labelsToMove_text = [];

            edge.labels.forEach((label, index) => {
                const shouldMove = labelsToMove.some(labelInfo => labelInfo.labelIndex === index);
                if (shouldMove) {
                    labelsToMove_text.push(label);
                } else {
                    labelsToKeep.push(label);
                }
            });

            // Actualizar arista original
            if (labelsToKeep.length > 0) {
                edge.labels = labelsToKeep;
            } else {
                edgesToDelete.add(edge.id);
            }

            // Crear nueva arista con nuevo destino
            if (labelsToMove_text.length > 0) {
                const newEdge = createOrMergeEdge(edge.from, newDestinationNodeId, labelsToMove_text);
                if (newEdge) {
                    edges.push(newEdge);
                }
            }
        }
    });

    if (edgesToDelete.size > 0) {
        edges = edges.filter(edge => !edgesToDelete.has(edge.id));
    }

    saveState();
    redrawCanvas();
}

/**
 * Reasigna el origen de etiquetas específicas
 * @param {Array} selectedLabels - Array de información de etiquetas
 * @param {string} newOriginNodeId - ID del nuevo nodo origen
 */
function reassignLabelOrigins(selectedLabels, newOriginNodeId) {

    if (!selectedLabels || selectedLabels.length === 0) return;

    // Depurar transiciones que ya tienen como origen el nodo seleccionado
    const filteredLabels = selectedLabels.filter(labelInfo => {
        const edge = edges.find(e => e.id == labelInfo.edgeId);
        return edge && edge.from !== newOriginNodeId;
    });

    if (filteredLabels.length === 0) return;

    const labelsByEdge = {};
    filteredLabels.forEach(labelInfo => {
        if (!labelsByEdge[labelInfo.edgeId]) {
            labelsByEdge[labelInfo.edgeId] = [];
        }
        labelsByEdge[labelInfo.edgeId].push(labelInfo);
    });

    const edgesToDelete = new Set();

    Object.keys(labelsByEdge).forEach(edgeId => {
        const edge = edges.find(e => e.id == edgeId); // Usar == para comparación flexible
        if (!edge) return;

        const labelsToMove = labelsByEdge[edgeId];

        if (labelsToMove.length === edge.labels.length) {
            // Mover toda la arista
            mergeOrUpdateEdge(edge, newOriginNodeId, edge.to, edgesToDelete, [edgeId]);
        } else {
            // Mover solo etiquetas específicas
            const labelsToKeep = [];
            const labelsToMove_text = [];

            edge.labels.forEach((label, index) => {
                const shouldMove = labelsToMove.some(labelInfo => labelInfo.labelIndex === index);
                if (shouldMove) {
                    labelsToMove_text.push(label);
                } else {
                    labelsToKeep.push(label);
                }
            });

            // Actualizar arista original
            if (labelsToKeep.length > 0) {
                edge.labels = labelsToKeep;
            } else {
                edgesToDelete.add(edge.id);
            }

            // Crear nueva arista con nuevo origen
            if (labelsToMove_text.length > 0) {
                const newEdge = createOrMergeEdge(newOriginNodeId, edge.to, labelsToMove_text);
                if (newEdge) {
                    edges.push(newEdge);
                }
            }
        }
    });

    if (edgesToDelete.size > 0) {
        edges = edges.filter(edge => !edgesToDelete.has(edge.id));
    }

    saveState();
    redrawCanvas();
}

function startEdgeDestinationReassignment(edgeIds) {
    if (!edgeIds || edgeIds.length === 0) return;

    edgeReassignmentState.isActive = true;
    edgeReassignmentState.selectedEdgeIds = [...edgeIds];
    edgeReassignmentState.mode = 'destination'; // Modo para cambiar destino

    // Cambiar cursor para indicar modo de reasignación
    canvas.style.cursor = 'crosshair';

    // Agregar event listeners temporales
    canvas.addEventListener('mousemove', handleReassignmentMouseMove);
    canvas.addEventListener('click', handleReassignmentClick);
    canvas.addEventListener('contextmenu', cancelEdgeReassignment);

    redrawCanvas();
}

function startEdgeOriginReassignment(edgeIds) {
    if (!edgeIds || edgeIds.length === 0) return;

    edgeReassignmentState.isActive = true;
    edgeReassignmentState.selectedEdgeIds = [...edgeIds];
    edgeReassignmentState.mode = 'origin'; // Modo para cambiar origen

    // Cambiar cursor para indicar modo de reasignación
    canvas.style.cursor = 'crosshair';

    // Agregar event listeners temporales
    canvas.addEventListener('mousemove', handleReassignmentMouseMove);
    canvas.addEventListener('click', handleReassignmentClick);
    canvas.addEventListener('contextmenu', cancelEdgeReassignment);

    redrawCanvas();
}

function handleReassignmentMouseMove(event) {
    if (!edgeReassignmentState.isActive) return;

    const rect = canvas.getBoundingClientRect();
    edgeReassignmentState.mouseX = (event.clientX - rect.left - panX) / scale;
    edgeReassignmentState.mouseY = (event.clientY - rect.top - panY) / scale;

    redrawCanvas();
}

function handleReassignmentClick(event) {
    if (!edgeReassignmentState.isActive) return;

    event.preventDefault();
    event.stopPropagation();

    const rect = canvas.getBoundingClientRect();
    const clickX = (event.clientX - rect.left - panX) / scale;
    const clickY = (event.clientY - rect.top - panY) / scale;

    // Buscar si se hizo click en un nodo
    const clickedNode = nodes.find(node => {
        const distance = Math.sqrt(
            Math.pow(clickX - node.x, 2) +
            Math.pow(clickY - node.y, 2)
        );
        return distance <= node.radius;
    });

    if (clickedNode) {
        // Reasignar según el modo activo
        if (edgeReassignmentState.mode === 'destination') {
            reassignEdgeDestinations(edgeReassignmentState.selectedEdgeIds, clickedNode.id);
        } else if (edgeReassignmentState.mode === 'origin') {
            reassignEdgeOrigins(edgeReassignmentState.selectedEdgeIds, clickedNode.id);
        }
    }

    cancelEdgeReassignment();
}

function reassignEdgeDestinations(edgeIds, newDestinationNodeId) {
    if (!edgeIds || edgeIds.length === 0) return;
    const edgesToDelete = new Set();

    edgeIds.forEach(edgeId => {
        const edge = edges.find(e => e.id == edgeId); // Usar == para comparación flexible
        mergeOrUpdateEdge(edge, edge.from, newDestinationNodeId, edgesToDelete, edgeIds);
    });

    if (edgesToDelete.size > 0) {
        edges = edges.filter(edge => !edgesToDelete.has(edge.id));
    }

    saveState();
    redrawCanvas();

}

function reassignEdgeOrigins(edgeIds, newOriginNodeId) {
    if (!edgeIds || edgeIds.length === 0) return;
    const edgesToDelete = new Set();

    edgeIds.forEach(edgeId => {
        const edge = edges.find(e => e.id == edgeId); // Usar == para comparación flexible
        mergeOrUpdateEdge(edge, newOriginNodeId, edge.to, edgesToDelete, edgeIds);
    });

    if (edgesToDelete.size > 0) {
        edges = edges.filter(edge => !edgesToDelete.has(edge.id));
    }

    saveState();
    redrawCanvas();
}

function cancelEdgeReassignment() {
    edgeReassignmentState.isActive = false;
    edgeReassignmentState.selectedEdgeIds = [];
    edgeReassignmentState.selectedLabels = []; // Limpiar etiquetas seleccionadas

    // Restaurar cursor normal
    canvas.style.cursor = 'default';

    // Remover event listeners temporales
    canvas.removeEventListener('mousemove', handleReassignmentMouseMove);
    canvas.removeEventListener('click', handleReassignmentClick);
    canvas.removeEventListener('click', handleLabelReassignmentClick); // Remover listener de etiquetas
    canvas.removeEventListener('contextmenu', cancelEdgeReassignment);

    redrawCanvas();
}

/**
 * Dibuja el rectángulo de selección en el canvas cuando el usuario arrastra el mouse.
 * @param {CanvasRenderingContext2D} ctx - El contexto del canvas.
 */

function drawReassignmentLines(ctx, theme) {
    if (!edgeReassignmentState.isActive ||
        (edgeReassignmentState.selectedEdgeIds.length === 0 &&
            edgeReassignmentState.selectedLabels.length === 0)) return;

    ctx.save();

    // Configurar estilo para las líneas de reasignación
    ctx.strokeStyle = theme.selectedEdge;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]); // Línea punteada
    ctx.globalAlpha = 0.8;

    // Manejar aristas completas seleccionadas
    if (edgeReassignmentState.selectedEdgeIds.length > 0) {
        edgeReassignmentState.selectedEdgeIds.forEach(edgeId => {
            const edge = edges.find(e => e.id == edgeId); // Usar == para comparación flexible
            if (!edge) return;

            let nodeToConnect;
            if (edgeReassignmentState.mode === 'destination') {
                // Línea desde el nodo origen hasta el mouse
                nodeToConnect = nodes.find(n => n.id === edge.from);
            } else if (edgeReassignmentState.mode === 'origin') {
                // Línea desde el nodo destino hasta el mouse
                nodeToConnect = nodes.find(n => n.id === edge.to);
            }

            if (!nodeToConnect) return;

            ctx.beginPath();
            ctx.moveTo(nodeToConnect.x, nodeToConnect.y);
            ctx.lineTo(edgeReassignmentState.mouseX, edgeReassignmentState.mouseY);
            ctx.stroke();
        });
    }

    // Manejar etiquetas específicas seleccionadas
    if (edgeReassignmentState.selectedLabels.length > 0) {
        // Obtener aristas únicas de las etiquetas seleccionadas
        const uniqueEdgeIds = [...new Set(edgeReassignmentState.selectedLabels.map(label => label.edgeId))];

        uniqueEdgeIds.forEach(edgeId => {
            const edge = edges.find(e => e.id == edgeId); // Usar == para comparación flexible
            if (!edge) return;

            let nodeToConnect;
            if (edgeReassignmentState.mode === 'destination') {
                nodeToConnect = nodes.find(n => n.id === edge.from);
            } else if (edgeReassignmentState.mode === 'origin') {
                nodeToConnect = nodes.find(n => n.id === edge.to);
            }

            if (!nodeToConnect) return;

            ctx.beginPath();
            ctx.moveTo(nodeToConnect.x, nodeToConnect.y);
            ctx.lineTo(edgeReassignmentState.mouseX, edgeReassignmentState.mouseY);
            ctx.stroke();
        });
    }

    // Dibujar círculo en la posición del mouse con indicador del modo
    ctx.beginPath();
    ctx.arc(edgeReassignmentState.mouseX, edgeReassignmentState.mouseY, 8, 0, 2 * Math.PI);
    ctx.fillStyle = theme.selectedEdge;
    ctx.fill();
    ctx.strokeStyle = theme.background;
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.stroke();

    // Agregar texto indicador del modo
    ctx.fillStyle = theme.edgeText;
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    const modeText = edgeReassignmentState.mode === 'destination' ? 'DESTINO' : 'ORIGEN';
    ctx.fillText(modeText, edgeReassignmentState.mouseX, edgeReassignmentState.mouseY - 15);

    ctx.restore();
}