# 09 — Build, Despliegue (GitHub Pages + Tauri 2.0) y Estrategia de Pruebas

## 1. Requisitos del Entorno Local
- **Rust:** `rustup` estable + target `wasm32-unknown-unknown` (`rustup target add wasm32-unknown-unknown`) + `wasm-pack`.
- **Node.js:** v20+ LTS y `npm` (o `pnpm`).
- **Tauri 2.0 (Escritorio):** dependencias nativas del OS (WebView2 en Windows, `webkit2gtk` en Linux, Xcode CLI en macOS).

---

## 2. Comandos Estándar en `package.json` Raíz

```json
{
  "scripts": {
    "build:wasm": "wasm-pack build crates/lexomata-wasm --target web --out-dir ../../apps/web/src/wasm",
    "dev:web": "npm --prefix apps/web run dev",
    "build:web": "npm run build:wasm && npm --prefix apps/web run build",
    "dev:desktop": "npm run build:wasm && tauri dev",
    "build:desktop": "npm run build:wasm && tauri build",
    "test:rust": "cargo test --workspace",
    "lint:rust": "cargo clippy --workspace -- -D warnings",
    "test:web": "npm --prefix apps/web run test",
    "typecheck": "npm --prefix apps/web run typecheck",
    "audit:offline": "node scripts/audit-offline.mjs",
    "check:all": "npm run test:rust && npm run lint:rust && npm run typecheck && npm run test:web && npm run build:web && npm run audit:offline"
  }
}
```

---

## 3. Script de Auditoría Offline (`scripts/audit-offline.mjs`)

Debe existir un script Node sin dependencias externas que recorra `apps/web/dist/` tras cada build y falle con código de salida `1` si:
1. Encuentra cualquier cadena prohibida (`fonts.googleapis.com`, `fonts.gstatic.com`, `unpkg.com`, `cdn.jsdelivr.net`, `cdnjs.cloudflare.com`, `esm.sh`, `cdn.tailwindcss.com`, `accounts.google.com/gsi`).
2. No existe un archivo `.wasm` dentro de `apps/web/dist/assets/`.
3. No existe el Service Worker generado (`sw.js`) ni `manifest.webmanifest`.
4. No existen fuentes locales `.woff2` empaquetadas en `apps/web/dist/assets/`.

---

## 4. Despliegue Automático a GitHub Pages (`.github/workflows/deploy-pages.yml`)
- Trigger: `push` a `main`.
- Pasos:
  1. Instalar Rust + `wasm32-unknown-unknown` + `wasm-pack` (con cache de Cargo).
  2. Instalar Node 20 + `npm ci`.
  3. Ejecutar `npm run check:all` (incluye `audit:offline`).
  4. Publicar `apps/web/dist` usando `actions/upload-pages-artifact` y `actions/deploy-pages`.

---

## 5. Releases de Escritorio (`.github/workflows/release-desktop.yml`)
- Trigger: tags `v*.*.*` o ejecución manual (`workflow_dispatch`).
- Matriz Tauri 2.0 usando `tauri-apps/tauri-action`:
  - `windows-latest` → `.msi` / `.exe` (NSIS)
  - `ubuntu-22.04` → `.AppImage` / `.deb`
  - `macos-latest` → `.dmg` (Apple Silicon / Universal)

---

## 6. Pirámide de Pruebas

1. **Pruebas Unitarias y de Propiedad en Rust (`cargo test`):**
   - Cobertura exhaustiva del motor de Autómatas, Máquinas de Turing, validación, conversiones y parser `.jff`.
   - Rápidas (< 2s), ejecutadas en cada cambio lógico.
2. **Pruebas de Integración WASM + Frontend (`Vitest`):**
   - Validan `wasmAdapter.ts`, store de Zustand (Undo/Redo), geometría de curvas (`geometry.ts`) y exportador TikZ/SVG.
3. **Pruebas E2E Offline (`Playwright`):**
   - Verifican el flujo completo en navegador con red cortada (`context.setOffline(true)`):
     - Cargar app offline tras precache.
     - Abrir ejemplo de AFD y simular cadena aceptada/rechazada.
     - Abrir ejemplo de Máquina de Turing $0^n 1^n$, avanzar pasos, retroceder y correr hasta aceptar.
     - Ejecutar Batch Runner y verificar tabla de resultados.
