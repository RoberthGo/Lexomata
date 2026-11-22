import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

const { getExamples, validateProject } = vi.hoisted(() => ({
  getExamples: vi.fn(),
  validateProject: vi.fn(),
}));

vi.mock('./engine/wasmAdapter', () => ({
  getExamples,
  validateProject,
  getFormalDefinition: vi.fn().mockResolvedValue({
    tuple: '',
    text: '',
    latex: '',
    transitions: [],
  }),
  simulateFa: vi.fn(),
  runFaBatch: vi.fn(),
  convertNfaToDfa: vi.fn(),
  minimizeDfa: vi.fn(),
  initTuring: vi.fn(),
  stepTuring: vi.fn(),
  runTuringFull: vi.fn(),
  runTuringBatch: vi.fn(),
  rewindTuring: vi.fn(),
  importJflap: vi.fn(),
  exportJflap: vi.fn(),
}));

describe('App', () => {
  beforeEach(() => {
    getExamples.mockResolvedValue([]);
    validateProject.mockResolvedValue({ valid: true, errors: [], warnings: [] });
  });

  it('muestra el editor y el aviso offline', async () => {
    render(<App />);

    expect(screen.getByText('Lexomata')).toBeInTheDocument();
    expect(screen.getByText('100% offline')).toBeInTheDocument();
    expect(await screen.findByText('Válido')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Lienzo del autómata' })).toBeInTheDocument();
  });

  it('abre el diálogo de nuevo proyecto', async () => {
    render(<App />);

    const fileButton = screen.getByRole('button', { name: /archivo/i });
    fileButton.click();

    const newProject = await screen.findByRole('button', { name: /nuevo proyecto/i });
    newProject.click();

    expect(await screen.findByRole('dialog', { name: 'Nuevo proyecto' })).toBeInTheDocument();
  });
});
