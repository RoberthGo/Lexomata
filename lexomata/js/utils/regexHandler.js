// ---------------------------------------------------------------------------------
// SECTION: Regular Expression Handler for Automata Transitions
// ---------------------------------------------------------------------------------

/**
 * Clase para manejar expresiones regulares en las transiciones de autómatas
 */
class RegexHandler {
    /**
     * Verifica si una etiqueta es una expresión regular válida
     * @param {string} label - La etiqueta a verificar
     * @returns {boolean}
     */
    static isRegexPattern(label) {
        // Verificar si la etiqueta está entre barras diagonales o contiene metacaracteres
        return label.startsWith('/') && label.endsWith('/') ||
               label.includes('[') || label.includes(']') ||
               label.includes('(') || label.includes(')') ||
               label.includes('*') || label.includes('+') ||
               label.includes('?') || label.includes('|') ||
               label.includes('^') || label.includes('$') ||
               label.includes('\\d') || label.includes('\\w') ||
               label.includes('\\s') || label.includes('.');
    }

    /**
     * Convierte una etiqueta en un objeto RegExp
     * @param {string} label - La etiqueta a convertir
     * @returns {RegExp|null}
     */
    static createRegExp(label) {
        try {
            // Si está entre barras diagonales, extraer el patrón y flags
            if (label.startsWith('/') && label.endsWith('/')) {
                const lastSlash = label.lastIndexOf('/');
                const pattern = label.slice(1, lastSlash);
                const flags = label.slice(lastSlash + 1);
                return new RegExp(pattern, flags);
            }
            
            // Si no está entre barras, tratarlo como patrón directo
            return new RegExp(label);
        } catch (error) {
            console.warn(`Error creando expresión regular para "${label}":`, error);
            return null;
        }
    }

    /**
     * Encuentra la coincidencia más larga al inicio de la cadena
     * @param {string} label - La etiqueta (puede ser regex o literal)
     * @param {string} input - La cadena de entrada
     * @returns {string|null} - La coincidencia encontrada o null
     */
    static findMatch(label, input) {
        if (!label || !input) return null;

        // Si no es una expresión regular, usar coincidencia literal
        if (!this.isRegexPattern(label)) {
            return input.startsWith(label) ? label : null;
        }

        // Crear expresión regular
        const regex = this.createRegExp(label);
        if (!regex) return null;

        // Asegurar que la regex busque desde el inicio
        const anchoredPattern = regex.source.startsWith('^') ? 
            regex.source : '^' + regex.source;
        
        try {
            const anchoredRegex = new RegExp(anchoredPattern, regex.flags);
            const match = input.match(anchoredRegex);
            return match ? match[0] : null;
        } catch (error) {
            console.warn(`Error ejecutando regex "${label}" en "${input}":`, error);
            return null;
        }
    }

    /**
     * Obtiene todas las posibles coincidencias desde el inicio de la cadena
     * para múltiples etiquetas, priorizando las más largas
     * @param {Array<string>} labels - Array de etiquetas
     * @param {string} input - La cadena de entrada
     * @returns {Array<{label: string, match: string, length: number}>}
     */
    static findAllMatches(labels, input) {
        const matches = [];

        for (const label of labels) {
            const match = this.findMatch(label, input);
            if (match) {
                matches.push({
                    label: label,
                    match: match,
                    length: match.length
                });
            }
        }

        // Ordenar por longitud descendente (las más largas primero)
        return matches.sort((a, b) => b.length - a.length);
    }

    /**
     * Valida si una etiqueta es una expresión regular válida
     * @param {string} label - La etiqueta a validar
     * @returns {{valid: boolean, error?: string}}
     */
    static validateRegex(label) {
        if (!this.isRegexPattern(label)) {
            // Para cadenas literales, verificar caracteres de escape inválidos
            return this.validateLiteralString(label);
        }

        try {
            this.createRegExp(label);
            return { valid: true };
        } catch (error) {
            return { 
                valid: false, 
                error: error.message 
            };
        }
    }

    /**
     * Valida una cadena literal para caracteres de escape inválidos
     * @param {string} label - La etiqueta literal a validar
     * @returns {{valid: boolean, error?: string}}
     */
    static validateLiteralString(label) {
        // Detectar secuencias de escape inválidas en cadenas literales
        // Caracteres de escape válidos: \d, \D, \w, \W, \s, \S, \n, \r, \t, \f, \v, \b, \\, \/, \[, \], \(, \), \{, \}, \., \*, \+, \?, \^, \$, \|
        const invalidEscapePattern = /\\([^dnwsrntfvbDSWRNTFVB0-9\[\](){}.*+?^$|\\\/])/g;
        const matches = label.match(invalidEscapePattern);
        
        if (matches) {
            const invalidEscapes = matches.map(match => match);
            const uniqueInvalidEscapes = [...new Set(invalidEscapes)];
            return { 
                valid: false, 
                error: `Secuencias de escape inválidas: ${uniqueInvalidEscapes.join(', ')}. Los caracteres de escape válidos incluyen: \\d, \\w, \\s, \\n, \\t, \\\\, etc.` 
            };
        }

        return { valid: true };
    }

    /**
     * Genera ejemplos de cadenas que coincidirían con una expresión regular
     * @param {string} label - La etiqueta regex
     * @param {number} maxExamples - Número máximo de ejemplos
     * @returns {Array<string>}
     */
    static generateExamples(label, maxExamples = 5) {
        if (!this.isRegexPattern(label)) {
            return [label]; // Para cadenas literales, el ejemplo es la misma cadena
        }

        // Ejemplos básicos para patrones comunes
        const examples = [];

        if (label.includes('\\d')) {
            examples.push('123', '0', '999');
        }
        if (label.includes('\\w')) {
            examples.push('abc', 'A1', 'test');
        }
        if (label.includes('\\s')) {
            examples.push(' ', '\t', '\n');
        }
        if (label.includes('[a-z]')) {
            examples.push('a', 'z', 'hello');
        }
        if (label.includes('[A-Z]')) {
            examples.push('A', 'Z', 'HELLO');
        }
        if (label.includes('[0-9]')) {
            examples.push('0', '9', '123');
        }
        if (label.includes('.')) {
            examples.push('a', '1', '@');
        }

        // Agregar algunos ejemplos genéricos si no hay patrones específicos
        if (examples.length === 0) {
            examples.push('test', 'abc', '123');
        }

        return examples.slice(0, maxExamples);
    }

    /**
     * Obtiene información descriptiva sobre una expresión regular
     * @param {string} label - La etiqueta regex
     * @returns {string}
     */
    static getDescription(label) {
        if (!this.isRegexPattern(label)) {
            return `Coincidencia exacta: "${label}"`;
        }

        let description = 'Expresión regular: ';
        
        if (label.includes('\\d')) description += 'dígitos, ';
        if (label.includes('\\w')) description += 'caracteres alfanuméricos, ';
        if (label.includes('\\s')) description += 'espacios en blanco, ';
        if (label.includes('[a-z]')) description += 'letras minúsculas, ';
        if (label.includes('[A-Z]')) description += 'letras mayúsculas, ';
        if (label.includes('[0-9]')) description += 'números, ';
        if (label.includes('.')) description += 'cualquier carácter, ';
        if (label.includes('*')) description += 'cero o más repeticiones, ';
        if (label.includes('+')) description += 'una o más repeticiones, ';
        if (label.includes('?')) description += 'opcional, ';
        if (label.includes('|')) description += 'alternativas, ';

        // Limpiar la descripción
        description = description.replace(/, $/, '');
        
        if (description === 'Expresión regular: ') {
            description += `patrón "${label}"`;
        }

        return description;
    }

    /**
     * Obtiene una lista de caracteres de escape válidos con ejemplos
     * @returns {Array<{escape: string, description: string, example: string}>}
     */
    static getValidEscapeCharacters() {
        return [
            { escape: '\\d', description: 'Cualquier dígito', example: '0-9' },
            { escape: '\\D', description: 'Cualquier carácter que no sea dígito', example: 'a, %, @' },
            { escape: '\\w', description: 'Carácter alfanumérico', example: 'a-z, A-Z, 0-9, _' },
            { escape: '\\W', description: 'Carácter no alfanumérico', example: '%, @, espacios' },
            { escape: '\\s', description: 'Espacio en blanco', example: 'espacio, tab, nueva línea' },
            { escape: '\\S', description: 'Carácter que no sea espacio', example: 'letras, números, símbolos' },
            { escape: '\\n', description: 'Nueva línea', example: 'salto de línea' },
            { escape: '\\r', description: 'Retorno de carro', example: 'retorno de carro' },
            { escape: '\\t', description: 'Tabulación', example: 'tab' },
            { escape: '\\f', description: 'Salto de página', example: 'form feed' },
            { escape: '\\v', description: 'Tabulación vertical', example: 'tab vertical' },
            { escape: '\\b', description: 'Límite de palabra', example: 'entre \\w y \\W' },
            { escape: '\\\\', description: 'Barra invertida literal', example: '\\' },
            { escape: '\\/', description: 'Barra diagonal literal', example: '/' },
            { escape: '\\.', description: 'Punto literal', example: '.' },
            { escape: '\\*', description: 'Asterisco literal', example: '*' },
            { escape: '\\+', description: 'Signo más literal', example: '+' },
            { escape: '\\?', description: 'Signo de interrogación literal', example: '?' },
            { escape: '\\^', description: 'Acento circunflejo literal', example: '^' },
            { escape: '\\$', description: 'Signo de dólar literal', example: '$' },
            { escape: '\\|', description: 'Barra vertical literal', example: '|' },
            { escape: '\\[', description: 'Corchete izquierdo literal', example: '[' },
            { escape: '\\]', description: 'Corchete derecho literal', example: ']' },
            { escape: '\\(', description: 'Paréntesis izquierdo literal', example: '(' },
            { escape: '\\)', description: 'Paréntesis derecho literal', example: ')' },
            { escape: '\\{', description: 'Llave izquierda literal', example: '{' },
            { escape: '\\}', description: 'Llave derecha literal', example: '}' }
        ];
    }
}

// Exponer globalmente
window.RegexHandler = RegexHandler;
