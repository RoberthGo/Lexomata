import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { Dock } from './components/Dock';
import { DriveSyncDialog } from './components/DriveSyncDialog';
import { ExportDialog } from './components/ExportDialog';
import { GraphCanvas } from './components/GraphCanvas';
import { Inspector } from './components/Inspector';
import { Modal, PrimaryButton, SecondaryButton } from './components/Modal';
import { NewProjectDialog } from './components/NewProjectDialog';
import { PreferencesDialog } from './components/PreferencesDialog';
import { ShortcutsDialog } from './components/ShortcutsDialog';
import { SimulationBar } from './components/SimulationBar';
import { TopBar } from './components/TopBar';
import { VersionHistoryDialog } from './components/VersionHistoryDialog';
import {
  TransformationDialog,
  type TransformationReport,
} from './components/TransformationDialog';
import {
  convertNfaToDfa,
  exportJflap,
  getExamples,
  importJflap,
  minimizeDfa,
} from './engine/wasmAdapter';
import { isTuring, type ExampleEntry, type LexoProject, type MachineType } from './engine/types';
import {
  addState,
  addTransition,
  createId,
  createProject,
  invertEdgeGroup,
  markInitial,
  normalizeProject,
  projectFileName,
  reassignEdgeGroup,
  removeStates,
  removeTransitions,
  setFaStrictMode,
  toggleAccepting,
  touchProject,
  updateEdgeGroupComment,
  updateState,
} from './model/project';
import { useFaSimulation } from './state/useFaSimulation';
import { useProjectStore } from './state/useProjectStore';
import { useTheme } from './state/useTheme';
import { useTuringSimulation } from './state/useTuringSimulation';
import { useUiPrefs } from './state/useUiPrefs';
import { useValidation } from './state/useValidation';
import {
  deleteProjectLocal,
  getLastProjectId,
  listRecentProjects,
  loadProjectLocal,
  saveLastProjectId,
  saveProjectLocal,
  saveProjectSnapshot,
} from './storage/localDb';
import type { CanvasHandle, InspectorTab, Selection, Tool } from './uiTypes';
import { fileService } from './platform/fileService';
import { completeWebOAuthRedirect } from './platform/gdriveSync';
import { layoutStates, type LayoutStrategy } from './utils/layout';

type Dialog = 'new' | 'export' | 'type' | 'drive' | 'prefs' | 'history' | 'shortcuts' | null;

interface Toast {
  message: string;
  tone: 'info' | 'error';
}

function projectSnapshotSignature(current: LexoProject): string {
  return JSON.stringify({
    id: current.id,
    machineType: current.machineType,
    states: current.states,
    transitions: current.transitions,
    config: current.config,
  });
}

export function App() {
  const store = useProjectStore();
  const { project } = store;
  const validation = useValidation(project);
  const { theme, setTheme, toggleTheme } = useTheme();
  const { prefs, updatePrefs, resetPrefs } = useUiPrefs();
  const fa = useFaSimulation(project);
  const tm = useTuringSimulation(project);

  const [tool, setTool] = useState<Tool>('select');
  const [selection, setSelection] = useState<Selection>({ kind: 'none' });
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('properties');
  const [dialog, setDialog] = useState<Dialog>(null);
  const [transformationReport, setTransformationReport] = useState<TransformationReport | null>(null);
  const [pendingFamily, setPendingFamily] = useState<'FA' | 'TM' | null>(null);
  const [examples, setExamples] = useState<ExampleEntry[]>([]);
  const [recentProjects, setRecentProjects] = useState<LexoProject[]>([]);
  const [toast, setToast] = useState<Toast | null>(null);
  const [opening, setOpening] = useState(false);

  const canvasRef = useRef<CanvasHandle>(null);
  const draggingRef = useRef(false);
  const toastTimer = useRef<number | null>(null);
  const restoredRef = useRef(false);
  const userEditedRef = useRef(false);
  const projectRef = useRef(project);
  projectRef.current = project;
  const lastSnapshotSignatureRef = useRef('');

  const commitProject = useCallback(
    (updater: (current: LexoProject) => LexoProject) => {
      userEditedRef.current = true;
      store.commit(updater);
    },
    [store],
  );

  const notify = useCallback((message: string, tone: 'info' | 'error' = 'info') => {
    setToast({ message, tone });
    if (toastTimer.current !== null) {
      window.clearTimeout(toastTimer.current);
    }
    toastTimer.current = window.setTimeout(() => setToast(null), 3600);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current !== null) {
        window.clearTimeout(toastTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    getExamples()
      .then((entries) => {
        if (!cancelled) {
          setExamples(entries);
        }
      })
      .catch(() => {
        // Los ejemplos son opcionales; la app sigue siendo usable sin ellos.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const lastId = await getLastProjectId();
        if (lastId && !cancelled) {
          const saved = await loadProjectLocal(lastId);
          if (saved && !cancelled && !restoredRef.current && !userEditedRef.current) {
            restoredRef.current = true;
            const normalized = normalizeProject(saved);
            lastSnapshotSignatureRef.current = projectSnapshotSignature(normalized);
            store.resetProject(normalized);
          }
        }
        const recent = await listRecentProjects(8);
        if (!cancelled) {
          setRecentProjects(recent);
        }
      } catch {
        // IndexedDB es opcional; si falla se mantiene el proyecto inicial.
      }
      void completeWebOAuthRedirect()
        .then((completed) => {
          if (completed && !cancelled) {
            setDialog('drive');
            notify('Sesión de Google Drive conectada.');
          }
        })
        .catch(() => {
          // OAuth opcional.
        });
    })();
    return () => {
      cancelled = true;
    };
    // Solo al montar la aplicación.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const persistLocalNow = () => {
      const latest = projectRef.current;
      void saveProjectLocal(latest)
        .then(() => saveLastProjectId(latest.id))
        .catch(() => {
          // Best-effort al ocultar o cerrar.
        });
    };

    const timer = window.setTimeout(() => {
      void saveProjectLocal(project)
        .then(() => saveLastProjectId(project.id))
        .then(() => listRecentProjects(8))
        .then(setRecentProjects)
        .catch(() => {
          // Silencioso en entornos sin IndexedDB persistente.
        });
    }, 500);

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        persistLocalNow();
      }
    };
    window.addEventListener('beforeunload', persistLocalNow);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('beforeunload', persistLocalNow);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [project]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const current = projectRef.current;
      if (current.states.length <= 1 && current.transitions.length === 0) {
        return;
      }
      const signature = projectSnapshotSignature(current);
      if (signature === lastSnapshotSignatureRef.current) {
        return;
      }
      lastSnapshotSignatureRef.current = signature;
      void saveProjectSnapshot(current, 'Respaldo automático', 'auto').catch(() => {
        // Silencioso si IndexedDB no está disponible.
      });
    }, 120_000);

    return () => window.clearInterval(interval);
  }, []);

  const loadProject = useCallback(
    (next: LexoProject) => {
      userEditedRef.current = true;
      lastSnapshotSignatureRef.current = projectSnapshotSignature(next);
      store.resetProject(next);
      setSelection({ kind: 'none' });
      setTool('select');
      setInspectorTab('properties');
    },
    [store],
  );

  const switchToFamily = useCallback(
    (family: 'FA' | 'TM') => {
      const targetType: MachineType = family === 'TM' ? 'TM_SINGLE' : 'DFA';
      fileService.clearActiveHandle();
      loadProject(createProject(targetType, project.name));
      setDialog(null);
      setPendingFamily(null);
      notify(
        family === 'TM'
          ? 'Nuevo proyecto de Máquina de Turing listo.'
          : 'Nuevo proyecto de Autómata Finito listo.',
      );
      window.setTimeout(() => canvasRef.current?.fit(), 0);
    },
    [project.name, loadProject, notify],
  );

  const handleRequestMachineFamily = useCallback(
    (family: 'FA' | 'TM') => {
      const currentFamily: 'FA' | 'TM' = isTuring(project.machineType) ? 'TM' : 'FA';
      if (family === currentFamily) {
        return;
      }
      if (project.transitions.length === 0 && project.states.length <= 1) {
        switchToFamily(family);
      } else {
        setPendingFamily(family);
        setDialog('type');
      }
    },
    [project.machineType, project.transitions.length, project.states.length, switchToFamily],
  );

  const handleToggleFaStrict = useCallback(() => {
    const nextStrict = project.machineType !== 'DFA';
    commitProject((current) => setFaStrictMode(current, nextStrict));
    notify(
      nextStrict
        ? 'Modo estricto AFD activado.'
        : 'Modo flexible AFN activado (permite ε y múltiples aristas).',
    );
  }, [project.machineType, commitProject, notify]);

  const handleCreateState = useCallback(
    (x: number, y: number) => {
      let createdId = '';
      commitProject((current) => {
        const result = addState(current, x, y);
        createdId = result.stateId;
        return result.project;
      });
      if (createdId) {
        setSelection({ kind: 'state', id: createdId });
      }
    },
    [commitProject],
  );

  const handleCreateTransition = useCallback(
    (from: string, to: string) => {
      commitProject((current) => addTransition(current, from, to).project);
      setSelection({ kind: 'edge', from, to });
      setInspectorTab('properties');
    },
    [commitProject],
  );

  const handleMoveState = useCallback(
    (id: string, x: number, y: number, final: boolean) => {
      userEditedRef.current = true;
      if (final) {
        if (draggingRef.current) {
          store.endTransaction();
          draggingRef.current = false;
        }
        return;
      }

      if (!draggingRef.current) {
        store.beginTransaction();
        draggingRef.current = true;
      }
      store.update((current) => updateState(current, id, { x, y }));
    },
    [store],
  );

  const deleteSelection = useCallback(() => {
    if (selection.kind === 'state') {
      commitProject((current) => removeStates(current, [selection.id]));
    } else if (selection.kind === 'edge') {
      commitProject((current) =>
        removeTransitions(
          current,
          current.transitions
            .filter(
              (transition) =>
                transition.from === selection.from && transition.to === selection.to,
            )
            .map((transition) => transition.id),
        ),
      );
    } else {
      return;
    }
    setSelection({ kind: 'none' });
  }, [selection, commitProject]);

  const handleDeleteState = useCallback(
    (id: string) => {
      commitProject((current) => removeStates(current, [id]));
      setSelection({ kind: 'none' });
    },
    [commitProject],
  );

  const handleRename = useCallback(
    (name: string) => {
      commitProject((current) => touchProject({ ...current, name }));
    },
    [commitProject],
  );

  const handleOpenDiagnostics = useCallback(() => {
    setInspectorOpen(true);
    setInspectorTab('properties');
    setSelection({ kind: 'none' });
  }, []);

  const saveLexo = useCallback(async () => {
    try {
      const saved = await fileService.saveCurrentFile(
        projectFileName(project, 'lexo'),
        JSON.stringify(project, null, 2),
        'application/json',
      );
      if (saved) {
        notify('Proyecto guardado como .lexo.');
      }
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudo guardar el archivo.', 'error');
    }
  }, [project, notify]);

  const saveLexoAs = useCallback(async () => {
    try {
      const saved = await fileService.saveFile(
        projectFileName(project, 'lexo'),
        JSON.stringify(project, null, 2),
        'application/json',
      );
      if (saved) {
        notify('Proyecto guardado como .lexo.');
      }
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudo guardar el archivo.', 'error');
    }
  }, [project, notify]);

  const saveJflap = useCallback(async () => {
    try {
      const xml = await exportJflap(project);
      const saved = await fileService.saveFile(
        projectFileName(project, 'jff'),
        xml,
        'application/xml',
      );
      if (saved) {
        notify('Archivo .jff exportado.');
      }
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudo exportar a JFLAP.', 'error');
    }
  }, [project, notify]);

  const openLexo = useCallback(async () => {
    setOpening(true);
    try {
      const opened = await fileService.openFile('.lexo');
      if (!opened) {
        return;
      }
      const parsed: unknown = JSON.parse(opened.content);
      const next = normalizeProject(parsed);
      loadProject(next);
      notify(`Abierto: ${opened.name}`);
    } catch (error) {
      notify(
        error instanceof Error ? `No se pudo abrir el archivo: ${error.message}` : 'Archivo inválido.',
        'error',
      );
    } finally {
      setOpening(false);
    }
  }, [loadProject, notify]);

  const openJff = useCallback(async () => {
    setOpening(true);
    try {
      const opened = await fileService.openFile('.jff');
      if (!opened) {
        return;
      }
      const imported = await importJflap(opened.content);
      fileService.clearActiveHandle();
      loadProject({ ...imported, id: createId('project') });
      notify(`Importado desde JFLAP: ${opened.name}`);
    } catch (error) {
      notify(
        error instanceof Error ? `No se pudo importar: ${error.message}` : 'Archivo JFLAP inválido.',
        'error',
      );
    } finally {
      setOpening(false);
    }
  }, [loadProject, notify]);

  const convertNfa = useCallback(async () => {
    try {
      const sourceLabels = Object.fromEntries(
        project.states.map((state) => [state.id, state.label]),
      );
      const result = await convertNfaToDfa(project, false);
      store.commit(() => result.dfa);
      setSelection({ kind: 'none' });
      setInspectorTab('properties');
      setTransformationReport({ kind: 'nfaToDfa', result, sourceLabels });
      notify(`AFD generado con ${result.dfa.states.length} estados.`);
      window.setTimeout(() => canvasRef.current?.fit(), 0);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudo convertir el AFN.', 'error');
    }
  }, [project, store, notify]);

  const minimize = useCallback(async () => {
    try {
      const sourceLabels = Object.fromEntries(
        project.states.map((state) => [state.id, state.label]),
      );
      const result = await minimizeDfa(project);
      store.commit(() => result.minimized);
      setSelection({ kind: 'none' });
      setTransformationReport({ kind: 'minimize', result, sourceLabels });
      notify(
        `AFD minimizado: ${result.minimized.states.length} estados, ${result.removedUnreachable.length} inalcanzables eliminados.`,
      );
      window.setTimeout(() => canvasRef.current?.fit(), 0);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudo minimizar el AFD.', 'error');
    }
  }, [project, store, notify]);

  const applyLayout = useCallback(
    (strategy: LayoutStrategy) => {
      store.commit((current) => layoutStates(current, strategy));
      notify(strategy === 'circular' ? 'Auto-layout circular aplicado.' : 'Auto-layout jerárquico aplicado.');
      window.setTimeout(() => canvasRef.current?.fit(), 0);
    },
    [store, notify],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (dialog !== null || transformationReport !== null) {
        return;
      }

      const target = event.target as HTMLElement | null;
      if (
        target?.closest('input, textarea, select, [contenteditable="true"]') ||
        target?.isContentEditable
      ) {
        return;
      }

      const modifier = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      const activeSim = isTuring(projectRef.current.machineType) ? tm : fa;

      if (modifier && key === 'z') {
        event.preventDefault();
        if (event.shiftKey) {
          store.redo();
        } else {
          store.undo();
        }
        setSelection({ kind: 'none' });
        return;
      }

      if (modifier && key === 'y') {
        event.preventDefault();
        store.redo();
        setSelection({ kind: 'none' });
        return;
      }

      if (modifier && key === 's') {
        event.preventDefault();
        if (event.shiftKey) {
          void saveLexoAs();
        } else {
          void saveLexo();
        }
        return;
      }

      if (modifier && key === 'o') {
        event.preventDefault();
        void openLexo();
        return;
      }

      if (modifier && key === 'e') {
        event.preventDefault();
        setDialog('export');
        return;
      }

      if (modifier && key === 'b') {
        event.preventDefault();
        setInspectorOpen((current) => !current);
        return;
      }

      if (modifier && key === 'n') {
        event.preventDefault();
        setDialog('new');
        return;
      }

      if (modifier && event.key === '0') {
        event.preventDefault();
        canvasRef.current?.fit();
        return;
      }

      if (modifier && event.key === 'Enter') {
        event.preventDefault();
        void activeSim.fastRun();
        return;
      }

      if (modifier && key === 'd') {
        if (selection.kind === 'state') {
          event.preventDefault();
          let duplicatedId: string | null = null;
          commitProject((current) => {
            const source = current.states.find((state) => state.id === selection.id);
            if (!source) {
              return current;
            }
            const added = addState(current, source.x + 40, source.y + 40);
            duplicatedId = added.stateId;
            return updateState(added.project, added.stateId, {
              isAccepting: source.isAccepting,
              comment: source.comment,
            });
          });
          if (duplicatedId) {
            setSelection({ kind: 'state', id: duplicatedId });
          }
        }
        return;
      }

      if (modifier) {
        return;
      }

      if (event.altKey) {
        if (event.key === '1') {
          event.preventDefault();
          setInspectorOpen(true);
          setInspectorTab('properties');
        } else if (event.key === '2') {
          event.preventDefault();
          setInspectorOpen(true);
          setInspectorTab('delta');
        } else if (event.key === '3') {
          event.preventDefault();
          setInspectorOpen(true);
          setInspectorTab('formal');
        } else if (event.key === '4') {
          event.preventDefault();
          setInspectorOpen(true);
          setInspectorTab('batch');
        }
        return;
      }

      if (event.shiftKey && event.code === 'Space') {
        event.preventDefault();
        activeSim.togglePlay();
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        void activeSim.stepForward();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        void activeSim.stepBack();
      } else if (key === 'r') {
        event.preventDefault();
        void activeSim.reset();
      } else if (event.key === '+' || event.key === '=') {
        event.preventDefault();
        canvasRef.current?.zoomIn();
      } else if (event.key === '-') {
        event.preventDefault();
        canvasRef.current?.zoomOut();
      } else if (event.key === '1') {
        event.preventDefault();
        canvasRef.current?.fit();
      } else if (key === 'a' && selection.kind === 'state') {
        event.preventDefault();
        commitProject((current) => toggleAccepting(current, selection.id));
      } else if (key === 'i' && selection.kind === 'state') {
        event.preventDefault();
        commitProject((current) => markInitial(current, selection.id));
      } else if (key === 'v') {
        setTool('select');
      } else if (key === 's') {
        setTool('state');
      } else if (key === 't') {
        setTool('transition');
      } else if (key === 'x') {
        setTool('erase');
      } else if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        deleteSelection();
      } else if (event.key === '?') {
        event.preventDefault();
        setDialog((current) => (current === 'shortcuts' ? null : 'shortcuts'));
      } else if (event.key === 'Escape') {
        setTool('select');
        setSelection({ kind: 'none' });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    dialog,
    transformationReport,
    store,
    commitProject,
    saveLexo,
    saveLexoAs,
    openLexo,
    deleteSelection,
    selection,
    fa,
    tm,
  ]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      <TopBar
        project={project}
        canUndo={store.canUndo}
        canRedo={store.canRedo}
        theme={theme}
        validation={validation.report}
        validationError={validation.error}
        inspectorOpen={inspectorOpen}
        examples={examples}
        onRename={handleRename}
        onUndo={() => {
          store.undo();
          setSelection({ kind: 'none' });
        }}
        onRedo={() => {
          store.redo();
          setSelection({ kind: 'none' });
        }}
        onToggleTheme={toggleTheme}
        onToggleInspector={() => {
          setInspectorOpen((current) => !current);
          setInspectorTab('properties');
        }}
        onOpenDrive={() => setDialog('drive')}
        onOpenPrefs={() => setDialog('prefs')}
        onOpenHistory={() => setDialog('history')}
        onOpenShortcuts={() => setDialog('shortcuts')}
        onOpenDiagnostics={handleOpenDiagnostics}
        onNew={() => setDialog('new')}
        onOpenLexo={() => void openLexo()}
        onOpenJff={() => void openJff()}
        onSaveLexo={saveLexo}
        onSaveLexoAs={() => void saveLexoAs()}
        onExportJff={() => void saveJflap()}
        onOpenExport={() => setDialog('export')}
        onLoadExample={(entry) => {
          fileService.clearActiveHandle();
          loadProject({ ...entry.project, id: createId('project') });
          notify(`Ejemplo cargado: ${entry.project.name}`);
        }}
        onRequestMachineFamily={handleRequestMachineFamily}
        onToggleFaStrict={handleToggleFaStrict}
        onConvertNfa={() => void convertNfa()}
        onMinimizeDfa={() => void minimize()}
        onLayout={applyLayout}
      />

      <div className="relative flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          {prefs.simPosition === 'top' ? (
            <SimulationBar
              project={project}
              fa={fa}
              tm={tm}
              position="top"
              collapsed={prefs.simCollapsed}
              onToggleCollapse={() => updatePrefs({ simCollapsed: !prefs.simCollapsed })}
            />
          ) : null}

          <div className="relative min-h-0 flex-1">
            <GraphCanvas
              ref={canvasRef}
              project={project}
              tool={tool}
              selection={selection}
              activeStateIds={fa.activeStateIds.concat(
                tm.snapshot ? [tm.snapshot.currentStateId] : [],
              )}
              firedTransitionIds={fa.firedTransitionIds.concat(
                tm.firedTransitionId ? [tm.firedTransitionId] : [],
              )}
              showGrid={prefs.showGrid}
              snapEnabled={prefs.snapToGrid}
              showNotes={prefs.showNotes}
              onSelect={setSelection}
              onCreateState={handleCreateState}
              onCreateTransition={handleCreateTransition}
              onMoveState={handleMoveState}
              onDeleteState={handleDeleteState}
              onMarkInitialState={(id) => {
                commitProject((current) => markInitial(current, id));
              }}
              onToggleAcceptingState={(id) => {
                commitProject((current) => toggleAccepting(current, id));
              }}
              onEditEdge={(from, to) => {
                setSelection({ kind: 'edge', from, to });
                setInspectorTab('properties');
                setInspectorOpen(true);
              }}
              onInvertEdge={(from, to) => {
                commitProject((current) => invertEdgeGroup(current, from, to));
                setSelection({ kind: 'edge', from: to, to: from });
              }}
              onReassignEdge={(from, to, nextFrom, nextTo) => {
                commitProject((current) => reassignEdgeGroup(current, from, to, nextFrom, nextTo));
                setSelection({ kind: 'edge', from: nextFrom, to: nextTo });
              }}
              onUpdateEdgeComment={(from, to, comment) => {
                commitProject((current) => updateEdgeGroupComment(current, from, to, comment));
              }}
              onDeleteEdge={(from, to) => {
                commitProject((current) =>
                  removeTransitions(
                    current,
                    current.transitions
                      .filter((transition) => transition.from === from && transition.to === to)
                      .map((transition) => transition.id),
                  ),
                );
                setSelection({ kind: 'none' });
              }}
            />

            <Dock
              tool={tool}
              position={prefs.dockPosition}
              onToolChange={setTool}
              onZoomIn={() => canvasRef.current?.zoomIn()}
              onZoomOut={() => canvasRef.current?.zoomOut()}
              onFit={() => canvasRef.current?.fit()}
            />
          </div>

          {prefs.simPosition === 'bottom' ? (
            <SimulationBar
              project={project}
              fa={fa}
              tm={tm}
              position="bottom"
              collapsed={prefs.simCollapsed}
              onToggleCollapse={() => updatePrefs({ simCollapsed: !prefs.simCollapsed })}
            />
          ) : null}
        </div>

        {inspectorOpen ? (
          <>
            <div
              className="absolute inset-0 z-10 bg-black/25 lg:hidden"
              onClick={() => setInspectorOpen(false)}
              role="presentation"
            />
            <div className="fixed inset-x-0 bottom-0 z-20 flex max-h-[58vh] overflow-hidden rounded-t-[var(--radius-lg)] border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-[var(--shadow-panel)] lg:static lg:z-auto lg:max-h-none lg:rounded-none lg:border-t-0 lg:shadow-none">
              <Inspector
                project={project}
                selection={selection}
                report={validation.report}
                validationError={validation.error}
                tab={inspectorTab}
                width={prefs.inspectorWidth}
                onResizeWidth={(inspectorWidth) => updatePrefs({ inspectorWidth })}
                onTabChange={setInspectorTab}
                onCommit={commitProject}
                onSelect={setSelection}
                onFocusState={(stateId) => canvasRef.current?.centerOnState(stateId)}
                onClose={() => setInspectorOpen(false)}
              />
            </div>
          </>
        ) : null}
      </div>

      {dialog === 'new' ? (
        <NewProjectDialog
          recentProjects={recentProjects}
          onOpenRecent={(recent) => {
            fileService.clearActiveHandle();
            loadProject(normalizeProject(recent));
            setDialog(null);
            notify(`Proyecto restaurado: ${recent.name}`);
          }}
          onDeleteRecent={(id) => {
            void deleteProjectLocal(id)
              .then(() => listRecentProjects(8))
              .then(setRecentProjects);
          }}
          onClose={() => setDialog(null)}
          onCreate={(machineType, name) => {
            fileService.clearActiveHandle();
            loadProject(createProject(machineType, name));
            setDialog(null);
            notify('Proyecto creado.');
          }}
        />
      ) : null}

      {dialog === 'export' ? (
        <ExportDialog
          project={project}
          selection={selection}
          onClose={() => setDialog(null)}
          onNotify={notify}
        />
      ) : null}

      {dialog === 'drive' ? (
        <DriveSyncDialog
          project={project}
          onLoadProject={(next) => {
            fileService.clearActiveHandle();
            loadProject(next);
          }}
          onClose={() => setDialog(null)}
          onNotify={notify}
        />
      ) : null}

      {dialog === 'prefs' ? (
        <PreferencesDialog
          theme={theme}
          onSetTheme={setTheme}
          prefs={prefs}
          onUpdatePrefs={updatePrefs}
          onResetPrefs={resetPrefs}
          onClose={() => setDialog(null)}
        />
      ) : null}

      {dialog === 'history' ? (
        <VersionHistoryDialog
          project={project}
          onRestore={(snapshotProject, label) => {
            store.commit(() => normalizeProject(snapshotProject));
            setSelection({ kind: 'none' });
            notify(`Versión restaurada: ${label}`);
            window.setTimeout(() => canvasRef.current?.fit(), 0);
          }}
          onClose={() => setDialog(null)}
          onNotify={notify}
        />
      ) : null}

      {dialog === 'shortcuts' ? (
        <ShortcutsDialog onClose={() => setDialog(null)} />
      ) : null}

      {transformationReport ? (
        <TransformationDialog
          report={transformationReport}
          onUndo={() => {
            store.undo();
            window.setTimeout(() => canvasRef.current?.fit(), 0);
          }}
          onClose={() => setTransformationReport(null)}
        />
      ) : null}

      {dialog === 'type' && pendingFamily ? (
        <Modal
          title={
            pendingFamily === 'TM'
              ? 'Cambiar a Máquina de Turing (MT)'
              : 'Cambiar a Autómata Finito (AF)'
          }
          subtitle="Autómata Finito y Máquina de Turing son modelos distintos y no comparten reglas."
          onClose={() => {
            setDialog(null);
            setPendingFamily(null);
          }}
          footer={
            <>
              <SecondaryButton
                onClick={() => {
                  setDialog(null);
                  setPendingFamily(null);
                }}
              >
                Cancelar
              </SecondaryButton>
              <PrimaryButton onClick={() => switchToFamily(pendingFamily)}>
                Crear proyecto nuevo
              </PrimaryButton>
            </>
          }
        >
          <p className="text-[12px] leading-relaxed text-[var(--text-secondary)]">
            Se abrirá un proyecto limpio de{' '}
            <span className="font-semibold text-[var(--text-primary)]">
              {pendingFamily === 'TM' ? 'Máquina de Turing' : 'Autómata Finito'}
            </span>{' '}
            con estado inicial <span className="mono text-[var(--text-primary)]">q0</span>. Tu proyecto
            actual queda guardado automáticamente en <span className="font-medium">Recientes</span>.
          </p>
        </Modal>
      ) : null}

      {toast ? (
        <div
          className={`fixed top-14 right-4 z-50 flex max-w-sm items-start gap-2 rounded-[var(--radius-md)] border px-3 py-2 text-[12px] shadow-[var(--shadow-float)] ${
            toast.tone === 'error'
              ? 'border-[var(--accent-reject)]/40 bg-[var(--bg-surface)] text-[var(--accent-reject)]'
              : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)]'
          }`}
          role={toast.tone === 'error' ? 'alert' : 'status'}
        >
          {toast.tone === 'error' ? (
            <AlertTriangle aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          ) : (
            <CheckCircle2 aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--accent-accept)]" />
          )}
          <span className="flex-1">{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Cerrar aviso"
            className="rounded p-0.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <X aria-hidden="true" className="h-3 w-3" />
          </button>
        </div>
      ) : null}

      {opening ? (
        <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-black/20">
          <span className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-[12px] text-[var(--text-secondary)]">
            Procesando archivo…
          </span>
        </div>
      ) : null}
    </div>
  );
}
