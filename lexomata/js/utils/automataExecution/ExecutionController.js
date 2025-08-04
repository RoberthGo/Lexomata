class ExecutionController {
    /**
     * Prepara una nueva simulación de autómata.
     * @param {Array} nodes - El arreglo de nodos (estados) de tu autómata.
     * @param {Array} edges - El arreglo de aristas (transiciones) de tu autómata.
     * @param {string} inputString - La cadena de entrada a evaluar.
     */
    constructor(nodes, edges, inputString) {
        this.nodes = nodes;
        this.edges = edges;
        this.inputString = inputString;
        this.history = []; // Almacenará cada paso de la ejecución
        this.currentStep = 0; // Puntero al paso actual en el historial

        this.initialize();
    }
    
    /**
     * Configura el estado inicial y ejecuta la simulación para generar el historial.
     */
    initialize() {
        const startNode = this.nodes.find(n => n.IsStart);
        if (!startNode) {
            showMessage("Error: No se encontró un nodo inicial.");
            this.history.push({
                currentNodeId: null,
                consumedInput: "",
                remainingInput: this.inputString,
                status: 'REJECTED',
                message: 'No hay estado inicial definido.'
            });
            return;
        }

        // Estado inicial (Paso 0)
        this.history.push({
            currentNodeId: startNode.id,
            consumedInput: "",
            remainingInput: this.inputString,
            status: 'RUNNING',
            message: `Inicia en el estado ${startNode.label}.`
        });

        // Ejecuta la simulación para pre-calcular todos los pasos
        this.run();
    }

    /**
     * Simula la ejecución completa y llena el arreglo 'history'.
     * Esta versión es para un Autómata Finito Determinista (DFA).
     */
    run() {
        let currentState = this.history[0];

        while (currentState.remainingInput.length > 0 && currentState.status === 'RUNNING') {
            const currentChar = currentState.remainingInput[0];
            const currentNodeId = currentState.currentNodeId;

            // Busca una transición que coincida con el carácter actual
            const transition = this.edges.find(edge =>
                edge.from === currentNodeId && edge.labels.includes(currentChar)
            );

            if (transition) {
                // Se encontró una transición, avanza al siguiente estado
                const nextNode = this.nodes.find(n => n.id === transition.to);
                const newState = {
                    currentNodeId: nextNode.id,
                    consumedInput: currentState.consumedInput + currentChar,
                    remainingInput: currentState.remainingInput.substring(1),
                    status: 'RUNNING',
                    message: `Leyó '${currentChar}' y pasó del estado ${this.nodes.find(n => n.id === currentNodeId).label} a ${nextNode.label}.`
                };
                this.history.push(newState);
                currentState = newState;
            } else {
                // No se encontró transición, la cadena es rechazada
                currentState.status = 'REJECTED';
                currentState.message = `Cadena rechazada. No hay transición desde ${this.nodes.find(n => n.id === currentNodeId).label} con el carácter '${currentChar}'.`;
                break;
            }
        }

        // Evaluación final al terminar de leer la cadena
        const finalState = this.history[this.history.length - 1];
        if (finalState.status === 'RUNNING') {
            const finalNode = this.nodes.find(n => n.id === finalState.currentNodeId);
            if (finalNode.IsEnd) {
                finalState.status = 'ACCEPTED';
                finalState.message = 'Cadena aceptada. Terminó en un estado final.';
            } else {
                finalState.status = 'REJECTED';
                finalState.message = 'Cadena rechazada. No terminó en un estado final.';
            }
        }
    }

    /**
     * Avanza al siguiente paso de la ejecución.
     * @returns {object} El estado del nuevo paso.
     */
    stepForward() {
        if (this.currentStep < this.history.length - 1) {
            this.currentStep++;
        }
        return this.getCurrentState();
    }

    /**
     * Retrocede al paso anterior de la ejecución.
     * @returns {object} El estado del paso anterior.
     */
    stepBackward() {
        if (this.currentStep > 0) {
            this.currentStep--;
        }
        return this.getCurrentState();
    }

    /**
     * Devuelve el estado actual de la simulación.
     * @returns {object}
     */
    getCurrentState() {
        return this.history[this.currentStep];
    }

    /**
     * Devuelve todo el historial de ejecución.
     * @returns {Array}
     */
    getHistory() {
        return this.history;
    }
}