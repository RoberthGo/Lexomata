# AGENTS.md — Lexomata v2 (Spec-Driven Development)

> **Propósito:** Este archivo es la fuente de verdad operativa para todos los agentes de código (OpenCode u otros) que trabajen en **Lexomata v2**, un simulador moderno, 100% offline-first y multiplataforma de Autómatas Finitos (AFD, AFN, AFN-ε) y Máquinas de Turing inspirado en JFLAP.

---

## 1. Reglas Inquebrantables (Hard Constraints)

Antes de escribir o modificar una sola línea de código, todo agente DEBE respetar estas reglas sin excepción:

1. **100% OFFLINE-FIRST (Cero Wi-Fi / Cero CDNs):**
   - La aplicación DEBE arrancar, editar, simular y guardar proyectos **sin conexión a internet**.
   - **PROHIBIDO** usar CDNs externos (`unpkg`, `jsdelivr`, `cdnjs`, Tailwind CDN, Google Fonts, iconos remotos, scripts externos) en `index.html`, CSS o JS/TS.
   - Todas las dependencias (React, Tailwind, fuentes `@fontsource/*`, iconos `lucide-react`, binario `.wasm`) se empaquetan localmente dentro de `dist/`.
   - La sincronización con Google Drive es estrictamente opcional, manual y jamás bloquea el uso offline.
   - Ver detalles completos en `specs/01-OFFLINE-FIRST-RULES.md` y skill `.opencode/skills/offline-guardian/SKILL.md`.

2. **Separación Estricta de Responsabilidades:**
   - **Motor lógico (`crates/lexomata-core`):** 100% Rust puro (sin dependencias de UI ni de red). Compila a WebAssembly (`wasm32-unknown-unknown`) y se prueba con `cargo test`.
   - **Interfaz (`apps/web`):** React + TypeScript estricto + Tailwind CSS + Vite + PWA. Consume el motor exclusivamente a través de `src/engine/wasmAdapter.ts`.
   - **Empaquetado nativo (`src-tauri`):** Tauri 2.0 envuelve el **mismo** bundle estático de `apps/web/dist` para Escritorio (Windows/macOS/Linux) y Móvil (Android/iOS).

3. **Contrato Único de Datos:**
   - Nunca inventes campos fuera del esquema definido en `specs/03-DATA-SCHEMA-AND-WASM-CONTRACT.md`.
   - Si una tarea requiere cambiar el esquema `.lexo` o un DTO WASM, actualiza **primero** la spec, luego Rust (`serde`), luego TypeScript, y valida con tests.

4. **Calidad Visual Nivel Instrumento Moderno (Anti-JFLAP viejo):**
   - Prohibido usar `window.alert()`, `window.prompt()` o `window.confirm()`. Toda edición de estados/transiciones ocurre mediante popovers inline o paneles contextuales.
   - Sigue estrictamente `specs/06-UI-UX-DESIGN-SYSTEM.md` y la skill global `better-interface` (cuando esté disponible en OpenCode).

5. **Seguridad y Estabilidad en WASM:**
   - **PROHIBIDO** usar `.unwrap()` o `.expect()` en código de producción dentro de `crates/lexomata-wasm`. Todo error debe devolverse como `Result<T, EngineError>` serializable.
   - Toda simulación (especialmente AFN-ε y Máquinas de Turing) debe incluir protección determinista contra ciclos infinitos (`max_steps`).

6. **Privacidad de Credenciales:**
   - Nunca hardcodees ni pegues Client Secrets, API Keys privadas o tokens OAuth en el repositorio ni en logs.

---

## 2. Mapa de Especificaciones (`specs/`)

Lee las specs relevantes **antes** de implementar cualquier módulo:

| Archivo | Contenido | Cuándo leerlo |
| :--- | :--- | :--- |
| `specs/00-PROJECT-VISION.md` | Visión, alcance funcional tipo JFLAP moderno, prioridades por plataforma | Inicio del proyecto / dudas de alcance |
| `specs/01-OFFLINE-FIRST-RULES.md` | Reglas estrictas sin internet, PWA, CSP, fuentes locales, auditoría offline | **Siempre** (al tocar `index.html`, Vite, assets o red) |
| `specs/02-ARCHITECTURE.md` | Estructura del monorepo, flujo de datos, Tauri 2.0 + GitHub Pages | Al crear carpetas, configuraciones o builds |
| `specs/03-DATA-SCHEMA-AND-WASM-CONTRACT.md` | Esquema JSON `.lexo` y firmas de funciones Rust ↔ TypeScript | Al tocar modelos de datos, WASM o serialización |
| `specs/04-AUTOMATA-ENGINE-SPEC.md` | Especificación formal AFD, AFN, AFN-ε, conversión, minimización, `.jff` | Al programar o probar autómatas finitos |
| `specs/05-TURING-MACHINE-SPEC.md` | Especificación formal Máquina de Turing (1 cinta / multicinta), cinta infinita, rewind | Al programar o probar Máquinas de Turing |
| `specs/06-UI-UX-DESIGN-SYSTEM.md` | Sistema de diseño, paleta light/dark, tipografía, layout, cinta animada | Al crear o estilizar cualquier componente UI |
| `specs/07-CANVAS-EDITOR-SPEC.md` | Geometría del lienzo: Bézier, self-loops, zoom/pan, undo/redo, exportación | Al programar el editor gráfico de grafos |
| `specs/08-STORAGE-AND-GDRIVE-SYNC.md` | IndexedDB, archivos `.lexo`/`.jff` y OAuth PKCE opcional para Google Drive | Al implementar persistencia o sincronización |
| `specs/09-BUILD-DEPLOY-AND-TESTING.md` | Scripts de build, PWA precache, Tauri, CI/CD GitHub Pages y estrategia QA | Al configurar CI/CD, builds o tests |
| `specs/10-IMPLEMENTATION-ROADMAP.md` | Fases atómicas (Fase 0 a Fase 7) con criterios de aceptación | Al elegir la siguiente tarea a ejecutar |

---

## 3. Skills Disponibles (`.opencode/skills/`)

Activa y sigue el skill correspondiente según la tarea actual:

- `offline-guardian`: Auditoría estricta de 0 dependencias de red, CDNs y funcionamiento offline/PWA.
- `canvas-graph-ux`: Matemáticas y UX del lienzo de grafos (curvas Bézier, aristas bidireccionales, self-loops, hit-testing, 60 FPS).
- `rust-automata-engine`: Implementación idiomática y probada (TDD) de autómatas, Máquinas de Turing y puente `wasm-bindgen`.
- `tauri-multiplatform-bridge`: Abstracción limpia entre Web (Browser/PWA) y Escritorio/Móvil (Tauri 2.0) para archivos y OAuth.
- `sdd-task-orchestrator`: Protocolo de ejecución Spec-Driven paso a paso para evitar regresiones y alucinaciones.
- *(Global OpenCode)* `better-interface`: Ingeniería UI/UX, auditoría visual, accesibilidad y refinamiento sin slop sobre las reglas de `specs/06-UI-UX-DESIGN-SYSTEM.md`.

---

## 4. Protocolo Obligatorio de Ejecución por Tarea

1. **Leer** la fase correspondiente en `specs/10-IMPLEMENTATION-ROADMAP.md` y las specs enlazadas.
2. **Declarar** un plan corto (archivos a crear/editar y tests que validarán el cambio).
3. **Implementar** cambios atómicos y tipados (sin código muerto ni TODOs falsos).
4. **Verificar** localmente antes de dar por terminada la tarea:
   - Rust: `cargo test --workspace` y `cargo clippy --workspace -- -D warnings`
   - WASM: `wasm-pack build crates/lexomata-wasm --target web --out-dir ../../apps/web/src/wasm`
   - Frontend: `npm run typecheck && npm run test:web && npm run build:web`
   - Auditoría Offline: `npm run audit:offline` (verificar que `apps/web/dist` no contiene URLs externas ni carece de `.wasm`, `.woff2`, `sw.js` y `manifest.webmanifest`).
5. **Reportar** qué se hizo, qué comandos de verificación pasaron y si quedó alguna desviación respecto a las specs.
