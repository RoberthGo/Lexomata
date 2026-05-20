export class TuringMachineExecutionStrategy {
  validate(machine) {
    if (!machine.nodes.some(n => n.IsStart)) {
      throw new Error("La máquina de Turing debe tener un estado inicial.");
    }
    return true;
  }

  run(input, machine) {
    return { accepted: false, tape: input };
  }

  step(input, machine, currentState) {
    return null;
  }

  reset() { }
}
