import { eventBus } from '../../shared/EventBus.js';

export class WorkspaceDocument {
  constructor(mode = 'automata') {
    this.mode = mode;
    this.nodes = [];
    this.edges = [];
    this.nodeCounter = 0;
  }

  setMode(mode) {
    this.mode = mode;
  }

  getMode() {
    return this.mode;
  }

  getNodes() {
    return this.nodes;
  }

  getEdges() {
    return this.edges;
  }

  getNodeById(id) {
    return this.nodes.find(n => n.id === id);
  }

  getEdgeById(id) {
    return this.edges.find(e => e.id === id);
  }

  addNode(node) {
    this.nodes.push(node);
    if (parseInt(node.label.replace('q', '')) >= this.nodeCounter) {
      this.nodeCounter = parseInt(node.label.replace('q', '')) + 1;
    }
    eventBus.emit('workspace:changed', this);
  }

  removeNode(id) {
    this.nodes = this.nodes.filter(n => n.id !== id);
    this.edges = this.edges.filter(e => e.from !== id && e.to !== id);
    eventBus.emit('workspace:changed', this);
  }

  addEdge(edge) {
    this.edges.push(edge);
    eventBus.emit('workspace:changed', this);
  }

  removeEdge(id) {
    this.edges = this.edges.filter(e => e.id !== id);
    eventBus.emit('workspace:changed', this);
  }

  setInitialState(id) {
    this.nodes.forEach(node => {
      node.IsStart = (node.id === id);
    });
    eventBus.emit('workspace:changed', this);
  }

  toggleFinalState(id) {
    const node = this.getNodeById(id);
    if (node) {
      node.IsEnd = !node.IsEnd;
      eventBus.emit('workspace:changed', this);
    }
  }

  getNextNodeLabel() {
    return `q${this.nodeCounter++}`;
  }

  clear() {
    this.nodes = [];
    this.edges = [];
    this.nodeCounter = 0;
    eventBus.emit('workspace:changed', this);
  }

  loadState(data) {
    this.nodes = data.nodes || [];
    this.edges = data.edges || [];
    this.nodeCounter = data.nodeCounter || 0;
    this.mode = data.mode || this.mode;
    eventBus.emit('workspace:changed', this);
  }

  getState() {
    return {
      nodes: JSON.parse(JSON.stringify(this.nodes)),
      edges: JSON.parse(JSON.stringify(this.edges)),
      nodeCounter: this.nodeCounter,
      mode: this.mode
    };
  }
}
