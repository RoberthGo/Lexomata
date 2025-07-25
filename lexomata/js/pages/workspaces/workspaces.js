// ---------------------------------------------------------------------------------
// SECTION: UI and Modal Functions
// ---------------------------------------------------------------------------------

function toggleTheme() {
    document.body.classList.toggle('dark');
    document.querySelectorAll('.submenu').forEach(sub => sub.style.display = 'none');
}

const customAlertModal = document.getElementById('customAlertModal');
const modalMessage = document.getElementById('modalMessage');

function showMessage(message) {
    modalMessage.textContent = message;
    customAlertModal.style.display = 'flex';
}

function closeMessage() {
    document.getElementById('modalInputContainer').style.display = 'none';
    customAlertModal.style.display = 'none';
}

function redirection() {
    window.location.href = '../index.html';
}


// ---------------------------------------------------------------------------------
// SECTION: Canvas and Automata Logic
// ---------------------------------------------------------------------------------

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let nodes = [];
let edges = [];
let nodeCounter = 0
let selectedNodeId = null;
let selectedEdgeId = null;
let currentTool = 'select';
let edgeCreationState = { firstNode: null };

function redrawCanvas() {
    if (!ctx) return;
    edgeDrawCounts = {};
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    // genera un paneo
    ctx.translate(panX, panY);
    // Aplica el zoom (escalado)
    ctx.scale(scale, scale);


    // Llama a la función de su archivo correspondiente
    edges.forEach(edge => {
        drawEdge(ctx, edge, nodes, edgeDrawCounts, selectedEdgeId);
    });

    // Llama a la función de su archivo correspondiente
    nodes.forEach(node => {
        drawNode(ctx, node, selectedNodeId);
    });

    ctx.restore();
}

function isClickOnEdge(px, py, edge, nodes) {
    const fromNode = nodes.find(n => n.id === edge.from);
    const toNode = nodes.find(n => n.id === edge.to);
    if (!fromNode || !toNode) return false;

    const dx = toNode.x - fromNode.x;
    const dy = toNode.y - fromNode.y;
    const lengthSq = dx * dx + dy * dy;

    if (lengthSq === 0) return false;

    let t = ((px - fromNode.x) * dx + (py - fromNode.y) * dy) / lengthSq;
    t = Math.max(0, Math.min(1, t));

    const closestX = fromNode.x + t * dx;
    const closestY = fromNode.y + t * dy;
    const dist = Math.sqrt((px - closestX) ** 2 + (py - closestY) ** 2);
    const clickTolerance = 5 / scale;

    return dist < clickTolerance;
}

function showEdgeLabelModal(fromNode, toNode) {
    const modalInputContainer = document.getElementById('modalInputContainer');
    const modalTextInput = document.getElementById('modalTextInput');
    const modalSaveButton = document.getElementById('modalSaveButton');

    modalMessage.textContent = `Crear transición de ${fromNode.label} a ${toNode.label}`;
    modalTextInput.value = '';
    modalInputContainer.style.display = 'block';
    customAlertModal.style.display = 'flex';

    modalSaveButton.onclick = function () {
        const label = modalTextInput.value.trim();
        if (label) {
            const newEdge = {
                id: Date.now(),
                from: fromNode.id,
                to: toNode.id,
                label: label
            };
            edges.push(newEdge);
            redrawCanvas();
        }
        closeMessage();
    };
}


// ---------------------------------------------------------------------------------
// SECTION: Event Listeners
// ---------------------------------------------------------------------------------

window.onclick = function (event) {
    if (event.target == customAlertModal) closeMessage();
    if (!event.target.closest('.main-menu-container')) {
        document.querySelectorAll('.submenu').forEach(sub => sub.style.display = 'none');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const menuItems = document.querySelectorAll('.main-menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', function (event) {
            event.stopPropagation();
            const submenu = this.querySelector('.submenu');
            if (submenu) {
                const isCurrentlyOpen = submenu.style.display === 'block';
                document.querySelectorAll('.submenu').forEach(sub => sub.style.display = 'none');
                if (!isCurrentlyOpen) submenu.style.display = 'block';
            }
        });
    });

    if (canvas) {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
        redrawCanvas();
    }
});