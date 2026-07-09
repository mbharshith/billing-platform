// VendorApp - sub-app router for the SaaS-owner control plane.
//
// Mounted at /dashboard/* by <Shell />. The parent <VendorRoute> in Shell has
// already enforced that only the vendor role reaches this tree.
//
// URL shape:
//   /dashboard          -> Overview (this is the SaaS owner's home)
//   /dashboard/tenants  -> Tenants
//   /dashboard/audit    -> Audit log
import type { FC, JSX } from 'react';
import { Route, Routes } from 'react-router-dom';
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
      <Route index          element={R('vendor-overview', <DashboardPage />)} />
      <Route path="tenants" element={R('vendor-tenants',  <TenantsPage />)} />
      <Route path="audit"   element={R('vendor-audit',    <AuditPage />)} />
      <Route path="*"       element={<NotFoundPage />} />
    </Route>
  </Routes>
);
