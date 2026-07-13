// Dexie/IndexedDB - persisted domain data. Tenant rows carry storeId;
// compound indexes enforce per-tenant uniqueness.
//
// Schema versions:
//   v1  initial (stores/users/products/customers/sales/customerPayments)
//   v2  UserRole 'master' -> 'admin' upgrade
//   v3  vendor console: store.status + auditLog table
//   v4  online orders: sale.channel + orderStatus + address + history
//   v5  TMBill parity: 22 new restaurant tables (Phase 1-7)

import Dexie, { type Table } from 'dexie';
import { BRAND } from '@billing/shared/brand';
import type {
  AuditEntry, Customer, CustomerPayment, Product, Sale, Store, User,
} from '@billing/shared/domain/types';
import type {
  Market, Brand, Outlet, PaymentMode, OrderType, TaxSlab, Discount,
  AdditionalCharge, Reason, OutletSettings, MenuCategory, Modifier, Combo,
  Variant, FloorSection, DiningTable, KotStation, AggregatorConfig,
  DeliveryZone, Ingredient, Recipe, Supplier, PurchaseOrder, WastageEntry,
  CustomerGroup, LoyaltyTier, Coupon, FeedbackEntry,
} from '@billing/shared/domain/restaurant';
import type {
  Warehouse, RawMaterialCategory, UnitOfMeasure, StockAdjustment, GRN,
  StockTransfer, IndentRequest, ProductionBatch, Account, ExpenseCategory,
  Expense, VendorBill, WhatsAppTemplate, CustomerSegment, MarketingCampaign,
} from '@billing/shared/domain/tmbill-extras';

class AppDB extends Dexie {
  // v1-v4 tables
  stores!:            Table<Store, string>;
  users!:             Table<User, string>;
  products!:          Table<Product, string>;
  customers!:         Table<Customer, string>;
  sales!:             Table<Sale, string>;
  customerPayments!:  Table<CustomerPayment, string>;
  auditLog!:          Table<AuditEntry, string>;

  // v5 tables - TMBill parity
  markets!:           Table<Market, string>;
  brands!:            Table<Brand, string>;
  outlets!:           Table<Outlet, string>;
  paymentModes!:      Table<PaymentMode, string>;
  orderTypes!:        Table<OrderType, string>;
  taxSlabs!:          Table<TaxSlab, string>;
  discounts!:         Table<Discount, string>;
  addlCharges!:       Table<AdditionalCharge, string>;
  reasons!:           Table<Reason, string>;
  outletSettings!:    Table<OutletSettings, string>;
  menuCategories!:    Table<MenuCategory, string>;
  modifiers!:         Table<Modifier, string>;
  combos!:            Table<Combo, string>;
  variants!:          Table<Variant, string>;
  sections!:          Table<FloorSection, string>;
  diningTables!:      Table<DiningTable, string>;
  kotStations!:       Table<KotStation, string>;
  aggregators!:       Table<AggregatorConfig, string>;
  deliveryZones!:     Table<DeliveryZone, string>;
  ingredients!:       Table<Ingredient, string>;
  recipes!:           Table<Recipe, string>;
  suppliers!:         Table<Supplier, string>;
  purchaseOrders!:    Table<PurchaseOrder, string>;
  wastage!:           Table<WastageEntry, string>;
  customerGroups!:    Table<CustomerGroup, string>;
  loyaltyTiers!:      Table<LoyaltyTier, string>;
  coupons!:           Table<Coupon, string>;
  feedback!:          Table<FeedbackEntry, string>;

  // v6 tables - Phase 8+ (Inventory depth, Accounting, Marketing)
  warehouses!:        Table<Warehouse, string>;
  rmCategories!:      Table<RawMaterialCategory, string>;
  uom!:               Table<UnitOfMeasure, string>;
  stockAdjustments!:  Table<StockAdjustment, string>;
  grns!:              Table<GRN, string>;
  stockTransfers!:    Table<StockTransfer, string>;
  indents!:           Table<IndentRequest, string>;
  productionBatches!: Table<ProductionBatch, string>;
  accounts!:          Table<Account, string>;
  expenseCategories!: Table<ExpenseCategory, string>;
  expenses!:          Table<Expense, string>;
  vendorBills!:       Table<VendorBill, string>;
  waTemplates!:       Table<WhatsAppTemplate, string>;
  segments!:          Table<CustomerSegment, string>;
  campaigns!:         Table<MarketingCampaign, string>;

  constructor() {
    // Renaming BRAND.dbName orphans existing local data - keep it stable OR ship a migration.
    super(BRAND.dbName);

    // v1 - initial schema. Uniqueness is enforced at the app layer (typed
    // errors) rather than via & unique indexes (raw Dexie throws).
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

    // v3 - vendor console: add store.status + auditLog table.
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

    // v4 - online orders: add channel + orderStatus + address on sales.
    this.version(4).stores({
      stores:            'id, name, status',
      users:             'id, username, storeId, role',
      products:          'id, storeId, [storeId+sku], category, active',
      customers:         'id, storeId, [storeId+mobile]',
      sales:             'id, storeId, completedAt, customerId, cashierId, voided, channel, orderStatus, [storeId+channel], [storeId+orderStatus]',
      customerPayments:  'id, customerId, receivedAt',
      auditLog:          'id, at, actorUsername, targetStoreId, action',
    }).upgrade(async (tx) => {
      await tx.table('sales').toCollection().modify((s) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const row = s as any;
        if (!row.channel)                        row.channel = 'counter';
        if (row.orderStatus     === undefined)   row.orderStatus     = null;
        if (row.customerName    === undefined)   row.customerName    = null;
        if (row.deliveryAddress === undefined)   row.deliveryAddress = null;
        if (row.customerNotes   === undefined)   row.customerNotes   = null;
        if (row.statusHistory   === undefined)   row.statusHistory   = null;
      });
    });

    // v5 - TMBill parity: 22 new tables for Phase 1-7 entities. Every new
    // table is per-tenant via storeId (except markets/brands which are
    // cross-tenant / vendor-owned). No upgrade fn needed - new tables start
    // empty; bootstrap seeds them from fixtures.
    this.version(5).stores({
      stores:            'id, name, status',
      users:             'id, username, storeId, role',
      products:          'id, storeId, [storeId+sku], category, active',
      customers:         'id, storeId, [storeId+mobile]',
      sales:             'id, storeId, completedAt, customerId, cashierId, voided, channel, orderStatus, [storeId+channel], [storeId+orderStatus]',
      customerPayments:  'id, customerId, receivedAt',
      auditLog:          'id, at, actorUsername, targetStoreId, action',
      // POS Config
      markets:           'id, code, active',
      brands:            'id, marketId, active',
      outlets:           'id, brandId, marketId, active',
      paymentModes:      'id, storeId, code, active',
      orderTypes:        'id, storeId, code, active',
      taxSlabs:          'id, storeId, appliesTo, active',
      discounts:         'id, storeId, type, active',
      addlCharges:       'id, storeId, active',
      reasons:           'id, storeId, category, active',
      outletSettings:    'outletId',
      // Menu
      menuCategories:    'id, storeId, sortOrder, active',
      modifiers:         'id, storeId, active',
      combos:            'id, storeId, active',
      variants:          'id, storeId, menuItemId, active',
      // Tables/KDS
      sections:          'id, storeId, sortOrder, active',
      diningTables:      'id, storeId, sectionId, status, active',
      kotStations:       'id, storeId, active',
      // Online
      aggregators:       'id, storeId, provider, enabled',
      deliveryZones:     'id, storeId, active',
      // Inventory
      ingredients:       'id, storeId, active',
      recipes:           'id, storeId, menuItemId',
      suppliers:         'id, storeId, active',
      purchaseOrders:    'id, storeId, status, orderedAt',
      wastage:           'id, storeId, reportedAt',
      // CRM
      customerGroups:    'id, storeId, active',
      loyaltyTiers:      'id, storeId, active',
      coupons:           'id, storeId, code, active',
      feedback:          'id, storeId, at, resolved',
    });

    // v6 - Phase 8+ extras: warehouses, GRN, stock ops, accounting,
    // marketing. All storeId-scoped, no upgrade fn (new tables only).
    this.version(6).stores({
      stores:            'id, name, status',
      users:             'id, username, storeId, role',
      products:          'id, storeId, [storeId+sku], category, active',
      customers:         'id, storeId, [storeId+mobile]',
      sales:             'id, storeId, completedAt, customerId, cashierId, voided, channel, orderStatus, [storeId+channel], [storeId+orderStatus]',
      customerPayments:  'id, customerId, receivedAt',
      auditLog:          'id, at, actorUsername, targetStoreId, action',
      markets:           'id, code, active',
      brands:            'id, marketId, active',
      outlets:           'id, brandId, marketId, active',
      paymentModes:      'id, storeId, code, active',
      orderTypes:        'id, storeId, code, active',
      taxSlabs:          'id, storeId, appliesTo, active',
      discounts:         'id, storeId, type, active',
      addlCharges:       'id, storeId, active',
      reasons:           'id, storeId, category, active',
      outletSettings:    'outletId',
      menuCategories:    'id, storeId, sortOrder, active',
      modifiers:         'id, storeId, active',
      combos:            'id, storeId, active',
      variants:          'id, storeId, menuItemId, active',
      sections:          'id, storeId, sortOrder, active',
      diningTables:      'id, storeId, sectionId, status, active',
      kotStations:       'id, storeId, active',
      aggregators:       'id, storeId, provider, enabled',
      deliveryZones:     'id, storeId, active',
      ingredients:       'id, storeId, active',
      recipes:           'id, storeId, menuItemId',
      suppliers:         'id, storeId, active',
      purchaseOrders:    'id, storeId, status, orderedAt',
      wastage:           'id, storeId, reportedAt',
      customerGroups:    'id, storeId, active',
      loyaltyTiers:      'id, storeId, active',
      coupons:           'id, storeId, code, active',
      feedback:          'id, storeId, at, resolved',
      // v6 new tables
      warehouses:        'id, storeId, type, active',
      rmCategories:      'id, storeId, sortOrder, active',
      uom:               'id, storeId, code, active',
      stockAdjustments:  'id, storeId, warehouseId, ingredientId, performedAt',
      grns:              'id, storeId, grnNumber, supplierId, status, receivedAt',
      stockTransfers:    'id, storeId, transferNumber, status, requestedAt',
      indents:           'id, storeId, indentNumber, status, requestedAt',
      productionBatches: 'id, storeId, batchNumber, status, producedAt',
      accounts:          'id, storeId, code, type, active',
      expenseCategories: 'id, storeId, active',
      expenses:          'id, storeId, voucherNumber, categoryId, incurredAt',
      vendorBills:       'id, storeId, billNumber, supplierId, status, dueDate',
      waTemplates:       'id, storeId, category, active',
      segments:          'id, storeId, active',
      campaigns:         'id, storeId, channel, status, scheduledAt',
    });

    // v7 - Multi-outlet support: outlets get a storeId index, sales get an
    // outletId index. No data migration needed - outletId is optional on
    // legacy sales and defaults to storeId on read.
    this.version(7).stores({
      outlets: 'id, storeId, brandId, marketId, active',
      sales:   'id, storeId, outletId, completedAt, customerId, cashierId, voided, channel, orderStatus, [storeId+channel], [storeId+orderStatus], [storeId+outletId]',
    });

    // v8 - EVERYTHING outlet-scoped. Products and Customers now carry an
    // outletId. Compound indexes replace the store-only ones so uniqueness
    // is per-outlet ('same phone at Koramangala != same phone at Indiranagar'
    // - each outlet manages its own book). Legacy rows are backfilled to
    // the first outlet of their storeId in the upgrade function below so
    // no data is lost.
    this.version(8).stores({
      products:  'id, storeId, outletId, [storeId+outletId], [storeId+outletId+sku], category, active',
      customers: 'id, storeId, outletId, [storeId+outletId], [storeId+outletId+mobile]',
    }).upgrade(async (tx) => {
      // Build storeId -> [outlet-ids] map. We fan products out across every
      // outlet of their store (chain-wide menu at launch, per-outlet stock)
      // and backfill customers to the primary outlet only (people belong to
      // one branch until they walk into another).
      const outletTable = tx.table<{ id: string; storeId: string; active: boolean }>('outlets');
      const outlets = await outletTable.toArray();
      const outletsByStore = new Map<string, string[]>();
      const primaryByStore = new Map<string, string>();
      for (const o of outlets) {
        const list = outletsByStore.get(o.storeId) ?? [];
        list.push(o.id);
        outletsByStore.set(o.storeId, list);
        // Primary outlet = the one whose id === storeId (our seed convention)
        // OR the first one inserted for that store.
        if (o.id === o.storeId) primaryByStore.set(o.storeId, o.id);
        else if (!primaryByStore.has(o.storeId)) primaryByStore.set(o.storeId, o.id);
      }
      const primaryFor = (storeId: string): string => primaryByStore.get(storeId) ?? storeId;

      // Products: fan out. Existing row keeps its id + gets outletId=primary;
      // a NEW row is inserted for every other outlet (id suffixed with outletId).
      const productTable = tx.table<{ id: string; storeId: string; outletId?: string; sku: string }>('products');
      const existingProducts = await productTable.toArray();
      const duplicates: typeof existingProducts = [];
      for (const p of existingProducts) {
        if (!p.outletId) {
          await productTable.update(p.id, { outletId: primaryFor(p.storeId) });
        }
        const allOutlets = outletsByStore.get(p.storeId) ?? [p.storeId];
        for (const outletId of allOutlets) {
          if (outletId === primaryFor(p.storeId)) continue;   // skip primary - already there
          duplicates.push({ ...p, id: `${p.id}::${outletId}`, outletId });
        }
      }
      if (duplicates.length > 0) await productTable.bulkAdd(duplicates as never);

      // Customers stay per-primary-outlet - no fan-out. Same phone at another
      // outlet will genuinely be a new record when someone walks in.
      const customerTable = tx.table<{ id: string; storeId: string; outletId?: string }>('customers');
      await customerTable.toCollection().modify((c) => {
        if (!c.outletId) c.outletId = primaryFor(c.storeId);
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
