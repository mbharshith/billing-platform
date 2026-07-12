// FIXTURE - restaurant / TMBill seed data. Scrap when the real backend is live.
//
// Shape mirrors AlAdams.docx reference walkthrough: single restaurant brand
// ("Al Adams Non Veg"), one market (India-South), one outlet, ~15 menu items,
// 12 tables across 2 sections, aggregator config for Zomato + Swiggy, etc.
//
// Keeps things TENANT-SCOPED via the existing SEED_STORE_BRANCH_ID (Spice
// Route) so the restaurant tenant is the "primary" one for TMBill parity.

import type {
  AdditionalCharge, AggregatorConfig, Brand, Combo, Coupon, CustomerGroup,
  DeliveryZone, DiningTable, Discount, FeedbackEntry, FloorSection,
  Ingredient, KotStation, LoyaltyTier, Market, MenuCategory, Modifier,
  OrderType, Outlet, OutletSettings, PaymentMode, PurchaseOrder, Reason,
  Recipe, Supplier, TaxSlab, Variant, WastageEntry,
} from '@billing/shared/domain/restaurant';
import { SEED_STORE_BRANCH_ID } from './stores';

const NOW = new Date().toISOString();
const S = SEED_STORE_BRANCH_ID;

/* -------------------------------------------------------------------------- */
/* PHASE 1  POS Config                                                        */
/* -------------------------------------------------------------------------- */

export const SEED_MARKETS: readonly Market[] = [
  { id: 'mkt-in-s', name: 'India - South', code: 'IN-S', country: 'India',        currency: 'INR', active: true,  createdAt: NOW },
  { id: 'mkt-in-n', name: 'India - North', code: 'IN-N', country: 'India',        currency: 'INR', active: true,  createdAt: NOW },
  { id: 'mkt-uae',  name: 'UAE - Dubai',   code: 'UAE',  country: 'UAE',          currency: 'AED', active: false, createdAt: NOW },
];

export const SEED_BRANDS: readonly Brand[] = [
  { id: 'brand-aladams', name: 'Al Adams Non Veg',    marketId: 'mkt-in-s', logoUrl: null, cuisineType: 'Indian - Non-Veg', active: true,  createdAt: NOW },
  { id: 'brand-spice',   name: 'Spice Route Kitchen', marketId: 'mkt-in-s', logoUrl: null, cuisineType: 'Multi-cuisine',    active: true,  createdAt: NOW },
  { id: 'brand-royal',   name: 'Royal Biryani House', marketId: 'mkt-in-n', logoUrl: null, cuisineType: 'Mughlai',          active: false, createdAt: NOW },
];

export const SEED_OUTLETS: readonly Outlet[] = [
  {
    id: S, name: 'Spice Route - Indiranagar', brandId: 'brand-spice',
    marketId: 'mkt-in-s', city: 'Bengaluru', phone: '+91 80 4700 2000',
    address: 'Indiranagar 100 Feet Road, Bengaluru 560038',
    taxRate: 0.05, currency: 'INR', seatCapacity: 60,
    active: true, status: 'active', createdAt: NOW,
  },
  {
    id: 'outlet-koram', name: 'Al Adams - Koramangala', brandId: 'brand-aladams',
    marketId: 'mkt-in-s', city: 'Bengaluru', phone: '+91 80 4700 2001',
    address: '80 Feet Road, Koramangala 4th Block, Bengaluru 560034',
    taxRate: 0.05, currency: 'INR', seatCapacity: 45,
    active: true, status: 'active', createdAt: NOW,
  },
  {
    id: 'outlet-hsr', name: 'Al Adams - HSR Layout', brandId: 'brand-aladams',
    marketId: 'mkt-in-s', city: 'Bengaluru', phone: '+91 80 4700 2002',
    address: '27th Main, HSR Layout Sector 1, Bengaluru 560102',
    taxRate: 0.05, currency: 'INR', seatCapacity: 50,
    active: true, status: 'active', createdAt: NOW,
  },
];

export const SEED_PAYMENT_MODES: readonly PaymentMode[] = [
  { id: 'pm-cash',   storeId: S, name: 'Cash',           code: 'CASH', category: 'cash',       requiresReference: false, active: true,  createdAt: NOW },
  { id: 'pm-card',   storeId: S, name: 'Card',           code: 'CARD', category: 'card',       requiresReference: false, active: true,  createdAt: NOW },
  { id: 'pm-upi',    storeId: S, name: 'UPI - PhonePe',  code: 'UPI',  category: 'upi',        requiresReference: true,  active: true,  createdAt: NOW },
  { id: 'pm-paytm',  storeId: S, name: 'Paytm Wallet',   code: 'PAYTM',category: 'wallet',     requiresReference: true,  active: true,  createdAt: NOW },
  { id: 'pm-zomato', storeId: S, name: 'Zomato Wallet',  code: 'ZOM',  category: 'aggregator', requiresReference: false, active: true,  createdAt: NOW },
  { id: 'pm-swiggy', storeId: S, name: 'Swiggy Wallet',  code: 'SWG',  category: 'aggregator', requiresReference: false, active: true,  createdAt: NOW },
  { id: 'pm-comp',   storeId: S, name: 'On the House',   code: 'COMP', category: 'comp',       requiresReference: false, active: false, createdAt: NOW },
];

export const SEED_ORDER_TYPES: readonly OrderType[] = [
  { id: 'ot-din', storeId: S, name: 'Dine-in',    code: 'DIN', icon: 'store',   kotPrefix: 'D', chargeExtra: false, extraChargePercent: 0,  active: true,  createdAt: NOW },
  { id: 'ot-tka', storeId: S, name: 'Takeaway',   code: 'TKA', icon: 'bag',     kotPrefix: 'T', chargeExtra: false, extraChargePercent: 0,  active: true,  createdAt: NOW },
  { id: 'ot-del', storeId: S, name: 'Delivery',   code: 'DEL', icon: 'send',    kotPrefix: 'L', chargeExtra: true,  extraChargePercent: 5,  active: true,  createdAt: NOW },
  { id: 'ot-zom', storeId: S, name: 'Zomato',     code: 'ZOM', icon: 'send',    kotPrefix: 'Z', chargeExtra: false, extraChargePercent: 0,  active: true,  createdAt: NOW },
  { id: 'ot-swg', storeId: S, name: 'Swiggy',     code: 'SWG', icon: 'send',    kotPrefix: 'S', chargeExtra: false, extraChargePercent: 0,  active: true,  createdAt: NOW },
];

export const SEED_TAX_SLABS: readonly TaxSlab[] = [
  { id: 'tx-gst5',  storeId: S, name: 'GST 5%',      percent: 5,  inclusive: false, appliesTo: 'food',      active: true,  createdAt: NOW },
  { id: 'tx-gst12', storeId: S, name: 'GST 12%',     percent: 12, inclusive: false, appliesTo: 'beverage',  active: true,  createdAt: NOW },
  { id: 'tx-gst18', storeId: S, name: 'GST 18%',     percent: 18, inclusive: false, appliesTo: 'all',       active: false, createdAt: NOW },
];

export const SEED_DISCOUNTS: readonly Discount[] = [
  { id: 'dsc-hh',    storeId: S, name: 'Happy Hours 20%',    type: 'percent', value: 20, maxAmount: 500,  requiresManagerApproval: false, active: true,  createdAt: NOW },
  { id: 'dsc-100',   storeId: S, name: 'Flat Rs.100 Off',    type: 'flat',    value: 100, maxAmount: null, requiresManagerApproval: false, active: true,  createdAt: NOW },
  { id: 'dsc-bogo',  storeId: S, name: 'BOGO on Starters',   type: 'bogo',    value: 1,   maxAmount: null, requiresManagerApproval: true,  active: false, createdAt: NOW },
  { id: 'dsc-staff', storeId: S, name: 'Staff Meal 50%',     type: 'percent', value: 50, maxAmount: 300,  requiresManagerApproval: true,  active: true,  createdAt: NOW },
];

export const SEED_ADDL_CHARGES: readonly AdditionalCharge[] = [
  { id: 'ac-svc',  storeId: S, name: 'Service Charge',  type: 'percent', value: 5,   appliesToOrderTypeCodes: ['DIN'],        taxable: false, active: true,  createdAt: NOW },
  { id: 'ac-del',  storeId: S, name: 'Delivery Fee',    type: 'flat',    value: 40,  appliesToOrderTypeCodes: ['DEL'],        taxable: false, active: true,  createdAt: NOW },
  { id: 'ac-pack', storeId: S, name: 'Packing Charge',  type: 'flat',    value: 15,  appliesToOrderTypeCodes: ['TKA','DEL'],  taxable: true,  active: true,  createdAt: NOW },
];

export const SEED_REASONS: readonly Reason[] = [
  { id: 'rsn-void1', storeId: S, text: 'Customer changed mind',    category: 'void',     active: true, createdAt: NOW },
  { id: 'rsn-void2', storeId: S, text: 'Wrong item punched',       category: 'void',     active: true, createdAt: NOW },
  { id: 'rsn-void3', storeId: S, text: 'Item unavailable',         category: 'void',     active: true, createdAt: NOW },
  { id: 'rsn-can1',  storeId: S, text: 'Duplicate order',          category: 'cancel',   active: true, createdAt: NOW },
  { id: 'rsn-can2',  storeId: S, text: 'Rider not available',      category: 'cancel',   active: true, createdAt: NOW },
  { id: 'rsn-ref1',  storeId: S, text: 'Quality complaint',        category: 'refund',   active: true, createdAt: NOW },
  { id: 'rsn-was1',  storeId: S, text: 'Spoilage / expired',       category: 'wastage',  active: true, createdAt: NOW },
  { id: 'rsn-was2',  storeId: S, text: 'Preparation error',        category: 'wastage',  active: true, createdAt: NOW },
  { id: 'rsn-dsc1',  storeId: S, text: 'Regular customer',         category: 'discount', active: true, createdAt: NOW },
  { id: 'rsn-dsc2',  storeId: S, text: 'Complaint compensation',   category: 'discount', active: true, createdAt: NOW },
];

export const SEED_OUTLET_SETTINGS: readonly OutletSettings[] = [{
  outletId: S,
  printBillHeader: 'SPICE ROUTE KITCHEN\nIndiranagar, Bengaluru\nGSTIN: 29AABCS1234E1Z5',
  printBillFooter: 'Thank you! Visit again.',
  printKotHeader:  '*** KOT ***',
  roundOff: 'nearest', roundOffTo: 1,
  billSeriesPrefix: 'BILL', kotSeriesPrefix: 'KOT',
  updatedAt: NOW,
}];

/* -------------------------------------------------------------------------- */
/* PHASE 2  Menu Management                                                   */
/* -------------------------------------------------------------------------- */

export const SEED_MENU_CATEGORIES: readonly MenuCategory[] = [
  { id: 'mc-starter', storeId: S, name: 'Starters',        sortOrder: 1, iconUrl: null, kotStationId: 'kot-tandoor', active: true,  createdAt: NOW },
  { id: 'mc-main',    storeId: S, name: 'Main Course',     sortOrder: 2, iconUrl: null, kotStationId: 'kot-main',    active: true,  createdAt: NOW },
  { id: 'mc-bir',     storeId: S, name: 'Biryani & Rice',  sortOrder: 3, iconUrl: null, kotStationId: 'kot-main',    active: true,  createdAt: NOW },
  { id: 'mc-bread',   storeId: S, name: 'Breads',          sortOrder: 4, iconUrl: null, kotStationId: 'kot-tandoor', active: true,  createdAt: NOW },
  { id: 'mc-bev',     storeId: S, name: 'Beverages',       sortOrder: 5, iconUrl: null, kotStationId: 'kot-bar',     active: true,  createdAt: NOW },
  { id: 'mc-dessert', storeId: S, name: 'Desserts',        sortOrder: 6, iconUrl: null, kotStationId: 'kot-main',    active: true,  createdAt: NOW },
];

export const SEED_MODIFIERS: readonly Modifier[] = [
  { id: 'mod-spice', storeId: S, name: 'Spice Level', type: 'single', required: true, active: true, createdAt: NOW,
    options: [
      { id: 'so-mild', name: 'Mild',      priceDelta: 0 },
      { id: 'so-med',  name: 'Medium',    priceDelta: 0 },
      { id: 'so-spcy', name: 'Spicy',     priceDelta: 0 },
      { id: 'so-xspy', name: 'Extra Spicy', priceDelta: 0 },
    ] },
  { id: 'mod-addon', storeId: S, name: 'Add-ons', type: 'multi', required: false, active: true, createdAt: NOW,
    options: [
      { id: 'ao-egg',    name: 'Extra Egg',      priceDelta: 30 },
      { id: 'ao-cheese', name: 'Extra Cheese',   priceDelta: 50 },
      { id: 'ao-rait',   name: 'Extra Raita',    priceDelta: 40 },
    ] },
  { id: 'mod-porti', storeId: S, name: 'Portion', type: 'single', required: true, active: true, createdAt: NOW,
    options: [
      { id: 'po-half', name: 'Half', priceDelta: -100 },
      { id: 'po-full', name: 'Full', priceDelta: 0 },
    ] },
];

export const SEED_COMBOS: readonly Combo[] = [
  { id: 'combo-1', storeId: S, name: 'Biryani + Drink + Dessert', bundlePrice: 549, itemIds: ['r07', 'r11', 'r10'], active: true, createdAt: NOW },
  { id: 'combo-2', storeId: S, name: 'Butter Chicken Meal',       bundlePrice: 649, itemIds: ['r05', 'r10', 'r12'], active: true, createdAt: NOW },
  { id: 'combo-3', storeId: S, name: 'Family Feast (4pax)',      bundlePrice: 1899, itemIds: ['r05', 'r06', 'r07', 'r08'], active: false, createdAt: NOW },
];

export const SEED_VARIANTS: readonly Variant[] = [
  { id: 'var-1', storeId: S, menuItemId: 'r09', label: 'Half',    priceOverride: 320, active: true, createdAt: NOW },
  { id: 'var-2', storeId: S, menuItemId: 'r09', label: 'Full',    priceOverride: 620, active: true, createdAt: NOW },
  { id: 'var-3', storeId: S, menuItemId: 'r07', label: 'Regular', priceOverride: 450, active: true, createdAt: NOW },
  { id: 'var-4', storeId: S, menuItemId: 'r07', label: 'Family',  priceOverride: 850, active: true, createdAt: NOW },
];

/* -------------------------------------------------------------------------- */
/* PHASE 3  Tables / KDS                                                      */
/* -------------------------------------------------------------------------- */

export const SEED_SECTIONS: readonly FloorSection[] = [
  { id: 'sec-ground', storeId: S, name: 'Ground Floor',   sortOrder: 1, active: true, createdAt: NOW },
  { id: 'sec-roof',   storeId: S, name: 'Rooftop',        sortOrder: 2, active: true, createdAt: NOW },
  { id: 'sec-bar',    storeId: S, name: 'Bar Counter',    sortOrder: 3, active: true, createdAt: NOW },
];

export const SEED_TABLES: readonly DiningTable[] = [
  ...[1, 2, 3, 4, 5, 6, 7, 8].map((n): DiningTable => ({
    id: `tbl-g-${n}`, storeId: S, sectionId: 'sec-ground',
    code: `T-0${n}`, seats: n <= 4 ? 4 : 6,
    status: n === 2 ? 'occupied' : n === 5 ? 'reserved' : 'free',
    currentSaleId: null, active: true, createdAt: NOW,
  })),
  ...[1, 2, 3, 4].map((n): DiningTable => ({
    id: `tbl-r-${n}`, storeId: S, sectionId: 'sec-roof',
    code: `R-0${n}`, seats: 4,
    status: n === 3 ? 'cleaning' : 'free',
    currentSaleId: null, active: true, createdAt: NOW,
  })),
  ...[1, 2, 3].map((n): DiningTable => ({
    id: `tbl-b-${n}`, storeId: S, sectionId: 'sec-bar',
    code: `B-0${n}`, seats: 2,
    status: 'free', currentSaleId: null, active: true, createdAt: NOW,
  })),
];

export const SEED_KOT_STATIONS: readonly KotStation[] = [
  { id: 'kot-tandoor', storeId: S, name: 'Tandoor',       printer: 'TANDOOR-192.168.1.10', active: true, createdAt: NOW },
  { id: 'kot-main',    storeId: S, name: 'Main Kitchen',  printer: 'MAIN-192.168.1.11',    active: true, createdAt: NOW },
  { id: 'kot-bar',     storeId: S, name: 'Bar',           printer: 'BAR-192.168.1.12',     active: true, createdAt: NOW },
];

/* -------------------------------------------------------------------------- */
/* PHASE 4  Online Aggregators                                                */
/* -------------------------------------------------------------------------- */

export const SEED_AGGREGATORS: readonly AggregatorConfig[] = [
  { id: 'agg-zom', storeId: S, provider: 'zomato',   enabled: true,  outletId: S, commissionPercent: 22, autoAccept: false, kotPrefix: 'Z', credentialsMasked: '***_z8k1', createdAt: NOW },
  { id: 'agg-swg', storeId: S, provider: 'swiggy',   enabled: true,  outletId: S, commissionPercent: 24, autoAccept: true,  kotPrefix: 'S', credentialsMasked: '***_sw22', createdAt: NOW },
  { id: 'agg-ube', storeId: S, provider: 'ubereats', enabled: false, outletId: S, commissionPercent: 30, autoAccept: false, kotPrefix: 'U', credentialsMasked: '',          createdAt: NOW },
  { id: 'agg-dnz', storeId: S, provider: 'dunzo',    enabled: false, outletId: S, commissionPercent: 15, autoAccept: false, kotPrefix: 'D', credentialsMasked: '',          createdAt: NOW },
  { id: 'agg-own', storeId: S, provider: 'own',      enabled: true,  outletId: S, commissionPercent: 0,  autoAccept: true,  kotPrefix: 'O', credentialsMasked: 'in-house',  createdAt: NOW },
];

export const SEED_DELIVERY_ZONES: readonly DeliveryZone[] = [
  { id: 'dz-inner', storeId: S, name: 'Inner Zone (0-3km)',    pincodes: ['560038', '560071', '560008'], minOrder: 199, deliveryFee: 0,  etaMinutes: 25, active: true, createdAt: NOW },
  { id: 'dz-mid',   storeId: S, name: 'Middle Zone (3-6km)',   pincodes: ['560034', '560102', '560095'], minOrder: 299, deliveryFee: 40, etaMinutes: 40, active: true, createdAt: NOW },
  { id: 'dz-out',   storeId: S, name: 'Outer Zone (6-10km)',   pincodes: ['560103', '560068', '560048'], minOrder: 499, deliveryFee: 79, etaMinutes: 55, active: true, createdAt: NOW },
];

/* -------------------------------------------------------------------------- */
/* PHASE 6  Inventory                                                         */
/* -------------------------------------------------------------------------- */

export const SEED_INGREDIENTS: readonly Ingredient[] = [
  { id: 'ing-rice',    storeId: S, name: 'Basmati Rice',     unit: 'kg',    currentStock: 45, reorderLevel: 10, costPerUnit: 120, active: true, createdAt: NOW },
  { id: 'ing-chick',   storeId: S, name: 'Chicken (boneless)', unit: 'kg',  currentStock: 18, reorderLevel: 8,  costPerUnit: 260, active: true, createdAt: NOW },
  { id: 'ing-mutton',  storeId: S, name: 'Mutton',           unit: 'kg',    currentStock: 6,  reorderLevel: 5,  costPerUnit: 720, active: true, createdAt: NOW },
  { id: 'ing-prawn',   storeId: S, name: 'Prawns',           unit: 'kg',    currentStock: 4,  reorderLevel: 3,  costPerUnit: 640, active: true, createdAt: NOW },
  { id: 'ing-fish',    storeId: S, name: 'Fish (rohu)',      unit: 'kg',    currentStock: 8,  reorderLevel: 5,  costPerUnit: 380, active: true, createdAt: NOW },
  { id: 'ing-oil',     storeId: S, name: 'Cooking Oil',      unit: 'l',     currentStock: 22, reorderLevel: 5,  costPerUnit: 140, active: true, createdAt: NOW },
  { id: 'ing-milk',    storeId: S, name: 'Milk',             unit: 'l',     currentStock: 12, reorderLevel: 8,  costPerUnit: 60,  active: true, createdAt: NOW },
  { id: 'ing-onion',   storeId: S, name: 'Onions',           unit: 'kg',    currentStock: 30, reorderLevel: 10, costPerUnit: 35,  active: true, createdAt: NOW },
  { id: 'ing-tomato',  storeId: S, name: 'Tomatoes',         unit: 'kg',    currentStock: 20, reorderLevel: 8,  costPerUnit: 45,  active: true, createdAt: NOW },
  { id: 'ing-flour',   storeId: S, name: 'Wheat Flour',      unit: 'kg',    currentStock: 40, reorderLevel: 10, costPerUnit: 50,  active: true, createdAt: NOW },
  { id: 'ing-butter',  storeId: S, name: 'Butter',           unit: 'kg',    currentStock: 5,  reorderLevel: 3,  costPerUnit: 480, active: true, createdAt: NOW },
  { id: 'ing-yog',     storeId: S, name: 'Yogurt',           unit: 'kg',    currentStock: 8,  reorderLevel: 4,  costPerUnit: 80,  active: true, createdAt: NOW },
  { id: 'ing-spice',   storeId: S, name: 'Garam Masala',     unit: 'g',     currentStock: 800, reorderLevel: 300, costPerUnit: 2, active: true, createdAt: NOW },
];

export const SEED_RECIPES: readonly Recipe[] = [
  { id: 'rec-butter', storeId: S, menuItemId: 'r05', yieldQty: 1, notes: 'Butter Chicken', createdAt: NOW,
    components: [
      { ingredientId: 'ing-chick',  quantity: 250, unit: 'g' as const },
      { ingredientId: 'ing-butter', quantity: 40,  unit: 'g' as const },
      { ingredientId: 'ing-tomato', quantity: 120, unit: 'g' as const },
      { ingredientId: 'ing-onion',  quantity: 60,  unit: 'g' as const },
    ] as never,
  },
  { id: 'rec-bir', storeId: S, menuItemId: 'r07', yieldQty: 1, notes: 'Chicken Biryani', createdAt: NOW,
    components: [
      { ingredientId: 'ing-rice',   quantity: 200, unit: 'g' as const },
      { ingredientId: 'ing-chick',  quantity: 220, unit: 'g' as const },
      { ingredientId: 'ing-onion',  quantity: 80,  unit: 'g' as const },
      { ingredientId: 'ing-spice',  quantity: 15,  unit: 'g' as const },
    ] as never,
  },
];

export const SEED_SUPPLIERS: readonly Supplier[] = [
  { id: 'sup-freshm', storeId: S, name: 'Fresh Meat Traders',    contact: '+91 98450 12345', email: 'sales@freshmeat.in',    gstin: '29AABCM1234E1ZZ', paymentTerms: 'Net 15', active: true, createdAt: NOW },
  { id: 'sup-vegwal', storeId: S, name: 'Veggie Wala',           contact: '+91 98450 23456', email: 'orders@veggiewala.in',  gstin: '29AABCV5678F1ZZ', paymentTerms: 'Net 7',  active: true, createdAt: NOW },
  { id: 'sup-riceco', storeId: S, name: 'Rice & Grains Co.',     contact: '+91 98450 34567', email: 'wholesale@ricegrains.in',gstin: '29AABCR8901G1ZZ', paymentTerms: 'Net 30', active: true, createdAt: NOW },
  { id: 'sup-dairy',  storeId: S, name: 'Nandini Dairy',         contact: '+91 98450 45678', email: 'b2b@nandini.coop',      gstin: '29AABCN1122H1ZZ', paymentTerms: 'Net 15', active: true, createdAt: NOW },
];

export const SEED_PURCHASE_ORDERS: readonly PurchaseOrder[] = [
  { id: 'po-1', storeId: S, poNumber: 'PO-0001', supplierId: 'sup-freshm', total: 15600, status: 'received',
    orderedAt: NOW, receivedAt: NOW, notes: 'Weekly meat order', createdAt: NOW,
    items: [
      { ingredientId: 'ing-chick', quantity: 30, unitCost: 260, lineTotal: 7800 },
      { ingredientId: 'ing-mutton', quantity: 8, unitCost: 720, lineTotal: 5760 },
      { ingredientId: 'ing-fish', quantity: 6,  unitCost: 380, lineTotal: 2040 },
    ] },
  { id: 'po-2', storeId: S, poNumber: 'PO-0002', supplierId: 'sup-riceco', total: 12000, status: 'sent',
    orderedAt: NOW, receivedAt: null, notes: 'Monthly rice restock', createdAt: NOW,
    items: [
      { ingredientId: 'ing-rice', quantity: 100, unitCost: 120, lineTotal: 12000 },
    ] },
  { id: 'po-3', storeId: S, poNumber: 'PO-0003', supplierId: 'sup-vegwal', total: 3200, status: 'draft',
    orderedAt: NOW, receivedAt: null, notes: '', createdAt: NOW,
    items: [
      { ingredientId: 'ing-onion',  quantity: 50, unitCost: 35, lineTotal: 1750 },
      { ingredientId: 'ing-tomato', quantity: 30, unitCost: 45, lineTotal: 1350 },
    ] },
];

export const SEED_WASTAGE: readonly WastageEntry[] = [
  { id: 'wa-1', storeId: S, ingredientId: 'ing-milk',  quantity: 2,   reasonId: 'rsn-was1', reportedBy: 'cashier1', reportedAt: NOW, costImpact: 120, createdAt: NOW },
  { id: 'wa-2', storeId: S, ingredientId: 'ing-tomato',quantity: 1.5, reasonId: 'rsn-was1', reportedBy: 'admin',    reportedAt: NOW, costImpact: 68,  createdAt: NOW },
  { id: 'wa-3', storeId: S, ingredientId: 'ing-chick', quantity: 0.3, reasonId: 'rsn-was2', reportedBy: 'cashier1', reportedAt: NOW, costImpact: 78,  createdAt: NOW },
];

/* -------------------------------------------------------------------------- */
/* PHASE 7  CRM / Loyalty                                                     */
/* -------------------------------------------------------------------------- */

export const SEED_CUSTOMER_GROUPS: readonly CustomerGroup[] = [
  { id: 'cg-reg',  storeId: S, name: 'Regular',    discountPercent: 0,  customerCount: 145, active: true, createdAt: NOW },
  { id: 'cg-vip',  storeId: S, name: 'VIP',        discountPercent: 10, customerCount: 12,  active: true, createdAt: NOW },
  { id: 'cg-corp', storeId: S, name: 'Corporate',  discountPercent: 15, customerCount: 8,   active: true, createdAt: NOW },
];

export const SEED_LOYALTY_TIERS: readonly LoyaltyTier[] = [
  { id: 'ly-silv', storeId: S, name: 'Silver',   minSpend: 0,     earnRatePercent: 1, perks: 'Points on every order',            active: true, createdAt: NOW },
  { id: 'ly-gold', storeId: S, name: 'Gold',     minSpend: 10000, earnRatePercent: 2, perks: 'Priority seating + birthday gift', active: true, createdAt: NOW },
  { id: 'ly-plat', storeId: S, name: 'Platinum', minSpend: 50000, earnRatePercent: 3, perks: 'Chef-selected freebies + VIP room', active: true, createdAt: NOW },
];

export const SEED_COUPONS: readonly Coupon[] = [
  { id: 'cp-wel',   storeId: S, code: 'WELCOME10',  type: 'percent', value: 10, minOrder: 300,  maxRedeem: 100, usedCount: 42, validFrom: NOW, validTo: NOW, active: true,  createdAt: NOW },
  { id: 'cp-lunch', storeId: S, code: 'LUNCH20',    type: 'percent', value: 20, minOrder: 500,  maxRedeem: 200, usedCount: 88, validFrom: NOW, validTo: NOW, active: true,  createdAt: NOW },
  { id: 'cp-flat',  storeId: S, code: 'FLAT100',    type: 'flat',    value: 100, minOrder: 800, maxRedeem: 50,  usedCount: 12, validFrom: NOW, validTo: NOW, active: true,  createdAt: NOW },
  { id: 'cp-exp',   storeId: S, code: 'DIWALI25',   type: 'percent', value: 25, minOrder: 1000, maxRedeem: 100, usedCount: 100,validFrom: NOW, validTo: NOW, active: false, createdAt: NOW },
];

export const SEED_FEEDBACK: readonly FeedbackEntry[] = [
  { id: 'fb-1', storeId: S, customerId: null, customerName: 'Anonymous',       rating: 5, comment: 'Butter chicken was divine!',            saleId: null, at: NOW, resolved: true,  createdAt: NOW },
  { id: 'fb-2', storeId: S, customerId: null, customerName: 'Rakesh V.',       rating: 4, comment: 'Good food, slow service.',              saleId: null, at: NOW, resolved: true,  createdAt: NOW },
  { id: 'fb-3', storeId: S, customerId: null, customerName: 'Priya S.',        rating: 2, comment: 'Biryani was cold.',                     saleId: null, at: NOW, resolved: false, createdAt: NOW },
  { id: 'fb-4', storeId: S, customerId: null, customerName: 'Corporate order', rating: 5, comment: 'Bulk order arrived fresh, thank you!',  saleId: null, at: NOW, resolved: true,  createdAt: NOW },
  { id: 'fb-5', storeId: S, customerId: null, customerName: 'Ahmed K.',        rating: 3, comment: 'Portions could be bigger.',             saleId: null, at: NOW, resolved: false, createdAt: NOW },
];
