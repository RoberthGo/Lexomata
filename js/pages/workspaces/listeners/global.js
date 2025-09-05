exportFormatSelect.addEventListener('change', () => {
    const isPNG = exportFormatSelect.value === 'image/png';

    transparentOption.style.display = isPNG ? 'block' : 'none';

    // Si se cambia a JPEG y "Transparente" estaba seleccionado, vuelve a "Claro"
    if (!isPNG && exportThemeSelect.value === 'transparent') {
        exportThemeSelect.value = 'light';
    }
});