export class ToggleFinalStateCommand {
  constructor(nodeId) {
    this.nodeId = nodeId;
  }

  execute(document) {
    document.toggleFinalState(this.nodeId);
  }

  undo(document) {
    document.toggleFinalState(this.nodeId);
  }
}
