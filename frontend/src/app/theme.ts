const THEME_STORAGE_KEY = 'diploma-theme';

export type ThemeMode = 'light' | 'dark';

export function readTheme(): ThemeMode {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return stored === 'dark' ? 'dark' : 'light';
}

export function writeTheme(theme: ThemeMode): void {
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  document.documentElement.setAttribute('data-theme', theme);
  window.dispatchEvent(new CustomEvent('diploma-theme-change', { detail: theme }));
}
