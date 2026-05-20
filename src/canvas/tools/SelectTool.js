import { Tool } from './Tool.js';
import { MoveStateCommand } from '../../application/commands/MoveStateCommand.js';

export class SelectTool extends Tool {
  constructor(controller) {
    super(controller);
    this.draggedNode = null;
    this.startX = 0;
    this.startY = 0;
    this.isPanning = false;
  }

  onMouseDown(event, context) {
    const { x, y } = context.getMousePos(event);
    const object = context.getObjectAt(x, y);

    if (object && object.type === 'node') {
      this.draggedNode = object.object;
      this.startX = this.draggedNode.x;
      this.startY = this.draggedNode.y;
      context.selection.selectNode(this.draggedNode.id);
    } else if (object && object.type === 'edge') {
      context.selection.selectEdge(object.object.id);
    } else {
      context.selection.clear();
      // Start panning if clicking empty space
      this.isPanning = true;
      this.lastMouseX = event.clientX;
      this.lastMouseY = event.clientY;
    }
  }

  onMouseMove(event, context) {
    if (this.draggedNode) {
      const { x, y } = context.getMousePos(event);
      this.draggedNode.x = x;
      this.draggedNode.y = y;
      context.renderer.redraw();
    } else if (this.isPanning) {
      const dx = event.clientX - this.lastMouseX;
      const dy = event.clientY - this.lastMouseY;
      context.viewState.panX += dx;
      context.viewState.panY += dy;
      this.lastMouseX = event.clientX;
      this.lastMouseY = event.clientY;
      context.renderer.redraw();
    }
  }

  onMouseUp(event, context) {
    if (this.draggedNode) {
      const { x, y } = context.getMousePos(event);
      if (this.startX !== x || this.startY !== y) {
        // Enforce the command after dragging is done
        const command = new MoveStateCommand(this.draggedNode.id, this.startX, this.startY, x, y);
        context.history.execute(command);
      }
      this.draggedNode = null;
    }
    this.isPanning = false;
  }
}
