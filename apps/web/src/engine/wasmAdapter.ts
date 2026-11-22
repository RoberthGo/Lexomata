import init, {
  engine_version,
  export_jflap_xml,
  fa_batch_run,
  fa_minimize_dfa,
  fa_nfa_to_dfa,
  fa_simulate_full,
  get_formal_definition,
  import_jflap_xml,
  list_examples,
  tm_batch_run,
  tm_init,
  tm_rewind,
  tm_run_full,
  tm_runtime_from_snapshot,
  tm_step,
  validate_machine,
} from '../wasm/lexomata_wasm.js';
import type {
  EngineError,
  EngineResult,
  ExampleEntry,
  FaBatchResult,
  FaSimulationTrace,
  FormalDefinition,
  LexoProject,
  MinimizeResult,
  NfaToDfaResult,
  TmBatchResult,
  TmFullRunResult,
  TmRuntimeState,
  TmStepDelta,
  TmStepResult,
  TmStepSnapshot,
  ValidationReport,
} from './types';

let initialization: Promise<void> | null = null;

/** Error tipado lanzado por el adaptador WASM. */
export class EngineClientError extends Error {
  readonly code: EngineError['code'];
  readonly relatedIds: string[];

  constructor(error: EngineError) {
    super(error.message);
    this.name = 'EngineClientError';
    this.code = error.code;
    this.relatedIds = error.relatedIds ?? [];
  }
}

/**
 * Inicializa el módulo WASM una sola vez.
 * Todas las llamadas al motor deben pasar por este adaptador.
 */
export function initEngine(): Promise<void> {
  if (!initialization) {
    initialization = init().then(() => undefined);
  }
  return initialization;
}

function parseEnvelope<T>(raw: string): T {
  let parsed: EngineResult<T>;

  try {
    parsed = JSON.parse(raw) as EngineResult<T>;
  } catch {
    throw new EngineClientError({
      code: 'INTERNAL_ERROR',
      message: 'El motor devolvió una respuesta que no es JSON válido.',
    });
  }

  if (!parsed.ok) {
    throw new EngineClientError(parsed.error);
  }

  return parsed.data;
}

async function call<T>(invoke: () => string): Promise<T> {
  await initEngine();
  return parseEnvelope<T>(invoke());
}

/** Versión del motor Rust, usada por la comprobación de humo. */
export async function getEngineVersion(): Promise<string> {
  await initEngine();
  return engine_version();
}

export function validateProject(project: LexoProject): Promise<ValidationReport> {
  return call(() => validate_machine(JSON.stringify(project)));
}

export function getFormalDefinition(project: LexoProject): Promise<FormalDefinition> {
  return call(() => get_formal_definition(JSON.stringify(project)));
}

export function simulateFa(
  project: LexoProject,
  input: string,
  maxSteps = 0,
): Promise<FaSimulationTrace> {
  return call(() => fa_simulate_full(JSON.stringify(project), input, maxSteps));
}

export function runFaBatch(
  project: LexoProject,
  inputs: string[],
  maxSteps = 0,
): Promise<FaBatchResult[]> {
  return call(() => fa_batch_run(JSON.stringify(project), JSON.stringify(inputs), maxSteps));
}

export function convertNfaToDfa(
  project: LexoProject,
  includeDeadState = false,
): Promise<NfaToDfaResult> {
  return call(() => fa_nfa_to_dfa(JSON.stringify(project), includeDeadState));
}

export function minimizeDfa(project: LexoProject): Promise<MinimizeResult> {
  return call(() => fa_minimize_dfa(JSON.stringify(project)));
}

export function initTuring(
  project: LexoProject,
  tapeInputs: string[],
): Promise<TmStepSnapshot> {
  return call(() => tm_init(JSON.stringify(project), JSON.stringify(tapeInputs)));
}

export function runtimeFromSnapshot(snapshot: TmStepSnapshot): Promise<TmRuntimeState> {
  return call(() => tm_runtime_from_snapshot(JSON.stringify(snapshot)));
}

export function stepTuring(
  project: LexoProject,
  runtime: TmRuntimeState,
): Promise<TmStepResult> {
  return call(() => tm_step(JSON.stringify(project), JSON.stringify(runtime)));
}

export function runTuringFull(
  project: LexoProject,
  tapeInputs: string[],
  maxSteps = 0,
): Promise<TmFullRunResult> {
  return call(() => tm_run_full(JSON.stringify(project), JSON.stringify(tapeInputs), maxSteps));
}

export function runTuringBatch(
  project: LexoProject,
  cases: string[][],
  maxSteps = 0,
): Promise<TmBatchResult[]> {
  return call(() => tm_batch_run(JSON.stringify(project), JSON.stringify(cases), maxSteps));
}

export function rewindTuring(
  project: LexoProject,
  runtime: TmRuntimeState,
  deltas: TmStepDelta[],
): Promise<TmRuntimeState> {
  return call(() => tm_rewind(JSON.stringify(project), JSON.stringify(runtime), JSON.stringify(deltas)));
}

export function importJflap(xml: string): Promise<LexoProject> {
  return call(() => import_jflap_xml(xml));
}

export function exportJflap(project: LexoProject): Promise<string> {
  return call(() => export_jflap_xml(JSON.stringify(project)));
}

export function getExamples(): Promise<ExampleEntry[]> {
  return call(() => list_examples());
}
