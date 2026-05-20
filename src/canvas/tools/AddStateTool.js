import { Tool } from './Tool.js';
import { StateFactory } from '../../domain/factories/StateFactory.js';
import { AddStateCommand } from '../../application/commands/AddStateCommand.js';

export class AddStateTool extends Tool {
  onMouseDown(event, context) {
    const { x, y } = context.getMousePos(event);

    // Evitar superposición
    const clickedObj = context.getObjectAt(x, y);
    if (clickedObj && clickedObj.type === 'node') return;

    const document = context.getDocument();
    const label = document.getNextNodeLabel();
    const id = Date.now().toString(); // simple ID generator

    const newState = StateFactory.createState(id, label, x, y);
    const command = new AddStateCommand(newState);
    context.history.execute(command);
  }
}
