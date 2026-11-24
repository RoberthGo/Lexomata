import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearSyncState,
  createPkcePair,
  findMatchingDriveFile,
  getGoogleClientId,
  getLastSyncedRemoteModifiedTime,
  hasSyncConflict,
  isDriveConfigured,
  setGoogleClientId,
  setLastSyncedRemoteModifiedTime,
  startDriveSignIn,
} from './gdriveSync';

describe('gdriveSync', () => {
  afterEach(() => {
    setGoogleClientId('');
    clearSyncState();
    vi.restoreAllMocks();
  });

  it('genera pares PKCE válidos con verifier y challenge URL-safe', async () => {
    const pair = await createPkcePair();
    expect(pair.verifier.length).toBeGreaterThanOrEqual(32);
    expect(pair.challenge.length).toBeGreaterThanOrEqual(32);
    expect(pair.verifier).not.toMatch(/[+/=]/);
    expect(pair.challenge).not.toMatch(/[+/=]/);
  });

  it('bloquea intentos de login cuando navigator.onLine es false', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    await expect(startDriveSignIn()).rejects.toThrow(/offline/i);
  });

  it('detecta conflictos de sincronización cuando las marcas difieren > 2s', () => {
    expect(hasSyncConflict('2026-11-22T01:00:00.000Z', '2026-11-22T01:00:01.000Z')).toBe(false);
    expect(hasSyncConflict('2026-11-22T01:00:00.000Z', '2026-11-22T01:00:10.000Z')).toBe(true);
  });

  it('permite configurar y limpiar Google Client ID en runtime', () => {
    expect(isDriveConfigured()).toBe(false);
    setGoogleClientId('  demo-client-id.apps.googleusercontent.com  ');
    expect(isDriveConfigured()).toBe(true);
    expect(getGoogleClientId()).toBe('demo-client-id.apps.googleusercontent.com');

    setGoogleClientId('');
    expect(isDriveConfigured()).toBe(false);
  });

  it('empareja primero por appProperties.lexomataId y luego por nombre', () => {
    const files = [
      { id: 'f1', name: 'Renombrado.lexo', modifiedTime: '2026-11-22T01:00:00.000Z', appProperties: { lexomataId: 'proj-1' } },
      { id: 'f2', name: 'Mi AFD.lexo', modifiedTime: '2026-11-22T01:00:00.000Z' },
    ];

    expect(findMatchingDriveFile(files, { id: 'proj-1', name: 'Mi AFD' })?.id).toBe('f1');
    expect(findMatchingDriveFile(files, { id: 'proj-2', name: 'Mi AFD' })?.id).toBe('f2');
    expect(findMatchingDriveFile(files, { id: 'proj-3', name: 'Otro' })).toBeUndefined();
  });

  it('no dispara falso conflicto cuando el remoto coincide con lastSyncedRemoteModifiedTime', () => {
    setLastSyncedRemoteModifiedTime('proj-1', '2026-11-22T01:00:00.000Z');
    const lastSynced = getLastSyncedRemoteModifiedTime('proj-1');
    expect(lastSynced).toBe('2026-11-22T01:00:00.000Z');

    // Edición local 5 minutos después, pero el remoto no cambió desde la última sincronización.
    expect(
      hasSyncConflict('2026-11-22T01:05:00.000Z', '2026-11-22T01:00:00.000Z', lastSynced),
    ).toBe(false);

    // Si otro dispositivo modificó el archivo remoto, sí hay conflicto.
    expect(
      hasSyncConflict('2026-11-22T01:05:00.000Z', '2026-11-22T01:03:00.000Z', lastSynced),
    ).toBe(true);
  });
});
