/**
 * Muestra el modal para seleccionar etiquetas específicas
 * @param {string} action - La acción a realizar
 * @param {Array} edgeIds - Array de IDs de aristas
 */
function showEdgeSelectionModal(action, edgeIds) {
    const modal = document.getElementById('edgeSelectionModal');
    const title = document.getElementById('edgeSelectionTitle');
    const content = document.getElementById('edgeSelectionContent');
    const executeButton = document.getElementById('executeActionButton');

    // Configurar el título según la acción
    const actionTitles = {
        'invert': 'Seleccionar etiquetas individuales a invertir',
        'change-destination': 'Seleccionar etiquetas individuales para cambiar destino',
        'change-origin': 'Seleccionar etiquetas individuales para cambiar origen'
    };
    title.textContent = actionTitles[action] || 'Seleccionar etiquetas';

    // Agrupar etiquetas por pares de nodos (origen -> destino)
    // Cada etiqueta es tratada como una entidad individual
    const edgeGroups = groupEdgesByNodePair(edgeIds);

    // Generar el contenido del modal
    content.innerHTML = generateEdgeSelectionHTML(edgeGroups);

    // Configurar el botón de ejecutar
    executeButton.onclick = () => {
        const selectedLabels = getSelectedEdgesFromModal();
        if (selectedLabels.length > 0) {
            executeEdgeAction(action, selectedLabels);
            closeEdgeSelectionModal();
        } else {
            alert('Por favor selecciona al menos una etiqueta para proceder.');
        }
    };

    // Mostrar el modal
    modal.style.display = 'flex';

    // Añadir listeners para los checkboxes
    setupEdgeSelectionListeners();
}

/**
 * Agrupa las etiquetas de aristas por pares de nodos (origen -> destino)
 * Cada etiqueta (label) se trata como una entidad individual
 * @param {Array} edgeIds - Array de IDs de aristas
 * @returns {Object} Objeto con las etiquetas agrupadas por pares de nodos
 */
function groupEdgesByNodePair(edgeIds) {
    const groups = {};

    edgeIds.forEach(edgeId => {
        const edge = edges.find(e => e.id == edgeId); // Usar == para comparación flexible
        if (!edge) return;

        const fromNode = nodes.find(n => n.id === edge.from);
        const toNode = nodes.find(n => n.id === edge.to);

        if (!fromNode || !toNode) return;

        const pairKey = `${fromNode.label}->${toNode.label}`;

        if (!groups[pairKey]) {
            groups[pairKey] = {
                fromLabel: fromNode.label,
                toLabel: toNode.label,
                labels: [] // Cambiado de 'edges' a 'labels' para reflejar que trabajamos con etiquetas individuales
            };
        }

        // Procesar cada etiqueta como una entidad individual
        let edgeLabels;
        if (edge.labels && Array.isArray(edge.labels)) {
            edgeLabels = edge.labels.map(label => {
                if (typeof label === 'object' && label.text) {
                    return label.text;
                } else if (typeof label === 'string') {
                    return label;
                } else {
                    return String(label);
                }
            });
        } else if (edge.label) {
            edgeLabels = [edge.label];
        } else {
            edgeLabels = ['ε'];
        }

        // Crear una entrada individual para cada etiqueta
        // Cada etiqueta es tratada como una entidad separada e independiente
        edgeLabels.forEach((labelText, labelIndex) => {
            groups[pairKey].labels.push({
                edgeId: edge.id,
                labelText: labelText,
                labelIndex: labelIndex, // Índice de la etiqueta dentro de la arista
                fromNodeId: edge.from,
                toNodeId: edge.to,
                uniqueId: `${edge.id}-${labelIndex}` // ID único para cada etiqueta
            });
        });
    });

    return groups;
}

/**
 * Genera el HTML para el modal de selección de etiquetas individuales
 * @param {Object} edgeGroups - Objeto con las etiquetas agrupadas por pares de nodos
 * @returns {string} HTML generado
 */
function generateEdgeSelectionHTML(edgeGroups) {
    let html = '<div class="select-all-group">';
    html += '<input type="checkbox" id="selectAllEdges" class="select-all-checkbox" checked>';
    html += '<label for="selectAllEdges">Seleccionar todas las etiquetas</label>';
    html += '</div>';

    Object.keys(edgeGroups).forEach(pairKey => {
        const group = edgeGroups[pairKey];
        const groupId = `group-${pairKey.replace(/[^a-zA-Z0-9]/g, '-')}`;

        html += `<div class="node-pair-group">`;
        html += `<div class="node-pair-header" data-group="${groupId}">`;
        html += `<span class="group-label">${group.fromLabel} → ${group.toLabel} (${group.labels.length} etiqueta${group.labels.length !== 1 ? 's' : ''})</span>`;
        html += `<span class="expand-icon">▼</span>`;
        html += `</div>`;
        html += `<div class="node-pair-labels expanded" id="${groupId}">`;

        group.labels.forEach((labelInfo, index) => {
            html += `<div class="edge-item">`;
            html += `<input type="checkbox" class="edge-checkbox" value="${labelInfo.uniqueId}" checked>`;
            html += `<div class="edge-labels">`;
            html += `<span class="edge-label-tag">${labelInfo.labelText}</span>`;
            html += `</div>`;
            html += `</div>`;
        });

        html += `</div>`;
        html += `</div>`;
    });

    return html;
}

/**
 * Configura los listeners para los checkboxes del modal
 */
function setupEdgeSelectionListeners() {
    const selectAllCheckbox = document.getElementById('selectAllEdges');
    const edgeCheckboxes = document.querySelectorAll('.edge-checkbox');
    const groupHeaders = document.querySelectorAll('.node-pair-header');

    // Listener para seleccionar/deseleccionar todo
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function () {
            edgeCheckboxes.forEach(checkbox => {
                checkbox.checked = this.checked;
            });
        });
    }

    // Listeners para checkboxes individuales
    edgeCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function () {
            // Actualizar el estado del checkbox "seleccionar todo"
            updateSelectAllCheckbox();
        });
    });

    // Listeners para colapsar/expandir grupos
    groupHeaders.forEach(header => {
        header.addEventListener('click', function (e) {
            // Solo expandir/colapsar si no se hizo clic en un checkbox
            if (e.target.type === 'checkbox') return;

            const groupId = this.getAttribute('data-group');
            const labelsDiv = document.getElementById(groupId);
            const icon = this.querySelector('.expand-icon');

            if (labelsDiv && icon) {
                if (labelsDiv.classList.contains('expanded')) {
                    labelsDiv.classList.remove('expanded');
                    this.classList.add('collapsed');
                    icon.textContent = '▶';
                } else {
                    labelsDiv.classList.add('expanded');
                    this.classList.remove('collapsed');
                    icon.textContent = '▼';
                }
            }
        });
    });

    // Función auxiliar para actualizar el estado del checkbox "seleccionar todo"
    function updateSelectAllCheckbox() {
        if (!selectAllCheckbox) return;

        const checkedCount = Array.from(edgeCheckboxes).filter(cb => cb.checked).length;
        const totalCount = edgeCheckboxes.length;

        if (checkedCount === 0) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        } else if (checkedCount === totalCount) {
            selectAllCheckbox.checked = true;
            selectAllCheckbox.indeterminate = false;
        } else {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = true;
        }
    }
}

/**
 * Obtiene la información de las etiquetas seleccionadas en el modal
 * @returns {Array} Array de objetos con información de etiquetas seleccionadas
 */
function getSelectedEdgesFromModal() {
    const checkboxes = document.querySelectorAll('.edge-checkbox:checked');
    return Array.from(checkboxes).map(checkbox => {
        const uniqueId = checkbox.value;
        // Buscar el último guión para separar edgeId y labelIndex correctamente
        const lastDashIndex = uniqueId.lastIndexOf('-');
        const edgeId = uniqueId.substring(0, lastDashIndex);
        const labelIndex = uniqueId.substring(lastDashIndex + 1);
        return {
            uniqueId: uniqueId,
            edgeId: edgeId,
            labelIndex: parseInt(labelIndex)
        };
    });
}

/**
 * Cierra el modal de selección de aristas
 */
function closeEdgeSelectionModal() {
    const modal = document.getElementById('edgeSelectionModal');
    modal.style.display = 'none';
}
