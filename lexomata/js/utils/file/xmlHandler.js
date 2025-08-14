// Parses a JFLAP .jff XML file and loads states and transitions into the workspace
function parseAndLoadJFF(fileContent) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(fileContent, 'application/xml');
    const automaton = xmlDoc.querySelector('automaton');
    if (!automaton) {
        alert('Formato JFF inválido: no se encontró <automaton>');
        return;
    }
    // Detect JFLAP file type (finite automaton or Turing)
    const typeElem = xmlDoc.querySelector('type');
    const isTuring = typeElem && typeElem.textContent.trim().toLowerCase() === 'turing';
    // Validar compatibilidad con el modo actual de la página
    const params = new URLSearchParams(window.location.search);
    const currentMode = params.get('mode') || 'automata';
    if (currentMode === 'turing' && !isTuring) {
        alert("El archivo no tiene la información válida. Se esperaba un archivo de máquina de Turing pero se detectó un autómata.");
        return;
    }
    if (currentMode !== 'turing' && isTuring) {
        alert("El archivo no tiene la información válida. Se esperaba un archivo de autómata pero se detectó una máquina de Turing.");
        return;
    }

    // Parse states or blocks based on machine type
    const stateTag = isTuring ? 'block' : 'state';
    const stateElems = automaton.querySelectorAll(stateTag);
    nodes = [];
    let maxId = -1;
    stateElems.forEach(elem => {
        const id = parseInt(elem.getAttribute('id'), 10);
        maxId = Math.max(maxId, id);
        const name = elem.getAttribute('name');
        const x = parseFloat(elem.querySelector('x').textContent);
        const y = parseFloat(elem.querySelector('y').textContent);
        const node = new State(id, name, x, y);
        if (elem.querySelector('initial')) node.IsStart = true;
        if (elem.querySelector('final')) node.IsEnd = true;
        nodes.push(node);
    });
    nodeCounter = maxId + 1;

    // Parse transitions agrupando por origen-destino para evitar duplicados y undefined
    const transElems = automaton.querySelectorAll('transition');
    const edgeMap = {};
    transElems.forEach(elem => {
        const from = parseInt(elem.querySelector('from').textContent, 10);
        const to = parseInt(elem.querySelector('to').textContent, 10);
        const key = `${from}-${to}`;
        if (!edgeMap[key]) edgeMap[key] = { from, to, labels: [] };
        if (isTuring) {
            // Map empty cells in JFF to blank symbol '□' for consistent matching
            let readVal = elem.querySelector('read')?.textContent || '';
            readVal = readVal.trim() === '' ? '□' : readVal.trim();
            let writeVal = elem.querySelector('write')?.textContent || '';
            writeVal = writeVal.trim() === '' ? '□' : writeVal.trim();
            const moveDir = (elem.querySelector('move')?.textContent || '').trim();
            // Formato 'leer,escribir,mover'
            edgeMap[key].labels.push(`${readVal},${writeVal},${moveDir}`);
        } else {
            const symbol = elem.querySelector('read')?.textContent || '';
            // Cada carácter es una etiqueta
            symbol.split('').forEach(ch => edgeMap[key].labels.push(ch));
        }
    });
    // Construir objetos de arista finales
    edges = Object.values(edgeMap).map(item => {
        if (isTuring) {
            // Usa el helper de creación para manejar múltiples transiciones
            return typeof createTuringEdge === 'function'
                ? createTuringEdge(item.from, item.to, item.labels)
                : new EdgeTuring(item.from, item.to, [], item.labels[0]?.split(',')[0] || '', item.labels[0]?.split(',')[1] || '', item.labels[0]?.split(',')[2] || '');
        } else {
            // Convierte etiquetas simples a objetos para dibujado
            const labels = item.labels.map(ch => ({ text: ch }));
            return new EdgeAutomata(item.from, item.to, labels);
        }
    });

    // Reset selection and history
    selectedNodeIds = [];
    selectedEdgeIds = [];
    history = [];
    historyIndex = -1;
    saveState();
    redrawCanvas();
    // Inicializar validaciones para crear hitboxes de etiquetas
    if (typeof initializeEdgeValidations === 'function') {
        initializeEdgeValidations();
    }
}

// Expose for file management
window.parseAndLoadJFF = parseAndLoadJFF;