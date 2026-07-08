/**
 * App — routes + shell composition.
 *
 * Public:                     /login, /signup
 * Protected (any signed-in):  /, /cashier, /sales, /sales/:id,
 *                             /customers, /customers/:id
 * Master only:                /dashboard, /products, /users, /settings, /store
 */
import type { FC } from 'react';
import {
  BrowserRouter, Navigate, Route, Routes,
} from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { MasterRoute, ProtectedRoute } from './components/layout/RouteGuards';
import { CashierPage } from './pages/CashierPage';
import { CustomerDetailPage } from './pages/CustomerDetailPage';
import { CustomersPage } from './pages/CustomersPage';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { ProductsPage } from './pages/ProductsPage';
import { SaleDetailPage } from './pages/SaleDetailPage';
import { SalesPage } from './pages/SalesPage';
import { SettingsPage } from './pages/SettingsPage';
import { SignupPage } from './pages/SignupPage';
import { StorePage } from './pages/StorePage';
import { UsersPage } from './pages/UsersPage';

export const App: FC = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/login"  element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/cashier" replace />} />
          <Route path="/cashier"           element={<CashierPage />} />
          <Route path="/sales"             element={<SalesPage />} />
          <Route path="/sales/:id"         element={<SaleDetailPage />} />
          <Route path="/customers"         element={<CustomersPage />} />
          <Route path="/customers/:id"     element={<CustomerDetailPage />} />

          <Route element={<MasterRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/products"  element={<ProductsPage />} />
            <Route path="/users"     element={<UsersPage />} />
            <Route path="/settings"  element={<SettingsPage />} />
            <Route path="/store"     element={<StorePage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/cashier" replace />} />
    </Routes>
  </BrowserRouter>
);
