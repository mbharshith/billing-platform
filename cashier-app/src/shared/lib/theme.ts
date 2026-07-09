// Theme — light / dark with localStorage persistence + system-preference default.
// Keeps the toggle logic in one place; every consumer just calls `useTheme()`.

// Initial <html data-theme> is set in index.html to avoid light-flash. This module keeps DOM + localStorage in sync post-hydration.
import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'app-theme';

const readInitial = (): Theme => {
  if (typeof document === 'undefined') return 'light';
  // <html data-theme> was set inline in index.html before React booted.
  const attr = document.documentElement.dataset.theme;
  if (attr === 'dark' || attr === 'light') return attr;
  return 'light';
};

const apply = (theme: Theme): void => {
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* private mode */ }
};

export const useTheme = (): { theme: Theme; toggle: () => void; set: (t: Theme) => void } => {
  const [theme, setTheme] = useState<Theme>(readInitial);

  useEffect(() => { apply(theme); }, [theme]);

  const toggle = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), []);
  const set = useCallback((t: Theme) => setTheme(t), []);

  return { theme, toggle, set };
};
