export class DeleteEdgeCommand {
  constructor(edgeId) {
    this.edgeId = edgeId;
    this.deletedEdge = null;
  }

  execute(document) {
    this.deletedEdge = document.getEdgeById(this.edgeId);
    if (this.deletedEdge) {
      document.removeEdge(this.edgeId);
    }
  }

  undo(document) {
    if (this.deletedEdge) {
      document.addEdge(this.deletedEdge);
    }
  }
}
