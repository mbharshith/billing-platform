/**
 * FIXTURE — demo user accounts. Scrap when the real backend is live.
 *
 * Every user is bound to exactly ONE tenant except the vendor, whose
 * `storeId` is the `VENDOR_SCOPE` sentinel (cross-tenant SaaS-owner scope).
 *
 * Login credentials shown on the login screen come from this list.
 * Passwords are plaintext because this is a fully client-side demo —
 * real auth lives in the backend once it ships.
 */
import type { User } from '@shared/domain/types';
import { VENDOR_SCOPE } from '@shared/domain/types';
import { BRAND } from '@shared/brand';
import {
  SEED_STORE_MAIN_ID, SEED_STORE_BRANCH_ID, SEED_STORE_THIRD_ID,
} from './stores';

const now = (): string => new Date().toISOString();

export const SEED_USERS: readonly User[] = [
  // --- Myntra Mumbai ------------------------------------------------------
  {
    id: 'u-myntra-admin',
    username: 'myntra',
    name: 'Aditi Rao',
    role: 'admin',
    active: true,
    createdAt: now(),
    storeId: SEED_STORE_MAIN_ID,
    password: 'myntra123',
  },
  {
    id: 'u-myntra-cashier',
    username: 'myntra.cashier',
    name: 'Rohan Iyer',
    role: 'cashier',
    active: true,
    createdAt: now(),
    storeId: SEED_STORE_MAIN_ID,
    password: 'cashier123',
  },

  // --- Flipkart Bengaluru -------------------------------------------------
  {
    id: 'u-flipkart-admin',
    username: 'flipkart',
    name: 'Vikram Shetty',
    role: 'admin',
    active: true,
    createdAt: now(),
    storeId: SEED_STORE_BRANCH_ID,
    password: 'flipkart123',
  },
  {
    id: 'u-flipkart-cashier',
    username: 'flipkart.cashier',
    name: 'Neha Reddy',
    role: 'cashier',
    active: true,
    createdAt: now(),
    storeId: SEED_STORE_BRANCH_ID,
    password: 'cashier123',
  },

  // --- Walmart Springfield ------------------------------------------------
  {
    id: 'u-walmart-admin',
    username: 'walmart',
    name: 'Marcus Bennett',
    role: 'admin',
    active: true,
    createdAt: now(),
    storeId: SEED_STORE_THIRD_ID,
    password: 'walmart123',
  },
  {
    id: 'u-walmart-cashier',
    username: 'walmart.cashier',
    name: 'Sam Cashier',
    role: 'cashier',
    active: true,
    createdAt: now(),
    storeId: SEED_STORE_THIRD_ID,
    password: 'cashier123',
  },

  // --- Vendor (SaaS owner) — cross-tenant, sentinel storeId ------------
  {
    id: 'u-vendor-root',
    username: 'vendor',
    name: `${BRAND.name} Vendor Ops`,
    role: 'vendor',
    active: true,
    createdAt: now(),
    storeId: VENDOR_SCOPE,
    password: 'vendor123',
  },
];
