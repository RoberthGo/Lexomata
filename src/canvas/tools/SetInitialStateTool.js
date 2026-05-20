import { Tool } from './Tool.js';
import { SetInitialStateCommand } from '../../application/commands/SetInitialStateCommand.js';

export class SetInitialStateTool extends Tool {
  onMouseDown(event, context) {
    const { x, y } = context.getMousePos(event);
    const object = context.getObjectAt(x, y);

    if (object && object.type === 'node') {
      const command = new SetInitialStateCommand(object.object.id);
      context.history.execute(command);
    }
  }
}
