import { SCHEMA_VERSION, type LexoProject } from '../engine/types';
import { normalizeProject } from '../model/project';
import { isTauriRuntime } from './fileService';

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';

const PKCE_VERIFIER_KEY = 'lexomata_gdrive_verifier';
const PKCE_STATE_KEY = 'lexomata_gdrive_state';
const TOKEN_STORAGE_KEY = 'lexomata_gdrive_token';
const CLIENT_ID_STORAGE_KEY = 'lexomata_gdrive_client_id';

export interface DriveFileSummary {
  id: string;
  name: string;
  modifiedTime: string;
}

export interface DriveConflictInfo {
  fileId: string;
  fileName: string;
  localProject: LexoProject;
  remoteProject: LexoProject;
  remoteModifiedTime: string;
}

export function getGoogleClientId(): string {
  try {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(CLIENT_ID_STORAGE_KEY) : null;
    if (stored && stored.trim().length > 0) {
      return stored.trim();
    }
  } catch {
    // localStorage opcional.
  }
  return (import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '').trim();
}

export function setGoogleClientId(clientId: string): void {
  try {
    if (typeof localStorage === 'undefined') {
      return;
    }
    const trimmed = clientId.trim();
    if (trimmed) {
      localStorage.setItem(CLIENT_ID_STORAGE_KEY, trimmed);
    } else {
      localStorage.removeItem(CLIENT_ID_STORAGE_KEY);
    }
  } catch {
    // localStorage opcional.
  }
}

export function isDriveConfigured(): boolean {
  return getGoogleClientId().length > 0;
}

export function isOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine !== false;
}

function assertOnline(): void {
  if (!isOnline()) {
    throw new Error('Sin conexión a internet. Google Drive está desactivado en modo offline.');
  }
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function createPkcePair(): Promise<{ verifier: string; challenge: string }> {
  const random = new Uint8Array(32);
  crypto.getRandomValues(random);
  const verifier = base64UrlEncode(random);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  const challenge = base64UrlEncode(new Uint8Array(digest));
  return { verifier, challenge };
}

export function getStoredAccessToken(): string | null {
  try {
    const raw = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as { token?: string; expiresAt?: number };
    if (!parsed.token || !parsed.expiresAt || Date.now() >= parsed.expiresAt) {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      return null;
    }
    return parsed.token;
  } catch {
    return null;
  }
}

export function storeAccessToken(token: string, expiresInSeconds = 3600): void {
  try {
    sessionStorage.setItem(
      TOKEN_STORAGE_KEY,
      JSON.stringify({
        token,
        expiresAt: Date.now() + Math.max(60, expiresInSeconds - 60) * 1000,
      }),
    );
  } catch {
    // sessionStorage opcional.
  }
}

export function clearAccessToken(): void {
  try {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // Ignorar.
  }
}

function webRedirectUri(): string {
  return `${window.location.origin}${window.location.pathname}`;
}

async function exchangeCodeForToken(
  code: string,
  codeVerifier: string,
  redirectUri: string,
): Promise<string> {
  assertOnline();
  const clientId = getGoogleClientId();
  if (!clientId) {
    throw new Error('Falta configurar VITE_GOOGLE_CLIENT_ID.');
  }

  const body = new URLSearchParams({
    client_id: clientId,
    code,
    code_verifier: codeVerifier,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
  });

  const tokenUrl = GOOGLE_TOKEN_URL;
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!response.ok) {
    throw new Error(`No se pudo completar OAuth con Google (${response.status}).`);
  }

  const json = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!json.access_token) {
    throw new Error('Google OAuth no devolvió access_token.');
  }
  storeAccessToken(json.access_token, json.expires_in);
  return json.access_token;
}

/** Inicia flujo OAuth 2.0 PKCE en Web (redirección) o Tauri (loopback local). */
export async function startDriveSignIn(): Promise<string | null> {
  assertOnline();
  const clientId = getGoogleClientId();
  if (!clientId) {
    throw new Error('Google Drive no está configurado en esta compilación (VITE_GOOGLE_CLIENT_ID).');
  }

  const { verifier, challenge } = await createPkcePair();
  const stateBytes = new Uint8Array(16);
  crypto.getRandomValues(stateBytes);
  const state = base64UrlEncode(stateBytes);

  if (isTauriRuntime()) {
    const { invoke } = await import('@tauri-apps/api/core');
    const redirectUri = await invoke<string>('reserve_oauth_loopback');
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: DRIVE_SCOPE,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      state,
      access_type: 'online',
      prompt: 'consent',
    });
    const authUrl = `${GOOGLE_AUTH_URL}?${params.toString()}`;
    window.open(authUrl, '_blank', 'noopener,noreferrer');
    const result = await invoke<{ code: string; state?: string; redirectUri: string }>(
      'await_oauth_loopback',
      { redirectUri },
    );
    if (result.state && result.state !== state) {
      throw new Error('Estado OAuth inválido.');
    }
    return exchangeCodeForToken(result.code, verifier, result.redirectUri);
  }

  sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier);
  sessionStorage.setItem(PKCE_STATE_KEY, state);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: webRedirectUri(),
    response_type: 'code',
    scope: DRIVE_SCOPE,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
    access_type: 'online',
  });
  window.location.assign(`${GOOGLE_AUTH_URL}?${params.toString()}`);
  return null;
}

/** Completa OAuth PKCE si la URL actual trae `?code=...&state=...` tras redirección web. */
export async function completeWebOAuthRedirect(): Promise<boolean> {
  if (typeof window === 'undefined' || !isOnline()) {
    return false;
  }
  const url = new URL(window.location.href);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const expectedState = sessionStorage.getItem(PKCE_STATE_KEY);
  const verifier = sessionStorage.getItem(PKCE_VERIFIER_KEY);
  if (!code || !verifier) {
    return false;
  }
  if (expectedState && state !== expectedState) {
    return false;
  }

  sessionStorage.removeItem(PKCE_STATE_KEY);
  sessionStorage.removeItem(PKCE_VERIFIER_KEY);
  url.searchParams.delete('code');
  url.searchParams.delete('state');
  url.searchParams.delete('scope');
  window.history.replaceState({}, document.title, url.toString());

  await exchangeCodeForToken(code, verifier, webRedirectUri());
  return true;
}

async function driveFetch(url: string, token: string, init: RequestInit = {}): Promise<Response> {
  assertOnline();
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(url, { ...init, headers });
  if (response.status === 401) {
    clearAccessToken();
    throw new Error('La sesión de Google Drive expiró. Vuelve a conectar.');
  }
  if (!response.ok) {
    throw new Error(`Error de Google Drive (${response.status}).`);
  }
  return response;
}

export async function ensureLexomataFolder(token: string): Promise<string> {
  const query = encodeURIComponent(
    "name = 'Lexomata' and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
  );
  const listUrl = `${DRIVE_FILES_URL}?q=${query}&fields=files(id,name)&pageSize=1`;
  const listed = (await (await driveFetch(listUrl, token)).json()) as {
    files?: Array<{ id: string }>;
  };
  if (listed.files && listed.files.length > 0) {
    return listed.files[0]!.id;
  }

  const createUrl = DRIVE_FILES_URL;
  const created = (await (
    await driveFetch(createUrl, token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Lexomata',
        mimeType: 'application/vnd.google-apps.folder',
      }),
    })
  ).json()) as { id: string };
  return created.id;
}

export async function listDriveProjects(token: string): Promise<DriveFileSummary[]> {
  const query = encodeURIComponent("name contains '.lexo' and trashed = false");
  const url = `${DRIVE_FILES_URL}?q=${query}&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc&pageSize=30`;
  const data = (await (await driveFetch(url, token)).json()) as {
    files?: DriveFileSummary[];
  };
  return data.files ?? [];
}

export async function downloadDriveProject(token: string, fileId: string): Promise<LexoProject> {
  const url = `${DRIVE_FILES_URL}/${encodeURIComponent(fileId)}?alt=media`;
  const raw = await (await driveFetch(url, token)).json();
  return normalizeProject(raw);
}

export async function uploadDriveProject(
  token: string,
  project: LexoProject,
  existingFileId?: string,
): Promise<DriveFileSummary> {
  const folderId = existingFileId ? undefined : await ensureLexomataFolder(token);
  const fileName = `${project.name.trim() || 'proyecto'}.lexo`;
  const metadata: Record<string, unknown> = {
    name: fileName,
    mimeType: 'application/json',
    appProperties: { schemaVersion: SCHEMA_VERSION, lexomataId: project.id },
  };
  if (folderId) {
    metadata.parents = [folderId];
  }

  const boundary = `lexomata_${Date.now()}`;
  const multipartBody = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(metadata),
    `--${boundary}`,
    'Content-Type: application/json',
    '',
    JSON.stringify(project, null, 2),
    `--${boundary}--`,
  ].join('\r\n');

  const url = existingFileId
    ? `${DRIVE_UPLOAD_URL}/${encodeURIComponent(existingFileId)}?uploadType=multipart&fields=id,name,modifiedTime`
    : `${DRIVE_UPLOAD_URL}?uploadType=multipart&fields=id,name,modifiedTime`;

  const response = await driveFetch(url, token, {
    method: existingFileId ? 'PATCH' : 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body: multipartBody,
  });

  return (await response.json()) as DriveFileSummary;
}

export function hasSyncConflict(localUpdatedAt: string, remoteModifiedTime: string): boolean {
  const localMs = Date.parse(localUpdatedAt);
  const remoteMs = Date.parse(remoteModifiedTime);
  if (!Number.isFinite(localMs) || !Number.isFinite(remoteMs)) {
    return false;
  }
  return Math.abs(localMs - remoteMs) > 2000;
}
