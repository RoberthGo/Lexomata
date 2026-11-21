#!/usr/bin/env node
/**
 * Auditoría offline de Lexomata.
 *
 * Verifica que el build web:
 * 1. Exista.
 * 2. Incluya motor WASM, fuentes locales, service worker y manifiesto PWA.
 * 3. No cargue recursos remotos (CDNs, fuentes, scripts, imágenes o estilos).
 *
 * Uso: node scripts/audit-offline.mjs
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIST = join(ROOT, 'apps', 'web', 'dist');

const TEXT_EXTENSIONS = new Set(['.html', '.js', '.mjs', '.css', '.json', '.webmanifest', '.svg']);

const REMOTE_PATTERNS = [
  { label: 'atributo src remoto', pattern: /\bsrc\s*=\s*["']https?:\/\//gi },
  { label: 'atributo href remoto', pattern: /\bhref\s*=\s*["']https?:\/\//gi },
  { label: 'url() remota en CSS', pattern: /url\(\s*["']?https?:\/\//gi },
  { label: '@import remoto', pattern: /@import\s+(?:url\()?["']?https?:\/\//gi },
  { label: 'fetch remoto', pattern: /\bfetch\(\s*["'`]https?:\/\//gi },
  { label: 'CDN conocido', pattern: /\b(?:cdn\.jsdelivr\.net|unpkg\.com|cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)\b/gi },
];

function walk(directory) {
  const entries = [];
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) {
      entries.push(...walk(path));
    } else {
      entries.push(path);
    }
  }
  return entries;
}

function fail(message) {
  console.error(`✗ ${message}`);
  process.exitCode = 1;
}

if (!existsSync(DIST)) {
  fail('No existe apps/web/dist. Ejecuta `npm run build:web` antes de auditar.');
  process.exit();
}

const files = walk(DIST);
const relativeFiles = files.map((file) => relative(DIST, file).replaceAll('\\', '/'));

const requirements = [
  { label: 'motor WASM', test: (name) => name.endsWith('.wasm') },
  { label: 'fuente local .woff2', test: (name) => name.endsWith('.woff2') },
  { label: 'service worker', test: (name) => name === 'sw.js' },
  { label: 'manifiesto PWA', test: (name) => name === 'manifest.webmanifest' },
];

for (const requirement of requirements) {
  if (relativeFiles.some(requirement.test)) {
    console.log(`✓ ${requirement.label}`);
  } else {
    fail(`Falta ${requirement.label} en el build.`);
  }
}

let scanned = 0;
for (const file of files) {
  if (!TEXT_EXTENSIONS.has(extname(file))) {
    continue;
  }

  scanned += 1;
  const contents = readFileSync(file, 'utf8');
  const display = relative(DIST, file).replaceAll('\\', '/');

  for (const { label, pattern } of REMOTE_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(contents)) {
      fail(`${display}: ${label}.`);
    }
  }
}

if (scanned === 0) {
  fail('No se encontraron archivos de texto para auditar.');
}

if (process.exitCode !== 1) {
  console.log(`✓ ${scanned} archivos de texto sin recursos remotos`);
  console.log(`✓ auditoría offline aprobada (${relativeFiles.length} archivos)`);
}
