import { eventBus } from '../shared/EventBus.js';
import { WorkspaceDocument } from '../domain/models/WorkspaceDocument.js';
import { HistoryManager } from './HistoryManager.js';
import { CanvasController } from '../canvas/CanvasController.js';
import { CanvasRenderer } from '../canvas/CanvasRenderer.js';

export class WorkspaceController {
  constructor(canvasElement) {
    this.document = new WorkspaceDocument();
    this.history = new HistoryManager(this.document);
    this.renderer = new CanvasRenderer(canvasElement, this.document, null);
    this.canvasController = new CanvasController(canvasElement, this.document, this.history, this.renderer);

    // Wire self reference to renderer for viewState
    this.renderer.controller = this.canvasController;

    // Binding UI to actions via eventBus
    eventBus.on('ui:undo', () => this.history.undo());
    eventBus.on('ui:redo', () => this.history.redo());
    eventBus.on('ui:clear', () => this.document.clear());
    eventBus.on('ui:setMode', (mode) => {
       this.document.setMode(mode);
       this.renderer.redraw();
    });

    // Start rendering loop or trigger first render
    this.renderer.redraw();
  }

  load(data) {
    this.document.loadState(data);
    this.history.clear();
  }

  export() {
    return this.document.getState();
  }
}
