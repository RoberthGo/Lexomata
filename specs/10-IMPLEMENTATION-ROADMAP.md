# 10 — Plan de Implementación por Fases (SDD Roadmap)

> **Regla de ejecución:** Completar y verificar cada fase al 100% antes de avanzar a la siguiente. Nunca mezclar más de una fase en la misma sesión para mantener el contexto limpio en modelos medianos/pequeños.

---

## Fase 0 — Cimientos del Monorepo y Blindaje Offline
**Objetivo:** Tener un proyecto compilable extremo a extremo (Rust → WASM → React/Vite PWA) con auditoría offline verde.
- [ ] Crear `Cargo.toml` workspace con `crates/lexomata-core` y `crates/lexomata-wasm`.
- [ ] Exportar función de humo `engine_version()` en WASM y consumirla desde `apps/web`.
- [ ] Configurar `apps/web` con Vite + React + TypeScript (`strict: true`) + Tailwind CSS.
- [ ] Instalar fuentes locales (`@fontsource/plus-jakarta-sans`, `@fontsource/jetbrains-mono`) e iconos (`lucide-react`).
- [ ] Configurar `vite-plugin-pwa` precacheando `*.wasm` y `*.woff2` + `base: './'`.
- [ ] Crear `scripts/audit-offline.mjs` y verificar `npm run check:all` en verde.

**Criterio de salida:** La app muestra la versión del motor Rust/WASM en pantalla, funciona con Wi-Fi apagado tras recargar y `audit:offline` pasa con 0 errores.

---

## Fase 1 — Esquema `.lexo` y Motor de Autómatas Finitos (Rust)
**Objetivo:** Motor completo de AFD, AFN y AFN-ε probado exhaustivamente en Rust.
- [ ] Implementar structs del esquema `.lexo` en `crates/lexomata-core/src/model/` con `serde`.
- [ ] Implementar `validate_machine` y `get_formal_definition`.
- [ ] Implementar `epsilon_closure` (a prueba de ciclos), `fa_simulate_full` y `fa_batch_run`.
- [ ] Exponer funciones en `lexomata-wasm` sin `.unwrap()`.
- [ ] Escribir suite `cargo test` (AFD, AFN, AFN-ε con ciclos, cadena vacía, batch).
- [ ] Crear tipos TypeScript espejo en `apps/web/src/types/schema.ts` y `wasmAdapter.ts`.

**Criterio de salida:** `cargo test` y `cargo clippy` 100% verdes; `wasmAdapter.ts` probado en Vitest.

---

## Fase 2 — Motor de Máquinas de Turing (Rust)
**Objetivo:** Simulador formal de Máquina de Turing con cinta infinita, rewind y límite anti-bucle.
- [ ] Implementar cinta infinita sparse (`BTreeMap<i64, String>`) en `crates/lexomata-core/src/turing/tape.rs`.
- [ ] Implementar `tm_init`, `tm_step` (con `TmStepDelta` reversible), `tm_run_full` (con `maxSteps`) y `tm_batch_run`.
- [ ] Implementar soporte estructural para `TM_MULTI` en `operations`.
- [ ] Exponer funciones en `lexomata-wasm` y tipar en `wasmAdapter.ts`.
- [ ] Escribir pruebas de incremento binario, $0^n 1^n$, índices negativos, bucle infinito y rewind exacto.

**Criterio de salida:** Todos los tests de MT en Rust pasan, incluyendo detección determinista de `STEP_LIMIT`.

---

## Fase 3 — Sistema de Diseño + Editor de Lienzo Interactivo (Frontend)
**Objetivo:** Interfaz moderna con tema oscuro/claro y editor gráfico fluido de estados y transiciones.
- [ ] Implementar tokens CSS claro/oscuro (`tokens.css`) y layout base (TopBar, FloatingDock, Inspector colapsable).
- [ ] Implementar `useProjectStore.ts` con historial Undo/Redo y plantillas de ejemplo offline.
- [ ] Implementar `geometry.ts` (aristas rectas, Bézier automáticas para bidireccionales, self-loops limpios).
- [ ] Implementar `AutomataCanvas`: crear/mover/eliminar estados, marcar inicial/aceptación, arrastrar transiciones, editar reglas con popover inline (sin `prompt()`), zoom/pan, selección múltiple y atajos de teclado.
- [ ] Implementar panel de propiedades, tabla de transiciones $\delta$ y vista de definición formal.

**Criterio de salida:** Se puede dibujar cómodamente un AFD y una Máquina de Turing completa a 60 FPS en tema claro y oscuro.

---

## Fase 4 — Simulador Visual + Cinta Infinita Animada de Turing + Batch Runner
**Objetivo:** Conectar la UI con el motor Rust WASM para simulación interactiva y pruebas masivas.
- [ ] Implementar `useSimStore.ts` conectado a `wasmAdapter.ts`.
- [ ] Implementar `FaSimBar`: tira de entrada, resaltado en vivo de estados/aristas disparadas (incluyendo múltiples estados en AFN), Play/Pausa, Step Back/Forward y control de velocidad.
- [ ] Implementar `TuringTapeBar`: cinta infinita con cabezal animado, pulso de escritura, edición directa de celdas, índice por celda, Step Back instantáneo, Fast Run y aviso claro de `STEP_LIMIT`.
- [ ] Implementar pestaña **Batch Runner** (*Multiple Run*) para AF y MT.

**Criterio de salida:** Los 4 proyectos de ejemplo integrados se simulan paso a paso, hacia atrás y por lotes sin errores.

---

## Fase 5 — Algoritmos Formales Avanzados e Interoperabilidad JFLAP
**Objetivo:** Paridad académica fuerte con JFLAP + exportación para tareas/artículos.
- [ ] Implementar `fa_nfa_to_dfa` (construcción de subconjuntos + `subsetMap`) en Rust + modal/vista en UI.
- [ ] Implementar `fa_minimize_dfa` (Hopcroft + `equivalenceClasses`) en Rust + reporte visual en UI.
- [ ] Implementar `import_jflap_xml` y `export_jflap_xml` (`.jff`) para FA y TM en Rust + pruebas roundtrip.
- [ ] Implementar Auto-Layout (jerárquico BFS y circular) en `src/utils/layout.ts`.
- [ ] Implementar exportación offline a **SVG**, **PNG (2x)** y **LaTeX (TikZ)**.

**Criterio de salida:** Se puede importar un `.jff` real de JFLAP, convertirlo de AFN a AFD, minimizarlo y exportar el diagrama a PNG o TikZ sin internet.

---

## Fase 6 — Persistencia Local-First, Tauri 2.0 y Google Drive Opcional
**Objetivo:** Empaquetado nativo de escritorio (y base móvil) + persistencia completa.
- [ ] Implementar autoguardado en IndexedDB (`localDb.ts`) y lista de proyectos recientes.
- [ ] Inicializar `src-tauri` con Tauri 2.0 apuntando a `apps/web/dist` y configurar plugins `dialog` y `fs`.
- [ ] Implementar capa `src/platform/fileService.ts` (Web vs Tauri).
- [ ] Implementar sincronización opcional con Google Drive (OAuth 2.0 PKCE + `oauth_loopback.rs` en Tauri + degradación limpia offline).
- [ ] Ajustar layout responsivo/táctil para pantallas pequeñas (móvil/tablet).

**Criterio de salida:** Ejecutable de escritorio y build Web PWA funcionan 100% offline y permiten abrir/guardar `.lexo`/`.jff` localmente; Drive funciona opcionalmente al conectar.

---

## Fase 7 — Pulido Final, CI/CD y Despliegue a GitHub Pages
**Objetivo:** Automatización total de pruebas y publicaciones.
- [ ] Escribir pruebas E2E offline con Playwright (`setOffline(true)`).
- [ ] Configurar `.github/workflows/ci.yml`, `deploy-pages.yml` y `release-desktop.yml`.
- [ ] Verificar Lighthouse PWA / rendimiento y revisar visualmente en modo claro y oscuro.
