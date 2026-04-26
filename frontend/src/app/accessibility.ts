const ACCESSIBILITY_STORAGE_KEY = 'diploma-accessibility';

type AccessibilityPrefs = {
  highContrast: boolean;
  reducedMotion: boolean;
  magnifierEnabled: boolean;
  magnifierScale: number;
  speechOnHover: boolean;
};

const defaultPrefs: AccessibilityPrefs = {
  highContrast: false,
  reducedMotion: false,
  magnifierEnabled: false,
  magnifierScale: 1.25,
  speechOnHover: false,
};

let speechListenerAttached = false;
let lastSpoken = '';

function speakText(text: string) {
  if (!('speechSynthesis' in window)) {
    return;
  }

  const normalized = text.trim();
  if (!normalized || normalized === lastSpoken) {
    return;
  }

  lastSpoken = normalized;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(normalized.slice(0, 120));
  utterance.lang = 'ru-RU';
  utterance.rate = 1;
  window.speechSynthesis.speak(utterance);
}

function attachSpeechOnHover() {
  if (speechListenerAttached) {
    return;
  }

  document.addEventListener('mouseover', (event) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    if (!document.documentElement.hasAttribute('data-speech-hover')) return;

    const el = target.closest('button, a, [role="button"], [role="menuitem"], input, textarea, [aria-label], .ant-select-selector, .ant-menu-item, .ant-switch') as
      | HTMLElement
      | null;
    if (!el) return;

    const text =
      el.getAttribute('aria-label') ||
      el.getAttribute('title') ||
      el.textContent ||
      (el as HTMLInputElement).placeholder ||
      '';

    speakText(text);
  });

  speechListenerAttached = true;
}

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
  attachSpeechOnHover();

  document.documentElement.toggleAttribute('data-high-contrast', prefs.highContrast);
  document.documentElement.toggleAttribute('data-reduced-motion', prefs.reducedMotion);
  document.documentElement.toggleAttribute('data-speech-hover', prefs.speechOnHover);

  if (prefs.magnifierEnabled) {
    document.body.style.zoom = String(Math.min(2, Math.max(1, prefs.magnifierScale)));
  } else {
    document.body.style.zoom = '1';
  }
}
