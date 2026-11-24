import { useCallback, useEffect, useState } from 'react';
import { BookmarkPlus, History, RotateCcw, Trash2 } from 'lucide-react';
import type { LexoProject } from '../engine/types';
import {
  deleteProjectSnapshot,
  listProjectSnapshots,
  saveProjectSnapshot,
  type ProjectSnapshot,
} from '../storage/localDb';
import { Modal, PrimaryButton, SecondaryButton } from './Modal';

interface VersionHistoryDialogProps {
  project: LexoProject;
  onRestore: (snapshotProject: LexoProject, label: string) => void;
  onClose: () => void;
  onNotify: (message: string, tone?: 'info' | 'error') => void;
}

export function VersionHistoryDialog({
  project,
  onRestore,
  onClose,
  onNotify,
}: VersionHistoryDialogProps) {
  const [label, setLabel] = useState('');
  const [snapshots, setSnapshots] = useState<ProjectSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listProjectSnapshots(project.id);
      setSnapshots(list);
    } finally {
      setLoading(false);
    }
  }, [project.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleSaveSnapshot = async () => {
    setBusy(true);
    try {
      const saved = await saveProjectSnapshot(
        project,
        label.trim() || `Versión ${new Date().toLocaleTimeString()}`,
        'manual',
      );
      setLabel('');
      onNotify(`Versión guardada: ${saved.label}`);
      await refresh();
    } catch {
      onNotify('No se pudo guardar la versión intermedia.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteProjectSnapshot(id);
    await refresh();
  };

  return (
    <Modal
      title="Historial de versiones"
      subtitle="Guarda puntos de control intermedios o recupera respaldos automáticos locales (máx. 15)."
      onClose={onClose}
      width="max-w-lg"
      footer={<SecondaryButton onClick={onClose}>Cerrar</SecondaryButton>}
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <input
            value={label}
            placeholder="Etiqueta opcional (ej. Antes de minimizar)"
            onChange={(event) => setLabel(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !busy) {
                void handleSaveSnapshot();
              }
            }}
            className="h-8 min-w-0 flex-1 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] px-2.5 text-[12px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-selection)] focus:outline-none"
          />
          <PrimaryButton onClick={() => void handleSaveSnapshot()} disabled={busy}>
            <span className="flex items-center gap-1.5">
              <BookmarkPlus aria-hidden="true" className="h-3.5 w-3.5" />
              Guardar versión
            </span>
          </PrimaryButton>
        </div>

        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
            Versiones guardadas ({snapshots.length})
          </p>

          {loading ? (
            <p className="py-4 text-[12px] text-[var(--text-muted)]">Cargando historial…</p>
          ) : snapshots.length === 0 ? (
            <div className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] px-3 py-3 text-[12px] text-[var(--text-secondary)]">
              <History aria-hidden="true" className="h-4 w-4 text-[var(--text-muted)]" />
              Aún no hay versiones intermedias para este proyecto. Guarda una arriba cuando quieras.
            </div>
          ) : (
            <div className="max-h-64 space-y-1.5 overflow-y-auto pr-0.5">
              {snapshots.map((snap) => (
                <div
                  key={snap.id}
                  className="flex items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] px-2.5 py-2 text-[11px]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate font-medium text-[var(--text-primary)]">
                        {snap.label}
                      </span>
                      <span
                        className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-medium uppercase ${
                          snap.kind === 'manual'
                            ? 'bg-[var(--accent-selection-soft)] text-[var(--accent-selection)]'
                            : 'bg-[var(--bg-surface)] text-[var(--text-muted)]'
                        }`}
                      >
                        {snap.kind === 'manual' ? 'Manual' : 'Auto'}
                      </span>
                    </div>
                    <p className="mono mt-0.5 text-[10px] text-[var(--text-muted)]">
                      {new Date(snap.createdAt).toLocaleString()} · {snap.project.states.length}{' '}
                      estados · {snap.project.transitions.length} reglas
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        onRestore(snap.project, snap.label);
                        onClose();
                      }}
                      className="flex h-7 items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-2 text-[10px] font-medium text-[var(--text-primary)] hover:border-[var(--accent-selection)] hover:text-[var(--accent-selection)]"
                    >
                      <RotateCcw aria-hidden="true" className="h-3 w-3" />
                      Restaurar
                    </button>
                    <button
                      type="button"
                      title="Eliminar versión"
                      aria-label={`Eliminar versión ${snap.label}`}
                      onClick={() => void handleDelete(snap.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:bg-[var(--accent-reject-soft)] hover:text-[var(--accent-reject)]"
                    >
                      <Trash2 aria-hidden="true" className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
