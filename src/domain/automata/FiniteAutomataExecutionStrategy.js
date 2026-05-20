export class FiniteAutomataExecutionStrategy {
  validate(machine) {
    if (!machine.nodes.some(n => n.IsStart)) {
      throw new Error("El autómata debe tener un estado inicial.");
    }
    return true;
  }

  run(input, machine) {
    // Basic placeholder for the execution logic
    return { accepted: false, path: [] };
  }

  step(input, machine, currentState) {
    return null;
  }

  reset() { }
}
