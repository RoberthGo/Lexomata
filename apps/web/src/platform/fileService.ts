import { downloadFile } from '../utils/exporters';

export type SupportedFileExtension = '.lexo' | '.jff';

export interface OpenedFileResult {
  name: string;
  content: string;
  path?: string;
}

export interface FileService {
  openFile(accept: SupportedFileExtension): Promise<OpenedFileResult | null>;
  saveFile(suggestedName: string, content: string, mimeType: string): Promise<boolean>;
  saveCurrentFile(suggestedName: string, content: string, mimeType: string): Promise<boolean>;
  clearActiveHandle(): void;
}

interface PickerHandle {
  name: string;
  getFile(): Promise<File>;
  createWritable(): Promise<{
    write(data: string): Promise<void>;
    close(): Promise<void>;
  }>;
}

interface PickerWindow extends Window {
  showOpenFilePicker?: (options?: unknown) => Promise<PickerHandle[]>;
  showSaveFilePicker?: (options?: unknown) => Promise<PickerHandle>;
}

export function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

let activeTauriPath: string | null = null;
let activeWebHandle: PickerHandle | null = null;

function pickerTypesFor(accept: SupportedFileExtension) {
  return [
    {
      description: accept === '.lexo' ? 'Proyecto Lexomata (.lexo)' : 'Archivo JFLAP (.jff)',
      accept: {
        [accept === '.lexo' ? 'application/json' : 'application/xml']: [accept],
      },
    },
  ];
}

function openViaHiddenInput(accept: SupportedFileExtension): Promise<OpenedFileResult | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      resolve({ name: file.name, content: await file.text() });
    };
    input.click();
  });
}

export const fileService: FileService = {
  clearActiveHandle() {
    activeTauriPath = null;
    activeWebHandle = null;
  },

  async openFile(accept) {
    if (isTauriRuntime()) {
      const [{ open }, { readTextFile }] = await Promise.all([
        import('@tauri-apps/plugin-dialog'),
        import('@tauri-apps/plugin-fs'),
      ]);
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: accept === '.lexo' ? 'Lexomata' : 'JFLAP',
            extensions: [accept.slice(1)],
          },
        ],
      });
      if (!selected || Array.isArray(selected)) {
        return null;
      }
      const content = await readTextFile(selected);
      const name = selected.split(/[/\\]/).pop() ?? `proyecto${accept}`;
      if (accept === '.lexo') {
        activeTauriPath = selected;
      }
      return { name, content, path: selected };
    }

    const pickerWin = window as PickerWindow;
    if (typeof pickerWin.showOpenFilePicker === 'function') {
      try {
        const [handle] = await pickerWin.showOpenFilePicker({
          multiple: false,
          types: pickerTypesFor(accept),
        });
        if (!handle) {
          return null;
        }
        const file = await handle.getFile();
        if (accept === '.lexo') {
          activeWebHandle = handle;
        }
        return { name: file.name, content: await file.text() };
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return null;
        }
      }
    }

    return openViaHiddenInput(accept);
  },

  async saveFile(suggestedName, content, mimeType) {
    const isLexo = suggestedName.endsWith('.lexo');
    if (isTauriRuntime()) {
      const [{ save }, { writeTextFile }] = await Promise.all([
        import('@tauri-apps/plugin-dialog'),
        import('@tauri-apps/plugin-fs'),
      ]);
      const target = await save({
        defaultPath: suggestedName,
        filters: [
          {
            name: isLexo ? 'Lexomata' : 'JFLAP',
            extensions: [isLexo ? 'lexo' : 'jff'],
          },
        ],
      });
      if (!target) {
        return false;
      }
      await writeTextFile(target, content);
      if (isLexo) {
        activeTauriPath = target;
      }
      return true;
    }

    const pickerWin = window as PickerWindow;
    if (typeof pickerWin.showSaveFilePicker === 'function') {
      try {
        const handle = await pickerWin.showSaveFilePicker({
          suggestedName,
          types: pickerTypesFor(isLexo ? '.lexo' : '.jff'),
        });
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
        if (isLexo) {
          activeWebHandle = handle;
        }
        return true;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return false;
        }
      }
    }

    downloadFile(suggestedName, content, mimeType);
    return true;
  },

  async saveCurrentFile(suggestedName, content, mimeType) {
    if (isTauriRuntime() && activeTauriPath) {
      const { writeTextFile } = await import('@tauri-apps/plugin-fs');
      await writeTextFile(activeTauriPath, content);
      return true;
    }

    if (activeWebHandle) {
      try {
        const writable = await activeWebHandle.createWritable();
        await writable.write(content);
        await writable.close();
        return true;
      } catch {
        activeWebHandle = null;
      }
    }

    return this.saveFile(suggestedName, content, mimeType);
  },
};
