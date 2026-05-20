import { Tool } from './Tool.js';
import { DeleteStateCommand } from '../../application/commands/DeleteStateCommand.js';
import { DeleteEdgeCommand } from '../../application/commands/DeleteEdgeCommand.js';

export class DeleteTool extends Tool {
  onMouseDown(event, context) {
    const { x, y } = context.getMousePos(event);
    const object = context.getObjectAt(x, y);

    if (object) {
      let command;
      if (object.type === 'node') {
        command = new DeleteStateCommand(object.object.id);
      } else if (object.type === 'edge') {
        command = new DeleteEdgeCommand(object.object.id);
      }

      if (command) {
        context.history.execute(command);
      }
    }
  }
}
