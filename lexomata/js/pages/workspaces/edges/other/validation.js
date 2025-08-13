/**
 * Valida una etiqueta de transición para asegurar que no contenga caracteres de escape inválidos
 * @param {string} label - La etiqueta a validar
 * @param {string} mode - Modo actual ('automata' o 'turing')
 * @returns {object} - Objeto con isValid (boolean), error (string), y normalizedLabel (string)
 */
function validateTransitionLabel(label, mode = 'automata') {
    if (!label || typeof label !== 'string') {
        return { isValid: false, error: 'La etiqueta no puede estar vacía' };
    }

    // Validaciones específicas para máquina de Turing
    if (mode === 'turing') {
        // Normalizar la etiqueta reemplazando espacios vacíos con '□'
        const normalizedLabel = normalizeTuringLabel(label);
        const validation = validateTuringTransition(normalizedLabel);
        
        // Retornar la validación con la etiqueta normalizada
        return {
            ...validation,
            normalizedLabel: normalizedLabel
        };
    }

    // Validaciones para autómata (código original)
    return validateAutomataTransition(label);
}

/**
 * Valida una transición de máquina de Turing
 * @param {string} label - Etiqueta en formato "leer,escribir,mover"
 * @returns {object} - Objeto con isValid y error
 */
function validateTuringTransition(label) {
    // Verificar formato básico "a,b,c"
    let parts = label.split(',');

    if (parts.length !== 3) {
        return {
            isValid: false,
            error: 'Formato inválido. Debe tener exactamente 3 partes separadas por comas: "leer,escribir,mover"'
        };
    }

    // Procesar cada parte y reemplazar espacios vacíos con '□'
    parts = parts.map(part => {
        const trimmed = part.trim();
        // Si la parte está vacía o contiene solo espacios, reemplazar con '□'
        return trimmed === '' || /^\s*$/.test(part) ? '□' : trimmed;
    });

    const [readChar, writeChar, moveDir] = parts;

    // Validar carácter de lectura - opcional pero a lo sumo un carácter
    if (readChar.length > 1 && readChar !== '□') {
        return {
            isValid: false,
            error: 'El carácter de lectura debe ser como mucho un solo carácter (ej: "a", "R", "1", "□" para blanco, o vacío)'
        };
    }

    // Validar carácter de escritura - opcional pero a lo sumo un carácter
    if (writeChar.length > 1 && writeChar !== '□') {
        return {
            isValid: false,
            error: 'El carácter de escritura debe ser como mucho un solo carácter (ej: "c", "r", "2", "□" para blanco, o vacío)'
        };
    }

    // Validar dirección de movimiento - debe ser exactamente un carácter válido
    const validMoves = ['L', 'R', 'M', 'l', 'r', 'm', 'S', 's'];
    if (!moveDir) {
        return {
            isValid: false,
            error: 'La dirección de movimiento no puede estar vacía'
        };
    }

    if (moveDir.length > 1) {
        return {
            isValid: false,
            error: 'La dirección de movimiento debe ser exactamente un carácter: L (izquierda), R (derecha), M/S (mantener)'
        };
    }

    if (!validMoves.includes(moveDir)) {
        return {
            isValid: false,
            error: 'La dirección debe ser L (izquierda), R (derecha), M/S (mantener/stay)'
        };
    }

    return { isValid: true, error: null };
}

/**
 * Normaliza una etiqueta de Turing reemplazando espacios vacíos con el símbolo '□'
 * @param {string} label - Etiqueta en formato "leer,escribir,mover"
 * @returns {string} - Etiqueta normalizada
 */
function normalizeTuringLabel(label) {
    if (!label || typeof label !== 'string') {
        return label;
    }

    const parts = label.split(',');
    
    // Si no tiene el formato correcto, devolver tal como está
    if (parts.length !== 3) {
        return label;
    }

    // Procesar cada parte y reemplazar espacios vacíos con '□'
    const normalizedParts = parts.map(part => {
        const trimmed = part.trim();
        // Si la parte está vacía o contiene solo espacios, reemplazar con '□'
        return trimmed === '' || /^\s*$/.test(part) ? '□' : trimmed;
    });

    return normalizedParts.join(',');
}

/**
 * Valida una transición de autómata (función original)
 * @param {string} label - Etiqueta de la transición
 * @returns {object} - Objeto con isValid y error
 */
function validateAutomataTransition(label) {

    // Casos específicos de errores comunes con caracteres de escape
    const commonInvalidEscapes = [
        { pattern: /\\test/g, description: '\\test (use \\t para tabulación o "test" para literal)' },
        { pattern: /\\hello/g, description: '\\hello (use "hello" para literal)' },
        { pattern: /\\word/g, description: '\\word (use \\w para alfanuméricos o "word" para literal)' },
        { pattern: /\\space/g, description: '\\space (use \\s para espacios o "space" para literal)' },
        { pattern: /\\digit/g, description: '\\digit (use \\d para dígitos o "digit" para literal)' },
        { pattern: /\\num/g, description: '\\num (use \\d para dígitos o "num" para literal)' },
        { pattern: /\\char/g, description: '\\char (use \\w para alfanuméricos o "char" para literal)' },
        { pattern: /\\letter/g, description: '\\letter (use [a-zA-Z] para letras o "letter" para literal)' }
    ];

    // Verificar casos específicos comunes
    for (const invalid of commonInvalidEscapes) {
        if (invalid.pattern.test(label)) {
            return {
                isValid: false,
                error: `Secuencia de escape inválida encontrada: ${invalid.description}`
            };
        }
    }

    // Verificar caracteres de escape inválidos en general
    const invalidEscapePattern = /\\([^dnwsrntfvbDSWRNTFVB0-9\[\](){}.*+?^$|\\\/])/g;
    const invalidEscapes = label.match(invalidEscapePattern);

    if (invalidEscapes) {
        const uniqueInvalidEscapes = [...new Set(invalidEscapes)];
        return {
            isValid: false,
            error: `Secuencias de escape inválidas: ${uniqueInvalidEscapes.join(', ')}. 

Caracteres de escape válidos:
• \\d - dígitos (0-9)
• \\w - alfanuméricos (a-z, A-Z, 0-9, _)  
• \\s - espacios en blanco
• \\n - nueva línea
• \\t - tabulación
• \\\\ - barra invertida literal
• \\. \\* \\+ \\? \\^ \\$ \\| - símbolos literales

Para texto literal, no uses \\ al inicio (ej: use "test" en lugar de "\\test")`
        };
    }

    // Verificar si es una expresión regular válida (si parece ser regex)
    if (typeof RegexHandler !== 'undefined') {
        const regexValidation = RegexHandler.validateRegex(label);
        if (!regexValidation.valid) {
            return {
                isValid: false,
                error: `Expresión regular inválida: ${regexValidation.error}`
            };
        }
    } else {
        // Fallback si RegexHandler no está disponible
        // Verificar caracteres básicos permitidos
        const basicValidPattern = /^[a-zA-Z0-9_|().,\[\]\-\\^$*+?{}\/\s]+$/;
        if (!basicValidPattern.test(label)) {
            return {
                isValid: false,
                error: 'La etiqueta contiene caracteres no permitidos'
            };
        }
    }

    return { isValid: true, error: null };
}
/**
 * Proporciona sugerencias para corregir transiciones de Turing mal formateadas
 * @param {string} label - Etiqueta que falló la validación
 * @returns {string} - Sugerencia de corrección
 */
function suggestTuringTransitionFix(label) {
    const suggestions = [];

    // Si no tiene comas, sugerir el formato
    if (!label.includes(',')) {
        suggestions.push('Agregue comas para separar: leer,escribir,mover');
        suggestions.push(`Ejemplo: "${label},${label},R"`);
        return suggestions.join('\n');
    }

    const parts = label.split(',');

    if (parts.length < 3) {
        suggestions.push('Faltan componentes. Formato: leer,escribir,mover');
    }

    if (parts.length > 3) {
        suggestions.push('Demasiados componentes. Use solo: leer,escribir,mover');
    }

    // Verificar la dirección si existe
    if (parts.length >= 3) {
        const moveDir = parts[2].trim();
        if (!['L', 'R', 'M', 'l', 'r', 'm', 'S', 's'].includes(moveDir)) {
            suggestions.push('Dirección inválida. Use: L (izquierda), R (derecha), M/S (mantener)');
        }
    }

    return suggestions.length > 0 ? suggestions.join('\n') : 'Verifique el formato: leer,escribir,mover';
}
/**
 * Valida y convierte una arista al tipo correcto según el modo actual
 * @param {Object} edge - La arista a validar
 * @param {string} mode - Modo actual ('automata' o 'turing')
 * @returns {Object} - Arista validada y posiblemente convertida
 */
function validateAndConvertEdge(edge, mode) {
    // Si la arista ya es del tipo correcto, devolverla tal como está
    if (mode === 'turing' && edge instanceof EdgeTuring) {
        return edge;
    }
    if (mode === 'automata' && edge instanceof EdgeAutomata) {
        return edge;
    }

    // Si el tipo no coincide con el modo, convertir
    if (mode === 'turing' && !(edge instanceof EdgeTuring)) {
        // Convertir a EdgeTuring
        const labels = edge.labels || [];
        if (labels.length > 0) {
            // Validar que las etiquetas tengan el formato correcto para Turing
            const validLabels = labels.filter(label => {
                const labelText = typeof label === 'object' ? label.text : label;
                const validation = validateTuringTransition(labelText);
                return validation.isValid;
            });

            if (validLabels.length > 0) {
                return createTuringEdge(edge.from, edge.to, validLabels);
            }
        }
        // Si no hay etiquetas válidas, crear una EdgeTuring con valores por defecto
        const defaultEdge = new EdgeTuring(edge.from, edge.to, [], 'ε', 'ε', 'R');
        defaultEdge.id = edge.id;
        defaultEdge.labels = edge.labels || [];
        return defaultEdge;
    }

    if (mode === 'automata' && !(edge instanceof EdgeAutomata)) {
        // Convertir a EdgeAutomata
        const newEdge = new EdgeAutomata(edge.from, edge.to, edge.labels || []);
        newEdge.id = edge.id;
        newEdge.note = edge.note || '';
        return newEdge;
    }

    return edge;
}
/**
 * Valida todas las aristas del proyecto y las convierte al tipo correcto
 * @param {string} mode - Modo actual ('automata' o 'turing')
 */
function validateAllEdges(mode) {
    edges = edges.map(edge => validateAndConvertEdge(edge, mode));
}
/**
 * Inicializa las validaciones del proyecto basadas en el modo
 * Esta función se debe llamar al cargar el workspace o cambiar de modo
 */
function initializeEdgeValidations() {
    // Validar todas las aristas existentes
    validateAllEdges(currentMode);

    // Redibuja el canvas para reflejar los cambios
    redrawCanvas();

    console.log(`Validaciones inicializadas para modo: ${currentMode}`);
}