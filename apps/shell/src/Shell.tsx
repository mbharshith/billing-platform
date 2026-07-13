// Shell - host app. Owns the ONE BrowserRouter, /login, route guards, the
// SaaS marketing homepage, and mounts each sub-app at its top-level URL.
//
// URL architecture (final):
//   /                    -> SaaS marketing home (public, no auth)
//   /login               -> auth
//   /dashboard/*         -> SaaS owner console (platform vendor role)
//   /<slug>              -> customer shop (public, per-tenant, e.g. /velvet)
//   /<slug>/cashier/*    -> tenant POS (staff auth, e.g. /velvet/cashier)
//   /<slug>/admin/*      -> tenant admin (admin auth, e.g. /velvet/admin)
//
// Legacy URLs redirect to their new equivalents so bookmarks/QR codes keep
// working. Reserved slugs live in @shared/lib/tenantSlug.
import { lazy, Suspense, type FC, type JSX } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { AppSplash, ErrorBoundary, NotFoundPage } from '@billing/ui/errors';
import { ProtectedRoute, AdminRoute } from '@billing/ui/guards';

/* -------------------------------------------------------------------------- */
/* Route-level code splits - every page below is its own JS chunk.            */
/*                                                                            */
/* Rationale:                                                                 */
/*  - Staff who log straight into /cashier never download marketing/vendor.   */
/*  - Public marketing visitors never download login/admin.                   */
/*  - Vendor console (Recharts + tables) stays isolated from everything else. */
/* -------------------------------------------------------------------------- */
const MarketingHomePage = lazy(() => import('./MarketingHomePage')
  .then((m) => ({ default: m.MarketingHomePage })));
const LoginPage         = lazy(() => import('./LoginPage')
  .then((m) => ({ default: m.LoginPage })));

// Federated remotes — resolved at runtime by @originjs/vite-plugin-federation.
// The bare specifiers (posApp/*, storefrontApp/*) are declared in remotes.d.ts
// and mapped to their remoteEntry.js URLs in vite.config.ts.
const CashierApp    = lazy(() => import('posApp/CashierApp'));
const AdminApp      = lazy(() => import('posApp/AdminApp'));
const StorefrontApp = lazy(() => import('storefrontApp/StorefrontApp'));


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
        <Route path="/" element={SubApp('marketing', <MarketingHomePage />)} />

        {/* ---------- auth ---------- */}
        <Route path="/login" element={SubApp('login', <LoginPage />)} />
        <Route path="/signup" element={<Navigate to="/login?onboard=1" replace />} />

        {/* ---------- SaaS owner console (vendor role) ---------- */}
        {/* Vendor console is scheduled for a later phase - the app doesn't
            exist yet, so bounce /dashboard to /login for now. */}
        <Route path="/dashboard/*" element={<Navigate to="/login" replace />} />

        {/* ---------- tenant staff surfaces (/<slug>/cashier|admin/*) ----- */}
        {/* Auth is enforced INSIDE RegisterApp per-subtree (cashier=any staff,
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

// Re-export the guards so sub-apps can import from shell if they prefer,
// though the canonical location is @billing/ui/guards.
export { AdminRoute, ProtectedRoute };
