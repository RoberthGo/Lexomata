import { useCallback, useEffect, useState } from 'react';

export type AccentPreset = 'cobalt' | 'emerald' | 'amber' | 'slate';
export type UiDensity = 'comfortable' | 'compact';
export type DockPosition = 'left' | 'right' | 'bottom';
export type SimPosition = 'bottom' | 'top';

export interface UiPrefs {
  accent: AccentPreset;
  density: UiDensity;
  dockPosition: DockPosition;
  simPosition: SimPosition;
  simCollapsed: boolean;
  showGrid: boolean;
  snapToGrid: boolean;
  showNotes: boolean;
  inspectorWidth: number;
}

const STORAGE_KEY = 'lexomata_ui_prefs_v1';

export const DEFAULT_UI_PREFS: UiPrefs = {
  accent: 'cobalt',
  density: 'comfortable',
  dockPosition: 'left',
  simPosition: 'bottom',
  simCollapsed: false,
  showGrid: true,
  snapToGrid: true,
  showNotes: true,
  inspectorWidth: 344,
};

function clampInspectorWidth(value: number): number {
  return Math.max(280, Math.min(520, Math.round(value)));
}

function readStoredPrefs(): UiPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_UI_PREFS;
    }
    const parsed = JSON.parse(raw) as Partial<UiPrefs>;
    return {
      accent:
        parsed.accent === 'cobalt' ||
        parsed.accent === 'emerald' ||
        parsed.accent === 'amber' ||
        parsed.accent === 'slate'
          ? parsed.accent
          : DEFAULT_UI_PREFS.accent,
      density:
        parsed.density === 'compact' || parsed.density === 'comfortable'
          ? parsed.density
          : DEFAULT_UI_PREFS.density,
      dockPosition:
        parsed.dockPosition === 'left' ||
        parsed.dockPosition === 'right' ||
        parsed.dockPosition === 'bottom'
          ? parsed.dockPosition
          : DEFAULT_UI_PREFS.dockPosition,
      simPosition:
        parsed.simPosition === 'top' || parsed.simPosition === 'bottom'
          ? parsed.simPosition
          : DEFAULT_UI_PREFS.simPosition,
      simCollapsed: typeof parsed.simCollapsed === 'boolean' ? parsed.simCollapsed : false,
      showGrid: typeof parsed.showGrid === 'boolean' ? parsed.showGrid : true,
      snapToGrid: typeof parsed.snapToGrid === 'boolean' ? parsed.snapToGrid : true,
      showNotes: typeof parsed.showNotes === 'boolean' ? parsed.showNotes : true,
      inspectorWidth:
        typeof parsed.inspectorWidth === 'number' && Number.isFinite(parsed.inspectorWidth)
          ? clampInspectorWidth(parsed.inspectorWidth)
          : DEFAULT_UI_PREFS.inspectorWidth,
    };
  } catch {
    return DEFAULT_UI_PREFS;
  }
}

export function useUiPrefs() {
  const [prefs, setPrefs] = useState<UiPrefs>(readStoredPrefs);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.accent = prefs.accent;
    root.dataset.density = prefs.density;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // localStorage opcional.
    }
  }, [prefs]);

  const updatePrefs = useCallback((patch: Partial<UiPrefs>) => {
    setPrefs((current) => ({
      ...current,
      ...patch,
      inspectorWidth:
        patch.inspectorWidth !== undefined
          ? clampInspectorWidth(patch.inspectorWidth)
          : current.inspectorWidth,
    }));
  }, []);

  const resetPrefs = useCallback(() => {
    setPrefs(DEFAULT_UI_PREFS);
  }, []);

  return { prefs, updatePrefs, resetPrefs };
}
