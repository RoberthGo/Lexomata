import { afterEach, describe, expect, it, vi } from 'vitest';
import { fileService, isTauriRuntime } from './fileService';

describe('fileService', () => {
  afterEach(() => {
    fileService.clearActiveHandle();
    vi.restoreAllMocks();
  });

  it('detecta que jsdom no es un runtime Tauri', () => {
    expect(isTauriRuntime()).toBe(false);
  });

  it('usa showSaveFilePicker cuando está disponible y reusa el handle en saveCurrentFile', async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    const close = vi.fn().mockResolvedValue(undefined);
    const showSaveFilePicker = vi.fn().mockResolvedValue({
      name: 'demo.lexo',
      getFile: vi.fn(),
      createWritable: vi.fn().mockResolvedValue({ write, close }),
    });

    Object.assign(window, { showSaveFilePicker });

    const ok = await fileService.saveFile('demo.lexo', '{"ok":1}', 'application/json');
    expect(ok).toBe(true);
    expect(showSaveFilePicker).toHaveBeenCalledTimes(1);
    expect(write).toHaveBeenCalledWith('{"ok":1}');

    const overwritten = await fileService.saveCurrentFile('demo.lexo', '{"ok":2}', 'application/json');
    expect(overwritten).toBe(true);
    expect(showSaveFilePicker).toHaveBeenCalledTimes(1);
    expect(write).toHaveBeenCalledWith('{"ok":2}');

    const blob = new Blob(['png-bytes'], { type: 'image/png' });
    const pngSaved = await fileService.saveBinaryFile('diagrama.png', blob);
    expect(pngSaved).toBe(true);
    expect(showSaveFilePicker).toHaveBeenCalledTimes(2);
    expect(write).toHaveBeenLastCalledWith(blob);

    delete (window as { showSaveFilePicker?: unknown }).showSaveFilePicker;
  });
});
