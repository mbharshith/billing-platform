// resolveOutlet - THE ONLY place that maps a URL slug to a specific outlet.
// Mirrors resolveTenant.ts. Every storefront/menu page that cares about
// outlet identity flows through here, so if the URL shape ever changes
// (e.g. `/:slug/menu/:outletSlug` -> `/menu/:combined`) it's a one-file swap.
//
// Slug scheme (today):
//   * Primary outlet (id === storeId, e.g. "store-spiceroute")  -> "main"
//   * Non-primary outlets keep the trailing segment of the id:
//         outlet-spice-koram       -> "koram"
//         outlet-velvet-bandra     -> "bandra"
//         outlet-lamaison-manhattan -> "manhattan"
//   * If two outlets ever collide on the tail segment, we fall back to
//     the full id (which is unique by construction). This never happens
//     today but future-proofs the resolver.

import { db } from './db';
import type { Store } from '@billing/shared/domain/types';
import type { Outlet } from '@billing/shared/domain/restaurant';

// Derive the URL slug for a given outlet.
export const outletSlug = (outlet: Outlet, store: Store): string => {
  if (outlet.id === store.id) return 'main';
  const tail = outlet.id.split('-').pop();
  return tail && tail.length > 0 ? tail : outlet.id;
};

// Resolve a (store, slug) pair back to an Outlet, or null when unknown.
// The slug "main" (or empty/undefined) resolves to the store's primary outlet.
export const resolveOutlet = async (
  store: Store,
  slug: string | undefined,
): Promise<Outlet | null> => {
  const outlets = await db.outlets
    .where('storeId')
    .equals(store.id)
    .and((o) => o.active !== false)
    .toArray();

  if (!slug || slug === 'main') {
    return outlets.find((o) => o.id === store.id) ?? outlets[0] ?? null;
  }

  // 1. Slug matches the trailing segment of an outlet id.
  const bySegment = outlets.find((o) => o.id.split('-').pop() === slug);
  if (bySegment) return bySegment;

  // 2. Slug matches the full id (fallback for collision safety).
  const byId = outlets.find((o) => o.id === slug);
  if (byId) return byId;

  return null;
};

// List every outlet of a store with its computed slug.
// Used by admin surfaces (e.g. Share-menu picker) to show "koram, hsr, main".
export const listOutletsWithSlug = async (
  store: Store,
): Promise<readonly { readonly outlet: Outlet; readonly slug: string }[]> => {
  const outlets = await db.outlets
    .where('storeId')
    .equals(store.id)
    .and((o) => o.active !== false)
    .toArray();
  return outlets.map((outlet) => ({ outlet, slug: outletSlug(outlet, store) }));
};
