import { beforeEach, describe, expect, it } from 'vitest';
import { createProject } from '../model/project';
import {
  deleteProjectLocal,
  deleteProjectSnapshot,
  getLastProjectId,
  listProjectSnapshots,
  listRecentProjects,
  loadProjectLocal,
  resetMemoryLocalDbForTests,
  saveLastProjectId,
  saveProjectLocal,
  saveProjectSnapshot,
} from './localDb';

describe('localDb', () => {
  beforeEach(() => {
    resetMemoryLocalDbForTests();
  });

  it('guarda, ordena recientes y recupera el último proyecto', async () => {
    const older = {
      ...createProject('DFA', 'Antiguo'),
      id: 'p-old',
      updatedAt: '2026-11-20T10:00:00.000Z',
    };
    const newer = {
      ...createProject('TM_SINGLE', 'Reciente'),
      id: 'p-new',
      updatedAt: '2026-11-21T12:00:00.000Z',
    };

    await saveProjectLocal(older);
    await saveProjectLocal(newer);
    await saveLastProjectId(newer.id);

    const recent = await listRecentProjects(5);
    expect(recent.map((item) => item.id)).toEqual(['p-new', 'p-old']);
    expect(await getLastProjectId()).toBe('p-new');
    expect((await loadProjectLocal('p-old'))?.name).toBe('Antiguo');

    await deleteProjectLocal('p-old');
    expect(await loadProjectLocal('p-old')).toBeNull();
  });

  it('guarda, ordena y poda versiones intermedias a un máximo de 15 por proyecto', async () => {
    const project = { ...createProject('DFA', 'Snapshot Demo'), id: 'p-snap' };

    for (let index = 1; index <= 17; index += 1) {
      await saveProjectSnapshot(project, `Checkpoint ${index}`, index % 2 === 0 ? 'manual' : 'auto');
      await new Promise((resolve) => setTimeout(resolve, 2));
    }

    const snapshots = await listProjectSnapshots('p-snap');
    expect(snapshots).toHaveLength(15);
    expect(snapshots[0]?.label).toBe('Checkpoint 17');
    expect(snapshots[14]?.label).toBe('Checkpoint 3');

    const firstId = snapshots[0]?.id;
    expect(firstId).toBeDefined();
    await deleteProjectSnapshot(firstId ?? '');
    expect(await listProjectSnapshots('p-snap')).toHaveLength(14);
  });

  it('elimina en cascada los snapshots al borrar un proyecto local', async () => {
    const target = { ...createProject('DFA', 'Para borrar'), id: 'p-delete' };
    const other = { ...createProject('DFA', 'Conservar'), id: 'p-keep' };

    await saveProjectLocal(target);
    await saveProjectLocal(other);
    await saveProjectSnapshot(target, 'Snap 1', 'manual');
    await saveProjectSnapshot(target, 'Snap 2', 'auto');
    await saveProjectSnapshot(other, 'Snap Otro', 'manual');

    expect(await listProjectSnapshots('p-delete')).toHaveLength(2);
    expect(await listProjectSnapshots('p-keep')).toHaveLength(1);

    await deleteProjectLocal('p-delete');

    expect(await loadProjectLocal('p-delete')).toBeNull();
    expect(await listProjectSnapshots('p-delete')).toHaveLength(0);
    expect(await listProjectSnapshots('p-keep')).toHaveLength(1);
  });
});
