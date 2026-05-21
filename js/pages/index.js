/**
 * Index page functionality
 * Handles theme toggling, modal operations, and page animations
 */

function toggleTheme() {
    const body = document.body;
    body.classList.toggle('dark');
}

function redirection(message) {
    window.location.href = 'pages/workspace.html?mode=' + message;
}

// Initialize page animations with staggered delays
document.addEventListener('DOMContentLoaded', function () {
    const elements = document.querySelectorAll('.fade-in, .slide-up');
    elements.forEach((el, index) => {
        el.style.animationDelay = `${index * 0.2}s`;
    });
});
