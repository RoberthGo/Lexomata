---
name: sdd-task-orchestrator
description: Protocolo Spec-Driven Development para ejecutar fases del roadmap de Lexomata de forma atómica, verificable y segura con modelos de IA en OpenCode. Usar al iniciar cualquier fase o feature nueva.
---

# Skill: SDD Task Orchestrator

## Propósito
Evitar que el proyecto pierda coherencia, mezcle APIs obsoletas o rompa requisitos críticos (como el modo 100% offline) durante sesiones largas de programación asistida.

---

## Protocolo de 5 Pasos por Tarea

### Paso 1: Anclaje en Specs (Antes de editar)
- Leer `AGENTS.md` y la fase objetivo en `specs/10-IMPLEMENTATION-ROADMAP.md`.
- Abrir únicamente las 1–3 specs directamente relacionadas con la tarea (mantener el contexto enfocado).
- Si la tarea involucra UI, seguir `specs/06-UI-UX-DESIGN-SYSTEM.md` y activar `better-interface` (skill global); si involucra grafo, `canvas-graph-ux`; si involucra Rust, `rust-automata-engine`; si toca build/red/assets, `offline-guardian`.

### Paso 2: Plan Atómico Explícito
Antes de escribir código, listar en 5–8 viñetas:
- Qué archivos se crearán o modificarán.
- Qué parte del contrato (`specs/03-DATA-SCHEMA-AND-WASM-CONTRACT.md`) se implementa.
- Qué comandos exactos probarán el resultado.

### Paso 3: Implementación Limpia y Completa
- Cero placeholders (`// TODO: implement later`) en código funcional de la fase actual.
- Mantener archivos modulares y cortos (< 300 líneas por archivo cuando sea razonable) para que cualquier modelo futuro pueda leerlos y editarlos sin saturar su contexto.
- Respetar TypeScript estricto (cero `any` injustificados) y Rust sin `.unwrap()`.

### Paso 4: Verificación Real en Terminal
No asumas que compila; ejecuta los comandos correspondientes y corrige cualquier error antes de responder:
- Cambios en Rust: `cargo test --workspace && cargo clippy --workspace -- -D warnings`
- Cambios en WASM: `npm run build:wasm`
- Cambios en Frontend: `npm run typecheck && npm run test:web && npm run build:web`
- Siempre tras cambios de build/assets: `npm run audit:offline`

### Paso 5: Cierre Trazable
Al terminar, entregar un resumen breve con:
1. Checklist actualizado de la fase en `specs/10-IMPLEMENTATION-ROADMAP.md`.
2. Resultados reales de las pruebas ejecutadas.
3. Siguiente micro-tarea recomendada para la próxima sesión.
