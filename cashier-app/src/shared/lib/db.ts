// Dexie/IndexedDB - persisted domain data. Tenant rows carry storeId; compound indexes enforce per-tenant uniqueness.
import Dexie, { type Table } from 'dexie';
import { BRAND } from '@shared/brand';
import type {
  AuditEntry, Customer, CustomerPayment, Product, Sale, Store, User,
} from '@shared/domain/types';

// Schema versions are declared inline via `.version(N).stores({...})`; each
// migration ships its own `.upgrade()` callback for legacy rows.
class AppDB extends Dexie {
  stores!:            Table<Store, string>;
  users!:             Table<User, string>;
  products!:          Table<Product, string>;
  customers!:         Table<Customer, string>;
  sales!:             Table<Sale, string>;
  customerPayments!:  Table<CustomerPayment, string>;
  auditLog!:          Table<AuditEntry, string>;

  constructor() {
    // Renaming BRAND.dbName orphans existing local data - keep it stable OR ship a migration.
    super(BRAND.dbName);

    // v1 - initial schema. Uniqueness is enforced at the app layer (typed errors)
    // rather than via & unique indexes (raw Dexie throws).
    this.version(1).stores({
      stores:            'id, name',
      users:             'id, username, storeId',
      products:          'id, storeId, [storeId+sku], category, active',
      customers:         'id, storeId, [storeId+mobile]',
      sales:             'id, storeId, completedAt, customerId, cashierId, voided',
      customerPayments:  'id, customerId, receivedAt',
    });

    // v2 - rename UserRole `master` -> `admin` in place.
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

    // v3 - vendor console: add store.status + auditLog table. Existing rows default to 'active'.
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

// Drop the whole DB - used by "Reset demo data".
export const resetDb = async (): Promise<void> => {
  await db.delete();
  await db.open();  // re-open for the current tab; new tabs get a fresh instance
};
