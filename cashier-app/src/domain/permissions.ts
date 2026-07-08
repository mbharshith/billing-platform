/**
 * Permissions — single source of truth for role capabilities.
 *
 * SaaS tenant model (SAP-style):
 *   - Every user is bound to exactly one store (tenant) at login.
 *   - There is NO cross-tenant role in this app. Vendor-level ops lives elsewhere.
 *   - Segregation of Duties is enforced by this MATRIX; UI calls `can(user, action)`,
 *     never checks role strings inline.
 *
 * Roles:
 *   master   — tenant owner: edits store settings, CRUD everything in the store,
 *              creates other masters + cashiers, full sales history.
 *   cashier  — front-line staff: rings up sales, records lending payments, sees
 *              customers, TODAY-only sales view, no destructive actions.
 */
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

const MASTER: readonly Action[] = [
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
  master:  MASTER,
  cashier: CASHIER,
};

export const can = (user: SessionUser | null | undefined, action: Action): boolean =>
  !!user && MATRIX[user.role].includes(action);

export const isMaster = (u: SessionUser | null | undefined): boolean =>
  u?.role === 'master';
