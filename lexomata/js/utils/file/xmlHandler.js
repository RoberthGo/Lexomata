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

    // Parse transitions according to machine type
    const transElems = automaton.querySelectorAll('transition');
    edges = [];
    transElems.forEach(elem => {
        const from = parseInt(elem.querySelector('from').textContent, 10);
        const to = parseInt(elem.querySelector('to').textContent, 10);
        if (isTuring) {
            const readVal = elem.querySelector('read')?.textContent || '';
            const writeVal = elem.querySelector('write')?.textContent || '';
            const moveDir = elem.querySelector('move')?.textContent || '';
            edges.push(new EdgeTuring(from, to, [], readVal, writeVal, moveDir));
        } else {
            const readNode = elem.querySelector('read');
            const symbol = readNode ? readNode.textContent : '';
            // Labels array of objects
            const labels = symbol.split('').map(ch => ({ text: ch }));
            edges.push(new EdgeAutomata(from, to, labels));
        }
    });

    // Reset selection and history
    selectedNodeIds = [];
    selectedEdgeIds = [];
    history = [];
    historyIndex = -1;
    saveState();
    redrawCanvas();
}

// Expose for file management
window.parseAndLoadJFF = parseAndLoadJFF;