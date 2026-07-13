// One-shot bootstrap: skip if IDB already has data, else import legacy localStorage or seed demo data.

// Runs exactly once per browser: gated by a flag in localStorage so we don't
// import twice even if the user reloads mid-migration.

// Kept in a dedicated module so <RootProvider> can `await` it before any
// context provider mounts. That way live-queries never flash empty on boot.

import { db } from './db';
import { storage } from './storage';
import {
  SEED_STORES, SEED_USERS, SEED_CUSTOMERS, SEED_PRODUCTS,
  SEED_MARKETS, SEED_BRANDS, SEED_OUTLETS, SEED_PAYMENT_MODES, SEED_ORDER_TYPES,
  SEED_TAX_SLABS, SEED_DISCOUNTS, SEED_ADDL_CHARGES, SEED_REASONS,
  SEED_OUTLET_SETTINGS, SEED_MENU_CATEGORIES, SEED_MODIFIERS, SEED_COMBOS,
  SEED_VARIANTS, SEED_SECTIONS, SEED_TABLES, SEED_KOT_STATIONS,
  SEED_AGGREGATORS, SEED_DELIVERY_ZONES, SEED_INGREDIENTS, SEED_RECIPES,
  SEED_SUPPLIERS, SEED_PURCHASE_ORDERS, SEED_WASTAGE, SEED_CUSTOMER_GROUPS,
  SEED_LOYALTY_TIERS, SEED_COUPONS, SEED_FEEDBACK,
  SEED_WAREHOUSES, SEED_RM_CATEGORIES, SEED_UOM, SEED_STOCK_ADJUSTMENTS,
  SEED_GRNS, SEED_STOCK_TRANSFERS, SEED_INDENTS, SEED_PRODUCTION_BATCHES,
  SEED_ACCOUNTS, SEED_EXP_CATEGORIES, SEED_EXPENSES, SEED_VENDOR_BILLS,
  SEED_WA_TEMPLATES, SEED_SEGMENTS, SEED_CAMPAIGNS,
} from '@billing/shared/fixtures';
import type {
  Customer, CustomerPayment, Product, Sale, Store, User, UserRole,
} from '@billing/shared/domain/types';

const MIGRATION_FLAG = 'db-bootstrap::v8b';

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
  // Fast path: already migrated on this browser - but still make sure the
  // vendor account exists AND top up any restaurant tables that were added
  // in later schema bumps.
  const already = storage.load<boolean>(MIGRATION_FLAG, false);
  if (already) {
    await ensureVendorUser();
    await seedRestaurantTables();
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

  // v8 - fan-out the base menu across every outlet of each store. Real
  // chains launch with the same menu at every branch but track stock and
  // pricing PER OUTLET. Rather than repeat 40+ product rows per outlet in
  // the fixtures, we duplicate the base SEED_PRODUCTS here: each product
  // ends up as N rows (one per outlet of its storeId), each with its own
  // stable id + outletId. The primary outlet keeps the original id so any
  // hard-coded references in seed sales / demo orders still resolve.
  const outletsByStore = new Map<string, readonly string[]>();
  for (const o of SEED_OUTLETS) {
    const list = outletsByStore.get(o.storeId) ?? [];
    outletsByStore.set(o.storeId, [...list, o.id]);
  }
  const fanOutProducts = <T extends { readonly id: string; readonly storeId: string; readonly outletId?: string }>(rows: readonly T[]): T[] => {
    const out: T[] = [];
    for (const row of rows) {
      const outlets = outletsByStore.get(row.storeId) ?? [row.storeId];
      for (const outletId of outlets) {
        // Primary outlet (id === storeId) keeps original row id so legacy
        // references still work; other outlets get a suffixed id.
        const id = outletId === row.storeId ? row.id : `${row.id}::${outletId}`;
        out.push({ ...row, id, outletId });
      }
    }
    return out;
  };
  const fannedProducts = hasLegacyData
    ? products                       // legacy = keep as-is, upgrade fn already backfilled outletId
    : fanOutProducts(products as readonly (typeof products)[number][]);

  // Bulk-insert everything in one transaction so a mid-write reload leaves
  // us either fully seeded or fully empty — never partially populated.
  await db.transaction(
    'rw',
    [db.stores, db.users, db.products, db.customers, db.customerPayments, db.sales],
    async () => {
      await db.stores.bulkPut([...stores]);
      await db.users.bulkPut([...users]);
      await db.products.bulkPut([...backfillStoreId(fannedProducts, fallbackStoreId)]);
      await db.customers.bulkPut([...backfillStoreId(customers, fallbackStoreId)]);
      await db.customerPayments.bulkPut([...oldPayments]);
      await db.sales.bulkPut([...backfillStoreId(oldSales,     fallbackStoreId)]);
    },
  );

  storage.save(MIGRATION_FLAG, true);
  await ensureVendorUser();
  await seedRestaurantTables();
};

// Seeds the 22 TMBill parity tables (Phase 1-7). Idempotent - checks each
// table individually so re-runs after schema bumps don't wipe user edits.
const seedRestaurantTables = async (): Promise<void> => {
  const seedIfEmpty = async <T>(
    table: { count: () => Promise<number>; bulkPut: (rows: T[]) => Promise<unknown> },
    rows: readonly T[],
  ): Promise<void> => {
    if ((await table.count()) === 0) await table.bulkPut([...rows]);
  };

  // Per-store seeder: bulkPut ONLY the rows for stores that have zero rows
  // in this table today. Lets us ship new seed data for a store that was
  // added later (e.g. Velvet retail order types) without wiping user edits
  // to another store's rows.
  const seedPerStoreIfMissing = async <T extends { storeId: string }>(
    table: {
      where: (key: string) => { equals: (v: string) => { count: () => Promise<number> } };
      bulkPut: (rows: T[]) => Promise<unknown>;
    },
    rows: readonly T[],
  ): Promise<void> => {
    const byStore: Record<string, T[]> = {};
    rows.forEach((r) => { (byStore[r.storeId] ??= []).push(r); });
    for (const [storeId, storeRows] of Object.entries(byStore)) {
      const existing = await table.where('storeId').equals(storeId).count();
      if (existing === 0) await table.bulkPut(storeRows);
    }
  };
  await seedIfEmpty(db.markets,         SEED_MARKETS);
  await seedIfEmpty(db.brands,          SEED_BRANDS);
  await seedPerStoreIfMissing(db.outlets as never, SEED_OUTLETS);
  await seedIfEmpty(db.paymentModes,    SEED_PAYMENT_MODES);
  await seedPerStoreIfMissing(db.orderTypes as never, SEED_ORDER_TYPES);
  await seedIfEmpty(db.taxSlabs,        SEED_TAX_SLABS);
  await seedIfEmpty(db.discounts,       SEED_DISCOUNTS);
  await seedIfEmpty(db.addlCharges,     SEED_ADDL_CHARGES);
  await seedIfEmpty(db.reasons,         SEED_REASONS);
  await seedIfEmpty(db.outletSettings,  SEED_OUTLET_SETTINGS);
  await seedIfEmpty(db.menuCategories,  SEED_MENU_CATEGORIES);
  await seedIfEmpty(db.modifiers,       SEED_MODIFIERS);
  await seedIfEmpty(db.combos,          SEED_COMBOS);
  await seedIfEmpty(db.variants,        SEED_VARIANTS);
  await seedIfEmpty(db.sections,        SEED_SECTIONS);
  await seedIfEmpty(db.diningTables,    SEED_TABLES);
  await seedIfEmpty(db.kotStations,     SEED_KOT_STATIONS);
  await seedIfEmpty(db.aggregators,     SEED_AGGREGATORS);
  await seedIfEmpty(db.deliveryZones,   SEED_DELIVERY_ZONES);
  await seedIfEmpty(db.ingredients,     SEED_INGREDIENTS);
  await seedIfEmpty(db.recipes,         SEED_RECIPES);
  await seedIfEmpty(db.suppliers,       SEED_SUPPLIERS);
  await seedIfEmpty(db.purchaseOrders,  SEED_PURCHASE_ORDERS);
  await seedIfEmpty(db.wastage,         SEED_WASTAGE);
  await seedIfEmpty(db.customerGroups,  SEED_CUSTOMER_GROUPS);
  await seedIfEmpty(db.loyaltyTiers,    SEED_LOYALTY_TIERS);
  await seedIfEmpty(db.coupons,         SEED_COUPONS);
  await seedIfEmpty(db.feedback,        SEED_FEEDBACK);
  // v6 seeds
  await seedIfEmpty(db.warehouses,        SEED_WAREHOUSES);
  await seedIfEmpty(db.rmCategories,      SEED_RM_CATEGORIES);
  await seedIfEmpty(db.uom,               SEED_UOM);
  await seedIfEmpty(db.stockAdjustments,  SEED_STOCK_ADJUSTMENTS);
  await seedIfEmpty(db.grns,              SEED_GRNS);
  await seedIfEmpty(db.stockTransfers,    SEED_STOCK_TRANSFERS);
  await seedIfEmpty(db.indents,           SEED_INDENTS);
  await seedIfEmpty(db.productionBatches, SEED_PRODUCTION_BATCHES);
  await seedIfEmpty(db.accounts,          SEED_ACCOUNTS);
  await seedIfEmpty(db.expenseCategories, SEED_EXP_CATEGORIES);
  await seedIfEmpty(db.expenses,          SEED_EXPENSES);
  await seedIfEmpty(db.vendorBills,       SEED_VENDOR_BILLS);
  await seedIfEmpty(db.waTemplates,       SEED_WA_TEMPLATES);
  await seedIfEmpty(db.segments,          SEED_SEGMENTS);
  await seedIfEmpty(db.campaigns,         SEED_CAMPAIGNS);
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
