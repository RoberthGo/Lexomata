/**
 * Encuentra el objeto (nodo o arista) en una coordenada específica del lienzo.
 * @param {number} x - La coordenada X en el espacio del canvas.
 * @param {number} y - La coordenada Y en el espacio del canvas.
 * @returns {object|null} - Un objeto {type, object} si se encuentra algo, o null.
 */
function getObjectAt(x, y) {
    // 1. Primero, buscar nodos (tienen prioridad)
    // Se busca en orden inverso para detectar primero los nodos dibujados encima.
    const clickedNode = nodes.slice().reverse().find(node => {
        const distance = Math.sqrt((x - node.x) ** 2 + (y - node.y) ** 2);
        return distance <= node.radius;
    });

    if (clickedNode) return { type: 'node', object: clickedNode };

    // 2. Si no se encontró un nodo, buscar aristas
    // La función isClickOnEdge y sus ayudantes deben estar definidos en tu código.
    const clickedEdge = edges.slice().reverse().find(edge =>
        isClickOnEdge(x, y, edge, nodes)
    );

    if (clickedEdge) return { type: 'edge', object: clickedEdge };

    // 3. Si no se encontró nada
    return null;
}

/**
 * Encuentra todas las aristas en una coordenada específica del mundo.
 * @param {number} worldX - La coordenada X en el mundo del canvas.
 * @param {number} worldY - La coordenada Y en el mundo del canvas.
 * @returns {array} - Array de aristas que se encuentran en esa posición.
 */
function getAllEdgesAt(worldX, worldY) {
    const foundEdges = [];
    for (let i = 0; i < edges.length; i++) {
        if (isClickOnEdge(worldX, worldY, edges[i], nodes)) {
            foundEdges.push(edges[i]);
        }
    }
    return foundEdges;
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
