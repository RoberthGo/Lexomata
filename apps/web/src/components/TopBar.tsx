import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Cloud,
  Code2,
  Download,
  FileJson,
  FilePlus2,
  FolderOpen,
  Image,
  Layers,
  Loader2,
  Minimize2,
  Moon,
  Network,
  PanelRight,
  Redo2,
  Save,
  SlidersHorizontal,
  Sun,
  Undo2,
  Wand2,
} from 'lucide-react';
import type { ExampleEntry, LexoProject, ValidationReport } from '../engine/types';
import { isFiniteAutomaton, isTuring, machineTypeLabel } from '../engine/types';
import type { Theme } from '../state/useTheme';
import type { LayoutStrategy } from '../utils/layout';

interface TopBarProps {
  project: LexoProject;
  canUndo: boolean;
  canRedo: boolean;
  theme: Theme;
  validation: ValidationReport | null;
  validationError: string | null;
  inspectorOpen: boolean;
  examples: ExampleEntry[];
  onRename: (name: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onToggleTheme: () => void;
  onToggleInspector: () => void;
  onOpenDrive?: () => void;
  onOpenPrefs?: () => void;
  onNew: () => void;
  onOpenLexo: () => void;
  onOpenJff: () => void;
  onSaveLexo: () => void;
  onExportJff: () => void;
  onOpenExport: () => void;
  onLoadExample: (entry: ExampleEntry) => void;
  onRequestMachineFamily: (family: 'FA' | 'TM') => void;
  onToggleFaStrict: () => void;
  onConvertNfa: () => void;
  onMinimizeDfa: () => void;
  onLayout: (strategy: LayoutStrategy) => void;
}

const FAMILY_OPTIONS: Array<{ value: 'FA' | 'TM'; label: string }> = [
  { value: 'FA', label: 'AF' },
  { value: 'TM', label: 'MT' },
];

export function TopBar({
  project,
  canUndo,
  canRedo,
  theme,
  validation,
  validationError,
  inspectorOpen,
  examples,
  onRename,
  onUndo,
  onRedo,
  onToggleTheme,
  onToggleInspector,
  onOpenDrive,
  onOpenPrefs,
  onNew,
  onOpenLexo,
  onOpenJff,
  onSaveLexo,
  onExportJff,
  onOpenExport,
  onLoadExample,
  onRequestMachineFamily,
  onToggleFaStrict,
  onConvertNfa,
  onMinimizeDfa,
  onLayout,
}: TopBarProps) {
  const [openMenu, setOpenMenu] = useState<'file' | 'tools' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };
    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  const run = (action: () => void) => {
    setOpenMenu(null);
    action();
  };

  const isFa = isFiniteAutomaton(project.machineType);
  const isStrictDfa = project.machineType === 'DFA';
  const isNfa = project.machineType === 'NFA' || project.machineType === 'NFA_EPSILON';
  const activeFamily: 'FA' | 'TM' = isTuring(project.machineType) ? 'TM' : 'FA';

  return (
    <header
      ref={containerRef}
      className="relative z-30 flex h-12 shrink-0 items-center gap-2 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3"
    >
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--accent-selection)] text-[11px] font-bold text-white">
          L
        </div>
        <span className="hidden text-[13px] font-semibold tracking-[-0.01em] text-[var(--text-primary)] sm:inline">
          Lexomata
        </span>
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpenMenu((current) => (current === 'file' ? null : 'file'))}
          className={`flex h-7 items-center gap-1 rounded-[var(--radius-sm)] px-2 text-[12px] transition-colors ${
            openMenu === 'file'
              ? 'bg-[var(--bg-surface-elevated)] text-[var(--text-primary)]'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-elevated)] hover:text-[var(--text-primary)]'
          }`}
        >
          Archivo
          <ChevronDown aria-hidden="true" className="h-3 w-3" />
        </button>

        {openMenu === 'file' ? (
          <div className="surface-panel absolute left-0 top-8 w-64 p-1">
            <MenuItem icon={FilePlus2} label="Nuevo proyecto" shortcut="Ctrl N" onClick={() => run(onNew)} />
            <MenuItem icon={FolderOpen} label="Abrir .lexo" onClick={() => run(onOpenLexo)} />
            <MenuItem icon={FolderOpen} label="Importar .jff (JFLAP)" onClick={() => run(onOpenJff)} />
            <MenuItem icon={Save} label="Guardar .lexo" shortcut="Ctrl S" onClick={() => run(onSaveLexo)} />
            <MenuItem icon={Download} label="Exportar .jff" onClick={() => run(onExportJff)} />
            <div className="my-1 border-t border-[var(--border-subtle)]" />
            <MenuItem icon={Image} label="Exportar SVG / PNG / TikZ" onClick={() => run(onOpenExport)} />
            <div className="my-1 border-t border-[var(--border-subtle)]" />
            <p className="px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
              Ejemplos integrados
            </p>
            <div className="max-h-64 overflow-y-auto">
              {examples.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => run(() => onLoadExample(entry))}
                  className="flex w-full items-center justify-between gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-left text-[11px] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-elevated)] hover:text-[var(--text-primary)]"
                >
                  <span className="truncate">{entry.project.name}</span>
                  <span className="mono shrink-0 text-[9px] uppercase text-[var(--text-muted)]">
                    {machineTypeLabel(entry.project.machineType)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpenMenu((current) => (current === 'tools' ? null : 'tools'))}
          className={`flex h-7 items-center gap-1 rounded-[var(--radius-sm)] px-2 text-[12px] transition-colors ${
            openMenu === 'tools'
              ? 'bg-[var(--bg-surface-elevated)] text-[var(--text-primary)]'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-elevated)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Wand2 aria-hidden="true" className="h-3.5 w-3.5" />
          Herramientas
          <ChevronDown aria-hidden="true" className="h-3 w-3" />
        </button>

        {openMenu === 'tools' ? (
          <div className="surface-panel absolute left-0 top-8 w-64 p-1">
            <MenuItem
              icon={Network}
              label="AFN → AFD"
              hint={isNfa ? undefined : 'Desactiva AFD estricto'}
              disabled={!isNfa}
              onClick={() => run(onConvertNfa)}
            />
            <MenuItem
              icon={Minimize2}
              label="Minimizar AFD"
              hint={isStrictDfa ? undefined : 'Activa AFD estricto'}
              disabled={!isStrictDfa}
              onClick={() => run(onMinimizeDfa)}
            />
            <div className="my-1 border-t border-[var(--border-subtle)]" />
            <MenuItem icon={Layers} label="Auto-layout jerárquico" onClick={() => run(() => onLayout('layered'))} />
            <MenuItem icon={Network} label="Auto-layout circular" onClick={() => run(() => onLayout('circular'))} />
          </div>
        ) : null}
      </div>

      <div className="mx-1 h-5 w-px bg-[var(--border-subtle)]" />

      <ProjectName name={project.name} onRename={onRename} />

      <div className="ml-auto flex items-center gap-1.5">
        <div className="flex items-center rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] p-0.5">
          {FAMILY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onRequestMachineFamily(option.value)}
              className={`rounded-[4px] px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                activeFamily === option.value
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {isFa ? (
          <button
            type="button"
            aria-pressed={isStrictDfa}
            onClick={onToggleFaStrict}
            title="Modo estricto AFD: valida 1 transición por símbolo y sin ε. Desactívalo para AFN."
            className={`h-6 rounded-[var(--radius-sm)] border px-1.5 text-[10px] font-medium transition-colors ${
              isStrictDfa
                ? 'border-[var(--accent-selection)]/50 bg-[var(--accent-selection-soft)] text-[var(--accent-selection)]'
                : 'border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            AFD estricto
          </button>
        ) : null}

        <ValidationBadge
          validation={validation}
          error={validationError}
          onClick={() => {
            onToggleInspector();
          }}
          inspectorOpen={inspectorOpen}
        />

        <div className="flex items-center gap-0.5">
          <IconButton label="Deshacer (Ctrl+Z)" onClick={onUndo} disabled={!canUndo}>
            <Undo2 aria-hidden="true" className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton label="Rehacer (Ctrl+Shift+Z)" onClick={onRedo} disabled={!canRedo}>
            <Redo2 aria-hidden="true" className="h-3.5 w-3.5" />
          </IconButton>
        </div>

        {onOpenDrive ? (
          <IconButton label="Google Drive (opcional)" onClick={onOpenDrive}>
            <Cloud aria-hidden="true" className="h-3.5 w-3.5" />
          </IconButton>
        ) : null}

        {onOpenPrefs ? (
          <IconButton label="Personalizar interfaz" onClick={onOpenPrefs}>
            <SlidersHorizontal aria-hidden="true" className="h-3.5 w-3.5" />
          </IconButton>
        ) : null}

        <IconButton label="Cambiar tema" onClick={onToggleTheme}>
          {theme === 'dark' ? (
            <Sun aria-hidden="true" className="h-3.5 w-3.5" />
          ) : (
            <Moon aria-hidden="true" className="h-3.5 w-3.5" />
          )}
        </IconButton>

        <IconButton label="Inspector" onClick={onToggleInspector} active={inspectorOpen}>
          <PanelRight aria-hidden="true" className="h-3.5 w-3.5" />
        </IconButton>

        <button
          type="button"
          onClick={onOpenExport}
          className="hidden h-7 items-center gap-1 rounded-[var(--radius-sm)] bg-[var(--accent-selection)] px-2 text-[11px] font-medium text-white hover:opacity-90 sm:flex"
        >
          <Code2 aria-hidden="true" className="h-3 w-3" />
          Exportar
        </button>
      </div>
    </header>
  );
}

function ProjectName({ name, onRename }: { name: string; onRename: (name: string) => void }) {
  const [draft, setDraft] = useState(name);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setDraft(name);
  }, [name]);

  const commit = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== name) {
      onRename(trimmed);
    } else {
      setDraft(name);
    }
  };

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        title="Renombrar proyecto"
        className="max-w-[160px] truncate rounded-[var(--radius-sm)] px-1.5 py-0.5 text-[12px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] lg:max-w-[260px]"
      >
        {name}
      </button>
    );
  }

  return (
    <input
      autoFocus
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          commit();
        }
        if (event.key === 'Escape') {
          setDraft(name);
          setEditing(false);
        }
      }}
      className="h-7 w-[180px] rounded-[var(--radius-sm)] border border-[var(--accent-selection)] bg-[var(--bg-surface-elevated)] px-1.5 text-[12px] font-medium text-[var(--text-primary)] focus:outline-none lg:w-[260px]"
    />
  );
}

function ValidationBadge({
  validation,
  error,
  onClick,
  inspectorOpen,
}: {
  validation: ValidationReport | null;
  error: string | null;
  onClick: () => void;
  inspectorOpen: boolean;
}) {
  if (error) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex h-7 items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--accent-reject)]/40 bg-[var(--accent-reject-soft)] px-1.5 text-[10px] text-[var(--accent-reject)]"
      >
        <AlertTriangle aria-hidden="true" className="h-3 w-3" />
        Error
      </button>
    );
  }

  if (!validation) {
    return (
      <span className="flex h-7 items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] px-1.5 text-[10px] text-[var(--text-muted)]">
        <Loader2 aria-hidden="true" className="h-3 w-3 animate-spin" />
        Validando
      </span>
    );
  }

  const errors = validation.errors.length;
  const warnings = validation.warnings.length;

  return (
    <button
      type="button"
      onClick={onClick}
      title={inspectorOpen ? 'Ver diagnóstico' : 'Abrir inspector'}
      className={`flex h-7 items-center gap-1 rounded-[var(--radius-sm)] border px-1.5 text-[10px] ${
        errors > 0
          ? 'border-[var(--accent-reject)]/40 bg-[var(--accent-reject-soft)] text-[var(--accent-reject)]'
          : warnings > 0
            ? 'border-[var(--accent-warning)]/40 bg-[var(--accent-warning-soft)] text-[var(--accent-warning)]'
            : 'border-[var(--accent-accept)]/40 bg-[var(--accent-accept-soft)] text-[var(--accent-accept)]'
      }`}
    >
      {errors > 0 || warnings > 0 ? (
        <AlertTriangle aria-hidden="true" className="h-3 w-3" />
      ) : (
        <CheckCircle2 aria-hidden="true" className="h-3 w-3" />
      )}
      {errors > 0 ? `${errors} error${errors > 1 ? 'es' : ''}` : warnings > 0 ? `${warnings} aviso${warnings > 1 ? 's' : ''}` : 'Válido'}
    </button>
  );
}

function MenuItem({
  icon: Icon,
  label,
  shortcut,
  hint,
  disabled,
  onClick,
}: {
  icon: typeof FileJson;
  label: string;
  shortcut?: string;
  hint?: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-left text-[11px] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-elevated)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
      <span className="flex-1">{label}</span>
      {hint ? <span className="text-[9px] text-[var(--text-muted)]">{hint}</span> : null}
      {shortcut ? (
        <span className="mono rounded border border-[var(--border-subtle)] px-1 text-[8px] text-[var(--text-muted)]">
          {shortcut}
        </span>
      ) : null}
    </button>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
        active
          ? 'bg-[var(--accent-selection-soft)] text-[var(--accent-selection)]'
          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-elevated)] hover:text-[var(--text-primary)]'
      }`}
    >
      {children}
    </button>
  );
}
