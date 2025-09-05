function showCanvasContextMenu(x, y) {
    hideCanvasContextMenu();

    const contextMenu = document.getElementById('canvasContextMenu');
    if (!contextMenu) return;

    const menuItems = contextMenu.querySelectorAll('.simple-context-menu-item');
    const hasSelection = selectedEdgeIds.length > 0;

    // Habilita o deshabilita las opciones
    menuItems.forEach(item => {
        item.classList.toggle('disabled', !hasSelection);
    });

    // Mide las dimensiones
    const menuRect = contextMenu.getBoundingClientRect();

    // Calcula la posición para que no se salga de la pantalla
    const xPos = (x + menuRect.width > window.innerWidth) ? window.innerWidth - menuRect.width - 5 : x;
    const yPos = (y + menuRect.height > window.innerHeight) ? window.innerHeight - menuRect.height - 5 : y;

    // Aplica la posición y muestra el menú
    contextMenu.style.left = `${xPos}px`;
    contextMenu.style.top = `${yPos}px`;
    contextMenu.classList.add('visible');

    // Listener para cerrar al hacer clic fuera
    setTimeout(() => document.addEventListener('click', hideCanvasContextMenu), 0);
}

function hideCanvasContextMenu() {
    const contextMenu = document.getElementById('canvasContextMenu');
    if (contextMenu) {
        contextMenu.classList.remove('visible');
    }
    document.removeEventListener('click', hideCanvasContextMenu);
}