# 06 — Sistema de Diseño UI/UX (Lexomata Modern Design)

## 1. Filosofía Estética: "Precision Academic Instrument"

Lexomata debe sentirse como el cruce entre **Figma / Excalidraw** (lienzo infinito, manipulación directa, fluidez) y **Linear / Raycast** (tipografía nítida, paneles flotantes limpios, atajos de teclado claros), diseñado específicamente para Teoría de la Computación.

### Qué SÍ somos vs. Qué NO somos
- ✅ **SÍ:** Lienzo protagonista (≥ 80% de la pantalla), espacio negativo limpio, bordes finos de 1px, jerarquía tipográfica rigurosa, feedback visual instantáneo al simular, edición *inline* sobre nodos y aristas.
- ❌ **NO:** Ventanas grises anticuadas tipo Java Swing/JFLAP clásico, popups nativos (`alert`/`prompt`), degradados arcoíris exagerados ("AI slop"), sombras pesadas, menús anidados de 4 niveles o paneles abarrotados de botones que no se usan.

---

## 2. Sistema de Color y Tokens CSS (`apps/web/src/styles/tokens.css`)

Soportar **Tema Oscuro (por defecto)** y **Tema Claro**, con transición suave y persistencia en `localStorage`.

### 2.1 Paleta Base

| Token | Tema Oscuro (Default) | Tema Claro | Uso |
| :--- | :--- | :--- | :--- |
| `--bg-canvas` | `#0B0F19` | `#F8FAFC` | Fondo del lienzo infinito |
| `--bg-dot-grid` | `#1E293B` | `#CBD5E1` | Puntos sutiles de la cuadrícula |
| `--bg-surface` | `#111827` | `#FFFFFF` | Paneles, barras flotantes, modales |
| `--bg-surface-elevated` | `#1E293B` | `#F1F5F9` | Inputs, hover de botones, pills |
| `--border-subtle` | `rgba(148, 163, 184, 0.16)` | `rgba(15, 23, 42, 0.10)` | Separadores y contornos de paneles |
| `--border-strong` | `rgba(148, 163, 184, 0.32)` | `rgba(15, 23, 42, 0.22)` | Bordes activos / focus |
| `--text-primary` | `#F1F5F9` | `#0F172A` | Títulos, etiquetas de estados |
| `--text-secondary` | `#94A3B8` | `#475569` | Descripciones, hints, atajos |
| `--text-muted` | `#64748B` | `#94A3B8` | Índices de celda, placeholders |

### 2.2 Colores Semánticos de Simulación (Alto Contraste)

| Significado | Color Principal | Fondo / Halo | Uso Visual |
| :--- | :--- | :--- | :--- |
| **Primario / Selección** | `#6366F1` (Indigo 500) | `rgba(99, 102, 241, 0.16)` | Nodos seleccionados, herramienta activa, foco |
| **Estado Activo / Cabezal MT** | `#38BDF8` (Sky 400) | `rgba(56, 189, 248, 0.22)` | Estado actual en simulación, cabezal de cinta |
| **Aceptación (`ACCEPTED`)** | `#10B981` (Emerald 500) | `rgba(16, 185, 129, 0.16)` | Badge de aceptación, pulso final en estado aceptador |
| **Rechazo / Error (`REJECTED`)** | `#F43F5E` (Rose 500) | `rgba(244, 63, 94, 0.16)` | Badge de rechazo, transición conflictiva, parada en error |
| **Advertencia / Límite (`STEP_LIMIT`)** | `#F59E0B` (Amber 500) | `rgba(245, 158, 11, 0.16)` | Estados inalcanzables, AFD incompleto, posible bucle |
| **Transición $\varepsilon$ / Blanco $\square$** | `#A78BFA` (Violet 400) | `rgba(167, 139, 250, 0.14)` | Píldora diferenciadora para `ε` y `□` |

---

## 3. Tipografía (100% Local vía `@fontsource`)

- **UI General:** `'Plus Jakarta Sans', system-ui, sans-serif`
  - Títulos de panel: `13px–14px`, peso `600`, tracking `-0.01em`.
  - Controles / botones: `13px`, peso `500`.
  - Etiquetas secundarias / badges: `11px–12px`, peso `500`.
- **Notación Formal y Simulación:** `'JetBrains Mono', ui-monospace, monospace`
  - Nombres de estados (`q0`, `q1`), reglas de transición (`0 ; X, R`), celdas de cinta de Turing, cadenas de entrada y tabla de transiciones.
  - Usar `font-variant-numeric: tabular-nums` en contadores de pasos e índices de cinta para evitar saltos visuales.

---

## 4. Arquitectura Espacial de la Pantalla (Layout)

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ TopBar (48px): Logo | Proyecto [editable] | Modo [AFD|AFN|MT] | Acciones│
├───────┬─────────────────────────────────────────────────┬───────────────┤
│       │                                                 │               │
│ Dock  │                                                 │  Inspector    │
│ Izq   │            LIENZO INFINITO (Canvas)             │  Colapsable   │
│ (fl.) │         (cuadrícula de puntos, 60 FPS)          │  (300px)      │
│       │                                                 │  - Props      │
│ [V]   │            ┌────┐      0 ; X, R      ╔════╗     │  - Tabla δ    │
│ [S]   │       ───► │ q0 │ ─────────────────► ║ q1 ║     │  - Formal     │
│ [T]   │            └────┘                    ╚════╝     │  - Batch Test │
│ [X]   │                                                 │               │
│       ├─────────────────────────────────────────────────┤               │
│       │  Simulation Bar / Cinta Infinita de Turing      │               │
│       │  [◀] [▶] [II] [⏭]  |  ... [□][0][1][1][0][□]... │               │
└───────┴─────────────────────────────────────────────────┴───────────────┘
```

### 4.1 TopBar Minimalista (`h-12`)
- **Izquierda:** Menú Archivo (Nuevo, Ejemplos integrados, Abrir `.lexo`/`.jff`, Guardar, Exportar SVG/PNG/TikZ) + Título editable inline del proyecto.
- **Centro:** Selector segmentado limpio de máquina (`AFD` | `AFN-ε` | `Máquina de Turing`) con confirmación segura si cambiar el tipo requiere adaptar transiciones.
- **Derecha:** Undo/Redo, botón **Herramientas Formales** (AFN→AFD, Minimizar AFD, Auto-Layout), indicador discreto de estado local/Google Drive, toggle Tema Claro/Oscuro.

### 4.2 Barra de Herramientas Flotante (Dock)
Píldora flotante translúcida (`backdrop-blur-md`) con bordes `1px`:
- `V` — Seleccionar / Mover
- `S` — Crear Estado (clic en lienzo)
- `T` — Crear Transición (arrastrar de estado origen a destino, o clic origen → clic destino)
- `X` — Borrar
- Separador + Zoom (`-`, `100%`, `+`, Ajustar a pantalla `Fit`).
- Cada botón muestra tooltip con nombre + atajo de teclado en badge monospace.

### 4.3 Panel Inspector Derecho (Colapsable, `w-[300px]`)
Organizado en 4 pestañas compactas con iconos:
1. **Propiedades:** Edita el nodo o transición seleccionada (nombre, inicial, aceptación, comentarios, lista de reglas de esa arista) o diagnóstico de validación en tiempo real si no hay selección.
2. **Tabla $\delta$:** Tabla interactiva de transiciones (muestra la función $\delta$ actualizada en vivo y permite navegar al hacer clic en una fila).
3. **Formal:** Muestra la tupla formal $(Q, \Sigma, \delta, q_0, F)$ o $(Q, \Sigma, \Gamma, \delta, q_0, B, F)$ lista para copiar en texto o LaTeX.
4. **Lotes (Batch):** Tabla tipo JFLAP "Multiple Run" para agregar cadenas, definir resultado esperado (`ACCEPT`/`REJECT`), correr todas con 1 clic y ver resumen `12/12 Pasadas`.

---

## 5. Diseño de la Barra de Simulación y Cinta de Turing (Componente Estrella)

### 5.1 Modo Autómatas Finitos (`FaSimBar`)
- Input de cadena con botón rápido para insertar cadena vacía `ε`.
- Visualizador de cadena tipo "tira de fichas": caracteres ya leídos atenuados, carácter actual resaltado en Sky (`#38BDF8`), caracteres pendientes nítidos.
- Controles: `Reset`, `Paso Atrás`, `Play / Pausa`, `Paso Adelante`, `Ejecutar Rápido`, selector de velocidad (`0.5x`, `1x`, `2x`, `5x` o intervalo custom en `ms`).
- Pill de veredicto animado (`ACEPTADA` en Emerald / `RECHAZADA` en Rose).
- Indicador compacto de **transiciones disponibles** desde el estado actual (y en AFN, cantidad de estados activos simultáneos, ej. `3 estados activos: q1, q2, q4`).

### 5.2 Modo Máquina de Turing (`TuringTapeBar`)
Debe ser el componente más memorable y didáctico de toda la aplicación:
- **Cinta Horizontal Infinita:**
  - Celdas cuadradas (`44px × 44px`) en `JetBrains Mono` con índice numérico discreto debajo (`-2, -1, 0, 1, 2...`).
  - **Cabezal Animado:** Marco resaltado (`2px solid #38BDF8` + halo sutil + flecha triangular superior/inferior) que se centra suavemente con transición CSS cuando el cabezal se desplaza.
  - **Pulso de Escritura:** Cuando una transición modifica el símbolo de la celda bajo el cabezal, la celda hace un micro-destello suave (~220ms) para que el estudiante vea claramente el cambio.
  - **Edición Directa:** Antes de correr (o en pausa), hacer clic en cualquier celda permite escribir un símbolo o hacer doble clic para limpiar a `□`.
  - Botón rápido `Centrar cabezal` si el usuario hizo scroll manual lejos de la cabeza.
- **Fila de Controles Superior de la Cinta:**
  - Input rápido para cargar una cadena inicial en la cinta (`0011` → rellena celdas `0..3` y reinicia cabezal a `0`).
  - Controles: `Reset`, `Paso Atrás`, `Play/Pausa`, `Paso Adelante`, `Fast Run`, selector de velocidad y límite `Max Steps`.
  - Chips de estado en vivo: `Estado: q2`, `Paso: 14`, `Última regla: 0 ; X, R`, y pill de veredicto (`EN EJECUCIÓN` | `ACEPTADA` | `RECHAZADA` | `LÍMITE ALCANZADO`).
- **Multicinta (cuando `tapeCount > 1`):** Apilar cintas sincronizadas verticalmente con etiqueta `Cinta 1`, `Cinta 2`, etc.

---

## 6. Reglas de Micro-Interacciones y Edición Inline
- **Crear estado:** doble clic en espacio vacío del lienzo (en modo Selección) o clic simple en modo `S`. Auto-nombra `q0, q1, q2...` usando el menor índice entero disponible.
- **Marcar inicial / aceptación:** menú contextual (clic derecho en nodo) o checkboxes rápidos en el popover flotante / Inspector.
- **Editar transición:** al soltar una nueva arista (o hacer doble clic sobre una arista existente), aparece un **popover compacto anclado al punto medio de la curva**:
  - En FA: input de símbolo(s) separados por coma (`a, b`) + botón rápido `ε` + Enter para confirmar.
  - En MT: tres mini-campos horizontales `[Lee] ; [Escribe] , [L | R | S]` con botones rápidos `□` y selector segmentado `L / R / S` + Enter para confirmar.
- **Menú contextual en aristas:** clic derecho sobre una arista permite **invertir dirección** (`from` ↔ `to`), **reasignar origen/destino** y abrir editor inline de **notas/anotaciones** (también disponible en nodos).
- **Animación de disparo:** al avanzar un paso en simulación, la arista recién disparada se ilumina durante ~300ms y un pulso visual recorre la curva desde origen hacia destino.

---

## 7. Adaptación Responsiva (Escritorio → Tablet / Móvil)
- **Escritorio (`>= 1024px`):** Layout completo con Dock izquierdo flotante, Inspector derecho colapsable y Barra inferior.
- **Tablet / Móvil (`< 1024px`):**
  - El Inspector pasa a ser un *Bottom Sheet* / Drawer deslizable para no aplastar el lienzo.
  - El Dock de herramientas se compacta con objetivos táctiles mínimos de `44px × 44px`.
  - Soporte de pellizco (*pinch-to-zoom*) y paneo con dos dedos sobre el lienzo.
