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
let selectedNodeId = null;
let selectedEdgeId = null;
let currentTool = 'select';
let edgeCreationState = { firstNode: null };

function redrawCanvas() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Llama a la función de su archivo correspondiente
    edges.forEach(edge => {
        drawEdge(ctx, edge, nodes, selectedEdgeId);
    });

    // Llama a la función de su archivo correspondiente
    nodes.forEach(node => {
        drawNode(ctx, node, selectedNodeId);
    });
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

    return dist < 5;
}

function showEdgeLabelModal(fromNode, toNode) {
    const modalInputContainer = document.getElementById('modalInputContainer');
    const modalTextInput = document.getElementById('modalTextInput');
    const modalSaveButton = document.getElementById('modalSaveButton');

    modalMessage.textContent = `Crear transición de ${fromNode.label} a ${toNode.label}`;
    modalTextInput.value = '';
    modalInputContainer.style.display = 'block';
    customAlertModal.style.display = 'flex';

    modalSaveButton.onclick = function() {
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

canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    switch (currentTool) {
        case 'addNode':
            createState(x, y, nodes, redrawCanvas);
            break;
        case 'addEdge':
            handleEdgeCreationClick(x, y, nodes, redrawCanvas, edgeCreationState);
            break;
        default:
            selectedNodeId = null;
            selectedEdgeId = null;
            let foundElement = false;

            for (const node of nodes) {
                const distance = Math.sqrt((x - node.x) ** 2 + (y - node.y) ** 2);
                if (distance < node.radius) {
                    selectedNodeId = node.id;
                    foundElement = true;
                    break;
                }
            }
            if (!foundElement) {
                for (const edge of edges) {
                    if (isClickOnEdge(x, y, edge, nodes)) {
                        selectedEdgeId = edge.id;
                        break;
                    }
                }
            }
            redrawCanvas();
            break;
    }
});

document.addEventListener('DOMContentLoaded', function () {
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