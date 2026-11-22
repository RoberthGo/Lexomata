export type Tool = 'select' | 'state' | 'transition' | 'erase';

export type Selection =
  | { kind: 'none' }
  | { kind: 'state'; id: string }
  | { kind: 'edge'; from: string; to: string };

export type InspectorTab = 'properties' | 'delta' | 'formal' | 'batch';

export interface CanvasHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  fit: () => void;
  centerOnState: (stateId: string) => void;
}
