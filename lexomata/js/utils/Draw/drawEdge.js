function drawEdge(ctx, edge, nodes, edgeDrawCounts, selectedEdgeId, theme) {
    const fromNode = nodes.find(n => n.id === edge.from);
    const toNode = nodes.find(n => n.id === edge.to);
    if (!fromNode || !toNode) return;

    const isSelected = (edge.id === selectedEdgeId);
    const edgeKeyA = `${fromNode.id}-${toNode.id}`;
    const edgeKeyB = `${toNode.id}-${fromNode.id}`;
    if (!edgeDrawCounts[edgeKeyA]) {
        edgeDrawCounts[edgeKeyA] = 0;
    }
    if (!edgeDrawCounts[edgeKeyB]) {
        edgeDrawCounts[edgeKeyB] = 0;
    }
    edgeDrawCounts[edgeKeyA]+=1;
    edgeDrawCounts[edgeKeyB]+=1;
    const drawCountA = edgeDrawCounts[edgeKeyA];
    const drawCountB = edgeDrawCounts[edgeKeyB];
    edge._drawCount = drawCountA+drawCountB;
    if(drawCountA<=1||drawCountB<=1){
        // Dibuja la línea
        ctx.beginPath();
        ctx.moveTo(fromNode.x, fromNode.y);
        ctx.lineTo(toNode.x, toNode.y);
 
        drawArrow(ctx, fromNode, toNode, isSelected ? theme.selectedEdge : theme.edgeLine, isSelected ? 3 : 2); 

        // Cambia el estilo si está seleccionada
        ctx.strokeStyle = isSelected ? theme.selectedEdge : theme.edgeLine;
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.stroke();
    }

    // Store the drawCount on the edge for use when drawing the label
    
    //console.log(`Drawing edge from ${fromNode.label} to ${toNode.label}, draw count: ${drawCount}`);
    // Dibuja la etiqueta
    const midX = (fromNode.x + toNode.x) / 2;
    const midY = (fromNode.y + toNode.y) / 2;
    ctx.fillStyle = isSelected ? theme.selectedEdge : theme.edgeText;
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    console.log(edgeKeyA,edgeKeyB);
    ctx.fillText(edge.label, midX, midY - (12 * (drawCountA + drawCountB + 1)));
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