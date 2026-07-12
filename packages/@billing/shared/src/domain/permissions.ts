// Permissions - role->action matrix. UI calls `can(user, action)`; never inline role checks.
// Vendor is intentionally empty here - they're gated by <VendorRoute>, not tenant-scoped actions.
import type { SessionUser } from './types';

export type Action =
  // Store (own tenant only — never cross-tenant)
  | 'store:update'
  // Users (within own store)
  | 'user:create' | 'user:update' | 'user:deactivate'
  // Inventory
  | 'product:create' | 'product:update' | 'product:delete'
  // Customers
  | 'customer:create' | 'customer:update' | 'customer:delete'
  // Lending
  | 'lending:recordPayment' | 'lending:view'
  // Sales
  | 'sale:record' | 'sale:void' | 'sale:viewAllTime' | 'sale:viewToday'
  // Settings
  | 'settings:edit';

const ADMIN: readonly Action[] = [
  'store:update',
  'user:create', 'user:update', 'user:deactivate',
  'product:create', 'product:update', 'product:delete',
  'customer:create', 'customer:update', 'customer:delete',
  'lending:recordPayment', 'lending:view',
  'sale:record', 'sale:void', 'sale:viewAllTime', 'sale:viewToday',
  'settings:edit',
];

const CASHIER: readonly Action[] = [
  'customer:create', 'customer:update',
  'lending:recordPayment', 'lending:view',
  'sale:record', 'sale:viewToday',
];

const MATRIX: Record<SessionUser['role'], readonly Action[]> = {
  vendor:  [],
  admin:   ADMIN,
  cashier: CASHIER,
};

export const can = (user: SessionUser | null | undefined, action: Action): boolean =>
  !!user && MATRIX[user.role].includes(action);

export const isAdmin = (u: SessionUser | null | undefined): boolean =>
  u?.role === 'admin';

export const isVendor = (u: SessionUser | null | undefined): boolean =>
  u?.role === 'vendor';
