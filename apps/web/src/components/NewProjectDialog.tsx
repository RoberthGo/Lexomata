import { useState } from 'react';
import { CircleDot, Cpu, Trash2 } from 'lucide-react';
import type { LexoProject, MachineType } from '../engine/types';
import { Modal, PrimaryButton, SecondaryButton } from './Modal';

interface NewProjectDialogProps {
  recentProjects?: LexoProject[];
  onOpenRecent?: (project: LexoProject) => void;
  onDeleteRecent?: (id: string) => void;
  onClose: () => void;
  onCreate: (machineType: MachineType, name: string) => void;
}

const FAMILIES: Array<{
  family: 'FA' | 'TM';
  title: string;
  description: string;
  icon: typeof CircleDot;
}> = [
  {
    family: 'FA',
    title: 'Autómata Finito (AF)',
    description: 'Reconoce lenguajes regulares. Puedes activar modo estricto AFD o permitir ε y múltiples caminos (AFN).',
    icon: CircleDot,
  },
  {
    family: 'TM',
    title: 'Máquina de Turing (MT)',
    description: 'Cinta infinita con lectura, escritura y movimiento del cabezal (L, R, S).',
    icon: Cpu,
  },
];

export function NewProjectDialog({
  recentProjects = [],
  onOpenRecent,
  onDeleteRecent,
  onClose,
  onCreate,
}: NewProjectDialogProps) {
  const [family, setFamily] = useState<'FA' | 'TM'>('FA');
  const [strictDfa, setStrictDfa] = useState(true);
  const [name, setName] = useState('');

  const resolvedType: MachineType = family === 'TM' ? 'TM_SINGLE' : strictDfa ? 'DFA' : 'NFA';

  return (
    <Modal
      title="Nuevo proyecto"
      subtitle="Elige el tipo de máquina. En AF puedes activar o desactivar AFD estricto en cualquier momento."
      onClose={onClose}
      footer={
        <>
          <SecondaryButton onClick={onClose}>Cancelar</SecondaryButton>
          <PrimaryButton onClick={() => onCreate(resolvedType, name.trim() || 'Proyecto sin título')}>
            Crear proyecto
          </PrimaryButton>
        </>
      }
    >
      <div className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
            Nombre
          </span>
          <input
            value={name}
            autoFocus
            placeholder="Proyecto sin título"
            onChange={(event) => setName(event.target.value)}
            className="h-8 w-full rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] px-2 text-[12px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-selection)] focus:outline-none"
          />
        </label>

        <div className="grid gap-2 sm:grid-cols-2">
          {FAMILIES.map(({ family: candidate, title, description, icon: Icon }) => (
            <button
              key={candidate}
              type="button"
              onClick={() => setFamily(candidate)}
              className={`rounded-[var(--radius-md)] border p-3 text-left transition-colors ${
                family === candidate
                  ? 'border-[var(--accent-selection)] bg-[var(--accent-selection-soft)]'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] hover:border-[var(--border-strong)]'
              }`}
            >
              <Icon
                aria-hidden="true"
                className={`h-4 w-4 ${family === candidate ? 'text-[var(--accent-selection)]' : 'text-[var(--text-secondary)]'}`}
              />
              <p className="mt-2 text-[12px] font-semibold text-[var(--text-primary)]">{title}</p>
              <p className="mt-1 text-[10px] leading-snug text-[var(--text-secondary)]">{description}</p>
            </button>
          ))}
        </div>

        {family === 'FA' ? (
          <label className="flex cursor-pointer items-center justify-between rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] px-2.5 py-2 text-[11px] text-[var(--text-primary)]">
            <span>
              Modo estricto AFD{' '}
              <span className="text-[var(--text-muted)]">(1 transición por símbolo, sin ε)</span>
            </span>
            <input
              type="checkbox"
              checked={strictDfa}
              onChange={(event) => setStrictDfa(event.target.checked)}
              className="h-3.5 w-3.5 accent-[var(--accent-selection)]"
            />
          </label>
        ) : null}

        <p className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] px-2 py-1.5 text-[10px] leading-relaxed text-[var(--text-muted)]">
          Se creará un estado inicial q0. Usa la herramienta <span className="mono">S</span> para añadir
          estados y <span className="mono">T</span> para conectar transiciones.
        </p>

        {recentProjects.length > 0 && onOpenRecent ? (
          <div className="border-t border-[var(--border-subtle)] pt-3">
            <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
              Recientes locales (IndexedDB)
            </span>
            <div className="max-h-36 space-y-1 overflow-auto">
              {recentProjects.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] px-2.5 py-1.5 text-[11px]"
                >
                  <button
                    type="button"
                    onClick={() => onOpenRecent(item)}
                    className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left hover:text-[var(--accent-selection)]"
                  >
                    <span className="truncate font-medium text-[var(--text-primary)]">{item.name}</span>
                    <span className="mono shrink-0 text-[10px] text-[var(--text-muted)]">
                      {item.machineType}
                    </span>
                  </button>
                  {onDeleteRecent ? (
                    <button
                      type="button"
                      aria-label={`Eliminar ${item.name}`}
                      onClick={() => onDeleteRecent(item.id)}
                      className="ml-2 text-[var(--text-muted)] hover:text-[var(--accent-reject)]"
                    >
                      <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
