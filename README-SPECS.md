# Lexomata v2 — Paquete de SPECS y SKILLS para OpenCode

Este paquete contiene la arquitectura **Spec-Driven Development (SDD)** y los **Skills** especializados para reescribir **Lexomata** con:

- **Motor lógico en Rust** compilado a **WebAssembly (WASM)** (AFD, AFN, AFN-ε y Máquinas de Turing al estilo JFLAP).
- **Interfaz moderna en React + TypeScript + Tailwind CSS** (estética limpia tipo Figma/Linear, tema claro/oscuro, editor interactivo de nodos/aristas y cinta de Turing animada).
- **100% Offline-First:** cero CDNs, cero Google Fonts remotas, PWA instalable en **GitHub Pages** y ejecutables nativos con **Tauri 2.0** (Escritorio principal, Móvil secundario).
- **Almacenamiento Local-First** (IndexedDB + archivos `.lexo` y compatibilidad `.jff` de JFLAP) + sincronización opcional con **Google Drive** (OAuth 2.0 PKCE sin backend).

---

## Cómo instalar este paquete en tu repositorio

1. Descomprime el `.zip` directamente en la raíz de tu repositorio nuevo (o en una rama nueva `v2-rewrite` de `RoberthGo/Lexomata`).
2. Verifica que queden exactamente estas rutas en la raíz del proyecto:
   ```text
   AGENTS.md
   specs/
     00-PROJECT-VISION.md
     01-OFFLINE-FIRST-RULES.md
     ...
     10-IMPLEMENTATION-ROADMAP.md
   .opencode/
     skills/
       offline-guardian/SKILL.md
       canvas-graph-ux/SKILL.md
       rust-automata-engine/SKILL.md
       tauri-multiplatform-bridge/SKILL.md
       sdd-task-orchestrator/SKILL.md
   ```
3. Abre OpenCode en la raíz del repositorio. OpenCode detectará automáticamente `AGENTS.md` y los skills dentro de `.opencode/skills/`.

---

## Guía sugerida de asignación de modelos en OpenCode

| Fase / Tipo de tarea | Modelo recomendado | Skill a invocar |
| :--- | :--- | :--- |
| **Fase 0:** Scaffolding del monorepo, Vite, PWA offline, Tauri | `DeepSeek V4.1 Flash Free` | `sdd-task-orchestrator`, `offline-guardian` |
| **Fase 1 y 2:** Motor en Rust (AFD/AFN/AFN-ε + Máquina de Turing + tests) | `MiMo-V2.6-Flash Free` o `DeepSeek V4.1 Flash Free` | `rust-automata-engine` |
| **Fase 3:** Lienzo interactivo (nodos, Bézier, self-loops, zoom/pan) | `DeepSeek V4.1 Flash Free` | `canvas-graph-ux`, `better-interface` (global) |
| **Fase 4:** Panel de simulación + Cinta infinita animada de Turing | `DeepSeek V4.1 Flash Free` (o `Hy4 flash` para iteración rápida CSS) | `better-interface` (global) |
| **Fase 5:** Transformaciones (AFN→AFD, minimización) e import/export `.jff` | `MiMo-V2.6-Flash Free` | `rust-automata-engine` |
| **Fase 6:** Persistencia local (IndexedDB/FS) + Google Drive opcional + Tauri | `DeepSeek V4.1 Flash Free` / `Nemotron 3.5 Super VL Free` | `tauri-multiplatform-bridge`, `offline-guardian` |
| **Revisión visual (pasando capturas) y logs de CI/CD** | `DeepSeek V4.1 Flash Free` / `Nemotron 3.5 Super VL Free` | `better-interface` (global), `offline-guardian` |
| **Tests unitarios extra / refactors pequeños** | `Flint 40B Free` / `Beam Free` | `rust-automata-engine` |

---

## Primer prompt sugerido para arrancar en OpenCode

Copia y pega este prompt en OpenCode con `DeepSeek V4.1 Flash Free`:

```text
Lee AGENTS.md, specs/01-OFFLINE-FIRST-RULES.md, specs/02-ARCHITECTURE.md y specs/10-IMPLEMENTATION-ROADMAP.md.
Vamos a ejecutar únicamente la FASE 0 (Scaffolding base + verificación WASM + configuración 100% offline/PWA).
Antes de crear archivos, muéstrame tu plan exacto de estructura y comandos de verificación.
```
