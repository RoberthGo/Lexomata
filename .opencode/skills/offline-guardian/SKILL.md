---
name: offline-guardian
description: Auditor y guardián estricto de arquitectura 100% offline-first (cero Wi-Fi, cero CDNs, PWA con WASM precacheado y degradación limpia de red). Usar al configurar Vite, index.html, dependencias, fuentes, iconos, Tauri o sincronización opcional.
---

# Skill: Offline Guardian (Cero Wi-Fi / Cero CDNs)

## Cuándo activar este skill
- Al crear o modificar `index.html`, `vite.config.ts`, `package.json` o `tauri.conf.json`.
- Al agregar fuentes, iconos, estilos o nuevas librerías al frontend.
- Al implementar almacenamiento, PWA o el módulo opcional de Google Drive.
- Al auditar un build antes de hacer commit o despliegue.

---

## Reglas No Negociables

1. **Cero referencias de red en el bundle estático:**
   - Jamás incluir URLs de `fonts.googleapis.com`, `fonts.gstatic.com`, `unpkg.com`, `cdn.jsdelivr.net`, `cdnjs.cloudflare.com`, `esm.sh`, `cdn.tailwindcss.com` ni `accounts.google.com/gsi`.
   - Toda librería (React, Tailwind, iconos `lucide-react`, fuentes `@fontsource/*`) debe instalarse vía `npm` y quedar empaquetada en `apps/web/dist/`.

2. **Precache completo en PWA:**
   - Confirmar que `vite-plugin-pwa` incluye `wasm` y `woff2` en `workbox.globPatterns`.
   - Confirmar que `maximumFileSizeToCacheInBytes` cubre el tamaño del binario `.wasm` (mínimo `10 * 1024 * 1024`).
   - Confirmar rutas relativas (`base: './'` o equivalente compatible con subruta de GitHub Pages y Tauri).

3. **Sin peticiones automáticas al iniciar:**
   - Al montar `App.tsx`, **cero** llamadas `fetch()` a dominios externos.
   - El estado inicial se carga desde IndexedDB o desde plantillas JSON locales empaquetadas en `src/data/examples/`.

4. **Aislamiento de Google Drive:**
   - Google Drive se invoca exclusivamente tras una acción explícita del usuario y verifica primero `navigator.onLine`.
   - Toda promesa de red tiene `try/catch` con mensaje no intrusivo y jamás corrompe el estado local.

---

## Protocolo de Auditoría Obligatorio

Tras compilar con `npm run build:web`, ejecuta y verifica:

1. **Escaneo de `apps/web/dist/`:**
   Buscar patrones `http://` o `https://` en archivos `.html`, `.css` y `.js` compilados. Solo se permiten URLs de namespaces XML (`http://www.w3.org/2000/svg`), licencias en comentarios y endpoints explícitos dentro del módulo `gdriveSync` (`oauth2.googleapis.com`, `www.googleapis.com`, `accounts.google.com/o/oauth2`). **Cero** URLs de carga de assets o CDNs.
2. **Verificación de artefactos offline:**
   Confirmar presencia física en `apps/web/dist/` de:
   - `index.html`
   - `sw.js` y `manifest.webmanifest`
   - Al menos un archivo `.wasm`
   - Archivos `.woff2` locales
3. **Veredicto explícito:**
   Antes de concluir la tarea, reportar: `OFFLINE AUDIT: PASS` (o listar y corregir cada infracción encontrada).
