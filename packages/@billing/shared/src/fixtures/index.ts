// FIXTURES BARREL - single import point for all demo/seed data.

// Fixtures barrel. Only three files may import: db-bootstrap, SalesContext (back-seed), SettingsContext (reset).

// See ./README.md for the "how to scrap this folder" instructions.
export { SEED_STORES, SEED_STORE_MAIN_ID, SEED_STORE_BRANCH_ID, SEED_STORE_THIRD_ID } from './stores';
export { SEED_USERS }     from './users';
export { SEED_CUSTOMERS } from './customers';
export { SEED_PRODUCTS }  from './products';
export { buildDemoSales } from './sales';
export { buildDemoOrders } from './orders';
export { DEFAULT_SETTINGS } from './settings';

// TMBill parity - restaurant vertical fixtures.
export {
  SEED_MARKETS, SEED_BRANDS, SEED_OUTLETS, SEED_PAYMENT_MODES, SEED_ORDER_TYPES,
  SEED_TAX_SLABS, SEED_DISCOUNTS, SEED_ADDL_CHARGES, SEED_REASONS,
  SEED_OUTLET_SETTINGS, SEED_MENU_CATEGORIES, SEED_MODIFIERS, SEED_COMBOS,
  SEED_VARIANTS, SEED_SECTIONS, SEED_TABLES, SEED_KOT_STATIONS,
  SEED_AGGREGATORS, SEED_DELIVERY_ZONES, SEED_INGREDIENTS, SEED_RECIPES,
  SEED_SUPPLIERS, SEED_PURCHASE_ORDERS, SEED_WASTAGE, SEED_CUSTOMER_GROUPS,
  SEED_LOYALTY_TIERS, SEED_COUPONS, SEED_FEEDBACK,
} from './restaurant';

// Phase 8+ - Inventory depth, Accounting, Marketing.
export {
  SEED_WAREHOUSES, SEED_RM_CATEGORIES, SEED_UOM, SEED_STOCK_ADJUSTMENTS,
  SEED_GRNS, SEED_STOCK_TRANSFERS, SEED_INDENTS, SEED_PRODUCTION_BATCHES,
  SEED_ACCOUNTS, SEED_EXP_CATEGORIES, SEED_EXPENSES, SEED_VENDOR_BILLS,
  SEED_WA_TEMPLATES, SEED_SEGMENTS, SEED_CAMPAIGNS,
} from './tmbill-extras';
