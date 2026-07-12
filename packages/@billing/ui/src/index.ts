// @billing/ui - design-system components. Depends on @billing/shared for
// hooks (useMoney) and stores (useAuth, useStores) that some molecules use.
//
// Consumers should import from the named subpath (`@billing/ui/atoms`, ...)
// rather than this barrel to keep bundle diet honest.

export * from './atoms';
export * from './molecules';
export * from './organisms';
export * from './templates';
export * from './feedback';
export * from './errors';
export { AdminRoute, ProtectedRoute } from './guards/RouteGuards';
