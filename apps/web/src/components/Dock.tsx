import {
  ArrowRight,
  CirclePlus,
  Eraser,
  Maximize2,
  MousePointer2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { DockPosition } from '../state/useUiPrefs';
import type { Tool } from '../uiTypes';

interface DockProps {
  tool: Tool;
  position?: DockPosition;
  onToolChange: (tool: Tool) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
}

const TOOLS: Array<{ id: Tool; label: string; shortcut: string; icon: typeof MousePointer2 }> = [
  { id: 'select', label: 'Seleccionar y mover', shortcut: 'V', icon: MousePointer2 },
  { id: 'state', label: 'Crear estado', shortcut: 'S', icon: CirclePlus },
  { id: 'transition', label: 'Crear transición', shortcut: 'T', icon: ArrowRight },
  { id: 'erase', label: 'Borrar', shortcut: 'X', icon: Eraser },
];

export function Dock({
  tool,
  position = 'left',
  onToolChange,
  onZoomIn,
  onZoomOut,
  onFit,
}: DockProps) {
  const isBottom = position === 'bottom';
  const positionClass =
    position === 'right'
      ? 'right-3 top-3 flex-col'
      : position === 'bottom'
        ? 'bottom-3 left-1/2 -translate-x-1/2 flex-row'
        : 'left-3 top-3 flex-col';

  return (
    <div
      className={`pointer-events-auto absolute flex items-center gap-0.5 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)]/85 p-1 shadow-[var(--shadow-float)] backdrop-blur-md ${positionClass}`}
    >
      {TOOLS.map(({ id, label, shortcut, icon: Icon }) => (
        <button
          key={id}
          type="button"
          title={`${label} (${shortcut})`}
          aria-label={label}
          aria-pressed={tool === id}
          onClick={() => onToolChange(id)}
          className={`group relative flex h-11 w-11 items-center justify-center rounded-[var(--radius-sm)] transition-colors lg:h-8 lg:w-8 ${
            tool === id
              ? 'bg-[var(--accent-selection-soft)] text-[var(--accent-selection)]'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-elevated)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Icon aria-hidden="true" className="h-4 w-4" />
          <span
            className={`mono pointer-events-none absolute z-40 hidden rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-1 text-[9px] text-[var(--text-muted)] group-hover:block ${
              isBottom ? '-top-6 left-1/2 -translate-x-1/2' : position === 'right' ? 'right-10' : 'left-10'
            }`}
          >
            {shortcut}
          </span>
        </button>
      ))}

      <div
        className={
          isBottom
            ? 'mx-0.5 h-5 w-px bg-[var(--border-subtle)]'
            : 'my-0.5 h-px w-5 bg-[var(--border-subtle)]'
        }
      />

      <button
        type="button"
        title="Acercar"
        aria-label="Acercar"
        onClick={onZoomIn}
        className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-elevated)] hover:text-[var(--text-primary)] lg:h-7 lg:w-8"
      >
        <ZoomIn aria-hidden="true" className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        title="Alejar"
        aria-label="Alejar"
        onClick={onZoomOut}
        className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-elevated)] hover:text-[var(--text-primary)] lg:h-7 lg:w-8"
      >
        <ZoomOut aria-hidden="true" className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        title="Ajustar a pantalla (Ctrl+0)"
        aria-label="Ajustar a pantalla"
        onClick={onFit}
        className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-elevated)] hover:text-[var(--text-primary)] lg:h-7 lg:w-8"
      >
        <Maximize2 aria-hidden="true" className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
