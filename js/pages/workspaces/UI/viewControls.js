/**
 * Calcula el rectángulo que envuelve a todos los nodos y aristas.
 * @returns {object} - Un objeto con minX, minY, maxX, maxY.
 */
function calculateContentBoundingBox() {
    if (nodes.length === 0) {
        return { minX: 0, minY: 0, maxX: canvas.width, maxY: canvas.height };
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    // 1. Incluir todos los nodos en el cálculo
    nodes.forEach(node => {
        minX = Math.min(minX, node.x - node.radius);
        minY = Math.min(minY, node.y - node.radius);
        maxX = Math.max(maxX, node.x + node.radius);
        maxY = Math.max(maxY, node.y + node.radius);
    });

    // 2. Incluir todas las aristas y sus etiquetas
    edges.forEach(edge => {
        const fromNode = nodes.find(n => n.id === edge.from);
        const toNode = nodes.find(n => n.id === edge.to);
        if (!fromNode || !toNode) return;

        // A. Aristas de bucle (self-loops)
        if (fromNode.id === toNode.id) {
            const node = fromNode;
            const baseAngle = -Math.PI / 2; // Simplificado para el cálculo del BBox
            const controlPointOffset = 80.0;
            const midX = node.x + node.radius * Math.cos(baseAngle);
            const midY = node.y + node.radius * Math.sin(baseAngle);
            const controlX = midX + controlPointOffset * Math.cos(baseAngle);
            const controlY = midY + controlPointOffset * Math.sin(baseAngle);

            minX = Math.min(minX, controlX);
            minY = Math.min(minY, controlY);
            maxX = Math.max(maxX, controlX);
            maxY = Math.max(maxY, controlY);

            // B. Aristas curvas (bidireccionales)
        } else if (edges.some(e => e.from === edge.to && e.to === edge.from)) {
            const dx = toNode.x - fromNode.x;
            const dy = toNode.y - fromNode.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const perpX = -dy / distance;
            const perpY = dx / distance;
            const maxCurvature = 40;
            const curvature = Math.min(maxCurvature, distance * 0.15);
            const controlX = (fromNode.x + toNode.x) / 2 + perpX * curvature;
            const controlY = (fromNode.y + toNode.y) / 2 + perpY * curvature;

            minX = Math.min(minX, controlX);
            minY = Math.min(minY, controlY);
            maxX = Math.max(maxX, controlX);
            maxY = Math.max(maxY, controlY);
        }

        // C. Incluir las etiquetas de todas las aristas
        if (edge.labels) {
            edge.labels.forEach(label => {
                if (label.x !== undefined && label.y !== undefined && label.width && label.height) {
                    minX = Math.min(minX, label.x);
                    minY = Math.min(minY, label.y);
                    maxX = Math.max(maxX, label.x + label.width);
                    maxY = Math.max(maxY, label.y + label.height);
                }
            });
        }
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