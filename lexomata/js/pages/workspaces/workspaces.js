// ---------------------------------------------------------------------------------
// SECTION: UI and Modal Functions
// ---------------------------------------------------------------------------------

const colorPalette = {
    light: {
        background: '#FFFFFF',
        nodeFill: '#f5f0d9',          // Color Crema de la imagen
        nodeStroke: '#2c2140',        // Color Índigo oscuro para el borde
        nodeText: '#2c2140',          // Color Índigo oscuro para el texto
        // Un verde muy oscuro para el texto, como en la imagen

        // ---> ESTADO SELECCIONADO: LA VIBRA DE TU IMAGEN <---
        selectedNodeText: '#2c2140',  // Índigo oscuro, se lee bien sobre el Durazno
        selectedNodeFill: '#f4c8a2',  // Color Durazno de la imagen
        selectedNodeStroke: '#2c2140',// Mantenemos el borde oscuro para unificar el estilo   borde menta brillante de la imagen

        // ---> ARISTAS A JUEGO <---
        edgeLine: '#6a9a9a',          // Color Verde Azulado (Teal) para la línea
        edgeText: '#2c2140',          // Índigo oscuro para el texto de la arista

        // ---> SELECCIÓN DE ARISTAS Y CUADRO <---
        selectedEdge: '#65401fff',
        // Colores de la cinta de Turing
        turingCellFill: '#ffffff',
        turingCellStroke: '#ccc',
        turingCellText: '#333',
        turingIndexText: '#666',
        turingHeadStroke: '#20c997',
        // CUADRO DE SELECCION
        selectionBoxFill: 'rgba(32, 201, 151, 0.2)',  // Relleno del cuadro de selección
        selectionBoxStroke: 'rgba(32, 201, 151, 1)'
    },
    dark: {
        background: '#2d3748',
        nodeFill: '#1A202C',
        nodeStroke: '#F7FAFC',
        nodeText: '#F7FAFC',
        selectedNodeFill: '#2C5282',
        selectedNodeStroke: '#63B3ED',
        selectedNodeText: '#F7FAFC',
        edgeLine: '#A0AEC0',
        edgeText: '#E2E8F0',
        selectedEdge: '#FC8181',
        // Colores de la cinta de Turing
        turingCellFill: '#1a1a2e',
        turingCellStroke: '#3a3a50',
        turingCellText: '#e0e0e0',
        turingIndexText: '#a0a0a0',
        turingHeadStroke: '#20c997',
        // CUADRO DE SELECCION
        selectionBoxFill: 'rgba(135, 206, 250, 0.2)', // Relleno celeste semi-transparente
        selectionBoxStroke: 'rgba(135, 206, 250, 1)'
    }
};

function toggleTheme() {
    document.body.classList.toggle('dark');
    document.querySelectorAll('.submenu').forEach(sub => sub.style.display = 'none');
    redrawCanvas();

    // Redibujar la cinta de Turing si existe
    if (typeof drawTuringTape === 'function') {
        drawTuringTape();
    }
}

const customAlertModal = document.getElementById('customAlertModal');
const modalMessage = document.getElementById('modalMessage');

function showMessage(message) {
    modalMessage.textContent = message;
    customAlertModal.style.display = 'flex';
}

function closeMessage(id) {
    // Oculta el contenedor de notas si existe
    const noteContainer = document.getElementById('noteEditorContainer');
    if (noteContainer) {
        noteContainer.style.display = 'none';
    }

    // Oculta el modal principal
    const modalToClose = document.getElementById(id);
    if (modalToClose) {
        modalToClose.style.display = 'none';
    }
}

function redirection() {
    window.location.href = '../index.html';
}


// ---------------------------------------------------------------------------------
// SECTION: Canvas and Automata Logic
// ---------------------------------------------------------------------------------

let history = [];
let historyIndex = -1;
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const exportFormatSelect = document.getElementById('exportFormat');
const transparentOption = document.getElementById('transparentOption');
const exportThemeSelect = document.getElementById('exportTheme');
let projectName = 'nuevo-automata';

// --- OBTENCIÓN DEL MODO DE TRABAJO ---
const urlParams = new URLSearchParams(window.location.search);
const currentMode = urlParams.get('mode') || 'automata';
let nodes = [];
let edges = [];
let nodeCounter = 0
let selectedNodeIds = [];
let selectedEdgeIds = [];
let autoSaveInterval = 5000; // 5s
let currentTool = 'select';
let edgeCreationState = { firstNode: null };
let edgeReassignmentState = {
    isActive: false,
    selectedEdgeIds: [],
    selectedLabels: [], // Agregar array para información de etiquetas seleccionadas
    mouseX: 0,
    mouseY: 0,
    mode: 'destination' // 'destination' o 'origin'
};
let isSelecting = false;
let selectionStart = { x: 0, y: 0 };
let selectionEnd = { x: 0, y: 0 };

const undoButton = document.getElementById('undoButton');
const redoButton = document.getElementById('redoButton');
const undoMenuItem = document.getElementById('undoMenuItem');
const redoMenuItem = document.getElementById('redoMenuItem');



function redrawCanvas() {
    if (!ctx) return;

    const isDarkMode = document.body.classList.contains('dark');
    const currentTheme = isDarkMode ? colorPalette.dark : colorPalette.light;

    edgeDrawCounts = {};
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    // genera un paneo
    ctx.translate(panX, panY);
    // Aplica el zoom (escalado)
    ctx.scale(scale, scale);

    edges.forEach(edge => {
        drawEdge(ctx, edge, nodes, edgeDrawCounts, selectedEdgeIds, currentTheme);
    });

    // Llama a la función de su archivo correspondiente
    nodes.forEach(node => {
        drawNode(ctx, node, selectedNodeIds, currentTheme);
    });

    drawSelectionBox(ctx);

    // Dibujar líneas de reasignación si está activo el modo
    if (edgeReassignmentState.isActive) {
        drawReassignmentLines(ctx, currentTheme);
    }

    ctx.restore();
}

/**
 * Dibuja el rectángulo de selección en el canvas cuando el usuario arrastra el mouse.
 * @param {CanvasRenderingContext2D} ctx - El contexto del canvas.
 */
function drawSelectionBox(ctx) {
    if (!isSelecting) return;

    const isDarkMode = document.body.classList.contains('dark');
    const theme = isDarkMode ? colorPalette.dark : colorPalette.light;

    const startX = selectionStart.x;
    const startY = selectionStart.y;
    const width = selectionEnd.x - startX;
    const height = selectionEnd.y - startY;

    ctx.save();

    // Relleno semi-transparente
    ctx.fillStyle = theme.selectionBoxFill;
    ctx.strokeStyle = theme.selectionBoxStroke;
    ctx.globalAlpha = 0.2;

    // Borde sólido
    ctx.lineWidth = 1 / scale; // Mantiene el grosor del borde consistente con el zoom
    ctx.globalAlpha = 1.0;
    ctx.fillRect(startX, startY, width, height);

    ctx.strokeRect(startX, startY, width, height);

    ctx.restore();
}

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

/**
 * Función principal para detectar clics en cualquier tipo de arista.
 * @param {number} px - Coordenada X del clic.
 * @param {number} py - Coordenada Y del clic.
 * @param {object} edge - La arista a comprobar.
 * @param {object[]} nodes - La lista de todos los nodos.
 * @param {number} [tolerance=8] - El margen de error en píxeles.
 * @returns {boolean} - True si el clic fue sobre la arista.
 */
function isClickOnEdge(px, py, edge, nodes, tolerance = 8) {
    const fromNode = nodes.find(n => n.id === edge.from);
    const toNode = nodes.find(n => n.id === edge.to);
    if (!fromNode || !toNode) return false;

    if (fromNode.id === toNode.id) {
        // Usa el contador de dibujado que guardaste en la arista.
        return isClickOnSelfLoop(px, py, fromNode, edge._drawCount || 1, tolerance);
    }

    const oppositeEdgeExists = edges.some(e => e.from === edge.to && e.to === edge.from);

    if (oppositeEdgeExists) {
        return isClickOnCurvedEdge(px, py, fromNode, toNode, tolerance);
    } else {
        return isClickOnStraightEdge(px, py, fromNode, toNode, tolerance);
    }
}

// Función auxiliar para detectar click en arista recta
function isClickOnStraightEdge(px, py, fromNode, toNode, tolerance) {
    const dx = toNode.x - fromNode.x;
    const dy = toNode.y - fromNode.y;
    const lengthSq = dx * dx + dy * dy;

    if (lengthSq === 0) return false;

    let t = ((px - fromNode.x) * dx + (py - fromNode.y) * dy) / lengthSq;
    t = Math.max(0, Math.min(1, t));

    const closestX = fromNode.x + t * dx;
    const closestY = fromNode.y + t * dy;
    const dist = Math.sqrt((px - closestX) ** 2 + (py - closestY) ** 2);

    return dist < tolerance;
}

// Función auxiliar para detectar click en arista curva
/**
 * Comprueba si un clic se realizó sobre una arista curva.
 * Replica la geometría de la función drawCurvedEdge.
 * @param {number} px - Coordenada X del clic.
 * @param {number} py - Coordenada Y del clic.
 * @param {object} fromNode - El nodo de origen.
 * @param {object} toNode - El nodo de destino.
 * @param {number} tolerance - El margen de error.
 * @returns {boolean}
 */
function isClickOnCurvedEdge(px, py, fromNode, toNode, tolerance) {
    // Recreamos la misma geometría usada para dibujar la curva.
    const dx = toNode.x - fromNode.x;
    const dy = toNode.y - fromNode.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const curvature = distance * 0.15;
    const perpX = -dy / distance;
    const perpY = dx / distance;
    const controlX = (fromNode.x + toNode.x) / 2 + perpX * curvature;
    const controlY = (fromNode.y + toNode.y) / 2 + perpY * curvature;

    // Muestreamos puntos a lo largo de la curva para ver si alguno está cerca del clic.
    for (let t = 0; t <= 1; t += 0.05) {
        const x = (1 - t) ** 2 * fromNode.x + 2 * (1 - t) * t * controlX + t ** 2 * toNode.x;
        const y = (1 - t) ** 2 * fromNode.y + 2 * (1 - t) * t * controlY + t ** 2 * toNode.y;
        if (Math.sqrt((px - x) ** 2 + (py - y) ** 2) < tolerance) {
            return true;
        }
    }
    return false;
}
// Función auxiliar para detectar click en self-loop
/**
 * Comprueba si un clic se realizó sobre un bucle (self-loop).
 * Replica la geometría de la función drawSelfLoop.
 * @param {number} px - Coordenada X del clic.
 * @param {number} py - Coordenada Y del clic.
 * @param {object} node - El nodo del bucle.
 * @param {number} drawCount - El índice del bucle (para su rotación).
 * @param {number} tolerance - El margen de error.
 * @returns {boolean}
 */
function isClickOnSelfLoop(px, py, node, drawCount, tolerance) {
    // Recreamos la misma geometría usada para dibujar el bucle.
    const baseAngle = -Math.PI / 2 + (drawCount - 1) * (Math.PI / 2);
    const angleSpread = Math.PI / 8;
    const startAngle = baseAngle - angleSpread;
    const endAngle = baseAngle + angleSpread;
    const startX = node.x + node.radius * Math.cos(startAngle);
    const startY = node.y + node.radius * Math.sin(startAngle);
    const endX = node.x + node.radius * Math.cos(endAngle);
    const endY = node.y + node.radius * Math.sin(endAngle);
    const controlPointOffset = 80.0; // Usa el mismo valor que en tu drawSelfLoop
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;
    const controlX = midX + controlPointOffset * Math.cos(baseAngle);
    const controlY = midY + controlPointOffset * Math.sin(baseAngle);

    // Muestreamos puntos a lo largo de la curva.
    for (let t = 0; t <= 1; t += 0.05) {
        const x = (1 - t) ** 2 * startX + 2 * (1 - t) * t * controlX + t ** 2 * endX;
        const y = (1 - t) ** 2 * startY + 2 * (1 - t) * t * controlY + t ** 2 * endY;
        if (Math.sqrt((px - x) ** 2 + (py - y) ** 2) < tolerance) {
            return true;
        }
    }
    return false;
}

// Función auxiliar para calcular distancia de punto a línea
function distancePointToLine(px, py, x1, y1, x2, y2) {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;

    if (lenSq === 0) return Math.sqrt(A * A + B * B);

    const param = dot / lenSq;

    let xx, yy;
    if (param < 0) {
        xx = x1;
        yy = y1;
    } else if (param > 1) {
        xx = x2;
        yy = y2;
    } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
    }

    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
}


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

    const labelsByEdge = {};
    selectedLabels.forEach(labelInfo => {
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

    const labelsByEdge = {};
    selectedLabels.forEach(labelInfo => {
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

// ---------------------------------------------------------------------------------
// SECTION: Label Edit Mode
// ---------------------------------------------------------------------------------

let labelEditState = {
    isActive: false,
    edge: null,
    labelIndex: null,
    originalText: '',
    blinkInterval: null,
    showCursor: true,
    cursorPosition: 0
};

/**
 * Detecta si se hizo clic en una etiqueta específica de una arista
 * @param {number} x - Coordenada X del clic
 * @param {number} y - Coordenada Y del clic
 * @returns {Object|null} - Objeto con información de la etiqueta clickeada o null
 */
function detectLabelClick(x, y) {
    for (let edge of edges) {
        if (!edge.labels) continue;

        for (let i = 0; i < edge.labels.length; i++) {
            const label = edge.labels[i];
            if (
                x >= label.x &&
                x <= label.x + label.width &&
                y >= label.y &&
                y <= label.y + label.height
            ) {
                return {
                    edge: edge,
                    labelIndex: i,
                    labelText: typeof label === 'object' ? label.text : label
                };
            }
        }
    }
    return null;
}

/**
 * Inicia el modo de edición para una etiqueta específica
 * @param {Object} labelInfo - Información de la etiqueta a editar
 */
function startLabelEdit(labelInfo) {
    // Si ya hay una edición activa, terminarla primero
    if (labelEditState.isActive) {
        finishLabelEdit();
    }

    labelEditState.isActive = true;
    labelEditState.edge = labelInfo.edge;
    labelEditState.labelIndex = labelInfo.labelIndex;
    labelEditState.originalText = labelInfo.labelText;
    labelEditState.cursorPosition = labelInfo.labelText.length;

    // Iniciar el efecto titilante
    startBlinkingEffect();

    // Agregar listeners para teclas
    document.addEventListener('keydown', handleLabelEditKeydown);
    document.addEventListener('click', handleLabelEditClickOutside);

    redrawCanvas();
}

/**
 * Inicia el efecto titilante de la etiqueta
 */
function startBlinkingEffect() {
    labelEditState.showCursor = true;
    labelEditState.blinkInterval = setInterval(() => {
        labelEditState.showCursor = !labelEditState.showCursor;
        redrawCanvas();
    }, 500); // Parpadeo cada 500ms
}

/**
 * Detiene el efecto titilante
 */
function stopBlinkingEffect() {
    if (labelEditState.blinkInterval) {
        clearInterval(labelEditState.blinkInterval);
        labelEditState.blinkInterval = null;
    }
}

/**
 * Maneja las teclas presionadas durante la edición
 * @param {KeyboardEvent} e - Evento de teclado
 */
function handleLabelEditKeydown(e) {
    if (!labelEditState.isActive) return;

    e.preventDefault();
    e.stopPropagation();

    const currentText = getCurrentLabelText();

    switch (e.key) {
        case 'Enter':
            finishLabelEdit();
            break;
        case 'Escape':
            cancelLabelEdit();
            break;
        case 'Backspace':
            if (labelEditState.cursorPosition > 0) {
                const newText = currentText.slice(0, labelEditState.cursorPosition - 1) +
                    currentText.slice(labelEditState.cursorPosition);
                updateLabelText(newText);
                labelEditState.cursorPosition--;
            }
            break;
        case 'Delete':
            if (labelEditState.cursorPosition < currentText.length) {
                const newText = currentText.slice(0, labelEditState.cursorPosition) +
                    currentText.slice(labelEditState.cursorPosition + 1);
                updateLabelText(newText);
            }
            break;
        case 'ArrowLeft':
            if (labelEditState.cursorPosition > 0) {
                labelEditState.cursorPosition--;
            }
            break;
        case 'ArrowRight':
            if (labelEditState.cursorPosition < currentText.length) {
                labelEditState.cursorPosition++;
            }
            break;
        case 'Home':
            labelEditState.cursorPosition = 0;
            break;
        case 'End':
            labelEditState.cursorPosition = currentText.length;
            break;
        default:
            // Solo permitir caracteres imprimibles
            if (e.key.length === 1 && !e.ctrlKey && !e.altKey) {
                const newText = currentText.slice(0, labelEditState.cursorPosition) +
                    e.key +
                    currentText.slice(labelEditState.cursorPosition);
                updateLabelText(newText);
                labelEditState.cursorPosition++;
            }
            break;
    }

    redrawCanvas();
}

/**
 * Maneja clics fuera de la etiqueta para terminar la edición
 * @param {MouseEvent} e - Evento de clic
 */
function handleLabelEditClickOutside(e) {
    if (!labelEditState.isActive) return;

    // Si el clic es en el canvas, verificar si es fuera de la etiqueta
    if (e.target === canvas) {
        const worldCoords = getCanvasPoint(e.clientX, e.clientY);
        const clickedLabel = detectLabelClick(worldCoords.x, worldCoords.y);

        // Si no se hizo clic en la etiqueta que se está editando, terminar edición
        if (!clickedLabel ||
            clickedLabel.edge !== labelEditState.edge ||
            clickedLabel.labelIndex !== labelEditState.labelIndex) {
            finishLabelEdit();
        }
    }
}

/**
 * Obtiene el texto actual de la etiqueta en edición
 * @returns {string} - Texto actual de la etiqueta
 */
function getCurrentLabelText() {
    const edge = labelEditState.edge;
    const labelIndex = labelEditState.labelIndex;

    if (edge.labels && edge.labels[labelIndex]) {
        return typeof edge.labels[labelIndex] === 'object' ?
            edge.labels[labelIndex].text :
            edge.labels[labelIndex];
    }
    return '';
}

/**
 * Actualiza el texto de la etiqueta en edición
 * @param {string} newText - Nuevo texto para la etiqueta
 */
function updateLabelText(newText) {
    const edge = labelEditState.edge;
    const labelIndex = labelEditState.labelIndex;

    if (edge.labels && edge.labels[labelIndex]) {
        if (typeof edge.labels[labelIndex] === 'object') {
            edge.labels[labelIndex].text = newText;
        } else {
            edge.labels[labelIndex] = newText;
        }
    }
}

/**
 * Termina la edición y guarda los cambios
 */
function finishLabelEdit() {
    if (!labelEditState.isActive) return;

    const newText = getCurrentLabelText().trim();

    // Validar el nuevo texto
    if (!newText) {
        // Si está vacío, restaurar el texto original
        updateLabelText(labelEditState.originalText);
        cancelLabelEdit();
        return;
    }

    const validation = validateTransitionLabel(newText, currentMode);
    if (!validation.isValid) {
        // Si no es válido, restaurar el texto original
        updateLabelText(labelEditState.originalText);
        showMessage(`Error en la etiqueta: ${validation.error}`);
        cancelLabelEdit();
        return;
    }

    // Guardar estado si el texto cambió
    if (newText !== labelEditState.originalText) {
        saveState();
    }

    resetLabelEditState();
    redrawCanvas();
}

/**
 * Cancela la edición y restaura el texto original
 */
function cancelLabelEdit() {
    if (!labelEditState.isActive) return;

    // Restaurar texto original
    updateLabelText(labelEditState.originalText);

    resetLabelEditState();
    redrawCanvas();
}

/**
 * Resetea el estado de edición de etiquetas
 */
function resetLabelEditState() {
    stopBlinkingEffect();

    // Remover listeners
    document.removeEventListener('keydown', handleLabelEditKeydown);
    document.removeEventListener('click', handleLabelEditClickOutside);

    labelEditState.isActive = false;
    labelEditState.edge = null;
    labelEditState.labelIndex = null;
    labelEditState.originalText = '';
    labelEditState.showCursor = true;
    labelEditState.cursorPosition = 0;
}

// ---------------------------------------------------------------------------------
// SECTION: Edge Action Handler and Selection Modal
// ---------------------------------------------------------------------------------

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



// abre el modal para editar notas de nodos o aristas

function showNoteEditor(element) {
    const modal = document.getElementById('customAlertModal');
    const message = document.getElementById('modalMessage');
    const noteContainer = document.getElementById('noteEditorContainer');
    const textarea = document.getElementById('noteTextarea');
    const saveButton = document.getElementById('noteSaveButton');

    // Configura el título del modal
    const elementType = element.radius ? 'nodo' : 'arista'; // Distingue si es nodo o arista
    const elementName = element.label;
    message.textContent = `Nota para ${elementType}:`;

    // Muestra el editor
    noteContainer.style.display = 'flex';
    textarea.value = element.note || ''; // Carga la nota existente o un texto vacío

    // Muestra el modal
    modal.style.display = 'flex';
    textarea.focus();

    // Define qué hacer cuando se haga clic en "Guardar"
    saveButton.onclick = () => {
        element.note = textarea.value; // Guarda la nota en el objeto (nodo o arista)
        saveState(); // Guarda el cambio en el historial
        closeMessage('customAlertModal'); // Cierra el modal
    };
}



function showCanvasContextMenu(x, y) {
    hideCanvasContextMenu();

    const contextMenu = document.getElementById('canvasContextMenu');
    if (!contextMenu) return;

    const menuItems = contextMenu.querySelectorAll('.simple-context-menu-item');
    const hasSelection = selectedEdgeIds.length > 0;

    // Habilita o deshabilita las opciones
    menuItems.forEach(item => {
        item.classList.toggle('disabled', !hasSelection);
    });

    // Mide las dimensiones
    const menuRect = contextMenu.getBoundingClientRect();

    // Calcula la posición para que no se salga de la pantalla
    const xPos = (x + menuRect.width > window.innerWidth) ? window.innerWidth - menuRect.width - 5 : x;
    const yPos = (y + menuRect.height > window.innerHeight) ? window.innerHeight - menuRect.height - 5 : y;

    // Aplica la posición y muestra el menú
    contextMenu.style.left = `${xPos}px`;
    contextMenu.style.top = `${yPos}px`;
    contextMenu.classList.add('visible');

    // Listener para cerrar al hacer clic fuera
    setTimeout(() => document.addEventListener('click', hideCanvasContextMenu), 0);
}

function hideCanvasContextMenu() {
    const contextMenu = document.getElementById('canvasContextMenu');
    if (contextMenu) {
        contextMenu.classList.remove('visible');
    }
    document.removeEventListener('click', hideCanvasContextMenu);
}


function showEdgeLabelModal(fromNode, toNode) {
    const modal = document.getElementById('customEdgeModal');
    const modalMessageEdge = document.getElementById('modalMessageEdge');
    const modalInputContainer = document.getElementById('modalEdgeContainer');

    // Configurar el mensaje
    modalMessageEdge.textContent = `Crear transiciones de ${fromNode.label} a ${toNode.label}`;

    // Limpiar y preparar el contenedor existente
    modalInputContainer.innerHTML = '';
    modalInputContainer.style.display = 'block';

    // Crear contenedor específico para los inputs
    const inputsContainer = document.createElement('div');
    inputsContainer.id = 'edgeInputsContainer';

    // Añadir primera caja de texto
    addEdgeInput(inputsContainer);

    // Crear contenedor para botones
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'modal-actions';

    // Crear botón Guardar
    const saveButton = document.createElement('button');
    saveButton.className = 'modal-button';
    saveButton.textContent = 'Guardar';
    saveButton.onclick = function () {

        saveEdgeLabels(fromNode, toNode);
    };

    // Crear botón Añadir otra transición
    const addMoreButton = document.createElement('button');
    addMoreButton.className = 'modal-button secondary';
    addMoreButton.textContent = 'Añadir otra transición';
    addMoreButton.onclick = function () {
        addEdgeInput(inputsContainer);
    };

    // Añadir botones al contenedor
    buttonContainer.appendChild(saveButton);
    buttonContainer.appendChild(addMoreButton);

    // Añadir elementos al contenedor principal en el orden correcto
    modalInputContainer.appendChild(inputsContainer);  // Primero los inputs
    modalInputContainer.appendChild(buttonContainer);  // Luego los botones

    // Mostrar el modal
    modal.style.display = 'flex';

}

// Función para añadir cajas de texto (sin cambios)
function addEdgeInput(container) {
    const inputGroup = document.createElement('div');
    inputGroup.className = 'input-group';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'modal-input edge-input';
    input.placeholder = 'Ingrese etiqueta de transición';

    inputGroup.appendChild(input);
    container.appendChild(inputGroup);
}

function saveEdgeLabels(fromNode, toNode) {
    const inputs = document.querySelectorAll('.edge-input');
    const newLabels = [];
    const validationErrors = [];

    inputs.forEach((input, index) => {
        const value = input.value.trim();
        if (!value) return; // Ignorar campos vacíos

        const validation = validateTransitionLabel(value, currentMode);
        if (validation.isValid) {
            newLabels.push(value);
        } else {
            validationErrors.push(`Campo ${index + 1}: ${validation.error}`);
        }
    });

    if (validationErrors.length > 0) {
        let errorMessage;
        if (currentMode === 'turing') {
            errorMessage = "Error al procesar la transición de Turing. Formato requerido: 'leer,escribir,mover' (ej: 'a,b,R')\n\n";
            errorMessage += validationErrors.join('\n');
            
            // Agregar sugerencias para cada error
            const suggestions = inputs.map((input, index) => {
                const value = input.value.trim();
                if (value) {
                    const validation = validateTransitionLabel(value, currentMode);
                    if (!validation.isValid) {
                        return `Sugerencia para campo ${index + 1}: ${suggestTuringTransitionFix(value)}`;
                    }
                }
                return null;
            }).filter(s => s !== null);
            
            if (suggestions.length > 0) {
                errorMessage += '\n\nSugerencias:\n' + suggestions.join('\n');
            }
        } else {
            errorMessage = "Error al procesar la transicion, verifica que tenga caracteres validos\no no uses un caracter de escape invalido (\\)\n" + validationErrors.join('\n');
        }
        showMessage(errorMessage);
        return;
    }

    if (newLabels.length === 0) {
        closeMessage('customEdgeModal');
        return;
    }

    // 2. Busca si YA EXISTE una arista entre estos dos nodos.
    let existingEdge = edges.find(e => e.from === fromNode.id && e.to === toNode.id);

    if (existingEdge) {
        // 3. SI EXISTE: simplemente añade las nuevas etiquetas a su arreglo.
        if (!Array.isArray(existingEdge.labels)) {
            existingEdge.labels = [existingEdge.label];
        }

        // Añade solo las etiquetas que no estén ya incluidas para evitar duplicados.
        newLabels.forEach(label => {
            const labelExists = existingEdge.labels.some(existingLabel => {
                const existingLabelText = typeof existingLabel === 'object' ? existingLabel.text : existingLabel;
                const newLabelText = typeof label === 'object' ? label.text : label;
                return existingLabelText === newLabelText;
            });

            if (!labelExists) {
                existingEdge.labels.push(label);
            }
        });

    } else {
        // 4. SI NO EXISTE: crea una arista nueva con las etiquetas recolectadas según el modo.
        let newEdge;
        if (currentMode === 'turing') {
            // Para máquinas de Turing, crear EdgeTouring con las transiciones parseadas
            newEdge = createTuringEdge(fromNode.id, toNode.id, newLabels);
        } else {
            // Para autómatas, usar EdgeAutomata
            newEdge = new EdgeAutomata(fromNode.id, toNode.id, newLabels);
        }
        edges.push(newEdge);
    }

    // 5. Redibuja el canvas y guarda el estado.
    redrawCanvas();
    saveState();
    closeMessage('customEdgeModal');
}

/**
 * Crea una arista de máquina de Turing con las transiciones especificadas
 * @param {string} fromId - ID del nodo origen
 * @param {string} toId - ID del nodo destino
 * @param {Array} transitionLabels - Array de etiquetas en formato "leer,escribir,mover"
 * @returns {EdgeTouring} - Nueva arista de Turing
 */
function createTuringEdge(fromId, toId, transitionLabels) {
    // Parsear la primera transición para los parámetros del constructor
    const firstTransition = parseTuringTransition(transitionLabels[0]);
    
    // Crear la arista con los parámetros de la primera transición
    const turingEdge = new EdgeTouring(
        fromId, 
        toId, 
        [], // transitions array se inicializa vacío
        firstTransition.read,
        firstTransition.write,
        firstTransition.move
    );
    
    // Asignar todas las etiquetas al array labels para compatibilidad con el sistema existente
    turingEdge.labels = transitionLabels;
    turingEdge.note = ""; 

    return turingEdge;
}

/**
 * Parsea una transición de Turing en formato "leer,escribir,mover"
 * @param {string} transitionStr - String de transición
 * @returns {Object} - Objeto con propiedades read, write, move
 */
function parseTuringTransition(transitionStr) {
    transitionStr = String(transitionStr);
    const parts = transitionStr.split(',');
    return {
        read: parts[0] || '',
        write: parts[1] || '',
        move: parts[2] || 'R'
    };
}


// ---------------------------------------------------------------------------------
// SECTION: Event Listeners
// ---------------------------------------------------------------------------------

window.onclick = function (event) {
    if (event.target == customAlertModal) closeMessage();
    if (event.target == document.getElementById('edgeSelectionModal')) closeEdgeSelectionModal();
    if (!event.target.closest('.main-menu-container')) {
        document.querySelectorAll('.submenu').forEach(sub => sub.style.display = 'none');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const defaultToolButton = document.getElementById('select');
    const menuItems = document.querySelectorAll('.main-menu-item');
    const contextMenu = document.getElementById('canvasContextMenu');

    contextMenu.addEventListener('click', (e) => {
        e.stopPropagation();
        if (e.target.matches('.simple-context-menu-item') && !e.target.classList.contains('disabled')) {
            const action = e.target.dataset.action;

            // Filtrar solo las aristas seleccionadas (ignorar nodos seleccionados)
            const onlyEdgeIds = selectedEdgeIds.filter(id => {
                return edges.some(edge => edge.id === id);
            });

            if (onlyEdgeIds.length === 0) {
                hideCanvasContextMenu();
                return;
            }

            switch (action) {
                case 'invert':
                    handleEdgeAction('invert', onlyEdgeIds);
                    break;
                case 'change-destination':
                    handleEdgeAction('change-destination', onlyEdgeIds);
                    break;
                case 'change-origin':
                    handleEdgeAction('change-origin', onlyEdgeIds);
                    break;
                case 'notes-edges':
                    const edge = edges.find(e => String(e.id) === String(onlyEdgeIds[0]));
                    if (edge) {
                        showNoteEditor(edge);
                        //console.log("Notas de la arista:", edge.note);
                    }
                    break;
            }
            hideCanvasContextMenu();
        }
    });

    if (defaultToolButton) {
        changeTool(defaultToolButton, 'select');
    }

    menuItems.forEach(item => {
        item.addEventListener('click', function (event) {
            event.stopPropagation();
            const submenu = this.querySelector('.submenu');
            if (submenu) {
                const isCurrentlyOpen = submenu.style.display === 'block';
                document.querySelectorAll('.submenu').forEach(sub => sub.style.display = 'none');
                if (!isCurrentlyOpen) submenu.style.display = 'block';
            }
        });
    });

    const brandSubtitle = document.querySelector('.brand-subtitle');
    if (currentMode === 'turing') {
        brandSubtitle.textContent = 'Interfaz de Máquina de Turing';
    } else {
        brandSubtitle.textContent = 'Interfaz de Autómata Finito';
    }

    if (canvas) {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
        redrawCanvas();
        saveState();
    }

    const storageKey = `lexomata_autosave_${currentMode}`;
    if (localStorage.getItem(storageKey)) {
        if (confirm("Se encontró una sesión guardada. ¿Deseas restaurarla?")) {
            loadFromLocalStorage();
        }
    }
    setInterval(autoSaveToLocalStorage, autoSaveInterval);

    const confirmExportButton = document.getElementById('confirmExportButton');
    if (confirmExportButton) {
        confirmExportButton.addEventListener('click', exportImage);
    }

    // Actualizar la visibilidad del menú Ver según el modo actual
    updateViewMenuVisibility();
});

// Undo/Redo 

function undo() {
    if (historyIndex > 0) {
        historyIndex--;
        restoreState();
    }
}

function redo() {
    if (historyIndex < history.length - 1) {
        historyIndex++;
        restoreState();
    }
}

function restoreState() {
    const stateToRestore = history[historyIndex];
    // Restaura el estado desde la copia
    nodes = JSON.parse(JSON.stringify(stateToRestore.nodes));
    edges = JSON.parse(JSON.stringify(stateToRestore.edges));
    nodeCounter = stateToRestore.nodeCounter;

    // Limpia la selección actual para evitar inconsistencias
    selectedNodeIds = [];
    selectedEdgeIds = [];

    redrawCanvas();
    updateUndoRedoButtons();
}

function saveState() {
    // Si hemos deshecho acciones, eliminamos el "futuro" que ya no es válido
    if (historyIndex < history.length - 1) {
        history = history.slice(0, historyIndex + 1);
    }

    // Se guarda una copia del estado actual
    const currentState = {
        nodes: JSON.parse(JSON.stringify(nodes)),   // Guarda las aristas
        edges: JSON.parse(JSON.stringify(edges)),   // Guarda los nodos
        nodeCounter: nodeCounter                    // Guarda el contador de nodos
    };

    history.push(currentState);
    historyIndex++;

    // Actualizar el estado de los botones de la UI
    updateUndoRedoButtons();
}


function updateUndoRedoButtons() {
    const canUndo = historyIndex > 0;
    const canRedo = historyIndex < history.length - 1;

    // Actualiza los botones de la barra de herramientas
    if (undoButton) undoButton.disabled = !canUndo;
    if (redoButton) redoButton.disabled = !canRedo;

    // Actualiza las opciones del menú de edición
    if (undoMenuItem) undoMenuItem.classList.toggle('disabled', !canUndo);
    if (redoMenuItem) redoMenuItem.classList.toggle('disabled', !canRedo);
}



function openFile() {
    // 1. Crea un input de tipo "file" oculto que acepta múltiples extensiones.
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json, .jff'; // Permite seleccionar varios tipos de archivo

    // 2. Define qué hacer cuando el usuario seleccione un archivo.
    input.onchange = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        projectName = file.name.replace(/\.[^/.]+$/, '');
        const reader = new FileReader();

        // 3. Cuando el archivo se lea, decide qué hacer según la extensión.
        reader.onload = (e) => {
            const fileContent = e.target.result;
            const fileName = file.name.toLowerCase();

            if (fileName.endsWith('.json')) {
                parseAndLoadJSON(fileContent);
            } else if (fileName.endsWith('.jff')) {

            } else {
                alert("Tipo de archivo no soportado.");
            }
        };

        reader.readAsText(file);
    };

    // 4. Simula un clic para abrir el diálogo de "Abrir archivo".
    input.click();
}

function newFile() {
    const userConfirmed = confirm("¿Estás seguro de que quieres crear un nuevo archivo? Perderás cualquier cambio no guardado.");

    if (userConfirmed) {
        const name = prompt("Ingresa el nombre del nuevo proyecto:", projectName);
        if (name) {
            projectName = name;
        }

        // Reinicia el estado de la aplicación
        nodes = [];
        edges = [];
        nodeCounter = 0;
        selectedNodeIds = [];
        selectedEdgeIds = [];

        // Limpia el historial y guarda el nuevo estado vacío
        history = [];
        historyIndex = -1;
        saveState();

        // Redibuja el lienzo vacío
        redrawCanvas();
    }
}

// Cambia segun el formato
exportFormatSelect.addEventListener('change', () => {
    const isPNG = exportFormatSelect.value === 'image/png';

    transparentOption.style.display = isPNG ? 'block' : 'none';

    // Si se cambia a JPEG y "Transparente" estaba seleccionado, vuelve a "Claro"
    if (!isPNG && exportThemeSelect.value === 'transparent') {
        exportThemeSelect.value = 'light';
    }
});

function autoSaveToLocalStorage() {
    const storageKey = `lexomata_autosave_${currentMode}`;
    // Se prepara el objeto con todo lo necesario para guardar
    const stateToSave = {
        nodes: nodes,
        edges: edges,
        nodeCounter: nodeCounter,
        projectName: projectName,
        lastSave: new Date().getTime() // Guarda la fecha del guardado
    };

    // Convierte el objeto a texto JSON y lo guarda en localStorage.
    localStorage.setItem(storageKey, JSON.stringify(stateToSave));
}

function loadFromLocalStorage() {
    const storageKey = `lexomata_autosave_${currentMode}`;
    const savedStateJSON = localStorage.getItem(storageKey);
    if (!savedStateJSON) return;

    const savedState = JSON.parse(savedStateJSON);

    nodes = savedState.nodes.map(nodeData => {
        const node = new State(nodeData.id, nodeData.label, nodeData.x, nodeData.y);
        node.IsStart = nodeData.IsStart || false;
        node.IsEnd = nodeData.IsEnd || false;
        node.note = nodeData.note || "";
        return node;
    });

    edges = savedState.edges.map(edgeData => {
        let edge;
        if (currentMode === 'turing') {
            edge = createTuringEdge(edgeData.from, edgeData.to, edgeData.labels);
            edge.transitions = edgeData.transitions || [];
        } else {
            edge = new EdgeAutomata(edgeData.from, edgeData.to, edgeData.labels, edgeData.IsMetaCaracter);
        }
        // Guarda la nota que se había editado
        edge.note = edgeData.note || "";
        return edge;
    });

    nodeCounter = savedState.nodeCounter;
    projectName = savedState.projectName;

    history = [];
    historyIndex = -1;
    saveState();
    redrawCanvas();
}

/**
 * Calcula el rectángulo que envuelve a todos los nodos.
 * @returns {object} - Un objeto con minX, minY, maxX, maxY.
 */
function calculateContentBoundingBox() {
    if (nodes.length === 0) {
        return { minX: 0, minY: 0, maxX: canvas.width, maxY: canvas.height };
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    nodes.forEach(node => {
        minX = Math.min(minX, node.x - node.radius);
        minY = Math.min(minY, node.y - node.radius);
        maxX = Math.max(maxX, node.x + node.radius);
        maxY = Math.max(maxY, node.y + node.radius);
    });

    return { minX, minY, maxX, maxY };
}


function focusOnNode() {
    const labelToFind = prompt("Ingresa la etiqueta del nodo a enfocar (ej: q1):");
    if (!labelToFind) return;

    const nodeToFocus = nodes.find(node => node.label === labelToFind.trim());

    if (nodeToFocus) {
        // Resetea el zoom a un nivel estándar para una mejor vista
        scale = 1.0;

        // Calcula el paneo necesario para mover el nodo al centro de la pantalla
        // Se tiene en cuenta el zoom actual (que acabamos de resetear)
        panX = (canvas.width / 2) - (nodeToFocus.x * scale);
        panY = (canvas.height / 2) - (nodeToFocus.y * scale);

        redrawCanvas();
    } else {
        showMessage(`No se encontró ningún nodo con la etiqueta "${labelToFind}".`);
    }
}

function centerCanvasContent() {
    if (nodes.length === 0) return; // No hace nada si el lienzo está vacío

    const bounds = calculateContentBoundingBox();
    const contentWidth = bounds.maxX - bounds.minX;
    const contentHeight = bounds.maxY - bounds.minY;

    if (contentWidth === 0 || contentHeight === 0) return;

    // Añade un margen del 10% alrededor del contenido
    const padding = 0.1;
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    // Calcula la escala necesaria para que todo quepa, considerando el padding
    const scaleX = canvasWidth / (contentWidth * (1 + padding));
    const scaleY = canvasHeight / (contentHeight * (1 + padding));
    scale = Math.min(scaleX, scaleY); // Usa la escala más pequeña para asegurar que todo entre

    // Calcula el paneo para centrar el contenido
    const contentCenterX = bounds.minX + contentWidth / 2;
    const contentCenterY = bounds.minY + contentHeight / 2;

    panX = (canvasWidth / 2) - (contentCenterX * scale);
    panY = (canvasHeight / 2) - (contentCenterY * scale);

    redrawCanvas();
}

function getCurrentMode() {
    const params = new URLSearchParams(location.search);
    return params.get('mode');
}

function updateViewMenuVisibility() {
    const currentMode = getCurrentMode();
    const turingTapeMenuItem = document.querySelector('#menuVer .submenu span[onclick="showTuringTape()"]');
    const stringAnalyzerMenuItem = document.querySelector('#menuVer .submenu span[onclick="showStringAnalyzer()"]');

    if (turingTapeMenuItem && stringAnalyzerMenuItem) {
        if (currentMode === 'turing') {
            // En modo Turing, mostrar solo la opción de cinta
            turingTapeMenuItem.style.display = 'block';
            stringAnalyzerMenuItem.style.display = 'none';
        } else if (currentMode === 'automata') {
            // En modo autómata, mostrar solo el analizador de cadenas
            turingTapeMenuItem.style.display = 'none';
            stringAnalyzerMenuItem.style.display = 'block';
        } else {
            // Si no hay modo definido o es otro, mostrar ambos
            turingTapeMenuItem.style.display = 'block';
            stringAnalyzerMenuItem.style.display = 'block';
        }
    }
}

/**
 * Valida una etiqueta de transición para asegurar que no contenga caracteres de escape inválidos
 * @param {string} label - La etiqueta a validar
 * @param {string} mode - Modo actual ('automata' o 'turing')
 * @returns {object} - Objeto con isValid (boolean) y error (string)
 */
function validateTransitionLabel(label, mode = 'automata') {
    if (!label || typeof label !== 'string') {
        return { isValid: false, error: 'La etiqueta no puede estar vacía' };
    }

    // Validaciones específicas para máquina de Turing
    if (mode === 'turing') {
        return validateTuringTransition(label);
    }

    // Validaciones para autómata (código original)
    return validateAutomataTransition(label);
}

/**
 * Valida una transición de máquina de Turing
 * @param {string} label - Etiqueta en formato "leer,escribir,mover"
 * @returns {object} - Objeto con isValid y error
 */
function validateTuringTransition(label) {
    // Verificar formato básico "a,b,c"
    const parts = label.split(',');
    
    if (parts.length !== 3) {
        return {
            isValid: false,
            error: 'Formato inválido. Use: "leer,escribir,mover" (ej: "a,b,R")'
        };
    }

    const [readChar, writeChar, moveDir] = parts.map(part => part.trim());

    // Validar carácter de lectura
    if (!readChar) {
        return {
            isValid: false,
            error: 'El carácter de lectura no puede estar vacío'
        };
    }

    if (readChar.length > 1 && readChar !== 'ε' && readChar !== 'λ' && readChar !== '□' && readChar !== 'blank') {
        return {
            isValid: false,
            error: 'El carácter de lectura debe ser un solo carácter o un símbolo especial (ε, λ, □, blank)'
        };
    }

    // Validar carácter de escritura
    if (!writeChar) {
        return {
            isValid: false,
            error: 'El carácter de escritura no puede estar vacío'
        };
    }

    if (writeChar.length > 1 && writeChar !== 'ε' && writeChar !== 'λ' && writeChar !== '□' && writeChar !== 'blank') {
        return {
            isValid: false,
            error: 'El carácter de escritura debe ser un solo carácter o un símbolo especial (ε, λ, □, blank)'
        };
    }

    // Validar dirección de movimiento
    const validMoves = ['L', 'R', 'M', 'l', 'r', 'm', 'S', 's'];
    if (!validMoves.includes(moveDir)) {
        return {
            isValid: false,
            error: 'La dirección debe ser L (izquierda), R (derecha), M/S (mantener/stay)'
        };
    }

    return { isValid: true, error: null };
}

/**
 * Proporciona sugerencias para corregir transiciones de Turing mal formateadas
 * @param {string} label - Etiqueta que falló la validación
 * @returns {string} - Sugerencia de corrección
 */
function suggestTuringTransitionFix(label) {
    const suggestions = [];
    
    // Si no tiene comas, sugerir el formato
    if (!label.includes(',')) {
        suggestions.push('Agregue comas para separar: leer,escribir,mover');
        suggestions.push(`Ejemplo: "${label},${label},R"`);
        return suggestions.join('\n');
    }
    
    const parts = label.split(',');
    
    if (parts.length < 3) {
        suggestions.push('Faltan componentes. Formato: leer,escribir,mover');
    }
    
    if (parts.length > 3) {
        suggestions.push('Demasiados componentes. Use solo: leer,escribir,mover');
    }
    
    // Verificar la dirección si existe
    if (parts.length >= 3) {
        const moveDir = parts[2].trim();
        if (!['L', 'R', 'M', 'l', 'r', 'm', 'S', 's'].includes(moveDir)) {
            suggestions.push('Dirección inválida. Use: L (izquierda), R (derecha), M/S (mantener)');
        }
    }
    
    return suggestions.length > 0 ? suggestions.join('\n') : 'Verifique el formato: leer,escribir,mover';
}

/**
 * Valida una transición de autómata (función original)
 * @param {string} label - Etiqueta de la transición
 * @returns {object} - Objeto con isValid y error
 */
function validateAutomataTransition(label) {

    // Casos específicos de errores comunes con caracteres de escape
    const commonInvalidEscapes = [
        { pattern: /\\test/g, description: '\\test (use \\t para tabulación o "test" para literal)' },
        { pattern: /\\hello/g, description: '\\hello (use "hello" para literal)' },
        { pattern: /\\word/g, description: '\\word (use \\w para alfanuméricos o "word" para literal)' },
        { pattern: /\\space/g, description: '\\space (use \\s para espacios o "space" para literal)' },
        { pattern: /\\digit/g, description: '\\digit (use \\d para dígitos o "digit" para literal)' },
        { pattern: /\\num/g, description: '\\num (use \\d para dígitos o "num" para literal)' },
        { pattern: /\\char/g, description: '\\char (use \\w para alfanuméricos o "char" para literal)' },
        { pattern: /\\letter/g, description: '\\letter (use [a-zA-Z] para letras o "letter" para literal)' }
    ];

    // Verificar casos específicos comunes
    for (const invalid of commonInvalidEscapes) {
        if (invalid.pattern.test(label)) {
            return {
                isValid: false,
                error: `Secuencia de escape inválida encontrada: ${invalid.description}`
            };
        }
    }

    // Verificar caracteres de escape inválidos en general
    const invalidEscapePattern = /\\([^dnwsrntfvbDSWRNTFVB0-9\[\](){}.*+?^$|\\\/])/g;
    const invalidEscapes = label.match(invalidEscapePattern);

    if (invalidEscapes) {
        const uniqueInvalidEscapes = [...new Set(invalidEscapes)];
        return {
            isValid: false,
            error: `Secuencias de escape inválidas: ${uniqueInvalidEscapes.join(', ')}. 

Caracteres de escape válidos:
• \\d - dígitos (0-9)
• \\w - alfanuméricos (a-z, A-Z, 0-9, _)  
• \\s - espacios en blanco
• \\n - nueva línea
• \\t - tabulación
• \\\\ - barra invertida literal
• \\. \\* \\+ \\? \\^ \\$ \\| - símbolos literales

Para texto literal, no uses \\ al inicio (ej: use "test" en lugar de "\\test")`
        };
    }

    // Verificar si es una expresión regular válida (si parece ser regex)
    if (typeof RegexHandler !== 'undefined') {
        const regexValidation = RegexHandler.validateRegex(label);
        if (!regexValidation.valid) {
            return {
                isValid: false,
                error: `Expresión regular inválida: ${regexValidation.error}`
            };
        }
    } else {
        // Fallback si RegexHandler no está disponible
        // Verificar caracteres básicos permitidos
        const basicValidPattern = /^[a-zA-Z0-9_|().,\[\]\-\\^$*+?{}\/\s]+$/;
        if (!basicValidPattern.test(label)) {
            return {
                isValid: false,
                error: 'La etiqueta contiene caracteres no permitidos'
            };
        }
    }

    return { isValid: true, error: null };
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
 * Valida y convierte una arista al tipo correcto según el modo actual
 * @param {Object} edge - La arista a validar
 * @param {string} mode - Modo actual ('automata' o 'turing')
 * @returns {Object} - Arista validada y posiblemente convertida
 */
function validateAndConvertEdge(edge, mode) {
    // Si la arista ya es del tipo correcto, devolverla tal como está
    if (mode === 'turing' && edge instanceof EdgeTouring) {
        return edge;
    }
    if (mode === 'automata' && edge instanceof EdgeAutomata) {
        return edge;
    }

    // Si el tipo no coincide con el modo, convertir
    if (mode === 'turing' && !(edge instanceof EdgeTouring)) {
        // Convertir a EdgeTouring
        const labels = edge.labels || [];
        if (labels.length > 0) {
            // Validar que las etiquetas tengan el formato correcto para Turing
            const validLabels = labels.filter(label => {
                const labelText = typeof label === 'object' ? label.text : label;
                const validation = validateTuringTransition(labelText);
                return validation.isValid;
            });
            
            if (validLabels.length > 0) {
                return createTuringEdge(edge.from, edge.to, validLabels);
            }
        }
        // Si no hay etiquetas válidas, crear una EdgeTouring con valores por defecto
        const defaultEdge = new EdgeTouring(edge.from, edge.to, [], 'ε', 'ε', 'R');
        defaultEdge.id = edge.id;
        defaultEdge.labels = edge.labels || [];
        return defaultEdge;
    }
    
    if (mode === 'automata' && !(edge instanceof EdgeAutomata)) {
        // Convertir a EdgeAutomata
        const newEdge = new EdgeAutomata(edge.from, edge.to, edge.labels || []);
        newEdge.id = edge.id;
        newEdge.note = edge.note || '';
        return newEdge;
    }

    return edge;
}

/**
 * Valida todas las aristas del proyecto y las convierte al tipo correcto
 * @param {string} mode - Modo actual ('automata' o 'turing')
 */
function validateAllEdges(mode) {
    edges = edges.map(edge => validateAndConvertEdge(edge, mode));
}

/**
 * Inicializa las validaciones del proyecto basadas en el modo
 * Esta función se debe llamar al cargar el workspace o cambiar de modo
 */
function initializeEdgeValidations() {
    // Validar todas las aristas existentes
    validateAllEdges(currentMode);
    
    // Redibuja el canvas para reflejar los cambios
    redrawCanvas();
    
    console.log(`Validaciones inicializadas para modo: ${currentMode}`);
}

// Inicializar las validaciones cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    // Esperar un poco para asegurar que todas las variables estén inicializadas
    setTimeout(() => {
        if (typeof currentMode !== 'undefined' && (currentMode === 'automata' || currentMode === 'turing')) {
            initializeEdgeValidations();
        }
    }, 100);
});

// ---------------------------------------------------------------------------------
// SECTION: Edge Validation System Documentation
// ---------------------------------------------------------------------------------

/*
SISTEMA DE VALIDACIONES PARA TRANSICIONES

Este sistema implementa validaciones diferenciadas para transiciones de autómatas
y máquinas de Turing, asegurando que se usen los tipos de datos correctos según el modo.

CARACTERÍSTICAS PRINCIPALES:

1. VALIDACIÓN POR MODO:
   - Modo 'automata': Usa EdgeAutomata y validaciones de expresiones regulares
   - Modo 'turing': Usa EdgeTouring y validaciones de formato "leer,escribir,mover"

2. FUNCIONES PRINCIPALES:
   
   validateTransitionLabel(label, mode):
   - Función principal que delegoa a la validación específica según el modo
   - Parámetros: label (string), mode ('automata' | 'turing')
   - Retorna: {isValid: boolean, error: string}
   
   validateTuringTransition(label):
   - Valida formato "leer,escribir,mover" para máquinas de Turing
   - Acepta símbolos especiales: ε, λ, □, blank
   - Direcciones válidas: L, R, M, S (izquierda, derecha, mantener/stay)
   
   validateAutomataTransition(label):
   - Valida expresiones regulares y etiquetas de autómatas
   - Controla caracteres de escape y sintaxis regex
   
   createTuringEdge(fromId, toId, transitionLabels):
   - Crea aristas de tipo EdgeTouring con transiciones parseadas
   - Mantiene compatibilidad con el sistema de labels existente
   
   validateAndConvertEdge(edge, mode):
   - Convierte aristas entre tipos según el modo actual
   - Útil para cargar proyectos mixtos o cambiar de modo
   
   initializeEdgeValidations():
   - Inicializa el sistema de validaciones al cargar la página
   - Convierte todas las aristas existentes al tipo correcto

3. INTEGRACIÓN CON MODALES:
   - saveEdgeLabels(): Actualizada para usar validaciones específicas por modo
   - saveTuringEdgeTransitions(): Usa validaciones de Turing con sugerencias
   - Mensajes de error contextuales con sugerencias de corrección

4. CARACTERÍSTICAS ADICIONALES:
   - Sugerencias automáticas para corregir errores de formato
   - Conversión automática entre tipos de aristas
   - Compatibilidad retroactiva con proyectos existentes
   - Validación en tiempo real durante la edición de etiquetas

EJEMPLOS DE USO:

Para autómatas:
- Etiquetas válidas: "a", "\\d+", "[a-z]*", "ε"
- El sistema valida expresiones regulares y caracteres de escape

Para máquinas de Turing:
- Formato: "leer,escribir,mover"
- Ejemplos válidos: "a,b,R", "0,1,L", "ε,□,M"
- Símbolos especiales: ε (épsilon), λ (lambda), □ (blank), blank

MODO DE OPERACIÓN:
El sistema detecta automáticamente el modo actual (automata/turing) y aplica
las validaciones correspondientes. Al cambiar de modo o cargar un proyecto,
todas las aristas se validan y convierten al tipo correcto automáticamente.

EJECUCIÓN DE MÁQUINAS DE TURING:
Las funciones de ejecución de máquinas de Turing se han trasladado al archivo:
/js/utils/turingExecution/turingExecutionInterface.js

Este archivo incluye un motor de ejecución completo para máquinas de Turing que:
- Lee transiciones en formato "leer,escribir,mover"
- Simula la cinta infinita con expansion automática
- Ejecuta paso a paso o completamente
- Maneja símbolos especiales (□, ε, λ, blank)
- Provee visualización integrada con la cinta
- Incluye validaciones y detección de bucles infinitos

FUNCIONES DE EJECUCIÓN DISPONIBLES (en turingExecutionInterface.js):
- testTuringMachine(cadena, pasoAPaso): Prueba la máquina
- stepForwardTuring() / stepBackwardTuring(): Navegación paso a paso
- runTuringToCompletion(): Ejecución automática completa
- showTuringExecutionInfo(): Información detallada del estado
- exportTuringExecutionHistory(): Exporta historial de ejecución

Para ver la lista completa de comandos, ejecuta: showTuringHelp()
*/