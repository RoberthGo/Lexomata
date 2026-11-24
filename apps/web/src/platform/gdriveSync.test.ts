import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createPkcePair,
  getGoogleClientId,
  hasSyncConflict,
  isDriveConfigured,
  setGoogleClientId,
  startDriveSignIn,
} from './gdriveSync';

describe('gdriveSync', () => {
  afterEach(() => {
    setGoogleClientId('');
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
});
