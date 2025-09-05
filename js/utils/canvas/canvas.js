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

function handleMode() {
    let params = new URLSearchParams(location.search);
    var mode = params.get('mode');
    if (mode == "turing") showTuringTape();
    else if (mode == "automata") showStringAnalyzer();
}

/**
 * Devuelve todos los nodos que se encuentran dentro de un rectángulo de selección.
 * @param {object} start - Coordenadas {x, y} del inicio del cuadro.
 * @param {object} end - Coordenadas {x, y} del final del cuadro.
 * @returns {Array<State>} - Una lista de los nodos que están dentro del cuadro.
 */
function getNodesInSelectionBox(start, end) {
    // Asegura que las coordenadas sean correctas sin importar la dirección del arrastre
    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    const minY = Math.min(start.y, end.y);
    const maxY = Math.max(start.y, end.y);

    return nodes.filter(node => {
        return node.x >= minX && node.x <= maxX && node.y >= minY && node.y <= maxY;
    });
}

/**
 * Devuelve todas las aristas que se cruzan con el rectángulo de selección.
 * VERSIÓN FINAL: Optimizada para rectas y robusta para curvas y selecciones pequeñas.
 * @param {object} start - Coordenadas {x, y} del inicio del cuadro.
 * @param {object} end - Coordenadas {x, y} del final del cuadro.
 * @returns {Array<EdgeAutomata>} - Una lista de las aristas que se cruzan con el cuadro.
 */
function getEdgesInSelectionBox(start, end) {
    const rect = {
        minX: Math.min(start.x, end.x),
        maxX: Math.max(start.x, end.x),
        minY: Math.min(start.y, end.y),
        maxY: Math.max(start.y, end.y)
    };

    return edges.filter((edge, edgeIndex) => {
        const fromNode = nodes.find(n => n.id === edge.from);
        const toNode = nodes.find(n => n.id === edge.to);
        if (!fromNode || !toNode) return false;

        const oppositeEdgeExists = edges.some(e => e.from === edge.to && e.to === edge.from);

        if (!oppositeEdgeExists && fromNode.id !== toNode.id) {
            // --- LÓGICA ÓPTIMA PARA ARISTA RECTA ---
            return lineIntersectsRectangle({ x: fromNode.x, y: fromNode.y }, { x: toNode.x, y: toNode.y }, rect);
        } else {
            // --- LÓGICA DE MUESTREO MEJORADA PARA CURVAS Y BUCLES ---
            let lastPoint = null;

            for (let t = 0; t <= 1.01; t += 0.05) { // Se usa 1.01 para asegurar que el último segmento se procese
                let currentPoint = {};
                if (fromNode.id === toNode.id) { // Self-Loop
                    let drawCount = 1;
                    for (let i = 0; i < edgeIndex; i++) {
                        if (edges[i].from === fromNode.id && edges[i].to === toNode.id) drawCount++;
                    }
                    const baseAngle = -Math.PI / 2 + (drawCount - 1) * (Math.PI / 2);
                    const angleSpread = Math.PI / 8, controlPointOffset = 80.0;
                    const startAngle = baseAngle - angleSpread, endAngle = baseAngle + angleSpread;
                    const startX = fromNode.x + fromNode.radius * Math.cos(startAngle);
                    const startY = fromNode.y + fromNode.radius * Math.sin(startAngle);
                    const endX = fromNode.x + fromNode.radius * Math.cos(endAngle);
                    const endY = fromNode.y + fromNode.radius * Math.sin(endAngle);
                    const midX = (startX + endX) / 2, midY = (startY + endY) / 2;
                    const controlX = midX + controlPointOffset * Math.cos(baseAngle);
                    const controlY = midY + controlPointOffset * Math.sin(baseAngle);
                    currentPoint.x = (1 - t) ** 2 * startX + 2 * (1 - t) * t * controlX + t ** 2 * endX;
                    currentPoint.y = (1 - t) ** 2 * startY + 2 * (1 - t) * t * controlY + t ** 2 * endY;
                } else { // Arista Curva
                    const dx = toNode.x - fromNode.x, dy = toNode.y - fromNode.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const curvature = Math.min(40, distance * 0.15);
                    const perpX = -dy / distance, perpY = dx / distance;
                    const controlX = (fromNode.x + toNode.x) / 2 + perpX * curvature;
                    const controlY = (fromNode.y + toNode.y) / 2 + perpY * curvature;
                    currentPoint.x = (1 - t) ** 2 * fromNode.x + 2 * (1 - t) * t * controlX + t ** 2 * toNode.x;
                    currentPoint.y = (1 - t) ** 2 * fromNode.y + 2 * (1 - t) * t * controlY + t ** 2 * toNode.y;
                }

                if (lastPoint) {
                    // Comprueba la intersección del SEGMENTO entre el punto anterior y el actual
                    if (lineIntersectsRectangle(lastPoint, currentPoint, rect)) {
                        return true;
                    }
                }
                lastPoint = currentPoint;
            }
        }
        return false;
    });
}


/**
 * Comprueba de manera óptima si un segmento de línea (p1, p2) se cruza con un rectángulo.
 * @param {{x, y}} p1 - Punto de inicio de la línea.
 * @param {{x, y}} p2 - Punto final de la línea.
 * @param {{minX, minY, maxX, maxY}} rect - El rectángulo de selección.
 * @returns {boolean} - True si hay intersección.
 */
function lineIntersectsRectangle(p1, p2, rect) {
    // Comprobación rápida: si ambos puntos están dentro, hay intersección.
    if ((p1.x >= rect.minX && p1.x <= rect.maxX && p1.y >= rect.minY && p1.y <= rect.maxY) ||
        (p2.x >= rect.minX && p2.x <= rect.maxX && p2.y >= rect.minY && p2.y <= rect.maxY)) {
        return true;
    }

    // Adaptación del algoritmo de Liang-Barsky o Cohen-Sutherland
    const checkLine = (x1, y1, x2, y2, x3, y3, x4, y4) => {
        const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
        if (den === 0) return false;
        const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den;
        const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / den;
        return t > 0 && t < 1 && u > 0 && u < 1;
    };

    // Comprobar intersección con los 4 lados del rectángulo
    if (checkLine(p1.x, p1.y, p2.x, p2.y, rect.minX, rect.minY, rect.maxX, rect.minY)) return true; // Lado superior
    if (checkLine(p1.x, p1.y, p2.x, p2.y, rect.maxX, rect.minY, rect.maxX, rect.maxY)) return true; // Lado derecho
    if (checkLine(p1.x, p1.y, p2.x, p2.y, rect.maxX, rect.maxY, rect.minX, rect.maxY)) return true; // Lado inferior
    if (checkLine(p1.x, p1.y, p2.x, p2.y, rect.minX, rect.maxY, rect.minX, rect.minY)) return true; // Lado izquierdo

    return false;
}