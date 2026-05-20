import { drawNode } from './drawing/drawNode.js';
import { drawEdge as drawAutomataEdge } from './drawing/drawAutomataEdge.js';
import { drawEdgeTuring } from './drawing/drawTuringEdge.js';

export class CanvasRenderer {
  constructor(canvasElement, document, controller) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.document = document;
    this.controller = controller; // to access viewState and selection

    // Theme setup (mocked for now, should connect to ThemeController)
    this.theme = {
      background: '#fff',
      nodeFill: '#f0f0f0',
      nodeStroke: '#333',
      nodeText: '#000',
      edgeStroke: '#333',
      edgeText: '#000',
      selectedNode: '#4a90e2',
      selectedEdge: '#4a90e2'
    };
  }

  isClickOnEdge(x, y, edge) {
      // Basic bounding box check placeholder, the original drawEdge had actual path testing
      return false;
  }

  redraw() {
    const { ctx, canvas, document, controller } = this;
    const { viewState, selection, drawingState } = controller;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(viewState.panX, viewState.panY);
    ctx.scale(viewState.scale, viewState.scale);

    const mode = document.getMode();
    const nodes = document.getNodes();
    const edges = document.getEdges();

    const edgeDrawCounts = {};

    edges.forEach(edge => {
      const isSelected = selection.edges.has(edge.id);
      if (mode === 'turing') {
        drawEdgeTuring(ctx, edge, nodes, edgeDrawCounts, isSelected ? [edge.id] : [], this.theme);
      } else {
        drawAutomataEdge(ctx, edge, nodes, edgeDrawCounts, isSelected ? [edge.id] : [], this.theme);
      }
    });

    nodes.forEach(node => {
      const isSelected = selection.nodes.has(node.id);
      drawNode(ctx, node, isSelected ? [node.id] : [], this.theme);
    });

    // Draw temporary edge creation
    if (drawingState && drawingState.edgeCreation) {
      const { sourceNode, mouseX, mouseY } = drawingState.edgeCreation;
      ctx.beginPath();
      ctx.moveTo(sourceNode.x, sourceNode.y);
      ctx.lineTo(mouseX, mouseY);
      ctx.strokeStyle = this.theme.selectedEdge;
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }
}
