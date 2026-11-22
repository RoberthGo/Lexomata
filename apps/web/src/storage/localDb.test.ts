import { beforeEach, describe, expect, it } from 'vitest';
import { createProject } from '../model/project';
import {
  deleteProjectLocal,
  getLastProjectId,
  listRecentProjects,
  loadProjectLocal,
  resetMemoryLocalDbForTests,
  saveLastProjectId,
  saveProjectLocal,
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
});
