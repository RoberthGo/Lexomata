// Handles theme persistence in workspace pages
(function () {
    const body = document.getElementById('body');
    // Restore theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) body.classList.remove('light', 'dark'), body.classList.add(savedTheme);

    // Toggle buttons
    const toggleBtn = document.querySelector('.theme-toggle-button-header');
    toggleBtn && toggleBtn.addEventListener('click', () => {
        body.classList.toggle('dark');
        const newTheme = body.classList.contains('dark') ? 'dark' : 'light';
        localStorage.setItem('theme', newTheme);
    });
})();
