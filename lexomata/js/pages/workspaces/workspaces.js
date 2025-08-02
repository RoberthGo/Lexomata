// ---------------------------------------------------------------------------------
// SECTION: UI and Modal Functions
// ---------------------------------------------------------------------------------

const colorPalette = {
    light: {
        background: '#FFFFFF',
        nodeFill: '#add8e6',
        nodeStroke: '#000000',
        nodeText: '#000000',
        selectedNodeText: '#000000',
        selectedNodeFill: '#FFD700',
        selectedNodeStroke: '#FFA500',
        edgeLine: '#000000',
        edgeText: '#000000',
        selectedEdge: '#D62828'
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
        selectedEdge: '#FC8181'
    }
};

function toggleTheme() {
    document.body.classList.toggle('dark');
    document.querySelectorAll('.submenu').forEach(sub => sub.style.display = 'none');
    redrawCanvas();
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
    mouseX: 0,
    mouseY: 0,
    mode: 'destination' // 'destination' o 'origin'
};
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

    // Dibujar líneas de reasignación si está activo el modo
    if (edgeReassignmentState.isActive) {
        drawReassignmentLines(ctx, currentTheme);
    }

    ctx.restore();
}

function drawReassignmentLines(ctx, theme) {
    if (!edgeReassignmentState.isActive || edgeReassignmentState.selectedEdgeIds.length === 0) return;

    ctx.save();

    // Configurar estilo para las líneas de reasignación
    ctx.strokeStyle = theme.selectedEdge;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]); // Línea punteada
    ctx.globalAlpha = 0.8;

    // Dibujar líneas según el modo activo
    edgeReassignmentState.selectedEdgeIds.forEach(edgeId => {
        const edge = edges.find(e => e.id === edgeId);
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

function isClickOnEdge(px, py, edge, nodes) {
    const fromNode = nodes.find(n => n.id === edge.from);
    const toNode = nodes.find(n => n.id === edge.to);
    if (!fromNode || !toNode) return false;

    const clickTolerance = 8 / scale;

    // Caso especial: Self-loop (auto-loop)
    if (fromNode.id === toNode.id) {
        return isClickOnSelfLoop(px, py, fromNode, clickTolerance);
    }

    // Verificar si existe una arista en dirección opuesta
    const oppositeEdgeExists = edges.some(e =>
        e.from === edge.to && e.to === edge.from && e.id !== edge.id
    );

    if (oppositeEdgeExists) {
        // Caso especial: Arista curva
        return isClickOnCurvedEdge(px, py, fromNode, toNode, clickTolerance);
    } else {
        // Caso normal: Arista recta
        return isClickOnStraightEdge(px, py, fromNode, toNode, clickTolerance);
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
function isClickOnCurvedEdge(px, py, fromNode, toNode, tolerance) {
    const dx = toNode.x - fromNode.x;
    const dy = toNode.y - fromNode.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const curvature = distance * 0.15;

    const perpX = -dy / distance;
    const perpY = dx / distance;

    const controlX = (fromNode.x + toNode.x) / 2 + perpX * curvature;
    const controlY = (fromNode.y + toNode.y) / 2 + perpY * curvature;

    // Verificar múltiples puntos a lo largo de la curva
    for (let t = 0; t <= 1; t += 0.1) {
        const curveX = (1 - t) * (1 - t) * fromNode.x + 2 * (1 - t) * t * controlX + t * t * toNode.x;
        const curveY = (1 - t) * (1 - t) * fromNode.y + 2 * (1 - t) * t * controlY + t * t * toNode.y;

        const dist = Math.sqrt((px - curveX) ** 2 + (py - curveY) ** 2);
        if (dist < tolerance) {
            return true;
        }
    }

    return false;
}

// Función auxiliar para detectar click en self-loop
function isClickOnSelfLoop(px, py, node, tolerance) {
    const radius = node.radius || 33;
    const loopRadius = radius * 0.8;

    // Centro del loop
    const centerX = node.x;
    const centerY = node.y - radius - loopRadius;

    // Verificar si el click está cerca del círculo del loop
    const distToCenter = Math.sqrt((px - centerX) ** 2 + (py - centerY) ** 2);
    const isOnLoop = Math.abs(distToCenter - loopRadius) < tolerance;

    // También verificar las líneas conectoras
    const startAngle = Math.PI * 0.25;
    const endAngle = Math.PI * 0.75;

    const startX = node.x - Math.cos(startAngle) * radius;
    const startY = node.y - Math.sin(startAngle) * radius;
    const endX = node.x - Math.cos(endAngle) * radius;
    const endY = node.y - Math.sin(endAngle) * radius;

    // Línea desde el nodo hasta el inicio del loop
    const distToStartLine = distancePointToLine(px, py, startX, startY, centerX - loopRadius, centerY);
    const distToEndLine = distancePointToLine(px, py, endX, endY, centerX + loopRadius, centerY);

    return isOnLoop || distToStartLine < tolerance || distToEndLine < tolerance;
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

function reverseEdge(edgeId) {
    const edgeIndex = edges.findIndex(edge => edge.id === edgeId);
    if (edgeIndex === -1) return;

    const edge = edges[edgeIndex];
    // Intercambiar los nodos de origen y destino
    const temp = edge.from;
    edge.from = edge.to;
    edge.to = temp;

    // Guardar el estado para undo/redo
    saveState();
    redrawCanvas();
}

function reverseMultipleEdges(edgeIds) {
    if (!edgeIds || edgeIds.length === 0) return;

    // Invertir todas las aristas seleccionadas
    edgeIds.forEach(edgeId => {
        const edgeIndex = edges.findIndex(edge => edge.id === edgeId);
        if (edgeIndex !== -1) {
            const edge = edges[edgeIndex];
            // Intercambiar los nodos de origen y destino
            const temp = edge.from;
            edge.from = edge.to;
            edge.to = temp;
        }
    });

    // Guardar el estado para undo/redo (una sola vez para toda la operación)
    saveState();
    redrawCanvas();
}

function startEdgeReassignment(edgeIds) {
    if (!edgeIds || edgeIds.length === 0) return;

    console.log("1. Iniciando modo de reasignación de destino para las aristas:", edgeIds);


    edgeReassignmentState.isActive = true;
    edgeReassignmentState.selectedEdgeIds = [...edgeIds];
    edgeReassignmentState.mode = 'destination'; // Modo por defecto

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
    let reassignedCount = 0;
    edgeIds.forEach(edgeId => {
        const edgeIndex = edges.findIndex(edge => edge.id === edgeId);
        if (edgeIndex !== -1) {
            const edge = edges[edgeIndex];
            // Solo reasignar si el nuevo destino es diferente al actual
            if (edge.to !== newDestinationNodeId) {
                edge.to = newDestinationNodeId;
                reassignedCount++;
            }
        }
    });
    if (reassignedCount > 0) {
        saveState();
        redrawCanvas();
    }
}

function reassignEdgeOrigins(edgeIds, newOriginNodeId) {
    let reassignedCount = 0;
    edgeIds.forEach(edgeId => {
        const edgeIndex = edges.findIndex(edge => edge.id === edgeId);
        if (edgeIndex !== -1) {
            const edge = edges[edgeIndex];
            // Solo reasignar si el nuevo origen es diferente al actual
            if (edge.from !== newOriginNodeId) {
                edge.from = newOriginNodeId;
                reassignedCount++;
            }
        }
    });
    if (reassignedCount > 0) {
        saveState();
        redrawCanvas();
    }
}

function cancelEdgeReassignment() {
    edgeReassignmentState.isActive = false;
    edgeReassignmentState.selectedEdgeIds = [];

    // Restaurar cursor normal
    canvas.style.cursor = 'default';

    // Remover event listeners temporales
    canvas.removeEventListener('mousemove', handleReassignmentMouseMove);
    canvas.removeEventListener('click', handleReassignmentClick);
    canvas.removeEventListener('contextmenu', cancelEdgeReassignment);

    redrawCanvas();
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
    message.textContent = `Nota para ${elementType} ${elementName}:`;

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
    const labels = [];
    const regEx = /^[a-zA-Z0-9,]+$/; // Permitimos comas para múltiples valores

    inputs.forEach(input => {
        const value = input.value.trim();
        if (value && regEx.exec(value)) {
            labels.push(value);
        }
    });

    // 2. Si se encontraron etiquetas válidas, crea UNA SOLA arista
    if (labels.length > 0) {
        const newEdge = {
            id: Date.now() + Math.floor(Math.random() * 1000),
            from: fromNode.id,
            to: toNode.id,
            labels: labels, // 3. La arista ahora tiene una propiedad "labels" (plural)
            note: ""
        };
        edges.push(newEdge); // 4. Se añade solo una vez

        redrawCanvas();
        saveState();
    }

    closeMessage('customEdgeModal');
}


// ---------------------------------------------------------------------------------
// SECTION: Event Listeners
// ---------------------------------------------------------------------------------

window.onclick = function (event) {
    if (event.target == customAlertModal) closeMessage();
    if (!event.target.closest('.main-menu-container')) {
        document.querySelectorAll('.submenu').forEach(sub => sub.style.display = 'none');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const defaultToolButton = document.getElementById('select');
    const menuItems = document.querySelectorAll('.main-menu-item');
    const contextMenu = document.getElementById('canvasContextMenu');

    contextMenu.addEventListener('click', (e) => {
        if (e.target.matches('.simple-context-menu-item') && !e.target.classList.contains('disabled')) {
            const action = e.target.dataset.action;

            switch (action) {
                case 'invert':
                    reverseMultipleEdges(selectedEdgeIds);
                    break;
                case 'change-destination':
                    startEdgeReassignment(selectedEdgeIds);
                    break;
                case 'change-origin':
                    startEdgeOriginReassignment(selectedEdgeIds);
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

    if (canvas) {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
        redrawCanvas();
        saveState();
    }

    if (localStorage.getItem('lexomata_autosave')) {
        if (confirm("Se encontró una sesión guardada. ¿Deseas restaurarla?")) {
            loadFromLocalStorage();
        }
    }
    setInterval(autoSaveToLocalStorage, autoSaveInterval);

    const confirmExportButton = document.getElementById('confirmExportButton');
    if (confirmExportButton) {
        confirmExportButton.addEventListener('click', exportImage);
    }
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
    selectedEdgeId = null;

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
        selectedEdgeId = null;

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

// EXPORT IMAGE

function exportImage() {
    // 1. Obtener todas las opciones del modal
    const fileName = document.getElementById('exportFilename').value || projectName;
    const format = document.getElementById('exportFormat').value;
    const exportWidth = parseInt(document.getElementById('exportResolution').value); // Ancho fijo en píxeles
    const themeKey = document.getElementById('exportTheme').value;
    const exportArea = document.querySelector('input[name="exportArea"]:checked').value;

    // 2. Crear un canvas temporal
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');

    let renderPanX, renderPanY, renderScale;

    if (exportArea === 'current') {
        // a. Calcula el alto de la exportación manteniendo la proporción de la ventana actual
        const aspectRatio = canvas.height / canvas.width;
        const exportHeight = exportWidth * aspectRatio;
        tempCanvas.width = exportWidth;
        tempCanvas.height = exportHeight;

        // b. Corrige el zoom y el paneo para el nuevo tamaño
        const scaleFactor = exportWidth / canvas.width;
        renderScale = scale * scaleFactor;
        renderPanX = panX * scaleFactor;
        renderPanY = panY * scaleFactor;

    } else { // exportArea === 'all'
        const padding = 50; // Margen en píxeles del "mundo"
        const bounds = calculateContentBoundingBox();

        const contentWidth = (bounds.maxX - bounds.minX) + (padding * 2);
        const contentHeight = (bounds.maxY - bounds.minY) + (padding * 2);

        // a. Calcula el alto de la exportación manteniendo la proporción del contenido
        const contentAspectRatio = contentHeight > 0 && contentWidth > 0 ? contentHeight / contentWidth : 1;
        const exportHeight = exportWidth * contentAspectRatio;
        tempCanvas.width = exportWidth;
        tempCanvas.height = exportHeight;

        // b. Calcula el zoom y paneo para centrar el contenido
        renderScale = contentWidth > 0 ? exportWidth / contentWidth : 1;
        renderPanX = (-bounds.minX + padding) * renderScale;
        renderPanY = (-bounds.minY + padding) * renderScale;
    }

    // 3. Dibujar fondo y autómata en el canvas temporal
    let theme;
    if (themeKey !== 'transparent') {
        theme = colorPalette[themeKey];
        tempCtx.fillStyle = theme.background;
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    } else {
        theme = colorPalette.light; // Usar colores claros para nodos/aristas sobre fondo transparente
    }

    tempCtx.save();
    tempCtx.translate(renderPanX, renderPanY);
    tempCtx.scale(renderScale, renderScale);

    let tempEdgeDrawCounts = {};
    edges.forEach(edge => drawEdge(tempCtx, edge, nodes, tempEdgeDrawCounts, selectedEdgeId, theme));
    nodes.forEach(node => drawNode(tempCtx, node, selectedNodeIds, theme));
    tempCtx.restore();

    // 4. Generar y descargar la imagen
    const dataUrl = tempCanvas.toDataURL(format, 0.9);
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${fileName}.${format.split('/')[1]}`;
    a.click();

    closeExportModal();
}



function autoSaveToLocalStorage() {
    // Se prepara el objeto con todo lo necesario para guardar
    const stateToSave = {
        nodes: nodes,
        edges: edges,
        nodeCounter: nodeCounter,
        projectName: projectName,
        lastSave: new Date().getTime() // Guarda la fecha del guardado
    };

    // Convierte el objeto a texto JSON y lo guarda en localStorage.
    localStorage.setItem('lexomata_autosave', JSON.stringify(stateToSave));
}

function loadFromLocalStorage() {
    const savedStateJSON = localStorage.getItem('lexomata_autosave');
    if (!savedStateJSON) return; // No hay nada guardado

    const savedState = JSON.parse(savedStateJSON);

    // Actualiza el estado de la aplicación.
    nodes = savedState.nodes;
    edges = savedState.edges;
    nodeCounter = savedState.nodeCounter;
    projectName = savedState.projectName;

    // Reinicia el historial de deshacer y guarda este estado cargado.
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