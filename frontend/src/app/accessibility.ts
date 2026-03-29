const ACCESSIBILITY_STORAGE_KEY = 'diploma-accessibility';

type AccessibilityPrefs = {
  highContrast: boolean;
  reducedMotion: boolean;
  largeText: boolean;
};

const defaultPrefs: AccessibilityPrefs = {
  highContrast: false,
  reducedMotion: false,
  largeText: false,
};

export function readAccessibilityPrefs(): AccessibilityPrefs {
  try {
    const raw = localStorage.getItem(ACCESSIBILITY_STORAGE_KEY);
    if (!raw) return defaultPrefs;
    return { ...defaultPrefs, ...(JSON.parse(raw) as Partial<AccessibilityPrefs>) };
  } catch {
    return defaultPrefs;
  }
}

export function writeAccessibilityPrefs(prefs: AccessibilityPrefs): void {
  localStorage.setItem(ACCESSIBILITY_STORAGE_KEY, JSON.stringify(prefs));
  applyAccessibilityPrefs(prefs);
}

export function applyAccessibilityPrefs(prefs: AccessibilityPrefs): void {
  document.documentElement.toggleAttribute('data-high-contrast', prefs.highContrast);
  document.documentElement.toggleAttribute('data-reduced-motion', prefs.reducedMotion);
  document.documentElement.toggleAttribute('data-large-text', prefs.largeText);
}
