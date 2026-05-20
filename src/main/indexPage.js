// Logic for index.html (Theme, Navigation)
document.addEventListener('DOMContentLoaded', () => {
    window.redirection = (mode) => {
        window.location.href = `pages/workspace.html?mode=${mode}`;
    };

    window.toggleTheme = () => {
        document.body.classList.toggle('dark');
        document.body.classList.toggle('light');
    };
});
