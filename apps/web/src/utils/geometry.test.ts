import { describe, expect, it } from 'vitest';
import type { State } from '../engine/types';
import {
  clampZoom,
  edgeGeometry,
  fitCamera,
  graphBounds,
  NODE_RADIUS,
  screenToWorld,
  snapToGrid,
} from './geometry';

function state(id: string, x: number, y: number): State {
  return { id, label: id, x, y, isInitial: false, isAccepting: false };
}

describe('geometry', () => {
  it('ajusta coordenadas a la rejilla', () => {
    expect(snapToGrid(31)).toBe(40);
    expect(snapToGrid(29)).toBe(20);
    expect(snapToGrid(-31)).toBe(-40);
    expect(snapToGrid(0)).toBe(0);
  });

  it('recorta una arista recta en el borde de los nodos', () => {
    const geometry = edgeGeometry(state('a', 0, 0), state('b', 100, 0));

    expect(geometry.selfLoop).toBe(false);
    expect(geometry.path).toBe(`M ${NODE_RADIUS + 2} 0 L ${100 - NODE_RADIUS - 2} 0`);
    expect(geometry.label).toEqual({ x: 50, y: 0 });
  });

  it('curva automáticamente las aristas bidireccionales', () => {
    const geometry = edgeGeometry(state('a', 0, 0), state('b', 100, 0), 0, {
      hasReverse: true,
    });

    expect(geometry.path).toContain('Q 50 36');
    expect(geometry.label.x).toBeCloseTo(50);
    expect(geometry.label.y).toBeGreaterThan(18);
    expect(geometry.label.y).toBeLessThan(36);
    expect(geometry.control).toEqual({ x: 50, y: 36 });
  });

  it('genera un lazo para transiciones de un estado consigo mismo', () => {
    const geometry = edgeGeometry(state('a', 40, 50), state('a', 40, 50));

    expect(geometry.selfLoop).toBe(true);
    expect(geometry.path.startsWith('M ')).toBe(true);
    expect(geometry.path).toContain('C ');
    expect(geometry.label.x).toBe(40);
    expect(geometry.label.y).toBeLessThan(50);
  });

  it('calcula límites y cámara de ajuste', () => {
    const bounds = graphBounds([state('a', 0, 0), state('b', 200, 100)]);

    expect(bounds.minX).toBe(-NODE_RADIUS - 80);
    expect(bounds.maxX).toBe(200 + NODE_RADIUS + 80);

    const camera = fitCamera([state('a', 0, 0)], 800, 600);
    expect(camera.zoom).toBe(1.6);
    expect(screenToWorld(0, 0, { left: 0, top: 0 }, camera)).toEqual({
      x: camera.x,
      y: camera.y,
    });
  });

  it('limita el zoom al rango permitido', () => {
    expect(clampZoom(0.01)).toBe(0.25);
    expect(clampZoom(10)).toBe(3);
    expect(clampZoom(1.5)).toBe(1.5);
  });
});
