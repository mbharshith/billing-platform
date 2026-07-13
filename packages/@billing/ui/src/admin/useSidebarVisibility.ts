// Sidebar visibility - per-device localStorage v0 (per-user server sync later).
//
// Storage shape (tiny JSON blob):
//   { hiddenGroups: string[], hiddenLinks: string[] }
//
// hiddenLinks are keyed as "<groupId>::<link.path>" so we don't need a
// separate uniqueness pass across groups.
//
// Rules:
//   - Everything is visible by default (no prefs = show all).
//   - Overview group + its Dashboard link are ALWAYS visible (pinned home).
//     A user can bookmark chaos, but the sidebar must always give them
//     one safe way home.
//   - Hidden routes remain reachable by URL - filtering is chrome-only.

import { useCallback, useSyncExternalStore } from 'react';
import type { SidebarGroup, SidebarLink } from './Sidebar';

const STORAGE_KEY = 'admin-sidebar-visibility';
const PINNED_GROUP_ID = 'overview';

export interface VisibilityPrefs {
  readonly hiddenGroups: readonly string[];
  readonly hiddenLinks: readonly string[];   // "<groupId>::<link.path>"
}

const EMPTY: VisibilityPrefs = { hiddenGroups: [], hiddenLinks: [] };

// * Composite key so link paths don't have to be globally unique.
export const linkKey = (groupId: string, link: SidebarLink): string =>
  `${groupId}::${link.path}`;

// Storage plumbing - useSyncExternalStore keeps every mounted subscriber
// in lock-step (settings modal + sidebar both re-render on change).

const read = (): VisibilityPrefs => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<VisibilityPrefs>;
    return {
      hiddenGroups: Array.isArray(parsed.hiddenGroups) ? parsed.hiddenGroups : [],
      hiddenLinks:  Array.isArray(parsed.hiddenLinks)  ? parsed.hiddenLinks  : [],
    };
  } catch { return EMPTY; }
};

// useSyncExternalStore requires a stable snapshot reference between calls * when the underlying data hasn't changed. Returning a fresh object each * time here triggers React error #185 (Maximum update depth). We cache the * last snapshot + the raw JSON string it was built from and only invalidate * when the string actually changes.
let cachedRaw: string | null | undefined = undefined;
let cachedSnapshot: VisibilityPrefs = EMPTY;

const getSnapshot = (): VisibilityPrefs => {
  let raw: string | null = null;
  try { raw = localStorage.getItem(STORAGE_KEY); } catch { raw = null; }
  if (raw === cachedRaw) return cachedSnapshot;
  cachedRaw = raw;
  cachedSnapshot = read();
  return cachedSnapshot;
};

const invalidate = () => { cachedRaw = undefined; };

const listeners = new Set<() => void>();
const subscribe = (cb: () => void): (() => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const emit = () => listeners.forEach((cb) => cb());

const write = (next: VisibilityPrefs) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); }
  catch { /* quota */ }
  invalidate();
  emit();
};

// Cross-tab sync (rare on POS but essentially free to wire up).
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) { invalidate(); emit(); }
  });
}

// Public hook

export interface UseSidebarVisibility {
  readonly prefs: VisibilityPrefs;
  readonly isGroupHidden: (groupId: string) => boolean;
  readonly isLinkHidden:  (groupId: string, link: SidebarLink) => boolean;
  readonly toggleGroup:   (groupId: string) => void;
  readonly toggleLink:    (groupId: string, link: SidebarLink) => void;
  readonly reset:         () => void;
  // Filter a group list, dropping hidden groups + hidden links. Also drops *  any group that ends up with zero visible links (empty-parent rule).
  readonly filter:        (groups: readonly SidebarGroup[]) => readonly SidebarGroup[];
}

export const useSidebarVisibility = (): UseSidebarVisibility => {
  const prefs = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);

  const isGroupHidden = useCallback(
    (id: string) => id !== PINNED_GROUP_ID && prefs.hiddenGroups.includes(id),
    [prefs.hiddenGroups],
  );
  const isLinkHidden = useCallback(
    (groupId: string, link: SidebarLink) => {
      if (groupId === PINNED_GROUP_ID && link.path === '') return false; // Dashboard pinned
      return prefs.hiddenLinks.includes(linkKey(groupId, link));
    },
    [prefs.hiddenLinks],
  );

  const toggleGroup = useCallback((groupId: string) => {
    if (groupId === PINNED_GROUP_ID) return;
    const cur = read();
    const isHidden = cur.hiddenGroups.includes(groupId);
    write({
      ...cur,
      hiddenGroups: isHidden
        ? cur.hiddenGroups.filter((g) => g !== groupId)
        : [...cur.hiddenGroups, groupId],
    });
  }, []);

  const toggleLink = useCallback((groupId: string, link: SidebarLink) => {
    if (groupId === PINNED_GROUP_ID && link.path === '') return;
    const key = linkKey(groupId, link);
    const cur = read();
    const isHidden = cur.hiddenLinks.includes(key);
    write({
      ...cur,
      hiddenLinks: isHidden
        ? cur.hiddenLinks.filter((k) => k !== key)
        : [...cur.hiddenLinks, key],
    });
  }, []);

  const reset = useCallback(() => write(EMPTY), []);

  const filter = useCallback((groups: readonly SidebarGroup[]) => {
    return groups
      .filter((g) => !isGroupHidden(g.id))
      .map((g) => ({
        ...g,
        links: g.links.filter((l) => !isLinkHidden(g.id, l)),
      }))
      .filter((g) => g.links.length > 0);   // empty-parent rule
  }, [isGroupHidden, isLinkHidden]);

  return { prefs, isGroupHidden, isLinkHidden, toggleGroup, toggleLink, reset, filter };
};

// * Small helper: whether the given group is the pinned/non-toggleable one.
export const isPinnedGroup = (id: string): boolean => id === PINNED_GROUP_ID;
// * Small helper: whether the given link within a group is pinned.
export const isPinnedLink = (groupId: string, link: SidebarLink): boolean =>
  groupId === PINNED_GROUP_ID && link.path === '';
