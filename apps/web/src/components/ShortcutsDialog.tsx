import { Modal, PrimaryButton } from './Modal';

interface ShortcutsDialogProps {
  onClose: () => void;
}

const GROUPS: Array<{
  title: string;
  items: Array<{ keys: string; label: string }>;
}> = [
  {
    title: 'Herramientas del lienzo',
    items: [
      { keys: 'V', label: 'Seleccionar, mover y arrastrar lienzo' },
      { keys: 'S', label: 'Crear estado (1 clic en lienzo)' },
      { keys: 'T', label: 'Crear transición (clic en origen → destino)' },
      { keys: 'X', label: 'Borrar estado o arista' },
      { keys: 'Espacio + arrastrar', label: 'Mover cámara temporalmente' },
      { keys: 'Doble clic', label: 'Crear estado (en modo Seleccionar) o editar etiqueta' },
      { keys: 'Clic derecho en arista', label: 'Invertir, reasignar o comentar arista' },
    ],
  },
  {
    title: 'Edición y archivo',
    items: [
      { keys: 'Ctrl + Z', label: 'Deshacer' },
      { keys: 'Ctrl + Shift + Z / Ctrl + Y', label: 'Rehacer' },
      { keys: 'Supr / Retroceso', label: 'Eliminar elemento seleccionado' },
      { keys: 'Ctrl + S', label: 'Guardar proyecto .lexo' },
      { keys: 'Ctrl + N', label: 'Nuevo proyecto / Recientes' },
      { keys: 'Ctrl + 0', label: 'Ajustar diagrama a pantalla' },
      { keys: 'Esc', label: 'Cancelar acción / volver a Seleccionar' },
    ],
  },
  {
    title: 'Simulación',
    items: [
      { keys: 'Enter', label: 'Ejecutar simulación rápido (en caja de entrada o Lotes)' },
      { keys: '?', label: 'Mostrar u ocultar esta guía de atajos' },
    ],
  },
];

export function ShortcutsDialog({ onClose }: ShortcutsDialogProps) {
  return (
    <Modal
      title="Atajos de teclado"
      subtitle="Referencia rápida para diseñar y simular más rápido."
      onClose={onClose}
      width="max-w-lg"
      footer={<PrimaryButton onClick={onClose}>Entendido</PrimaryButton>}
    >
      <div className="space-y-4">
        {GROUPS.map((group) => (
          <div key={group.title} className="space-y-1.5">
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
              {group.title}
            </h3>
            <div className="divide-y divide-[var(--border-subtle)] rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)]">
              {group.items.map((item) => (
                <div
                  key={item.keys}
                  className="flex items-center justify-between gap-3 px-2.5 py-1.5 text-[11px]"
                >
                  <span className="text-[var(--text-secondary)]">{item.label}</span>
                  <kbd className="mono shrink-0 rounded-[4px] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-1.5 py-0.5 text-[10px] text-[var(--text-primary)]">
                    {item.keys}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
