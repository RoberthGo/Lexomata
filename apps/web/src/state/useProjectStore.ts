import { useCallback, useEffect, useRef, useState } from 'react';
import type { LexoProject } from '../engine/types';
import { createProject, normalizeProject } from '../model/project';

const STORAGE_KEY = 'lexomata.project.v1';
const HISTORY_LIMIT = 60;
const AUTOSAVE_DELAY_MS = 400;

interface ProjectHistory {
  past: LexoProject[];
  present: LexoProject;
  future: LexoProject[];
}

export type ProjectUpdater = (project: LexoProject) => LexoProject;

function loadInitialProject(): LexoProject {
  if (typeof localStorage === 'undefined') {
    return createProject();
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return createProject();
    }

    const parsed: unknown = JSON.parse(stored);
    const candidate =
      typeof parsed === 'object' && parsed !== null && 'project' in parsed
        ? (parsed as { project: unknown }).project
        : parsed;

    return normalizeProject(candidate);
  } catch {
    return createProject();
  }
}

function pushPast(past: LexoProject[], project: LexoProject): LexoProject[] {
  const next = [...past, project];
  return next.length > HISTORY_LIMIT ? next.slice(next.length - HISTORY_LIMIT) : next;
}

export interface ProjectStore {
  project: LexoProject;
  canUndo: boolean;
  canRedo: boolean;
  /** Reemplaza el proyecto y limpia el historial (abrir, ejemplo, nuevo). */
  resetProject: (project: LexoProject) => void;
  /** Aplica un cambio registrando un punto de deshacer. */
  commit: (updater: ProjectUpdater) => void;
  /** Aplica un cambio sin registrar historial (arrastres). */
  update: (updater: ProjectUpdater) => void;
  /** Marca el inicio de una transacción de arrastre. */
  beginTransaction: () => void;
  /** Cierra la transacción y registra un único punto de deshacer. */
  endTransaction: () => void;
  undo: () => void;
  redo: () => void;
}

export function useProjectStore(): ProjectStore {
  const [history, setHistory] = useState<ProjectHistory>(() => ({
    past: [],
    present: loadInitialProject(),
    future: [],
  }));

  const presentRef = useRef(history.present);
  const transactionStart = useRef<LexoProject | null>(null);

  useEffect(() => {
    presentRef.current = history.present;
  }, [history.present]);

  useEffect(() => {
    if (typeof localStorage === 'undefined') {
      return;
    }

    const persistNow = () => {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ version: 1, project: presentRef.current }),
        );
      } catch {
        // El autoguardado es best-effort; nunca debe romper la edición.
      }
    };

    const timer = window.setTimeout(persistNow, AUTOSAVE_DELAY_MS);
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        persistNow();
      }
    };
    window.addEventListener('beforeunload', persistNow);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('beforeunload', persistNow);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [history.present]);

  const resetProject = useCallback((project: LexoProject) => {
    transactionStart.current = null;
    presentRef.current = project;
    setHistory({ past: [], present: project, future: [] });
  }, []);

  const commit = useCallback((updater: ProjectUpdater) => {
    setHistory((current) => {
      const next = updater(current.present);
      if (next === current.present) {
        return current;
      }
      presentRef.current = next;
      return {
        past: pushPast(current.past, current.present),
        present: next,
        future: [],
      };
    });
  }, []);

  const update = useCallback((updater: ProjectUpdater) => {
    setHistory((current) => {
      const next = updater(current.present);
      if (next === current.present) {
        return current;
      }
      presentRef.current = next;
      return { ...current, present: next, future: [] };
    });
  }, []);

  const beginTransaction = useCallback(() => {
    transactionStart.current = presentRef.current;
  }, []);

  const endTransaction = useCallback(() => {
    const start = transactionStart.current;
    transactionStart.current = null;

    if (!start) {
      return;
    }

    setHistory((current) => {
      if (start === current.present) {
        return current;
      }
      return {
        past: pushPast(current.past, start),
        present: current.present,
        future: [],
      };
    });
  }, []);

  const undo = useCallback(() => {
    setHistory((current) => {
      const previous = current.past[current.past.length - 1];
      if (!previous) {
        return current;
      }
      presentRef.current = previous;
      return {
        past: current.past.slice(0, -1),
        present: previous,
        future: [current.present, ...current.future].slice(0, HISTORY_LIMIT),
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((current) => {
      const next = current.future[0];
      if (!next) {
        return current;
      }
      presentRef.current = next;
      return {
        past: pushPast(current.past, current.present),
        present: next,
        future: current.future.slice(1),
      };
    });
  }, []);

  return {
    project: history.present,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    resetProject,
    commit,
    update,
    beginTransaction,
    endTransaction,
    undo,
    redo,
  };
}
