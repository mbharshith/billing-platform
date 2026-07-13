// AdminSidebar - live-search + collapsible groups + tinted per-group icons.
//
// UX design:
//   1. Search input at the top filters links in-place. Groups with zero
//      matches hide entirely. Empty state message when no matches.
//   2. Each group header is a button with a rotating chevron. Toggle state
//      is persisted per-group in localStorage. Smart initial defaults:
//      only Overview + POS + Menu open on first visit.
//   3. Icons take the group's accent color (subtle) - dramatically improves
//      scan-ability even though many icons are generic.
//   4. When collapsed to icon rail: no search, no chevrons, all groups
//      always show all links (compact icon stack). Flyout tooltip on hover.
//   5. Auto-expand a group when a search finds matches inside it.
//
// This file lives outside index.tsx to keep index under 600 lines
// (project convention).

import { useEffect, useMemo, useState, type FC } from 'react';
import { NavLink } from 'react-router-dom';
import cls from './admin.module.css';
import { Icon, Text, type IconName } from '@billing/ui/atoms';
import { BRAND } from '@billing/shared/brand';
import { useSidebarVisibility } from './useSidebarVisibility';
import { SidebarSettingsModal } from './SidebarSettingsModal';

// Types

export interface SidebarLink {
  readonly path: string;
  readonly label: string;
  readonly icon: IconName;
}

export interface SidebarGroup {
  readonly id: string;
  readonly label: string;
  // Icon shown next to the group header. Falls back to a coloured dot *  when not supplied (back-compat with older callers).
  readonly icon?: IconName;
  // Whether the group is expanded on the FIRST visit. Once the user *  toggles it, localStorage takes over.
  readonly defaultOpen: boolean;
  readonly links: readonly SidebarLink[];
}

// Local-storage helpers - one key per group, keeps the parse cheap.

const GROUP_STATE_KEY = 'admin-sidebar-groups';

type GroupState = Record<string, boolean>;

const readGroupState = (): GroupState => {
  try {
    const raw = localStorage.getItem(GROUP_STATE_KEY);
    return raw ? (JSON.parse(raw) as GroupState) : {};
  } catch { return {}; }
};

const writeGroupState = (state: GroupState): void => {
  try { localStorage.setItem(GROUP_STATE_KEY, JSON.stringify(state)); }
  catch { /* ignore quota errors */ }
};

// AdminSidebar

interface AdminSidebarProps {
  readonly slug: string;
  readonly collapsed: boolean;
  readonly groups: readonly SidebarGroup[];
}

export const AdminSidebar: FC<AdminSidebarProps> = ({ slug, collapsed, groups }) => {
  // Per-user visibility prefs (localStorage). Applied BEFORE search filtering
  // so hidden groups/links do not appear in either the tree or the filtered
  // search results.
  const visibility = useSidebarVisibility();
  const visibleGroups = useMemo(() => visibility.filter(groups), [visibility, groups]);

  // Settings modal open state - local to the sidebar.
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Filter query - drives live search.
  const [query, setQuery] = useState('');
  const normalized = query.trim().toLowerCase();

  // Per-group open state, persisted. Seed from `groups` (full list) so that
  // toggling a link back on later keeps the previous open/closed choice.
  const [openMap, setOpenMap] = useState<GroupState>(() => {
    const stored = readGroupState();
    const seeded: GroupState = {};
    groups.forEach((g) => {
      seeded[g.id] = stored[g.id] ?? g.defaultOpen;
    });
    return seeded;
  });

  useEffect(() => { writeGroupState(openMap); }, [openMap]);

  // Filtered groups. Search runs OVER the visibility-filtered list so
  // hidden pages never appear in search results either.
  const filteredGroups = useMemo(() => {
    if (!normalized) return visibleGroups.map((g) => ({ ...g, matchedLinks: g.links }));
    return visibleGroups
      .map((g) => ({
        ...g,
        matchedLinks: g.links.filter((l) =>
          l.label.toLowerCase().includes(normalized) ||
          l.path.toLowerCase().includes(normalized),
        ),
      }))
      .filter((g) => g.matchedLinks.length > 0);
  }, [visibleGroups, normalized]);

  const isSearching = !!normalized;
  const nothingFound = isSearching && filteredGroups.length === 0;

  const toggleGroup = (id: string) => {
    setOpenMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <aside
      className={cls.sidebar}
      data-collapsed={collapsed}
      aria-label="Admin navigation"
    >
      {/* Brand - single-line to keep header height exactly 60px (matches topbar) */}
      <div className={cls.sidebar__brand}>
        <span className={cls['sidebar__brand-mark']}>
          <Icon name="spark" size={18} />
        </span>
        {!collapsed && (
          <div className={cls['sidebar__brand-text']}>
            <Text as="span" size="sm" weight="heavy">{BRAND.name}</Text>
            <Text as="span" size="xs" tone="subtle">Admin</Text>
          </div>
        )}
      </div>

      {/* Live search - only when expanded, pinned above the scroll area. */}
      {!collapsed && (
        <div className={cls['sidebar__search']}>
          <Icon name="search" size={14} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter menu..."
            aria-label="Filter navigation"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className={cls['sidebar__search-clear']}
              aria-label="Clear filter"
            >
              <Icon name="close" size={12} />
            </button>
          )}
        </div>
      )}

      {/* Scroll area - the ONLY scrollable region. Brand + search + footer are pinned. */}
      <div className={cls['sidebar__scroll']}>
        {/* Empty state */}
        {nothingFound && !collapsed && (
          <div className={cls['sidebar__empty']}>
            <Icon name="search" size={20} tone="muted" />
            <Text as="span" size="sm" tone="subtle">No matches for &ldquo;{query}&rdquo;</Text>
          </div>
        )}

        {/* Groups */}
        {filteredGroups.map((group) => {
        // When searching or collapsed, always show; user is scanning.
        const forceOpen = isSearching || collapsed;
        const isOpen = forceOpen || openMap[group.id] !== false;

        return (
          <div key={group.id} className={cls.sidebar__group} data-group={group.id}>
            {/* Header - button (clickable) when not collapsed, span when collapsed. */}
            {!collapsed ? (
              <button
                type="button"
                className={cls['sidebar__group-header']}
                onClick={() => toggleGroup(group.id)}
                aria-expanded={isOpen}
                data-open={isOpen}
                disabled={isSearching}   /* don't allow toggle during search */
              >
                {group.icon
                  ? <Icon name={group.icon} size={14} className={cls['sidebar__group-icon']} />
                  : <span className={cls['sidebar__group-dot']} aria-hidden />}
                <span className={cls['sidebar__group-label']}>{group.label}</span>
                {!isSearching && (
                  <Icon
                    name="chevron"
                    size={12}
                    className={`${cls['sidebar__group-chevron']} ${isOpen ? cls['sidebar__group-chevron--open'] : ''}`}
                  />
                )}
                {isSearching && (
                  <span className={cls['sidebar__group-count']}>{group.matchedLinks.length}</span>
                )}
              </button>
            ) : (
              <div className={cls['sidebar__group-header']} title={group.label}>
                {group.icon
                  ? <Icon name={group.icon} size={16} className={cls['sidebar__group-icon']} />
                  : <span className={cls['sidebar__group-dot']} aria-hidden />}
              </div>
            )}

            {/* Links */}
            {isOpen && group.matchedLinks.map((link) => (
              <NavLink
                key={link.path}
                to={`/${slug}/admin/${link.path}`}
                end={link.path === ''}
                data-label={link.label}
                className={({ isActive }) => [
                  cls.sidebar__link,
                  isActive && cls['sidebar__link--active'],
                ].filter(Boolean).join(' ')}
                title={link.label}
              >
                <span className={cls['sidebar__link-icon']}>
                  <Icon name={link.icon} size={16} />
                </span>
                <span className={cls['sidebar__link-label']}>
                  {highlightMatch(link.label, normalized)}
                </span>
              </NavLink>
            ))}
          </div>
        );
      })}
      </div>

      {/* Footer - pinned at the bottom. Settings gear opens visibility modal. */}
      <div className={cls.sidebar__footer}>
        <button
          type="button"
          className={cls['sidebar__footer-btn']}
          onClick={() => setSettingsOpen(true)}
          aria-label="Customize sidebar"
          title="Customize sidebar"
        >
          <Icon name="settings" size={14} />
          {!collapsed && <span>Customize</span>}
        </button>
      </div>

      <SidebarSettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        groups={groups}
      />
    </aside>
  );
};

// Utility: highlight matched substring in link label

const highlightMatch = (label: string, needle: string) => {
  if (!needle) return label;
  const idx = label.toLowerCase().indexOf(needle);
  if (idx < 0) return label;
  const before = label.slice(0, idx);
  const match  = label.slice(idx, idx + needle.length);
  const after  = label.slice(idx + needle.length);
  return (
    <>
      {before}
      <mark className={cls['sidebar__link-mark']}>{match}</mark>
      {after}
    </>
  );
};
