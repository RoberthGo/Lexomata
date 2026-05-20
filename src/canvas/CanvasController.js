import { eventBus } from '../shared/EventBus.js';
import { SelectTool } from './tools/SelectTool.js';
import { AddStateTool } from './tools/AddStateTool.js';
import { AddEdgeTool } from './tools/AddEdgeTool.js';
import { DeleteTool } from './tools/DeleteTool.js';
import { SetInitialStateTool } from './tools/SetInitialStateTool.js';
import { SetFinalStateTool } from './tools/SetFinalStateTool.js';

export class CanvasController {
  constructor(canvasElement, document, history, renderer) {
    this.canvas = canvasElement;
    this.document = document;
    this.history = history;
    this.renderer = renderer;
    this.eventBus = eventBus;

    this.viewState = { panX: 0, panY: 0, scale: 1 };
    this.selection = {
      nodes: new Set(),
      edges: new Set(),
      selectNode: (id) => this.selection.nodes.add(id),
      selectEdge: (id) => this.selection.edges.add(id),
      clear: () => { this.selection.nodes.clear(); this.selection.edges.clear(); }
    };
    this.drawingState = { edgeCreation: null, edgeReassignment: null };

    this.tools = {
      'select': new SelectTool(this),
      'addNode': new AddStateTool(this),
      'addEdge': new AddEdgeTool(this),
      'delete': new DeleteTool(this),
      'setStart': new SetInitialStateTool(this),
      'setEnd': new SetFinalStateTool(this)
    };

    this.currentToolId = 'select';

    this.bindEvents();
    eventBus.on('tool:changed', (toolId) => this.setTool(toolId));
    eventBus.on('workspace:changed', () => this.renderer.redraw());
  }

  setTool(toolId) {
    if (this.tools[this.currentToolId].onDeactivate) {
      this.tools[this.currentToolId].onDeactivate();
    }
    if (this.tools[toolId]) {
      this.currentToolId = toolId;
    }
  }

  getCurrentTool() {
    return this.tools[this.currentToolId];
  }

  getDocument() { return this.document; }

  getMousePos(evt) {
    const rect = this.canvas.getBoundingClientRect();
    const x = (evt.clientX - rect.left - this.viewState.panX) / this.viewState.scale;
    const y = (evt.clientY - rect.top - this.viewState.panY) / this.viewState.scale;
    return { x, y };
  }

  getObjectAt(x, y) {
    // Buscar nodos (prioridad visual por z-index / array order inverso)
    const nodes = this.document.getNodes();
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];
      if (Math.hypot(node.x - x, node.y - y) <= node.radius) {
        return { type: 'node', object: node };
      }
    }

    // Simplificación de hit test de aristas (usar bounding box o ecuación de distancia real luego)
    const edges = this.document.getEdges();
    for (let i = edges.length - 1; i >= 0; i--) {
       // Dummy check para delegar luego a lógica de `isClickOnEdge`
       if(this.renderer.isClickOnEdge(x, y, edges[i])) return { type: 'edge', object: edges[i] };
    }
    return null;
  }

  bindEvents() {
    this.canvas.addEventListener('mousedown', (e) => this.getCurrentTool().onMouseDown(e, this));
    this.canvas.addEventListener('mousemove', (e) => this.getCurrentTool().onMouseMove(e, this));
    window.addEventListener('mouseup', (e) => this.getCurrentTool().onMouseUp(e, this));
  }
}
