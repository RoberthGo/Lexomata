# 10 — Plan de Implementación por Fases (SDD Roadmap)

> **Regla de ejecución:** Completar y verificar cada fase al 100% antes de avanzar a la siguiente. Nunca mezclar más de una fase en la misma sesión para mantener el contexto limpio en modelos medianos/pequeños.
>
> **Leyenda de estado:**
> - `[x]` Implementado y verificado con pruebas.
> - `[ ]` Pendiente de implementar o verificar.

---

## Fase 0 — Cimientos del Monorepo y Blindaje Offline (`[x]` Completada)
**Objetivo:** Tener un proyecto compilable extremo a extremo (Rust → WASM → React/Vite PWA) con auditoría offline verde.
- [x] Crear `Cargo.toml` workspace con `crates/lexomata-core` y `crates/lexomata-wasm`.
- [x] Exportar función de humo `engine_version()` en WASM y consumirla desde `apps/web`.
- [x] Configurar `apps/web` con Vite + React + TypeScript (`strict: true`) + Tailwind CSS.
- [x] Instalar fuentes locales (`@fontsource/plus-jakarta-sans`, `@fontsource/jetbrains-mono`) e iconos (`lucide-react`).
- [x] Configurar `vite-plugin-pwa` precacheando `*.wasm` y `*.woff2` + `base: './'`.
- [x] Crear `scripts/audit-offline.mjs` y verificar `npm run verify` / `audit:offline` en verde.

**Criterio de salida:** La app muestra la versión del motor Rust/WASM en pantalla, funciona con Wi-Fi apagado tras recargar y `audit:offline` pasa con 0 errores.

---

## Fase 1 — Esquema `.lexo` y Motor de Autómatas Finitos en Rust (`[x]` Completada)
**Objetivo:** Motor completo de AFD, AFN y AFN-ε probado exhaustivamente en Rust.
- [x] Implementar structs del esquema `.lexo` en `crates/lexomata-core/src/model/` con `serde` (`DFA`, `NFA`, `EPSILON_NFA`, `TM_SINGLE`, `TM_MULTI`).
- [x] Implementar catálogo integrado de proyectos de ejemplo offline (`examples`) sin red.
- [x] Implementar `validate_machine` (sin estado inicial, símbolos no declarados, inalcanzables, determinismo en `DFA`, ε en `DFA`/`NFA`).
- [x] Implementar `get_formal_definition` ($M = (Q, \Sigma, \delta, q_0, F)$) y tabla de transiciones $\delta$.
- [x] Implementar `epsilon_closure` (a prueba de ciclos), `fa_simulate_full` y `fa_batch_run`.
- [x] Exponer funciones en `lexomata-wasm` sin `.unwrap()` y con envelope estándar `{ ok, data | error }`.
- [x] Escribir suite `cargo test` (AFD, AFN, AFN-ε con ciclos, cadena vacía, batch).
- [x] Crear tipos TypeScript espejo en `apps/web/src/engine/types.ts` y `apps/web/src/engine/wasmAdapter.ts`.

**Criterio de salida:** `cargo test` 100% verde; `wasmAdapter.ts` conectado y tipado en TypeScript estricto.

---

## Fase 2 — Motor de Máquinas de Turing en Rust (`[x]` Completada)
**Objetivo:** Simulador formal de Máquina de Turing con cinta infinita, rewind y límite anti-bucle.
- [x] Implementar cinta infinita sparse (`BTreeMap<i64, String>`) en `crates/lexomata-core/src/turing/tape.rs` con índices positivos y negativos.
- [x] Implementar `tm_init`, `tm_step` (con `TmStepDelta` reversible), `tm_run_full` (con `maxSteps` por defecto `10_000`) y `tm_batch_run`.
- [x] Implementar validación estática de Máquinas de Turing (cinta en alfabeto $\Gamma$, movimientos `L`/`R`/`S`, estados de parada).
- [x] Implementar soporte estructural para `TM_MULTI` en `operations`.
- [x] Exponer funciones en `lexomata-wasm` sin `.unwrap()` y tipar en `wasmAdapter.ts`.
- [x] Escribir pruebas de incremento binario, $0^n 1^n$, índices negativos, bucle infinito (`STEP_LIMIT`) y rewind exacto.

**Criterio de salida:** Todos los tests de MT en Rust pasan, incluyendo detección determinista de `STEP_LIMIT`.

---

## Fase 3 — Sistema de Diseño + Editor de Lienzo Interactivo (Frontend) (`[x]` Completada)
**Objetivo:** Interfaz moderna *"Precision Academic Instrument"* con tema oscuro/claro y editor gráfico fluido de estados y transiciones.
- [x] Implementar tokens CSS claro/oscuro (`apps/web/src/styles/tokens.css`) y fuentes locales (`Plus Jakarta Sans` + `JetBrains Mono`).
- [x] Implementar layout base: `TopBar` (tipo de máquina, badge offline, validación, acciones, tema), `Dock` flotante y `Inspector` colapsable.
- [x] Implementar `useProjectStore.ts` con historial Undo/Redo (`Ctrl+Z` / `Ctrl+Y`) y plantillas de ejemplo offline.
- [x] Implementar `geometry.ts` (aristas rectas recortadas, Bézier automáticas para bidireccionales, self-loops limpios, snap a rejilla).
- [x] Implementar `GraphCanvas`: crear/mover/eliminar estados, marcar inicial/aceptación, arrastrar transiciones, editar reglas con popover inline (cero `prompt()`/`alert()`), zoom/pan, selección múltiple y atajos de teclado (`V`, `A`, `T`, `D`, `Delete`, `Ctrl+A`, `Ctrl+0`, `Space`).
- [x] Implementar panel de propiedades, tabla de transiciones $\delta$ y vista de definición formal en `Inspector.tsx`.
- [x] **Menú contextual en aristas y notas inline (`specs/06`, `specs/07`):** clic derecho en arista para *Invertir dirección* y *Reasignar origen/destino*; notas inline en nodos y aristas.
- [x] **Navegación focalizada (`specs/07`):** acción `centerOnState(stateId)` para centrar cámara en un estado `X` desde el inspector.

**Criterio de salida:** Se puede dibujar y editar cómodamente un AFD y una Máquina de Turing completa a 60 FPS en tema claro y oscuro con todas las acciones del menú contextual.

---

## Fase 4 — Simulador Visual + Cinta Infinita Animada de Turing + Batch Runner (`[x]` Completada)
**Objetivo:** Conectar la UI con el motor Rust WASM para simulación interactiva y pruebas masivas.
- [x] Implementar hooks `useFaSimulation.ts` y `useTuringSimulation.ts` conectados a `wasmAdapter.ts`.
- [x] Implementar `SimulationBar` para AF (`FaSimBar`): tira de entrada, resaltado en vivo de estados/aristas disparadas (incluyendo múltiples estados en AFN), Play/Pausa, Step Back/Forward y selector de velocidad.
- [x] Implementar `SimulationBar` para MT (`TuringTapeBar`): cinta infinita con cabezal animado, edición directa de celdas, índice por celda, Step Back instantáneo, Fast Run y aviso claro de `STEP_LIMIT`.
- [x] Implementar pestaña **Lotes / Batch Runner** (*Multiple Run*) para AF y MT en `Inspector.tsx`.
- [x] **Controles finos de `FaSimBar` (`specs/06`):** selector de velocidad custom en `ms` e indicador compacto de transiciones disponibles desde el estado actual.

**Criterio de salida:** Los 4 proyectos de ejemplo integrados se simulan paso a paso, hacia atrás y por lotes sin errores, con control de velocidad en `ms` e indicador de transiciones.

---

## Fase 5 — Algoritmos Formales Avanzados, Auto-Layout, JFLAP y Exportación (`[x]` Completada)
**Objetivo:** Paridad académica fuerte con JFLAP + exportación para tareas/artículos.
- [x] Implementar `fa_nfa_to_dfa` (construcción de subconjuntos + `subsetMap`) en Rust + botón de conversión en UI.
- [x] Implementar `fa_minimize_dfa` (Hopcroft + `equivalenceClasses`) en Rust + botón de minimización en UI.
- [x] Implementar `import_jflap_xml` y `export_jflap_xml` (`.jff`) para FA y TM en Rust + pruebas roundtrip + botones importar/exportar en UI.
- [x] Implementar Auto-Layout (jerárquico BFS y circular) en `apps/web/src/utils/layout.ts` + tests.
- [x] Implementar exportación offline a **SVG**, **PNG (2x)** y **LaTeX (TikZ)** en `apps/web/src/utils/exporters.ts` y `ExportDialog.tsx` + tests.
- [x] **Vista pedagógica de transformaciones:** modal explicativo (`TransformationDialog.tsx`) que muestra `subsetMap` y `equivalenceClasses` con opción de deshacer.
- [x] **Vista previa enriquecida de exportación (`specs/07`):** permite elegir área (`Completo` vs `Selección`), tema de exportación y adjuntar tabla de resultados Multi-Run en SVG/PNG y TikZ.

**Criterio de salida:** Se puede importar un `.jff` real de JFLAP, convertirlo de AFN a AFD inspeccionando subconjuntos, minimizarlo viendo clases de equivalencia y exportar el diagrama + tabla Multi-Run a PNG o TikZ sin internet.

---

## Fase 6 — Persistencia Local-First, Tauri 2.0 y Google Drive Opcional
**Objetivo:** Empaquetado nativo de escritorio (y base móvil) + persistencia completa sin depender de la nube.
- [ ] Implementar autoguardado automático en IndexedDB (`apps/web/src/storage/localDb.ts`) con debounce de 1 s, lista de proyectos recientes y recuperación al recargar tras fallo.
- [ ] Inicializar `src-tauri` con Tauri 2.0 apuntando a `apps/web/dist`, configurar `tauri.conf.json` y habilitar plugins `dialog` y `fs` con permisos mínimos.
- [ ] Implementar capa unificada `apps/web/src/platform/fileService.ts` (Web: File System Access API / `<input>` + descarga; Tauri: `dialog` + `fs` nativo) para `.lexo` y `.jff`.
- [ ] Implementar sincronización opcional con Google Drive (`specs/08`): OAuth 2.0 PKCE en Web + `oauth_loopback.rs` en Tauri (`127.0.0.1`), carpeta dedicada `Lexomata/`, solo metadata + contenido, y degradación limpia cuando `navigator.onLine === false`.
- [ ] Ajustar layout responsivo y gestos táctiles para pantallas pequeñas (móvil/tablet: BottomSheet para Inspector y Dock compacto).

**Criterio de salida:** Ejecutable de escritorio (Windows/Linux/macOS) y build Web PWA funcionan 100% offline, recuperan proyectos tras cerrar pestaña, abren/guardan `.lexo`/`.jff` localmente y sincronizan opcionalmente con Drive al conectar.

---

## Fase 7 — Pulido Final, CI/CD y Despliegue a GitHub Pages
**Objetivo:** Automatización total de pruebas, auditoría offline y publicaciones.
- [ ] Escribir pruebas E2E con Playwright validando flujo completo en modo offline (`context.setOffline(true)` tras primera carga PWA).
- [ ] Configurar `.github/workflows/ci.yml` (`cargo test`, `cargo clippy`, `typecheck`, `test:web`, `build:web`, `audit:offline`, Playwright).
- [ ] Configurar `.github/workflows/deploy-pages.yml` para publicar `apps/web/dist` en GitHub Pages al hacer push a `main`.
- [ ] Configurar `.github/workflows/release-desktop.yml` para compilar instaladores Tauri 2.0 por tag (`v*`).
- [ ] Verificar puntuación Lighthouse PWA / rendimiento y revisar visualmente toda la interfaz en modo claro y oscuro.
