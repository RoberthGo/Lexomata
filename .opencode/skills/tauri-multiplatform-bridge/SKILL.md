---
name: tauri-multiplatform-bridge
description: Capa de abstracción limpia entre Web (GitHub Pages PWA) y Tauri 2.0 (Escritorio y Móvil) para archivos locales (.lexo/.jff) y OAuth 2.0 PKCE de Google Drive sin backend. Usar al tocar src/platform/ o src-tauri/.
---

# Skill: Tauri 2.0 Multiplatform Bridge

## Principio de Aislamiento
Ningún componente React (`src/components/*`) ni store (`src/store/*`) puede importar directamente `@tauri-apps/*`. Toda lógica dependiente de plataforma vive encapsulada en `apps/web/src/platform/`.

---

## Reglas de Implementación

1. **Detección Segura de Entorno:**
   ```ts
   export function isTauriRuntime(): boolean {
     return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
   }
   ```
   - Usar imports dinámicos (`await import('@tauri-apps/plugin-dialog')`) solo dentro de la rama `isTauriRuntime()` para que el build Web en GitHub Pages nunca falle ni cargue código innecesario.

2. **Reutilización del Binario WASM:**
   - Tanto Web como Tauri 2.0 consumen el mismo motor `lexomata-wasm` a través de `wasmAdapter.ts`.
   - No dupliques comandos de simulación de autómatas como `#[tauri::command]`; reserva los comandos Tauri exclusivamente para capacidades nativas del SO (p. ej. `start_oauth_loopback` para Google Drive).

3. **FileService Unificado (`.lexo` y `.jff`):**
   - Web: File System Access API si existe, con fallback `<input type="file">` y descarga `Blob`.
   - Tauri: `plugin-dialog` (`open`, `save`) + `plugin-fs` (`readTextFile`, `writeTextFile`). Recordar `currentFilePath` para que `Ctrl+S` guarde directo.

4. **OAuth 2.0 PKCE Loopback en Escritorio (`oauth_loopback.rs`):**
   - Enlazar estrictamente en `127.0.0.1:0` (nunca `0.0.0.0`).
   - Validar parámetro `state` anti-CSRF.
   - Cerrar el socket inmediatamente después de recibir la primera petición válida o tras un timeout (ej. 120s).
   - Responder con HTML inline minimalista (sin recursos externos) indicando que el usuario puede cerrar la pestaña y volver a Lexomata.

5. **Seguridad Tauri 2.0:**
   - Configurar permisos mínimos en `src-tauri/capabilities/default.json` (solo `dialog`, `fs` para archivos elegidos por el usuario y apertura del navegador para OAuth).
