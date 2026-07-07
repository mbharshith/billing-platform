/**
 * Tiny localStorage helper — safe JSON round-trip, no throw on quota/JSON errors.
 * Frontend-only persistence. Swap for API calls when the backend arrives (§2, §21).
 */

const NAMESPACE = 'cashier-app::v1::';

const key = (name: string): string => `${NAMESPACE}${name}`;

export const storage = {
  load<T>(name: string, fallback: T): T {
    try {
      const raw = window.localStorage.getItem(key(name));
      if (raw === null) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      // Malformed JSON or blocked storage — treat as unset.
      return fallback;
    }
  },

  save<T>(name: string, value: T): void {
    try {
      window.localStorage.setItem(key(name), JSON.stringify(value));
    } catch {
      // Quota exceeded / disabled — swallow. Data loss is acceptable in a
      // mock frontend; a real backend would surface this to the user.
    }
  },

  remove(name: string): void {
    try { window.localStorage.removeItem(key(name)); } catch { /* ignore */ }
  },

  clearAll(): void {
    try {
      const toRemove: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k?.startsWith(NAMESPACE)) toRemove.push(k);
      }
      for (const k of toRemove) window.localStorage.removeItem(k);
    } catch { /* ignore */ }
  },
};
