import type { Customer, StoreSettings, User } from './types';

/**
 * Seed data — first-run defaults, loaded when localStorage is empty.
 * NEVER used once a real backend is present.
 */

const now = (): string => new Date().toISOString();

export const SEED_USERS: readonly User[] = [
  {
    id: 'u-admin',
    username: 'admin',
    name: 'Store Admin',
    role: 'admin',
    active: true,
    createdAt: now(),
    password: 'admin123',
  },
  {
    id: 'u-cashier-1',
    username: 'cashier',
    name: 'Sam Cashier',
    role: 'cashier',
    active: true,
    createdAt: now(),
    password: 'cashier123',
  },
];

export const SEED_CUSTOMERS: readonly Customer[] = [
  {
    id: 'c-001', name: 'Ravi Kumar', mobile: '9876543210',
    email: 'ravi@example.com', notes: 'Regular customer — weekly groceries',
    lendingBalance: 1250.50, createdAt: now(),
  },
  {
    id: 'c-002', name: 'Priya Sharma', mobile: '9123456780',
    email: null, notes: null,
    lendingBalance: 0, createdAt: now(),
  },
  {
    id: 'c-003', name: 'Anita Desai', mobile: '9988776655',
    email: 'anita.d@example.com', notes: 'Prefers cash on card fallback',
    lendingBalance: 480, createdAt: now(),
  },
];

export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: 'Walmart Neighborhood Market',
  address: '123 Main Street, Bentonville, AR 72712',
  phone: '+1 (555) 123-4567',
  gstin: '',
  taxRate: 0.0825,
  currency: 'USD',
  receiptFooter: 'Thank you for shopping with us. Returns accepted within 90 days.',
};
