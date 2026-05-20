import { Tool } from './Tool.js';
import { ToggleFinalStateCommand } from '../../application/commands/ToggleFinalStateCommand.js';

export class SetFinalStateTool extends Tool {
  onMouseDown(event, context) {
    const { x, y } = context.getMousePos(event);
    const object = context.getObjectAt(x, y);

    if (object && object.type === 'node') {
      const command = new ToggleFinalStateCommand(object.object.id);
      context.history.execute(command);
    }
  }
}
