// Tenant slug helpers - one source of truth for the /<slug>/* URL scheme.
//
// A slug is the URL prefix that identifies a tenant (e.g. `velvet`, `spiceroute`).
// Every tenant page (storefront, cashier, admin) lives under /<slug>/... so the
// slug is always present in the URL.
//
// RESERVED_SLUGS keeps system paths (/login, /dashboard, /) from ever colliding
// with a tenant. Tenant creation validates against this list.
import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useStores } from '@shared/store/StoresContext';
import { storeIdToSlug } from '@shared/lib/resolveTenant';
import type { Store } from '@shared/domain/types';

/**
 * System paths that cannot be used as tenant slugs. Adding a new top-level route
 * (e.g. `/status`) means adding it here too.
 */
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  'dashboard',   // SaaS owner console
  'login',       // auth
  'signup',      // auth
  'logout',      // future
  'admin',       // future top-level admin
  'api',         // future backend
  'assets',      // future static
  'static',      // future static
  'shop',        // legacy redirect namespace
  'tenant',      // legacy redirect namespace
  'vendor',      // legacy redirect namespace
]);

export const isReservedSlug = (slug: string): boolean =>
  RESERVED_SLUGS.has(slug.toLowerCase().trim());

/**
 * Extract the tenant slug from the current URL (`/:slug/...`).
 * Returns null if we're on a non-tenant route (e.g. `/login`, `/`).
 */
export const useTenantSlug = (): string | null => {
  const { slug } = useParams<{ slug: string }>();
  if (!slug || isReservedSlug(slug)) return null;
  return slug;
};

/**
 * Resolve the current tenant Store from the slug in the URL.
 * Returns null if the slug is missing, reserved, or unknown.
 */
export const useCurrentTenant = (): Store | null => {
  const slug = useTenantSlug();
  const { stores } = useStores();
  return useMemo(() => {
    if (!slug) return null;
    return stores.find((s) => storeIdToSlug(s.id) === slug) ?? null;
  }, [slug, stores]);
};

/**
 * Given a store, build the URL for one of its sub-surfaces.
 * Central factory so a route rename touches ONE file, not fifty.
 */
export const tenantPath = (
  slug: string,
  surface: 'shop' | 'cashier' | 'admin',
  subpath = '',
): string => {
  const base = surface === 'shop' ? `/${slug}` : `/${slug}/${surface}`;
  return subpath ? `${base}/${subpath.replace(/^\//, '')}` : base;
};
