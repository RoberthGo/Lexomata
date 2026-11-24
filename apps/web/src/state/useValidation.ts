import { useEffect, useRef, useState } from 'react';
import { validateProject } from '../engine/wasmAdapter';
import type { LexoProject, ValidationReport } from '../engine/types';

export interface ValidationState {
  report: ValidationReport | null;
  error: string | null;
  checking: boolean;
}

function validationSignature(project: LexoProject): string {
  const statesKey = project.states
    .map((s) => `${s.id}:${s.label}:${s.isInitial ? 1 : 0}:${s.isAccepting ? 1 : 0}`)
    .join('|');
  const transKey = project.transitions
    .map((t) => `${t.id}:${t.from}->${t.to}:${JSON.stringify(t.rule)}`)
    .join('|');
  return `${project.id}::${project.machineType}::${JSON.stringify(project.config)}::${statesKey}::${transKey}`;
}

/** Valida el proyecto con debounce para no saturar el motor al arrastrar. */
export function useValidation(project: LexoProject, delayMs = 260): ValidationState {
  const [state, setState] = useState<ValidationState>({
    report: null,
    error: null,
    checking: true,
  });
  const projectRef = useRef(project);
  projectRef.current = project;
  const signature = validationSignature(project);

  useEffect(() => {
    let cancelled = false;
    setState((current) => ({ ...current, checking: true }));

    const timer = window.setTimeout(() => {
      validateProject(projectRef.current)
        .then((report) => {
          if (!cancelled) {
            setState({ report, error: null, checking: false });
          }
        })
        .catch((error: unknown) => {
          if (!cancelled) {
            setState({
              report: null,
              error: error instanceof Error ? error.message : 'No se pudo validar el proyecto.',
              checking: false,
            });
          }
        });
    }, delayMs);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [signature, delayMs]);

  return state;
}
