/**
 * One-shot bootstrap:
 *   1. If IndexedDB tables are non-empty → nothing to do (already migrated).
 *   2. If old localStorage data exists → import it (users upgrading in place).
 *   3. Otherwise → seed the fresh demo data (first-time visitors).
 *
 * Runs exactly once per browser: gated by a flag in localStorage so we don't
 * import twice even if the user reloads mid-migration.
 *
 * Kept in a dedicated module so <RootProvider> can `await` it before any
 * context provider mounts. That way live-queries never flash empty on boot.
 */

import { db } from './db';
import { storage } from './storage';
import { SEED_STORES, SEED_USERS, SEED_CUSTOMERS } from '../domain/seed';
import { SEED_PRODUCTS } from '../domain/catalog';
import type {
  Customer, CustomerPayment, Product, Sale, Store, User, UserRole,
} from '../domain/types';

const MIGRATION_FLAG = 'db-bootstrap::v1';

/**
 * Normalise legacy user roles to the current UserRole union:
 *  - 'super_admin' rows are dropped entirely — the cross-tenant role no
 *    longer exists; that surface moved to the dedicated vendor account.
 *  - 'master' rows (used in v1 of the app) are renamed to 'admin' to
 *    match the current schema.
 * Safe to run on an already-migrated list — no-ops for current roles.
 */
const migrateUsers = (list: readonly User[]): readonly User[] =>
  list
    .filter((u) => u.role !== ('super_admin' as UserRole))
    .map((u) => ({
      ...u,
      role: (u.role === ('master' as UserRole) ? 'admin' : u.role) as UserRole,
    }));

/** Backfill missing storeId on legacy pre-multi-tenant rows. */
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

  // If tables are already populated (e.g. another tab beat us), just flag + go.
  const storeCount = await db.stores.count();
  if (storeCount > 0) {
    await ensureVendorUser();
    storage.save(MIGRATION_FLAG, true);
    return;
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

/** Idempotent: create the vendor account if it isn't already there. Called
 *  on every boot so old installs (pre-v3) get the vendor without needing a
 *  full re-seed. */
const ensureVendorUser = async (): Promise<void> => {
  const vendor = SEED_USERS.find((u) => u.role === 'vendor');
  if (!vendor) return;
  const existing = await db.users.where('username').equals(vendor.username).first();
  if (!existing) await db.users.put(vendor);
};

/** Clear the migration flag AND wipe IDB. Used by the demo-reset UI. */
export const resetBootstrap = (): void => {
  storage.remove(MIGRATION_FLAG);
};
