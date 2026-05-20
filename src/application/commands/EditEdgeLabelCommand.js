export class EditEdgeLabelCommand {
  constructor(edgeId, oldLabels, newLabels) {
    this.edgeId = edgeId;
    this.oldLabels = [...oldLabels];
    this.newLabels = [...newLabels];
  }

  execute(document) {
    const edge = document.getEdgeById(this.edgeId);
    if (edge) {
      edge.labels = [...this.newLabels];
      import('../../shared/EventBus.js').then(({eventBus}) => eventBus.emit('workspace:changed', document));
    }
  }

  undo(document) {
    const edge = document.getEdgeById(this.edgeId);
    if (edge) {
      edge.labels = [...this.oldLabels];
      import('../../shared/EventBus.js').then(({eventBus}) => eventBus.emit('workspace:changed', document));
    }
  }
}
