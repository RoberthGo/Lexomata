# 01 — Reglas Estrictas Offline-First (Cero Wi-Fi / Cero CDNs)

> **Nivel de cumplimiento:** OBLIGATORIO (CRÍTICO). Cualquier PR o commit que viole estas reglas se considera fallido.

---

## 1. Principio Rector
**Lexomata DEBE funcionar al 100% sin acceso a internet.**
No existe un "modo online obligatorio" ni librerías cargadas bajo demanda desde la red. React, Tailwind, los iconos, las tipografías y el motor compilado en Rust (`.wasm`) forman parte de un paquete completamente autocontenido en `apps/web/dist/`.

---

## 2. Lista Negra de Recursos Externos (PROHIBIDO)

Nunca agregues ninguno de los siguientes elementos al código fuente, HTML, CSS ni configuración de Vite:

- ❌ `<script src="https://...">` (React CDN, Tailwind Play CDN, Babel, D3 CDN, etc.).
- ❌ `<link rel="stylesheet" href="https://fonts.googleapis.com/...">` ni `fonts.gstatic.com`.
- ❌ Imports por URL (`import ... from "https://esm.sh/..."` o `unpkg.com` / `cdn.jsdelivr.net`).
- ❌ Iconos cargados vía URL remota (FontAwesome CDN, Material Icons CDN, SVGs en URLs externas).
- ❌ Avatares, imágenes de ejemplo, fondos o JSONs descargados de internet al arrancar.
- ❌ Telemetría, analytics (Google Analytics, Plausible, Sentry remoto) o comprobaciones de versión automáticas que bloqueen el arranque.
- ❌ Carga del script oficial de Google Identity Services (`https://accounts.google.com/gsi/client`) en el `<head>` del `index.html`. La sincronización con Google Drive debe usar **flujo OAuth 2.0 PKCE puro sobre REST** iniciado **solo** cuando el usuario hace clic explícitamente en "Conectar Google Drive".

---

## 3. Estándar Obligatorio de Empaquetado Local

### 3.1 Tipografías Locales
Instalar como dependencias npm y cargar desde `src/main.tsx`:
- UI sans-serif: `@fontsource/plus-jakarta-sans` (pesos 400, 500, 600, 700) o `@fontsource/inter`.
- Monospace (estados, símbolos, cinta de Turing, tablas): `@fontsource/jetbrains-mono` (pesos 400, 500, 600).
- Definir fallback limpio del sistema en CSS (`system-ui, -apple-system, sans-serif` y `ui-monospace, monospace`).

### 3.2 Iconos Locales
- Usar `lucide-react` instalado vía npm (SVGs en árbol, *tree-shaken*, empaquetados en el JS local).
- Los iconos propios de Lexomata (estado inicial, doble círculo de aceptación, cabezal de Turing, símbolo $\varepsilon$) se guardan como componentes SVG locales dentro de `apps/web/src/components/icons/`.

### 3.3 Motor Rust WebAssembly (`.wasm`)
- El archivo `.wasm` generado por `wasm-pack` se importa mediante Vite (`vite-plugin-wasm` o `new URL('./lexomata_wasm_bg.wasm', import.meta.url)`), quedando copiado dentro de `dist/assets/` con hash inmutable.
- **PROHIBIDO** descargar el `.wasm` desde otro dominio o CDN.

### 3.4 Rutas Relativas para GitHub Pages + Tauri
- Configurar `base: './'` (o detección limpia de `GITHUB_PAGES` vs `TAURI`) en `vite.config.ts` de modo que todos los assets funcionen tanto en `https://<usuario>.github.io/Lexomata/` como en `tauri://localhost` sin rutas rotas.

---

## 4. Configuración PWA Obligatoria (Web Offline en GitHub Pages)

El frontend DEBE incluir `vite-plugin-pwa` configurado con estrategia `generateSW` (Workbox) para precachear el 100% de la app tras la primera visita:

```ts
VitePWA({
  registerType: 'autoUpdate',
  includeAssets: ['favicon.svg', 'icons/*.png'],
  manifest: {
    name: 'Lexomata — Simulador de Autómatas y Máquinas de Turing',
    short_name: 'Lexomata',
    description: 'Editor y simulador moderno 100% offline de AFD, AFN y Máquinas de Turing',
    theme_color: '#0B0F19',
    background_color: '#0B0F19',
    display: 'standalone',
    start_url: './',
    scope: './',
  },
  workbox: {
    // CRITICO: incluir .wasm y .woff2 en el precache offline
    globPatterns: ['**/*.{js,css,html,ico,png,svg,wasm,woff2}'],
    maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10 MB margen para WASM
    cleanupOutdatedCaches: true,
  },
})
```

### Comportamiento Esperado de la PWA
- En la primera visita con internet, el Service Worker cachea HTML, JS, CSS, fuentes `.woff2`, iconos y el `.wasm`.
- Al desconectar Wi-Fi y recargar la página (F5), la app carga en < 300 ms sin errores en consola.
- Mostrar un indicador discreto en la barra de estado si el usuario está en modo **Sin conexión (Local)** sin molestar con banners rojos intrusivos.

---

## 5. Política de Seguridad de Contenidos (CSP)

### En Web (`index.html` meta tag o headers)
- `default-src 'self';`
- `script-src 'self' 'wasm-unsafe-eval';`
- `style-src 'self' 'unsafe-inline';`
- `font-src 'self' data:;`
- `img-src 'self' data: blob:;`
- `connect-src 'self' https://oauth2.googleapis.com https://www.googleapis.com;` *(exclusivamente para el botón opcional de Google Drive; cero llamadas automáticas al iniciar)*.

### En Tauri (`src-tauri/tauri.conf.json`)
- Configurar CSP equivalente restringiendo toda carga remota de scripts, estilos y fuentes.

---

## 6. Degradación Limpia de Funciones de Red (Google Drive)

1. La app **NUNCA** exige login ni pantalla de bienvenida conectada. Arranca directo en el workspace local.
2. Si `navigator.onLine === false`:
   - El botón de Google Drive muestra estado sutil `"Offline"` (deshabilitado con tooltip `"Conéctate a internet para sincronizar con Google Drive. Tus cambios se siguen guardando localmente."`).
   - Todo guardado local (IndexedDB, exportar `.lexo`, exportar `.jff`, exportar SVG/PNG) funciona al 100%.
3. Si falla una petición a Google Drive por corte repentino de red, la app captura el error de forma silenciosa/amigable y **nunca** pierde el estado local en memoria ni en IndexedDB.

---

## 7. Auditoría Offline Automatizada (Checklist CI y Local)

Antes de cerrar cualquier fase de frontend o build, ejecutar este chequeo sobre `apps/web/dist`:

1. **Búsqueda estática de URLs prohibidas en `dist/`:**
   No debe aparecer ninguna referencia a:
   `fonts.googleapis.com`, `fonts.gstatic.com`, `unpkg.com`, `cdn.jsdelivr.net`, `cdnjs.cloudflare.com`, `esm.sh`, `cdn.tailwindcss.com`, `accounts.google.com/gsi`.
2. **Prueba de Red Bloqueada (Playwright / DevTools):**
   - Servir `apps/web/dist` en `localhost`.
   - Cargar una vez para registrar el Service Worker.
   - Activar modo **Offline** en el navegador (o interceptar y abortar toda petición externa).
   - Recargar la página, crear 2 estados, 1 transición, ejecutar una simulación de AFD y una de Máquina de Turing.
   - Resultado obligatorio: **0 errores de red no manejados, 0 excepciones en consola, simulación correcta**.
