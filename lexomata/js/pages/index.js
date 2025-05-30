/**
 * Index page functionality
 * Handles theme toggling, modal operations, and page animations
 */

function toggleTheme() {
    const body = document.body;
    body.classList.toggle('dark'); 
}

const customAlertModal = document.getElementById('customAlertModal');
const modalMessage = document.getElementById('modalMessage');

function showMessage(message) {
    modalMessage.textContent = message;
    customAlertModal.style.display = 'flex';
}

function closeMessage() {
    customAlertModal.style.display = 'none';
}

// Close modal when clicking outside
window.onclick = function(event) {
    if (event.target == customAlertModal) {
        closeMessage();
    }
}

// Initialize page animations with staggered delays
document.addEventListener('DOMContentLoaded', function() {
    const elements = document.querySelectorAll('.fade-in, .slide-up');
    elements.forEach((el, index) => {
        el.style.animationDelay = `${index * 0.2}s`;
    });
});
