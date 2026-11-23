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
import { SimulationBar } from './components/SimulationBar';
import { TopBar } from './components/TopBar';
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
import { machineTypeLabel, type ExampleEntry, type LexoProject, type MachineType } from './engine/types';
import {
  addState,
  addTransition,
  changeMachineType,
  createId,
  createProject,
  invertEdgeGroup,
  normalizeProject,
  projectFileName,
  reassignEdgeGroup,
  removeStates,
  removeTransitions,
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
} from './storage/localDb';
import type { CanvasHandle, InspectorTab, Selection, Tool } from './uiTypes';
import { fileService } from './platform/fileService';
import { completeWebOAuthRedirect } from './platform/gdriveSync';
import { layoutStates, type LayoutStrategy } from './utils/layout';

type Dialog = 'new' | 'export' | 'type' | 'drive' | 'prefs' | null;

interface Toast {
  message: string;
  tone: 'info' | 'error';
}

export function App() {
  const store = useProjectStore();
  const { project } = store;
  const validation = useValidation(project);
  const { theme, toggleTheme } = useTheme();
  const { prefs, updatePrefs, resetPrefs } = useUiPrefs();
  const fa = useFaSimulation(project);
  const tm = useTuringSimulation(project);

  const [tool, setTool] = useState<Tool>('select');
  const [selection, setSelection] = useState<Selection>({ kind: 'none' });
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('properties');
  const [dialog, setDialog] = useState<Dialog>(null);
  const [transformationReport, setTransformationReport] = useState<TransformationReport | null>(null);
  const [pendingType, setPendingType] = useState<MachineType | null>(null);
  const [examples, setExamples] = useState<ExampleEntry[]>([]);
  const [recentProjects, setRecentProjects] = useState<LexoProject[]>([]);
  const [toast, setToast] = useState<Toast | null>(null);
  const [opening, setOpening] = useState(false);

  const canvasRef = useRef<CanvasHandle>(null);
  const draggingRef = useRef(false);
  const toastTimer = useRef<number | null>(null);
  const restoredRef = useRef(false);

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
          if (saved && !cancelled && !restoredRef.current) {
            restoredRef.current = true;
            store.resetProject(normalizeProject(saved));
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
    const timer = window.setTimeout(() => {
      void saveProjectLocal(project)
        .then(() => saveLastProjectId(project.id))
        .then(() => listRecentProjects(8))
        .then(setRecentProjects)
        .catch(() => {
          // Silencioso en entornos sin IndexedDB persistente.
        });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [project]);

  const loadProject = useCallback(
    (next: LexoProject) => {
      store.resetProject(next);
      setSelection({ kind: 'none' });
      setTool('select');
      setInspectorTab('properties');
    },
    [store],
  );

  const applyMachineType = useCallback(
    (type: MachineType) => {
      const droppedEpsilon = project.transitions.some(
        (transition) => transition.rule.kind === 'FA' && transition.rule.symbol === null,
      );
      store.commit((current) => changeMachineType(current, type));
      setDialog(null);
      setPendingType(null);
      setSelection({ kind: 'none' });
      if (droppedEpsilon && (type === 'TM_SINGLE' || type === 'TM_MULTI')) {
        notify('Se descartaron las transiciones ε al convertir a máquina de Turing.');
      } else {
        notify('Tipo de máquina actualizado.');
      }
      window.setTimeout(() => canvasRef.current?.fit(), 0);
    },
    [project.transitions, store, notify],
  );

  const handleRequestMachineType = useCallback(
    (type: MachineType) => {
      if (type === project.machineType) {
        return;
      }
      if (project.transitions.length > 0) {
        setPendingType(type);
        setDialog('type');
      } else {
        applyMachineType(type);
      }
    },
    [project.machineType, project.transitions.length, applyMachineType],
  );

  const handleCreateState = useCallback(
    (x: number, y: number) => {
      const result = addState(project, x, y);
      store.commit(() => result.project);
      setSelection({ kind: 'state', id: result.stateId });
    },
    [project, store],
  );

  const handleCreateTransition = useCallback(
    (from: string, to: string) => {
      const result = addTransition(project, from, to);
      store.commit(() => result.project);
      setSelection({ kind: 'edge', from, to });
      setInspectorTab('properties');
    },
    [project, store],
  );

  const handleMoveState = useCallback(
    (id: string, x: number, y: number, final: boolean) => {
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
      store.commit((current) => removeStates(current, [selection.id]));
    } else if (selection.kind === 'edge') {
      store.commit((current) =>
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
  }, [selection, store]);

  const handleDeleteState = useCallback(
    (id: string) => {
      store.commit((current) => removeStates(current, [id]));
      setSelection({ kind: 'none' });
    },
    [store],
  );

  const handleRename = useCallback(
    (name: string) => {
      store.commit((current) => touchProject({ ...current, name }));
    },
    [store],
  );

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
      loadProject({ ...next, id: createId('project') });
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
      const target = event.target as HTMLElement | null;
      if (
        target?.closest('input, textarea, select, [contenteditable="true"]') ||
        target?.isContentEditable
      ) {
        return;
      }

      const modifier = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();

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
        saveLexo();
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

      if (modifier) {
        return;
      }

      if (key === 'v') {
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
      } else if (event.key === 'Escape') {
        setTool('select');
        setSelection({ kind: 'none' });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [store, saveLexo, deleteSelection]);

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
        onNew={() => setDialog('new')}
        onOpenLexo={() => void openLexo()}
        onOpenJff={() => void openJff()}
        onSaveLexo={saveLexo}
        onExportJff={() => void saveJflap()}
        onOpenExport={() => setDialog('export')}
        onLoadExample={(entry) => {
          fileService.clearActiveHandle();
          loadProject({ ...entry.project, id: createId('project') });
          notify(`Ejemplo cargado: ${entry.project.name}`);
        }}
        onRequestMachineType={handleRequestMachineType}
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
              onEditEdge={(from, to) => {
                setSelection({ kind: 'edge', from, to });
                setInspectorTab('properties');
                setInspectorOpen(true);
              }}
              onInvertEdge={(from, to) => {
                store.commit((current) => invertEdgeGroup(current, from, to));
                setSelection({ kind: 'edge', from: to, to: from });
              }}
              onReassignEdge={(from, to, nextFrom, nextTo) => {
                store.commit((current) => reassignEdgeGroup(current, from, to, nextFrom, nextTo));
                setSelection({ kind: 'edge', from: nextFrom, to: nextTo });
              }}
              onUpdateEdgeComment={(from, to, comment) => {
                store.commit((current) => updateEdgeGroupComment(current, from, to, comment));
              }}
              onDeleteEdge={(from, to) => {
                const ids = project.transitions
                  .filter((transition) => transition.from === from && transition.to === to)
                  .map((transition) => transition.id);
                store.commit((current) => removeTransitions(current, ids));
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
                onCommit={store.commit}
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
          onToggleTheme={toggleTheme}
          prefs={prefs}
          onUpdatePrefs={updatePrefs}
          onResetPrefs={resetPrefs}
          onClose={() => setDialog(null)}
        />
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

      {dialog === 'type' && pendingType ? (
        <Modal
          title="Cambiar tipo de máquina"
          subtitle="Las transiciones existentes se adaptarán al nuevo modelo."
          onClose={() => {
            setDialog(null);
            setPendingType(null);
          }}
          footer={
            <>
              <SecondaryButton
                onClick={() => {
                  setDialog(null);
                  setPendingType(null);
                }}
              >
                Cancelar
              </SecondaryButton>
              <PrimaryButton onClick={() => applyMachineType(pendingType)}>
                Convertir
              </PrimaryButton>
            </>
          }
        >
          <p className="text-[12px] leading-relaxed text-[var(--text-secondary)]">
            Vas a cambiar de{' '}
            <span className="mono text-[var(--text-primary)]">
              {machineTypeLabel(project.machineType)}
            </span>{' '}
            a <span className="mono text-[var(--text-primary)]">{machineTypeLabel(pendingType)}</span>.
            Las reglas de autómata finito se convertirán en operaciones de cinta (leyendo el mismo
            símbolo, moviendo a la derecha) y viceversa.
          </p>
          {project.transitions.some(
            (transition) => transition.rule.kind === 'FA' && transition.rule.symbol === null,
          ) && (pendingType === 'TM_SINGLE' || pendingType === 'TM_MULTI') ? (
            <p className="mt-3 flex items-start gap-1.5 rounded-[var(--radius-sm)] border border-[var(--accent-warning)]/40 bg-[var(--accent-warning-soft)] px-2 py-1.5 text-[11px] text-[var(--accent-warning)]">
              <AlertTriangle aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Las transiciones ε no tienen equivalente directo en una máquina de Turing y se descartarán.
            </p>
          ) : null}
        </Modal>
      ) : null}

      {toast ? (
        <div
          className={`fixed bottom-4 right-4 z-50 flex max-w-sm items-start gap-2 rounded-[var(--radius-md)] border px-3 py-2 text-[12px] shadow-[var(--shadow-float)] ${
            toast.tone === 'error'
              ? 'border-[var(--accent-reject)]/40 bg-[var(--bg-surface)] text-[var(--accent-reject)]'
              : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)]'
          }`}
          role="status"
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
