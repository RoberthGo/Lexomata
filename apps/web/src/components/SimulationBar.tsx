import { useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Pause,
  Play,
  RotateCcw,
  Zap,
} from 'lucide-react';
import type { LexoProject, TmStatus } from '../engine/types';
import { isTuring } from '../engine/types';
import type { FaSimulation } from '../state/useFaSimulation';
import type { TuringSimulation } from '../state/useTuringSimulation';

const SPEED_OPTIONS = [
  { label: '0.5×', value: 900 },
  { label: '1×', value: 650 },
  { label: '2×', value: 420 },
  { label: '5×', value: 220 },
];

interface SimulationProps {
  project: LexoProject;
  fa: FaSimulation;
  tm: TuringSimulation;
  collapsed?: boolean;
  position?: 'top' | 'bottom';
  onToggleCollapse?: () => void;
}

export function SimulationBar({
  project,
  fa,
  tm,
  collapsed = false,
  position = 'bottom',
  onToggleCollapse,
}: SimulationProps) {
  if (collapsed) {
    return (
      <section
        className={`flex h-9 shrink-0 items-center justify-between bg-[var(--bg-surface)] px-3 ${
          position === 'top'
            ? 'border-b border-[var(--border-subtle)]'
            : 'border-t border-[var(--border-subtle)]'
        }`}
      >
        <span className="text-[11px] font-medium text-[var(--text-secondary)]">
          Simulación (oculta)
        </span>
        {onToggleCollapse ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="flex items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] px-2 py-0.5 text-[11px] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
          >
            {position === 'top' ? (
              <ChevronDown aria-hidden="true" className="h-3.5 w-3.5" />
            ) : (
              <ChevronUp aria-hidden="true" className="h-3.5 w-3.5" />
            )}
            Mostrar simulación
          </button>
        ) : null}
      </section>
    );
  }

  return (
    <div
      className={`relative ${
        onToggleCollapse ? '[&>section>div:first-child]:sm:pr-9' : ''
      } ${
        position === 'top'
          ? 'border-b border-[var(--border-subtle)] [&>section]:border-t-0'
          : ''
      }`}
    >
      {onToggleCollapse ? (
        <button
          type="button"
          onClick={onToggleCollapse}
          title="Ocultar barra de simulación"
          aria-label="Ocultar barra de simulación"
          className="absolute right-2 top-1.5 z-10 hidden h-6 items-center gap-1 rounded-[var(--radius-sm)] px-1.5 text-[10px] text-[var(--text-muted)] hover:bg-[var(--bg-surface-elevated)] hover:text-[var(--text-primary)] sm:flex"
        >
          {position === 'top' ? (
            <ChevronUp aria-hidden="true" className="h-3 w-3" />
          ) : (
            <ChevronDown aria-hidden="true" className="h-3 w-3" />
          )}
        </button>
      ) : null}
      {isTuring(project.machineType) ? (
        <TuringSimulationBar project={project} simulation={tm} />
      ) : (
        <FaSimulationBar project={project} simulation={fa} />
      )}
    </div>
  );
}

function ControlButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-35"
    >
      {children}
    </button>
  );
}

function SpeedSelect({ speed, onChange }: { speed: number; onChange: (speed: number) => void }) {
  return (
    <div className="flex items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] p-0.5">
      {SPEED_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`rounded-[4px] px-1.5 py-0.5 text-[10px] transition-colors ${
            speed === option.value
              ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
              : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
          }`}
        >
          {option.label}
        </button>
      ))}
      <label className="flex items-center gap-0.5 border-l border-[var(--border-subtle)] pl-1.5 pr-1 text-[10px] text-[var(--text-muted)]">
        <input
          type="number"
          min={50}
          max={5000}
          step={50}
          aria-label="Velocidad en milisegundos"
          value={speed}
          onChange={(event) => {
            const parsed = Number(event.target.value);
            if (Number.isFinite(parsed)) {
              onChange(Math.max(50, Math.min(5000, Math.round(parsed))));
            }
          }}
          className="mono w-12 bg-transparent text-right text-[10px] text-[var(--text-primary)] focus:outline-none"
        />
        <span>ms</span>
      </label>
    </div>
  );
}

function VerdictPill({
  verdict,
  kind,
}: {
  verdict: string | null;
  kind: 'fa' | 'tm';
}) {
  if (!verdict) {
    return (
      <span className="inline-flex items-center gap-1 rounded-[var(--radius-pill)] border border-[var(--border-subtle)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-muted)]">
        En espera
      </span>
    );
  }

  const style =
    verdict === 'ACCEPTED'
      ? 'border-[var(--accent-accept)]/40 bg-[var(--accent-accept-soft)] text-[var(--accent-accept)]'
      : verdict === 'REJECTED'
        ? 'border-[var(--accent-reject)]/40 bg-[var(--accent-reject-soft)] text-[var(--accent-reject)]'
        : verdict === 'STEP_LIMIT'
          ? 'border-[var(--accent-warning)]/40 bg-[var(--accent-warning-soft)] text-[var(--accent-warning)]'
          : 'border-[var(--accent-active)]/40 bg-[var(--accent-active-soft)] text-[var(--accent-active)]';

  const label =
    verdict === 'ACCEPTED'
      ? 'ACEPTADA'
      : verdict === 'REJECTED'
        ? 'RECHAZADA'
        : verdict === 'STEP_LIMIT'
          ? 'LÍMITE ALCANZADO'
          : 'EN EJECUCIÓN';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-[var(--radius-pill)] border px-2 py-0.5 text-[10px] font-semibold tracking-[0.04em] ${style}`}
      data-kind={kind}
    >
      {label}
    </span>
  );
}

function FaSimulationBar({
  project,
  simulation,
}: {
  project: LexoProject;
  simulation: FaSimulation;
}) {
  const { trace, stepIndex } = simulation;
  const snapshot = trace?.steps[stepIndex];
  const characters = [...simulation.input];
  const consumed = snapshot?.inputIndex ?? 0;
  const activeIds =
    snapshot?.activeStateIds ??
    project.states.filter((state) => state.isInitial).map((state) => state.id);
  const activeNames = (snapshot?.activeStateIds ?? [])
    .map((id) => project.states.find((state) => state.id === id)?.label ?? id)
    .join(', ');
  const activeSet = new Set(activeIds);
  const availableTransitions = project.transitions
    .filter((transition) => activeSet.has(transition.from))
    .map((transition) => {
      const symbol =
        transition.rule.kind === 'FA'
          ? (transition.rule.symbol ?? project.config.epsilonSymbol)
          : '';
      const target = project.states.find((state) => state.id === transition.to)?.label ?? transition.to;
      return `${symbol}→${target}`;
    });

  return (
    <section className="shrink-0 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)]">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
          Simulación
        </span>
        <div className="flex h-7 min-w-[150px] flex-1 items-center rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] px-2 sm:max-w-[260px]">
          <input
            value={simulation.input}
            placeholder="cadena de entrada"
            onChange={(event) => simulation.setInput(event.target.value)}
            className="mono h-full min-w-0 flex-1 bg-transparent text-[12px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
          />
          <button
            type="button"
            title="Cadena vacía (ε)"
            onClick={() => simulation.setInput('')}
            className="mono ml-1 rounded px-1 text-[11px] text-[var(--accent-epsilon)] hover:bg-[var(--accent-epsilon-soft)]"
          >
            ε
          </button>
        </div>

        <div className="flex items-center gap-1">
          <ControlButton label="Reiniciar" onClick={simulation.reset}>
            <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
          </ControlButton>
          <ControlButton
            label="Paso atrás"
            onClick={simulation.stepBack}
            disabled={!trace || stepIndex === 0}
          >
            <ChevronLeft aria-hidden="true" className="h-3.5 w-3.5" />
          </ControlButton>
          <ControlButton label={simulation.playing ? 'Pausa' : 'Reproducir'} onClick={simulation.togglePlay}>
            {simulation.playing ? (
              <Pause aria-hidden="true" className="h-3.5 w-3.5" />
            ) : (
              <Play aria-hidden="true" className="h-3.5 w-3.5" />
            )}
          </ControlButton>
          <ControlButton
            label="Paso adelante"
            onClick={() => void simulation.stepForward()}
            disabled={simulation.busy}
          >
            <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
          </ControlButton>
          <ControlButton label="Ejecutar rápido" onClick={() => void simulation.fastRun()}>
            <Zap aria-hidden="true" className="h-3.5 w-3.5" />
          </ControlButton>
        </div>

        <SpeedSelect speed={simulation.speed} onChange={simulation.setSpeed} />

        <div className="ml-auto flex items-center gap-2">
          <span className="mono text-[10px] text-[var(--text-muted)]">
            {stepIndex}/{trace ? trace.steps.length - 1 : 0} pasos
          </span>
          <VerdictPill verdict={simulation.verdict} kind="fa" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 px-3 pb-2">
        <div className="flex min-h-[34px] flex-wrap items-center gap-1">
          {characters.length === 0 ? (
            <span className="mono rounded-[var(--radius-sm)] border border-dashed border-[var(--border-strong)] px-2 py-1 text-[11px] text-[var(--accent-epsilon)]">
              ε cadena vacía
            </span>
          ) : (
            characters.map((character, index) => (
              <span
                key={`${character}-${index}`}
                className={`mono flex h-7 min-w-7 items-center justify-center rounded-[var(--radius-sm)] border px-1 text-[12px] transition-colors ${
                  index === consumed && trace
                    ? 'border-[var(--accent-active)] bg-[var(--accent-active-soft)] text-[var(--accent-active)]'
                    : index < consumed
                      ? 'border-transparent bg-[var(--bg-surface-elevated)] text-[var(--text-muted)] line-through decoration-[var(--text-muted)]/50'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] text-[var(--text-primary)]'
                }`}
              >
                {character}
              </span>
            ))
          )}
        </div>

        {activeNames ? (
          <span className="mono truncate text-[10px] text-[var(--text-secondary)]">
            Activos: <span className="text-[var(--accent-active)]">{activeNames}</span>
            {snapshot && snapshot.activeStateIds.length > 1 ? ` · ${snapshot.activeStateIds.length} ramas` : ''}
            {snapshot?.branchesTruncated ? ' · traza truncada' : ''}
          </span>
        ) : null}

        {availableTransitions.length > 0 ? (
          <span
            title={availableTransitions.join(', ')}
            className="mono truncate rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] px-1.5 py-0.5 text-[10px] text-[var(--text-muted)]"
          >
            Salientes: {availableTransitions.slice(0, 4).join(', ')}
            {availableTransitions.length > 4 ? ` +${availableTransitions.length - 4}` : ''}
          </span>
        ) : null}

        {simulation.error ? (
          <span className="text-[10px] text-[var(--accent-reject)]">{simulation.error}</span>
        ) : null}
      </div>
    </section>
  );
}

function TuringSimulationBar({
  project,
  simulation,
}: {
  project: LexoProject;
  simulation: TuringSimulation;
}) {
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const snapshot = simulation.snapshot;
  const head = snapshot?.tape.headIndex ?? 0;
  const cells = snapshot?.tape.cells ?? {};
  const inputLength = simulation.input.length;

  const min = Math.min(head - 9, snapshot ? snapshot.tape.minIndex - 2 : 0, -1);
  const max = Math.max(head + 9, snapshot ? snapshot.tape.maxIndex + 2 : 0, inputLength + 1);
  const indices: number[] = [];
  for (let index = min; index <= max; index += 1) {
    indices.push(index);
  }

  const commitEdit = () => {
    if (editing === null) {
      return;
    }
    simulation.setTapeCell(editing, draft.slice(0, 1));
    setEditing(null);
    setDraft('');
  };

  return (
    <section className="shrink-0 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)]">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
          Cinta
        </span>
        <div className="flex h-7 min-w-[150px] flex-1 items-center rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] px-2 sm:max-w-[230px]">
          <input
            value={simulation.input}
            placeholder="entrada inicial"
            onChange={(event) => simulation.setInput(event.target.value)}
            className="mono h-full min-w-0 flex-1 bg-transparent text-[12px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1">
          <ControlButton label="Reiniciar cinta" onClick={() => void simulation.reset()}>
            <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
          </ControlButton>
          <ControlButton
            label="Paso atrás"
            onClick={() => void simulation.stepBack()}
            disabled={simulation.busy || (snapshot?.stepIndex ?? 0) === 0}
          >
            <ChevronLeft aria-hidden="true" className="h-3.5 w-3.5" />
          </ControlButton>
          <ControlButton label={simulation.playing ? 'Pausa' : 'Reproducir'} onClick={simulation.togglePlay}>
            {simulation.playing ? (
              <Pause aria-hidden="true" className="h-3.5 w-3.5" />
            ) : (
              <Play aria-hidden="true" className="h-3.5 w-3.5" />
            )}
          </ControlButton>
          <ControlButton
            label="Paso adelante"
            onClick={() => void simulation.stepForward()}
            disabled={simulation.busy || snapshot?.status === 'ACCEPTED' || snapshot?.status === 'REJECTED'}
          >
            <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
          </ControlButton>
          <ControlButton label="Ejecutar rápido" onClick={() => void simulation.fastRun()}>
            <Zap aria-hidden="true" className="h-3.5 w-3.5" />
          </ControlButton>
        </div>

        <SpeedSelect speed={simulation.speed} onChange={simulation.setSpeed} />

        <div className="ml-auto flex items-center gap-2">
          <span className="mono text-[10px] text-[var(--text-muted)]">
            {snapshot?.stepIndex ?? 0} pasos
          </span>
          <VerdictPill verdict={snapshot ? snapshot.status : null} kind="tm" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 px-3 pb-2">
        <div className="flex min-h-[38px] flex-wrap items-center gap-1">
          <span className="mono text-[10px] text-[var(--text-muted)]">…</span>
          {indices.map((index) => {
            const symbol = cells[String(index)] ?? project.config.blankSymbol;
            const isHead = index === head;
            return (
              <div key={index} className="flex flex-col items-center">
                <button
                  type="button"
                  title={`Celda ${index} · doble clic para editar`}
                  onClick={() => {
                    if (isHead) {
                      setEditing(index);
                      setDraft(symbol === project.config.blankSymbol ? '' : symbol);
                    }
                  }}
                  onDoubleClick={() => {
                    setEditing(index);
                    setDraft(symbol === project.config.blankSymbol ? '' : symbol);
                  }}
                  className={`mono relative flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] border text-[13px] transition-colors ${
                    isHead
                      ? 'border-2 border-[var(--accent-active)] bg-[var(--accent-active-soft)] text-[var(--accent-active)]'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  {editing === index ? (
                    <input
                      autoFocus
                      value={draft}
                      maxLength={1}
                      onChange={(event) => setDraft(event.target.value)}
                      onBlur={commitEdit}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          commitEdit();
                        }
                        if (event.key === 'Escape') {
                          setEditing(null);
                          setDraft('');
                        }
                      }}
                      className="mono h-full w-full bg-transparent text-center text-[13px] text-[var(--text-primary)] focus:outline-none"
                    />
                  ) : symbol === project.config.blankSymbol ? (
                    <span className="text-[var(--accent-epsilon)]">{project.config.blankSymbol}</span>
                  ) : (
                    symbol
                  )}
                </button>
                <span className="mono mt-0.5 text-[8px] text-[var(--text-muted)]">{index}</span>
              </div>
            );
          })}
          <span className="mono text-[10px] text-[var(--text-muted)]">…</span>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2 text-[10px] text-[var(--text-secondary)]">
          <span className="mono rounded-[var(--radius-sm)] border border-[var(--border-subtle)] px-1.5 py-0.5">
            Estado:{' '}
            <span className="text-[var(--accent-active)]">
              {snapshot
                ? project.states.find((state) => state.id === snapshot.currentStateId)?.label ??
                  snapshot.currentStateId
                : '—'}
            </span>
          </span>
          <span className="mono rounded-[var(--radius-sm)] border border-[var(--border-subtle)] px-1.5 py-0.5">
            Cabezal: {head}
          </span>
          {simulation.lastRuleLabel ? (
            <span className="mono rounded-[var(--radius-sm)] border border-[var(--border-subtle)] px-1.5 py-0.5">
              Última: {simulation.lastRuleLabel}
            </span>
          ) : null}
          {simulation.error ? (
            <span className="text-[var(--accent-reject)]">{simulation.error}</span>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export type { TmStatus };
