/**
 * Barrel export — the vendor console's public surface.
 * App.tsx imports every route entry from here.
 */
export { VendorShell }     from './VendorShell';
export { DashboardPage as VendorDashboardPage } from './DashboardPage';
export { TenantsPage   as VendorTenantsPage }   from './TenantsPage';
export { AuditPage     as VendorAuditPage }     from './AuditPage';
export { CreateTenantModal }                    from './CreateTenantModal';
