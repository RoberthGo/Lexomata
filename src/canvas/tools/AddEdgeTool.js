import { Tool } from './Tool.js';
import { EdgeFactory } from '../../domain/factories/EdgeFactory.js';
import { AddEdgeCommand } from '../../application/commands/AddEdgeCommand.js';

export class AddEdgeTool extends Tool {
  constructor(controller) {
    super(controller);
    this.sourceNode = null;
  }

  onMouseDown(event, context) {
    const { x, y } = context.getMousePos(event);
    const object = context.getObjectAt(x, y);

    if (object && object.type === 'node') {
      this.sourceNode = object.object;
      context.drawingState.edgeCreation = { sourceNode: this.sourceNode, mouseX: x, mouseY: y };
    }
  }

  onMouseMove(event, context) {
    if (this.sourceNode) {
      const { x, y } = context.getMousePos(event);
      context.drawingState.edgeCreation.mouseX = x;
      context.drawingState.edgeCreation.mouseY = y;
      context.renderer.redraw();
    }
  }

  onMouseUp(event, context) {
    if (this.sourceNode) {
      const { x, y } = context.getMousePos(event);
      const object = context.getObjectAt(x, y);

      if (object && object.type === 'node') {
        const targetNode = object.object;
        const document = context.getDocument();

        // Crear arista a través de comando
        const id = Date.now().toString();
        const mode = document.getMode();
        const newEdge = EdgeFactory.createEdge(mode, id, this.sourceNode.id, targetNode.id);

        const command = new AddEdgeCommand(newEdge);
        context.history.execute(command);

        // Disparar evento para abrir modal de edición de arista si es necesario
        context.eventBus.emit('edge:created', newEdge);
      }

      this.sourceNode = null;
      context.drawingState.edgeCreation = null;
      context.renderer.redraw();
    }
  }

  onDeactivate() {
    this.sourceNode = null;
  }
}
