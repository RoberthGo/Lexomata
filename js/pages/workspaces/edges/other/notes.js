function showNoteEditor(element) {
    const modal = document.getElementById('customAlertModal');
    const message = document.getElementById('modalMessage');
    const noteContainer = document.getElementById('noteEditorContainer');
    const textarea = document.getElementById('noteTextarea');
    const saveButton = document.getElementById('noteSaveButton');

    // Configura el título del modal
    const elementType = element.radius ? 'nodo' : 'arista'; // Distingue si es nodo o arista
    const elementName = element.label;
    message.textContent = `Nota para ${elementType}:`;

    // Muestra el editor
    noteContainer.style.display = 'flex';
    textarea.value = element.note || ''; // Carga la nota existente o un texto vacío

    // Muestra el modal
    modal.style.display = 'flex';
    textarea.focus();

    // Define qué hacer cuando se haga clic en "Guardar"
    saveButton.onclick = () => {
        element.note = textarea.value; // Guarda la nota en el objeto (nodo o arista)
        saveState(); // Guarda el cambio en el historial
        closeMessage('customAlertModal'); // Cierra el modal
    };
}
//holales