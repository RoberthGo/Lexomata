import { useCallback, useEffect, useState } from 'react';
import { Cloud, CloudOff, Download, Loader2, LogOut, RefreshCw, Upload } from 'lucide-react';
import type { LexoProject } from '../engine/types';
import { createId } from '../model/project';
import {
  clearAccessToken,
  downloadDriveProject,
  getStoredAccessToken,
  hasSyncConflict,
  isDriveConfigured,
  isOnline,
  listDriveProjects,
  startDriveSignIn,
  uploadDriveProject,
  type DriveConflictInfo,
  type DriveFileSummary,
} from '../platform/gdriveSync';
import { Modal, PrimaryButton, SecondaryButton } from './Modal';

interface DriveSyncDialogProps {
  project: LexoProject;
  onLoadProject: (project: LexoProject) => void;
  onClose: () => void;
  onNotify: (message: string, tone?: 'info' | 'error') => void;
}

export function DriveSyncDialog({
  project,
  onLoadProject,
  onClose,
  onNotify,
}: DriveSyncDialogProps) {
  const [online, setOnline] = useState(isOnline);
  const [token, setToken] = useState<string | null>(getStoredAccessToken);
  const [files, setFiles] = useState<DriveFileSummary[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<DriveConflictInfo | null>(null);
  const configured = isDriveConfigured();

  useEffect(() => {
    const syncOnline = () => setOnline(isOnline());
    window.addEventListener('online', syncOnline);
    window.addEventListener('offline', syncOnline);
    return () => {
      window.removeEventListener('online', syncOnline);
      window.removeEventListener('offline', syncOnline);
    };
  }, []);

  const refresh = useCallback(async (activeToken: string) => {
    if (!isOnline()) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const items = await listDriveProjects(activeToken);
      setFiles(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo listar Google Drive.');
      setToken(getStoredAccessToken());
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (token && online) {
      void refresh(token);
    }
  }, [token, online, refresh]);

  const handleConnect = async () => {
    setBusy(true);
    setError(null);
    try {
      const nextToken = await startDriveSignIn();
      if (nextToken) {
        setToken(nextToken);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión con Google.');
    } finally {
      setBusy(false);
    }
  };

  const handleUploadCurrent = async () => {
    if (!token) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const expectedName = `${project.name.trim() || 'proyecto'}.lexo`;
      const existing = files.find((item) => item.name === expectedName);
      if (existing && hasSyncConflict(project.updatedAt, existing.modifiedTime)) {
        const remoteProject = await downloadDriveProject(token, existing.id);
        setConflict({
          fileId: existing.id,
          fileName: existing.name,
          localProject: project,
          remoteProject,
          remoteModifiedTime: existing.modifiedTime,
        });
        return;
      }

      const uploaded = await uploadDriveProject(token, project, existing?.id);
      onNotify(`Sincronizado con Drive: ${uploaded.name}`);
      await refresh(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir a Google Drive.');
    } finally {
      setBusy(false);
    }
  };

  const handleOpenRemote = async (file: DriveFileSummary) => {
    if (!token) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const remoteProject = await downloadDriveProject(token, file.id);
      if (remoteProject.id === project.id && hasSyncConflict(project.updatedAt, file.modifiedTime)) {
        setConflict({
          fileId: file.id,
          fileName: file.name,
          localProject: project,
          remoteProject,
          remoteModifiedTime: file.modifiedTime,
        });
        return;
      }
      onLoadProject(remoteProject);
      onNotify(`Cargado desde Drive: ${file.name}`);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo descargar el archivo.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Sincronización con Google Drive (Opcional)"
      subtitle="Lexomata funciona 100% local-first. Drive usa OAuth PKCE con acceso solo a carpeta Lexomata/."
      onClose={onClose}
      width="max-w-lg"
      footer={
        <>
          <SecondaryButton onClick={onClose}>Cerrar</SecondaryButton>
          {token && online ? (
            <PrimaryButton onClick={() => void handleUploadCurrent()} disabled={busy}>
              <span className="flex items-center gap-1.5">
                <Upload aria-hidden="true" className="h-3.5 w-3.5" />
                Subir proyecto actual
              </span>
            </PrimaryButton>
          ) : null}
        </>
      }
    >
      <div className="space-y-3">
        {!online ? (
          <div className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] px-3 py-2 text-[12px] text-[var(--text-secondary)]">
            <CloudOff aria-hidden="true" className="h-4 w-4 text-[var(--accent-warning)]" />
            Sin conexión a internet. Tu trabajo sigue guardándose en IndexedDB local.
          </div>
        ) : !configured ? (
          <div className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] px-3 py-2 text-[12px] text-[var(--text-secondary)]">
            Google Drive no está configurado en esta compilación (<span className="mono">VITE_GOOGLE_CLIENT_ID</span>).
          </div>
        ) : !token ? (
          <div className="flex items-center justify-between rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] px-3 py-2.5">
            <span className="text-[12px] text-[var(--text-secondary)]">
              Conecta tu cuenta para respaldar y abrir archivos <span className="mono">.lexo</span>.
            </span>
            <PrimaryButton onClick={() => void handleConnect()} disabled={busy}>
              <span className="flex items-center gap-1.5">
                <Cloud aria-hidden="true" className="h-3.5 w-3.5" />
                Conectar
              </span>
            </PrimaryButton>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-[var(--text-secondary)]">
                Archivos en Drive ({files.length})
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void refresh(token)}
                  disabled={busy}
                  className="flex items-center gap-1 text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  <RefreshCw aria-hidden="true" className={`h-3 w-3 ${busy ? 'animate-spin' : ''}`} />
                  Actualizar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    clearAccessToken();
                    setToken(null);
                    setFiles([]);
                  }}
                  className="flex items-center gap-1 text-[11px] text-[var(--text-muted)] hover:text-[var(--accent-reject)]"
                >
                  <LogOut aria-hidden="true" className="h-3 w-3" />
                  Desconectar
                </button>
              </div>
            </div>

            {busy && files.length === 0 ? (
              <div className="flex items-center gap-2 py-4 text-[12px] text-[var(--text-muted)]">
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                Consultando Google Drive…
              </div>
            ) : files.length === 0 ? (
              <p className="py-3 text-[12px] text-[var(--text-muted)]">
                No hay archivos .lexo sincronizados todavía.
              </p>
            ) : (
              <div className="max-h-52 space-y-1 overflow-auto">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] px-2.5 py-1.5 text-[11px]"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[var(--text-primary)]">{file.name}</p>
                      <p className="mono text-[10px] text-[var(--text-muted)]">
                        {new Date(file.modifiedTime).toLocaleString()}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleOpenRemote(file)}
                      disabled={busy}
                      className="ml-2 flex shrink-0 items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] px-2 py-1 text-[10px] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
                    >
                      <Download aria-hidden="true" className="h-3 w-3" />
                      Abrir
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {conflict ? (
          <div className="space-y-2 rounded-[var(--radius-md)] border border-[var(--accent-warning)]/40 bg-[var(--accent-warning-soft)] p-3 text-[11px]">
            <p className="font-semibold text-[var(--text-primary)]">
              Conflicto detectado en {conflict.fileName}
            </p>
            <p className="text-[var(--text-secondary)]">
              La copia local y la de Google Drive tienen fechas de modificación distintas.
            </p>
            <div className="flex flex-wrap gap-1.5">
              <SecondaryButton
                onClick={() => {
                  if (!token) {
                    return;
                  }
                  setBusy(true);
                  void uploadDriveProject(token, conflict.localProject, conflict.fileId)
                    .then(() => {
                      setConflict(null);
                      onNotify('Se conservó y subió la versión local.');
                      return refresh(token);
                    })
                    .finally(() => setBusy(false));
                }}
              >
                Conservar versión local
              </SecondaryButton>
              <SecondaryButton
                onClick={() => {
                  onLoadProject(conflict.remoteProject);
                  setConflict(null);
                  onNotify('Se cargó la versión de Google Drive.');
                  onClose();
                }}
              >
                Usar versión de Drive
              </SecondaryButton>
              <SecondaryButton
                onClick={() => {
                  onLoadProject({
                    ...conflict.remoteProject,
                    id: createId('project'),
                    name: `${conflict.remoteProject.name} (Drive)`,
                  });
                  setConflict(null);
                  onNotify('Abierta copia desde Google Drive.');
                  onClose();
                }}
              >
                Guardar como copia
              </SecondaryButton>
            </div>
          </div>
        ) : null}

        {error ? <p className="text-[11px] text-[var(--accent-reject)]">{error}</p> : null}
      </div>
    </Modal>
  );
}
