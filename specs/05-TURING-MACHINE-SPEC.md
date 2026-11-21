# 05 — Especificación Formal del Motor de Máquinas de Turing

## 1. Definición Formal Soportada

Una Máquina de Turing Determinista (1 cinta) se define como la 7-tupla $M = (Q, \Sigma, \Gamma, \delta, q_0, B, F)$:
- $Q$: conjunto finito de estados (`states`).
- $\Sigma$: alfabeto de entrada ($\Sigma \subset \Gamma$, $B \notin \Sigma$).
- $\Gamma$: alfabeto de cinta (`config.tapeAlphabet`).
- $B \in \Gamma$: símbolo blanco (`config.blankSymbol`, por defecto `"□"`).
- $\delta: (Q \setminus F) \times \Gamma \rightharpoonup Q \times \Gamma \times \{L, R, S\}$: función parcial de transición.
- $q_0 \in Q$: estado inicial único.
- $F \subseteq Q$: conjunto de estados de aceptación/parada exitosa.

*(Extensión Multicinta `TM_MULTI` con $k$ cintas: $\delta: (Q \setminus F) \times \Gamma^k \rightharpoonup Q \times (\Gamma \times \{L, R, S\})^k$, soportada en el mismo esquema usando `operations` de longitud $k$.)*

---

## 2. Representación de la Cinta Infinita en Rust (`tape.rs`)

La cinta es **infinita en ambas direcciones** ($\dots, -2, -1, 0, 1, 2, \dots$):

- Almacenamiento interno: `BTreeMap<i64, String>` que solo guarda celdas cuyo contenido es distinto de `blankSymbol`.
- Cualquier índice no presente en el mapa devuelve `blankSymbol` al leerse.
- Si una transición escribe `blankSymbol` sobre una celda, esa entrada se elimina del mapa (manteniendo memoria $O(\text{celdas no blancas})$).
- El cabezal inicia en `head = 0`. La cadena de entrada `w = w_0 w_1 ... w_{n-1}` se coloca en las posiciones `0, 1, ..., n-1`. Si la entrada es vacía `""`, toda la cinta comienza en blanco y `head = 0`.
- Para renderizado eficiente en UI, cada snapshot expone el mapa compacto de celdas no blancas más `minIndex`, `maxIndex` y `headIndex`.

---

## 3. Reglas de Ejecución y Parada (Halting)

En cada paso `tm_step`:

1. Si el estado actual $q \in F$ (`isAccepting === true`):
   - La máquina se detiene inmediatamente con veredicto **`ACCEPTED`** (convención estándar de JFLAP: entrar a un estado final detiene y acepta).
2. Leer símbolo actual $a = \text{tape}[\text{head}]$ (o vector de $k$ símbolos en multicinta).
3. Buscar transición aplicable desde $q$ cuya condición `read == a`:
   - **Si NO existe transición:** la máquina se detiene inmediatamente (*halt*) con veredicto **`REJECTED`** (rechazo por parada en estado no final).
   - **Si existe transición $(q', b, d)$:**
     1. Escribir $b$ en `tape[head]`.
     2. Mover cabezal: `L` $\Rightarrow \text{head} - 1$, `R` $\Rightarrow \text{head} + 1$, `S` $\Rightarrow \text{head}$ sin cambio.
     3. Cambiar estado actual a $q'$.
     4. Incrementar `stepCount += 1`.
     5. Si $q' \in F$, marcar veredicto inmediato como **`ACCEPTED`**; en caso contrario, mantener **`RUNNING`**.

---

## 4. Protección Anti-Bucle Infinito y Retroceso (*Step Back / Rewind*)

### 4.1 Límite de Pasos (`maxSteps`)
- En ejecuciones rápidas (`tm_run_full` / `tm_batch_run`), si `stepCount >= maxSteps` (por defecto `10_000`, configurable hasta `200_000` en UI) y la máquina sigue en `RUNNING`, se detiene limpiamente retornando veredicto **`STEP_LIMIT`** (nunca congela el navegador ni el hilo principal).
- En modo paso a paso interactivo, el usuario puede continuar manualmente más allá del límite si lo desea.

### 4.2 Historial Compacto para Retroceso Instantáneo (`TmStepDelta`)
En lugar de clonar toda la cinta en cada paso (costoso en memoria), cada paso genera un **delta reversible** de pocos bytes:
```ts
interface TmStepDelta {
  stepIndex: number;
  prevStateId: string;
  nextStateId: string;
  firedTransitionId: string;
  tapeChanges: Array<{
    tapeIndex: number;
    cellIndex: number;
    prevSymbol: string;
    nextSymbol: string;
    prevHead: number;
    nextHead: number;
  }>;
}
```
Con este delta, el botón **Paso Atrás** (*Step Back*) y el *scrubber* de línea de tiempo funcionan en tiempo $O(1)$ por paso y permiten rebobinar una simulación de 10,000 pasos instantáneamente.

---

## 5. Validación Estática de Máquinas de Turing

### Errores Bloqueantes
- `NO_INITIAL_STATE` o `MULTIPLE_INITIAL_STATES`.
- `NON_DETERMINISTIC_CONFLICT` (en modo determinista): dos transiciones salientes del mismo estado que leen el mismo símbolo (o tupla de símbolos en multicinta).
- `INVALID_TRANSITION_RULE`: `operations.length !== config.tapeCount` o dirección distinta de `L | R | S`.

### Advertencias
- Transiciones salientes desde un estado de aceptación (advertir que al llegar a un estado de aceptación la máquina se detiene).
- Símbolos escritos o leídos que no están declarados en `tapeAlphabet` (el motor puede ofrecer sincronizarlos automáticamente).
- Estados inalcanzables.

---

## 6. Notación Visual de Transiciones
- Formato estándar en el lienzo (inspirado en JFLAP pero limpio y legible):
  - **1 cinta:** `0 ; X , R`  *(Lee `0`, escribe `X`, mueve a la Derecha)*
  - **Símbolo blanco:** `□ ; □ , S`
  - **Agrupación por par `(from, to)`:** si hay múltiples transiciones entre dos estados, se apilan verticalmente en una píldora limpia sobre la arista (máx. 4 visibles + badge `+N` expandible al pasar el mouse o seleccionar).
  - **Multicinta (ej. 2 cintas):** `[0, □] ; [X, 0] , [R, R]`

---

## 7. Compatibilidad con JFLAP (`.jff`) para Máquinas de Turing
- Parsear `<structure><type>turing</type><automaton>...</automaton></structure>`.
- Mapear `<read/>` o `<write/>` vacíos en XML al `blankSymbol` (`□`).
- Mapear `<move>L|R|S</move>`.
- Exportar `.jff` con `<read/>` y `<write/>` vacíos cuando el símbolo coincide con `blankSymbol`.

---

## 8. Casos de Prueba Obligatorios (`cargo test`)
1. **MT de incremento binario** (suma 1 a un número binario y se detiene con el resultado en cinta — verificar contenido final exacto de la cinta).
2. **MT reconocedora de $0^n 1^n$** ($n \ge 1$): probar `""`, `"01"`, `"0011"`, `"000111"`, `"001"`, `"10"`, `"0101"`.
3. **MT que cruza índices negativos de cinta** (mover cabezal a izquierda desde `0` hacia `-1, -2, -3`, escribir y regresar a `0`).
4. **MT en bucle infinito deliberado** ($q_0 \xrightarrow{\square ; \square , R} q_0$): debe detenerse exactamente en `maxSteps` con veredicto `STEP_LIMIT`.
5. **Integridad de Rewind (Step Back):** ejecutar 50 pasos y aplicar los 50 deltas inversos; la cinta y el cabezal deben quedar idénticos al paso 0.
6. **Roundtrip `.jff` de Máquina de Turing.**
