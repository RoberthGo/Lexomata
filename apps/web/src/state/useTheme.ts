import { useCallback, useEffect, useState } from 'react';

export type Theme = 'dark' | 'light' | 'soft-light';

const STORAGE_KEY = 'lexomata.theme';

function initialTheme(): Theme {
  if (typeof localStorage === 'undefined') {
    return 'dark';
  }
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'light' || saved === 'soft-light' || saved === 'dark') {
    return saved;
  }
  return 'dark';
}

export function useTheme(): {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
} {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Persistencia best-effort.
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) =>
      current === 'dark' ? 'soft-light' : current === 'soft-light' ? 'light' : 'dark',
    );
  }, []);

  return { theme, setTheme, toggleTheme };
}
