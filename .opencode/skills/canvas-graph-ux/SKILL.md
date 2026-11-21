---
name: canvas-graph-ux
description: Ingeniería geométrica y UX para el lienzo interactivo de autómatas y Máquinas de Turing (curvas Bézier, aristas bidireccionales sin solapamiento, self-loops, hit-testing, zoom centrado en cursor, 60 FPS y exportación SVG/PNG/TikZ). Usar al trabajar en src/components/canvas/ y src/utils/geometry.ts.
---

# Skill: Canvas & Graph UX Engineering

## Objetivo
Garantizar que dibujar, mover, conectar y simular autómatas en el lienzo de Lexomata sea **preciso, suave (60 FPS) y libre de solapamientos visuales**.

---

## Reglas Geométricas Estrictas (`src/utils/geometry.ts`)

Toda la matemática del grafo debe ser **pura, testeable en Vitest y desacoplada de React**:

1. **Recorte Exacto al Radio del Nodo (`R = 28`):**
   - Ninguna línea o curva puede empezar/terminar en el centro del círculo; debe intersectar el borde exacto del nodo origen y detenerse a `R + arrowPadding` del nodo destino, alineando la punta de flecha con la tangente final de la curva Bézier.

2. **Detección Automática de Pares Bidireccionales:**
   - Agrupar transiciones por clave dirigida `"${from}->${to}"`.
   - Si existe tanto `A->B` como `B->A` y `curveOffset === 0`, aplicar automáticamente desplazamiento normal por defecto (`+36px` respecto a la dirección `A->B`), generando dos arcos simétricos que jamás se cruzan.

3. **Auto-Lazos (*Self-Loops*) Elegantes:**
   - Cuando `from === to`, usar una curva Bézier cúbica suave anclada en ángulos `-125°` y `-55°` (rotables por el usuario con `curveOffset`), sobresaliendo `58px` del borde del nodo, con la píldora de etiqueta centrada en el ápice superior.

4. **Píldora de Etiquetas Agrupadas:**
   - Calcular el punto exacto $B(0.5)$ de la curva Bézier para ubicar la etiqueta.
   - Dar a la píldora un fondo `--bg-canvas` o `--bg-surface` con borde sutil para que el texto sea 100% legible incluso si cruza la línea o la cuadrícula.
   - Agregar un `<path>` invisible más ancho (`strokeWidth="16"`, `stroke="transparent"`) encima de cada arista para que hacer clic o doble clic en una flecha sea cómodo y preciso (*hit-testing* generoso).

5. **Zoom Centrado en el Cursor:**
   - Al hacer zoom con la rueda del mouse, recalcular `viewport.x` y `viewport.y` para que el punto del mundo bajo el cursor permanezca exactamente bajo el cursor tras escalar.
   - Exponer utilidades puras `screenToWorld(sx, sy, viewport)` y `worldToScreen(wx, wy, viewport)`.

---

## Reglas de Rendimiento y Usabilidad

- **Coalescer Undo/Redo:** Al arrastrar un nodo, actualizar su posición en estado transitorio en cada frame y confirmar **una sola entrada** en la pila Undo/Redo al soltar el puntero (`onPointerUp`).
- **Pointer Events unificados:** Usar `onPointerDown`, `onPointerMove`, `onPointerUp` y `setPointerCapture` para soportar mouse, trackpad, lápiz y pantalla táctil con el mismo código.
- **Animación de Simulación:** Cuando `firedTransitionIds` contenga una arista, aplicar clase de resaltado Sky (`#38BDF8`) y pulso animado a lo largo del `path` sin provocar re-layouts costosos.
- **Exportación Fiel (`exporters.ts`):**
  - El exportador SVG debe incluir explícitamente los estilos/colores calculados (no depender de clases de Tailwind externas) para que el archivo `.svg` se abra perfecto en navegadores, Inkscape o Word.
  - El exportador TikZ debe normalizar coordenadas de píxeles a centímetros razonables (ej. `x / 75`, eje Y invertido) y escapar símbolos especiales (`ε` → `$\varepsilon$`, `□` → `$\square$`).
