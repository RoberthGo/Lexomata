# Lexomata RUST

Simulador académico, moderno y **100% offline** de Autómatas Finitos y Máquinas de Turing, inspirado en JFLAP pero con una experiencia de uso contemporánea.

> **Estado:** reescritura en curso. La versión anterior queda preservada en la rama `beta-old-version`.

## Stack

- **Motor formal:** Rust puro (`crates/lexomata-core`), compilado a WebAssembly.
- **Puente:** `crates/lexomata-wasm` con `wasm-bindgen` y errores tipados.
- **Interfaz:** React 19 + TypeScript estricto + Tailwind CSS + Vite.
- **Empaquetado:** Tauri 2.0 para escritorio y Android; PWA para web.
- **Persistencia:** local-first (IndexedDB + archivos `.lexo`/`.jff`). Sin backend.

## Alcance del MVP

- AFD, AFN y AFN-ε con clausura épsilon y simulación paso a paso.
- Máquina de Turing determinista de 1 cinta, cinta infinita sparse y *rewind*.
- Editor SVG de estados y transiciones con geometría Bézier.
- Simulación visual, ejecución por lotes y análisis de cadenas.
- Conversión AFN → AFD y minimización de AFD.
- Importación/exportación `.lexo` y compatibilidad JFLAP `.jff`.
- Exportación SVG, PNG y LaTeX (TikZ).
- Escritorio Windows (`.exe`) y Android (`.apk`).
- Web/PWA se mantiene compilable; su despliegue queda para después.

Fuera del MVP: Google Drive, máquinas multicinta, NTM, PDA, regex/multi-carácter y migración del JSON antiguo.

## Estructura

```text
.
├─ Cargo.toml                 # workspace Rust
├─ package.json               # scripts de orquestación
├─ specs/                     # especificaciones (fuente de verdad)
├─ .opencode/skills/          # skills para agentes
├─ crates/
│  ├─ lexomata-core/          # lógica formal, sin UI ni red
│  └─ lexomata-wasm/          # puente WASM
├─ apps/web/                  # React + TS + Tailwind + Vite
├─ src-tauri/                 # Tauri 2.0 (desktop + Android)
└─ scripts/                   # auditoría offline y utilidades
```

## Ramas

| Rama | Uso |
| :--- | :--- |
| `main` | Producción. Solo recibe merges de `dev` en releases. |
| `dev` | Desarrollo activo del rewrite. |
| `beta-old-version` | Versión anterior en JavaScript. No se modifica. |

## Requisitos de desarrollo

- Rust estable + target `wasm32-unknown-unknown`.
- `wasm-pack`.
- Node.js 20+ y npm.
- Tauri 2.0 CLI.
- Para Android: Android SDK, NDK y Java 17.

## Comandos previstos

```bash
cargo test --workspace
cargo clippy --workspace -- -D warnings
cargo fmt --check

wasm-pack build crates/lexomata-wasm --target web --out-dir ../../apps/web/src/wasm

npm run typecheck
npm run test:web
npm run build:web
npm run audit:offline

npm run tauri build
npm run tauri android build
```

## Reglas offline

- Cero CDNs, fuentes remotas, iconos remotos o telemetría.
- Todas las dependencias se empaquetan localmente.
- La aplicación debe arrancar, editar, simular y guardar sin conexión.

## Licencia

Ver [LICENSE](LICENSE).
