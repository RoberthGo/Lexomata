function drawEdge(ctx, edge, nodes, edgeDrawCounts, selectedEdgeIds, theme) {
    const fromNode = nodes.find(n => n.id === edge.from);
    const toNode = nodes.find(n => n.id === edge.to);
    if (!fromNode || !toNode) return;

    const isSelected = selectedEdgeIds.includes(edge.id);

    // Lógica para auto-loops (sin cambios, se maneja primero)
    if (fromNode.id === toNode.id) {
        const edgeKeyA = `${fromNode.id}-${toNode.id}`;
        if (!edgeDrawCounts[edgeKeyA]) { edgeDrawCounts[edgeKeyA] = 0; }
        edgeDrawCounts[edgeKeyA]++;
        drawSelfLoop(ctx, fromNode, edge, isSelected, theme, edgeDrawCounts[edgeKeyA]);
        return;
    }

    const oppositeEdgeExists = edges.some(e => e.from === edge.to && e.to === edge.from);

    if (oppositeEdgeExists) {
        // --- LÓGICA CORREGIDA PARA ARISTAS CURVAS ---
        const dx = toNode.x - fromNode.x;
        const dy = toNode.y - fromNode.y;

        // Evita división por cero si los nodos están en el mismo lugar
        if (dx === 0 && dy === 0) return;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Se calcula el vector perpendicular UNA VEZ aquí.
        const perpX = -dy / distance;
        const perpY = dx / distance;

        // Se llama a las funciones de ayuda con los parámetros CORRECTOS.
        drawCurvedEdge(ctx, fromNode, toNode, isSelected, theme, perpX, perpY);
        drawEdgeLabel(ctx, fromNode, toNode, edge, isSelected, theme, true, perpX, perpY);

    } else {
        // --- LÓGICA PARA ARISTAS RECTAS (sin cambios) ---
        drawStraightEdge(ctx, fromNode, toNode, isSelected, theme);
        drawEdgeLabel(ctx, fromNode, toNode, edge, isSelected, theme, false, null, null);
    }
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
function drawCurvedEdge(ctx, fromNode, toNode, isSelected, theme, perpX, perpY) {
    const color = isSelected ? theme.selectedEdge : theme.edgeLine;
    const lineWidth = isSelected ? 3 : 2;
    const distance = Math.sqrt(Math.pow(toNode.x - fromNode.x, 2) + Math.pow(toNode.y - fromNode.y, 2));

    // --- INICIO DE LA MODIFICACIÓN ---
    // Se establece una curvatura máxima para evitar que la arista se infle demasiado.
    // Puedes ajustar este valor si quieres curvas más o menos pronunciadas.
    const maxCurvature = 40;
    const curvature = Math.min(maxCurvature, distance * 0.15);
    // --- FIN DE LA MODIFICACIÓN ---

    const controlX = (fromNode.x + toNode.x) / 2 + perpX * curvature;
    const controlY = (fromNode.y + toNode.y) / 2 + perpY * curvature;

    const angleToCenter = Math.atan2(toNode.y - controlY, toNode.x - controlX);
    const radius = toNode.radius || 30;
    const adjustedEndX = toNode.x - Math.cos(angleToCenter) * radius;
    const adjustedEndY = toNode.y - Math.sin(angleToCenter) * radius;

    ctx.beginPath();
    ctx.moveTo(fromNode.x, fromNode.y);
    ctx.quadraticCurveTo(controlX, controlY, adjustedEndX, adjustedEndY);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.stroke();

    const finalAngle = Math.atan2(adjustedEndY - controlY, adjustedEndX - controlX);
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
    const lineWidth = isSelected ? 3 : 2;

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
    ctx.lineWidth = lineWidth;
    ctx.stroke();

    // --- 4. Dibujar la flecha ---
    // La flecha se dibuja al final de la curva, alineada con la tangente.
    const arrowAngle = Math.atan2(endY - controlY, endX - controlX);
    drawArrowHead(ctx, endX, endY, arrowAngle, color, lineWidth);

    // --- 5. Dibujar la etiqueta ---
    // Esta sección ahora maneja el dibujado de la etiqueta directamente,
    // usando el punto de control como ancla para el texto.
    const rawLabels = edge.labels || [edge.label];
    // Asegurar que cada label sea un objeto con propiedad text
    const labels = rawLabels.map(label => (typeof label === 'object' ? label : { text: label }));
    const lineHeight = 15; // Espacio vertical entre cada etiqueta

    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = isSelected ? theme.selectedEdge : theme.edgeText;

    // Apilamos las etiquetas hacia arriba desde el punto de control de la curva.
    labels.forEach((labelObj, index) => {
        // Se dibuja cada etiqueta, con un desplazamiento vertical para apilarlas.
        // Un pequeño offset adicional (5px) las separa de la línea.
        ctx.fillText(labelObj.text, controlX, controlY - (index * lineHeight) + 32);
    });
}

// Función para dibujar la etiqueta de la arista
function drawEdgeLabel(ctx, fromNode, toNode, edge, isSelected, theme, isCurved, perpX, perpY) {
    if (fromNode.id === toNode.id) return;

    const worldOffset = 12;
    const lineHeight = 15;
    let labelX, labelY;

    ctx.font = '14px Arial';
    ctx.textAlign = 'center';

    // Verificar si labelEditState está disponible
    const hasEditState = typeof labelEditState !== 'undefined';

    // Nos aseguramos de tener un arreglo de objetos para los labels.
    // Si el label es un string, lo convertimos.
    const rawLabels = edge.labels || [edge.label];
    // Actualizamos edge.labels para que cada label sea un objeto con su propiedad text.
    edge.labels = rawLabels.map(label => (typeof label === 'object' ? label : { text: label }));

    if (isCurved) {
        const dx = toNode.x - fromNode.x;
        const dy = toNode.y - fromNode.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const maxCurvature = 40;
        const curvature = Math.min(maxCurvature, distance * 0.15);
        const controlX = (fromNode.x + toNode.x) / 2 + perpX * curvature;
        const controlY = (fromNode.y + toNode.y) / 2 + perpY * curvature;
        const midCurveX = 0.25 * fromNode.x + 0.5 * controlX + 0.25 * toNode.x;
        const midCurveY = 0.25 * fromNode.y + 0.5 * controlY + 0.25 * toNode.y;

        labelX = midCurveX + perpX * worldOffset;
        labelY = midCurveY + perpY * worldOffset;

        // Ajusta el baseline según la dirección vertical
        ctx.textBaseline = (perpY < 0 ? 'bottom' : 'top');

        edge.labels.forEach((labelObj, index) => {
            const stackOffsetX = index * lineHeight * perpX;
            const stackOffsetY = index * lineHeight * perpY;
            const currentX = labelX + stackOffsetX;
            const currentY = labelY + stackOffsetY;

            // Verificar si esta etiqueta está siendo editada
            const isBeingEdited = hasEditState && labelEditState.isActive &&
                labelEditState.edge === edge &&
                labelEditState.labelIndex === index;

            if (isBeingEdited) {
                // Dibujar con efecto de edición
                drawEditingLabel(ctx, labelObj.text, currentX, currentY, theme);
            } else {
                // Dibujar normalmente
                ctx.fillStyle = isSelected ? theme.selectedEdge : theme.edgeText;
                ctx.fillText(labelObj.text, currentX, currentY);
            }

            // Medir el texto para obtener el cuadro de colisión (hitbox)
            const metrics = ctx.measureText(labelObj.text);
            const textWidth = metrics.width + 10; // margen extra
            const textHeight = 18; // altura fija
            // Guardar la información en el propio objeto label
            labelObj.x = currentX - (textWidth / 2);
            labelObj.y = currentY - (textHeight / 2);
            labelObj.width = textWidth;
            labelObj.height = textHeight;
        });

    } else {
        labelX = (fromNode.x + toNode.x) / 2;
        labelY = (fromNode.y + toNode.y) / 2 - worldOffset;
        ctx.textBaseline = 'bottom';

        edge.labels.forEach((labelObj, index) => {
            const currentY = labelY - (index * lineHeight);

            // Verificar si esta etiqueta está siendo editada
            const isBeingEdited = hasEditState && labelEditState.isActive &&
                labelEditState.edge === edge &&
                labelEditState.labelIndex === index;

            if (isBeingEdited) {
                // Dibujar con efecto de edición
                drawEditingLabel(ctx, labelObj.text, labelX, currentY, theme);
            } else {
                // Dibujar normalmente
                ctx.fillStyle = isSelected ? theme.selectedEdge : theme.edgeText;
                ctx.fillText(labelObj.text, labelX, currentY);
            }

            const metrics = ctx.measureText(labelObj.text);
            const textWidth = metrics.width + 10;
            const textHeight = 18;
            labelObj.x = labelX - textWidth / 2;
            labelObj.y = currentY - textHeight / 2;
            labelObj.width = textWidth;
            labelObj.height = textHeight;
        });
    }

    // Resetear baseline
    ctx.textBaseline = 'alphabetic';
}

/**
 * Dibuja una etiqueta en modo de edición con efectos visuales
 * @param {CanvasRenderingContext2D} ctx - Contexto del canvas
 * @param {string} text - Texto de la etiqueta
 * @param {number} x - Coordenada X
 * @param {number} y - Coordenada Y
 * @param {Object} theme - Tema de colores
 */
function drawEditingLabel(ctx, text, x, y, theme) {
    ctx.save();

    // Fondo semi-transparent para destacar la edición
    const metrics = ctx.measureText(text || '');
    const padding = 4;
    const backgroundWidth = Math.max(metrics.width + padding * 2, 20); // Mínimo ancho para cursor
    const backgroundHeight = 17;
    // Ajuste vertical para centrar el cuadrado azul
    const verticalOffset = 8;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(
        x - backgroundWidth / 2,
        y - backgroundHeight / 2 - verticalOffset,
        backgroundWidth,
        backgroundHeight
    );

    // Borde para el área de edición
    ctx.strokeStyle = '#007acc';
    ctx.lineWidth = 2;
    ctx.strokeRect(
        x - backgroundWidth / 2,
        y - backgroundHeight / 2 - verticalOffset,
        backgroundWidth,
        backgroundHeight
    );

    // Texto de la etiqueta
    ctx.fillStyle = '#000000';
    if (text) {
        ctx.fillText(text, x, y);
    }

    // Cursor parpadeante (solo si labelEditState está disponible)
    if (typeof labelEditState !== 'undefined' && labelEditState.showCursor) {
        const textBeforeCursor = (text || '').substring(0, labelEditState.cursorPosition);
        const cursorX = x - (metrics.width / 2) + ctx.measureText(textBeforeCursor).width;

        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.beginPath();
        // Ajuste vertical para centrar cursor dentro del recuadro
        ctx.moveTo(cursorX, y - 6 - verticalOffset);
        ctx.lineTo(cursorX, y + 6 - verticalOffset);
        ctx.stroke();
    }

    ctx.restore();
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