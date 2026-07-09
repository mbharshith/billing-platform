/**
 * VendorApp — sub-app router for the SaaS-owner control plane.
 *
 * Mounted at /vendor/* by <Shell />. The parent <VendorRoute> in Shell
 * has already enforced that only the vendor role reaches this tree.
 *
 * Routes (all under /vendor):
 *   /vendor            → redirect to /vendor/dashboard
 *   /vendor/dashboard  fleet-wide KPIs
 *   /vendor/tenants    provision / edit / suspend tenants
 *   /vendor/audit      immutable log of vendor actions
 */
import type { FC, JSX } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ErrorBoundary, NotFoundPage } from '@shared/errors';
import { VendorShell } from './VendorShell';
import { DashboardPage } from './pages/DashboardPage';
import { TenantsPage } from './pages/TenantsPage';
import { AuditPage } from './pages/AuditPage';

const R = (label: string, node: JSX.Element): JSX.Element => (
  <ErrorBoundary label={label}>{node}</ErrorBoundary>
);

export const VendorApp: FC = () => (
  <Routes>
    <Route element={<VendorShell />}>
      <Route index                element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard"     element={R('vendor-dashboard', <DashboardPage />)} />
      <Route path="tenants"       element={R('vendor-tenants',   <TenantsPage />)} />
      <Route path="audit"         element={R('vendor-audit',     <AuditPage />)} />
      <Route path="*"             element={<NotFoundPage />} />
    </Route>
  </Routes>
);
