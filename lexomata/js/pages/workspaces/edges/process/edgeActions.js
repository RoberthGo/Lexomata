function reverseMultipleEdges(edgeIds) {
    if (!edgeIds || edgeIds.length === 0) return;

    // Crear una copia de las aristas a procesar para evitar modificar el array original durante la iteración
    const edgesToProcess = edgeIds.map(edgeId => {
        const edge = edges.find(e => e.id == edgeId);
        if (!edge) return null;
        return {
            id: edge.id,
            originalFrom: edge.from,
            originalTo: edge.to,
            labels: [...edge.labels] // Copia de las etiquetas
        };
    }).filter(edge => edge !== null);

    // Primero, crear todas las aristas invertidas como nuevas aristas temporales
    const newEdges = [];
    const edgesToDelete = new Set();

    edgesToProcess.forEach(edgeInfo => {
        const originalEdge = edges.find(e => e.id == edgeInfo.id);
        if (!originalEdge) return;

        // Buscar si ya existe una arista en la dirección inversa que NO esté en la selección actual
        const existingOppositeEdge = edges.find(e =>
            e.from === edgeInfo.originalTo &&
            e.to === edgeInfo.originalFrom &&
            !edgeIds.includes(e.id) // No debe estar en la selección actual
        );

        if (existingOppositeEdge) {
            // Si existe una arista opuesta que no está siendo invertida, fusionar con ella
            edgeInfo.labels.forEach(label => {
                const labelText = typeof label === 'object' ? label.text : label;
                const labelExists = existingOppositeEdge.labels.some(existingLabel => {
                    const existingLabelText = typeof existingLabel === 'object' ? existingLabel.text : existingLabel;
                    return existingLabelText === labelText;
                });

                if (!labelExists) {
                    existingOppositeEdge.labels.push(label);
                }
            });
            edgesToDelete.add(originalEdge.id);
        } else {
            // Si no existe arista opuesta, o la arista opuesta también está siendo invertida,
            // simplemente invertir la dirección de la arista actual
            originalEdge.from = edgeInfo.originalTo;
            originalEdge.to = edgeInfo.originalFrom;
        }
    });

    // Eliminar las aristas marcadas para eliminación
    if (edgesToDelete.size > 0) {
        edges = edges.filter(edge => !edgesToDelete.has(edge.id));
    }

    // Guardar el estado para undo/redo (una sola vez para toda la operación)
    saveState();
    redrawCanvas();
}

/**
 * Invierte etiquetas específicas de las aristas
 * @param {Array} selectedLabels - Array de información de etiquetas seleccionadas
 */
function reverseMultipleLabels(selectedLabels) {
    if (!selectedLabels || selectedLabels.length === 0) return;

    // Agrupar etiquetas por arista para procesamiento eficiente
    const labelsByEdge = {};
    selectedLabels.forEach(labelInfo => {
        if (!labelsByEdge[labelInfo.edgeId]) {
            labelsByEdge[labelInfo.edgeId] = [];
        }
        labelsByEdge[labelInfo.edgeId].push(labelInfo);
    });

    const edgesToDelete = new Set();
    const newEdgesCreated = [];

    Object.keys(labelsByEdge).forEach(edgeId => {
        const edge = edges.find(e => e.id == edgeId); // Usar == para comparación flexible
        if (!edge) return;

        const labelsToReverse = labelsByEdge[edgeId];

        // Si se van a invertir todas las etiquetas de la arista
        if (labelsToReverse.length === edge.labels.length) {
            // Usar la misma lógica que reverseMultipleEdges para evitar problemas con aristas bidireccionales
            // Buscar si ya existe una arista en la dirección inversa que NO esté siendo procesada
            const existingOppositeEdge = edges.find(e =>
                e.from === edge.to &&
                e.to === edge.from &&
                !selectedLabels.some(labelInfo => labelInfo.edgeId == e.id) // No debe estar en la selección actual
            );

            if (existingOppositeEdge) {
                // Si existe una arista opuesta que no está siendo invertida, fusionar con ella
                edge.labels.forEach(label => {
                    const labelText = typeof label === 'object' ? label.text : label;
                    const labelExists = existingOppositeEdge.labels.some(existingLabel => {
                        const existingLabelText = typeof existingLabel === 'object' ? existingLabel.text : existingLabel;
                        return existingLabelText === labelText;
                    });

                    if (!labelExists) {
                        existingOppositeEdge.labels.push(label);
                    }
                });
                edgesToDelete.add(edge.id);
            } else {
                // Si no existe arista opuesta, o la arista opuesta también está siendo invertida,
                // simplemente invertir la dirección de la arista actual
                const tempFrom = edge.from;
                edge.from = edge.to;
                edge.to = tempFrom;
            }
        } else {
            // Solo invertir etiquetas específicas
            const labelsToKeep = [];
            const labelsToInvert = [];

            edge.labels.forEach((label, index) => {
                const shouldReverse = labelsToReverse.some(labelInfo => labelInfo.labelIndex === index);
                if (shouldReverse) {
                    labelsToInvert.push(label);
                } else {
                    labelsToKeep.push(label);
                }
            });

            // Actualizar la arista original con las etiquetas que se mantienen
            if (labelsToKeep.length > 0) {
                edge.labels = labelsToKeep;
            } else {
                // Si no quedan etiquetas, marcar para eliminar
                edgesToDelete.add(edge.id);
            }

            // Crear nueva arista invertida con las etiquetas seleccionadas
            if (labelsToInvert.length > 0) {
                const invertedEdge = createOrMergeEdge(edge.to, edge.from, labelsToInvert);
                if (invertedEdge) {
                    newEdgesCreated.push(invertedEdge);
                }
            }
        }
    });

    // Eliminar aristas marcadas para eliminación
    if (edgesToDelete.size > 0) {
        edges = edges.filter(edge => !edgesToDelete.has(edge.id));
    }

    // Agregar nuevas aristas creadas
    newEdgesCreated.forEach(newEdge => {
        if (!edges.find(e => e.id === newEdge.id)) {
            edges.push(newEdge);
        }
    });

    saveState();
    redrawCanvas();
}

/**
 * Crea una nueva arista o fusiona con una existente
 * @param {string} fromId - ID del nodo origen
 * @param {string} toId - ID del nodo destino  
 * @param {Array} labelsToAdd - Etiquetas a agregar
 * @returns {Object|null} La arista creada o null si se fusionó con una existente
 */
function createOrMergeEdge(fromId, toId, labelsToAdd) {
    // Buscar si ya existe una arista entre estos nodos
    const existingEdge = edges.find(e => e.from === fromId && e.to === toId);

    if (existingEdge) {
        // Fusionar etiquetas con la arista existente
        labelsToAdd.forEach(label => {
            // Normalizar la etiqueta para comparación
            const labelText = typeof label === 'object' ? label.text : label;
            const labelExists = existingEdge.labels.some(existingLabel => {
                const existingLabelText = typeof existingLabel === 'object' ? existingLabel.text : existingLabel;
                return existingLabelText === labelText;
            });

            if (!labelExists) {
                existingEdge.labels.push(label);
            }
        });
        return null; // No se creó una nueva arista
    } else {
        // Crear nueva arista según el modo actual
        let newEdge;
        if (currentMode === 'turing') {
            newEdge = createTuringEdge(fromId, toId, labelsToAdd);
        } else {
            newEdge = new EdgeAutomata(fromId, toId, labelsToAdd);
        }
        return newEdge;
    }
}
function mergeOrUpdateEdge(edgeToModify, newFromId, newToId, edgesToDelete, selectedIdsForOperation = []) {
    // Busca una arista existente que coincida con la nueva configuración (y que no sea la misma).
    const existingEdge = edges.find(e => e.id !== edgeToModify.id && e.from === newFromId && e.to === newToId && !selectedIdsForOperation.includes(e.id));
    if (existingEdge) {
        // Si se encuentra una arista, fusiona las etiquetas.
        edgeToModify.labels.forEach(label => {
            const labelText = typeof label === 'object' ? label.text : label;
            const labelExists = existingEdge.labels.some(existingLabel => {
                const existingLabelText = typeof existingLabel === 'object' ? existingLabel.text : existingLabel;
                return existingLabelText === labelText;
            });

            if (!labelExists) {
                existingEdge.labels.push(label);
            }
        });
        // Y marca la arista original para ser eliminada.
        edgesToDelete.add(edgeToModify.id);
    } else {
        // Si no se encuentra, simplemente actualiza el origen y destino.
        edgeToModify.from = newFromId;
        edgeToModify.to = newToId;
    }
}
/**
 * Maneja las acciones sobre aristas con selección múltiple
 * @param {string} action - La acción a realizar ('invert', 'change-destination', 'change-origin')
 * @param {Array} edgeIds - Array de IDs de aristas seleccionadas
 */
function handleEdgeAction(action, edgeIds) {
    if (!edgeIds || edgeIds.length === 0) return;

    // Contar el total de etiquetas en todas las aristas seleccionadas
    let totalLabels = 0;
    let totalEdges = 0;
    edgeIds.forEach(edgeId => {
        const edge = edges.find(e => e.id == edgeId); // Usar == para comparación flexible
        if (edge && edge.labels) {
            totalLabels += edge.labels.length;
            totalEdges++;
        }
    });

    // Si solo hay una arista con una etiqueta, ejecutar directamente sobre la etiqueta
    if (totalEdges === 1 && totalLabels === 1) {
        const selectedLabels = [];
        edgeIds.forEach(edgeId => {
            const edge = edges.find(e => e.id == edgeId); // Usar == para comparación flexible
            if (edge && edge.labels) {
                edge.labels.forEach((label, index) => {
                    selectedLabels.push({
                        uniqueId: `${edgeId}-${index}`,
                        edgeId: edgeId,
                        labelIndex: index
                    });
                });
            }
        });
        executeEdgeAction(action, selectedLabels);
        return;
    }

    // Si todas las aristas tienen exactamente una etiqueta cada una, actuar sobre aristas completas
    const allEdgesHaveOneLabel = edgeIds.every(edgeId => {
        const edge = edges.find(e => e.id == edgeId); // Usar == para comparación flexible
        return edge && edge.labels && edge.labels.length === 1;
    });

    if (allEdgesHaveOneLabel) {
        // Ejecutar acción directamente sobre las aristas completas
        executeDirectEdgeAction(action, edgeIds);
        return;
    }

    // Si hay múltiples etiquetas o aristas mixtas, mostrar el modal de selección
    showEdgeSelectionModal(action, edgeIds);
}
/**
 * Ejecuta la acción directamente sobre aristas completas
 * @param {string} action - La acción a realizar
 * @param {Array} edgeIds - Array de IDs de aristas
 */
function executeDirectEdgeAction(action, edgeIds) {
    switch (action) {
        case 'invert':
            reverseMultipleEdges(edgeIds);
            break;
        case 'change-destination':
            startEdgeDestinationReassignment(edgeIds);
            break;
        case 'change-origin':
            startEdgeOriginReassignment(edgeIds);
            break;
    }
}
/**
 * Ejecuta la acción sobre las etiquetas especificadas
 * @param {string} action - La acción a realizar
 * @param {Array} selectedLabels - Array de información de etiquetas seleccionadas
 */
function executeEdgeAction(action, selectedLabels) {
    switch (action) {
        case 'invert':
            reverseMultipleLabels(selectedLabels);
            break;
        case 'change-destination':
            startLabelReassignment(selectedLabels);
            break;
        case 'change-origin':
            startLabelOriginReassignment(selectedLabels);
            break;
    }
}


