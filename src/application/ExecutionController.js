import { FiniteAutomataExecutionStrategy } from '../domain/automata/FiniteAutomataExecutionStrategy.js';
import { TuringMachineExecutionStrategy } from '../domain/turing/TuringMachineExecutionStrategy.js';
import { eventBus } from '../shared/EventBus.js';

export class ExecutionController {
  constructor(document) {
    this.document = document;
    this.strategy = null;
    this.updateStrategy();

    eventBus.on('workspace:changed', () => this.updateStrategy());
  }

  updateStrategy() {
    const mode = this.document.getMode();
    if (mode === 'turing') {
      this.strategy = new TuringMachineExecutionStrategy();
    } else {
      this.strategy = new FiniteAutomataExecutionStrategy();
    }
  }

  validate() {
    return this.strategy.validate(this.document.getState());
  }

  run(input) {
    try {
      this.validate();
      const result = this.strategy.run(input, this.document.getState());
      eventBus.emit('execution:finished', result);
      return result;
    } catch (e) {
      eventBus.emit('error', e.message);
      return null;
    }
  }
}
