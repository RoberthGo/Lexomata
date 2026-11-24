import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { LexoProject } from '../engine/types';

const DB_NAME = 'lexomata-db';
const DB_VERSION = 2;
const LAST_PROJECT_KEY = 'lastProjectId';
const MAX_SNAPSHOTS_PER_PROJECT = 15;

export interface ProjectSnapshot {
  id: string;
  projectId: string;
  createdAt: string;
  label: string;
  kind: 'auto' | 'manual';
  project: LexoProject;
}

interface SettingRecord {
  key: string;
  value: unknown;
}

interface LexomataSchema extends DBSchema {
  projects: {
    key: string;
    value: LexoProject;
    indexes: { 'by-updated': string };
  };
  snapshots: {
    key: string;
    value: ProjectSnapshot;
    indexes: { 'by-project': string };
  };
  settings: {
    key: string;
    value: SettingRecord;
  };
}

let dbPromise: Promise<IDBPDatabase<LexomataSchema>> | null = null;
const memoryProjects = new Map<string, LexoProject>();
const memorySnapshots = new Map<string, ProjectSnapshot>();
const memorySettings = new Map<string, unknown>();

function hasIndexedDb(): boolean {
  return typeof indexedDB !== 'undefined';
}

async function getDb(): Promise<IDBPDatabase<LexomataSchema> | null> {
  if (!hasIndexedDb()) {
    return null;
  }
  if (!dbPromise) {
    dbPromise = openDB<LexomataSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('projects')) {
          const store = db.createObjectStore('projects', { keyPath: 'id' });
          store.createIndex('by-updated', 'updatedAt');
        }
        if (!db.objectStoreNames.contains('snapshots')) {
          const snapshots = db.createObjectStore('snapshots', { keyPath: 'id' });
          snapshots.createIndex('by-project', 'projectId');
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      },
    }).catch(() => {
      dbPromise = null;
      return null as unknown as IDBPDatabase<LexomataSchema>;
    });
  }
  const db = await dbPromise;
  return db ?? null;
}

export async function saveProjectLocal(project: LexoProject): Promise<void> {
  memoryProjects.set(project.id, project);
  const db = await getDb();
  if (db) {
    await db.put('projects', project);
  }
}

export async function loadProjectLocal(id: string): Promise<LexoProject | null> {
  const db = await getDb();
  if (db) {
    const found = await db.get('projects', id);
    if (found) {
      return found;
    }
  }
  return memoryProjects.get(id) ?? null;
}

export async function listRecentProjects(limit = 10): Promise<LexoProject[]> {
  const db = await getDb();
  let items: LexoProject[];
  if (db) {
    items = await db.getAll('projects');
  } else {
    items = [...memoryProjects.values()];
  }
  return items
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, limit);
}

export async function deleteProjectLocal(id: string): Promise<void> {
  memoryProjects.delete(id);
  const db = await getDb();
  if (db) {
    await db.delete('projects', id);
  }
}

export async function getSetting<T>(key: string): Promise<T | null> {
  const db = await getDb();
  if (db) {
    const record = await db.get('settings', key);
    if (record) {
      return record.value as T;
    }
  }
  return (memorySettings.get(key) as T | undefined) ?? null;
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  memorySettings.set(key, value);
  const db = await getDb();
  if (db) {
    await db.put('settings', { key, value });
  }
}

export function getLastProjectId(): Promise<string | null> {
  return getSetting<string>(LAST_PROJECT_KEY);
}

export function saveLastProjectId(id: string): Promise<void> {
  return setSetting(LAST_PROJECT_KEY, id);
}

let snapshotCounter = 0;

export async function listProjectSnapshots(projectId: string): Promise<ProjectSnapshot[]> {
  const db = await getDb();
  let items: ProjectSnapshot[];
  if (db) {
    items = await db.getAllFromIndex('snapshots', 'by-project', projectId);
  } else {
    items = [...memorySnapshots.values()].filter((snap) => snap.projectId === projectId);
  }
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function saveProjectSnapshot(
  project: LexoProject,
  label: string,
  kind: 'auto' | 'manual' = 'manual',
): Promise<ProjectSnapshot> {
  snapshotCounter += 1;
  const createdAt = new Date().toISOString();
  const snapshot: ProjectSnapshot = {
    id: `snap-${Date.now()}-${snapshotCounter}`,
    projectId: project.id,
    createdAt,
    label: label.trim() || (kind === 'auto' ? 'Respaldo automático' : 'Versión intermedia'),
    kind,
    project: JSON.parse(JSON.stringify(project)) as LexoProject,
  };

  memorySnapshots.set(snapshot.id, snapshot);
  const db = await getDb();
  if (db) {
    await db.put('snapshots', snapshot);
  }

  const all = await listProjectSnapshots(project.id);
  if (all.length > MAX_SNAPSHOTS_PER_PROJECT) {
    const toDelete = all.slice(MAX_SNAPSHOTS_PER_PROJECT);
    for (const stale of toDelete) {
      memorySnapshots.delete(stale.id);
      if (db) {
        await db.delete('snapshots', stale.id);
      }
    }
  }

  return snapshot;
}

export async function deleteProjectSnapshot(id: string): Promise<void> {
  memorySnapshots.delete(id);
  const db = await getDb();
  if (db) {
    await db.delete('snapshots', id);
  }
}

export function resetMemoryLocalDbForTests(): void {
  memoryProjects.clear();
  memorySnapshots.clear();
  memorySettings.clear();
  snapshotCounter = 0;
}
