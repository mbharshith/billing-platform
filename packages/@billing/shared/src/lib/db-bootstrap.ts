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

const MIGRATION_FLAG = 'db-bootstrap::v9b';

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
  // v9 - also wipe every OUTLET-SCOPED CONFIG TABLE so the fan-out reseed
  // (each row per outlet) replaces old storeId-only rows. We keep audit +
  // vendor-only tables untouched.
  const storeCount = await db.stores.count();
  if (storeCount > 0) {
    const CORE = [db.stores, db.users, db.products, db.customers, db.customerPayments, db.sales] as const;
    const CONFIG = [
      db.paymentModes, db.orderTypes, db.taxSlabs, db.discounts, db.addlCharges, db.reasons,
      db.menuCategories, db.modifiers, db.combos, db.variants,
      db.sections, db.diningTables, db.kotStations,
      db.aggregators, db.deliveryZones,
      db.ingredients, db.recipes, db.suppliers,
      db.customerGroups, db.loyaltyTiers, db.coupons,
      db.warehouses, db.rmCategories, db.uom,
      db.accounts, db.expenseCategories, db.waTemplates, db.segments,
    ] as const;
    await db.transaction('rw', [...CORE, ...CONFIG], async () => {
      for (const t of [...CORE, ...CONFIG]) await t.clear();
    });
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
  // pricing PER OUTLET. A product whose outletId already matches a real
  // (non-primary) outlet is OUTLET-EXCLUSIVE - it stays where it is,
  // skipping the fan-out (used for per-branch specials like Koramangala's
  // fusion menu vs HSR's health menu).
  const outletsByStore = new Map<string, readonly string[]>();
  const isRealOutlet = new Set<string>();
  for (const o of SEED_OUTLETS) {
    const list = outletsByStore.get(o.storeId) ?? [];
    outletsByStore.set(o.storeId, [...list, o.id]);
    isRealOutlet.add(o.id);
  }
  const fanOutProducts = <T extends { readonly id: string; readonly storeId: string; readonly outletId?: string }>(rows: readonly T[]): T[] => {
    const out: T[] = [];
    for (const row of rows) {
      // Exclusive product: outletId points at a real non-primary outlet.
      // Ship as-is, don't fan.
      if (row.outletId && row.outletId !== row.storeId && isRealOutlet.has(row.outletId)) {
        out.push(row);
        continue;
      }
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

  // -- outlet fan-out helpers ---------------------------------------------
  // Every tenant config row (menu, kitchen, tax, recipes...) exists once
  // PER OUTLET. Rather than repeat rows in each fixture file, wrap the seed
  // insert to fan a base row across all outlets of its storeId. Rows already
  // stamped with a real non-primary outletId are left alone (exclusives).
  //
  // FK REWRITE: when cloning a row to outlet 'outlet-spice-koram', any FK
  // field ending in 'Id' (e.g. sectionId, menuItemId, supplierId,
  // ingredientId, categoryId, warehouseId) is suffixed the same way so it
  // points at the sibling row in the same outlet. Structural / cross-tenant
  // ids are on a denylist so they stay flat.
  const outletsByStore = new Map<string, readonly string[]>();
  const isRealOutlet = new Set<string>();
  for (const o of SEED_OUTLETS) {
    const list = outletsByStore.get(o.storeId) ?? [];
    outletsByStore.set(o.storeId, [...list, o.id]);
    isRealOutlet.add(o.id);
  }
  const FK_DENYLIST = new Set([
    'id', 'storeId', 'outletId',
    'brandId', 'marketId',
    'cashierId', 'currentSaleId', 'customerId',
  ]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const suffixFks = (value: any, outletId: string): any => {
    if (value === null || value === undefined) return value;
    if (Array.isArray(value)) return value.map((v) => suffixFks(v, outletId));
    if (typeof value !== 'object') return value;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const out: any = {};
    for (const [k, v] of Object.entries(value)) {
      if (typeof v === 'string' && k.endsWith('Id') && !FK_DENYLIST.has(k) && v.length > 0 && !v.includes('::')) {
        out[k] = `${v}::${outletId}`;
      } else if (v && typeof v === 'object') {
        out[k] = suffixFks(v, outletId);
      } else {
        out[k] = v;
      }
    }
    return out;
  };
  const fanOut = <T extends { id: string; storeId: string; outletId?: string }>(rows: readonly T[]): T[] => {
    const out: T[] = [];
    for (const row of rows) {
      if (row.outletId && row.outletId !== row.storeId && isRealOutlet.has(row.outletId)) {
        out.push(row);
        continue;
      }
      const targets = outletsByStore.get(row.storeId) ?? [row.storeId];
      for (const outletId of targets) {
        if (outletId === row.storeId) {
          // Primary outlet: original id + no FK rewrite (FKs already point at primary rows).
          out.push({ ...row, outletId });
        } else {
          // Non-primary: suffix id + rewrite every FK in the row so they
          // point at the sibling rows already suffixed at this outlet.
          const rewritten = suffixFks(row, outletId);
          out.push({ ...rewritten, id: `${row.id}::${outletId}`, outletId });
        }
      }
    }
    return out;
  };
  const seedFannedIfEmpty = async <T extends { id: string; storeId: string; outletId?: string }>(
    table: { count: () => Promise<number>; bulkPut: (rows: T[]) => Promise<unknown> },
    rows: readonly T[],
  ): Promise<void> => {
    if ((await table.count()) === 0) await table.bulkPut([...fanOut(rows)]);
  };
  const seedFannedPerStoreIfMissing = async <T extends { id: string; storeId: string; outletId?: string }>(
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
      if (existing === 0) await table.bulkPut(fanOut(storeRows));
    }
  };

  await seedIfEmpty(db.markets,         SEED_MARKETS);
  await seedIfEmpty(db.brands,          SEED_BRANDS);
  await seedPerStoreIfMissing(db.outlets as never, SEED_OUTLETS);
  // Outlet-scoped config: fan out across every outlet of each store.
  await seedFannedIfEmpty(db.paymentModes as never,    SEED_PAYMENT_MODES as never);
  await seedFannedPerStoreIfMissing(db.orderTypes as never, SEED_ORDER_TYPES as never);
  await seedFannedIfEmpty(db.taxSlabs as never,        SEED_TAX_SLABS as never);
  await seedFannedIfEmpty(db.discounts as never,       SEED_DISCOUNTS as never);
  await seedFannedIfEmpty(db.addlCharges as never,     SEED_ADDL_CHARGES as never);
  await seedFannedIfEmpty(db.reasons as never,         SEED_REASONS as never);
  await seedIfEmpty(db.outletSettings,  SEED_OUTLET_SETTINGS);
  await seedFannedIfEmpty(db.menuCategories as never,  SEED_MENU_CATEGORIES as never);
  await seedFannedIfEmpty(db.modifiers as never,       SEED_MODIFIERS as never);
  await seedFannedIfEmpty(db.combos as never,          SEED_COMBOS as never);
  await seedFannedIfEmpty(db.variants as never,        SEED_VARIANTS as never);
  await seedFannedIfEmpty(db.sections as never,        SEED_SECTIONS as never);
  await seedFannedIfEmpty(db.diningTables as never,    SEED_TABLES as never);
  await seedFannedIfEmpty(db.kotStations as never,     SEED_KOT_STATIONS as never);
  await seedFannedIfEmpty(db.aggregators as never,     SEED_AGGREGATORS as never);
  await seedFannedIfEmpty(db.deliveryZones as never,   SEED_DELIVERY_ZONES as never);
  await seedFannedIfEmpty(db.ingredients as never,     SEED_INGREDIENTS as never);
  await seedFannedIfEmpty(db.recipes as never,         SEED_RECIPES as never);
  await seedFannedIfEmpty(db.suppliers as never,       SEED_SUPPLIERS as never);
  // Transactional / historical - just bulkPut as-is (backfill to primary).
  await seedIfEmpty(db.purchaseOrders,  SEED_PURCHASE_ORDERS);
  await seedIfEmpty(db.wastage,         SEED_WASTAGE);
  await seedFannedIfEmpty(db.customerGroups as never,  SEED_CUSTOMER_GROUPS as never);
  await seedFannedIfEmpty(db.loyaltyTiers as never,    SEED_LOYALTY_TIERS as never);
  await seedFannedIfEmpty(db.coupons as never,         SEED_COUPONS as never);
  await seedIfEmpty(db.feedback,        SEED_FEEDBACK);
  // v6 seeds - fan config, keep txn history flat.
  await seedFannedIfEmpty(db.warehouses as never,        SEED_WAREHOUSES as never);
  await seedFannedIfEmpty(db.rmCategories as never,      SEED_RM_CATEGORIES as never);
  await seedFannedIfEmpty(db.uom as never,               SEED_UOM as never);
  await seedIfEmpty(db.stockAdjustments,  SEED_STOCK_ADJUSTMENTS);
  await seedIfEmpty(db.grns,              SEED_GRNS);
  await seedIfEmpty(db.stockTransfers,    SEED_STOCK_TRANSFERS);
  await seedIfEmpty(db.indents,           SEED_INDENTS);
  await seedIfEmpty(db.productionBatches, SEED_PRODUCTION_BATCHES);
  await seedFannedIfEmpty(db.accounts as never,          SEED_ACCOUNTS as never);
  await seedFannedIfEmpty(db.expenseCategories as never, SEED_EXP_CATEGORIES as never);
  await seedIfEmpty(db.expenses,          SEED_EXPENSES);
  await seedIfEmpty(db.vendorBills,       SEED_VENDOR_BILLS);
  await seedFannedIfEmpty(db.waTemplates as never,       SEED_WA_TEMPLATES as never);
  await seedFannedIfEmpty(db.segments as never,          SEED_SEGMENTS as never);
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
