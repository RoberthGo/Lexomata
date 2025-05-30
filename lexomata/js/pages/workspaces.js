/**
 * Workspaces page functionality
 * Handles theme toggling, modal display, toolbar management, and menu interactions
 */

/**
 * Toggles between light and dark theme modes and closes any open submenus
 */
function toggleTheme() {
    const body = document.body;
    body.classList.toggle('dark');
    document.querySelectorAll('.submenu').forEach(sub => sub.style.display = 'none');
}

/**
 * Modal elements references
 */
const customAlertModal = document.getElementById('customAlertModal');
const modalMessage = document.getElementById('modalMessage');

/**
 * Displays modal with specified message
 * @param {string} message - The message to display in the modal
 */
function showMessage(message) {
    modalMessage.textContent = message;
    customAlertModal.style.display = 'flex';
}

/**
 * Closes the modal dialog
 */
function closeMessage() {
    customAlertModal.style.display = 'none';
}

/**
 * Global click handler for modal and submenu management
 * Closes modal when clicking outside and closes submenus when clicking outside menu area
 * @param {Event} event - The click event
 */
window.onclick = function (event) {
    if (event.target == customAlertModal) {
        closeMessage();
    }

    if (!event.target.closest('.main-menu-container') && !event.target.closest('.main-menu-item')) {
        document.querySelectorAll('.submenu').forEach(sub => sub.style.display = 'none');
    }
}

/**
 * Handles tool selection in sidebar
 * Activates clicked tool button and deactivates others, then shows confirmation message
 * @param {HTMLElement} clickedButton - The tool button that was clicked
 * @param {string} message - Message to display after tool selection
 */
function handleToolClick(clickedButton, message) {
    const toolButtons = document.querySelectorAll('.tool-button');
    toolButtons.forEach(button => {
        button.classList.remove('active');
    });
    clickedButton.classList.add('active');
    showMessage(message);
}

/**
 * Main initialization when DOM is loaded
 * Sets up dropdown menus, toolbar responsive behavior, and default tool selection
 */
document.addEventListener('DOMContentLoaded', function () {
    const menuItems = document.querySelectorAll('.main-menu-item');

    // Get current URL parameters and extract mode value
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');

    // Update brand subtitle with mode parameter
    const brandSubtitle = document.getElementsByClassName('brand-subtitle')[0];
    brandSubtitle.textContent += mode;

    /**
     * Setup dropdown menu functionality
     * Toggles submenu visibility and ensures only one submenu is open at a time
     */
    menuItems.forEach(item => {
        item.addEventListener('click', function (event) {
            event.stopPropagation();

            const submenu = this.querySelector('.submenu');
            if (submenu) {
                const isCurrentlyOpen = submenu.style.display === 'block';
                document.querySelectorAll('.submenu').forEach(sub => sub.style.display = 'none');

                if (!isCurrentlyOpen) {
                    submenu.style.display = 'block';
                }
            }
        });
    });

    // Toolbar responsive management
    const toolbarToggleButton = document.getElementById('toolbarToggleButton');
    const toolbar = document.querySelector('.toolbar');
    const breakpoint = 768;

    /**
     * Applies toolbar state (collapsed or expanded)
     * @param {boolean} shouldCollapse - Whether toolbar should be collapsed
     */
    function applyToolbarState(shouldCollapse) {
        const icon = toolbarToggleButton.querySelector('i');
        if (shouldCollapse) {
            toolbar.classList.add('collapsed');
            icon.classList.remove('fa-chevron-left');
            icon.classList.add('fa-chevron-right');
        } else {
            toolbar.classList.remove('collapsed');
            icon.classList.remove('fa-chevron-right');
            icon.classList.add('fa-chevron-left');
        }
    }

    /**
     * Checks screen width and applies appropriate toolbar state
     * Automatically collapses toolbar on small screens
     */
    function checkToolbarCollapse() {
        if (window.innerWidth <= breakpoint) {
            applyToolbarState(true);
        } else {
            applyToolbarState(false);
        }
    }

    checkToolbarCollapse();
    window.addEventListener('resize', checkToolbarCollapse);

    /**
     * Manual toolbar toggle functionality
     * Only works on larger screens where the button is visible
     */
    if (toolbarToggleButton) {
        toolbarToggleButton.addEventListener('click', function () {
            if (window.innerWidth > breakpoint) {
                toolbar.classList.toggle('collapsed');
                const icon = this.querySelector('i');
                if (toolbar.classList.contains('collapsed')) {
                    icon.classList.remove('fa-chevron-left');
                    icon.classList.add('fa-chevron-right');
                } else {
                    icon.classList.remove('fa-chevron-right');
                    icon.classList.add('fa-chevron-left');
                }
            }
        });
    }

    // Set default active tool (select tool)
    const selectButton = document.querySelector('.tool-button[data-tool="select"]');
    if (selectButton) {
        selectButton.classList.add('active');
    }
});


function redirection() {
    /*
        Note:
    
        Here there should be a validation for if the file is not saved.
    */
    window.location.href = '../index.html';
}