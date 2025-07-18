function getObject(event) {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
    // Recorrer edges desde el final hacia el principio
    for (let i = edges.length - 1; i >= 0; i--) {
        const edge = edges[i];
        // Verificar si el click está cerca de la línea del edge
        const distance = distanceToLine(x, y, edge.x1, edge.y1, edge.x2, edge.y2);
        //console.log()
        if (distance <= 5) { // Tolerancia de 5 píxeles
            return { type: 'edge', index: i, object: edges[i] };
        }
    }

    // Recorrer states desde el final hacia el principio
    for (let i = states.length - 1; i >= 0; i--) {
        const state = states[i];
        console.log(state.x+" "+state.y);
        // Verificar si el click está dentro del círculo
        const distance = Math.sqrt(Math.pow(x - state.x, 2) + Math.pow(y - state.y, 2));
        console.log(distance);
        if (distance <= NODE_RADIUS) {
            return { type: 'state', index: i, object: states[i] };
        }
    }
    return null;
}

function selectTool(x,y){
    console.log(getObject(x,y));
}

function moveNode() {

}


function moveEdge() {

}

function getCanvasPoint(X, Y) {
    // 1. Obtener la posición del canvas relativo al viewport
    const rect = canvas.getBoundingClientRect();

    // 2. Calcular las coordenadas del mouse relativas al canvas

    /*  // 4. Obtener la matriz de transformación actual del contexto
      const transform = ctx.getTransform();
  
      // 5. Crear la matriz inversa para convertir a coordenadas lógicas
      const invTransform = transform.invertSelf();
  
      // 6. Aplicar la transformación inversa
      const logicalX = invTransform.a * xInDevicePx + invTransform.c * yInDevicePx + invTransform.e;
      const logicalY = invTransform.b * xInDevicePx + invTransform.d * yInDevicePx + invTransform.f;
  
  */
    const logicalX = (X / (dpr * zoom_level));// - offsetX;
    const logicalY = (Y / (dpr * zoom_level));// - offsetY;

    return {
        x: logicalX,
        y: logicalY
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

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < states.length; i++) {
        console.log(states[i].x + "   " + states[i].y);
        drawNode(states[i].x, states[i].y);
    }
}