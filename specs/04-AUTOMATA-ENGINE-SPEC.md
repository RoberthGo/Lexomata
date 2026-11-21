# 04 — Especificación Formal del Motor de Autómatas Finitos

## 1. Definición Formal Soportada

Un Autómata Finito se define como la 5-tupla $M = (Q, \Sigma, \delta, q_0, F)$:
- $Q$: conjunto finito no vacío de estados (`states`).
- $\Sigma$: alfabeto de entrada inferido dinámicamente de las transiciones (símbolos no nulos) unido con `config.alphabet`.
- $\delta$: función/relación de transición:
  - **AFD:** $\delta: Q \times \Sigma \to Q$ (como máximo una transición por par `(estado, símbolo)`, sin transiciones $\varepsilon$).
  - **AFN:** $\delta: Q \times \Sigma \to \mathcal{P}(Q)$ (múltiples transiciones permitidas para un mismo símbolo, sin $\varepsilon$).
  - **AFN-ε:** $\delta: Q \times (\Sigma \cup \{\varepsilon\}) \to \mathcal{P}(Q)$.
- $q_0 \in Q$: exactamente un estado inicial (`isInitial: true`).
- $F \subseteq Q$: subconjunto de estados de aceptación (`isAccepting: true`).

---

## 2. Validación Estática (`validate_machine`)

El motor clasifica hallazgos en **Errores** (impiden simular) y **Advertencias** (permiten simular, se muestran como badges informativos):

### Errores Bloqueantes
1. `NO_INITIAL_STATE`: Ningún estado marcado como inicial.
2. `MULTIPLE_INITIAL_STATES`: Más de un estado con `isInitial: true`.
3. `NON_DETERMINISTIC_CONFLICT` (solo si `machineType === "DFA"`):
   - Existe una transición con símbolo $\varepsilon$ (`symbol: null`), o
   - Existen $\ge 2$ transiciones salientes del mismo estado con el mismo símbolo.
4. `INVALID_TRANSITION_RULE`: Transición apunta a un `from` o `to` inexistente, o tiene `rule.kind !== "FA"`.

### Advertencias (No bloqueantes)
- **AFD incompleto:** Existen pares `(q, a)` sin transición definida (al simular, si se cae en transición indefinida, la cadena muere / rechaza inmediatamente — comportamiento equivalente a estado sumidero implícito, tal como en JFLAP).
- **Estados inalcanzables:** Estados no alcanzables desde $q_0$ mediante BFS.
- **Sin estados de aceptación:** $F = \emptyset$ (el lenguaje aceptado es $\emptyset$).
- **AFN con $\varepsilon$ en modo `NFA`:** Sugerir cambiar modo a `NFA_EPSILON`.

---

## 3. Semántica de Simulación (`fa_simulate_full`)

### 3.1 Tokenización de la Cadena de Entrada
- Por defecto, cada carácter Unicode de `input` es un símbolo de entrada (`"abba"` $\to$ `["a", "b", "b", "a"]`).
- Cadena vacía `""` se procesa válidamente (0 símbolos consumidos; acepta si y solo si $\varepsilon\text{-closure}(\{q_0\}) \cap F \neq \emptyset$).

### 3.2 Cálculo de $\varepsilon$-Clausura (`epsilon_closure`)
- Implementada mediante BFS/DFS con conjunto `visited: BTreeSet<StateId>` para **garantizar terminación ante ciclos $\varepsilon$** (ej. $q_0 \xrightarrow{\varepsilon} q_1 \xrightarrow{\varepsilon} q_0$).
- Retorna tanto los estados alcanzados como los IDs de las aristas $\varepsilon$ recorridas para que la interfaz las ilumine.

### 3.3 Traza Paso a Paso (`FaSimulationTrace`)
Cada paso $t$ del arreglo `steps` contiene:
- `stepIndex`: número de paso (`0` = configuración inicial tras $\varepsilon$-clausura de $q_0$).
- `inputIndex`: posición del siguiente símbolo a leer (`0..=input.len()`).
- `consumedSymbol`: símbolo consumido para llegar a este paso (`null` en paso 0).
- `activeStateIds`: conjunto ordenado de estados activos actualmente.
- `firedTransitionIds`: aristas recorridas en la transición de $t-1 \to t$ (incluye aristas $\varepsilon$ encadenadas).
- `activeBranches`: lista acotada de rutas activas (hasta 64 ramas rastreadas en detalle para visualización tipo árbol de trazas como en JFLAP, con resumen de conteo si hay explosión combinatoria).

### 3.4 Condición de Aceptación
Al terminar de consumir todos los símbolos de entrada:
- **ACCEPTED** si `activeStateIds` contiene al menos un estado con `isAccepting === true`.
- **REJECTED** en caso contrario (o si `activeStateIds` queda vacío antes de terminar la cadena).

---

## 4. Transformaciones Formales

### 4.1 Conversión AFN-ε / AFN → AFD (`fa_nfa_to_dfa`)
1. Calcular el alfabeto efectivo $\Sigma$ (todos los símbolos no nulos presentes).
2. Estado inicial del AFD: $S_0 = \varepsilon\text{-closure}(\{q_0\})$.
3. Algoritmo de construcción de subconjuntos (BFS sobre `BTreeSet<StateId>` para claves canónicas deterministas).
4. Para cada conjunto $S$ y cada $a \in \Sigma$:
   $$S' = \varepsilon\text{-closure}\!\left(\bigcup_{q \in S} \delta(q, a)\right)$$
   - Si $S' = \emptyset$, omitir o crear estado sumidero explícito según flag `includeDeadState` (por defecto `false` para grafos más limpios, opcional en UI).
5. Un estado compuesto $S$ es de aceptación si $S \cap F \neq \emptyset$.
6. **Etiquetado claro:** Asignar etiquetas legibles (`{q0, q1}` o `D0`, `D1` con `subsetMap` adjunto para tooltip/tabla) y generar coordenadas iniciales automáticas no solapadas en cuadrícula/círculo.
7. Límite de seguridad: si el AFD resultante supera `256` estados, retornar error controlado `STEP_LIMIT_EXCEEDED` en vez de agotar memoria WASM.

### 4.2 Minimización de AFD (`fa_minimize_dfa`)
1. Validar que el autómata sea un AFD válido.
2. **Paso 1:** Eliminar estados inalcanzables desde $q_0$ (reportarlos en `removedUnreachable`).
3. **Paso 2:** Completar temporalmente transiciones faltantes hacia un estado sumidero virtual para que la partición sea matemáticamente exacta.
4. **Paso 3:** Ejecutar algoritmo de **Hopcroft** (o refinamiento de particiones $P_0 = \{F, Q \setminus F\}$).
5. **Paso 4:** Construir el AFD mínimo fusionando cada clase de equivalencia en un nuevo estado, preservando la posición promedio $(x, y)$ de los estados originales fusionados (si no colisiona) y descartando el sumidero virtual si no era necesario.
6. Retornar `equivalenceClasses` para que la UI pueda explicar al estudiante qué estados fueron fusionados.

---

## 5. Compatibilidad con JFLAP (`.jff`)
- **Importar:** parsear XML `<structure><type>fa</type><automaton>...</automaton></structure>`.
  - Leer `<state id="..." name="..."><x/><y/><initial/><final/></state>`.
  - Leer `<transition><from/><to/><read/></transition>` (`<read/>` vacío = $\varepsilon$).
  - Inferir `machineType`: si hay `<read/>` vacío $\to$ `NFA_EPSILON`; si hay conflictos deterministas $\to$ `NFA`; si no $\to$ `DFA`.
- **Exportar:** generar XML `.jff` limpio que JFLAP 7.1 pueda abrir sin errores.

---

## 6. Casos de Prueba Obligatorios (`cargo test`)
1. AFD que acepta cadenas binarias terminadas en `"01"` (casos positivos, negativos y cadena vacía).
2. AFN-ε con **ciclo de transiciones vacías** ($q_0 \xrightarrow{\varepsilon} q_1 \xrightarrow{\varepsilon} q_0$) — debe terminar sin loop infinito.
3. AFN con múltiples ramas simultáneas donde una rama muere y otra acepta.
4. Conversión AFN-ε → AFD verificando equivalencia de aceptación sobre las 64 cadenas binarias de longitud $\le 5$.
5. Minimización de AFD con estados redundantes y estados inalcanzables verificando equivalencia exacta.
6. Roundtrip `.jff` → `LexoProject` → `.jff`.
