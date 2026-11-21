# 03 — Esquema de Datos `.lexo` y Contrato Rust ↔ TypeScript (WASM)

> **Propósito:** Definir un contrato estricto y versionado para que el motor Rust y la interfaz React evolucionen de forma independiente sin desincronizarse.

---

## 1. Esquema del Archivo de Proyecto `.lexo` (JSON v1)

Todos los proyectos de Lexomata (AFD, AFN, AFN-ε y Máquinas de Turing) comparten una estructura base común con discriminador `machineType`.

```json
{
  "schemaVersion": "1.0.0",
  "id": "uuid-v4",
  "name": "Aceptador de palíndromos binarios",
  "description": "Máquina de Turing de 1 cinta que verifica palíndromos sobre {0,1}",
  "machineType": "TM_SINGLE",
  "createdAt": "2026-11-21T18:00:00Z",
  "updatedAt": "2026-11-21T18:15:00Z",
  "config": {
    "alphabet": ["0", "1"],
    "tapeAlphabet": ["0", "1", "X", "□"],
    "blankSymbol": "□",
    "epsilonSymbol": "ε",
    "tapeCount": 1,
    "defaultMaxSteps": 10000
  },
  "states": [
    {
      "id": "s0",
      "label": "q0",
      "x": 160,
      "y": 240,
      "isInitial": true,
      "isAccepting": false,
      "comment": "Estado inicial"
    },
    {
      "id": "s1",
      "label": "q_acc",
      "x": 480,
      "y": 240,
      "isInitial": false,
      "isAccepting": true
    }
  ],
  "transitions": [
    {
      "id": "t0",
      "from": "s0",
      "to": "s1",
      "curveOffset": 0,
      "rule": {
        "kind": "TM",
        "operations": [
          { "read": "□", "write": "□", "move": "S" }
        ]
      }
    }
  ],
  "testCases": [
    { "id": "tc1", "input": "0110", "expected": "ACCEPT" },
    { "id": "tc2", "input": "0101", "expected": "REJECT" }
  ],
  "viewport": {
    "x": 0,
    "y": 0,
    "zoom": 1
  }
}
```

### 1.1 Valores Permitidos de `machineType`
- `"DFA"` — Autómata Finito Determinista
- `"NFA"` — Autómata Finito No Determinista (sin transiciones vacías)
- `"NFA_EPSILON"` — Autómata Finito No Determinista con transiciones $\varepsilon$
- `"TM_SINGLE"` — Máquina de Turing Determinista de 1 cinta
- `"TM_MULTI"` — Máquina de Turing Multicinta ($k \ge 2$)

### 1.2 Reglas de Transición (`rule`)
1. **Para Autómatas Finitos (`kind: "FA"`):**
   ```json
   {
     "kind": "FA",
     "symbol": "a"
   }
   ```
   - `symbol: null` o `symbol: ""` representa explícitamente una transición vacía ($\varepsilon$). En la UI siempre se renderiza como `ε`.
   - Se almacena 1 símbolo atómico por regla y se agrupan visualmente en el Canvas por par `(from, to)` para simplificar algoritmos en Rust.

2. **Para Máquinas de Turing (`kind: "TM"`):**
   ```json
   {
     "kind": "TM",
     "operations": [
       { "read": "0", "write": "X", "move": "R" }
     ]
   }
   ```
   - `operations.length === config.tapeCount` (para `TM_SINGLE`, siempre longitud 1).
   - `move`: `"L"` (Izquierda), `"R"` (Derecha), `"S"` (Quieto / Stay).
   - `read` / `write`: un símbolo de `tapeAlphabet` (si es igual a `blankSymbol`, se trata como blanco `□`).

---

## 2. Convenciones de Símbolos Especiales
- **Épsilon ($\varepsilon$):** En JSON de FA se representa como `symbol: null` (nunca depender del carácter Unicode como clave lógica; `config.epsilonSymbol` es solo preferencia de visualización, por defecto `"ε"`).
- **Blanco de Turing ($B$ / $\square$):** Se representa en JSON usando el valor exacto de `config.blankSymbol` (por defecto `"□"`). El motor normaliza entradas vacías al símbolo blanco configurado.

---

## 3. Contrato de Funciones Exportadas por `lexomata-wasm`

Todas las funciones aceptan y retornan estructuras serializadas vía `serde-wasm-bindgen` (o strings JSON tipados envueltos en `wasmAdapter.ts`) con formato estándar:

```ts
export type EngineResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: EngineError };

export interface EngineError {
  code:
    | 'INVALID_SCHEMA'
    | 'NO_INITIAL_STATE'
    | 'MULTIPLE_INITIAL_STATES'
    | 'NON_DETERMINISTIC_CONFLICT'
    | 'INVALID_TRANSITION_RULE'
    | 'UNSUPPORTED_OPERATION'
    | 'STEP_LIMIT_EXCEEDED'
    | 'JFLAP_PARSE_ERROR'
    | 'INTERNAL_ERROR';
  message: string;
  relatedIds?: string[]; // IDs de estados o transiciones involucradas para resaltar en UI
}
```

### 3.1 Funciones de Validación y Análisis Estático
| Función WASM | Entrada | Salida (`data`) |
| :--- | :--- | :--- |
| `validate_machine(project)` | `LexoProject` | `ValidationReport` (errores bloqueantes, advertencias: estados inalcanzables, trampas, transiciones faltantes en AFD, conflictos de determinismo) |
| `get_formal_definition(project)` | `LexoProject` | `FormalDefinition` ($Q, \Sigma, \Gamma, \delta, q_0, B, F$ formateados + tabla de transiciones) |

### 3.2 Funciones de Simulación de Autómatas Finitos (AFD / AFN / AFN-ε)
| Función WASM | Entrada | Salida (`data`) |
| :--- | :--- | :--- |
| `fa_simulate_full(project, input, maxSteps)` | `LexoProject, string, number` | `FaSimulationTrace` (veredicto `ACCEPTED \| REJECTED \| STEP_LIMIT`, secuencia de snapshots paso a paso con estados activos, aristas disparadas, índice de carácter y ramas AFN) |
| `fa_batch_run(project, inputs[], maxSteps)` | `LexoProject, string[], number` | `BatchTestResult[]` (input, veredicto, pasos, tiempo en $\mu$s) |

### 3.3 Funciones de Transformación Formal (Autómatas)
| Función WASM | Entrada | Salida (`data`) |
| :--- | :--- | :--- |
| `fa_nfa_to_dfa(project)` | `LexoProject` (AFN / AFN-ε) | `{ dfa: LexoProject, subsetMap: Record<string, string[]> }` (nuevo AFD con mapa de qué subconjunto de estados originó cada estado) |
| `fa_minimize_dfa(project)` | `LexoProject` (AFD) | `{ minimized: LexoProject, equivalenceClasses: string[][], removedUnreachable: string[] }` |

### 3.4 Funciones de Simulación de Máquinas de Turing
| Función WASM | Entrada | Salida (`data`) |
| :--- | :--- | :--- |
| `tm_init(project, tapeInputs[])` | `LexoProject, string[]` | `TmStepSnapshot` (estado inicial $q_0$, celdas pobladas, posición del cabezal `0`, `step: 0`, estado `"RUNNING"`) |
| `tm_step(project, currentState)` | `LexoProject, TmRuntimeState` | `TmStepResult` (siguiente snapshot, arista disparada `firedTransitionId`, delta compacto para *rewind*, veredicto `"RUNNING" \| "ACCEPTED" \| "REJECTED"`) |
| `tm_run_full(project, tapeInputs[], maxSteps)` | `LexoProject, string[], number` | `TmFullRunResult` (veredicto `"ACCEPTED" \| "REJECTED" \| "STEP_LIMIT"`, estado final de cinta(s), total de pasos, historial de deltas acotado para navegar cualquier paso) |
| `tm_batch_run(project, cases[], maxSteps)` | `LexoProject, string[][], number` | `TmBatchResult[]` (input, veredicto, pasos, contenido final de la cinta) |

### 3.5 Funciones de Interoperabilidad JFLAP (`.jff`)
| Función WASM | Entrada | Salida (`data`) |
| :--- | :--- | :--- |
| `import_jflap_xml(xmlString)` | `string` | `LexoProject` (convierte `<type>fa</type>` y `<type>turing</type>` preservando coordenadas) |
| `export_jflap_xml(project)` | `LexoProject` | `string` (XML `.jff` válido para abrir en JFLAP 7.1+) |

---

## 4. Política de Evolución del Contrato
1. Toda función WASM es **pura y sin estado global mutable** (o recibe el estado explícito) para evitar fugas de memoria en WASM y simplificar `Undo/Redo` y pruebas deterministas.
2. Nunca usar `serde_json::Value` sin tipar cuando existe un struct definido en `lexomata-core::model`.
3. Mantener un test automatizado de *golden JSON* en `crates/lexomata-core/tests/schema_roundtrip.rs` que serializa y deserializa ejemplos de `DFA`, `NFA_EPSILON` y `TM_SINGLE`.
