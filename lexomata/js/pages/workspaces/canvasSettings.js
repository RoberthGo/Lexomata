
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('canvas');
    if (!canvas) {
        console.error("El canvas no se encontró en canvasSettings.js");
        return;
    }
    
    const ctx = canvas.getContext('2d');
    
    const NODE_RADIUS = 20;
    const MIN_ZOOM = 0.1;
    const MAX_ZOOM = 8;
    const ZOOM_SENSITIVITY = 0.0025;

    let zoom_level = 1;
    let dpr = window.devicePixelRatio || 1;
    let scale = 1;
    let translateX = 0;
    let translateY = 0;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    setZoom();

    function setZoom() {
        if (!ctx) return;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr * scale, dpr * scale);
        if (typeof redrawCanvas === 'function') {
            redrawCanvas();
        }
    }

    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();

        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const zoom = e.deltaY > 0 ? 1 - ZOOM_SENSITIVITY * 50 : 1 + ZOOM_SENSITIVITY * 50;
        const newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, scale * zoom));

        if (newScale !== scale) {
            scale = newScale;
        }
        setZoom();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === '+') {
            e.preventDefault();
            scale = Math.min(MAX_ZOOM, scale * 1.2);
            setZoom();
        } else if (e.key === '-') {
            e.preventDefault();
            scale = Math.max(MIN_ZOOM, scale / 1.2);
            setZoom();
        }
    });
});