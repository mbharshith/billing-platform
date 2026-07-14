// MenuOutletHeader - hero banner for the public /:slug/menu/:outletSlug page.
// Shows outlet name, address, phone, and (when applicable) a small toggle
// between all sibling outlets so a customer who lands on the wrong branch
// can hop to the right one without going through search.
//
// Kept independent from StorefrontShell chrome so this page can render
// clean when opened in an in-app browser (WhatsApp / Instagram) without
// duplicating the shell's cart bar.

import type { FC } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@billing/ui/atoms';
import type { Store } from '@billing/shared/domain/types';
import type { Outlet } from '@billing/shared/domain/restaurant';
import { storeIdToSlug } from '@billing/shared/lib/resolveTenant';
import { outletSlug } from '@billing/shared/lib/resolveOutlet';
import cls from '../storefront.module.css';

interface Props {
  readonly tenant: Store;
  readonly outlet: Outlet;
  readonly siblings: readonly Outlet[];   // all active outlets for the tenant
  readonly orderMode: boolean;            // ?order=1
  readonly onShare: () => void;
}

export const MenuOutletHeader: FC<Props> = ({ tenant, outlet, siblings, orderMode, onShare }) => {
  const slug = storeIdToSlug(tenant.id);
  const showBranchSwitcher = siblings.length > 1;

  return (
    <header className={cls.menuHeader}>
      <div className={cls.menuHeader__topRow}>
        <div className={cls.menuHeader__brand}>
          <div className={cls.menuHeader__brandName}>{tenant.name}</div>
          <div className={cls.menuHeader__outletName}>{outlet.name}</div>
        </div>
        <button
          type="button"
          className={cls.menuHeader__shareBtn}
          onClick={onShare}
          aria-label="Share this menu"
        >
          <Icon name="phone" size={14} /> Share
        </button>
      </div>

      <div className={cls.menuHeader__meta}>
        <span className={cls.menuHeader__metaItem}>
          <Icon name="store" size={12} /> {outlet.address}
        </span>
        <span className={cls.menuHeader__metaItem}>
          <Icon name="phone" size={12} /> {outlet.phone}
        </span>
        {outlet.seatCapacity > 0 && (
          <span className={cls.menuHeader__metaItem}>
            <Icon name="group" size={12} /> Seats {outlet.seatCapacity}
          </span>
        )}
      </div>

      {showBranchSwitcher && (
        <div className={cls.menuHeader__branches}>
          <span className={cls.menuHeader__branchesLabel}>Other branches:</span>
          {siblings
            .filter((o) => o.id !== outlet.id)
            .map((o) => {
              const os = outletSlug(o, tenant);
              const href = `/${slug}/menu/${os}${orderMode ? '?order=1' : ''}`;
              const shortLabel = o.name.replace(tenant.name, '').replace(/^[\s-]+/, '') || o.city;
              return (
                <Link key={o.id} to={href} className={cls.menuHeader__branchChip}>
                  {shortLabel}
                </Link>
              );
            })}
        </div>
      )}

      {orderMode && (
        <div className={cls.menuHeader__orderBadge}>
          <Icon name="cart" size={12} /> Ordering enabled - tap items to add to bag
        </div>
      )}
    </header>
  );
};
