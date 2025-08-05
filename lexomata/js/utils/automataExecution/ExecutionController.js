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
     * Busca una transición que coincida con el inicio de la cadena de entrada.
     * Prioriza las transiciones más largas (greedy matching).
     * Ahora soporta expresiones regulares.
     * @param {string} currentNodeId - ID del nodo actual
     * @param {string} remainingInput - Cadena restante por procesar
     * @returns {object|null} La transición encontrada con la etiqueta que coincidió, o null
     */
    findMatchingTransition(currentNodeId, remainingInput) {
        const possibleTransitions = this.edges.filter(edge => edge.from === currentNodeId);
        
        let bestMatch = null;
        let longestMatch = 0;

        for (const transition of possibleTransitions) {
            // Usar RegexHandler para encontrar todas las coincidencias
            const matches = RegexHandler.findAllMatches(transition.labels, remainingInput);
            
            // Tomar la coincidencia más larga
            for (const matchInfo of matches) {
                if (matchInfo.length > longestMatch) {
                    bestMatch = {
                        ...transition,
                        matchedLabel: matchInfo.label,
                        matchedString: matchInfo.match
                    };
                    longestMatch = matchInfo.length;
                }
            }
        }

        return bestMatch;
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

        const hasFinalNode = this.nodes.some(n => n.IsEnd);
        if (!hasFinalNode) {
            showMessage("Error: No se ha definido ningún estado final.");
            this.history.push({
                currentNodeId: null,
                consumedInput: "",
                remainingInput: this.inputString,
                status: 'REJECTED',
                message: 'No hay estados finales definidos en el autómata.'
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
     * Esta versión soporta transiciones de múltiples caracteres.
     */
    run() {
        let currentState = this.history[0];

        while (currentState.remainingInput.length > 0 && currentState.status === 'RUNNING') {
            const currentNodeId = currentState.currentNodeId;
            const remainingInput = currentState.remainingInput;

            // Busca una transición que coincida con el inicio de la cadena restante
            const transition = this.findMatchingTransition(currentNodeId, remainingInput);

            if (transition) {
                // Se encontró una transición, avanza al siguiente estado
                const nextNode = this.nodes.find(n => n.id === transition.to);
                const consumedString = transition.matchedString || transition.matchedLabel;
                const newState = {
                    currentNodeId: nextNode.id,
                    consumedInput: currentState.consumedInput + consumedString,
                    remainingInput: currentState.remainingInput.substring(consumedString.length),
                    status: 'RUNNING',
                    message: `Leyó '${consumedString}' (patrón: ${transition.matchedLabel}) y pasó del estado ${this.nodes.find(n => n.id === currentNodeId).label} a ${nextNode.label}.`,
                    lastConsumedLabel: transition.matchedLabel,
                    lastConsumedString: consumedString
                };
                this.history.push(newState);
                currentState = newState;
            } else {
                // No se encontró transición, la cadena es rechazada
                const currentChar = remainingInput[0];
                currentState.status = 'REJECTED';
                currentState.message = `Cadena rechazada. No hay transición desde ${this.nodes.find(n => n.id === currentNodeId).label} que coincida con '${currentChar}' o cualquier secuencia que comience con este carácter.`;
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

    /**
     * Obtiene las transiciones disponibles desde el estado actual.
     * @returns {Array} Array de transiciones con información de coincidencia
     */
    getAvailableTransitions() {
        const currentState = this.getCurrentState();
        if (!currentState || currentState.status !== 'RUNNING') {
            return [];
        }

        const currentNodeId = currentState.currentNodeId;
        const remainingInput = currentState.remainingInput;
        
        const availableTransitions = this.edges.filter(edge => edge.from === currentNodeId);
        
        return availableTransitions.map(transition => {
            const targetNode = this.nodes.find(n => n.id === transition.to);
            const matchingInfo = [];
            
            // Verificar cada etiqueta para coincidencias
            for (const label of transition.labels) {
                const match = RegexHandler.findMatch(label, remainingInput);
                if (match) {
                    matchingInfo.push({
                        label: label,
                        match: match,
                        isRegex: RegexHandler.isRegexPattern(label),
                        description: RegexHandler.getDescription(label)
                    });
                }
            }
            
            return {
                ...transition,
                targetNode: targetNode,
                matchingInfo: matchingInfo,
                canTransition: matchingInfo.length > 0,
                allLabelsInfo: transition.labels.map(label => ({
                    label: label,
                    isRegex: RegexHandler.isRegexPattern(label),
                    description: RegexHandler.getDescription(label),
                    examples: RegexHandler.generateExamples(label, 3)
                }))
            };
        });
    }

    /**
     * Verifica si hay alguna transición posible desde el estado actual.
     * @returns {boolean}
     */
    hasAvailableTransitions() {
        const transitions = this.getAvailableTransitions();
        return transitions.some(t => t.canTransition);
    }
}