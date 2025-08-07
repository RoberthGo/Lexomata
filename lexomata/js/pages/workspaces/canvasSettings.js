// --- ESTADOS DE ZOOM Y ESCALADO ---
let scale = 1.0;
let panX = 0;
let panY = 0;
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 6.0;
const ZOOM_SENSITIVITY = 0.1;

document.addEventListener('DOMContentLoaded', () => {

    const ctx = canvas.getContext('2d');
    const contextMenu = document.getElementById('canvasContextMenu');

    // --- ESTADOS DE INTERACCIÓN ---
    let draggingNode = null;
    let isPanning = false;
    let panStart = { x: 0, y: 0 };
    let isSpacePressed = false;
    let hasDragged = false;
    let objectClickedOnMouseDown = null;

    canvas.addEventListener('mousedown', (e) => {
        e.preventDefault();
        hasDragged = false;
        objectClickedOnMouseDown = null;

        // 1. Lógica de Paneo 
        if (e.button === 1 || (isSpacePressed && e.button === 0)) {
            isPanning = true;
            panStart = { x: e.clientX, y: e.clientY };
            canvas.style.cursor = 'grabbing';
            return;
        }

        if (e.button === 0 && currentTool === 'select') {
            const worldCoords = getCanvasPoint(e.clientX, e.clientY);
            objectClickedOnMouseDown = getObjectAt(worldCoords.x, worldCoords.y);

            if (objectClickedOnMouseDown && objectClickedOnMouseDown.type === 'node') {
                draggingNode = objectClickedOnMouseDown.object;
            } else {
                isSelecting = true;
                selectionStart = worldCoords;
                selectionEnd = worldCoords;
            }
        }
    });

    canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showCanvasContextMenu(e.clientX, e.clientY);
    });

    window.addEventListener('mousemove', (e) => {

        if (isSelecting) {
            e.preventDefault();
            hasDragged = true;
            const worldCoords = getCanvasPoint(e.clientX, e.clientY);
            selectionEnd = worldCoords;
            redrawCanvas();
            return;
        }

        // Si no hay acción pendiente, no hacer nada
        if (!isPanning && !draggingNode) return;
        e.preventDefault();
        hasDragged = true

        // Lógica de paneo 
        if (isPanning) {
            const dx = e.clientX - panStart.x;
            const dy = e.clientY - panStart.y;
            panX += dx;
            panY += dy;
            panStart = { x: e.clientX, y: e.clientY };
            redrawCanvas();
            return;
        }

        // Lógica de arrastre 
        if (draggingNode) {
            // Si estamos arrastrando un nodo que no estaba seleccionado,
            // lo seleccionamos ahora, en el primer instante del movimiento.
            if (!selectedNodeIds.includes(draggingNode.id)) {

                if (e.shiftKey) {
                    // Si Shift está presionado, AÑADE el nodo a la selección existente.
                    selectedNodeIds.push(draggingNode.id);
                } else {
                    // Si Shift NO está presionado, este se convierte en la ÚNICA selección.
                    selectedNodeIds = [draggingNode.id];
                }
                redrawCanvas();
            }

            // Usamos e.movementX/Y que nos da el delta del movimiento
            // y lo escalamos para que funcione con el zoom.
            const deltaX = e.movementX / scale;
            const deltaY = e.movementY / scale;
            nodes.forEach(node => {
                if (selectedNodeIds.includes(node.id)) {
                    node.x += deltaX;
                    node.y += deltaY;
                }
            });
            redrawCanvas();
        }
    });


    window.addEventListener('mouseup', (e) => {
        const contextMenu = document.getElementById('canvasContextMenu');

        if (contextMenu && contextMenu.contains(e.target)) {
            return;
        }

        // Si estábamos creando un cuadro de selección
        if (isSelecting) {
            if (hasDragged) {
                const nodesInBox = getNodesInSelectionBox(selectionStart, selectionEnd);
                const edgesInBox = getEdgesInSelectionBox(selectionStart, selectionEnd);
                const nodeIdsInBox = nodesInBox.map(node => node.id);
                const edgeIdsInBox = edgesInBox.map(edge => edge.id);

                if (e.shiftKey) {
                    // MODO ADITIVO: Añade los nodos a la selección actual sin duplicados
                    const currentSelectedNodes = new Set([...selectedNodeIds, ...nodeIdsInBox]);
                    const currentSelectedEdges = new Set([...selectedEdgeIds, ...edgeIdsInBox]);
                    selectedNodeIds = Array.from(currentSelectedNodes);
                    selectedEdgeIds = Array.from(currentSelectedEdges);
                } else {
                    // MODO REEMPLAZO: La nueva selección son solo los nodos en el cuadro
                    selectedNodeIds = nodeIdsInBox;
                    selectedEdgeIds = edgeIdsInBox;
                }
            }
            isSelecting = false; // Finaliza el modo de selección
            redrawCanvas();
        }

        if (!hasDragged) {
            if (e.button === 0 && currentTool === 'select') {
                // PRIMERO: Verificar si se hizo clic en una etiqueta (máxima prioridad)
                const worldCoords = getCanvasPoint(e.clientX, e.clientY);
                const labelInfo = detectLabelClick(worldCoords.x, worldCoords.y);
                
                if (labelInfo) {
                    // Si se hizo clic en una etiqueta, entrar en modo de edición y salir inmediatamente
                    e.preventDefault();
                    e.stopPropagation();
                    startLabelEdit(labelInfo);
                    return; // Salir completamente sin procesar más eventos
                }

                // SEGUNDO: Procesar selección de objetos solo si NO se clickeó una etiqueta
                const clickedObject = objectClickedOnMouseDown;
                if (!clickedObject) {
                    selectedEdgeIds = [];
                    selectedNodeIds = [];
                } else if (clickedObject.type == 'node') {
                    const clickedNode = clickedObject.object;
                    if (e.shiftKey) {
                        // Lógica de multiselección con Shift
                        if (clickedNode) {
                            if (selectedNodeIds.includes(clickedNode.id)) {
                                selectedNodeIds = selectedNodeIds.filter(id => id !== clickedNode.id);
                            } else {
                                selectedNodeIds.push(clickedNode.id);
                            }
                        }
                    } else {
                        // Lógica de selección simple
                        if (clickedNode) {
                            const wasSelected = selectedNodeIds.includes(clickedNode.id);
                            const wasGroupSelection = selectedNodeIds.length > 1;

                            if (wasSelected && !wasGroupSelection) {
                                // Clic en el único nodo seleccionado -> deseleccionar
                                selectedNodeIds = [];
                            } else {
                                // Clic en un nodo nuevo o de un grupo -> seleccionar solo este
                                selectedNodeIds = [clickedNode.id];
                            }
                        } else {
                            // Clic en el vacío -> deseleccionar todo
                            selectedNodeIds = [];
                            selectedEdgeIds = [];
                        }
                    }
                } else if (clickedObject.type === 'edge') {
                    // --- LÓGICA DE SELECCIÓN DE ARISTAS ---
                    const edge = clickedObject.object;
                    if (e.shiftKey) {
                        // Multiselección de aristas
                        if (selectedEdgeIds.includes(edge.id)) {
                            selectedEdgeIds = selectedEdgeIds.filter(id => id !== edge.id);
                        } else {
                            selectedEdgeIds.push(edge.id);
                        }
                    } else {
                        // Selección simple de aristas (con toggle)
                        const isAlreadyOnlySelected = selectedEdgeIds.length === 1 && selectedEdgeIds[0] === edge.id;
                        if (isAlreadyOnlySelected) {
                            selectedEdgeIds = [];
                        } else {
                            selectedEdgeIds = [edge.id];
                        }
                    }
                }
                redrawCanvas();
            }
        }

        if (isPanning) {
            isPanning = false;
            canvas.style.cursor = isSpacePressed ? 'grab' : 'default';
        }
        if (hasDragged && draggingNode) {
            saveState();
        }
        draggingNode = null;
    });

    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const zoomFactor = e.deltaY > 0 ? (1 - ZOOM_SENSITIVITY) : (1 + ZOOM_SENSITIVITY);
        const newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, scale * zoomFactor));

        // Ajustar paneo para que el zoom se centre en el cursor
        panX = mouseX - (mouseX - panX) * (newScale / scale);
        panY = mouseY - (mouseY - panY) * (newScale / scale);

        scale = newScale;
        redrawCanvas();
    });

    window.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }
        const key = e.key.toLowerCase();

        if (toolMap[key]) {
            e.preventDefault();
            const toolInfo = toolMap[key];
            const button = document.getElementById(toolInfo.buttonId);
            if (button) {
                changeTool(button, toolInfo.tool);
            }
        }


        if (e.code === 'Space' && !isSpacePressed) {
            e.preventDefault();
            isSpacePressed = true;
            canvas.style.cursor = 'grab';
        }

        let zoomFactor = 1.0;
        if (e.key === '+') {
            zoomFactor = 1 + ZOOM_SENSITIVITY;
        } else if (e.key === '-') {
            zoomFactor = 1 - ZOOM_SENSITIVITY;
        }

        // Si se presionó una tecla de zoom, aplicamos los cambios
        if (zoomFactor !== 1.0) {
            e.preventDefault(); // Evita que el navegador haga zoom en toda la página

            const newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, scale * zoomFactor));

            // Centramos el zoom en el medio del canvas
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;

            // Ajustamos el paneo para que el centro permanezca en su lugar
            panX = centerX - (centerX - panX) * (newScale / scale);
            panY = centerY - (centerY - panY) * (newScale / scale);

            scale = newScale;
            redrawCanvas();
        }

        if (e.key === 'Escape' && exportModal.style.display === 'flex') {
            closeExportModal();
        }
    });

    window.addEventListener('keyup', (e) => {
        if (e.code === 'Space') {
            e.preventDefault();
            isSpacePressed = false;
            if (!isPanning) {
                canvas.style.cursor = 'default';
            }
        }
    });

    window.addEventListener('resize', () => {
        // Reajustamos las dimensiones del área de dibujo del canvas
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;

        // Volvemos a dibujar todo con las nuevas dimensiones
        redrawCanvas();
    });

});


