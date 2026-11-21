# 02 — Arquitectura Técnica del Monorepo

## 1. Decisiones Arquitectónicas Clave

| Capa | Tecnología | Justificación |
| :--- | :--- | :--- |
| **Motor Matemático** | **Rust** (`lexomata-core`) | Alto rendimiento, tipado algebraico fuerte (`enum`), pruebas unitarias rápidas con `cargo test`, cero GC en simulaciones largas de Máquinas de Turing. |
| **Puente Web/Nativo** | **WebAssembly** (`lexomata-wasm` via `wasm-bindgen`) | Un solo artefacto compilado corre igual en navegadores (GitHub Pages) y dentro del WebView de Tauri 2.0, eliminando lógica duplicada. |
| **Interfaz Gráfica** | **React 19 + TypeScript (strict) + Tailwind CSS + Vite** | Máxima calidad visual moderna, ecosistema maduro, 100% empaquetable offline y excelente rendimiento de modelos de IA al programar componentes. |
| **Estado UI** | **Zustand** + historial Undo/Redo (Command/Snapshot) | Simple, predecible, sin boilerplate de Redux, fácil de serializar a `.lexo` e IndexedDB. |
| **Empaquetado Nativo** | **Tauri 2.0** (`src-tauri`) | Ejecutables ligeros para Windows/macOS/Linux y soporte Android/iOS reutilizando el mismo `apps/web/dist`. |
| **Persistencia Local** | **IndexedDB** (`idb`) + File System Abstraction | Autoguardado instantáneo local-first + apertura/guardado nativo en Tauri y descarga/File Picker en Web. |

---

## 2. Estructura de Carpetas del Monorepo

```text
Lexomata/
├── AGENTS.md
├── Cargo.toml                          # Workspace de Rust
├── package.json                        # Scripts raíz (orquestación build/test/audit)
├── .github/
│   └── workflows/
│       ├── ci.yml                      # cargo test, clippy, typecheck, vitest, offline audit
│       ├── deploy-pages.yml            # Build WASM + Vite PWA -> GitHub Pages
│       └── release-desktop.yml         # Build Tauri 2.0 (Windows, Linux, macOS)
├── .opencode/
│   └── skills/                         # Skills para agentes OpenCode
├── specs/                              # Especificaciones SDD
├── crates/
│   ├── lexomata-core/                  # Rust puro (sin WASM, sin UI, sin IO de red)
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── model/                  # Structs del esquema .lexo (Project, State, Transition, etc.)
│   │       ├── error.rs                # EngineError tipado
│   │       ├── validation/             # Validador de AFD/AFN/MT (determinismo, inalcanzables)
│   │       ├── automata/               # Motor AFD, AFN, AFN-ε, paso a paso, batch
│   │       │   ├── mod.rs
│   │       │   ├── simulator.rs
│   │       │   ├── closure.rs          # ε-clausura con detección de ciclos
│   │       │   ├── convert.rs          # AFN-ε -> AFN -> AFD (subconjuntos)
│   │       │   └── minimize.rs         # Minimización de AFD (Hopcroft / equivalencias)
│   │       ├── turing/                 # Motor Máquina de Turing (1 cinta y multicinta)
│   │       │   ├── mod.rs
│   │       │   ├── tape.rs             # Cinta infinita sparse (BTreeMap<i64, String>)
│   │       │   ├── simulator.rs        # Ejecución, rewind, max_steps, batch
│   │       │   └── multi_tape.rs       # Extensión multicinta
│   │       └── formats/                # Import/Export .lexo JSON y .jff (JFLAP XML)
│   │           ├── mod.rs
│   │           ├── lexo_json.rs
│   │           └── jflap_xml.rs
│   └── lexomata-wasm/                  # Wrapper delgado wasm-bindgen sobre lexomata-core
│       ├── Cargo.toml
│       └── src/
│           └── lib.rs                  # Exporta funciones JS seguras (sin unwrap/panic)
├── apps/
│   └── web/                            # Aplicación React + TS + Tailwind + PWA
│       ├── index.html                  # CERO CDNs, CSP estricto
│       ├── package.json
│       ├── vite.config.ts              # Vite + PWA + WASM + rutas relativas
│       ├── tsconfig.json               # strict: true
│       ├── public/
│       │   ├── favicon.svg
│       │   └── icons/                  # Iconos PWA locales
│       └── src/
│           ├── main.tsx                # Importa @fontsource local + init WASM
│           ├── App.tsx
│           ├── styles/
│           │   └── tokens.css          # Variables de tema claro/oscuro
│           ├── types/
│           │   └── schema.ts           # Tipos TS espejados del contrato Rust
│           ├── engine/
│           │   ├── wasmAdapter.ts      # Único punto de entrada al binario WASM
│           │   └── mockFallback.ts     # (Solo para unit tests UI si aplica)
│           ├── store/
│           │   ├── useProjectStore.ts  # Estado del grafo, selección, undo/redo
│           │   ├── useSimStore.ts      # Estado de simulación activa y cinta MT
│           │   └── useUiStore.ts       # Tema, herramienta activa, paneles, online status
│           ├── platform/               # Abstracción Web vs Tauri 2.0
│           │   ├── index.ts            # Detección __TAURI_INTERNALS__
│           │   ├── fileService.ts      # Abrir/guardar .lexo/.jff en Web o Tauri FS
│           │   ├── localDb.ts          # IndexedDB (autoguardado y proyectos recientes)
│           │   └── gdriveSync.ts       # OAuth 2.0 PKCE + Drive REST API (opcional)
│           ├── components/
│           │   ├── layout/             # TopBar, FloatingDock, InspectorDrawer, StatusBar
│           │   ├── canvas/             # AutomataCanvas, StateNode, TransitionEdge, InlinePopover
│           │   ├── simulation/         # FaSimBar, TuringTapeBar, BatchRunnerModal, TraceTree
│           │   ├── panels/             # FormalDefPanel, TransitionTable, ValidationPanel, TransformModal
│           │   └── ui/                 # Primitivos accesibles (Button, Tooltip, Modal, Pill, Toast)
│           └── utils/
│               ├── geometry.ts         # Curvas Bézier, self-loops, ángulos, hit-testing
│               ├── layout.ts           # Auto-layout de grafos (circular, jerárquico/force)
│               └── exporters.ts        # Exportar lienzo a SVG, PNG y LaTeX (TikZ)
└── src-tauri/                          # Tauri 2.0 (Escritorio + Móvil)
    ├── Cargo.toml
    ├── tauri.conf.json                 # frontendDist: "../apps/web/dist"
    ├── capabilities/
    └── src/
        ├── main.rs
        ├── lib.rs
        └── oauth_loopback.rs           # Servidor temporal 127.0.0.1 solo al pulsar Login Drive
```

---

## 3. Flujo de Datos Unidireccional

```text
[Usuario en Canvas / Tape]
        │
        ▼
[Zustand Store (estado editable + historial Undo/Redo)]
        │  serializa snapshot .lexo
        ▼
[wasmAdapter.ts] ──► [lexomata-wasm (.wasm)] ──► [lexomata-core (Rust)]
        │                                                 │
        ◄────────────── Resultado tipado JSON/DTO ────────┘
        │
        ▼
[useSimStore / ValidationPanel / TuringTapeBar / AutomataCanvas]
```

### Regla de Oro de Comunicación
- El frontend **NO** implementa lógica formal de autómatas ni de Máquinas de Turing (no calcula $\varepsilon$-clausuras ni mueve cabezales por su cuenta en JS). Toda regla matemática vive en `crates/lexomata-core`.
- `crates/lexomata-core` **NO** conoce nada de píxeles de pantalla ni eventos del DOM; solo conserva coordenadas `(x, y)` opacas en los nodos para preservar la posición al transformar o guardar archivos.

---

## 4. Estrategia de Reutilización Web + Escritorio + Móvil

- **Código UI y Lógica:** ~98% compartido sin `if` condicionales.
- **Capa `src/platform/` (~2%):** encapsula exclusivamente:
  1. Abrir y guardar archivos en disco (`tauri-plugin-dialog` + `tauri-plugin-fs` en nativo vs. `<input type="file">` / File System Access API en Web).
  2. Callback de OAuth 2.0 PKCE para Google Drive (puerto temporal `127.0.0.1` en Escritorio / Deep Link en Móvil vs. redirect URI en GitHub Pages).
  3. Detección de viewport / gestos táctiles para adaptar paneles en Móvil.
