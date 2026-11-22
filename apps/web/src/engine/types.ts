/** Tipos espejo del contrato Rust ↔ TypeScript (spec 03). */

export const SCHEMA_VERSION = '1.0.0';

export type MachineType = 'DFA' | 'NFA' | 'NFA_EPSILON' | 'TM_SINGLE' | 'TM_MULTI';
export type TapeMove = 'L' | 'R' | 'S';
export type ExpectedVerdict = 'ACCEPT' | 'REJECT';

export interface TmOperation {
  read: string;
  write: string;
  move: TapeMove;
}

export type TransitionRule =
  | { kind: 'FA'; symbol: string | null }
  | { kind: 'TM'; operations: TmOperation[] };

export interface State {
  id: string;
  label: string;
  x: number;
  y: number;
  isInitial: boolean;
  isAccepting: boolean;
  comment?: string;
}

export interface Transition {
  id: string;
  from: string;
  to: string;
  curveOffset: number;
  rule: TransitionRule;
}

export interface MachineConfig {
  alphabet: string[];
  tapeAlphabet: string[];
  blankSymbol: string;
  epsilonSymbol: string;
  tapeCount: number;
  defaultMaxSteps: number;
}

export interface TestCase {
  id: string;
  input: string;
  expected: ExpectedVerdict;
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export interface LexoProject {
  schemaVersion: string;
  id: string;
  name: string;
  description?: string;
  machineType: MachineType;
  createdAt: string;
  updatedAt: string;
  config: MachineConfig;
  states: State[];
  transitions: Transition[];
  testCases: TestCase[];
  viewport: Viewport;
}

export type EngineErrorCode =
  | 'INVALID_SCHEMA'
  | 'NO_INITIAL_STATE'
  | 'MULTIPLE_INITIAL_STATES'
  | 'NON_DETERMINISTIC_CONFLICT'
  | 'INVALID_TRANSITION_RULE'
  | 'UNSUPPORTED_OPERATION'
  | 'STEP_LIMIT_EXCEEDED'
  | 'JFLAP_PARSE_ERROR'
  | 'INTERNAL_ERROR';

export interface EngineError {
  code: EngineErrorCode;
  message: string;
  relatedIds?: string[];
}

export type EngineResult<T> = { ok: true; data: T } | { ok: false; error: EngineError };

export type WarningCode =
  | 'INCOMPLETE_DFA'
  | 'UNREACHABLE_STATES'
  | 'NO_ACCEPTING_STATES'
  | 'EPSILON_IN_NFA'
  | 'EMPTY_ALPHABET'
  | 'TRANSITION_FROM_ACCEPTING_STATE'
  | 'UNDECLARED_TAPE_SYMBOL';

export interface ValidationWarning {
  code: WarningCode;
  message: string;
  relatedIds: string[];
}

export interface ValidationReport {
  valid: boolean;
  errors: EngineError[];
  warnings: ValidationWarning[];
}

export interface FormalTransitionRow {
  transitionId: string;
  from: string;
  to: string;
  label: string;
  read: string;
  write?: string;
  moveSymbol?: TapeMove;
}

export interface FormalDefinition {
  machineType: MachineType;
  tuple: string;
  stateSet: string[];
  alphabet: string[];
  tapeAlphabet: string[];
  initialState: string;
  acceptingStates: string[];
  blankSymbol?: string;
  transitions: FormalTransitionRow[];
  text: string;
  latex: string;
}

export type FaVerdict = 'ACCEPTED' | 'REJECTED' | 'STEP_LIMIT';

export interface FaBranchTrace {
  stateId: string;
  transitionIds: string[];
}

export interface FaStepSnapshot {
  stepIndex: number;
  inputIndex: number;
  consumedSymbol: string | null;
  activeStateIds: string[];
  firedTransitionIds: string[];
  activeBranches: FaBranchTrace[];
  branchesTruncated: boolean;
}

export interface FaSimulationTrace {
  verdict: FaVerdict;
  steps: FaStepSnapshot[];
  totalSteps: number;
  inputLength: number;
  maxSteps: number;
}

export interface FaBatchResult {
  input: string;
  verdict: FaVerdict;
  steps: number;
  elapsedMicros: number;
}

export interface NfaToDfaResult {
  dfa: LexoProject;
  subsetMap: Record<string, string[]>;
}

export interface MinimizeResult {
  minimized: LexoProject;
  equivalenceClasses: string[][];
  removedUnreachable: string[];
}

export type TmStatus = 'RUNNING' | 'ACCEPTED' | 'REJECTED' | 'STEP_LIMIT';

export interface TapeSnapshot {
  cells: Record<string, string>;
  minIndex: number;
  maxIndex: number;
  headIndex: number;
}

export interface TmTapeChange {
  tapeIndex: number;
  cellIndex: number;
  prevSymbol: string;
  nextSymbol: string;
  prevHead: number;
  nextHead: number;
}

export interface TmStepDelta {
  stepIndex: number;
  prevStateId: string;
  nextStateId: string;
  firedTransitionId: string;
  tapeChanges: TmTapeChange[];
}

export interface TmRuntimeState {
  currentStateId: string;
  tape: Record<string, string>;
  headIndex: number;
  stepCount: number;
  status: TmStatus;
}

export interface TmStepSnapshot {
  stepIndex: number;
  currentStateId: string;
  tape: TapeSnapshot;
  status: TmStatus;
}

export interface TmStepResult {
  snapshot: TmStepSnapshot;
  firedTransitionId?: string;
  delta?: TmStepDelta;
  verdict: TmStatus;
}

export interface TmFullRunResult {
  verdict: TmStatus;
  finalStateId: string;
  tape: TapeSnapshot;
  totalSteps: number;
  deltas: TmStepDelta[];
}

export interface TmBatchResult {
  input: string[];
  verdict: TmStatus;
  steps: number;
  tape: Record<string, string>;
}

export interface ExampleEntry {
  id: string;
  project: LexoProject;
}

export function isFiniteAutomaton(type: MachineType): boolean {
  return type === 'DFA' || type === 'NFA' || type === 'NFA_EPSILON';
}

export function isTuring(type: MachineType): boolean {
  return type === 'TM_SINGLE' || type === 'TM_MULTI';
}

export function machineTypeLabel(type: MachineType): string {
  switch (type) {
    case 'DFA':
      return 'AFD';
    case 'NFA':
      return 'AFN';
    case 'NFA_EPSILON':
      return 'AFN-ε';
    case 'TM_SINGLE':
      return 'MT 1 cinta';
    case 'TM_MULTI':
      return 'MT multicinta';
  }
}
