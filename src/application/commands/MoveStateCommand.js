export class MoveStateCommand {
  constructor(nodeId, startX, startY, endX, endY) {
    this.nodeId = nodeId;
    this.startX = startX;
    this.startY = startY;
    this.endX = endX;
    this.endY = endY;
  }

  execute(document) {
    const node = document.getNodeById(this.nodeId);
    if (node) {
      node.x = this.endX;
      node.y = this.endY;
      // trigger update manually since we mutated the node
      import('../../shared/EventBus.js').then(({eventBus}) => eventBus.emit('workspace:changed', document));
    }
  }

  undo(document) {
    const node = document.getNodeById(this.nodeId);
    if (node) {
      node.x = this.startX;
      node.y = this.startY;
      import('../../shared/EventBus.js').then(({eventBus}) => eventBus.emit('workspace:changed', document));
    }
  }
}
