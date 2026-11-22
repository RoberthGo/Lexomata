import type { NfaToDfaResult, MinimizeResult } from '../engine/types';
import { Modal, PrimaryButton, SecondaryButton } from './Modal';

export type TransformationReport =
  | {
      kind: 'nfaToDfa';
      result: NfaToDfaResult;
      sourceLabels: Record<string, string>;
    }
  | {
      kind: 'minimize';
      result: MinimizeResult;
      sourceLabels: Record<string, string>;
    };

interface TransformationDialogProps {
  report: TransformationReport;
  onUndo: () => void;
  onClose: () => void;
}

function labelFor(labels: Record<string, string>, id: string): string {
  return labels[id] ?? id;
}

export function TransformationDialog({
  report,
  onUndo,
  onClose,
}: TransformationDialogProps) {
  const title =
    report.kind === 'nfaToDfa'
      ? 'Conversión AFN → AFD (Subconjuntos)'
      : 'Minimización de AFD (Hopcroft)';

  const subtitle =
    report.kind === 'nfaToDfa'
      ? `Autómata convertido a ${report.result.dfa.states.length} estados deterministas.`
      : `Autómata reducido a ${report.result.minimized.states.length} clases de equivalencia.`;

  return (
    <Modal
      title={title}
      subtitle={subtitle}
      onClose={onClose}
      width="max-w-xl"
      footer={
        <>
          <SecondaryButton
            onClick={() => {
              onUndo();
              onClose();
            }}
          >
            Deshacer cambio
          </SecondaryButton>
          <PrimaryButton onClick={onClose}>Aceptar</PrimaryButton>
        </>
      }
    >
      {report.kind === 'nfaToDfa' ? (
        <div className="space-y-2">
          <p className="text-[11px] text-[var(--text-secondary)]">
            Cada estado del AFD resultante corresponde a un subconjunto de estados del AFN original:
          </p>
          <div className="max-h-72 overflow-auto rounded-[var(--radius-sm)] border border-[var(--border-subtle)]">
            <table className="w-full text-left text-[11px]">
              <thead className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] text-[var(--text-muted)]">
                <tr>
                  <th className="px-2.5 py-1.5 font-medium">Estado AFD</th>
                  <th className="px-2.5 py-1.5 font-medium">Subconjunto AFN</th>
                </tr>
              </thead>
              <tbody>
                {report.result.dfa.states.map((state) => {
                  const subset = report.result.subsetMap[state.id] ?? [];
                  return (
                    <tr
                      key={state.id}
                      className="border-b border-[var(--border-subtle)]/60 last:border-0"
                    >
                      <td className="mono px-2.5 py-1.5 font-medium text-[var(--text-primary)]">
                        {state.label}
                        {state.isInitial ? ' (ini)' : ''}
                        {state.isAccepting ? ' (acep)' : ''}
                      </td>
                      <td className="mono px-2.5 py-1.5 text-[var(--text-secondary)]">
                        {subset.length > 0
                          ? `{${subset.map((id) => labelFor(report.sourceLabels, id)).join(', ')}}`
                          : '∅'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <p className="text-[11px] text-[var(--text-secondary)]">
              Particiones equivalentes fusionadas:
            </p>
            <div className="max-h-60 space-y-1 overflow-auto rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] p-2">
              {report.result.equivalenceClasses.map((group, index) => (
                <div
                  key={index}
                  className="mono flex items-center justify-between rounded px-2 py-1 text-[11px] odd:bg-[var(--bg-surface)]"
                >
                  <span className="text-[var(--text-muted)]">Clase {index + 1}</span>
                  <span className="text-[var(--text-primary)]">
                    {`{${group.map((id) => labelFor(report.sourceLabels, id)).join(', ')}}`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {report.result.removedUnreachable.length > 0 ? (
            <p className="mono text-[11px] text-[var(--text-muted)]">
              Inalcanzables eliminados:{' '}
              {report.result.removedUnreachable
                .map((id) => labelFor(report.sourceLabels, id))
                .join(', ')}
            </p>
          ) : null}
        </div>
      )}
    </Modal>
  );
}
