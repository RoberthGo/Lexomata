import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';

function Bomb({ explode }: { explode: boolean }) {
  if (explode) {
    throw new Error('Fallo de render simulado');
  }
  return <p>Editor estable</p>;
}

describe('ErrorBoundary', () => {
  it('muestra pantalla de recuperación y permite reintentar cuando cede el fallo', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    let shouldThrow = true;

    function Controlled() {
      return <Bomb explode={shouldThrow} />;
    }

    render(
      <ErrorBoundary>
        <Controlled />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Ocurrió un error inesperado')).toBeInTheDocument();
    expect(screen.getByText('Fallo de render simulado')).toBeInTheDocument();

    shouldThrow = false;
    fireEvent.click(screen.getByRole('button', { name: /reintentar/i }));

    expect(screen.getByText('Editor estable')).toBeInTheDocument();
    consoleSpy.mockRestore();
  });
});
