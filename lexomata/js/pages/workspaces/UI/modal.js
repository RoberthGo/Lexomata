const customAlertModal = document.getElementById('customAlertModal');
const modalMessage = document.getElementById('modalMessage');

function showMessage(message) {
    modalMessage.textContent = message;
    customAlertModal.style.display = 'flex';
}

function closeMessage(id) {
    // Oculta el contenedor de notas si existe
    const noteContainer = document.getElementById('noteEditorContainer');
    if (noteContainer) {
        noteContainer.style.display = 'none';
    }

    // Oculta el modal principal
    const modalToClose = document.getElementById(id);
    if (modalToClose) {
        modalToClose.style.display = 'none';
    }
}