// SidebarSettingsModal - lets the user hide sidebar groups / individual links.
//
// UX (per planning-agent recommendation):
//   - Nested checkbox tree. Each group header is a tri-state checkbox
//     (all/some/none), each link a leaf checkbox.
//   - Overview group + its Dashboard link are pinned - checkbox disabled
//     with a small 'Pinned' badge so the user knows why.
//   - Reset to defaults button in the footer (with inline confirm).
//   - Modal shell mirrors the cashier modals for visual consistency.
//   - Hidden routes remain reachable by URL - filtering is chrome-only.

import { useState, type FC } from 'react';
import cls from './admin.module.css';
import { Button, Icon } from '../atoms';
import type { SidebarGroup } from './Sidebar';
import {
  useSidebarVisibility, isPinnedGroup, isPinnedLink, linkKey,
} from './useSidebarVisibility';

interface Props {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly groups: readonly SidebarGroup[];
}

export const SidebarSettingsModal: FC<Props> = ({ open, onClose, groups }) => {
  const v = useSidebarVisibility();
  const [confirmReset, setConfirmReset] = useState(false);

  if (!open) return null;

  // Group tri-state: 'all' | 'some' | 'none' - drives the group checkbox glyph.
  const groupState = (g: SidebarGroup): 'all' | 'some' | 'none' => {
    const total = g.links.length;
    const visible = g.links.filter((l) => !v.isLinkHidden(g.id, l)).length;
    if (v.isGroupHidden(g.id)) return 'none';
    if (visible === total) return 'all';
    if (visible === 0)     return 'none';
    return 'some';
  };

  const onGroupClick = (g: SidebarGroup) => {
    if (isPinnedGroup(g.id)) return;
    // If any child is hidden, un-hide all + un-hide group (single click = 'show all').
    // Else hide the whole group.
    const state = groupState(g);
    if (state === 'all') {
      // hide group entirely (leaves link-level state alone so re-showing restores it)
      v.toggleGroup(g.id);
    } else {
      // show all: clear per-link hides in this group + un-hide group.
      g.links.forEach((l) => { if (v.isLinkHidden(g.id, l)) v.toggleLink(g.id, l); });
      if (v.prefs.hiddenGroups.includes(g.id)) v.toggleGroup(g.id);
    }
  };

  const hiddenCount = v.prefs.hiddenGroups.length + v.prefs.hiddenLinks.length;

  return (
    <div className={cls.modalOverlay} onMouseDown={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className={cls.modalPanel} role="dialog" aria-modal="true" aria-label="Customize sidebar">
        <header className={cls.modalHeader}>
          <div className={cls.modalHeaderText}>
            <h2 className={cls.modalTitle}>Customize sidebar</h2>
            <p  className={cls.modalSubtitle}>
              Show only what you use. Hidden pages remain reachable by URL.
            </p>
          </div>
          <button type="button" className={cls.modalClose} onClick={onClose} aria-label="Close">
            <Icon name="close" size={16} />
          </button>
        </header>

        <div className={cls.modalBody}>
          {groups.map((g) => {
            const state = groupState(g);
            const pinned = isPinnedGroup(g.id);
            return (
              <div key={g.id} className={cls.settingsGroup}>
                <button
                  type="button"
                  className={cls.settingsGroupHeader}
                  onClick={() => onGroupClick(g)}
                  disabled={pinned}
                  aria-pressed={state === 'all'}
                >
                  <Checkbox state={pinned ? 'all' : state} />
                  {g.icon && <Icon name={g.icon} size={14} />}
                  <span className={cls.settingsGroupLabel}>{g.label}</span>
                  {pinned && <span className={cls.pinnedBadge}>Pinned</span>}
                  <span className={cls.settingsGroupCount}>
                    {g.links.filter((l) => !v.isLinkHidden(g.id, l)).length}/{g.links.length}
                  </span>
                </button>

                <div className={cls.settingsLinks}>
                  {g.links.map((link) => {
                    const linkPinned = isPinnedLink(g.id, link);
                    const hidden = v.isLinkHidden(g.id, link);
                    const groupHidden = v.isGroupHidden(g.id);
                    return (
                      <button
                        key={linkKey(g.id, link)}
                        type="button"
                        className={cls.settingsLink}
                        onClick={() => v.toggleLink(g.id, link)}
                        disabled={linkPinned || groupHidden}
                        title={
                          linkPinned  ? 'Pinned - always visible' :
                          groupHidden ? 'Group is hidden - show group first' : ''
                        }
                      >
                        <Checkbox state={
                          linkPinned  ? 'all' :
                          groupHidden ? 'none' :
                          hidden      ? 'none' : 'all'
                        } />
                        <Icon name={link.icon} size={14} />
                        <span className={cls.settingsLinkLabel}>{link.label}</span>
                        {linkPinned && <span className={cls.pinnedBadge}>Pinned</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <footer className={cls.modalFooter}>
          <span className={cls.modalFooterStatus}>
            {hiddenCount === 0
              ? 'All groups and pages visible.'
              : `${hiddenCount} item${hiddenCount === 1 ? '' : 's'} hidden.`}
          </span>
          <div className={cls.modalFooterActions}>
            {confirmReset ? (
              <>
                <span className={cls.modalFooterStatus}>Reset?</span>
                <Button variant="secondary" onClick={() => setConfirmReset(false)}>Cancel</Button>
                <Button variant="danger" onClick={() => { v.reset(); setConfirmReset(false); }}>Reset</Button>
              </>
            ) : (
              <>
                <Button
                  variant="secondary"
                  onClick={() => setConfirmReset(true)}
                  disabled={hiddenCount === 0}
                >
                  Reset to defaults
                </Button>
                <Button variant="primary" onClick={onClose}>Done</Button>
              </>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Tri-state checkbox glyph - purely presentational.                          */
/* -------------------------------------------------------------------------- */

const Checkbox: FC<{ state: 'all' | 'some' | 'none' }> = ({ state }) => (
  <span
    className={cls.checkbox}
    data-state={state}
    aria-hidden
  >
    {state === 'all'  && <Icon name="check"   size={10} />}
    {state === 'some' && <span className={cls.checkboxDash} />}
  </span>
);
