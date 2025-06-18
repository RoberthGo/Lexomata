const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const states = [];
const edges = [];
const objects = [];
const NODE_RADIUS = 20;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 8;
const ZOOM_SENSITIVITY = 0.0025;
const KEY_ZOOM_FACTOR = 1.2;

let zoom_level = 1;
let toolSelected = 0;
let dpr = window.devicePixelRatio || 1;
let offsetX = 0;
let offsetY = 0;

document.addEventListener('DOMContentLoaded', () => {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    setZoom();
});


function setZoom() {
    // reset matrix
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // Scale the drawing context so everything draws at the correct size
    ctx.scale(dpr * zoom_level, dpr * zoom_level);
    // ctx.translate(offsetX, offsetY);
    draw();
}


let scale = 1;
let translateX = 0;
let translateY = 0;

// Mouse wheel zoom
canvas.addEventListener('wheel', (e) => {
    e.preventDefault();

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const zoom = e.deltaY > 0 ? 1 - ZOOM_SENSITIVITY * 50 : 1 + ZOOM_SENSITIVITY * 50;

    const newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, scale * zoom));
    if (newScale !== scale) {
        const factor = newScale / scale - 1;
        translateX -= (mouseX - translateX) * factor;
        translateY -= (mouseY - translateY) * factor;
        scale = newScale;
    }
    setZoom();
});



// Keyboard zoom
document.addEventListener('keydown', (e) => {
    if (e.key === '+') {
        e.preventDefault();
        zoom_level += 0.2;
        setZoom();
        /*const newScale = Math.min(MAX_ZOOM, scale * KEY_ZOOM_FACTOR);
        if (newScale !== scale) {
            const centerX = canvas.width / (2 * dpr);
            const centerY = canvas.height / (2 * dpr);
            const factor = newScale / scale - 1;
            translateX -= (centerX - translateX) * factor;
            translateY -= (centerY - translateY) * factor;
            scale = newScale;
        }*/
    } else if (e.key === '-') {
        e.preventDefault();
        zoom_level -= 0.2;
        setZoom();
        /*const newScale = Math.max(MIN_ZOOM, scale / KEY_ZOOM_FACTOR);
        if (newScale !== scale) {
            const centerX = canvas.width / (2 * dpr);
            const centerY = canvas.height / (2 * dpr);
            const factor = newScale / scale - 1;
            translateX -= (centerX - translateX) * factor;
            translateY -= (centerY - translateY) * factor;
            scale = newScale;
        }*/
    }
});



