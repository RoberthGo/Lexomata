// ---------------------------------------------------------------------------------
// SECTION: Regular Expression Handler for Automata Transitions
// ---------------------------------------------------------------------------------

/**
 * Clase para manejar expresiones regulares en las transiciones de autómatas
 */
class RegexHandler {
    /**
     * Extrae el texto de una etiqueta, manejando tanto strings como objetos
     * @param {string|object} label - La etiqueta (puede ser string o objeto con propiedad text)
     * @returns {string|null} - El texto extraído o null si no es válido
     */
    static extractLabelText(label) {
        // Manejar valores null o undefined
        if (label === null || label === undefined) {
            return null;
        }
        
        // Si ya es un string, verificar que no sea "[object Object]"
        if (typeof label === 'string') {
            if (label === '[object Object]' || label === '') {
                return null;
            }
            return label;
        }
        
        // Si es un objeto, extraer la propiedad text
        if (typeof label === 'object') {
            // Verificar si tiene propiedad text
            if (label.hasOwnProperty('text') && typeof label.text === 'string') {
                if (label.text === '[object Object]' || label.text === '') {
                    return null;
                }
                return label.text;
            }
            
            // Si es un objeto sin propiedad text, podría ser un error
            console.warn('Label es un objeto sin propiedad text válida:', label);
            return null;
        }
        
        // Para cualquier otro tipo, convertir a string de manera segura
        try {
            const stringValue = String(label);
            if (stringValue === '[object Object]' || stringValue === 'undefined' || stringValue === 'null') {
                return null;
            }
            return stringValue;
        } catch (error) {
            console.warn('Error al convertir label a string:', error);
            return null;
        }
    }

    /**
     * Verifica si una etiqueta es una expresión regular válida
     * @param {string|object} label - La etiqueta a verificar
     * @returns {boolean}
     */
    static isRegexPattern(label) {
        // Extraer el texto de la etiqueta
        const labelText = this.extractLabelText(label);
        
        // Si no se pudo extraer texto válido, no es una regex
        if (!labelText || typeof labelText !== 'string') {
            return false;
        }
        
        // Verificar si la etiqueta está entre barras diagonales o contiene metacaracteres
        return labelText.startsWith('/') && labelText.endsWith('/') ||
               labelText.includes('[') || labelText.includes(']') ||
               labelText.includes('(') || labelText.includes(')') ||
               labelText.includes('*') || labelText.includes('+') ||
               labelText.includes('?') || labelText.includes('|') ||
               labelText.includes('^') || labelText.includes('$') ||
               labelText.includes('\\d') || labelText.includes('\\w') ||
               labelText.includes('\\s') || labelText.includes('.');
    }

    /**
     * Convierte una etiqueta en un objeto RegExp
     * @param {string|object} label - La etiqueta a convertir
     * @returns {RegExp|null}
     */
    static createRegExp(label) {
        // Extraer el texto de la etiqueta
        const labelText = this.extractLabelText(label);
        
        // Verificar que se extrajo texto válido
        if (!labelText || typeof labelText !== 'string') {
            return null;
        }
        
        try {
            // Si está entre barras diagonales, extraer el patrón y flags
            if (labelText.startsWith('/') && labelText.endsWith('/')) {
                const lastSlash = labelText.lastIndexOf('/');
                const pattern = labelText.slice(1, lastSlash);
                const flags = labelText.slice(lastSlash + 1);
                return new RegExp(pattern, flags);
            }
            
            // Si no está entre barras, tratarlo como patrón directo
            return new RegExp(labelText);
        } catch (error) {
            console.warn(`Error creando expresión regular para "${labelText}":`, error);
            return null;
        }
    }

    /**
     * Encuentra la coincidencia más larga al inicio de la cadena
     * @param {string|object} label - La etiqueta (puede ser regex o literal)
     * @param {string} input - La cadena de entrada
     * @returns {string|null} - La coincidencia encontrada o null
     */
    static findMatch(label, input) {
        // Extraer el texto de la etiqueta
        const labelText = this.extractLabelText(label);
        
        // Verificar que ambos parámetros sean válidos
        if (!labelText || typeof labelText !== 'string' || !input || typeof input !== 'string') {
            return null;
        }

        // Si no es una expresión regular, usar coincidencia literal
        if (!this.isRegexPattern(labelText)) {
            return input.startsWith(labelText) ? labelText : null;
        }

        // Crear expresión regular
        const regex = this.createRegExp(labelText);
        if (!regex) return null;

        // Asegurar que la regex busque desde el inicio
        const anchoredPattern = regex.source.startsWith('^') ? 
            regex.source : '^' + regex.source;
        
        try {
            const anchoredRegex = new RegExp(anchoredPattern, regex.flags);
            const match = input.match(anchoredRegex);
            return match ? match[0] : null;
        } catch (error) {
            console.warn(`Error ejecutando regex "${labelText}" en "${input}":`, error);
            return null;
        }
    }

    /**
     * Obtiene todas las posibles coincidencias desde el inicio de la cadena
     * para múltiples etiquetas, priorizando las más largas
     * @param {Array<string|object>} labels - Array de etiquetas
     * @param {string} input - La cadena de entrada
     * @returns {Array<{label: string, match: string, length: number}>}
     */
    static findAllMatches(labels, input) {
        // Verificar que labels sea un array válido
        if (!Array.isArray(labels) || !input || typeof input !== 'string') {
            return [];
        }
        
        const matches = [];

        for (const label of labels) {
            // Extraer el texto de la etiqueta
            const labelText = this.extractLabelText(label);
            
            // Solo procesar si se pudo extraer texto válido
            if (labelText) {
                const match = this.findMatch(labelText, input);
                if (match) {
                    matches.push({
                        label: labelText,
                        match: match,
                        length: match.length
                    });
                }
            }
        }

        // Ordenar por longitud descendente (las más largas primero)
        return matches.sort((a, b) => b.length - a.length);
    }

    /**
     * Valida si una etiqueta es una expresión regular válida
     * @param {string|object} label - La etiqueta a validar
     * @returns {{valid: boolean, error?: string}}
     */
    static validateRegex(label) {
        // Extraer el texto de la etiqueta
        const labelText = this.extractLabelText(label);
        
        // Verificar que se extrajo texto válido
        if (!labelText || typeof labelText !== 'string') {
            return { 
                valid: false, 
                error: 'La etiqueta debe ser una cadena de texto válida' 
            };
        }
        
        if (!this.isRegexPattern(labelText)) {
            // Para cadenas literales, verificar caracteres de escape inválidos
            return this.validateLiteralString(labelText);
        }

        try {
            this.createRegExp(labelText);
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
     * @param {string|object} label - La etiqueta literal a validar
     * @returns {{valid: boolean, error?: string}}
     */
    static validateLiteralString(label) {
        // Extraer el texto de la etiqueta
        const labelText = this.extractLabelText(label);
        
        // Verificar que se extrajo texto válido
        if (!labelText || typeof labelText !== 'string') {
            return { 
                valid: false, 
                error: 'La etiqueta debe ser una cadena de texto válida' 
            };
        }
        
        // Detectar secuencias de escape inválidas en cadenas literales
        // Caracteres de escape válidos: \d, \D, \w, \W, \s, \S, \n, \r, \t, \f, \v, \b, \\, \/, \[, \], \(, \), \{, \}, \., \*, \+, \?, \^, \$, \|
        const invalidEscapePattern = /\\([^dnwsrntfvbDSWRNTFVB0-9\[\](){}.*+?^$|\\\/])/g;
        const matches = labelText.match(invalidEscapePattern);
        
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
     * @param {string|object} label - La etiqueta regex
     * @param {number} maxExamples - Número máximo de ejemplos
     * @returns {Array<string>}
     */
    static generateExamples(label, maxExamples = 5) {
        // Extraer el texto de la etiqueta
        const labelText = this.extractLabelText(label);
        
        // Si no se pudo extraer texto válido, retornar array vacío
        if (!labelText || typeof labelText !== 'string') {
            return [];
        }
        
        if (!this.isRegexPattern(labelText)) {
            return [labelText]; // Para cadenas literales, el ejemplo es la misma cadena
        }

        // Ejemplos básicos para patrones comunes
        const examples = [];

        if (labelText.includes('\\d')) {
            examples.push('123', '0', '999');
        }
        if (labelText.includes('\\w')) {
            examples.push('abc', 'A1', 'test');
        }
        if (labelText.includes('\\s')) {
            examples.push(' ', '\t', '\n');
        }
        if (labelText.includes('[a-z]')) {
            examples.push('a', 'z', 'hello');
        }
        if (labelText.includes('[A-Z]')) {
            examples.push('A', 'Z', 'HELLO');
        }
        if (labelText.includes('[0-9]')) {
            examples.push('0', '9', '123');
        }
        if (labelText.includes('.')) {
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
     * @param {string|object} label - La etiqueta regex
     * @returns {string}
     */
    static getDescription(label) {
        // Extraer el texto de la etiqueta
        const labelText = this.extractLabelText(label);
        
        // Si no se pudo extraer texto válido, retornar descripción de error
        if (!labelText || typeof labelText !== 'string') {
            return 'Etiqueta inválida';
        }
        
        if (!this.isRegexPattern(labelText)) {
            return `Coincidencia exacta: "${labelText}"`;
        }

        let description = 'Expresión regular: ';
        
        if (labelText.includes('\\d')) description += 'dígitos, ';
        if (labelText.includes('\\w')) description += 'caracteres alfanuméricos, ';
        if (labelText.includes('\\s')) description += 'espacios en blanco, ';
        if (labelText.includes('[a-z]')) description += 'letras minúsculas, ';
        if (labelText.includes('[A-Z]')) description += 'letras mayúsculas, ';
        if (labelText.includes('[0-9]')) description += 'números, ';
        if (labelText.includes('.')) description += 'cualquier carácter, ';
        if (labelText.includes('*')) description += 'cero o más repeticiones, ';
        if (labelText.includes('+')) description += 'una o más repeticiones, ';
        if (labelText.includes('?')) description += 'opcional, ';
        if (labelText.includes('|')) description += 'alternativas, ';

        // Limpiar la descripción
        description = description.replace(/, $/, '');
        
        if (description === 'Expresión regular: ') {
            description += `patrón "${labelText}"`;
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
