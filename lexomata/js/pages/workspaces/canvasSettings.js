// --- ESTADOS DE ZOOM Y ESCALADO ---
let scale = 1.0;
let panX = 0;
let panY = 0;
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 4.0;
const ZOOM_SENSITIVITY = 0.1;

document.addEventListener('DOMContentLoaded', () => {

    const ctx = canvas.getContext('2d');

    // --- ESTADOS DE INTERACCIÓN ---
    let draggingNode = null;
    let isPanning = false;
    let panStart = { x: 0, y: 0 };
    let isSpacePressed = false;
    let hasDragged = false;

    canvas.addEventListener('mousedown', (e) => {
        e.preventDefault();
        hasDragged = false;

        // 1. Lógica de Paneo 
        if (e.button === 1 || (isSpacePressed && e.button === 0)) {
            isPanning = true;
            panStart = { x: e.clientX, y: e.clientY };
            canvas.style.cursor = 'grabbing';
            return;
        }

        if (e.button === 0 && currentTool === 'select') {
            const worldCoords = getCanvasPoint(e.clientX, e.clientY);
            const clickedObject = getObjectAt(worldCoords.x, worldCoords.y);

            // --- MANEJO DE LA SELECCIÓN ---
            if (e.shiftKey) { // SI SE USA SHIFT (Añadir/Quitar)
                if (clickedObject && clickedObject.type === 'node') {
                    const nodeId = clickedObject.object.id;
                    if (selectedNodeIds.includes(nodeId)) {
                        // Si ya está seleccionado, lo quitamos
                        selectedNodeIds = selectedNodeIds.filter(id => id !== nodeId);
                    } else {
                        // Si no está, lo añadimos
                        selectedNodeIds.push(nodeId);
                    }
                }
            } else { // SI NO SE USA SHIFT (Selección normal)
                if (clickedObject && clickedObject.type === 'node') {
                    // Si el nodo no estaba ya seleccionado, se convierte en la única selección.
                    // Si ya estaba seleccionado, no hacemos nada para permitir el arrastre del grupo.
                    if (!selectedNodeIds.includes(clickedObject.object.id)) {
                        selectedNodeIds = [clickedObject.object.id];
                    }
                    selectedEdgeId = null;
                } else if (clickedObject && clickedObject.type === 'edge') {
                    selectedEdgeId = clickedObject.object.id;
                    selectedNodeIds = [];
                } else if (clickedObject === null) {
                    // Si se hace clic en el vacío, se deselecciona todo.
                    selectedNodeIds = [];
                    selectedEdgeId = null;
                }
            }

            // Si después de la lógica de selec ción, el clic fue sobre un nodo, preparamos el arrastre.
            if (clickedObject && clickedObject.type === 'node') {
                draggingNode = clickedObject.object;
            }

            redrawCanvas();
        }
    });


    window.addEventListener('mousemove', (e) => {
        hasDragged = true

        // Si no hay acción pendiente, no hacer nada
        if (!isPanning && !draggingNode) {
            return;
        }

        e.preventDefault();

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
            // Usamos e.movementX/Y que nos da el delta del movimiento
            // y lo escalamos para que funcione con el zoom. ¡ESTA ES LA FORMA CORRECTA!
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


