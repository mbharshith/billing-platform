// Shell - host app. Owns the ONE BrowserRouter, /login, route guards, the
// SaaS marketing homepage, and mounts each sub-app at its top-level URL.
//
// URL architecture (final):
//   /                    -> SaaS marketing home (public, no auth)
//   /login               -> auth
//   /dashboard/*         -> SaaS owner console (Walmart-level, vendor role)
//   /<slug>              -> customer shop (public, per-tenant, e.g. /myntra)
//   /<slug>/cashier/*    -> tenant POS (staff auth, e.g. /myntra/cashier)
//   /<slug>/admin/*      -> tenant admin (admin auth, e.g. /myntra/admin)
//
// Legacy URLs redirect to their new equivalents so bookmarks/QR codes keep
// working. Reserved slugs live in @shared/lib/tenantSlug.
import { lazy, Suspense, type FC, type JSX } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { AppSplash, ErrorBoundary, NotFoundPage } from '@shared/errors';
import { LoginPage } from './LoginPage';
import { MarketingHomePage } from './MarketingHomePage';
import { ProtectedRoute, AdminRoute, VendorRoute } from './RouteGuards';

/* -------------------------------------------------------------------------- */
/* Sub-apps - lazy so each ships its own JS chunk                             */
/* -------------------------------------------------------------------------- */
const CashierApp    = lazy(() => import('@apps/counter/CounterApp')
  .then((m) => ({ default: m.CashierApp })));
const AdminApp      = lazy(() => import('@apps/counter/CounterApp')
  .then((m) => ({ default: m.AdminApp })));
const VendorApp     = lazy(() => import('@apps/vendor/VendorApp')
  .then((m) => ({ default: m.VendorApp })));
const StorefrontApp = lazy(() => import('@apps/storefront/StorefrontApp')
  .then((m) => ({ default: m.StorefrontApp })));


const SubApp = (label: string, node: JSX.Element): JSX.Element => (
  <ErrorBoundary label={label}>
    <Suspense fallback={<AppSplash state="loading" onRetry={() => window.location.reload()} />}>
      {node}
    </Suspense>
  </ErrorBoundary>
);

/** Preserve path suffix + query when redirecting a legacy route. */
const RedirectWithSplat: FC<{ to: string }> = ({ to }) => {
  const { '*': splat } = useParams();
  const { search } = useLocation();
  const suffix = splat ? `/${splat}` : '';
  return <Navigate to={`${to}${suffix}${search}`} replace />;
};

/**
 * Legacy /shop/<slug>/... -> /<slug>/... rewrite. The old customer URL had a
 * /shop/ prefix; the new scheme uses the slug at the root.
 */
const LegacyShopRedirect: FC = () => {
  const { slug, '*': splat } = useParams();
  const { search } = useLocation();
  if (!slug) return <Navigate to="/" replace />;
  const suffix = splat ? `/${splat}` : '';
  return <Navigate to={`/${slug}${suffix}${search}`} replace />;
};

export const Shell: FC = () => (
  <BrowserRouter
    future={{
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    }}
  >
    <ErrorBoundary label="shell">
      <Routes>
        {/* ---------- SaaS marketing home ---------- */}
        <Route path="/" element={<ErrorBoundary label="marketing"><MarketingHomePage /></ErrorBoundary>} />

        {/* ---------- auth ---------- */}
        <Route path="/login" element={<ErrorBoundary label="login"><LoginPage /></ErrorBoundary>} />
        <Route path="/signup" element={<Navigate to="/login?onboard=1" replace />} />

        {/* ---------- SaaS owner console (vendor role) ---------- */}
        <Route element={<VendorRoute />}>
          <Route path="/dashboard/*" element={SubApp('vendor', <VendorApp />)} />
        </Route>

        {/* ---------- tenant staff surfaces (/<slug>/cashier|admin/*) ----- */}
        {/* Auth is enforced INSIDE CounterApp per-subtree (cashier=any staff,
            admin=admin only) rather than at the wrapper so the storefront
            below can still be public. */}
        <Route path="/:slug/cashier/*" element={SubApp('cashier', <CashierApp />)} />
        <Route path="/:slug/admin/*"   element={SubApp('admin',   <AdminApp />)} />

        {/* ---------- tenant storefront (public, /<slug>) ---------------- */}
        {/* This must come AFTER the /:slug/cashier|admin routes so those
            more-specific patterns win. */}
        <Route path="/:slug/*" element={SubApp('storefront', <StorefrontApp />)} />

        {/* ---------- legacy URL redirects ---------- */}
        {/* Vendor console moved to /dashboard */}
        <Route path="/vendor/*" element={<RedirectWithSplat to="/dashboard" />} />
        {/* Storefront: /shop/<slug>/... -> /<slug>/... */}
        <Route path="/shop/:slug/*" element={<LegacyShopRedirect />} />
        {/* /tenant/shop/<slug>/... (from earlier attempt this session) */}
        <Route path="/tenant/shop/:slug/*" element={<LegacyShopRedirect />} />
        {/* Old bare staff routes -> /login (they'll bounce to the right
            tenant after auth). We can't know the slug without a session. */}
        <Route path="/cashier/*"    element={<Navigate to="/login" replace />} />
        <Route path="/sales/*"      element={<Navigate to="/login" replace />} />
        <Route path="/customers/*"  element={<Navigate to="/login" replace />} />
        <Route path="/products/*"   element={<Navigate to="/login" replace />} />
        <Route path="/users/*"      element={<Navigate to="/login" replace />} />
        <Route path="/settings/*"   element={<Navigate to="/login" replace />} />
        <Route path="/store/*"      element={<Navigate to="/login" replace />} />
        <Route path="/tenant/*"     element={<Navigate to="/login" replace />} />

        {/* Catch-all */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </ErrorBoundary>
  </BrowserRouter>
);

// Re-export the guards so sub-apps don't reach into shell/ internals.
export { AdminRoute, ProtectedRoute, VendorRoute };
