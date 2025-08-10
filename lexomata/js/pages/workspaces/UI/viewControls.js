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