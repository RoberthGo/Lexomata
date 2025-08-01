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
    
    // Calcular puntos de control para la curva
    const dx = toNode.x - fromNode.x;
    const dy = toNode.y - fromNode.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Determinar el offset de curvatura basado en la dirección
    const curvature = distance * 0.15; // 15% de la distancia como curvatura
    
    // Vector perpendicular para el offset
    const perpX = -dy / distance;
    const perpY = dx / distance;
    
    // Punto de control para la curva (offset hacia un lado)
    const controlX = (fromNode.x + toNode.x) / 2 + perpX * curvature;
    const controlY = (fromNode.y + toNode.y) / 2 + perpY * curvature;
    
    // Dibujar la curva
    ctx.beginPath();
    ctx.moveTo(fromNode.x, fromNode.y);
    ctx.quadraticCurveTo(controlX, controlY, toNode.x, toNode.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
    
    // Dibujar la flecha en el extremo de la curva
    drawCurvedArrow(ctx, fromNode, toNode, controlX, controlY, color, lineWidth);
}

// Función para dibujar auto-loop (self-edge)
function drawSelfLoop(ctx, node, edge, isSelected, theme, edgeCounts) {
    const color = isSelected ? theme.selectedEdge : theme.edgeLine;
    const lineWidth = isSelected ? 3 : 2;
    const radius = node.radius || 33;
    const loopRadius = radius * 0.8;
    
    // Posición del loop (arriba del nodo)
    const centerX = node.x;
    const centerY = node.y - radius - loopRadius;
    
    // Puntos de conexión con el nodo
    const startAngle = Math.PI * 0.25; // 45 grados
    const endAngle = Math.PI * 0.75;   // 135 grados
    
    const startX = node.x - Math.cos(startAngle) * radius;
    const startY = node.y - Math.sin(startAngle) * radius;
    const endX = node.x - Math.cos(endAngle) * radius;
    const endY = node.y - Math.sin(endAngle) * radius;
    
    // Dibujar las líneas y el arco
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    
    // Línea desde el nodo hasta el inicio del loop
    ctx.moveTo(startX, startY);
    ctx.lineTo(centerX - loopRadius, centerY);
    
    // Dibujar el arco del loop
    ctx.arc(centerX, centerY, loopRadius, Math.PI, 0, false);
    
    // Línea desde el final del loop hasta el nodo
    ctx.lineTo(endX, endY);
    
    ctx.stroke();
    
    // Dibujar la flecha al final del loop
    // Calcular el ángulo correcto para la flecha que apunta hacia el nodo
    const arrowAngle = Math.atan2(node.y - endY, node.x - endX);
    
    // Dibujar la cabeza de la flecha
    const headLength = 15;
    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(
        endX - headLength * Math.cos(arrowAngle - Math.PI / 6),
        endY - headLength * Math.sin(arrowAngle - Math.PI / 6)
    );
    ctx.moveTo(endX, endY);
    ctx.lineTo(
        endX - headLength * Math.cos(arrowAngle + Math.PI / 6),
        endY - headLength * Math.sin(arrowAngle + Math.PI / 6)
    );
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
    
    // Dibujar la etiqueta del self-loop
    ctx.fillStyle = isSelected ? theme.selectedEdge : theme.edgeText;
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(edge.label, centerX, centerY - (12 * (edgeCounts + 1)));
}

// Función para dibujar la etiqueta de la arista
function drawEdgeLabel(ctx, fromNode, toNode, edge, isSelected, theme, isCurved) {
    if (fromNode.id === toNode.id) return; // Los self-loops ya dibujan su etiqueta
    
    let labelX, labelY;
    
    if (isCurved) {
        // Para aristas curvas, colocar la etiqueta en el punto medio de la curva
        const dx = toNode.x - fromNode.x;
        const dy = toNode.y - fromNode.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const curvature = distance * 0.15;
        
        const perpX = -dy / distance;
        const perpY = dx / distance;
        
        labelX = (fromNode.x + toNode.x) / 2 + perpX * curvature;
        labelY = (fromNode.y + toNode.y) / 2 + perpY * curvature;
    } else {
        // Para aristas rectas, usar el punto medio
        labelX = (fromNode.x + toNode.x) / 2;
        labelY = (fromNode.y + toNode.y) / 2;
    }
    
    ctx.fillStyle = isSelected ? theme.selectedEdge : theme.edgeText;
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(edge.label, labelX, labelY - (12 * (edge._drawCount + 1)));
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