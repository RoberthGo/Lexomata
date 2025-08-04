function drawEdge(ctx, edge, nodes, edgeDrawCounts, selectedEdgeIds, theme) {
    const fromNode = nodes.find(n => n.id === edge.from);
    const toNode = nodes.find(n => n.id === edge.to);
    if (!fromNode || !toNode) return;

    const isSelected = selectedEdgeIds.includes(edge.id);

    const edgeKeyA = `${fromNode.id}-${toNode.id}`;
    if (!edgeDrawCounts[edgeKeyA]) {
        edgeDrawCounts[edgeKeyA] = 0;
    }
    edgeDrawCounts[edgeKeyA]++;
    const drawCountA = edgeDrawCounts[edgeKeyA];
    edge._drawCount = drawCountA;

    // Caso especial 1: Auto-loop (self-edge)
    if (fromNode.id === toNode.id) {
        drawSelfLoop(ctx, fromNode, edge, isSelected, theme, edgeDrawCounts[edgeKeyA]);
        return;
    }

    // Verificar si existe una arista en dirección opuesta
    const oppositeEdgeExists = edges.some(e =>
        e.from === edge.to && e.to === edge.from && e.id !== edge.id
    );

    if (drawCountA <= 1) {
        if (oppositeEdgeExists) {
            // Caso especial 2: Aristas bidireccionales - dibujar con curva
            drawCurvedEdge(ctx, fromNode, toNode, edge, isSelected, theme, true);
        } else {
            // Caso normal: línea recta
            drawStraightEdge(ctx, fromNode, toNode, isSelected, theme);
        }
    }

    // Dibujar la etiqueta
    drawEdgeLabel(ctx, fromNode, toNode, edge, isSelected, theme, oppositeEdgeExists);
}

// Función auxiliar para dibujar la flecha
function drawArrow(ctx, fromNode, toNode, color, lineWidth) {
    const headLength = 15; // Longitud de la cabeza de la flecha
    const angle = Math.atan2(toNode.y - fromNode.y, toNode.x - fromNode.x);

    // Ajustamos el punto final para que la flecha no se superponga con el nodo
    const radius = 33; // Radio aproximado del nodo
    const adjustedEndX = toNode.x - Math.cos(angle) * radius;
    const adjustedEndY = toNode.y - Math.sin(angle) * radius;

    // Dibujamos la línea hasta el punto ajustado
    ctx.beginPath();
    ctx.moveTo(fromNode.x, fromNode.y);
    ctx.lineTo(adjustedEndX, adjustedEndY);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.stroke();

    // Dibujamos la cabeza de la flecha
    ctx.beginPath();
    ctx.moveTo(adjustedEndX, adjustedEndY);
    ctx.lineTo(
        adjustedEndX - headLength * Math.cos(angle - Math.PI / 6),
        adjustedEndY - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(adjustedEndX, adjustedEndY);
    ctx.lineTo(
        adjustedEndX - headLength * Math.cos(angle + Math.PI / 6),
        adjustedEndY - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
}

// Función para dibujar una arista recta (caso normal)
function drawStraightEdge(ctx, fromNode, toNode, isSelected, theme) {
    ctx.beginPath();
    ctx.moveTo(fromNode.x, fromNode.y);
    ctx.lineTo(toNode.x, toNode.y);

    ctx.strokeStyle = isSelected ? theme.selectedEdge : theme.edgeLine;
    ctx.lineWidth = isSelected ? 3 : 2;
    ctx.stroke();

    drawArrow(ctx, fromNode, toNode, isSelected ? theme.selectedEdge : theme.edgeLine, isSelected ? 3 : 2);
}


// Función para dibujar una arista curva (aristas bidireccionales)
function drawCurvedEdge(ctx, fromNode, toNode, edge, isSelected, theme, isBidirectional) {
    const color = isSelected ? theme.selectedEdge : theme.edgeLine;
    const lineWidth = isSelected ? 3 : 2;

    // 1. Calcular el punto de control para la curva
    const dx = toNode.x - fromNode.x;
    const dy = toNode.y - fromNode.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const curvature = distance * 0.15;

    const perpX = -dy / distance;
    const perpY = dx / distance;

    const controlX = (fromNode.x + toNode.x) / 2 + perpX * curvature;
    const controlY = (fromNode.y + toNode.y) / 2 + perpY * curvature;

    // 2. Calcular el punto final ajustado en el borde del nodo
    const angleToCenter = Math.atan2(toNode.y - controlY, toNode.x - controlX);
    const radius = toNode.radius || 30;
    const adjustedEndX = toNode.x - Math.cos(angleToCenter) * radius;
    const adjustedEndY = toNode.y - Math.sin(angleToCenter) * radius;

    // 3. Dibujar la curva hasta el punto ajustado
    ctx.beginPath();
    ctx.moveTo(fromNode.x, fromNode.y);
    ctx.quadraticCurveTo(controlX, controlY, adjustedEndX, adjustedEndY);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.stroke();

    // 4. Calcular el ángulo TANGENTE REAL en el punto final ajustado
    const finalAngle = Math.atan2(adjustedEndY - controlY, adjustedEndX - controlX);

    // 5. Dibujar la flecha con el ángulo correcto
    drawArrowHead(ctx, adjustedEndX, adjustedEndY, finalAngle, color, lineWidth);

}

// Función para dibujar auto-loop (self-edge)

/**
 * Dibuja un bucle (arista a sí mismo) con una forma parabólica/ovalada
 * para una apariencia más fluida y estética.
 * @param {CanvasRenderingContext2D} ctx - El contexto del canvas.
 * @param {object} node - El nodo donde se dibuja el bucle.
 * @param {object} edge - El objeto de la arista.
 * @param {boolean} isSelected - Indica si la arista está seleccionada.
 * @param {object} theme - El objeto de tema con los colores.
 * @param {number} drawCount - El índice del bucle (para múltiples bucles).
 */
function drawSelfLoop(ctx, node, edge, isSelected, theme, drawCount) {
    const color = isSelected ? theme.selectedEdge : theme.edgeLine;
    const labels = edge.labels || [edge.label];

    // --- 1. Definir la geometría del bucle ---
    // Rotamos toda la estructura para bucles múltiples.
    const baseAngle = -Math.PI / 2 + (drawCount - 1) * (Math.PI / 2);
    const angleSpread = Math.PI / 8; // Separación entre el inicio y el fin del bucle.

    // Puntos de inicio y fin en la circunferencia del nodo (las "patas").
    const startAngle = baseAngle - angleSpread;
    const endAngle = baseAngle + angleSpread;
    const startX = node.x + node.radius * Math.cos(startAngle);
    const startY = node.y + node.radius * Math.sin(startAngle);
    const endX = node.x + node.radius * Math.cos(endAngle);
    const endY = node.y + node.radius * Math.sin(endAngle);

    // --- 2. Calcular el punto de control para la curva ---
    // Esto define la "altura" y forma del bucle. Aumenta el valor para un bucle más alto.
    const controlPointOffset = 80.0;
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;
    const controlX = midX + controlPointOffset * Math.cos(baseAngle);
    const controlY = midY + controlPointOffset * Math.sin(baseAngle);

    // --- 3. Dibujar la curva parabólica ---
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(controlX, controlY, endX, endY);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();

    // --- 4. Dibujar la flecha ---
    // La flecha se dibuja al final de la curva, alineada con la tangente.
    const arrowAngle = Math.atan2(endY - controlY, endX - controlX);
    drawArrowHead(ctx, endX, endY, arrowAngle, color);

    // --- 5. Dibujar la etiqueta ---
    // La posicionamos cerca del punto más alto de la curva.
    const labelPos = {
        x: controlX,
        y: controlY
    };
    drawEdgeLabel(ctx, labelPos, labels, theme.edgeText);
}

// Función para dibujar la etiqueta de la arista
function drawEdgeLabel(ctx, fromNode, toNode, edge, isSelected, theme, isCurved) {
    if (fromNode.id === toNode.id) return;

    let labelX, labelY;

    // Lógica para calcular la posición base de la etiqueta
    if (isCurved) {
        const dx = toNode.x - fromNode.x;
        const dy = toNode.y - fromNode.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const curvature = distance * 0.15;
        const perpX = -dy / distance;
        const perpY = dx / distance;
        labelX = (fromNode.x + toNode.x) / 2 + perpX * (curvature + 15);
        labelY = (fromNode.y + toNode.y) / 2 + perpY * (curvature + 15);
    } else {
        labelX = (fromNode.x + toNode.x) / 2;
        labelY = (fromNode.y + toNode.y) / 2 - 15; // Un pequeño offset hacia arriba
    }

    ctx.font = '14px Arial';
    ctx.textAlign = 'center';

    // --- LÓGICA DE APILADO ---
    const labels = edge.labels || [edge.label]; // Compatible con aristas viejas
    const lineHeight = 15; // Espacio vertical entre cada etiqueta

    labels.forEach((label, index) => {
        ctx.fillStyle = isSelected ? theme.selectedEdge : theme.edgeText;
        // Dibuja cada etiqueta, una encima de la otra
        ctx.fillText(label, labelX, labelY - (index * lineHeight));
    });
}

// Función auxiliar para dibujar la flecha en aristas curvas
function drawCurvedArrow(ctx, fromNode, toNode, controlX, controlY, color, lineWidth) {
    const headLength = 15;
    const radius = 33;

    // Calcular la dirección de la tangente al final de la curva
    const t = 0.9; // Punto cerca del final para calcular la tangente
    const x1 = (1 - t) * (1 - t) * fromNode.x + 2 * (1 - t) * t * controlX + t * t * toNode.x;
    const y1 = (1 - t) * (1 - t) * fromNode.y + 2 * (1 - t) * t * controlY + t * t * toNode.y;
    const angle = Math.atan2(toNode.y - y1, toNode.x - x1);

    // Ajustar el punto final para que no se superponga con el nodo
    const adjustedEndX = toNode.x - Math.cos(angle) * radius;
    const adjustedEndY = toNode.y - Math.sin(angle) * radius;

    drawArrowHead(ctx, adjustedEndX, adjustedEndY, angle, color, lineWidth);
}

// Función auxiliar para dibujar la cabeza de la flecha
function drawArrowHead(ctx, x, y, angle, color, lineWidth) {
    const headLength = 15;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(
        x - headLength * Math.cos(angle - Math.PI / 6),
        y - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(x, y);
    ctx.lineTo(
        x - headLength * Math.cos(angle + Math.PI / 6),
        y - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
}