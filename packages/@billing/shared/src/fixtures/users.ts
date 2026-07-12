// FIXTURE — demo user accounts. Scrap when the real backend is live.

// Every user is bound to exactly ONE tenant except the vendor, whose
// `storeId` is the `VENDOR_SCOPE` sentinel (cross-tenant SaaS-owner scope).

// Login credentials shown on the login screen come from this list. Plaintext passwords (client-side demo).
import type { User } from '@billing/shared/domain/types';
import { VENDOR_SCOPE } from '@billing/shared/domain/types';
import { BRAND } from '@billing/shared/brand';
import {
  SEED_STORE_MAIN_ID, SEED_STORE_BRANCH_ID, SEED_STORE_THIRD_ID,
} from './stores';

const now = (): string => new Date().toISOString();

export const SEED_USERS: readonly User[] = [

  // --- Velvet Mumbai ------------------------------------------------------
  {
    id: 'u-velvet-admin',
    username: 'velvet',
    name: 'Aditi Rao',
    role: 'admin',
    active: true,
    createdAt: now(),
    storeId: SEED_STORE_MAIN_ID,
    password: 'velvet123',
  },
  {
    id: 'u-velvet-cashier',
    username: 'velvet.cashier',
    name: 'Rohan Iyer',
    role: 'cashier',
    active: true,
    createdAt: now(),
    storeId: SEED_STORE_MAIN_ID,
    password: 'cashier123',
  },

  // --- Spice Route Kitchen ------------------------------------------------
  {
    id: 'u-spiceroute-admin',
    username: 'spiceroute',
    name: 'Vikram Shetty',
    role: 'admin',
    active: true,
    createdAt: now(),
    storeId: SEED_STORE_BRANCH_ID,
    password: 'spiceroute123',
  },
  {
    id: 'u-spiceroute-cashier',
    username: 'spiceroute.cashier',
    name: 'Neha Reddy',
    role: 'cashier',
    active: true,
    createdAt: now(),
    storeId: SEED_STORE_BRANCH_ID,
    password: 'cashier123',
  },

  // --- La Maison Boutique -------------------------------------------------
  {
    id: 'u-lamaison-admin',
    username: 'lamaison',
    name: 'Claire Dupont',
    role: 'admin',
    active: true,
    createdAt: now(),
    storeId: SEED_STORE_THIRD_ID,
    password: 'lamaison123',
  },
  {
    id: 'u-lamaison-cashier',
    username: 'lamaison.cashier',
    name: 'James Carter',
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
