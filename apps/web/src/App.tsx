import { useEffect, useState } from 'react';
import { Cpu, ShieldCheck, WifiOff } from 'lucide-react';
import { getEngineVersion } from './engine/wasmAdapter';

type EngineStatus =
  | { state: 'loading' }
  | { state: 'ready'; version: string }
  | { state: 'error'; message: string };

export interface AppProps {
  /** Inyectable en pruebas para no inicializar WASM. */
  loadVersion?: () => Promise<string>;
}

const CAPABILITIES = [
  'AFD · AFN · AFN-ε',
  'Máquina de Turing de 1 cinta',
  'Editor SVG y simulación paso a paso',
  'Importación y exportación JFLAP',
];

export function App({ loadVersion = getEngineVersion }: AppProps) {
  const [status, setStatus] = useState<EngineStatus>({ state: 'loading' });

  useEffect(() => {
    let cancelled = false;

    loadVersion()
      .then((version) => {
        if (!cancelled) {
          setStatus({ state: 'ready', version });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setStatus({
            state: 'error',
            message: error instanceof Error ? error.message : 'No se pudo cargar el motor',
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [loadVersion]);

  return (
    <div className="flex h-full flex-col bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4">
        <div className="flex items-center gap-3">
          <BrandMark />
          <span className="text-[13px] font-semibold tracking-[-0.01em]">Lexomata</span>
          <span className="rounded-[var(--radius-pill)] border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-secondary)]">
            Rust
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)]">
          <WifiOff aria-hidden="true" className="h-3.5 w-3.5" />
          <span>100% offline</span>
        </div>
      </header>

      <main className="dot-grid relative flex flex-1 items-center justify-center overflow-hidden p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,var(--accent-selection-soft),transparent_60%)]" />

        <section className="surface-panel relative w-full max-w-[460px] p-7">
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--text-muted)]">
            <Cpu aria-hidden="true" className="h-3.5 w-3.5" />
            Motor formal
          </div>

          <h1 className="mt-3 text-[22px] font-semibold leading-tight tracking-[-0.02em]">
            Núcleo Rust conectado a la interfaz
          </h1>
          <p className="mt-2 text-[13px] leading-relaxed text-[var(--text-secondary)]">
            Fase 0 completada: workspace, WebAssembly y shell web listos para construir el editor.
          </p>

          <div className="mt-5 flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] px-3 py-2.5">
            <StatusDot state={status.state} />
            <span className="text-[12px] text-[var(--text-secondary)]">Versión del motor</span>
            <span className="mono ml-auto text-[12px] text-[var(--text-primary)]" data-testid="engine-version">
              {status.state === 'ready' ? status.version : status.state === 'error' ? 'no disponible' : '…'}
            </span>
          </div>

          {status.state === 'error' && (
            <p className="mt-3 rounded-[var(--radius-md)] border border-[var(--accent-reject)]/30 bg-[var(--accent-reject-soft)] px-3 py-2 text-[12px] text-[var(--accent-reject)]">
              {status.message}
            </p>
          )}

          <ul className="mt-5 grid gap-2">
            {CAPABILITIES.map((capability) => (
              <li key={capability} className="flex items-center gap-2 text-[12px] text-[var(--text-secondary)]">
                <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5 text-[var(--accent-accept)]" />
                {capability}
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="flex h-8 shrink-0 items-center justify-between border-t border-[var(--border-subtle)] px-4 text-[10px] text-[var(--text-muted)]">
        <span>Lexomata RUST · MVP offline</span>
        <span className="mono">sin CDNs · sin telemetría</span>
      </footer>
    </div>
  );
}

function BrandMark() {
  return (
    <svg viewBox="0 0 32 32" className="h-6 w-6" role="img" aria-label="Lexomata">
      <path d="M4 16h4" stroke="var(--text-primary)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="13" cy="16" r="5" fill="none" stroke="var(--accent-selection)" strokeWidth="2" />
      <circle cx="25" cy="16" r="4.5" fill="none" stroke="var(--accent-active)" strokeWidth="2" />
      <path d="M18 16h2" stroke="var(--text-primary)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function StatusDot({ state }: { state: EngineStatus['state'] }) {
  const color =
    state === 'ready'
      ? 'var(--accent-accept)'
      : state === 'error'
        ? 'var(--accent-reject)'
        : 'var(--accent-warning)';

  return (
    <span
      aria-hidden="true"
      className="h-1.5 w-1.5 rounded-full"
      style={{ backgroundColor: color, boxShadow: `0 0 0 3px color-mix(in srgb, ${color} 20%, transparent)` }}
    />
  );
}
