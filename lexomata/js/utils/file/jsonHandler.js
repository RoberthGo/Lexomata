/**
 * Serializa el estado del autómata a un string JSON y lo descarga como un archivo.
 * Pide al usuario un nombre para el archivo antes de guardar.
 * @param {Array} nodes - El arreglo de nodos del estado actual.
 * @param {Array} edges - El arreglo de aristas del estado actual.
 * @param {number} nodeCounter - El contador actual para las etiquetas de los nodos.
 */
function exportAsJSON(nodes, edges, nodeCounter) {
    // 1. Pide al usuario un nombre para el archivo.
    const fileName = prompt("Ingresa el nombre para guardar el archivo:", projectName);

    // 2. Si el usuario cancela o no escribe nada, se detiene la función.
    if (!fileName) {
        return;
    }

    // 3. Prepara el objeto con los datos a guardar.
    const saveData = {
        nodes: nodes,
        edges: edges,
        nodeCounter: nodeCounter
    };

    // 4. Convierte el objeto a un string de texto JSON formateado.
    const jsonString = JSON.stringify(saveData, null, 2);

    // 5. Crea un Blob y el enlace de descarga.
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = url;
    a.download = `${fileName}.json`; // Usa el nombre proporcionado por el usuario.
    document.body.appendChild(a);
    a.click();

    // 6. Limpia el enlace y la URL creados.
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}


function parseAndLoadJSON(fileContent) {
    try {
        const data = JSON.parse(fileContent);
        // Valida que el archivo tenga la estructura esperada
        if (data && data.nodes && data.edges) {
            // Actualiza el estado de la aplicación con los datos del archivo
            nodes = data.nodes;
            edges = data.edges;
            nodeCounter = data.nodeCounter || 0;

            // Guarda este nuevo estado en el historial y redibuja
            history = [];
            historyIndex = -1;
            saveState();
            selectedNodeIds = [];
            selectedEdgeId = null;
            redrawCanvas();
        } else {
            alert("El archivo JSON no tiene el formato esperado.");
        }
    } catch (error) {
        alert("Error al leer el archivo. Asegúrate de que sea un JSON válido.");
    }
}