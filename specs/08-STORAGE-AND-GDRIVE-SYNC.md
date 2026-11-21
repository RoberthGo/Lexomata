# 08 — Persistencia Local-First y Sincronización Opcional con Google Drive

## 1. Filosofía Local-First
La fuente primaria de verdad es **el dispositivo del usuario**. Google Drive es un destino opcional de respaldo/sincronización que el usuario activa voluntariamente.

---

## 2. Capa 1: Autoguardado Automático en IndexedDB (`localDb.ts`)
- Base de datos local `lexomata-db` (vía librería ligera `idb`).
- Stores:
  - `projects`: almacena los proyectos `.lexo` completos indexados por `id` y `updatedAt`.
  - `settings`: preferencias del usuario (tema, grid, `defaultMaxSteps`, último proyecto abierto).
- **Debounce de guardado:** cada edición del grafo guarda automáticamente en IndexedDB tras `500ms` de inactividad.
- **Proyectos de Ejemplo Integrados (100% offline):**
  Incluir 4 plantillas empaquetadas como JSON estático dentro de `src/data/examples/`:
  1. `afd-termina-01.lexo` (AFD básico)
  2. `afn-epsilon-demo.lexo` (AFN-ε listo para probar conversión a AFD)
  3. `mt-0n1n.lexo` (Máquina de Turing reconocedora de $0^n 1^n$)
  4. `mt-incremento-binario.lexo` (Máquina de Turing transformadora de cinta)

---

## 3. Capa 2: Archivos en Disco Local (`fileService.ts`)

Interfaz unificada independientemente de la plataforma:
```ts
export interface FileService {
  openFile(accept: '.lexo' | '.jff'): Promise<{ name: string; content: string } | null>;
  saveFile(suggestedName: string, content: string, mimeType: string): Promise<boolean>;
}
```
- **En Web (GitHub Pages / PWA):**
  - Usa File System Access API (`showOpenFilePicker` / `showSaveFilePicker`) si está soportada, con fallback automático a `<input type="file">` y descarga vía `Blob` + `<a download>`.
- **En Escritorio / Móvil (Tauri 2.0):**
  - Usa `@tauri-apps/plugin-dialog` y `@tauri-apps/plugin-fs` para diálogos nativos del sistema operativo y escritura directa sobre el archivo abierto (`Ctrl+S` sobreescribe sin volver a preguntar).

---

## 4. Capa 3: Sincronización Opcional con Google Drive (Sin Backend)

### 4.1 Requisitos de Seguridad y Privacidad
- **Cero backend:** autenticación 100% cliente usando **OAuth 2.0 Authorization Code Flow + PKCE** (`S256`).
- **Scope mínimo necesario:** `https://www.googleapis.com/auth/drive.file` (solo accede a archivos creados o abiertos explícitamente por Lexomata, nunca lee el resto del Drive del usuario).
- El `GOOGLE_CLIENT_ID` (público en OAuth PKCE) se inyecta mediante variable de entorno de build `VITE_GOOGLE_CLIENT_ID`. Si no está configurado, la app funciona al 100% y oculta o marca como "No configurado" el botón de Drive.
- **PROHIBIDO** incluir `client_secret` en el frontend.

### 4.2 Diferencia de Login por Plataforma (`platform/gdriveSync.ts`)
1. **En Web (GitHub Pages):**
   - Genera `code_verifier` y `code_challenge` (SHA-256 vía `crypto.subtle` nativo del navegador).
   - Redirige (o abre popup) a `https://accounts.google.com/o/oauth2/v2/auth` con `redirect_uri = https://<usuario>.github.io/Lexomata/`.
   - Intercambia el `code` en `https://oauth2.googleapis.com/token` y conserva el `access_token` en memoria / `sessionStorage`.
2. **En Escritorio (Tauri 2.0):**
   - Invoca comando Rust `start_oauth_loopback` (`src-tauri/src/oauth_loopback.rs`) que levanta un listener TCP temporal en `127.0.0.1:0` (puerto libre aleatorio).
   - Abre el navegador predeterminado del sistema con `redirect_uri = http://127.0.0.1:<puerto>/callback`.
   - Recibe el código OAuth, responde con una página HTML local de "Listo, vuelve a Lexomata", cierra el socket inmediatamente y entrega el código al frontend.

### 4.3 Operaciones en Drive REST API v3
- Carpeta dedicada opcional `Lexomata` en Drive (buscada/creada al primer sync).
- **Listar proyectos:** `GET /drive/v3/files?q=name contains '.lexo' and trashed = false`.
- **Subir / Actualizar:** `POST/PATCH /upload/drive/v3/files?uploadType=multipart` enviando el JSON `.lexo`.
- **Descargar:** `GET /drive/v3/files/{fileId}?alt=media`.
- **Resolución simple de conflictos:** comparar `updatedAt` local vs `modifiedTime` en Drive; si difieren, mostrar modal claro preguntando *"Conservar versión local"* o *"Usar versión de Drive"* (o guardar como copia).

### 4.4 Comportamiento Offline
- Escuchar eventos `window.addEventListener('online' | 'offline')`.
- Nunca intentar llamadas a `googleapis.com` si `!navigator.onLine` o si el usuario no conectó su cuenta.
