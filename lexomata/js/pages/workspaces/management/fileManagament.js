let projectName = 'nuevo-';
let autoSaveInterval = 5000; // 5s

function openFile() {
    // 1. Crea un input de tipo "file" oculto que acepta múltiples extensiones.
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json, .jff'; // Permite seleccionar varios tipos de archivo

    // 2. Define qué hacer cuando el usuario seleccione un archivo.
    input.onchange = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        projectName = file.name.replace(/\.[^/.]+$/, '');
        const reader = new FileReader();

        // 3. Cuando el archivo se lea, decide qué hacer según la extensión.
        reader.onload = (e) => {
            const fileContent = e.target.result;
            const fileName = file.name.toLowerCase();

            if (fileName.endsWith('.json')) {

                parseAndLoadJSON(fileContent);
            } else if (fileName.endsWith('.jff')) {

            } else {
                alert("Tipo de archivo no soportado.");
            }
        };

        reader.readAsText(file);
    };

    // 4. Simula un clic para abrir el diálogo de "Abrir archivo".
    input.click();
}
function newFile() {
    const userConfirmed = confirm("¿Estás seguro de que quieres crear un nuevo archivo? Perderás cualquier cambio no guardado.");

    if (userConfirmed) {
        const name = prompt("Ingresa el nombre del nuevo proyecto:", projectName);
        if (name) {
            projectName = name;
        }

        // Reinicia el estado de la aplicación
        nodes = [];
        edges = [];
        nodeCounter = 0;
        selectedNodeIds = [];
        selectedEdgeIds = [];

        // Limpia el historial y guarda el nuevo estado vacío
        history = [];
        historyIndex = -1;
        saveState();

        // Redibuja el lienzo vacío
        redrawCanvas();
    }
}

function autoSaveToLocalStorage() {
    const storageKey = `lexomata_autosave_${currentMode}`;
    // Se prepara el objeto con todo lo necesario para guardar
    const stateToSave = {
        nodes: nodes,
        edges: edges,
        nodeCounter: nodeCounter,
        projectName: projectName,
        lastSave: new Date().getTime() // Guarda la fecha del guardado
    };

    // Convierte el objeto a texto JSON y lo guarda en localStorage.
    localStorage.setItem(storageKey, JSON.stringify(stateToSave));
}
function loadFromLocalStorage() {
    const storageKey = `lexomata_autosave_${currentMode}`;
    const savedStateJSON = localStorage.getItem(storageKey);
    if (!savedStateJSON) return;

    const savedState = JSON.parse(savedStateJSON);

    nodes = savedState.nodes.map(nodeData => {
        const node = new State(nodeData.id, nodeData.label, nodeData.x, nodeData.y);
        node.IsStart = nodeData.IsStart || false;
        node.IsEnd = nodeData.IsEnd || false;
        node.note = nodeData.note || "";
        return node;
    });

    edges = savedState.edges.map(edgeData => {
        let edge;
        if (currentMode === 'turing') {
            edge = createTuringEdge(edgeData.from, edgeData.to, edgeData.labels);
            edge.transitions = edgeData.transitions || [];
        } else {
            edge = new EdgeAutomata(edgeData.from, edgeData.to, edgeData.labels, edgeData.IsMetaCaracter);
        }
        // Guarda la nota que se había editado
        edge.note = edgeData.note || "";
        return edge;
    });

    nodeCounter = savedState.nodeCounter;
    projectName = savedState.projectName;

    history = [];
    historyIndex = -1;
    saveState();
    redrawCanvas();
}
