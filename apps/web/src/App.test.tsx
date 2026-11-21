import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('muestra la versión del motor cuando el puente responde', async () => {
    render(<App loadVersion={() => Promise.resolve('0.1.0')} />);

    expect(await screen.findByText('0.1.0')).toBeInTheDocument();
    expect(screen.getByText('100% offline')).toBeInTheDocument();
  });

  it('muestra un error legible si el motor no inicializa', async () => {
    render(<App loadVersion={() => Promise.reject(new Error('wasm roto'))} />);

    expect(await screen.findByText('wasm roto')).toBeInTheDocument();
    expect(screen.getByTestId('engine-version')).toHaveTextContent('no disponible');
  });
});
