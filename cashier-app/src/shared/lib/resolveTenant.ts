// Tenant resolution seam - THE ONLY place that maps a request context to a Store.
// Today: reads path segment (/shop/<slug>) or window.location.hostname subdomain.
// Tomorrow: add a `customDomain` column check as line 1 - every other file already
// consumes useStorefrontTenant() and neither knows nor cares which URL got them here.
import { db } from './db';
import { BRAND } from '@shared/brand';
import type { Store } from '@shared/domain/types';

// Platform apex - the base domain we own. Subdomains under this map to tenant slugs.
export const PLATFORM_APEX = BRAND.platformApex;

// Reverse the SEED_STORE_* convention: `store-myntra` <-> `myntra`.
export const storeIdToSlug = (storeId: string): string =>
  storeId.replace(/^store-/, '');

export const slugToStoreId = (slug: string): string => `store-${slug}`;

// Given the current request context (path slug + hostname), return the tenant Store or null.
// Path takes precedence (today's URL shape); hostname is the future subdomain path.
export const resolveTenant = async (
  pathSlug: string | undefined,
  hostname: string,
): Promise<Store | null> => {
  // 1. LATER: custom domain lookup. Placeholder for the paid upsell feature.
  //    const byCustom = await db.stores.where('customDomain').equals(hostname).first();
  //    if (byCustom) return byCustom;

  // 2. Subdomain under our platform apex (e.g. myntra.quickbill.shop).
  if (hostname.endsWith(`.${PLATFORM_APEX}`)) {
    const sub = hostname.slice(0, -1 * (PLATFORM_APEX.length + 1));
    const store = await db.stores.get(slugToStoreId(sub));
    if (store) return store;
  }

  // 3. Path-based fallback (/shop/<slug>) - today's dev URL shape.
  if (pathSlug) {
    const store = await db.stores.get(slugToStoreId(pathSlug));
    if (store) return store;
  }

  return null;
};
