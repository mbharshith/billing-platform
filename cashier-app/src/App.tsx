/**
 * App — routes + shell composition.
 *
 * Public:                     /login, /signup
 * Protected (any signed-in):  /, /cashier, /sales, /sales/:id,
 *                             /customers, /customers/:id
 * Admin only:                 /dashboard, /products, /users, /settings, /store
 *
 * Every route is wrapped in an <ErrorBoundary> so a single component
 * throwing never blanks the whole app. The catch-all matches unknown
 * paths and shows a friendly 404 instead of a silent redirect — that
 * makes broken bookmarks obvious to the user.
 */
import type { FC } from 'react';
import {
  BrowserRouter, Navigate, Route, Routes,
} from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { AdminRoute, ProtectedRoute, VendorRoute } from './components/layout/RouteGuards';
import { ErrorBoundary, NotFoundPage } from './components/errors';
import { CashierPage } from './pages/CashierPage';
import { CustomerDetailPage } from './pages/CustomerDetailPage';
import { CustomersPage } from './pages/CustomersPage';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { ProductsPage } from './pages/ProductsPage';
import { SaleDetailPage } from './pages/SaleDetailPage';
import { SalesPage } from './pages/SalesPage';
import { SettingsPage } from './pages/SettingsPage';
import { StorePage } from './pages/StorePage';
import { UsersPage } from './pages/UsersPage';
import {
  VendorShell, VendorDashboardPage, VendorTenantsPage, VendorAuditPage,
} from './pages/VendorConsole';

/** Small helper — wraps every route element in its own boundary so a crash
 *  on /products doesn't take down /cashier. */
const R = (label: string, node: JSX.Element): JSX.Element => (
  <ErrorBoundary label={label}>{node}</ErrorBoundary>
);

export const App: FC = () => (
  <BrowserRouter>
    <ErrorBoundary label="root">
      <Routes>
        <Route path="/login"  element={R('login',  <LoginPage />)} />
        {/* Self-signup is intentionally disabled — tenants are provisioned
            by the SaaS vendor (single source of truth). Any stale bookmark
            or link lands back on /login with a friendly message via the
            login page copy. */}
        <Route path="/signup" element={<Navigate to="/login?onboard=1" replace />} />

        {/* Vendor control plane — SaaS owner only, separate shell. */}
        <Route element={<VendorRoute />}>
          <Route element={<VendorShell />}>
            <Route path="/vendor"           element={<Navigate to="/vendor/dashboard" replace />} />
            <Route path="/vendor/dashboard" element={R('vendor-dashboard', <VendorDashboardPage />)} />
            <Route path="/vendor/tenants"   element={R('vendor-tenants',   <VendorTenantsPage />)} />
            <Route path="/vendor/audit"     element={R('vendor-audit',     <VendorAuditPage />)} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route index element={<Navigate to="/cashier" replace />} />
            <Route path="/cashier"       element={R('cashier',        <CashierPage />)} />
            <Route path="/sales"         element={R('sales',          <SalesPage />)} />
            <Route path="/sales/:id"     element={R('sale-detail',    <SaleDetailPage />)} />
            <Route path="/customers"     element={R('customers',      <CustomersPage />)} />
            <Route path="/customers/:id" element={R('customer-detail',<CustomerDetailPage />)} />

            <Route element={<AdminRoute />}>
              <Route path="/dashboard" element={R('dashboard', <DashboardPage />)} />
              <Route path="/products"  element={R('products',  <ProductsPage />)} />
              <Route path="/users"     element={R('users',     <UsersPage />)} />
              <Route path="/settings"  element={R('settings',  <SettingsPage />)} />
              <Route path="/store"     element={R('store',     <StorePage />)} />
            </Route>

            {/* Anything under the shell that didn't match. */}
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>

        {/* Anything outside the shell (unlikely — /login and /signup already
            match) also gets the friendly 404 rather than a silent redirect. */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </ErrorBoundary>
  </BrowserRouter>
);
