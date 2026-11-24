import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, Download, RotateCcw, Trash2 } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

const PROJECT_STORAGE_KEY = 'lexomata.project.v1';

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo): void {
    // Error capturado en UI de recuperación sin perder el respaldo local.
  }

  private handleDownloadBackup = () => {
    try {
      const raw = localStorage.getItem(PROJECT_STORAGE_KEY);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as { project?: unknown };
      const payload = JSON.stringify(parsed.project ?? parsed, null, 2);
      const blob = new Blob([payload], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `lexomata-respaldo-${new Date().toISOString().slice(0, 10)}.lexo`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      // Si el JSON guardado estaba corrupto, el usuario puede reiniciar limpio.
    }
  };

  private handleResetClean = () => {
    try {
      localStorage.removeItem(PROJECT_STORAGE_KEY);
    } catch {
      // Ignorar.
    }
    this.setState({ error: null });
    window.location.reload();
  };

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    const hasBackup = (() => {
      try {
        return Boolean(localStorage.getItem(PROJECT_STORAGE_KEY));
      } catch {
        return false;
      }
    })();

    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-canvas)] p-6 text-[var(--text-primary)]">
        <div
          role="alert"
          className="w-full max-w-md space-y-4 rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--bg-surface)] p-6 shadow-[var(--shadow-panel)]"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--accent-reject-soft)] text-[var(--accent-reject)]">
              <AlertTriangle aria-hidden="true" className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-[15px] font-semibold">Ocurrió un error inesperado</h1>
              <p className="mt-1 text-[12px] leading-relaxed text-[var(--text-secondary)]">
                Lexomata detuvo la vista para evitar corrupción de datos. Tu último autoguardado
                sigue intacto en este dispositivo.
              </p>
            </div>
          </div>

          <pre className="mono max-h-28 overflow-auto rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] p-2.5 text-[11px] text-[var(--accent-reject)]">
            {this.state.error.message || 'Error desconocido en la interfaz.'}
          </pre>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => this.setState({ error: null })}
              className="flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] bg-[var(--accent-selection)] px-3 text-[12px] font-medium text-white hover:brightness-110"
            >
              <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
              Reintentar
            </button>
            {hasBackup ? (
              <button
                type="button"
                onClick={this.handleDownloadBackup}
                className="flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--bg-surface-elevated)] px-3 text-[12px] text-[var(--text-primary)] hover:border-[var(--accent-selection)]"
              >
                <Download aria-hidden="true" className="h-3.5 w-3.5" />
                Descargar respaldo .lexo
              </button>
            ) : null}
            <button
              type="button"
              onClick={this.handleResetClean}
              className="flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--accent-reject)]/40 px-3 text-[12px] text-[var(--accent-reject)] hover:bg-[var(--accent-reject-soft)]"
            >
              <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
              Proyecto limpio
            </button>
          </div>
        </div>
      </div>
    );
  }
}
