const colorPalette = {
    light: {
        background: '#FFFFFF',
        nodeFill: '#f5f0d9',          // Color Crema de la imagen
        nodeStroke: '#2c2140',        // Color Índigo oscuro para el borde
        nodeText: '#2c2140',          // Color Índigo oscuro para el texto
        // Un verde muy oscuro para el texto, como en la imagen

        // ---> ESTADO SELECCIONADO: LA VIBRA DE TU IMAGEN <---
        selectedNodeText: '#2c2140',  // Índigo oscuro, se lee bien sobre el Durazno
        selectedNodeFill: '#f4c8a2',  // Color Durazno de la imagen
        selectedNodeStroke: '#2c2140',// Mantenemos el borde oscuro para unificar el estilo   borde menta brillante de la imagen

        // ---> ARISTAS A JUEGO <---
        edgeLine: '#6a9a9a',          // Color Verde Azulado (Teal) para la línea
        edgeText: '#2c2140',          // Índigo oscuro para el texto de la arista

        // ---> SELECCIÓN DE ARISTAS Y CUADRO <---
        selectedEdge: '#65401fff',
        // Colores de la cinta de Turing
        turingCellFill: '#ffffff',
        turingCellStroke: '#ccc',
        turingCellText: '#333',
        turingIndexText: '#666',
        turingHeadStroke: '#20c997',
        // CUADRO DE SELECCION
        selectionBoxFill: 'rgba(32, 201, 151, 0.2)',  // Relleno del cuadro de selección
        selectionBoxStroke: 'rgba(32, 201, 151, 1)'
    },
    dark: {
        background: '#2d3748',
        nodeFill: '#1A202C',
        nodeStroke: '#F7FAFC',
        nodeText: '#F7FAFC',
        selectedNodeFill: '#2C5282',
        selectedNodeStroke: '#63B3ED',
        selectedNodeText: '#F7FAFC',
        edgeLine: '#A0AEC0',
        edgeText: '#E2E8F0',
        selectedEdge: '#FC8181',
        // Colores de la cinta de Turing
        turingCellFill: '#1a1a2e',
        turingCellStroke: '#3a3a50',
        turingCellText: '#e0e0e0',
        turingIndexText: '#a0a0a0',
        turingHeadStroke: '#20c997',
        // CUADRO DE SELECCION
        selectionBoxFill: 'rgba(135, 206, 250, 0.2)', // Relleno celeste semi-transparente
        selectionBoxStroke: 'rgba(135, 206, 250, 1)'
    }
};

function toggleTheme() {
    document.body.classList.toggle('dark');
    document.querySelectorAll('.submenu').forEach(sub => sub.style.display = 'none');
    redrawCanvas();

    // Redibujar la cinta de Turing si existe
    if (typeof drawTuringTape === 'function') {
        drawTuringTape();
    }
}