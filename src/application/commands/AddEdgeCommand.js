export class AddEdgeCommand {
  constructor(edge) {
    this.edge = edge;
  }

  execute(document) {
    document.addEdge(this.edge);
  }

  undo(document) {
    document.removeEdge(this.edge.id);
  }
}
