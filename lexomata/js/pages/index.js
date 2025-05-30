// Función para alternar entre el modo claro y oscuro
function toggleTheme() {
    const body = document.body;
    // Simplemente alterna la clase 'dark' en el body
    body.classList.toggle('dark'); 
}

// Obtener referencias al modal y sus elementos
const customAlertModal = document.getElementById('customAlertModal');
const modalMessage = document.getElementById('modalMessage');

// Función para mostrar el modal con un mensaje específico
function showMessage(message) {
    modalMessage.textContent = message; // Establece el mensaje en el modal
    customAlertModal.style.display = 'flex'; // Muestra el modal
}

// Función para cerrar el modal
function closeMessage() {
    customAlertModal.style.display = 'none'; // Oculta el modal
}

// Cierra el modal si se hace clic fuera del contenido del modal
window.onclick = function(event) {
    if (event.target == customAlertModal) {
        closeMessage();
    }
}

// Animaciones de entrada al cargar la página
document.addEventListener('DOMContentLoaded', function() {
    const elements = document.querySelectorAll('.fade-in, .slide-up');
    elements.forEach((el, index) => {
        // Aplica un retraso escalonado a las animaciones para un efecto más dinámico
        el.style.animationDelay = `${index * 0.2}s`;
    });
});
