import { describe, expect, it } from 'vitest';
import { addState, addTransition, createProject, markInitial } from '../model/project';
import { layoutStates } from './layout';

function chainProject() {
  const withB = addState(createProject('DFA'), 0, 0).project;
  const withC = addState(withB, 0, 0).project;
  const withEdges = addTransition(addTransition(withC, 's0', 's1').project, 's1', 's2').project;
  return markInitial(withEdges, 's0');
}

describe('layout', () => {
  it('coloca el layout jerárquico de forma determinista', () => {
    const project = chainProject();
    const first = layoutStates(project, 'layered');
    const second = layoutStates(project, 'layered');

    expect(first.states.map((state) => ({ x: state.x, y: state.y }))).toEqual(
      second.states.map((state) => ({ x: state.x, y: state.y })),
    );

    const x = new Map(first.states.map((state) => [state.id, state.x]));
    expect(x.get('s0')).toBe(160);
    expect(x.get('s1')).toBe(380);
    expect(x.get('s2')).toBe(600);
  });

  it('distribuye los estados en círculo sin mutar el original', () => {
    const project = chainProject();
    const original = project.states.map((state) => ({ x: state.x, y: state.y }));
    const laidOut = layoutStates(project, 'circular');

    expect(laidOut.states).toHaveLength(3);
    expect(project.states.map((state) => ({ x: state.x, y: state.y }))).toEqual(original);
    expect(new Set(laidOut.states.map((state) => `${state.x},${state.y}`)).size).toBe(3);
  });

  it('no modifica proyectos sin estados', () => {
    const project = { ...createProject('DFA'), states: [] };
    expect(layoutStates(project, 'layered')).toBe(project);
  });
});
