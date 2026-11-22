import type { LexoProject, State } from '../engine/types';

export type LayoutStrategy = 'layered' | 'circular';

const COLUMN_GAP = 220;
const ROW_GAP = 150;
const ORIGIN_X = 160;
const ORIGIN_Y = 160;

/** Reubica los estados con un layout determinista. */
export function layoutStates(project: LexoProject, strategy: LayoutStrategy): LexoProject {
  if (project.states.length === 0) {
    return project;
  }

  const positions =
    strategy === 'circular' ? circularLayout(project.states) : layeredLayout(project);

  return {
    ...project,
    updatedAt: new Date().toISOString(),
    states: project.states.map((state) => ({
      ...state,
      ...(positions.get(state.id) ?? { x: state.x, y: state.y }),
    })),
  };
}

function layeredLayout(project: LexoProject): Map<string, { x: number; y: number }> {
  const adjacency = new Map<string, string[]>();
  for (const state of project.states) {
    adjacency.set(state.id, []);
  }
  for (const transition of project.transitions) {
    adjacency.get(transition.from)?.push(transition.to);
  }
  for (const targets of adjacency.values()) {
    targets.sort();
  }

  const initial = project.states.find((state) => state.isInitial) ?? project.states[0];
  const levels = new Map<string, number>();
  const queue: string[] = [];

  if (initial) {
    levels.set(initial.id, 0);
    queue.push(initial.id);
  }

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      break;
    }
    const level = levels.get(current) ?? 0;
    for (const target of adjacency.get(current) ?? []) {
      if (!levels.has(target)) {
        levels.set(target, level + 1);
        queue.push(target);
      }
    }
  }

  let maxLevel = 0;
  for (const level of levels.values()) {
    maxLevel = Math.max(maxLevel, level);
  }
  for (const state of project.states) {
    if (!levels.has(state.id)) {
      maxLevel += 1;
      levels.set(state.id, maxLevel);
    }
  }

  const byLevel = new Map<number, string[]>();
  for (const state of project.states) {
    const level = levels.get(state.id) ?? 0;
    const bucket = byLevel.get(level) ?? [];
    bucket.push(state.id);
    byLevel.set(level, bucket);
  }

  const positions = new Map<string, { x: number; y: number }>();
  for (const [level, ids] of [...byLevel.entries()].sort((a, b) => a[0] - b[0])) {
    ids.sort();
    const offset = ((ids.length - 1) * ROW_GAP) / 2;
    ids.forEach((id, index) => {
      positions.set(id, {
        x: ORIGIN_X + level * COLUMN_GAP,
        y: ORIGIN_Y + offset + index * ROW_GAP,
      });
    });
  }

  return positions;
}

function circularLayout(states: State[]): Map<string, { x: number; y: number }> {
  const radius = Math.max(180, states.length * 42);
  const centerX = 460;
  const centerY = 360;
  const positions = new Map<string, { x: number; y: number }>();
  const startAngle = -Math.PI / 2;

  states.forEach((state, index) => {
    const angle = startAngle + (index / Math.max(1, states.length)) * Math.PI * 2;
    positions.set(state.id, {
      x: Math.round(centerX + Math.cos(angle) * radius),
      y: Math.round(centerY + Math.sin(angle) * radius),
    });
  });

  return positions;
}
