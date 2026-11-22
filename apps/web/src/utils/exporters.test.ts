import { describe, expect, it } from 'vitest';
import { addState, addTransition, createProject, updateState } from '../model/project';
import { projectToSvg, projectToTikz } from './exporters';

function sampleProject() {
  const withSecond = addState(createProject('DFA', 'Prueba <&>'), 520, 260).project;
  const withEdge = addTransition(withSecond, 's0', 's1').project;
  return updateState(withEdge, 's1', { isAccepting: true, label: 'q_1' });
}

describe('exporters', () => {
  it('genera un SVG autocontenido y escapado', () => {
    const svg = projectToSvg(sampleProject(), 'light');

    expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('Prueba &lt;&amp;&gt;');
    expect(svg).toContain('q_1');
    expect(svg).toContain('marker-end="url(#arrow)"');
    expect(svg).not.toMatch(/<image|href="https?:|@import/);
    expect(svg.endsWith('</svg>')).toBe(true);
  });

  it('aplica el tema claro u oscuro y omite el fondo transparente', () => {
    const project = sampleProject();
    const dark = projectToSvg(project, 'dark');
    const transparent = projectToSvg(project, 'transparent');

    expect(dark).toContain('fill="#0b0f19"');
    expect(transparent).not.toContain('fill="#0b0f19"');
    expect(transparent).toContain('fill="#ffffff"');
  });

  it('genera TikZ con nodos, aristas y escape LaTeX', () => {
    const tikz = projectToTikz(sampleProject());

    expect(tikz).toContain('\\begin{tikzpicture}');
    expect(tikz).toContain('\\node[state, initial] (s0)');
    expect(tikz).toContain('\\node[state, accepting] (s1)');
    expect(tikz).toContain('q\\_1');
    expect(tikz).toContain('\\path[->] (s0) edge[]');
    expect(tikz).toContain('\\end{tikzpicture}');
  });

  it('escapa la barra invertida sin romper las llaves de LaTeX', () => {
    const project = updateState(sampleProject(), 's1', { label: 'a\\b' });
    const tikz = projectToTikz(project);

    expect(tikz).toContain('a\\textbackslash{}b');
    expect(tikz).not.toContain('\\textbackslash\\{\\}');
  });
});
