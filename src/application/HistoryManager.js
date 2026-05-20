import { eventBus } from '../shared/EventBus.js';

export class HistoryManager {
  constructor(document) {
    this.document = document;
    this.undoStack = [];
    this.redoStack = [];

    // We optionally save a snapshot before the very first command if needed,
    // but the pure command pattern relies on inverse execution.
  }

  execute(command) {
    command.execute(this.document);
    this.undoStack.push(command);
    this.redoStack = []; // Clear redo stack on new action
    this._notify();
  }

  undo() {
    if (this.canUndo()) {
      const command = this.undoStack.pop();
      command.undo(this.document);
      this.redoStack.push(command);
      this._notify();
    }
  }

  redo() {
    if (this.canRedo()) {
      const command = this.redoStack.pop();
      command.execute(this.document);
      this.undoStack.push(command);
      this._notify();
    }
  }

  canUndo() {
    return this.undoStack.length > 0;
  }

  canRedo() {
    return this.redoStack.length > 0;
  }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
    this._notify();
  }

  _notify() {
    eventBus.emit('history:changed', {
      canUndo: this.canUndo(),
      canRedo: this.canRedo()
    });
  }
}
