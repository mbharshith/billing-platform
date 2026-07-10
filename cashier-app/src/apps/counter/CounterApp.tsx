// CounterApp - exports the two tenant staff sub-apps.
//
// Shell mounts these at explicit paths so each subtree has clean React Router
// routing without any URL-sniffing:
//   /<slug>/cashier/*  ->  <CashierApp />   (any signed-in staff)
//   /<slug>/admin/*    ->  <AdminApp />     (admin only)
//
// Both share <CounterShell /> for chrome (sidebar/topbar) so the visual
// experience is unified even though auth and features differ.
//
// PERF: every page is React.lazy'd so Rollup produces one chunk per page.
// A cashier landing on /velvet/cashier no longer downloads the admin
// Dashboard/Products/Users/Settings/Store bundle they'll never see; an
// admin landing on /velvet/admin skips cashier Sales/Customers detail
// code. Each route pays only for its own page (~1-3 KB gzip).
import { lazy, Suspense, type FC, type JSX, type ReactNode } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AdminRoute, ProtectedRoute } from '@shell/RouteGuards';
import { AppSplash, ErrorBoundary, NotFoundPage } from '@shared/errors';
import { CounterShell } from './CounterShell';

/* ---------- lazy page chunks ---------- */
/*  Each import() becomes its own Rollup chunk. Named exports are unwrapped
    to `default` so React.lazy is happy. Zero behavioural change. */
const CashierPage        = lazy(() => import('./pages/CashierPage').then(m => ({ default: m.CashierPage })));
const SalesPage          = lazy(() => import('./pages/SalesPage').then(m => ({ default: m.SalesPage })));
const SaleDetailPage     = lazy(() => import('./pages/SaleDetailPage').then(m => ({ default: m.SaleDetailPage })));
const CustomersPage      = lazy(() => import('./pages/CustomersPage').then(m => ({ default: m.CustomersPage })));
const CustomerDetailPage = lazy(() => import('./pages/CustomerDetailPage').then(m => ({ default: m.CustomerDetailPage })));
const DashboardPage      = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const ProductsPage       = lazy(() => import('./pages/ProductsPage').then(m => ({ default: m.ProductsPage })));
const UsersPage          = lazy(() => import('./pages/UsersPage').then(m => ({ default: m.UsersPage })));
const SettingsPage       = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const StorePage          = lazy(() => import('./pages/StorePage').then(m => ({ default: m.StorePage })));

// Wrap every route with the same ErrorBoundary + Suspense envelope so lazy
// chunks show the app splash while loading and don't crash the whole shell
// if a page throws. Small helper - no need to inline it at every <Route />.
const R = (label: string, node: ReactNode): JSX.Element => (
  <ErrorBoundary label={label}>
    <Suspense fallback={<AppSplash state="loading" />}>{node}</Suspense>
  </ErrorBoundary>
);

/** Mounted at /:slug/cashier/*.  POS + views every staff member needs. */
export const CashierApp: FC = () => (
  <Routes>
    <Route element={<ProtectedRoute />}>
      <Route element={<CounterShell />}>
        <Route index                    element={R('cashier',         <CashierPage />)} />
        <Route path="sales"             element={R('sales',           <SalesPage />)} />
        <Route path="sales/:id"         element={R('sale-detail',     <SaleDetailPage />)} />
        <Route path="customers"         element={R('customers',       <CustomersPage />)} />
        <Route path="customers/:id"     element={R('customer-detail', <CustomerDetailPage />)} />
        <Route path="*"                 element={<NotFoundPage />} />
      </Route>
    </Route>
  </Routes>
);

/** Mounted at /:slug/admin/*.  Admin-only tenant configuration. */
export const AdminApp: FC = () => (
  <Routes>
    <Route element={<AdminRoute />}>
      <Route element={<CounterShell />}>
        <Route index               element={R('dashboard', <DashboardPage />)} />
        <Route path="products"     element={R('products',  <ProductsPage />)} />
        <Route path="users"        element={R('users',     <UsersPage />)} />
        <Route path="settings"     element={R('settings',  <SettingsPage />)} />
        <Route path="store"        element={R('store',     <StorePage />)} />
        <Route path="*"            element={<NotFoundPage />} />
      </Route>
    </Route>
  </Routes>
);

// Back-compat re-export so nothing else has to change if it imports CounterApp
// by name. Defaults to Cashier since that's the primary staff surface.
export const CounterApp = CashierApp;
