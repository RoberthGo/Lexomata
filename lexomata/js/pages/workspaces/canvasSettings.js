
// Set scale
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');

    // Get device pixel ratio for high-DPI displays
    const devicePixelRatio = window.devicePixelRatio || 1;

    /**
     * Resizes the canvas to match the window size with proper scaling for high-DPI displays
     * This prevents pixelation while maintaining optimal performance
     */
    /**
     * Resizes the canvas to match the current window dimensions and adjusts for device pixel ratio.
     * 
     * This function handles high-DPI displays by:
     * 1. Setting the canvas CSS dimensions to match the window size
     * 2. Setting the canvas resolution based on the device pixel ratio for crisp rendering
     * 3. Scaling the drawing context to maintain proper coordinate system
     * 
     * The function ensures the canvas maintains proper visual quality across different
     * display densities while filling the entire viewport.
     * 
     * @function resizeCanvas
     * @description Adjusts canvas size and resolution for optimal display across different devices
     * @requires canvas - HTML canvas element (must be accessible in scope)
     * @requires ctx - 2D rendering context of the canvas (must be accessible in scope)
     * @requires devicePixelRatio - Browser's device pixel ratio (global property)
     * @example
     * // Call on window resize or initialization
     * window.addEventListener('resize', resizeCanvas);
     * resizeCanvas(); // Initial setup
     */
    function resizeCanvas() {
        // Get the display size (CSS pixels)
        const displayWidth = window.innerWidth;
        const displayHeight = window.innerHeight;

        // Set the canvas CSS size to match the display
        canvas.style.width = displayWidth + 'px';
        canvas.style.height = displayHeight + 'px';

        // Set the canvas resolution based on device pixel ratio
        canvas.width = displayWidth * devicePixelRatio;
        canvas.height = displayHeight * devicePixelRatio;

        // Scale the drawing context to match the device pixel ratio
        ctx.scale(devicePixelRatio, devicePixelRatio);

        // Optional: Redraw content if needed
        // drawAutomata(ctx);
    }

    /**
     * Gets accurate mouse coordinates relative to the canvas
     * Accounts for canvas scaling and positioning
     * @param {MouseEvent} event - The mouse event
     * @returns {Object} - Object with x and y coordinates
     */
    function getCanvasCoordinates(event) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        return {
            x: (event.clientX - rect.left) * scaleX / devicePixelRatio,
            y: (event.clientY - rect.top) * scaleY / devicePixelRatio
        };
    }

    // Initialize canvas
    resizeCanvas();

    // Handle window resize
    window.addEventListener('resize', resizeCanvas);

    // Handle mouse movement with accurate coordinates
    canvas.addEventListener('mousemove', (event) => {
        const coords = getCanvasCoordinates(event);
        // console.log(`Mouse X: ${coords.x}, Mouse Y: ${coords.y}`);
    });

    // Handle click events with accurate coordinates
    canvas.addEventListener('click', (event) => {
        const coords = getCanvasCoordinates(event);
        console.log(`Click at X: ${coords.x}, Y: ${coords.y}`);
        // Your click handling logic here
    });

    /**
     * Example drawing function optimized for high-DPI displays
     * @param {CanvasRenderingContext2D} ctx - The canvas context
     */
    function drawAutomata(ctx) {
        // Clear the entire canvas
        ctx.clearRect(0, 0, canvas.width / devicePixelRatio, canvas.height / devicePixelRatio);

        // Example drawing
        ctx.fillStyle = 'blue';
        ctx.fillRect(10, 10, 100, 100);

        // Add more drawing logic here
    }
});



// Zoom
let zoomLevel = 1;
const zoomStep = 0.1;
const minZoom = 0.1;
const maxZoom = 5;

/**
 * Updates the canvas zoom level
 * @param {number} newZoom - The new zoom level
 */
function updateZoom(newZoom) {
    zoomLevel = Math.max(minZoom, Math.min(maxZoom, newZoom));

    // Clear and reset transformations
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(devicePixelRatio * zoomLevel, devicePixelRatio * zoomLevel);

    // Redraw content
    drawAutomata(ctx);
}

// Handle keyboard zoom (+ and - keys)
document.addEventListener('keydown', (event) => {
    if (event.key === '+' || event.key === '=') {
        event.preventDefault();
        updateZoom(zoomLevel + zoomStep);
    } else if (event.key === '-') {
        event.preventDefault();
        updateZoom(zoomLevel - zoomStep);
    }
});

// Handle mouse wheel zoom
canvas.addEventListener('wheel', (event) => {
    event.preventDefault();

    const zoomDirection = event.deltaY < 0 ? 1 : -1;
    const newZoom = zoomLevel + (zoomDirection * zoomStep);

    updateZoom(newZoom);
});

// Initialize zoom
updateZoom(zoomLevel);
