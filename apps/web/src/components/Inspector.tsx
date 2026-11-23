import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  Check,
  Copy,
  FlaskConical,
  Play,
  Plus,
  Sigma,
  SlidersHorizontal,
  Table2,
  Trash2,
} from 'lucide-react';
import {
  getFormalDefinition,
  runFaBatch,
  runTuringBatch,
} from '../engine/wasmAdapter';
import type {
  ExpectedVerdict,
  FormalDefinition,
  LexoProject,
  TestCase,
  Transition,
  ValidationReport,
} from '../engine/types';
import { isTuring } from '../engine/types';
import {
  addTransition,
  effectiveAlphabet,
  invertEdgeGroup,
  markInitial,
  reassignEdgeGroup,
  removeStates,
  removeTransitions,
  ruleSymbolLabel,
  updateEdgeGroupComment,
  stateLabel,
  toggleAccepting,
  updateState,
  updateTransition,
} from '../model/project';
import type { InspectorTab, Selection } from '../uiTypes';

interface InspectorProps {
  project: LexoProject;
  selection: Selection;
  report: ValidationReport | null;
  validationError: string | null;
  tab: InspectorTab;
  width?: number;
  onResizeWidth?: (nextWidth: number) => void;
  onTabChange: (tab: InspectorTab) => void;
  onCommit: (updater: (project: LexoProject) => LexoProject) => void;
  onSelect: (selection: Selection) => void;
  onFocusState: (stateId: string) => void;
  onClose: () => void;
}

const TABS: Array<{ id: InspectorTab; label: string; icon: typeof Sigma }> = [
  { id: 'properties', label: 'Propiedades', icon: SlidersHorizontal },
  { id: 'delta', label: 'Tabla δ', icon: Table2 },
  { id: 'formal', label: 'Formal', icon: Sigma },
  { id: 'batch', label: 'Lotes', icon: FlaskConical },
];

export function Inspector({
  project,
  selection,
  report,
  validationError,
  tab,
  width = 344,
  onResizeWidth,
  onTabChange,
  onCommit,
  onSelect,
  onFocusState,
  onClose,
}: InspectorProps) {
  const startResize = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!onResizeWidth) {
      return;
    }
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = width;
    const onMove = (moveEvent: PointerEvent) => {
      onResizeWidth(startWidth + (startX - moveEvent.clientX));
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  return (
    <aside
      style={{ '--inspector-width': `${width}px` } as React.CSSProperties}
      className="relative flex h-full w-full shrink-0 flex-col border-l border-[var(--border-subtle)] bg-[var(--bg-surface)] lg:w-[var(--inspector-width)]"
    >
      {onResizeWidth ? (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Redimensionar inspector"
          title="Arrastra para ajustar el ancho"
          onPointerDown={startResize}
          className="absolute inset-y-0 -left-1 z-30 hidden w-2 cursor-col-resize transition-colors hover:bg-[var(--accent-selection)]/40 lg:block"
        />
      ) : null}
      <div className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-[var(--border-subtle)] px-3">
        <div className="flex min-w-0 items-center gap-1 overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => onTabChange(id)}
              title={label}
              className={`flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-sm)] px-2 text-[11px] font-medium transition-colors ${
                tab === id
                  ? 'bg-[var(--accent-selection-soft)] text-[var(--accent-selection)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-elevated)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden xl:inline">{label}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-[var(--radius-sm)] px-2 py-1 text-[11px] text-[var(--text-muted)] hover:bg-[var(--bg-surface-elevated)] hover:text-[var(--text-primary)]"
          title="Ocultar inspector"
        >
          Ocultar
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {tab === 'properties' ? (
          <PropertiesTab
            project={project}
            selection={selection}
            report={report}
            validationError={validationError}
            onCommit={onCommit}
            onSelect={onSelect}
            onFocusState={onFocusState}
          />
        ) : null}
        {tab === 'delta' ? (
          <DeltaTab project={project} onSelect={onSelect} onFocusState={onFocusState} />
        ) : null}
        {tab === 'formal' ? <FormalTab project={project} /> : null}
        {tab === 'batch' ? (
          <BatchTab project={project} onCommit={onCommit} />
        ) : null}
      </div>
    </aside>
  );
}

function SectionTitle({ children, hint }: { children: string; hint?: string }) {
  return (
    <div className="mb-2 flex items-baseline justify-between">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
        {children}
      </h2>
      {hint ? <span className="mono text-[10px] text-[var(--text-muted)]">{hint}</span> : null}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  mono,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  mono?: boolean;
  maxLength?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
        {label}
      </span>
      <input
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={`h-8 w-full rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] px-2 text-[12px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--border-strong)] focus:outline-none ${mono ? 'mono' : ''}`}
      />
    </label>
  );
}

function CsvField({
  label,
  values,
  onCommit,
  placeholder,
}: {
  label: string;
  values: string[];
  onCommit: (values: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState(values.join(', '));

  useEffect(() => {
    setDraft(values.join(', '));
  }, [values]);

  const commit = () => {
    const parsed = draft
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    onCommit([...new Set(parsed)]);
  };

  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
        {label}
      </span>
      <input
        value={draft}
        placeholder={placeholder}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.currentTarget.blur();
          }
        }}
        className="mono h-8 w-full rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] px-2 text-[12px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--border-strong)] focus:outline-none"
      />
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] px-2 py-1.5">
      <span className="text-[12px] text-[var(--text-primary)]">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-3.5 w-3.5 accent-[var(--accent-selection)]"
      />
    </label>
  );
}

function PropertiesTab({
  project,
  selection,
  report,
  validationError,
  onCommit,
  onSelect,
  onFocusState,
}: {
  project: LexoProject;
  selection: Selection;
  report: ValidationReport | null;
  validationError: string | null;
  onCommit: (updater: (project: LexoProject) => LexoProject) => void;
  onSelect: (selection: Selection) => void;
  onFocusState: (stateId: string) => void;
}) {
  if (selection.kind === 'state') {
    const state = project.states.find((candidate) => candidate.id === selection.id);
    if (state) {
      return (
        <div className="space-y-4">
          <SectionTitle hint={state.id}>Estado</SectionTitle>
          <TextField
            label="Etiqueta"
            value={state.label}
            mono
            onChange={(label) => onCommit((current) => updateState(current, state.id, { label }))}
          />
          <div className="grid grid-cols-2 gap-2">
            <Toggle
              label="Inicial"
              checked={state.isInitial}
              onChange={() =>
                onCommit((current) =>
                  state.isInitial
                    ? updateState(current, state.id, { isInitial: false })
                    : markInitial(current, state.id),
                )
              }
            />
            <Toggle
              label="Aceptación"
              checked={state.isAccepting}
              onChange={() => onCommit((current) => toggleAccepting(current, state.id))}
            />
          </div>
          <label className="block">
            <span className="mb-1 block text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
              Nota académica
            </span>
            <textarea
              value={state.comment ?? ''}
              rows={3}
              onChange={(event) =>
                onCommit((current) =>
                  updateState(current, state.id, {
                    comment: event.target.value || undefined,
                  }),
                )
              }
              className="w-full resize-none rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] px-2 py-1.5 text-[12px] text-[var(--text-primary)] focus:border-[var(--border-strong)] focus:outline-none"
            />
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onFocusState(state.id)}
              className="h-7 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] px-2 text-[11px] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
            >
              Centrar en lienzo
            </button>
            <button
              type="button"
              onClick={() => {
                onCommit((current) => removeStates(current, [state.id]));
                onSelect({ kind: 'none' });
              }}
              className="flex h-7 items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--accent-reject)]/40 px-2 text-[11px] text-[var(--accent-reject)] hover:bg-[var(--accent-reject-soft)]"
            >
              <Trash2 aria-hidden="true" className="h-3 w-3" />
              Eliminar
            </button>
          </div>
        </div>
      );
    }
  }

  if (selection.kind === 'edge') {
    const transitions = project.transitions.filter(
      (transition) => transition.from === selection.from && transition.to === selection.to,
    );

    if (transitions.length > 0) {
      return (
        <div className="space-y-4">
          <SectionTitle hint={`${transitions.length} regla(s)`}>
            Transición
          </SectionTitle>
          <div className="mono rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] px-2 py-1.5 text-[12px] text-[var(--text-primary)]">
            {stateLabel(project, selection.from)} → {stateLabel(project, selection.to)}
          </div>

          <div className="space-y-2">
            {transitions.map((transition) => (
              <RuleEditor
                key={transition.id}
                project={project}
                transition={transition}
                onCommit={onCommit}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() =>
              onCommit((current) => addTransition(current, selection.from, selection.to).project)
            }
            className="flex h-7 w-full items-center justify-center gap-1 rounded-[var(--radius-sm)] border border-dashed border-[var(--border-strong)] text-[11px] text-[var(--text-secondary)] hover:border-[var(--accent-selection)] hover:text-[var(--accent-selection)]"
          >
            <Plus aria-hidden="true" className="h-3 w-3" />
            Añadir regla a esta arista
          </button>

          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1">
              <span className="text-[11px] text-[var(--text-secondary)]">Origen</span>
              <select
                value={selection.from}
                onChange={(event) => {
                  const nextFrom = event.target.value;
                  onCommit((current) =>
                    reassignEdgeGroup(current, selection.from, selection.to, nextFrom, selection.to),
                  );
                  onSelect({ kind: 'edge', from: nextFrom, to: selection.to });
                }}
                className="mono h-7 w-full rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] px-1.5 text-[11px] text-[var(--text-primary)] focus:border-[var(--border-strong)] focus:outline-none"
              >
                {project.states.map((state) => (
                  <option key={state.id} value={state.id}>
                    {state.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[11px] text-[var(--text-secondary)]">Destino</span>
              <select
                value={selection.to}
                onChange={(event) => {
                  const nextTo = event.target.value;
                  onCommit((current) =>
                    reassignEdgeGroup(current, selection.from, selection.to, selection.from, nextTo),
                  );
                  onSelect({ kind: 'edge', from: selection.from, to: nextTo });
                }}
                className="mono h-7 w-full rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] px-1.5 text-[11px] text-[var(--text-primary)] focus:border-[var(--border-strong)] focus:outline-none"
              >
                {project.states.map((state) => (
                  <option key={state.id} value={state.id}>
                    {state.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block space-y-1">
            <span className="text-[11px] text-[var(--text-secondary)]">Nota de arista</span>
            <textarea
              rows={2}
              value={transitions.find((item) => item.comment)?.comment ?? ''}
              placeholder="Anotación opcional…"
              onChange={(event) =>
                onCommit((current) =>
                  updateEdgeGroupComment(current, selection.from, selection.to, event.target.value),
                )
              }
              className="w-full resize-none rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] px-2 py-1.5 text-[12px] text-[var(--text-primary)] focus:border-[var(--border-strong)] focus:outline-none"
            />
          </label>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={selection.from === selection.to}
              onClick={() => {
                onCommit((current) => invertEdgeGroup(current, selection.from, selection.to));
                onSelect({ kind: 'edge', from: selection.to, to: selection.from });
              }}
              className="flex h-7 flex-1 items-center justify-center gap-1 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] disabled:opacity-40"
            >
              <ArrowLeftRight aria-hidden="true" className="h-3 w-3" />
              Invertir
            </button>
            <button
              type="button"
              onClick={() => {
                onCommit((current) =>
                  removeTransitions(
                    current,
                    transitions.map((transition) => transition.id),
                  ),
                );
                onSelect({ kind: 'none' });
              }}
              className="flex h-7 flex-1 items-center justify-center gap-1 rounded-[var(--radius-sm)] border border-[var(--accent-reject)]/40 text-[11px] text-[var(--accent-reject)] hover:bg-[var(--accent-reject-soft)]"
            >
              <Trash2 aria-hidden="true" className="h-3 w-3" />
              Eliminar arista
            </button>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="space-y-4">
      <SectionTitle hint={project.machineType}>Proyecto</SectionTitle>

      <div className="space-y-2">
        <CsvField
          label="Alfabeto Σ"
          values={project.config.alphabet}
          onCommit={(alphabet) =>
            onCommit((current) => ({ ...current, config: { ...current.config, alphabet } }))
          }
          placeholder="0, 1"
        />
        {isTuring(project.machineType) ? (
          <>
            <CsvField
              label="Alfabeto de cinta Γ"
              values={project.config.tapeAlphabet}
              onCommit={(tapeAlphabet) =>
                onCommit((current) => ({ ...current, config: { ...current.config, tapeAlphabet } }))
              }
              placeholder="0, 1, X, □"
            />
            <div className="grid grid-cols-2 gap-2">
              <TextField
                label="Blanco B"
                value={project.config.blankSymbol}
                maxLength={1}
                mono
                onChange={(blankSymbol) =>
                  onCommit((current) => ({
                    ...current,
                    config: { ...current.config, blankSymbol: blankSymbol || '□' },
                  }))
                }
              />
              <TextField
                label="Máx. pasos"
                value={String(project.config.defaultMaxSteps)}
                mono
                onChange={(value) => {
                  const parsed = Number.parseInt(value, 10);
                  if (Number.isFinite(parsed) && parsed > 0) {
                    onCommit((current) => ({
                      ...current,
                      config: { ...current.config, defaultMaxSteps: parsed },
                    }));
                  }
                }}
              />
            </div>
          </>
        ) : (
          <TextField
            label="Símbolo ε"
            value={project.config.epsilonSymbol}
            maxLength={1}
            mono
            onChange={(epsilonSymbol) =>
              onCommit((current) => ({
                ...current,
                config: { ...current.config, epsilonSymbol: epsilonSymbol || 'ε' },
              }))
            }
          />
        )}
      </div>

      <div className="space-y-2">
        <SectionTitle>Diagnóstico</SectionTitle>
        {validationError ? (
          <p className="rounded-[var(--radius-sm)] border border-[var(--accent-reject)]/40 bg-[var(--accent-reject-soft)] px-2 py-1.5 text-[11px] text-[var(--accent-reject)]">
            {validationError}
          </p>
        ) : null}

        {report?.errors.length === 0 && report.warnings.length === 0 ? (
          <p className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--accent-accept)]/30 bg-[var(--accent-accept-soft)] px-2 py-1.5 text-[11px] text-[var(--accent-accept)]">
            <Check aria-hidden="true" className="h-3 w-3" />
            Sin errores ni advertencias.
          </p>
        ) : null}

        {report?.errors.map((error, index) => (
          <div
            key={`${error.code}-${index}`}
            className="rounded-[var(--radius-sm)] border border-[var(--accent-reject)]/40 bg-[var(--accent-reject-soft)] px-2 py-1.5"
          >
            <p className="mono text-[10px] font-semibold text-[var(--accent-reject)]">{error.code}</p>
            <p className="mt-0.5 text-[11px] leading-snug text-[var(--text-primary)]">{error.message}</p>
            {error.relatedIds?.[0] ? (
              <button
                type="button"
                onClick={() => {
                  const id = error.relatedIds?.[0];
                  if (!id) {
                    return;
                  }
                  if (project.states.some((state) => state.id === id)) {
                    onSelect({ kind: 'state', id });
                    onFocusState(id);
                  } else {
                    const transition = project.transitions.find((candidate) => candidate.id === id);
                    if (transition) {
                      onSelect({ kind: 'edge', from: transition.from, to: transition.to });
                    }
                  }
                }}
                className="mt-1 text-[10px] text-[var(--accent-selection)] hover:underline"
              >
                Ir al elemento
              </button>
            ) : null}
          </div>
        ))}

        {report?.warnings.map((warning, index) => (
          <div
            key={`${warning.code}-${index}`}
            className="rounded-[var(--radius-sm)] border border-[var(--accent-warning)]/40 bg-[var(--accent-warning-soft)] px-2 py-1.5"
          >
            <p className="mono flex items-center gap-1 text-[10px] font-semibold text-[var(--accent-warning)]">
              <AlertTriangle aria-hidden="true" className="h-3 w-3" />
              {warning.code}
            </p>
            <p className="mt-0.5 text-[11px] leading-snug text-[var(--text-primary)]">{warning.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function RuleEditor({
  project,
  transition,
  onCommit,
}: {
  project: LexoProject;
  transition: Transition;
  onCommit: (updater: (project: LexoProject) => LexoProject) => void;
}) {
  if (transition.rule.kind === 'FA') {
    return (
      <div className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] p-1.5">
        <input
          value={transition.rule.symbol ?? ''}
          maxLength={1}
          placeholder="ε"
          onChange={(event) => {
            const symbol = event.target.value;
            onCommit((current) =>
              updateTransition(current, transition.id, {
                rule: { kind: 'FA', symbol: symbol.length > 0 ? symbol : null },
              }),
            );
          }}
          className="mono h-7 w-14 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-1.5 text-center text-[12px] text-[var(--text-primary)] focus:border-[var(--accent-selection)] focus:outline-none"
        />
        <button
          type="button"
          title="Convertir en ε"
          onClick={() =>
            onCommit((current) =>
              updateTransition(current, transition.id, { rule: { kind: 'FA', symbol: null } }),
            )
          }
          className="mono h-7 w-7 rounded-[var(--radius-sm)] border border-[var(--accent-epsilon)]/40 text-[12px] text-[var(--accent-epsilon)] hover:bg-[var(--accent-epsilon-soft)]"
        >
          ε
        </button>
        <span className="mono flex-1 truncate text-[10px] text-[var(--text-muted)]">
          {ruleSymbolLabel(project, transition.rule)}
        </span>
        <button
          type="button"
          title="Eliminar regla"
          onClick={() =>
            onCommit((current) => removeTransitions(current, [transition.id]))
          }
          className="rounded-[var(--radius-sm)] p-1 text-[var(--text-muted)] hover:bg-[var(--accent-reject-soft)] hover:text-[var(--accent-reject)]"
        >
          <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  const operation = transition.rule.operations[0];
  if (!operation) {
    return null;
  }

  const updateOperation = (patch: Partial<typeof operation>) => {
    onCommit((current) =>
      updateTransition(current, transition.id, {
        rule: {
          kind: 'TM',
          operations: [{ ...operation, ...patch }],
        },
      }),
    );
  };

  return (
    <div className="space-y-1.5 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] p-1.5">
      <div className="flex items-center gap-1">
        <input
          value={operation.read}
          maxLength={1}
          title="Lee"
          onChange={(event) => updateOperation({ read: event.target.value || project.config.blankSymbol })}
          className="mono h-7 w-9 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-center text-[12px] text-[var(--text-primary)] focus:border-[var(--accent-selection)] focus:outline-none"
        />
        <span className="text-[10px] text-[var(--text-muted)]">;</span>
        <input
          value={operation.write}
          maxLength={1}
          title="Escribe"
          onChange={(event) => updateOperation({ write: event.target.value || project.config.blankSymbol })}
          className="mono h-7 w-9 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-center text-[12px] text-[var(--text-primary)] focus:border-[var(--accent-selection)] focus:outline-none"
        />
        <span className="text-[10px] text-[var(--text-muted)]">,</span>
        <select
          value={operation.move}
          title="Movimiento"
          onChange={(event) => updateOperation({ move: event.target.value as 'L' | 'R' | 'S' })}
          className="mono h-7 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-1 text-[11px] text-[var(--text-primary)] focus:border-[var(--accent-selection)] focus:outline-none"
        >
          <option value="L">L</option>
          <option value="R">R</option>
          <option value="S">S</option>
        </select>
        <button
          type="button"
          title="Insertar blanco"
          onClick={() => updateOperation({ read: project.config.blankSymbol, write: project.config.blankSymbol })}
          className="mono h-7 w-7 rounded-[var(--radius-sm)] border border-[var(--accent-epsilon)]/40 text-[11px] text-[var(--accent-epsilon)] hover:bg-[var(--accent-epsilon-soft)]"
        >
          □
        </button>
        <button
          type="button"
          title="Eliminar regla"
          onClick={() => onCommit((current) => removeTransitions(current, [transition.id]))}
          className="ml-auto rounded-[var(--radius-sm)] p-1 text-[var(--text-muted)] hover:bg-[var(--accent-reject-soft)] hover:text-[var(--accent-reject)]"
        >
          <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function DeltaTab({
  project,
  onSelect,
  onFocusState,
}: {
  project: LexoProject;
  onSelect: (selection: Selection) => void;
  onFocusState: (stateId: string) => void;
}) {
  const alphabet = useMemo(() => effectiveAlphabet(project), [project]);

  if (project.transitions.length === 0) {
    return <p className="text-[12px] text-[var(--text-muted)]">Todavía no hay transiciones.</p>;
  }

  if (isTuring(project.machineType)) {
    return (
      <div className="space-y-2">
        <SectionTitle hint={`${project.transitions.length} reglas`}>Función δ</SectionTitle>
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="text-[10px] uppercase tracking-[0.06em] text-[var(--text-muted)]">
              <th className="border-b border-[var(--border-subtle)] pb-1">Desde</th>
              <th className="border-b border-[var(--border-subtle)] pb-1">Lee</th>
              <th className="border-b border-[var(--border-subtle)] pb-1">→</th>
              <th className="border-b border-[var(--border-subtle)] pb-1">Escribe</th>
              <th className="border-b border-[var(--border-subtle)] pb-1">Mueve</th>
            </tr>
          </thead>
          <tbody className="mono text-[11px]">
            {project.transitions.map((transition) => {
              const operation = transition.rule.kind === 'TM' ? transition.rule.operations[0] : undefined;
              return (
                <tr
                  key={transition.id}
                  className="cursor-pointer border-b border-[var(--border-subtle)]/60 hover:bg-[var(--bg-surface-elevated)]"
                  onClick={() => {
                    onSelect({ kind: 'edge', from: transition.from, to: transition.to });
                    onFocusState(transition.from);
                  }}
                >
                  <td className="py-1 text-[var(--text-primary)]">{stateLabel(project, transition.from)}</td>
                  <td className="py-1 text-[var(--text-secondary)]">{operation?.read ?? '—'}</td>
                  <td className="py-1 text-[var(--text-muted)]">{stateLabel(project, transition.to)}</td>
                  <td className="py-1 text-[var(--text-secondary)]">{operation?.write ?? '—'}</td>
                  <td className="py-1 text-[var(--text-secondary)]">{operation?.move ?? '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <SectionTitle hint={`${project.states.length} estados`}>Función δ</SectionTitle>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="text-[10px] uppercase tracking-[0.06em] text-[var(--text-muted)]">
              <th className="border-b border-[var(--border-subtle)] pb-1 pr-2">Estado</th>
              {alphabet.map((symbol) => (
                <th key={symbol} className="mono border-b border-[var(--border-subtle)] pb-1 pr-2 text-center">
                  {symbol}
                </th>
              ))}
              <th className="mono border-b border-[var(--border-subtle)] pb-1 text-center">ε</th>
            </tr>
          </thead>
          <tbody className="mono text-[11px]">
            {project.states.map((state) => (
              <tr key={state.id} className="border-b border-[var(--border-subtle)]/60">
                <td className="py-1 pr-2">
                  <button
                    type="button"
                    onClick={() => {
                      onSelect({ kind: 'state', id: state.id });
                      onFocusState(state.id);
                    }}
                    className={`text-[var(--text-primary)] hover:text-[var(--accent-selection)] ${state.isInitial ? 'font-semibold' : ''}`}
                  >
                    {state.label}
                  </button>
                </td>
                {alphabet.map((symbol) => (
                  <td key={symbol} className="py-1 pr-2 text-center text-[var(--text-secondary)]">
                    {targetsFor(project, state.id, symbol).join(', ') || '—'}
                  </td>
                ))}
                <td className="py-1 text-center text-[var(--accent-epsilon)]">
                  {targetsFor(project, state.id, null).join(', ') || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-[var(--text-muted)]">
        Haz clic en un estado para centrarlo. Las celdas muestran el destino de cada símbolo.
      </p>
    </div>
  );
}

function targetsFor(project: LexoProject, stateId: string, symbol: string | null): string[] {
  return project.transitions
    .filter((transition) => {
      if (transition.from !== stateId || transition.rule.kind !== 'FA') {
        return false;
      }
      return (transition.rule.symbol ?? null) === symbol;
    })
    .map((transition) => stateLabel(project, transition.to));
}

function FormalTab({ project }: { project: LexoProject }) {
  const [formal, setFormal] = useState<FormalDefinition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'text' | 'latex'>('text');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      getFormalDefinition(project)
        .then((definition) => {
          if (!cancelled) {
            setFormal(definition);
            setError(null);
          }
        })
        .catch((caught: unknown) => {
          if (!cancelled) {
            setFormal(null);
            setError(caught instanceof Error ? caught.message : 'No se pudo generar la definición.');
          }
        });
    }, 280);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [project]);

  const content = formal ? (mode === 'text' ? formal.text : formal.latex) : '';

  const copy = async () => {
    if (!content) {
      return;
    }
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  if (error) {
    return (
      <p className="rounded-[var(--radius-sm)] border border-[var(--accent-warning)]/40 bg-[var(--accent-warning-soft)] px-2 py-1.5 text-[11px] text-[var(--accent-warning)]">
        {error}
      </p>
    );
  }

  if (!formal) {
    return <p className="text-[12px] text-[var(--text-muted)]">Generando definición formal…</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <SectionTitle hint={formal.tuple}>Definición</SectionTitle>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMode('text')}
            className={`rounded-[var(--radius-sm)] px-1.5 py-0.5 text-[10px] ${mode === 'text' ? 'bg-[var(--accent-selection-soft)] text-[var(--accent-selection)]' : 'text-[var(--text-muted)]'}`}
          >
            Texto
          </button>
          <button
            type="button"
            onClick={() => setMode('latex')}
            className={`rounded-[var(--radius-sm)] px-1.5 py-0.5 text-[10px] ${mode === 'latex' ? 'bg-[var(--accent-selection-soft)] text-[var(--accent-selection)]' : 'text-[var(--text-muted)]'}`}
          >
            LaTeX
          </button>
          <button
            type="button"
            onClick={() => void copy()}
            title="Copiar"
            className="rounded-[var(--radius-sm)] p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-surface-elevated)] hover:text-[var(--text-primary)]"
          >
            {copied ? (
              <Check aria-hidden="true" className="h-3.5 w-3.5 text-[var(--accent-accept)]" />
            ) : (
              <Copy aria-hidden="true" className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      <pre className="mono max-h-[280px] overflow-auto whitespace-pre-wrap rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] p-2 text-[10px] leading-relaxed text-[var(--text-primary)]">
        {content}
      </pre>

      <div>
        <SectionTitle hint={`${formal.transitions.length} filas`}>Tabla de transición</SectionTitle>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.06em] text-[var(--text-muted)]">
                <th className="border-b border-[var(--border-subtle)] pb-1">δ</th>
                <th className="border-b border-[var(--border-subtle)] pb-1">Etiqueta</th>
                <th className="border-b border-[var(--border-subtle)] pb-1">Destino</th>
              </tr>
            </thead>
            <tbody className="mono text-[10px]">
              {formal.transitions.map((row) => (
                <tr key={row.transitionId} className="border-b border-[var(--border-subtle)]/60">
                  <td className="py-1 text-[var(--text-secondary)]">{row.from}</td>
                  <td className="py-1 text-[var(--text-primary)]">{row.label}</td>
                  <td className="py-1 text-[var(--text-secondary)]">{row.to}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

interface BatchRow {
  input: string;
  expected: ExpectedVerdict;
  actual: string;
  steps: number;
  passed: boolean;
}

function BatchTab({
  project,
  onCommit,
}: {
  project: LexoProject;
  onCommit: (updater: (project: LexoProject) => LexoProject) => void;
}) {
  const [rows, setRows] = useState<BatchRow[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const batchSignature = `${project.id}::${project.machineType}::${project.config.epsilonSymbol}::${project.config.blankSymbol}::${project.states
    .map((s) => `${s.id}:${s.isInitial ? 1 : 0}:${s.isAccepting ? 1 : 0}`)
    .join('|')}::${project.transitions
    .map((t) => `${t.id}:${t.from}->${t.to}:${JSON.stringify(t.rule)}`)
    .join('|')}::${project.testCases
    .map((tc) => `${tc.id}:${tc.input}:${tc.expected}`)
    .join('|')}`;

  useEffect(() => {
    setRows([]);
    setError(null);
  }, [batchSignature]);

  const updateCase = (id: string, patch: Partial<TestCase>) => {
    onCommit((current) => ({
      ...current,
      testCases: current.testCases.map((testCase) =>
        testCase.id === id ? { ...testCase, ...patch } : testCase,
      ),
    }));
  };

  const addCase = () => {
    onCommit((current) => {
      const index = current.testCases.length;
      return {
        ...current,
        testCases: [
          ...current.testCases,
          { id: `tc-${Date.now()}-${index}`, input: '', expected: 'ACCEPT' },
        ],
      };
    });
  };

  const removeCase = (id: string) => {
    onCommit((current) => ({
      ...current,
      testCases: current.testCases.filter((testCase) => testCase.id !== id),
    }));
  };

  const runAll = async () => {
    if (project.testCases.length === 0) {
      return;
    }

    setRunning(true);
    setError(null);

    try {
      const inputs = project.testCases.map((testCase) => testCase.input);
      const results = isTuring(project.machineType)
        ? await runTuringBatch(
            project,
            inputs.map((input) => [input]),
            0,
          )
        : await runFaBatch(project, inputs, 0);

      setRows(
        project.testCases.map((testCase, index) => {
          const result = results[index];
          const accepted = result?.verdict === 'ACCEPTED';
          return {
            input: testCase.input,
            expected: testCase.expected,
            actual: result?.verdict ?? 'REJECTED',
            steps: result?.steps ?? 0,
            passed: testCase.expected === 'ACCEPT' ? accepted : !accepted,
          };
        }),
      );
    } catch (caught) {
      setRows([]);
      setError(caught instanceof Error ? caught.message : 'No se pudo ejecutar el lote.');
    } finally {
      setRunning(false);
    }
  };

  const passed = rows.filter((row) => row.passed).length;

  return (
    <div className="space-y-3">
      <SectionTitle hint={`${project.testCases.length} casos`}>Ejecución por lotes</SectionTitle>

      <div className="space-y-1.5">
        {project.testCases.map((testCase) => (
          <div key={testCase.id} className="flex items-center gap-1">
            <input
              value={testCase.input}
              placeholder="cadena"
              onChange={(event) => updateCase(testCase.id, { input: event.target.value })}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  void runAll();
                }
              }}
              className="mono h-7 min-w-0 flex-1 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] px-1.5 text-[11px] text-[var(--text-primary)] focus:border-[var(--accent-selection)] focus:outline-none"
            />
            <select
              value={testCase.expected}
              onChange={(event) =>
                updateCase(testCase.id, { expected: event.target.value as ExpectedVerdict })
              }
              className="h-7 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] px-1 text-[10px] text-[var(--text-primary)] focus:border-[var(--accent-selection)] focus:outline-none"
            >
              <option value="ACCEPT">ACEPTAR</option>
              <option value="REJECT">RECHAZAR</option>
            </select>
            <button
              type="button"
              title="Eliminar caso"
              onClick={() => removeCase(testCase.id)}
              className="rounded-[var(--radius-sm)] p-1 text-[var(--text-muted)] hover:bg-[var(--accent-reject-soft)] hover:text-[var(--accent-reject)]"
            >
              <Trash2 aria-hidden="true" className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={addCase}
          className="flex h-7 flex-1 items-center justify-center gap-1 rounded-[var(--radius-sm)] border border-dashed border-[var(--border-strong)] text-[11px] text-[var(--text-secondary)] hover:border-[var(--accent-selection)] hover:text-[var(--accent-selection)]"
        >
          <Plus aria-hidden="true" className="h-3 w-3" />
          Caso
        </button>
        <button
          type="button"
          onClick={() => void runAll()}
          disabled={running || project.testCases.length === 0}
          className="flex h-7 flex-1 items-center justify-center gap-1 rounded-[var(--radius-sm)] bg-[var(--accent-selection)] text-[11px] font-medium text-white disabled:opacity-40"
        >
          <Play aria-hidden="true" className="h-3 w-3" />
          {running ? 'Ejecutando…' : 'Ejecutar'}
        </button>
      </div>

      {error ? (
        <p className="rounded-[var(--radius-sm)] border border-[var(--accent-reject)]/40 bg-[var(--accent-reject-soft)] px-2 py-1.5 text-[11px] text-[var(--accent-reject)]">
          {error}
        </p>
      ) : null}

      {rows.length > 0 ? (
        <>
          <p className="mono text-[11px] text-[var(--text-secondary)]">
            {passed}/{rows.length} pasadas
          </p>
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.06em] text-[var(--text-muted)]">
                <th className="border-b border-[var(--border-subtle)] pb-1">Cadena</th>
                <th className="border-b border-[var(--border-subtle)] pb-1">Esperado</th>
                <th className="border-b border-[var(--border-subtle)] pb-1">Real</th>
                <th className="border-b border-[var(--border-subtle)] pb-1">Pasos</th>
              </tr>
            </thead>
            <tbody className="mono text-[10px]">
              {rows.map((row, index) => (
                <tr key={`${row.input}-${index}`} className="border-b border-[var(--border-subtle)]/60">
                  <td className="max-w-[70px] truncate py-1 text-[var(--text-primary)]">
                    {row.input || 'ε'}
                  </td>
                  <td className="py-1 text-[var(--text-secondary)]">
                    {row.expected === 'ACCEPT' ? 'ACEPTAR' : 'RECHAZAR'}
                  </td>
                  <td
                    className={`py-1 font-medium ${row.passed ? 'text-[var(--accent-accept)]' : 'text-[var(--accent-reject)]'}`}
                  >
                    {row.passed ? '✓ ' : '✗ '}
                    {row.actual === 'ACCEPTED' ? 'ACEPTADA' : 'RECHAZADA'}
                  </td>
                  <td className="py-1 text-[var(--text-secondary)]">{row.steps}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}
    </div>
  );
}
