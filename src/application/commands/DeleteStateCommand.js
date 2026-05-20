export class DeleteStateCommand {
  constructor(nodeId) {
    this.nodeId = nodeId;
    this.deletedNode = null;
    this.deletedEdges = [];
  }

  execute(document) {
    this.deletedNode = document.getNodeById(this.nodeId);
    this.deletedEdges = document.getEdges().filter(e => e.from === this.nodeId || e.to === this.nodeId);
    document.removeNode(this.nodeId);
  }

  undo(document) {
    if (this.deletedNode) {
      document.addNode(this.deletedNode);
      this.deletedEdges.forEach(edge => document.addEdge(edge));
    }
  }
}
