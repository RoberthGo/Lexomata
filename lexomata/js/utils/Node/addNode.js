const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const States = [];
let index = 0;

function createState(event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    drawCircle(x, y);
    States[index] = new State("q" + index.toString());
    index++;
}

function drawCircle(x, y) {
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.fillStyle = 'lightblue';
    ctx.fill();
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.stroke();
}

canvas.addEventListener('click', createState);