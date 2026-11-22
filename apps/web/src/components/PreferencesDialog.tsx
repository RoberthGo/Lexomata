import { RotateCcw } from 'lucide-react';
import type { Theme } from '../state/useTheme';
import type {
  AccentPreset,
  DockPosition,
  SimPosition,
  UiDensity,
  UiPrefs,
} from '../state/useUiPrefs';
import { Modal, PrimaryButton, SecondaryButton } from './Modal';

interface PreferencesDialogProps {
  theme: Theme;
  onToggleTheme: () => void;
  prefs: UiPrefs;
  onUpdatePrefs: (patch: Partial<UiPrefs>) => void;
  onResetPrefs: () => void;
  onClose: () => void;
}

const ACCENTS: Array<{ id: AccentPreset; label: string; swatch: string }> = [
  { id: 'cobalt', label: 'Cobalto', swatch: '#3b82f6' },
  { id: 'emerald', label: 'Esmeralda', swatch: '#10b981' },
  { id: 'amber', label: 'Ámbar', swatch: '#d97706' },
  { id: 'slate', label: 'Pizarra', swatch: '#64748b' },
];

const DOCK_POSITIONS: Array<{ id: DockPosition; label: string }> = [
  { id: 'left', label: 'Izquierda' },
  { id: 'right', label: 'Derecha' },
  { id: 'bottom', label: 'Inferior' },
];

const SIM_POSITIONS: Array<{ id: SimPosition; label: string }> = [
  { id: 'bottom', label: 'Inferior' },
  { id: 'top', label: 'Superior' },
];

const DENSITIES: Array<{ id: UiDensity; label: string }> = [
  { id: 'comfortable', label: 'Cómoda' },
  { id: 'compact', label: 'Compacta' },
];

function SegmentGroup<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ id: T; label: string }>;
  onChange: (next: T) => void;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-medium text-[var(--text-secondary)]">{label}</p>
      <div className="flex items-center rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] p-0.5">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={`flex-1 rounded-[4px] px-2.5 py-1 text-[11px] font-medium transition-colors ${
              value === option.id
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function PreferencesDialog({
  theme,
  onToggleTheme,
  prefs,
  onUpdatePrefs,
  onResetPrefs,
  onClose,
}: PreferencesDialogProps) {
  return (
    <Modal
      title="Personalizar interfaz"
      subtitle="Ajusta el espacio de trabajo a tu gusto. Se guarda localmente en este dispositivo."
      onClose={onClose}
      width="max-w-lg"
      footer={
        <>
          <SecondaryButton onClick={onResetPrefs}>
            <span className="flex items-center gap-1.5">
              <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
              Restablecer
            </span>
          </SecondaryButton>
          <PrimaryButton onClick={onClose}>Listo</PrimaryButton>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium text-[var(--text-secondary)]">Tema</p>
            <div className="flex items-center rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] p-0.5">
              <button
                type="button"
                onClick={() => {
                  if (theme !== 'dark') {
                    onToggleTheme();
                  }
                }}
                className={`flex-1 rounded-[4px] px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  theme === 'dark'
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                Oscuro
              </button>
              <button
                type="button"
                onClick={() => {
                  if (theme !== 'light') {
                    onToggleTheme();
                  }
                }}
                className={`flex-1 rounded-[4px] px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  theme === 'light'
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                Claro
              </button>
            </div>
          </div>

          <SegmentGroup
            label="Densidad"
            value={prefs.density}
            options={DENSITIES}
            onChange={(density) => onUpdatePrefs({ density })}
          />
        </div>

        <div className="space-y-1.5">
          <p className="text-[11px] font-medium text-[var(--text-secondary)]">Color de acento</p>
          <div className="grid grid-cols-4 gap-2">
            {ACCENTS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onUpdatePrefs({ accent: item.id })}
                className={`flex items-center gap-2 rounded-[var(--radius-sm)] border px-2.5 py-1.5 text-[11px] transition-colors ${
                  prefs.accent === item.id
                    ? 'border-[var(--accent-selection)] bg-[var(--accent-selection-soft)] font-medium text-[var(--text-primary)]'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                }`}
              >
                <span
                  aria-hidden="true"
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: item.swatch }}
                />
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <SegmentGroup
            label="Posición del Dock"
            value={prefs.dockPosition}
            options={DOCK_POSITIONS}
            onChange={(dockPosition) => onUpdatePrefs({ dockPosition })}
          />
          <SegmentGroup
            label="Barra de simulación"
            value={prefs.simPosition}
            options={SIM_POSITIONS}
            onChange={(simPosition) => onUpdatePrefs({ simPosition })}
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-medium text-[var(--text-secondary)]">Ancho del Inspector</span>
            <span className="mono text-[var(--text-muted)]">{prefs.inspectorWidth}px</span>
          </div>
          <input
            type="range"
            min={280}
            max={520}
            step={8}
            value={prefs.inspectorWidth}
            onChange={(event) => onUpdatePrefs({ inspectorWidth: Number(event.target.value) })}
            className="w-full accent-[var(--accent-selection)]"
          />
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-[var(--border-subtle)] pt-3 text-[12px]">
          <label className="flex cursor-pointer items-center gap-2 text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={prefs.showGrid}
              onChange={(event) => onUpdatePrefs({ showGrid: event.target.checked })}
            />
            Mostrar grilla
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={prefs.snapToGrid}
              onChange={(event) => onUpdatePrefs({ snapToGrid: event.target.checked })}
            />
            Ajustar a rejilla
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={prefs.showNotes}
              onChange={(event) => onUpdatePrefs({ showNotes: event.target.checked })}
            />
            Mostrar notas inline
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={prefs.showOfflineBadge}
              onChange={(event) => onUpdatePrefs({ showOfflineBadge: event.target.checked })}
            />
            Mostrar aviso offline
          </label>
        </div>
      </div>
    </Modal>
  );
}
