import type { State } from '../engine/types';

export const NODE_RADIUS = 28;
export const GRID_SIZE = 20;
export const DEFAULT_BIDIRECTIONAL_OFFSET = 36;

export interface Point {
  x: number;
  y: number;
}

export interface EdgeGeometry {
  /** Path SVG desde el borde de origen al borde de destino. */
  path: string;
  /** Punto medio de la etiqueta. */
  label: Point;
  /** Punto de control (útil para arrastrar la curvatura). */
  control: Point;
  /** `true` si el trazo es un lazo. */
  selfLoop: boolean;
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function snapToGrid(value: number, grid = GRID_SIZE): number {
  return Math.round(value / grid) * grid;
}

function unit(from: Point, to: Point): Point {
  const length = distance(from, to);
  if (length === 0) {
    return { x: 0, y: 0 };
  }
  return { x: (to.x - from.x) / length, y: (to.y - from.y) / length };
}

function along(from: Point, direction: Point, amount: number): Point {
  return { x: from.x + direction.x * amount, y: from.y + direction.y * amount };
}

function quadraticPoint(p0: Point, control: Point, p1: Point, t: number): Point {
  const inverse = 1 - t;
  return {
    x: inverse * inverse * p0.x + 2 * inverse * t * control.x + t * t * p1.x,
    y: inverse * inverse * p0.y + 2 * inverse * t * control.y + t * t * p1.y,
  };
}

export interface EdgeOptions {
  /** Existe una arista en la dirección contraria con offset 0. */
  hasReverse?: boolean;
}

/** Calcula la geometría de una arista con recorte exacto en los nodos. */
export function edgeGeometry(
  from: State,
  to: State,
  curveOffset = 0,
  options: EdgeOptions = {},
): EdgeGeometry {
  if (from.id === to.id) {
    return selfLoopGeometry(from, curveOffset);
  }

  const start: Point = { x: from.x, y: from.y };
  const end: Point = { x: to.x, y: to.y };
  const direction = unit(start, end);
  const normal = { x: -direction.y, y: direction.x };
  const midpoint = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };

  let offset = curveOffset;
  if (offset === 0 && options.hasReverse) {
    offset = DEFAULT_BIDIRECTIONAL_OFFSET;
  }

  if (offset === 0) {
    const trimmedStart = along(start, direction, NODE_RADIUS + 2);
    const trimmedEnd = along(end, { x: -direction.x, y: -direction.y }, NODE_RADIUS + 2);
    return {
      path: `M ${trimmedStart.x} ${trimmedStart.y} L ${trimmedEnd.x} ${trimmedEnd.y}`,
      label: midpoint,
      control: midpoint,
      selfLoop: false,
    };
  }

  const control = {
    x: midpoint.x + normal.x * offset,
    y: midpoint.y + normal.y * offset,
  };

  const startDirection = unit(start, control);
  const endDirection = unit(control, end);
  const trimmedStart = along(start, startDirection, NODE_RADIUS + 2);
  const trimmedEnd = along(end, { x: -endDirection.x, y: -endDirection.y }, NODE_RADIUS + 2);

  return {
    path: `M ${trimmedStart.x} ${trimmedStart.y} Q ${control.x} ${control.y} ${trimmedEnd.x} ${trimmedEnd.y}`,
    label: quadraticPoint(trimmedStart, control, trimmedEnd, 0.5),
    control,
    selfLoop: false,
  };
}

function selfLoopGeometry(state: State, curveOffset: number): EdgeGeometry {
  const center: Point = { x: state.x, y: state.y };
  const spread = curveOffset === 0 ? 0 : Math.max(-60, Math.min(60, curveOffset));
  const startAngle = ((-125 + spread) * Math.PI) / 180;
  const endAngle = ((-55 + spread) * Math.PI) / 180;

  const start = {
    x: center.x + Math.cos(startAngle) * NODE_RADIUS,
    y: center.y + Math.sin(startAngle) * NODE_RADIUS,
  };
  const end = {
    x: center.x + Math.cos(endAngle) * NODE_RADIUS,
    y: center.y + Math.sin(endAngle) * NODE_RADIUS,
  };

  const lift = 78 + Math.abs(curveOffset) * 0.25;
  const control1 = {
    x: center.x - 46 + curveOffset * 0.25,
    y: center.y - lift,
  };
  const control2 = {
    x: center.x + 46 + curveOffset * 0.25,
    y: center.y - lift,
  };

  return {
    path: `M ${start.x} ${start.y} C ${control1.x} ${control1.y} ${control2.x} ${control2.y} ${end.x} ${end.y}`,
    label: { x: center.x + curveOffset * 0.25, y: center.y - lift + 4 },
    control: { x: center.x + curveOffset * 0.25, y: center.y - lift },
    selfLoop: true,
  };
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function graphBounds(states: State[]): Bounds {
  if (states.length === 0) {
    return { minX: 0, minY: 0, maxX: 800, maxY: 600 };
  }

  const xs = states.map((state) => state.x);
  const ys = states.map((state) => state.y);

  return {
    minX: Math.min(...xs) - NODE_RADIUS - 80,
    minY: Math.min(...ys) - NODE_RADIUS - 100,
    maxX: Math.max(...xs) + NODE_RADIUS + 80,
    maxY: Math.max(...ys) + NODE_RADIUS + 80,
  };
}

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

/** Cámara que encaja el grafo en el área visible. */
export function fitCamera(
  states: State[],
  width: number,
  height: number,
): Camera {
  const bounds = graphBounds(states);
  const graphWidth = Math.max(1, bounds.maxX - bounds.minX);
  const graphHeight = Math.max(1, bounds.maxY - bounds.minY);
  const zoom = Math.min(1.6, Math.max(0.25, Math.min(width / graphWidth, height / graphHeight)));

  return {
    x: bounds.minX - (width / zoom - graphWidth) / 2,
    y: bounds.minY - (height / zoom - graphHeight) / 2,
    zoom,
  };
}

/** Convierte coordenadas de pantalla a coordenadas del mundo. */
export function screenToWorld(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number },
  camera: Camera,
): Point {
  return {
    x: (clientX - rect.left) / camera.zoom + camera.x,
    y: (clientY - rect.top) / camera.zoom + camera.y,
  };
}

export function clampZoom(zoom: number): number {
  return Math.min(3, Math.max(0.25, zoom));
}
