import { useCallback, useEffect, useRef, useState } from 'react';
import { initTuring, rewindTuring, runTuringFull, stepTuring } from '../engine/wasmAdapter';
import { isTuring } from '../engine/types';
import type {
  LexoProject,
  TmRuntimeState,
  TmStatus,
  TmStepDelta,
  TmStepSnapshot,
} from '../engine/types';

export interface TuringSimulation {
  input: string;
  setInput: (input: string) => void;
  snapshot: TmStepSnapshot | null;
  runtime: TmRuntimeState | null;
  status: TmStatus;
  firedTransitionId: string | null;
  lastRuleLabel: string | null;
  playing: boolean;
  speed: number;
  setSpeed: (speed: number) => void;
  busy: boolean;
  error: string | null;
  stepForward: () => Promise<void>;
  stepBack: () => Promise<void>;
  fastRun: () => Promise<void>;
  reset: () => Promise<void>;
  togglePlay: () => void;
  setTapeCell: (index: number, symbol: string) => void;
  centerHead: number;
}

const SPEEDS = [900, 650, 420, 220];

function runtimeFromSnapshot(snapshot: TmStepSnapshot): TmRuntimeState {
  return {
    currentStateId: snapshot.currentStateId,
    tape: { ...snapshot.tape.cells },
    headIndex: snapshot.tape.headIndex,
    stepCount: snapshot.stepIndex,
    status: snapshot.status,
  };
}

function snapshotFromRuntime(runtime: TmRuntimeState): TmStepSnapshot {
  const indices = Object.keys(runtime.tape).map(Number);
  const minIndex = indices.length > 0 ? Math.min(...indices) : runtime.headIndex;
  const maxIndex = indices.length > 0 ? Math.max(...indices) : runtime.headIndex;

  return {
    stepIndex: runtime.stepCount,
    currentStateId: runtime.currentStateId,
    tape: {
      cells: { ...runtime.tape },
      minIndex,
      maxIndex,
      headIndex: runtime.headIndex,
    },
    status: runtime.status,
  };
}

function tapeBounds(cells: Record<string, string>, head: number): { minIndex: number; maxIndex: number } {
  const indices = Object.keys(cells).map(Number);
  if (indices.length === 0) {
    return { minIndex: head, maxIndex: head };
  }
  return { minIndex: Math.min(...indices), maxIndex: Math.max(...indices) };
}

export function useTuringSimulation(project: LexoProject): TuringSimulation {
  const [input, setInputState] = useState('');
  const [snapshot, setSnapshot] = useState<TmStepSnapshot | null>(null);
  const [runtime, setRuntime] = useState<TmRuntimeState | null>(null);
  const [deltas, setDeltas] = useState<TmStepDelta[]>([]);
  const [firedTransitionId, setFiredTransitionId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(SPEEDS[1] ?? 650);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const projectRef = useRef(project);
  projectRef.current = project;

  const initialize = useCallback(
    async (value: string) => {
      const activeProject = projectRef.current;
      if (!isTuring(activeProject.machineType)) {
        return;
      }

      const current = ++generation.current;
      setBusy(true);
      setError(null);
      setPlaying(false);

      try {
        const next = await initTuring(activeProject, [value]);
        if (current !== generation.current) {
          return;
        }
        const nextRuntime = runtimeFromSnapshot(next);
        setSnapshot(next);
        setRuntime(nextRuntime);
        setDeltas([]);
        setFiredTransitionId(null);
      } catch (caught) {
        if (current === generation.current) {
          setSnapshot(null);
          setRuntime(null);
          setDeltas([]);
          setError(caught instanceof Error ? caught.message : 'No se pudo inicializar la cinta.');
        }
      } finally {
        if (current === generation.current) {
          setBusy(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (!isTuring(project.machineType)) {
      return;
    }

    const timer = window.setTimeout(() => {
      void initialize(input);
    }, 180);

    return () => window.clearTimeout(timer);
  }, [initialize, input, project.id, project.machineType]);

  const setInput = useCallback((value: string) => {
    setInputState(value);
    setSnapshot(null);
    setRuntime(null);
    setDeltas([]);
    setFiredTransitionId(null);
    setPlaying(false);
    setError(null);
  }, []);

  const stepForward = useCallback(async () => {
    if (!runtime) {
      await initialize(input);
      return;
    }
    if (runtime.status !== 'RUNNING') {
      setPlaying(false);
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const result = await stepTuring(projectRef.current, runtime);
      const nextRuntime = runtimeFromSnapshot(result.snapshot);
      setSnapshot(result.snapshot);
      setRuntime(nextRuntime);
      setFiredTransitionId(result.firedTransitionId ?? null);
      if (result.delta) {
        setDeltas((current) => [...current, result.delta as TmStepDelta]);
      }
      if (result.verdict !== 'RUNNING') {
        setPlaying(false);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo ejecutar el paso.');
      setPlaying(false);
    } finally {
      setBusy(false);
    }
  }, [runtime, input, initialize]);

  const stepBack = useCallback(async () => {
    if (!runtime || deltas.length === 0) {
      return;
    }

    const last = deltas[deltas.length - 1];
    if (!last) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const activeProject = projectRef.current;
      const restored = await rewindTuring(activeProject, runtime, [last]);
      setRuntime(restored);
      setSnapshot(snapshotFromRuntime(restored));
      setDeltas((current) => current.slice(0, -1));
      setFiredTransitionId(null);
      setPlaying(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo retroceder el paso.');
    } finally {
      setBusy(false);
    }
  }, [runtime, deltas]);

  const fastRun = useCallback(async () => {
    const current = ++generation.current;
    setBusy(true);
    setPlaying(false);
    setError(null);

    try {
      const result = await runTuringFull(projectRef.current, [input], 0);
      if (current !== generation.current) {
        return;
      }

      const nextRuntime: TmRuntimeState = {
        currentStateId: result.finalStateId,
        tape: { ...result.tape.cells },
        headIndex: result.tape.headIndex,
        stepCount: result.totalSteps,
        status: result.verdict,
      };
      const lastDelta = result.deltas[result.deltas.length - 1];

      setSnapshot({
        stepIndex: result.totalSteps,
        currentStateId: result.finalStateId,
        tape: result.tape,
        status: result.verdict,
      });
      setRuntime(nextRuntime);
      setDeltas(result.deltas);
      setFiredTransitionId(lastDelta?.firedTransitionId ?? null);
    } catch (caught) {
      if (current === generation.current) {
        setError(caught instanceof Error ? caught.message : 'No se pudo ejecutar la máquina.');
      }
    } finally {
      if (current === generation.current) {
        setBusy(false);
      }
    }
  }, [input]);

  const reset = useCallback(async () => {
    await initialize(input);
  }, [initialize, input]);

  const togglePlay = useCallback(() => {
    setPlaying((current) => {
      if (!current && (!runtime || runtime.status !== 'RUNNING')) {
        void initialize(input);
      }
      return !current;
    });
  }, [runtime, input, initialize]);

  useEffect(() => {
    if (!playing) {
      return;
    }

    if (!runtime || runtime.status !== 'RUNNING') {
      setPlaying(false);
      return;
    }

    const timer = window.setTimeout(() => {
      void stepForward();
    }, speed);

    return () => window.clearTimeout(timer);
  }, [playing, runtime, speed, stepForward]);

  const setTapeCell = useCallback(
    (index: number, symbol: string) => {
      if (!runtime) {
        return;
      }

      const blank = project.config.blankSymbol;
      const tape = { ...runtime.tape };
      if (symbol === '' || symbol === blank) {
        delete tape[String(index)];
      } else {
        tape[String(index)] = symbol;
      }

      const bounds = tapeBounds(tape, runtime.headIndex);
      const nextRuntime: TmRuntimeState = {
        ...runtime,
        tape,
        status: runtime.status === 'RUNNING' ? 'RUNNING' : runtime.status,
      };

      setRuntime(nextRuntime);
      setSnapshot((current) =>
        current
          ? {
              ...current,
              tape: {
                cells: tape,
                minIndex: bounds.minIndex,
                maxIndex: bounds.maxIndex,
                headIndex: runtime.headIndex,
              },
            }
          : current,
      );
      setDeltas([]);
      setFiredTransitionId(null);
    },
    [project.config.blankSymbol, runtime],
  );

  const lastRuleLabel = firedTransitionId
    ? (() => {
        const transition = project.transitions.find(
          (candidate) => candidate.id === firedTransitionId,
        );
        if (!transition || transition.rule.kind !== 'TM') {
          return null;
        }
        const operation = transition.rule.operations[0];
        return operation
          ? `${operation.read} ; ${operation.write}, ${operation.move}`
          : null;
      })()
    : null;

  return {
    input,
    setInput,
    snapshot,
    runtime,
    status: snapshot?.status ?? 'RUNNING',
    firedTransitionId,
    lastRuleLabel,
    playing,
    speed,
    setSpeed,
    busy,
    error,
    stepForward,
    stepBack,
    fastRun,
    reset,
    togglePlay,
    setTapeCell,
    centerHead: snapshot?.tape.headIndex ?? 0,
  };
}
