// CounterApp - sub-app router for the in-store POS surface.
// Mounted at /* by <Shell />. Auth is handled by <ProtectedRoute>; <AdminRoute> refines further.
import type { FC, JSX } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminRoute } from '@shell/RouteGuards';
import { ErrorBoundary, NotFoundPage } from '@shared/errors';
import { CounterShell } from './CounterShell';
import { CashierPage } from './pages/CashierPage';
import { CustomerDetailPage } from './pages/CustomerDetailPage';
import { CustomersPage } from './pages/CustomersPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProductsPage } from './pages/ProductsPage';
import { SaleDetailPage } from './pages/SaleDetailPage';
import { SalesPage } from './pages/SalesPage';
import { SettingsPage } from './pages/SettingsPage';
import { StorePage } from './pages/StorePage';
import { UsersPage } from './pages/UsersPage';

// Per-route error boundary so a crash on /products can't take down /cashier.
const R = (label: string, node: JSX.Element): JSX.Element => (
  <ErrorBoundary label={label}>{node}</ErrorBoundary>
);

export const CounterApp: FC = () => (
  <Routes>
    <Route element={<CounterShell />}>
      <Route index element={<Navigate to="/cashier" replace />} />

      {/* Any signed-in staff */}
      <Route path="cashier"        element={R('cashier',         <CashierPage />)} />
      <Route path="sales"          element={R('sales',           <SalesPage />)} />
      <Route path="sales/:id"      element={R('sale-detail',     <SaleDetailPage />)} />
      <Route path="customers"      element={R('customers',       <CustomersPage />)} />
      <Route path="customers/:id"  element={R('customer-detail', <CustomerDetailPage />)} />

      {/* Admin only — tenant configuration */}
      <Route element={<AdminRoute />}>
        <Route path="dashboard" element={R('dashboard', <DashboardPage />)} />
        <Route path="products"  element={R('products',  <ProductsPage />)} />
        <Route path="users"     element={R('users',     <UsersPage />)} />
        <Route path="settings"  element={R('settings',  <SettingsPage />)} />
        <Route path="store"     element={R('store',     <StorePage />)} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes>
);
