import {
  ArrowRight,
  CirclePlus,
  Eraser,
  Maximize2,
  MousePointer2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { Tool } from '../uiTypes';

interface DockProps {
  tool: Tool;
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

export function Dock({ tool, onToolChange, onZoomIn, onZoomOut, onFit }: DockProps) {
  return (
    <div className="pointer-events-auto absolute left-3 top-3 flex flex-col items-center gap-0.5 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)]/85 p-1 shadow-[var(--shadow-float)] backdrop-blur-md">
      {TOOLS.map(({ id, label, shortcut, icon: Icon }) => (
        <button
          key={id}
          type="button"
          title={`${label} (${shortcut})`}
          aria-label={label}
          aria-pressed={tool === id}
          onClick={() => onToolChange(id)}
          className={`group relative flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] transition-colors ${
            tool === id
              ? 'bg-[var(--accent-selection-soft)] text-[var(--accent-selection)]'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-elevated)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Icon aria-hidden="true" className="h-4 w-4" />
          <span className="mono pointer-events-none absolute left-10 z-40 hidden rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-1 text-[9px] text-[var(--text-muted)] group-hover:block">
            {shortcut}
          </span>
        </button>
      ))}

      <div className="my-0.5 h-px w-5 bg-[var(--border-subtle)]" />

      <button
        type="button"
        title="Acercar"
        aria-label="Acercar"
        onClick={onZoomIn}
        className="flex h-7 w-8 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-elevated)] hover:text-[var(--text-primary)]"
      >
        <ZoomIn aria-hidden="true" className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        title="Alejar"
        aria-label="Alejar"
        onClick={onZoomOut}
        className="flex h-7 w-8 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-elevated)] hover:text-[var(--text-primary)]"
      >
        <ZoomOut aria-hidden="true" className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        title="Ajustar a pantalla (Ctrl+0)"
        aria-label="Ajustar a pantalla"
        onClick={onFit}
        className="flex h-7 w-8 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-elevated)] hover:text-[var(--text-primary)]"
      >
        <Maximize2 aria-hidden="true" className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
