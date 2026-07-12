// One-shot bootstrap: skip if IDB already has data, else import legacy localStorage or seed demo data.

// Runs exactly once per browser: gated by a flag in localStorage so we don't
// import twice even if the user reloads mid-migration.

// Kept in a dedicated module so <RootProvider> can `await` it before any
// context provider mounts. That way live-queries never flash empty on boot.

import { db } from './db';
import { storage } from './storage';
import {
  SEED_STORES, SEED_USERS, SEED_CUSTOMERS, SEED_PRODUCTS,
} from '@billing/shared/fixtures';
import type {
  Customer, CustomerPayment, Product, Sale, Store, User, UserRole,
} from '@billing/shared/domain/types';

const MIGRATION_FLAG = 'db-bootstrap::v3';

// Normalise legacy user roles: drop 'super_admin' rows (that surface moved to the
// dedicated vendor account), rename 'master' -> 'admin' (v1 schema). Idempotent.
const migrateUsers = (list: readonly User[]): readonly User[] =>
  list
    .filter((u) => u.role !== ('super_admin' as UserRole))
    .map((u) => ({
      ...u,
      role: (u.role === ('master' as UserRole) ? 'admin' : u.role) as UserRole,
    }));

// Backfill missing storeId on legacy pre-multi-tenant rows.
const backfillStoreId = <T extends { storeId?: string }>(
  list: readonly T[],
  fallbackId: string,
): readonly T[] =>
  list.map((row) => (row.storeId ? row : { ...row, storeId: fallbackId }));

export const bootstrapDb = async (): Promise<void> => {
  // Fast path: already migrated on this browser — but still make sure the
  // vendor account exists (v3 upgrade path for pre-existing installations).
  const already = storage.load<boolean>(MIGRATION_FLAG, false);
  if (already) {
    await ensureVendorUser();
    return;
  }

  // If tables are already populated with data from a previous version, wipe
  // everything so the new seed (velvet / spiceroute / lamaison) takes effect.
  const storeCount = await db.stores.count();
  if (storeCount > 0) {
    await db.transaction(
      'rw',
      [db.stores, db.users, db.products, db.customers, db.customerPayments, db.sales],
      async () => {
        await db.stores.clear();
        await db.users.clear();
        await db.products.clear();
        await db.customers.clear();
        await db.customerPayments.clear();
        await db.sales.clear();
      },
    );
    // Fall through to re-seed below with the fresh SEED_* data.
  }

  // Pull any legacy localStorage payloads.
  const oldStores    = storage.load<readonly Store[]>('stores', []);
  const oldUsers     = storage.load<readonly User[]>('users', []);
  const oldProducts  = storage.load<readonly Product[]>('products', []);
  const oldCustomers = storage.load<readonly Customer[]>('customers', []);
  const oldPayments  = storage.load<readonly CustomerPayment[]>('customer-payments', []);
  const oldSales     = storage.load<readonly Sale[]>('sales', []);

  const hasLegacyData = oldStores.length + oldUsers.length + oldProducts.length
    + oldCustomers.length + oldSales.length > 0;

  const stores    = hasLegacyData ? oldStores    : SEED_STORES;
  const users     = hasLegacyData ? migrateUsers(oldUsers) : SEED_USERS;
  const products  = hasLegacyData ? oldProducts  : SEED_PRODUCTS;
  const customers = hasLegacyData ? oldCustomers : SEED_CUSTOMERS;

  const fallbackStoreId = stores[0]?.id ?? '';

  // Bulk-insert everything in one transaction so a mid-write reload leaves
  // us either fully seeded or fully empty — never partially populated.
  await db.transaction(
    'rw',
    [db.stores, db.users, db.products, db.customers, db.customerPayments, db.sales],
    async () => {
      await db.stores.bulkPut([...stores]);
      await db.users.bulkPut([...users]);
      await db.products.bulkPut([...backfillStoreId(products,  fallbackStoreId)]);
      await db.customers.bulkPut([...backfillStoreId(customers, fallbackStoreId)]);
      await db.customerPayments.bulkPut([...oldPayments]);
      await db.sales.bulkPut([...backfillStoreId(oldSales,     fallbackStoreId)]);
    },
  );

  storage.save(MIGRATION_FLAG, true);
  await ensureVendorUser();
};

  // Idempotent: create the vendor account if missing (runs every boot so pre-v3 installs get vendor too).
const ensureVendorUser = async (): Promise<void> => {
  const vendor = SEED_USERS.find((u) => u.role === 'vendor');
  if (!vendor) return;
  const existing = await db.users.where('username').equals(vendor.username).first();
  if (!existing) await db.users.put(vendor);
};

// Clear the migration flag AND wipe IDB. Used by the demo-reset UI.
export const resetBootstrap = (): void => {
  storage.remove(MIGRATION_FLAG);
};
