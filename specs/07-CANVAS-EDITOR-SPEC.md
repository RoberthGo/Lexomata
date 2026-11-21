# 07 — Especificación del Editor de Lienzo (Canvas de Grafos)

## 1. Tecnología de Renderizado Recomendada
- **SVG interactivo controlado por React + transformaciones GPU (`transform: translate(x, y) scale(z)`)** en un contenedor `<svg>` único.
- **Por qué SVG sobre Canvas 2D puro para Lexomata:**
  - Nitidez perfecta en pantallas HiDPI/Retina a cualquier nivel de zoom.
  - Hit-testing nativo y accesible para nodos, aristas, puntos de control y etiquetas.
  - Exportación a **SVG limpio** casi gratuita y conversión directa a PNG vía `OffscreenCanvas` / `canvas`.
  - Excelente rendimiento a 60 FPS hasta ~150 nodos y ~400 aristas si se evita re-renderizar nodos no modificados (`React.memo`).

---

## 2. Geometría de Nodos (Estados)

- Radio estándar: `R = 28px` (diámetro `56px`).
- **Estado de aceptación:** círculo concéntrico interior con radio `R_inner = 22px`.
- **Estado inicial:** flecha entrante desde la izquierda de longitud `36px` apuntando al borde `(x - R, y)`.
- **Etiqueta:** centrada en `(x, y)` en `JetBrains Mono`, auto-escalando ligeramente el tamaño de fuente si el nombre supera 4 caracteres (ej. `q_acc` o `{q0,q1}`).
- **Snap-to-Grid opcional:** cuadrícula de `20px` activable/desactivable (por defecto activa para alinear diagramas sin esfuerzo).

---

## 3. Geometría de Aristas (Transiciones) — Cero Solapamientos

Esta es una de las mayores debilidades de JFLAP y simuladores amateur. Lexomata debe resolver 3 casos con matemáticas exactas en `src/utils/geometry.ts`:

### Caso A: Arista Simple ($A \to B$, sin arista inversa)
- Si `curveOffset === 0`: línea recta recortada exactamente en las circunferencias de radio `R` de $A$ y $B$ (con margen de `2px` para la punta de flecha).
- Si `curveOffset !== 0`: curva Bézier cuadrática con punto de control $C$ desplazado perpendicularmente al punto medio $M$ en dirección normal $\vec{n}$ por `curveOffset`.

### Caso B: Aristas Bidireccionales ($A \to B$ y $B \to A$)
- Si existen ambas direcciones y sus `curveOffset` son `0`, el motor visual aplica automáticamente una curvatura simétrica por defecto (ej. `+36px` según la normal derecha del vector dirigido $\overrightarrow{AB}$).
- Resultado: las dos flechas forman un óvalo elegante y **nunca se enciman**.

### Caso C: Auto-Lazo / Self-Loop ($A \to A$)
- Curva Bézier cúbica que sale del cuadrante superior del nodo $A$ (ángulo `-125°` a `-55°`, o rotada según `curveOffset`), sube `58px` por encima del borde y regresa limpiamente con punta de flecha orientada a la tangente final.
- La píldora de etiqueta se posiciona en el ápice superior de la curva (`y - R - 48px`).

### Agrupación Visual de Etiquetas
- Todas las transiciones que comparten el mismo `(from, to)` se renderizan sobre **una sola curva** con una píldora contenedora en el punto $t = 0.5$ de la curva Bézier:
  - En FA: `0, 1` (una sola línea compacta).
  - En MT: lista vertical compacta (`0 ; X, R`, `1 ; Y, L`), clicable individualmente para editar o eliminar cada regla.
- Arrastrar la píldora o el punto medio de la arista ajusta `curveOffset` suavemente.

---

## 4. Navegación, Selección e Interacción

- **Pan (Desplazar lienzo):** arrastrar con botón central del mouse, o mantener `Space` + arrastrar, o arrastrar fondo en modo Pan.
- **Zoom:** rueda del mouse centrada en la posición del cursor (rango `0.25x` a `3.0x`), `Ctrl/Cmd + +`, `Ctrl/Cmd + -`, `Ctrl/Cmd + 0` (ajustar todo el grafo al centro), y acción **Enfocar nodo `X`** (centra y resalta el estado seleccionado desde el Inspector o búsqueda).
- **Acciones contextuales sobre aristas:** invertir arista (`from` ↔ `to`), cambiar origen o destino sin borrar la regla, y adjuntar notas académicas a nodos o aristas.
- **Selección múltiple:** `Shift + clic` o arrastrar rectángulo de selección (*marquee box*) sobre el fondo. Mover un nodo seleccionado mueve todo el grupo manteniendo distancias relativas.
- **Undo / Redo:** `Ctrl/Cmd + Z` y `Ctrl/Cmd + Shift + Z` (pila de mínimo 50 estados del grafo; coalescer arrastres continuos en una sola entrada al soltar el mouse para no contaminar el historial).

---

## 5. Atajos de Teclado Estándar

| Atajo | Acción |
| :--- | :--- |
| `V` | Herramienta Seleccionar / Mover |
| `S` | Herramienta Crear Estado |
| `T` | Herramienta Crear Transición |
| `X` | Herramienta Borrar |
| `Delete` / `Backspace` | Eliminar elementos seleccionados |
| `Space` (mantener) | Paneo temporal |
| `Ctrl/Cmd + Z` / `Shift+Z` | Deshacer / Rehacer |
| `Ctrl/Cmd + A` | Seleccionar todos los estados |
| `Ctrl/Cmd + 0` | Centrar y ajustar zoom al grafo |
| `Escape` | Cerrar popover / limpiar selección / volver a `V` |

---

## 6. Auto-Layout y Exportación Académica (`src/utils/layout.ts`, `exporters.ts`)
- **Auto-Layout:** al menos dos estrategias deterministas y 100% offline:
  1. *Layered / BFS desde $q_0$* (izquierda a derecha, ideal para AFD/AFN y resultado de AFN→AFD).
  2. *Circular* (ideal para grafos pequeños o simétricos).
- **Exportación 100% offline (con Modal de Vista Previa):**
  - Vista previa en vivo antes de exportar, selector de **Área** (`Ajustar al contenido` vs `Vista actual`) y **Tema de exportación independiente** (`Claro`, `Oscuro`, `Transparente`).
  - Opción **Adjuntar tabla de resultados de Batch / Multi-Run** debajo o al costado de la imagen exportada (con control de escala/límite de caracteres) para entregas académicas.
  - **SVG:** genera documento SVG limpio con estilos inline.
  - **PNG:** rasteriza el SVG a escala `2x` / HiDPI (`1280px` / `1920px` / `2560px`) para pegar en reportes o diapositivas.
  - **LaTeX (TikZ):** genera código `\begin{tikzpicture}...\end{tikzpicture}` con `\usetikzlibrary{automata, positioning, arrows}` listo para pegar en tareas y artículos académicos.
