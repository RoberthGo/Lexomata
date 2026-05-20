import { WorkspaceController } from '../application/WorkspaceController.js';
import { ToolbarView } from '../ui/ToolbarView.js';
import { ThemeController } from '../ui/ThemeController.js';

document.addEventListener('DOMContentLoaded', () => {
    const canvasElement = document.getElementById('canvas');
    if (!canvasElement) return;

    // Initialize core workspace controller
    const workspaceController = new WorkspaceController(canvasElement);

    // Initialize UI components
    const toolbarElement = document.querySelector('.toolbar');
    if (toolbarElement) {
        new ToolbarView(toolbarElement);
    }

    const themeToggleBtn = document.querySelector('.theme-toggle-button-header');
    if (themeToggleBtn) {
        new ThemeController(themeToggleBtn);
    }

    // Load mode from URL
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode') || 'automata';
    workspaceController.document.setMode(mode);

    // Attach window resizing
    window.addEventListener('resize', () => {
        canvasElement.width = canvasElement.parentElement.clientWidth;
        canvasElement.height = canvasElement.parentElement.clientHeight;
        workspaceController.renderer.redraw();
    });

    // Trigger initial resize to setup canvas bounds
    window.dispatchEvent(new Event('resize'));
});
