// ---------------------------------------------------------------------------------
// SECTION: Turing Machine Execution Controller
// ---------------------------------------------------------------------------------

class TuringExecutionController {
    /**
     * Prepara una nueva simulación de máquina de Turing.
     * @param {Array} nodes - El arreglo de nodos (estados) de la máquina de Turing.
     * @param {Array} edges - El arreglo de aristas (transiciones) de la máquina de Turing.
     * @param {string} inputString - La cadena inicial en la cinta.
     * @param {number} headPosition - Posición inicial del cabezal (por defecto 0).
     */
    constructor(nodes, edges, inputString, headPosition = 0) {
        this.nodes = nodes;
        this.edges = edges;
        this.inputString = inputString;
        this.initialHeadPosition = headPosition;
        this.history = []; // Almacenará cada paso de la ejecución
        this.currentStep = 0; // Puntero al paso actual en el historial
        this.maxSteps = 1000; // Límite para evitar bucles infinitos

        this.initialize();
    }

    /**
     * Inicializa la cinta de la máquina de Turing
     * @param {string} inputString - Cadena inicial
     * @param {number} headPosition - Posición inicial del cabezal
     * @returns {Object} Estado inicial de la cinta
     */
    initializeTape(inputString, headPosition) {
        const tape = {};
        
        // Llenar la cinta con la cadena de entrada
        for (let i = 0; i < inputString.length; i++) {
            tape[i] = inputString[i];
        }
        
        return {
            tape: tape,
            headPosition: headPosition,
            leftmost: 0,
            rightmost: Math.max(0, inputString.length - 1)
        };
    }

    /**
     * Lee el carácter en la posición actual del cabezal
     * @param {Object} tapeState - Estado actual de la cinta
     * @returns {string} Carácter leído (o símbolo de celda vacía)
     */
    readTape(tapeState) {
        const char = tapeState.tape[tapeState.headPosition];
        return char !== undefined ? char : '□'; // □ representa celda vacía
    }

    /**
     * Escribe un carácter en la posición actual del cabezal
     * @param {Object} tapeState - Estado actual de la cinta
     * @param {string} char - Carácter a escribir
     */
    writeTape(tapeState, char) {
        if (char === '□' || char === 'blank') {
            // Eliminar el carácter (simular celda vacía)
            delete tapeState.tape[tapeState.headPosition];
        } else {
            tapeState.tape[tapeState.headPosition] = char;
            
            // Actualizar límites de la cinta
            tapeState.leftmost = Math.min(tapeState.leftmost, tapeState.headPosition);
            tapeState.rightmost = Math.max(tapeState.rightmost, tapeState.headPosition);
        }
    }

    /**
     * Mueve el cabezal según la dirección especificada
     * @param {Object} tapeState - Estado actual de la cinta
     * @param {string} direction - Dirección del movimiento ('L', 'R', 'M', 'S')
     */
    moveHead(tapeState, direction) {
        const dir = direction.toUpperCase();
        switch (dir) {
            case 'L': // Izquierda
                tapeState.headPosition--;
                tapeState.leftmost = Math.min(tapeState.leftmost, tapeState.headPosition);
                break;
            case 'R': // Derecha
                tapeState.headPosition++;
                tapeState.rightmost = Math.max(tapeState.rightmost, tapeState.headPosition);
                break;
            case 'M': // Mantener
            case 'S': // Stay
                // No mover el cabezal
                break;
            default:
                console.warn(`Dirección de movimiento desconocida: ${direction}`);
                break;
        }
    }

    /**
     * Busca una transición que coincida con el carácter actual en la cinta
     * @param {string} currentNodeId - ID del nodo actual
     * @param {string} currentChar - Carácter actual en la posición del cabezal
     * @returns {Object|null} La transición encontrada o null
     */
    findMatchingTransition(currentNodeId, currentChar) {
        const possibleTransitions = this.edges.filter(edge => edge.from === currentNodeId);
        
        for (const transition of possibleTransitions) {
            // Verificar cada etiqueta de la transición
            for (const label of transition.labels) {
                const labelText = typeof label === 'object' ? label.text : label;
                const parts = labelText.split(',');
                
                if (parts.length !== 3) continue; // Formato inválido
                
                const readChar = parts[0].trim();
                
                // Verificar coincidencia con el carácter actual
                if (this.matchesCharacter(readChar, currentChar)) {
                    return {
                        ...transition,
                        matchedLabel: labelText,
                        readChar: readChar,
                        writeChar: parts[1].trim(),
                        moveDirection: parts[2].trim()
                    };
                }
            }
        }
        
        return null;
    }

    /**
     * Verifica si un carácter de lectura coincide con el carácter actual
     * @param {string} readChar - Carácter especificado en la transición
     * @param {string} currentChar - Carácter actual en la cinta
     * @returns {boolean} True si coinciden
     */
    matchesCharacter(readChar, currentChar) {
        // Manejar símbolos especiales
        if (readChar === '□' || readChar === 'blank') {
            return currentChar === '□';
        }
        if (readChar === 'ε' || readChar === 'λ') {
            return currentChar === '□'; // Épsilon equivale a celda vacía
        }
        
        return readChar === currentChar;
    }

    /**
     * Convierte el estado de la cinta a una representación legible
     * @param {Object} tapeState - Estado de la cinta
     * @returns {string} Representación de la cinta
     */
    tapeToString(tapeState) {
        let result = '';
        const start = Math.min(tapeState.leftmost, tapeState.headPosition - 5);
        const end = Math.max(tapeState.rightmost, tapeState.headPosition + 5);
        
        for (let i = start; i <= end; i++) {
            const char = tapeState.tape[i] || '□';
            if (i === tapeState.headPosition) {
                result += `[${char}]`;
            } else {
                result += ` ${char} `;
            }
        }
        
        return result.trim();
    }

    /**
     * Configura el estado inicial y ejecuta la simulación para generar el historial.
     */
    initialize() {
        const startNode = this.nodes.find(n => n.IsStart);
        if (!startNode) {
            this.history.push({
                currentNodeId: null,
                tapeState: this.initializeTape(this.inputString, this.initialHeadPosition),
                status: 'REJECTED',
                message: 'No hay estado inicial definido.',
                step: 0
            });
            return;
        }

        const hasFinalNode = this.nodes.some(n => n.IsEnd);
        if (!hasFinalNode) {
            this.history.push({
                currentNodeId: null,
                tapeState: this.initializeTape(this.inputString, this.initialHeadPosition),
                status: 'REJECTED',
                message: 'No hay estados finales definidos en la máquina de Turing.',
                step: 0
            });
            return;
        }

        // Estado inicial (Paso 0)
        const initialTapeState = this.initializeTape(this.inputString, this.initialHeadPosition);
        const currentChar = this.readTape(initialTapeState);
        
        this.history.push({
            currentNodeId: startNode.id,
            tapeState: JSON.parse(JSON.stringify(initialTapeState)), // Copia profunda
            status: 'RUNNING',
            message: `Inicia en el estado ${startNode.label}. Cabezal en posición ${initialTapeState.headPosition}, leyendo '${currentChar}'.`,
            step: 0,
            transition: null
        });

        // Ejecuta la simulación para pre-calcular los pasos
        this.run();
    }

    /**
     * Simula la ejecución completa de la máquina de Turing
     */
    run() {
        let currentState = this.history[0];
        let stepCount = 1;

        while (currentState.status === 'RUNNING' && stepCount <= this.maxSteps) {
            const currentTapeState = JSON.parse(JSON.stringify(currentState.tapeState));
            const currentChar = this.readTape(currentTapeState);
            
            // Buscar transición aplicable
            const transition = this.findMatchingTransition(currentState.currentNodeId, currentChar);
            
            if (!transition) {
                // No hay transición aplicable - máquina se detiene
                const currentNode = this.nodes.find(n => n.id === currentState.currentNodeId);
                const isAccepted = currentNode && currentNode.IsEnd;
                
                this.history.push({
                    currentNodeId: currentState.currentNodeId,
                    tapeState: currentTapeState,
                    status: isAccepted ? 'ACCEPTED' : 'REJECTED',
                    message: isAccepted 
                        ? `La máquina se detiene en estado final ${currentNode.label}. Cadena ACEPTADA.`
                        : `La máquina se detiene en estado no final. Cadena RECHAZADA.`,
                    step: stepCount,
                    transition: null
                });
                break;
            }

            // Aplicar la transición
            this.writeTape(currentTapeState, transition.writeChar);
            this.moveHead(currentTapeState, transition.moveDirection);
            
            const newChar = this.readTape(currentTapeState);
            const targetNode = this.nodes.find(n => n.id === transition.to);
            
            const newState = {
                currentNodeId: transition.to,
                tapeState: currentTapeState,
                status: 'RUNNING',
                message: `Estado ${targetNode ? targetNode.label : 'desconocido'}: leyó '${currentChar}', escribió '${transition.writeChar}', movió ${this.getDirectionName(transition.moveDirection)}. Ahora lee '${newChar}'.`,
                step: stepCount,
                transition: transition
            };

            this.history.push(newState);
            currentState = newState;
            stepCount++;
        }

        if (stepCount > this.maxSteps) {
            this.history.push({
                currentNodeId: currentState.currentNodeId,
                tapeState: currentState.tapeState,
                status: 'TIMEOUT',
                message: `La ejecución se detuvo después de ${this.maxSteps} pasos para evitar bucle infinito.`,
                step: stepCount,
                transition: null
            });
        }
    }

    /**
     * Convierte la dirección a nombre legible
     * @param {string} direction - Dirección ('L', 'R', 'M', 'S')
     * @returns {string} Nombre legible de la dirección
     */
    getDirectionName(direction) {
        const dir = direction.toUpperCase();
        switch (dir) {
            case 'L': return 'izquierda';
            case 'R': return 'derecha';
            case 'M':
            case 'S': return 'sin mover';
            default: return direction;
        }
    }

    /**
     * Avanza un paso en la ejecución
     * @returns {Object|null} Estado del paso siguiente o null si no hay más pasos
     */
    stepForward() {
        if (this.currentStep < this.history.length - 1) {
            this.currentStep++;
            return this.history[this.currentStep];
        }
        return null;
    }

    /**
     * Retrocede un paso en la ejecución
     * @returns {Object|null} Estado del paso anterior o null si ya está en el inicio
     */
    stepBackward() {
        if (this.currentStep > 0) {
            this.currentStep--;
            return this.history[this.currentStep];
        }
        return null;
    }

    /**
     * Obtiene el estado actual
     * @returns {Object} Estado actual de la ejecución
     */
    getCurrentState() {
        return this.history[this.currentStep] || null;
    }

    /**
     * Obtiene todo el historial de ejecución
     * @returns {Array} Historial completo
     */
    getHistory() {
        return this.history;
    }

    /**
     * Reinicia la ejecución al paso inicial
     */
    reset() {
        this.currentStep = 0;
    }

    /**
     * Obtiene información sobre las transiciones disponibles desde el estado actual
     * @returns {Array} Array de información sobre transiciones disponibles
     */
    getAvailableTransitions() {
        const currentState = this.getCurrentState();
        if (!currentState) return [];

        const currentChar = this.readTape(currentState.tapeState);
        const possibleTransitions = this.edges.filter(edge => edge.from === currentState.currentNodeId);
        
        const transitionsInfo = [];
        
        for (const transition of possibleTransitions) {
            const targetNode = this.nodes.find(n => n.id === transition.to);
            const allLabelsInfo = [];
            
            for (const label of transition.labels) {
                const labelText = typeof label === 'object' ? label.text : label;
                const parts = labelText.split(',');
                
                if (parts.length === 3) {
                    const readChar = parts[0].trim();
                    const writeChar = parts[1].trim();
                    const moveDir = parts[2].trim();
                    
                    const isMatching = this.matchesCharacter(readChar, currentChar);
                    
                    allLabelsInfo.push({
                        label: labelText,
                        readChar: readChar,
                        writeChar: writeChar,
                        moveDirection: moveDir,
                        isMatching: isMatching,
                        description: `Lee '${readChar}', escribe '${writeChar}', mueve ${this.getDirectionName(moveDir)}`
                    });
                }
            }
            
            if (allLabelsInfo.length > 0) {
                transitionsInfo.push({
                    edge: transition,
                    targetNode: targetNode,
                    allLabelsInfo: allLabelsInfo,
                    hasMatching: allLabelsInfo.some(info => info.isMatching)
                });
            }
        }
        
        return transitionsInfo;
    }
}
