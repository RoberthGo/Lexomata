const exportModal = document.getElementById('exportModal');

function openExportModal() {
    if (exportModal) {
        // Actualiza el campo del nombre del archivo con el nombre del proyecto actual
        document.getElementById('exportFilename').value = projectName;
        exportModal.style.display = 'flex';
    }
}

function closeExportModal() {
    if (exportModal) {
        exportModal.style.display = 'none';
    }
}