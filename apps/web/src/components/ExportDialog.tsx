import { useMemo, useState } from 'react';
import { Check, Copy, Download, Image as ImageIcon, Loader2 } from 'lucide-react';
import type { LexoProject } from '../engine/types';
import type { Selection } from '../uiTypes';
import { projectFileName } from '../model/project';
import { fileService } from '../platform/fileService';
import {
  projectToSvg,
  projectToTikz,
  svgToPngBlob,
  type ExportTheme,
} from '../utils/exporters';
import { Modal, PrimaryButton, SecondaryButton } from './Modal';

interface ExportDialogProps {
  project: LexoProject;
  selection?: Selection;
  onClose: () => void;
  onNotify: (message: string, tone?: 'info' | 'error') => void;
}

function sliceSelection(project: LexoProject, selection?: Selection): LexoProject {
  if (!selection || selection.kind === 'none') {
    return project;
  }

  const allowedStates = new Set<string>(
    selection.kind === 'state' ? [selection.id] : [selection.from, selection.to],
  );
  const transitions =
    selection.kind === 'edge'
      ? project.transitions.filter(
          (transition) => transition.from === selection.from && transition.to === selection.to,
        )
      : project.transitions.filter(
          (transition) => allowedStates.has(transition.from) && allowedStates.has(transition.to),
        );

  return {
    ...project,
    states: project.states.filter((state) => allowedStates.has(state.id)),
    transitions,
  };
}

const THEMES: Array<{ id: ExportTheme; label: string }> = [
  { id: 'light', label: 'Claro' },
  { id: 'dark', label: 'Oscuro' },
  { id: 'transparent', label: 'Transparente' },
];

const SCALES = [2, 3, 4];

export function ExportDialog({ project, selection, onClose, onNotify }: ExportDialogProps) {
  const [theme, setTheme] = useState<ExportTheme>('light');
  const [scale, setScale] = useState(2);
  const [area, setArea] = useState<'all' | 'selection'>('all');
  const [includeTestCases, setIncludeTestCases] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const hasSelection = Boolean(selection && selection.kind !== 'none');
  const targetProject = useMemo(
    () => (area === 'selection' && hasSelection ? sliceSelection(project, selection) : project),
    [area, hasSelection, project, selection],
  );
  const svg = useMemo(
    () => projectToSvg(targetProject, theme, 48, { includeTestCases }),
    [targetProject, theme, includeTestCases],
  );
  const tikz = useMemo(
    () => projectToTikz(targetProject, { includeTestCases }),
    [targetProject, includeTestCases],
  );

  const exportSvg = async () => {
    try {
      const saved = await fileService.saveFile(
        projectFileName(project, 'svg'),
        svg,
        'image/svg+xml',
      );
      if (saved) {
        onNotify('SVG exportado.');
      }
    } catch (error) {
      onNotify(error instanceof Error ? error.message : 'No se pudo exportar el SVG.', 'error');
    }
  };

  const exportPng = async () => {
    setBusy(true);
    try {
      const blob = await svgToPngBlob(svg, scale);
      const saved = await fileService.saveBinaryFile(projectFileName(project, 'png'), blob);
      if (saved) {
        onNotify(`PNG exportado a ${scale}×.`);
      }
    } catch (error) {
      onNotify(
        error instanceof Error ? error.message : 'No se pudo exportar el PNG.',
        'error',
      );
    } finally {
      setBusy(false);
    }
  };

  const exportTikz = async () => {
    try {
      const saved = await fileService.saveFile(
        projectFileName(project, 'tex'),
        tikz,
        'application/x-tex',
      );
      if (saved) {
        onNotify('Código TikZ exportado.');
      }
    } catch (error) {
      onNotify(error instanceof Error ? error.message : 'No se pudo exportar TikZ.', 'error');
    }
  };

  const copyTikz = async () => {
    try {
      await navigator.clipboard.writeText(tikz);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      onNotify('No se pudo copiar al portapapeles.', 'error');
    }
  };

  return (
    <Modal
      title="Exportar diagrama"
      subtitle="SVG y PNG se generan localmente; TikZ está listo para LaTeX."
      onClose={onClose}
      width="max-w-3xl"
      footer={
        <>
          <SecondaryButton onClick={onClose}>Cerrar</SecondaryButton>
          <SecondaryButton onClick={() => void exportTikz()}>Descargar TikZ</SecondaryButton>
          <SecondaryButton onClick={() => void exportSvg()}>Descargar SVG</SecondaryButton>
          <PrimaryButton onClick={() => void exportPng()} disabled={busy}>
            {busy ? (
              <span className="flex items-center gap-1.5">
                <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
                Generando…
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Download aria-hidden="true" className="h-3.5 w-3.5" />
                PNG {scale}×
              </span>
            )}
          </PrimaryButton>
        </>
      }
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
              Tema de exportación
            </p>
            <div className="flex items-center rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] p-0.5">
              {THEMES.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setTheme(option.id)}
                  className={`rounded-[4px] px-2 py-0.5 text-[10px] ${
                    theme === option.id
                      ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
              Escala PNG
            </p>
            <div className="flex items-center rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] p-0.5">
              {SCALES.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setScale(option)}
                  className={`rounded-[4px] px-2 py-0.5 text-[10px] ${
                    scale === option
                      ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  {option}×
                </button>
              ))}
            </div>
          </div>

          {hasSelection ? (
            <div>
              <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
                Área
              </p>
              <div className="flex items-center rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] p-0.5">
                <button
                  type="button"
                  onClick={() => setArea('all')}
                  className={`rounded-[4px] px-2 py-0.5 text-[10px] ${
                    area === 'all'
                      ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  Completo
                </button>
                <button
                  type="button"
                  onClick={() => setArea('selection')}
                  className={`rounded-[4px] px-2 py-0.5 text-[10px] ${
                    area === 'selection'
                      ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  Selección
                </button>
              </div>
            </div>
          ) : null}

          {project.testCases.length > 0 ? (
            <label className="mt-4 flex cursor-pointer items-center gap-1.5 text-[11px] text-[var(--text-secondary)]">
              <input
                type="checkbox"
                checked={includeTestCases}
                onChange={(event) => setIncludeTestCases(event.target.checked)}
              />
              Incluir tabla Multi-Run ({project.testCases.length})
            </label>
          ) : null}

          <button
            type="button"
            onClick={() => void copyTikz()}
            className="ml-auto flex h-7 items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] px-2 text-[10px] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
          >
            {copied ? (
              <Check aria-hidden="true" className="h-3 w-3 text-[var(--accent-accept)]" />
            ) : (
              <Copy aria-hidden="true" className="h-3 w-3" />
            )}
            Copiar TikZ
          </button>
        </div>

        <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
          <ImageIcon aria-hidden="true" className="h-3 w-3" />
          Vista previa · {targetProject.states.length} estados · {targetProject.transitions.length} reglas
        </div>

        <div className="max-h-[360px] overflow-auto rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] p-3">
          <div dangerouslySetInnerHTML={{ __html: svg }} />
        </div>

        <details className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)]">
          <summary className="cursor-pointer px-2 py-1.5 text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
            Código TikZ
          </summary>
          <pre className="mono max-h-48 overflow-auto border-t border-[var(--border-subtle)] p-2 text-[10px] text-[var(--text-primary)]">
            {tikz}
          </pre>
        </details>
      </div>
    </Modal>
  );
}
