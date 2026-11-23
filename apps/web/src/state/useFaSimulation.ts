import { useCallback, useEffect, useRef, useState } from 'react';
import { simulateFa } from '../engine/wasmAdapter';
import type { FaSimulationTrace, FaVerdict, LexoProject } from '../engine/types';

export interface FaSimulation {
  input: string;
  setInput: (input: string) => void;
  trace: FaSimulationTrace | null;
  stepIndex: number;
  playing: boolean;
  speed: number;
  setSpeed: (speed: number) => void;
  busy: boolean;
  error: string | null;
  activeStateIds: string[];
  firedTransitionIds: string[];
  consumedCount: number;
  verdict: FaVerdict | null;
  run: () => Promise<void>;
  fastRun: () => Promise<void>;
  stepForward: () => Promise<void>;
  stepBack: () => void;
  reset: () => void;
  togglePlay: () => void;
}

const SPEEDS = [900, 650, 420, 220];

function structureSignature(project: LexoProject): string {
  const statesKey = project.states
    .map((s) => `${s.id}:${s.isInitial ? 1 : 0}:${s.isAccepting ? 1 : 0}`)
    .join('|');
  const transKey = project.transitions
    .map((t) => `${t.id}:${t.from}->${t.to}:${JSON.stringify(t.rule)}`)
    .join('|');
  return `${project.id}::${project.machineType}::${project.config.epsilonSymbol}::${statesKey}::${transKey}`;
}

export function useFaSimulation(project: LexoProject): FaSimulation {
  const [input, setInputState] = useState('');
  const [trace, setTrace] = useState<FaSimulationTrace | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(SPEEDS[1] ?? 650);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const signature = structureSignature(project);

  useEffect(() => {
    generation.current += 1;
    setTrace(null);
    setStepIndex(0);
    setPlaying(false);
    setError(null);
  }, [signature]);

  const setInput = useCallback((value: string) => {
    setInputState(value);
    setTrace(null);
    setStepIndex(0);
    setPlaying(false);
    setError(null);
  }, []);

  const run = useCallback(async () => {
    const current = ++generation.current;
    setBusy(true);
    setError(null);

    try {
      const next = await simulateFa(project, input, 0);
      if (current === generation.current) {
        setTrace(next);
        setStepIndex(0);
      }
    } catch (caught) {
      if (current === generation.current) {
        setTrace(null);
        setError(caught instanceof Error ? caught.message : 'No se pudo simular la cadena.');
      }
    } finally {
      if (current === generation.current) {
        setBusy(false);
      }
    }
  }, [project, input]);

  const fastRun = useCallback(async () => {
    const current = ++generation.current;
    setBusy(true);
    setPlaying(false);
    setError(null);

    try {
      const next = await simulateFa(project, input, 0);
      if (current === generation.current) {
        setTrace(next);
        setStepIndex(Math.max(0, next.steps.length - 1));
      }
    } catch (caught) {
      if (current === generation.current) {
        setTrace(null);
        setError(caught instanceof Error ? caught.message : 'No se pudo simular la cadena.');
      }
    } finally {
      if (current === generation.current) {
        setBusy(false);
      }
    }
  }, [project, input]);

  const stepForward = useCallback(async () => {
    if (!trace) {
      const current = ++generation.current;
      setBusy(true);
      setError(null);
      try {
        const next = await simulateFa(project, input, 0);
        if (current === generation.current) {
          setTrace(next);
          setStepIndex(Math.min(1, Math.max(0, next.steps.length - 1)));
        }
      } catch (caught) {
        if (current === generation.current) {
          setTrace(null);
          setError(caught instanceof Error ? caught.message : 'No se pudo simular la cadena.');
        }
      } finally {
        if (current === generation.current) {
          setBusy(false);
        }
      }
      return;
    }
    setStepIndex((index) => Math.min(index + 1, trace.steps.length - 1));
  }, [trace, project, input]);

  const stepBack = useCallback(() => {
    setPlaying(false);
    setStepIndex((index) => Math.max(0, index - 1));
  }, []);

  const reset = useCallback(() => {
    generation.current += 1;
    setTrace(null);
    setStepIndex(0);
    setPlaying(false);
    setError(null);
  }, []);

  const togglePlay = useCallback(() => {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (!trace) {
      void run().then(() => setPlaying(true));
      return;
    }
    if (stepIndex >= trace.steps.length - 1) {
      setStepIndex(0);
    }
    setPlaying(true);
  }, [playing, trace, stepIndex, run]);

  useEffect(() => {
    if (!playing || !trace) {
      return;
    }

    if (stepIndex >= trace.steps.length - 1) {
      setPlaying(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setStepIndex((index) => Math.min(index + 1, trace.steps.length - 1));
    }, speed);

    return () => window.clearTimeout(timer);
  }, [playing, trace, stepIndex, speed]);

  const snapshot = trace?.steps[stepIndex];
  const atEnd = trace ? stepIndex >= trace.steps.length - 1 : false;

  return {
    input,
    setInput,
    trace,
    stepIndex,
    playing,
    speed,
    setSpeed,
    busy,
    error,
    activeStateIds: snapshot?.activeStateIds ?? [],
    firedTransitionIds: snapshot?.firedTransitionIds ?? [],
    consumedCount: snapshot?.inputIndex ?? 0,
    verdict: atEnd ? (trace?.verdict ?? null) : null,
    run,
    fastRun,
    stepForward,
    stepBack,
    reset,
    togglePlay,
  };
}
