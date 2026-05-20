import { eventBus } from '../shared/EventBus.js';

export class ToolbarView {
  constructor(toolbarElement) {
    this.element = toolbarElement;
    this.buttons = this.element.querySelectorAll('.tool-button');
    this.bindEvents();

    eventBus.on('tool:changed', (toolId) => this.updateActiveButton(toolId));
    eventBus.on('history:changed', ({canUndo, canRedo}) => this.updateHistoryButtons(canUndo, canRedo));
  }

  bindEvents() {
    this.buttons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const toolId = btn.getAttribute('data-tool-id') || btn.id; // Fallback to ID

        // Maps IDs to logical names required by canvas controller
        const map = {
          'select': 'select',
          'node': 'addNode',
          'edge': 'addEdge',
          'delete': 'delete',
          'initial-state': 'setStart',
          'final-state': 'setEnd'
        };

        if (map[toolId]) {
          eventBus.emit('tool:changed', map[toolId]);
        } else if (toolId === 'undoButton') {
          eventBus.emit('ui:undo');
        } else if (toolId === 'redoButton') {
          eventBus.emit('ui:redo');
        }
      });
    });
  }

  updateActiveButton(toolId) {
    const reverseMap = {
        'select': 'select',
        'addNode': 'node',
        'addEdge': 'edge',
        'delete': 'delete',
        'setStart': 'initial-state',
        'setEnd': 'final-state'
    };

    this.buttons.forEach(btn => btn.classList.remove('active'));
    const activeBtn = Array.from(this.buttons).find(b => b.id === reverseMap[toolId]);
    if (activeBtn) activeBtn.classList.add('active');
  }

  updateHistoryButtons(canUndo, canRedo) {
    const undoBtn = Array.from(this.buttons).find(b => b.id === 'undoButton');
    const redoBtn = Array.from(this.buttons).find(b => b.id === 'redoButton');
    if (undoBtn) undoBtn.disabled = !canUndo;
    if (redoBtn) redoBtn.disabled = !canRedo;
  }
}
