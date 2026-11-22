import { useEffect, useState } from 'react';
import { validateProject } from '../engine/wasmAdapter';
import type { LexoProject, ValidationReport } from '../engine/types';

export interface ValidationState {
  report: ValidationReport | null;
  error: string | null;
  checking: boolean;
}

/** Valida el proyecto con debounce para no saturar el motor al arrastrar. */
export function useValidation(project: LexoProject, delayMs = 260): ValidationState {
  const [state, setState] = useState<ValidationState>({
    report: null,
    error: null,
    checking: true,
  });

  useEffect(() => {
    let cancelled = false;
    setState((current) => ({ ...current, checking: true }));

    const timer = window.setTimeout(() => {
      validateProject(project)
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
  }, [project, delayMs]);

  return state;
}
