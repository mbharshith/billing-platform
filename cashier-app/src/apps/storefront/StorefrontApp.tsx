// StorefrontApp — customer-facing shop (public, no auth).

// Mounted at /shop/* by <Shell />. Currently a stub — the real Phase-1
// delivery MVP lands here (see PLAN_V2.md \u00a75-7).

// URL shape: /shop/<tenantSlug>/<path>

// Stub sub-app now so future delivery build lands as pure additions in this folder.
import type { FC } from 'react';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { NotFoundPage } from '@shared/errors';
import { ComingSoonPage } from './ComingSoonPage';

export const StorefrontApp: FC = () => (
  <Routes>
    <Route index                 element={<Navigate to="demo" replace />} />
    <Route path=":tenantSlug/*"  element={<TenantShop />} />
    <Route path="*"              element={<NotFoundPage />} />
  </Routes>
);

// Per-tenant shop root. Once the real storefront ships this becomes its
//  own nested Routes tree (home, category, PDP, cart, checkout, tracking).
const TenantShop: FC = () => {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  return <ComingSoonPage tenantSlug={tenantSlug ?? 'unknown'} />;
};
