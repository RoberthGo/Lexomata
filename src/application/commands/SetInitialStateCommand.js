export class SetInitialStateCommand {
  constructor(nodeId) {
    this.nodeId = nodeId;
    this.previousInitialStateId = null;
  }

  execute(document) {
    const previous = document.getNodes().find(n => n.IsStart);
    this.previousInitialStateId = previous ? previous.id : null;
    document.setInitialState(this.nodeId);
  }

  undo(document) {
    if (this.previousInitialStateId !== null) {
      document.setInitialState(this.previousInitialStateId);
    } else {
      const current = document.getNodeById(this.nodeId);
      if(current) current.IsStart = false;
      import('../../shared/EventBus.js').then(({eventBus}) => eventBus.emit('workspace:changed', document));
    }
  }
}
