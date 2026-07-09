/**
 * Shell — the host application.
 *
 * Owns:
 *   - Top-level BrowserRouter (only one in the entire app)
 *   - Public routes: /login (+ /signup redirect for stale bookmarks)
 *   - Route guards (ProtectedRoute / AdminRoute / VendorRoute)
 *   - Lazy-loading of every sub-app under `src/apps/*`
 *   - Global ErrorBoundary + suspense fallback
 *
 * Does NOT own:
 *   - Any business page or component logic (that lives inside sub-apps)
 *   - Data providers (they live inside <RootProvider>, mounted in main.tsx
 *     above <Shell />; anything the shell OR sub-apps need to render
 *     hangs off that single provider tree)
 *
 * Adding a new sub-app is exactly three lines:
 *   1) const Foo = lazy(() => import('@apps/foo/FooApp'));
 *   2) A guard-wrapped <Route path="/foo/*" element={<Foo />} /> below
 *   3) A folder src/apps/foo/FooApp.tsx exporting the sub-app router
 *
 * No global registry, no manifest, no module federation. Vite handles the
 * chunking automatically because each import() is dynamic — the picker's
 * tablet never downloads the storefront bundle, and vice versa.
 */
import { lazy, Suspense, type FC, type JSX } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppSplash, ErrorBoundary, NotFoundPage } from '@shared/errors';
import { LoginPage } from './LoginPage';
import { ProtectedRoute, AdminRoute, VendorRoute } from './RouteGuards';

/* -------------------------------------------------------------------------- */
/* Sub-apps — lazy, so each ships its own JS chunk                            */
/* -------------------------------------------------------------------------- */
const CounterApp    = lazy(() => import('@apps/counter/CounterApp')
  .then((m) => ({ default: m.CounterApp })));
const VendorApp     = lazy(() => import('@apps/vendor/VendorApp')
  .then((m) => ({ default: m.VendorApp })));
const StorefrontApp = lazy(() => import('@apps/storefront/StorefrontApp')
  .then((m) => ({ default: m.StorefrontApp })));

/** Wraps a lazy sub-app in its own error boundary + suspense fallback.
 *  Keeps a crash in one sub-app from taking the whole shell down, and
 *  gives every chunk a consistent loading experience. */
const SubApp = (label: string, node: JSX.Element): JSX.Element => (
  <ErrorBoundary label={label}>
    <Suspense fallback={<AppSplash state="loading" onRetry={() => window.location.reload()} />}>
      {node}
    </Suspense>
  </ErrorBoundary>
);

export const Shell: FC = () => (
  <BrowserRouter
    future={{
      // Opt into v7 semantics now so the v6 -> v7 upgrade is a no-op.
      // Silences the "Future Flag Warning" console noise on every route.
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    }}
  >
    <ErrorBoundary label="shell">
      <Routes>
        {/* -------------------- public entry -------------------- */}
        <Route path="/login" element={<ErrorBoundary label="login"><LoginPage /></ErrorBoundary>} />
        {/* Self-signup is intentionally disabled. Any stale bookmark lands
            back on /login with a friendly onboard hint. */}
        <Route path="/signup" element={<Navigate to="/login?onboard=1" replace />} />

        {/* -------------------- storefront (public) -------------------- */}
        {/* Customer-facing shop. No auth required — a customer just clicks
            the shop's QR/WhatsApp link and lands on the tenant's storefront. */}
        <Route path="/shop/*" element={SubApp('storefront', <StorefrontApp />)} />

        {/* -------------------- vendor console (auth: vendor role) ------- */}
        <Route element={<VendorRoute />}>
          <Route path="/vendor/*" element={SubApp('vendor', <VendorApp />)} />
        </Route>

        {/* -------------------- counter (auth: any staff) ---------------- */}
        <Route element={<ProtectedRoute />}>
          <Route path="/*" element={SubApp('counter', <CounterApp />)} />
        </Route>

        {/* Catch-all outside the shell (should be unreachable — /* above
            catches everything for signed-in users; /login and /shop/*
            catch the rest). Kept for completeness. */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </ErrorBoundary>
  </BrowserRouter>
);

/** Re-export AdminRoute so counter/vendor sub-apps don't reach into shell/
 *  internals — they get everything they need from a single import. */
export { AdminRoute, ProtectedRoute, VendorRoute };
