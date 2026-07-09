/**
 * Dexie/IndexedDB layer — single source of truth for persisted domain data.
 *
 * Why Dexie over localStorage?
 * - Storage cap jumps from ~5 MB (localStorage) to ~10 % of free disk (IDB).
 * - Filters like `.where('[storeId+completedAt]').between(...)` become
 *   B-tree index lookups (O(log n)) instead of full-array scans (O(n)).
 * - Async, non-blocking writes — no main-thread jank on big lists.
 * - Native change events → `useLiveQuery` re-renders when data changes,
 *   including changes from other browser tabs (cross-tab reactivity for free).
 * - Schema versioning + migrations built in.
 *
 * Design notes:
 * - Every domain entity that belongs to a tenant carries a `storeId` field
 *   and is indexed on it. All tenant-scoped queries filter on that index.
 * - Compound indexes (`[storeId+sku]`, `[storeId+mobile]`) enforce
 *   per-tenant uniqueness at the query level and make lookups instant.
 * - The `customerPayments` table lives alongside `customers` (1:N) but is
 *   scoped indirectly via the parent customer's `storeId`.
 *
 * NOT in this DB (intentionally):
 * - Auth session — sessionStorage (tiny, session-only).
 * - App-wide theme + settings — localStorage (per browser, not per tenant).
 * - Toasts — in-memory only.
 */

import Dexie, { type Table } from 'dexie';
import { BRAND } from '../shared/brand';
import type {
  AuditEntry, Customer, CustomerPayment, Product, Sale, Store, User,
} from '../domain/types';

/** Schema versions are declared inline via `.version(N).stores({...})`.
 *  Each new version needs its own `.upgrade()` block for legacy data. */

class AppDB extends Dexie {
  stores!:            Table<Store, string>;
  users!:             Table<User, string>;
  products!:          Table<Product, string>;
  customers!:         Table<Customer, string>;
  sales!:             Table<Sale, string>;
  customerPayments!:  Table<CustomerPayment, string>;
  auditLog!:          Table<AuditEntry, string>;

  constructor() {
    // The IndexedDB name comes from BRAND.dbName. Renaming BRAND.dbName
    // orphans existing local data — keep it stable OR ship a migration.
    super(BRAND.dbName);

    /* -------------------------------------------------------------------- */
    /* v1 — initial schema                                                  */
    /* -------------------------------------------------------------------- */
    // Dexie index syntax:
    //   'primaryKey, plainIndex, [compound+key], &uniqueIndex, *multiEntry'
    // We keep uniqueness rules at the app layer (create()/update()) rather
    // than as & unique indexes — that way we can return typed error codes
    // ('duplicateSku', 'duplicateMobile') instead of a raw Dexie throw.
    this.version(1).stores({
      stores:            'id, name',
      users:             'id, username, storeId',
      products:          'id, storeId, [storeId+sku], category, active',
      customers:         'id, storeId, [storeId+mobile]',
      sales:             'id, storeId, completedAt, customerId, cashierId, voided',
      customerPayments:  'id, customerId, receivedAt',
    });

    /* -------------------------------------------------------------------- */
    /* v2 — rename UserRole `master` → `admin`                              */
    /* -------------------------------------------------------------------- */
    // Same shape as v1; the upgrade callback rewrites in-place.
    this.version(2).stores({
      stores:            'id, name',
      users:             'id, username, storeId',
      products:          'id, storeId, [storeId+sku], category, active',
      customers:         'id, storeId, [storeId+mobile]',
      sales:             'id, storeId, completedAt, customerId, cashierId, voided',
      customerPayments:  'id, customerId, receivedAt',
    }).upgrade(async (tx) => {
      await tx.table('users').toCollection().modify((u) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((u as any).role === 'master') (u as any).role = 'admin';
      });
    });

    /* -------------------------------------------------------------------- */
    /* v3 — vendor console: add store.status + auditLog table               */
    /* -------------------------------------------------------------------- */
    // Additive changes: existing stores get status='active', new auditLog
    // table is empty. Vendor user is inserted by db-bootstrap on next boot.
    this.version(3).stores({
      stores:            'id, name, status',
      users:             'id, username, storeId, role',
      products:          'id, storeId, [storeId+sku], category, active',
      customers:         'id, storeId, [storeId+mobile]',
      sales:             'id, storeId, completedAt, customerId, cashierId, voided',
      customerPayments:  'id, customerId, receivedAt',
      auditLog:          'id, at, actorUsername, targetStoreId, action',
    }).upgrade(async (tx) => {
      await tx.table('stores').toCollection().modify((s) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (!(s as any).status) (s as any).status = 'active';
      });
    });
  }
}

export const db = new AppDB();

/** Drop the whole DB — used by "Reset demo data". */
export const resetDb = async (): Promise<void> => {
  await db.delete();
  // Re-open for the current tab; new tabs will get a fresh instance too.
  await db.open();
};
