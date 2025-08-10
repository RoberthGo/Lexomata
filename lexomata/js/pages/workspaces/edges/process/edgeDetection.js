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

