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
    title: 'Vista y navegación',
    items: [
      { keys: '+ / -', label: 'Acercar / alejar zoom' },
      { keys: '1', label: 'Restablecer zoom al 100%' },
      { keys: 'Ctrl + 0', label: 'Ajustar diagrama a pantalla' },
      { keys: 'Ctrl + B', label: 'Mostrar u ocultar Inspector' },
      { keys: 'Alt + 1..4', label: 'Cambiar pestaña del Inspector' },
      { keys: '?', label: 'Mostrar u ocultar esta guía de atajos' },
    ],
  },
  {
    title: 'Edición y archivo',
    items: [
      { keys: 'A', label: 'Alternar estado de aceptación (seleccionado)' },
      { keys: 'I', label: 'Marcar como estado inicial (seleccionado)' },
      { keys: 'F2', label: 'Renombrar estado seleccionado' },
      { keys: 'Ctrl + D', label: 'Duplicar estado seleccionado' },
      { keys: 'Supr / Retroceso', label: 'Eliminar elemento seleccionado' },
      { keys: 'Ctrl + Z', label: 'Deshacer' },
      { keys: 'Ctrl + Shift + Z / Ctrl + Y', label: 'Rehacer' },
      { keys: 'Ctrl + N', label: 'Nuevo proyecto / Recientes' },
      { keys: 'Ctrl + O', label: 'Abrir proyecto .lexo' },
      { keys: 'Ctrl + S', label: 'Guardar proyecto .lexo' },
      { keys: 'Ctrl + Shift + S', label: 'Guardar proyecto como…' },
      { keys: 'Ctrl + E', label: 'Exportar diagrama (SVG / PNG / TikZ)' },
      { keys: 'Esc', label: 'Cancelar acción / volver a Seleccionar' },
    ],
  },
  {
    title: 'Simulación',
    items: [
      { keys: '← / →', label: 'Paso atrás / paso adelante' },
      { keys: 'Shift + Espacio', label: 'Reproducir / pausar simulación' },
      { keys: 'R', label: 'Reiniciar simulación / cinta' },
      { keys: 'Ctrl + Enter', label: 'Ejecutar simulación rápido' },
      { keys: 'Enter', label: 'Ejecutar rápido (en caja de entrada o Lotes)' },
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
