import {
  SCHEMA_VERSION,
  isFiniteAutomaton,
  isTuring,
  type LexoProject,
  type MachineConfig,
  type MachineType,
  type State,
  type TestCase,
  type TmOperation,
  type Transition,
  type TransitionRule,
} from '../engine/types';

export const EMPTY_PROJECT_NAME = 'Proyecto sin título';

const DEFAULT_CONFIG: MachineConfig = {
  alphabet: [],
  tapeAlphabet: [],
  blankSymbol: '□',
  epsilonSymbol: 'ε',
  tapeCount: 1,
  defaultMaxSteps: 10_000,
};

export function createId(prefix: string): string {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${random}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

/** Proyecto vacío con un único estado inicial `q0`. */
export function createProject(machineType: MachineType = 'DFA', name = EMPTY_PROJECT_NAME): LexoProject {
  const timestamp = nowIso();
  const config: MachineConfig = isTuring(machineType)
    ? {
        ...DEFAULT_CONFIG,
        alphabet: ['0', '1'],
        tapeAlphabet: ['0', '1', DEFAULT_CONFIG.blankSymbol],
        tapeCount: 1,
      }
    : { ...DEFAULT_CONFIG, alphabet: ['0', '1'] };

  return {
    schemaVersion: SCHEMA_VERSION,
    id: createId('project'),
    name,
    machineType,
    createdAt: timestamp,
    updatedAt: timestamp,
    config,
    states: [
      {
        id: 's0',
        label: 'q0',
        x: 260,
        y: 260,
        isInitial: true,
        isAccepting: false,
      },
    ],
    transitions: [],
    testCases: [],
    viewport: { x: 0, y: 0, zoom: 1 },
  };
}

export function touchProject(project: LexoProject): LexoProject {
  return { ...project, updatedAt: nowIso() };
}

export function stateLabel(project: LexoProject, stateId: string): string {
  return project.states.find((state) => state.id === stateId)?.label ?? stateId;
}

export function nextStateLabel(project: LexoProject): string {
  const used = new Set(project.states.map((state) => state.label));
  let index = 0;
  while (used.has(`q${index}`)) {
    index += 1;
  }
  return `q${index}`;
}

export function nextStateId(project: LexoProject): string {
  const used = new Set(project.states.map((state) => state.id));
  let index = 0;
  while (used.has(`s${index}`)) {
    index += 1;
  }
  return `s${index}`;
}

export function nextTransitionId(project: LexoProject): string {
  const used = new Set(project.transitions.map((transition) => transition.id));
  let index = 0;
  while (used.has(`t${index}`)) {
    index += 1;
  }
  return `t${index}`;
}

export function addState(project: LexoProject, x: number, y: number): { project: LexoProject; stateId: string } {
  const state: State = {
    id: nextStateId(project),
    label: nextStateLabel(project),
    x,
    y,
    isInitial: project.states.length === 0,
    isAccepting: false,
  };

  return {
    project: touchProject({ ...project, states: [...project.states, state] }),
    stateId: state.id,
  };
}

export function defaultRuleFor(project: LexoProject, symbol?: string): TransitionRule {
  if (isTuring(project.machineType)) {
    const read = symbol ?? project.config.blankSymbol;
    return {
      kind: 'TM',
      operations: [{ read, write: read, move: 'R' }],
    };
  }

  return { kind: 'FA', symbol: symbol ?? null };
}

function nextFreeFaSymbol(project: LexoProject, from: string): string | undefined {
  const candidates = project.config.alphabet.filter(Boolean);
  if (candidates.length === 0) {
    return undefined;
  }
  if (project.machineType !== 'DFA') {
    return candidates[0];
  }
  const used = new Set(
    project.transitions
      .filter((t) => t.from === from && t.rule.kind === 'FA' && t.rule.symbol !== null)
      .map((t) => (t.rule.kind === 'FA' ? t.rule.symbol : null))
      .filter((symbol): symbol is string => symbol !== null),
  );
  return candidates.find((symbol) => !used.has(symbol)) ?? candidates[0];
}

export function addTransition(
  project: LexoProject,
  from: string,
  to: string,
  rule?: TransitionRule,
): { project: LexoProject; transitionId: string } {
  const transition: Transition = {
    id: nextTransitionId(project),
    from,
    to,
    curveOffset: 0,
    rule: rule ?? defaultRuleFor(project, nextFreeFaSymbol(project, from)),
  };

  return {
    project: touchProject({ ...project, transitions: [...project.transitions, transition] }),
    transitionId: transition.id,
  };
}

export function moveStatesByDelta(
  project: LexoProject,
  stateIds: Iterable<string>,
  dx: number,
  dy: number,
  snap?: (value: number) => number,
): LexoProject {
  const targets = new Set(stateIds);
  if (targets.size === 0 || (dx === 0 && dy === 0)) {
    return project;
  }
  return touchProject({
    ...project,
    states: project.states.map((state) => {
      if (!targets.has(state.id)) {
        return state;
      }
      const nextX = snap ? snap(state.x + dx) : Math.round(state.x + dx);
      const nextY = snap ? snap(state.y + dy) : Math.round(state.y + dy);
      return { ...state, x: nextX, y: nextY };
    }),
  });
}

export function pasteSubgraph(
  project: LexoProject,
  sourceStates: State[],
  sourceTransitions: Transition[],
  offsetX = 40,
  offsetY = 40,
): { project: LexoProject; stateIds: string[] } {
  if (sourceStates.length === 0) {
    return { project, stateIds: [] };
  }

  let current = project;
  const idMap = new Map<string, string>();
  const createdIds: string[] = [];

  for (const state of sourceStates) {
    const added = addState(current, Math.round(state.x + offsetX), Math.round(state.y + offsetY));
    idMap.set(state.id, added.stateId);
    createdIds.push(added.stateId);
    current = updateState(added.project, added.stateId, {
      isAccepting: state.isAccepting,
      comment: state.comment,
    });
  }

  for (const transition of sourceTransitions) {
    const mappedFrom = idMap.get(transition.from);
    const mappedTo = idMap.get(transition.to);
    if (!mappedFrom || !mappedTo) {
      continue;
    }
    const added = addTransition(
      current,
      mappedFrom,
      mappedTo,
      JSON.parse(JSON.stringify(transition.rule)) as TransitionRule,
    );
    current = updateTransition(added.project, added.transitionId, {
      curveOffset: transition.curveOffset,
      comment: transition.comment,
    });
  }

  return { project: current, stateIds: createdIds };
}

export function updateState(
  project: LexoProject,
  stateId: string,
  patch: Partial<Omit<State, 'id'>>,
): LexoProject {
  return touchProject({
    ...project,
    states: project.states.map((state) => (state.id === stateId ? { ...state, ...patch } : state)),
  });
}

export function updateTransition(
  project: LexoProject,
  transitionId: string,
  patch: Partial<Omit<Transition, 'id'>>,
): LexoProject {
  return touchProject({
    ...project,
    transitions: project.transitions.map((transition) =>
      transition.id === transitionId ? { ...transition, ...patch } : transition,
    ),
  });
}

export function removeStates(project: LexoProject, stateIds: Iterable<string>): LexoProject {
  const removed = new Set(stateIds);
  if (removed.size === 0) {
    return project;
  }

  return touchProject({
    ...project,
    states: project.states.filter((state) => !removed.has(state.id)),
    transitions: project.transitions.filter(
      (transition) => !removed.has(transition.from) && !removed.has(transition.to),
    ),
  });
}

export function removeTransitions(project: LexoProject, transitionIds: Iterable<string>): LexoProject {
  const removed = new Set(transitionIds);
  if (removed.size === 0) {
    return project;
  }

  return touchProject({
    ...project,
    transitions: project.transitions.filter((transition) => !removed.has(transition.id)),
  });
}

function mapEdgeGroup(
  project: LexoProject,
  from: string,
  to: string,
  transform: (transition: Transition) => Transition,
): LexoProject {
  let changed = false;
  const transitions = project.transitions.map((transition) => {
    if (transition.from !== from || transition.to !== to) {
      return transition;
    }
    changed = true;
    return transform(transition);
  });

  return changed ? touchProject({ ...project, transitions }) : project;
}

export function invertEdgeGroup(project: LexoProject, from: string, to: string): LexoProject {
  if (from === to) {
    return project;
  }
  return mapEdgeGroup(project, from, to, (transition) => ({
    ...transition,
    from: to,
    to: from,
  }));
}

export function reassignEdgeGroup(
  project: LexoProject,
  from: string,
  to: string,
  nextFrom: string,
  nextTo: string,
): LexoProject {
  if (from === nextFrom && to === nextTo) {
    return project;
  }
  return mapEdgeGroup(project, from, to, (transition) => ({
    ...transition,
    from: nextFrom,
    to: nextTo,
  }));
}

export function updateEdgeGroupComment(
  project: LexoProject,
  from: string,
  to: string,
  comment?: string,
): LexoProject {
  return mapEdgeGroup(project, from, to, (transition) => ({
    ...transition,
    comment: comment && comment.length > 0 ? comment : undefined,
  }));
}

export function markInitial(project: LexoProject, stateId: string): LexoProject {
  return touchProject({
    ...project,
    states: project.states.map((state) => ({ ...state, isInitial: state.id === stateId })),
  });
}

export function toggleAccepting(project: LexoProject, stateId: string): LexoProject {
  const state = project.states.find((candidate) => candidate.id === stateId);
  if (!state) {
    return project;
  }
  return updateState(project, stateId, { isAccepting: !state.isAccepting });
}

export function toggleInitial(project: LexoProject, stateId: string): LexoProject {
  const state = project.states.find((candidate) => candidate.id === stateId);
  if (!state) {
    return project;
  }
  if (state.isInitial) {
    return updateState(project, stateId, { isInitial: false });
  }
  return markInitial(project, stateId);
}

/** Símbolo legible de una regla FA (`ε` para transiciones vacías). */
export function ruleSymbolLabel(project: LexoProject, rule: TransitionRule): string {
  if (rule.kind === 'FA') {
    return rule.symbol && rule.symbol.length > 0 ? rule.symbol : project.config.epsilonSymbol;
  }
  return rule.operations
    .map((operation) => `${operation.read} ; ${operation.write}, ${operation.move}`)
    .join(' | ');
}

/** Etiqueta agrupada de todas las reglas que comparten origen y destino. */
export function groupedLabel(project: LexoProject, transitions: Transition[]): string {
  if (project.machineType === 'DFA' || project.machineType === 'NFA' || project.machineType === 'NFA_EPSILON') {
    return transitions
      .map((transition) => (transition.rule.kind === 'FA' && transition.rule.symbol ? transition.rule.symbol : project.config.epsilonSymbol))
      .join(', ');
  }

  return transitions.map((transition) => ruleSymbolLabel(project, transition.rule)).join('\n');
}

/** Alfabeto efectivo: configuración más símbolos usados en reglas. */
export function effectiveAlphabet(project: LexoProject): string[] {
  const symbols = new Set(project.config.alphabet.filter(Boolean));

  for (const transition of project.transitions) {
    if (transition.rule.kind === 'FA') {
      if (transition.rule.symbol) {
        symbols.add(transition.rule.symbol);
      }
    } else {
      for (const operation of transition.rule.operations) {
        if (operation.read !== project.config.blankSymbol) {
          symbols.add(operation.read);
        }
        if (operation.write !== project.config.blankSymbol) {
          symbols.add(operation.write);
        }
      }
    }
  }

  return [...symbols].sort();
}

export function effectiveTapeAlphabet(project: LexoProject): string[] {
  const symbols = new Set(project.config.tapeAlphabet.filter(Boolean));
  symbols.add(project.config.blankSymbol);

  for (const transition of project.transitions) {
    if (transition.rule.kind === 'TM') {
      for (const operation of transition.rule.operations) {
        symbols.add(operation.read);
        symbols.add(operation.write);
      }
    }
  }

  return [...symbols].sort();
}

/** Alterna entre modo estricto AFD ('DFA') y flexible AFN ('NFA') sin alterar transiciones. */
export function setFaStrictMode(project: LexoProject, strict: boolean): LexoProject {
  if (!isFiniteAutomaton(project.machineType)) {
    return project;
  }
  const nextType: MachineType = strict ? 'DFA' : 'NFA';
  if (project.machineType === nextType) {
    return project;
  }
  return touchProject({
    ...project,
    machineType: nextType,
  });
}

/** Reconstruye un proyecto importado o guardado, tolerando campos ausentes. */
export function normalizeProject(raw: unknown): LexoProject {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('El archivo no contiene un proyecto válido.');
  }

  const candidate = raw as Partial<LexoProject> & Record<string, unknown>;
  const machineType = candidate.machineType;

  if (
    machineType !== 'DFA' &&
    machineType !== 'NFA' &&
    machineType !== 'NFA_EPSILON' &&
    machineType !== 'TM_SINGLE' &&
    machineType !== 'TM_MULTI'
  ) {
    throw new Error('machineType ausente o no soportado.');
  }

  const states = Array.isArray(candidate.states)
    ? candidate.states.map((state, index) => normalizeState(state, index))
    : [];
  const stateIds = new Set(states.map((state) => state.id));
  const transitions = Array.isArray(candidate.transitions)
    ? candidate.transitions
        .map((transition, index) => normalizeTransition(transition, index, machineType))
        .filter((transition): transition is Transition => transition !== null)
        .filter(
          (transition) => stateIds.has(transition.from) && stateIds.has(transition.to),
        )
    : [];

  const timestamp = typeof candidate.createdAt === 'string' ? candidate.createdAt : nowIso();
  const config = normalizeConfig(candidate.config, machineType);

  return {
    schemaVersion: typeof candidate.schemaVersion === 'string' ? candidate.schemaVersion : SCHEMA_VERSION,
    id: typeof candidate.id === 'string' ? candidate.id : createId('project'),
    name: typeof candidate.name === 'string' && candidate.name.trim() ? candidate.name : EMPTY_PROJECT_NAME,
    description: typeof candidate.description === 'string' ? candidate.description : undefined,
    machineType,
    createdAt: timestamp,
    updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : timestamp,
    config,
    states,
    transitions,
    testCases: Array.isArray(candidate.testCases)
      ? candidate.testCases
          .map((testCase, index) => normalizeTestCase(testCase, index))
          .filter((testCase): testCase is TestCase => testCase !== null)
      : [],
    viewport: normalizeViewport(candidate.viewport),
  };
}

function normalizeState(raw: unknown, index: number): State {
  const state = (typeof raw === 'object' && raw !== null ? raw : {}) as Partial<State>;
  return {
    id: typeof state.id === 'string' ? state.id : `s${index}`,
    label: typeof state.label === 'string' && state.label ? state.label : `q${index}`,
    x: Number.isFinite(state.x) ? Number(state.x) : 160 + (index % 4) * 220,
    y: Number.isFinite(state.y) ? Number(state.y) : 160 + Math.floor(index / 4) * 180,
    isInitial: state.isInitial === true,
    isAccepting: state.isAccepting === true,
    comment: typeof state.comment === 'string' ? state.comment : undefined,
  };
}

function normalizeTransition(
  raw: unknown,
  index: number,
  machineType: MachineType,
): Transition | null {
  const transition = (typeof raw === 'object' && raw !== null ? raw : {}) as Partial<Transition>;
  if (typeof transition.from !== 'string' || typeof transition.to !== 'string') {
    return null;
  }

  const rule = normalizeRule(transition.rule, machineType);
  if (!rule) {
    return null;
  }

  return {
    id: typeof transition.id === 'string' ? transition.id : `t${index}`,
    from: transition.from,
    to: transition.to,
    curveOffset: Number.isFinite(transition.curveOffset) ? Number(transition.curveOffset) : 0,
    rule,
    comment: typeof transition.comment === 'string' ? transition.comment : undefined,
  };
}

function normalizeRule(raw: unknown, machineType: MachineType): TransitionRule | null {
  if (typeof raw !== 'object' || raw === null) {
    return null;
  }

  const rule = raw as Partial<TransitionRule> & { kind?: string; symbol?: unknown; operations?: unknown };

  if (isTuring(machineType)) {
    if (rule.kind !== 'TM' || !Array.isArray(rule.operations) || rule.operations.length === 0) {
      return null;
    }
    const operations = rule.operations
      .map((operation) => normalizeOperation(operation))
      .filter((operation): operation is TmOperation => operation !== null);
    return operations.length > 0 ? { kind: 'TM', operations } : null;
  }

  if (rule.kind !== 'FA') {
    return null;
  }

  return {
    kind: 'FA',
    symbol: typeof rule.symbol === 'string' && rule.symbol.length > 0 ? rule.symbol : null,
  };
}

function normalizeOperation(raw: unknown): TmOperation | null {
  if (typeof raw !== 'object' || raw === null) {
    return null;
  }

  const operation = raw as Partial<TmOperation>;
  if (typeof operation.read !== 'string' || typeof operation.write !== 'string') {
    return null;
  }

  return {
    read: operation.read,
    write: operation.write,
    move: operation.move === 'L' || operation.move === 'R' || operation.move === 'S' ? operation.move : 'S',
  };
}

function normalizeConfig(raw: unknown, machineType: MachineType): MachineConfig {
  const config = (typeof raw === 'object' && raw !== null ? raw : {}) as Partial<MachineConfig>;
  const base = isTuring(machineType)
    ? { alphabet: ['0', '1'], tapeAlphabet: ['0', '1', '□'], tapeCount: 1 }
    : { alphabet: ['0', '1'], tapeAlphabet: [], tapeCount: 1 };

  return {
    alphabet: Array.isArray(config.alphabet)
      ? config.alphabet.filter((symbol): symbol is string => typeof symbol === 'string')
      : base.alphabet,
    tapeAlphabet: Array.isArray(config.tapeAlphabet)
      ? config.tapeAlphabet.filter((symbol): symbol is string => typeof symbol === 'string')
      : base.tapeAlphabet,
    blankSymbol: typeof config.blankSymbol === 'string' && config.blankSymbol ? config.blankSymbol : '□',
    epsilonSymbol: typeof config.epsilonSymbol === 'string' && config.epsilonSymbol ? config.epsilonSymbol : 'ε',
    tapeCount: 1,
    defaultMaxSteps:
      typeof config.defaultMaxSteps === 'number' && Number.isFinite(config.defaultMaxSteps) && config.defaultMaxSteps > 0
        ? Math.floor(config.defaultMaxSteps)
        : 10_000,
  };
}

function normalizeTestCase(raw: unknown, index: number): TestCase | null {
  if (typeof raw !== 'object' || raw === null) {
    return null;
  }

  const testCase = raw as Partial<TestCase>;
  if (typeof testCase.input !== 'string') {
    return null;
  }

  return {
    id: typeof testCase.id === 'string' ? testCase.id : `tc${index}`,
    input: testCase.input,
    expected: testCase.expected === 'ACCEPT' ? 'ACCEPT' : 'REJECT',
  };
}

function normalizeViewport(raw: unknown): LexoProject['viewport'] {
  const viewport = (typeof raw === 'object' && raw !== null ? raw : {}) as Partial<LexoProject['viewport']>;
  return {
    x: Number.isFinite(viewport.x) ? Number(viewport.x) : 0,
    y: Number.isFinite(viewport.y) ? Number(viewport.y) : 0,
    zoom: Number.isFinite(viewport.zoom) && Number(viewport.zoom) > 0 ? Number(viewport.zoom) : 1,
  };
}

export function projectFileName(project: LexoProject, extension: string): string {
  const base = project.name
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
  return `${base || 'lexomata'}.${extension}`;
}
