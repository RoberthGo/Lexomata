---
name: rust-automata-engine
description: Desarrollo TDD del motor matemático en Rust (crates/lexomata-core y crates/lexomata-wasm) para AFD, AFN, AFN-ε, Máquinas de Turing, transformaciones formales e import/export JFLAP (.jff). Usar al tocar cualquier archivo .rs o Cargo.toml.
---

# Skill: Rust Automata & Turing Engine (WASM-Safe TDD)

## Principios de Ingeniería en Rust

1. **Separación `core` vs `wasm`:**
   - `crates/lexomata-core`: 100% Rust estándar portable. Prohibido importar `wasm-bindgen`, `web-sys` o `js-sys` aquí. Debe compilar y probarse nativamente con `cargo test`.
   - `crates/lexomata-wasm`: wrapper delgado que solo deserializa entradas, llama a `lexomata-core` y devuelve `EngineResult<T>` serializado.

2. **Cero Panics en la Frontera WASM:**
   - **PROHIBIDO** usar `.unwrap()`, `.expect()`, `panic!()`, `todo!()` o indexación insegura `slice[i]` fuera de `#[cfg(test)]`.
   - Usa `?`, `.get(...)`, `Option` y `Result<T, EngineError>`.

3. **Determinismo Estricto:**
   - Usa `BTreeMap` y `BTreeSet` (en lugar de `HashMap`/`HashSet`) siempre que el orden de iteración afecte salidas, nombres de estados en AFN→AFD, particiones de minimización o trazas serializadas. Así los resultados y tests son 100% deterministas.

4. **Protección Obligatoria Contra Ciclos y Explosión Combinatoria:**
   - En `epsilon_closure`: siempre rastrear visitados para evitar recursión/bucle infinito.
   - En `tm_run_full` / `tm_batch_run`: respetar estrictamente `max_steps` y retornar veredicto `STEP_LIMIT`.
   - En `fa_nfa_to_dfa`: imponer techo de estados (ej. `256`) y retornar error tipado `STEP_LIMIT_EXCEEDED` si se rebasa.

5. **Eficiencia de Memoria en Cinta de Turing:**
   - Representar la cinta como `BTreeMap<i64, String>` sparse (omitiendo celdas con `blank_symbol`).
   - Producir `TmStepDelta` por paso para que el frontend pueda hacer *step back* sin clonar cintas completas.

---

## Flujo TDD Obligatorio

Al implementar cualquier algoritmo en Rust:
1. Revisar el contrato exacto en `specs/03-DATA-SCHEMA-AND-WASM-CONTRACT.md` y la spec formal (`04` o `05`).
2. Escribir primero los casos de prueba en `#[cfg(test)]` o `crates/lexomata-core/tests/` cubriendo:
   - Caso feliz típico.
   - Cadena vacía `""`.
   - Caso de borde (ciclo $\varepsilon$, índice negativo de cinta, transición inexistente, AFD incompleto).
   - Caso de error / límite (`NO_INITIAL_STATE`, conflicto determinista, `STEP_LIMIT`).
3. Implementar la solución mínima, limpia y bien documentada.
4. Ejecutar obligatoriamente:
   - `cargo test --workspace`
   - `cargo clippy --workspace -- -D warnings`
   - `wasm-pack build crates/lexomata-wasm --target web --out-dir ../../apps/web/src/wasm`
