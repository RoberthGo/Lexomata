/**
 * Encuentra el objeto (nodo o arista) en una coordenada específica del mundo.
 * @param {number} worldX - La coordenada X en el mundo del canvas.
 * @param {number} worldY - La coordenada Y en el mundo del canvas.
 * @returns {object|null} - Un objeto con el tipo y la referencia al elemento, o null si no se encuentra nada.
 */
function getObjectAt(worldX, worldY) {
    // 1. Buscar nodos (si no se encontró una arista)
    for (let i = nodes.length - 1; i >= 0; i--) {
        const node = nodes[i];
        const distance = Math.sqrt((worldX - node.x) ** 2 + (worldY - node.y) ** 2);
        if (distance <= node.radius) {
            return { type: 'node', object: node };
        }
    }

    // 2. Buscar aristas primero (si quieres que tengan prioridad)
    for (let i = edges.length - 1; i >= 0; i--) {
        if (isClickOnEdge(worldX, worldY, edges[i], nodes)) {
            return { type: 'edge', object: edges[i] };
        }
    }

    // 3. Si no se encontró nada
    return null;
}


function getCanvasPoint(X, Y) {
    // 1. Obtener la posición del canvas relativo al viewport
    const rect = canvas.getBoundingClientRect();
    const worldX = (X - rect.left - panX) / scale;
    const worldY = (Y - rect.top - panY) / scale;
    return {
        x: worldX,
        y: worldY
    };
}

// Función auxiliar para calcular distancia a una línea
function distanceToLine(px, py, x1, y1, x2, y2) {
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
