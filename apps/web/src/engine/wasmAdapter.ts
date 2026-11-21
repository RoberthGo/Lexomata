import init, { engine_version } from '../wasm/lexomata_wasm.js';

let initialization: Promise<void> | null = null;

/**
 * Inicializa el módulo WASM una sola vez.
 * Todas las llamadas al motor deben pasar por este adaptador.
 */
export function initEngine(): Promise<void> {
  if (!initialization) {
    initialization = init().then(() => undefined);
  }
  return initialization;
}

/** Versión del motor Rust, usada por la comprobación de humo. */
export async function getEngineVersion(): Promise<string> {
  await initEngine();
  return engine_version();
}
