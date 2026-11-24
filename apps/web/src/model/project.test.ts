import { describe, expect, it } from 'vitest';
import {
  addState,
  addTransition,
  createProject,
  effectiveAlphabet,
  groupedLabel,
  invertEdgeGroup,
  markInitial,
  normalizeProject,
  projectFileName,
  reassignEdgeGroup,
  removeStates,
  setFaStrictMode,
  toggleAccepting,
  updateEdgeGroupComment,
  updateTransition,
} from './project';

describe('project model', () => {
  it('crea un proyecto con estado inicial y alfabeto utilizable', () => {
    const project = createProject('DFA', 'Prueba');

    expect(project.name).toBe('Prueba');
    expect(project.schemaVersion).toBe('1.0.0');
    expect(project.config.alphabet).toEqual(['0', '1']);
    expect(project.states).toHaveLength(1);
    expect(project.states[0]).toMatchObject({
      id: 's0',
      label: 'q0',
      isInitial: true,
      isAccepting: false,
    });
    expect(project.transitions).toHaveLength(0);
  });

  it('añade estados con etiquetas e identificadores deterministas', () => {
    const first = createProject('DFA');
    const second = addState(first, 100, 120);
    const third = addState(second.project, 200, 240);

    expect(second.stateId).toBe('s1');
    expect(third.stateId).toBe('s2');
    expect(third.project.states.map((state) => state.label)).toEqual(['q0', 'q1', 'q2']);
    expect(third.project.states[1]?.isInitial).toBe(false);
  });

  it('crea transiciones con el primer símbolo del alfabeto', () => {
    const project = addState(createProject('DFA'), 400, 0).project;
    const result = addTransition(project, 's0', 's1');

    expect(result.transitionId).toBe('t0');
    expect(result.project.transitions[0]?.rule).toEqual({ kind: 'FA', symbol: '0' });
  });

  it('mantiene un único estado inicial y alterna aceptación', () => {
    const project = addState(addState(createProject('DFA'), 0, 0).project, 100, 0).project;
    const marked = markInitial(project, 's2');
    const accepting = toggleAccepting(marked, 's2');

    expect(marked.states.filter((state) => state.isInitial)).toHaveLength(1);
    expect(marked.states.find((state) => state.id === 's2')?.isInitial).toBe(true);
    expect(accepting.states.find((state) => state.id === 's2')?.isAccepting).toBe(true);
  });

  it('elimina transiciones asociadas al borrar un estado', () => {
    const withSecond = addState(createProject('DFA'), 100, 0).project;
    const withEdge = addTransition(withSecond, 's0', 's1').project;
    const removed = removeStates(withEdge, ['s1']);

    expect(removed.states.map((state) => state.id)).toEqual(['s0']);
    expect(removed.transitions).toHaveLength(0);
  });

  it('alterna modo estricto AFD sin perder transiciones ε ni no deterministas', () => {
    const withSecond = addState(createProject('NFA_EPSILON'), 100, 0).project;
    const withSymbol = addTransition(withSecond, 's0', 's1').project;
    const withEpsilon = addTransition(withSymbol, 's0', 's1').project;
    const epsilonId = withEpsilon.transitions[1]?.id ?? '';

    const withEmpty = updateTransition(withEpsilon, epsilonId, {
      rule: { kind: 'FA', symbol: null },
    });

    const strict = setFaStrictMode(withEmpty, true);
    expect(strict.machineType).toBe('DFA');
    expect(strict.transitions).toHaveLength(2);
    expect(strict.transitions[1]?.rule).toEqual({ kind: 'FA', symbol: null });

    const flexible = setFaStrictMode(strict, false);
    expect(flexible.machineType).toBe('NFA');
    expect(flexible.transitions).toHaveLength(2);
  });

  it('calcula alfabetos efectivos y etiquetas agrupadas', () => {
    const project = addState(createProject('NFA'), 100, 0).project;
    const withOne = addTransition(project, 's0', 's1', { kind: 'FA', symbol: 'b' }).project;
    const withTwo = addTransition(withOne, 's0', 's1', { kind: 'FA', symbol: 'a' }).project;

    expect(effectiveAlphabet(withTwo)).toEqual(['0', '1', 'a', 'b']);
    expect(groupedLabel(withTwo, withTwo.transitions)).toBe('b, a');
  });

  it('normaliza archivos incompletos y rechaza tipos desconocidos', () => {
    const normalized = normalizeProject({
      machineType: 'DFA',
      states: [{ id: 'a', label: 'A', x: 10, y: 20, isInitial: true }],
      transitions: [
        { id: 't', from: 'a', to: 'a', rule: { kind: 'FA', symbol: '0' } },
        { id: 'bad', from: 'a', to: 'missing', rule: { kind: 'FA', symbol: '1' } },
      ],
    });

    expect(normalized.states[0]?.isAccepting).toBe(false);
    expect(normalized.transitions).toHaveLength(1);
    expect(normalized.config.alphabet).toEqual(['0', '1']);
    expect(normalized.testCases).toEqual([]);

    expect(() => normalizeProject({ machineType: 'PDA' })).toThrow(/machineType/);
    expect(() => normalizeProject(null)).toThrow(/proyecto válido/);
  });

  it('genera nombres de archivo seguros con acentos', () => {
    const project = createProject('DFA', 'Mi Máquina Ñ');
    expect(projectFileName(project, 'lexo')).toBe('mi-máquina-ñ.lexo');
    expect(projectFileName({ ...project, name: '   ' }, 'jff')).toBe('lexomata.jff');
  });

  it('invierte, reasigna origen/destino y guarda notas en grupos de aristas', () => {
    const base = createProject('DFA', 'Aristas');
    const s1 = addState(base, 200, 120);
    const s2 = addState(s1.project, 320, 120);
    const withEdge = addTransition(s2.project, 's0', s1.stateId, { kind: 'FA', symbol: '0' }).project;

    const inverted = invertEdgeGroup(withEdge, 's0', s1.stateId);
    expect(inverted.transitions[0]).toMatchObject({ from: s1.stateId, to: 's0' });

    const reassigned = reassignEdgeGroup(inverted, s1.stateId, 's0', 's0', s2.stateId);
    expect(reassigned.transitions[0]).toMatchObject({ from: 's0', to: s2.stateId });

    const noted = updateEdgeGroupComment(reassigned, 's0', s2.stateId, 'camino principal');
    expect(noted.transitions[0]?.comment).toBe('camino principal');

    const cleared = updateEdgeGroupComment(noted, 's0', s2.stateId, '');
    expect(cleared.transitions[0]?.comment).toBeUndefined();
  });
});
