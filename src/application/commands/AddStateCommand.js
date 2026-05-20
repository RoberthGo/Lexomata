export class AddStateCommand {
  constructor(node) {
    this.node = node;
  }

  execute(document) {
    document.addNode(this.node);
  }

  undo(document) {
    document.removeNode(this.node.id);
  }
}
