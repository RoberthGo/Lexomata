# 00 — Visión y Alcance del Proyecto (Lexomata v2)

## 1. Propósito
**Lexomata v2** es un laboratorio interactivo, moderno y 100% offline para diseñar, visualizar, simular y analizar **Autómatas Finitos** y **Máquinas de Turing**.

Nace como una alternativa contemporánea a **JFLAP**: conserva el rigor matemático y la riqueza académica que necesitan estudiantes y profesores de Lenguajes y Autómatas / Teoría de la Computación, pero reemplaza las ventanas grises de Java Swing por una experiencia fluida, veloz, estéticamente cuidada y ejecutable desde el navegador o como app nativa.

---

## 2. Plataformas Objetivo y Prioridad

| Prioridad | Plataforma | Tecnología de Entrega | Requisitos Clave |
| :---: | :--- | :--- | :--- |
| **1 (Principal)** | **Web (GitHub Pages)** | Vite + React + Rust WASM + PWA | Funciona 100% offline tras primera carga; instalable como PWA; cero backend obligatorio. |
| **1 (Principal)** | **Escritorio (Windows, Linux, macOS)** | Tauri 2.0 envolviendo el mismo frontend + WASM | Binario ligero, apertura/guardado nativo de archivos `.lexo` y `.jff`, 100% offline. |
| **2 (Secundaria)** | **Móvil (Android / iOS)** | Tauri 2.0 Mobile + Layout táctil responsivo | Interfaz usable en pantallas medianas/tablets y teléfonos para revisar/simular proyectos. |

---

## 3. Alcance Funcional (Paridad moderna con JFLAP)

### 3.1 Máquinas Soportadas en MVP (v2.0)
1. **Autómata Finito Determinista (AFD / DFA)**
2. **Autómata Finito No Determinista (AFN / NFA)** y **AFN con transiciones vacías (AFN-ε)**
3. **Máquina de Turing Determinista de 1 Cinta (MT / DTM)**

### 3.2 Extensiones Preparadas por Arquitectura (v2.1+)
- **Máquina de Turing Multicinta ($k$-tape TM)** — el esquema JSON ya soporta arreglos de cintas.
- **Máquina de Turing No Determinista (NTM)** — soportada mediante árbol acotado de configuraciones.
- **Autómata de Pila (PDA)** — extensible mediante `machineType` en el esquema `.lexo`.

### 3.3 Capacidades Clave
- **Editor Visual Profesional:** creación intuitiva de estados, marcado rápido de estado inicial y de aceptación, transiciones con curvas Bézier automáticas, auto-lazos (*self-loops*), etiquetas agrupadas, deshacer/rehacer ilimitado, auto-ordenamiento de grafos y exportación a SVG/PNG/LaTeX (TikZ).
- **Simulador Interactivo Paso a Paso:**
  - En Autómatas: cursor visual sobre la cadena de entrada, resaltado simultáneo de múltiples estados activos en AFN, seguimiento de $\varepsilon$-clausuras y retroceso paso a paso (*step back*).
  - En Máquinas de Turing: cinta infinita horizontal animada, movimiento suave del cabezal (`L`, `R`, `S`), edición directa de celdas, contador de pasos, límite anti-bucles infinitos y retroceso instantáneo.
- **Ejecución por Lotes (*Multiple Run*):** tabla de pruebas masivas para validar decenas de cadenas a la vez con resultado esperado vs. obtenido (ideal para tareas y exámenes).
- **Algoritmos Formales (Motor Rust):**
  - Validación estructural en tiempo real (determinismo, transiciones faltantes, estados inalcanzables).
  - Conversión **AFN-ε → AFN → AFD** (construcción de subconjuntos).
  - **Minimización de AFD** (Hopcroft / partición de equivalencia) con reporte de estados equivalentes.
  - Generación de tabla de transiciones y definición formal $(Q, \Sigma, \delta, q_0, F)$ o $(Q, \Sigma, \Gamma, \delta, q_0, B, F)$.
- **Interoperabilidad Académica:**
  - Formato nativo `.lexo` (JSON versionado, legible, amigable con Git).
  - Importación y exportación compatible con **JFLAP (`.jff`)** para Finite Automata y Turing Machines.
- **Almacenamiento Local-First + Nube Opcional:**
  - Autoguardado local inmediato en IndexedDB (nunca se pierde trabajo al cerrar).
  - Exportar/importar archivos en disco local.
  - Conexión opcional con **Google Drive** (sin backend, OAuth 2.0 PKCE) para respaldar o sincronizar proyectos cuando el usuario lo decida y tenga conexión.

---

## 4. Criterios de Éxito
1. Un usuario desconectado de internet puede abrir Lexomata (en Escritorio o en la PWA previamente cargada), construir un AFN o una Máquina de Turing desde cero, simular cadenas paso a paso, ejecutar pruebas por lotes y guardar su archivo en disco con **cero errores de red**.
2. El rendimiento del lienzo se mantiene a **60 FPS** con máquinas de hasta 100 estados y 300 transiciones.
3. Un modelo de IA mediano/rápido puede trabajar en un módulo (p. ej. algoritmo de minimización en Rust o popover de edición en React) sin necesitar romper ni reescribir el resto de la app.
