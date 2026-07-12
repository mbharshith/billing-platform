// Restaurant / TMBill domain types - Phase 1-7 entities.
// Every entity carries id + storeId + createdAt + active for consistency.
//
// Grouped by TMBill sidebar section so future changes stay in one place.
//   Section 1: POS Config    - markets, brands, outlets, tenders, order types,
//                              tax slabs, discounts, charges, reasons, print settings
//   Section 2: Menu Mgmt     - menu categories, items, modifiers, combos, variants
//   Section 3: Tables / KDS  - floor plans, tables, sections, KOT stations
//   Section 4: Online Orders - aggregator config, live orders, delivery rules
//   Section 5: Reports       - saved report definitions (light metadata)
//   Section 6: Inventory     - ingredients, recipes, stock, suppliers, POs, GRNs, wastage
//   Section 7: CRM / Loyalty - customer groups, loyalty tiers, coupons, feedback

import type { Iso8601 } from './types';

/* -------------------------------------------------------------------------- */
/* PHASE 1  POS Config                                                        */
/* -------------------------------------------------------------------------- */

/** Geographic market a brand operates in (e.g. India-South, UAE). */
export interface Market {
  readonly id: string;
  readonly name: string;
  readonly code: string;            // e.g. IN-S, UAE-1
  readonly country: string;
  readonly currency: string;        // ISO 4217
  readonly active: boolean;
  readonly createdAt: Iso8601;
}

/** Restaurant brand - one legal entity, many outlets. */
export interface Brand {
  readonly id: string;
  readonly name: string;
  readonly marketId: string;
  readonly logoUrl: string | null;
  readonly cuisineType: string;     // "Indian", "Chinese", "Fusion"
  readonly active: boolean;
  readonly createdAt: Iso8601;
}

/** Physical outlet (renamed from "Store" for restaurant vertical). */
export interface Outlet {
  readonly id: string;              // aliased to legacy Store.id for compat
  readonly name: string;
  readonly brandId: string;
  readonly marketId: string;
  readonly city: string;
  readonly phone: string;
  readonly address: string;
  readonly taxRate: number;
  readonly currency: string;
  readonly seatCapacity: number;
  readonly active: boolean;
  readonly status: 'active' | 'suspended';
  readonly createdAt: Iso8601;
}

/** Payment mode (Cash, Card, UPI, Zomato Wallet, Comp/On-house...). */
export interface PaymentMode {
  readonly id: string;
  readonly storeId: string;
  readonly name: string;
  readonly code: string;
  readonly category: 'cash' | 'card' | 'upi' | 'wallet' | 'aggregator' | 'comp' | 'other';
  readonly requiresReference: boolean;   // e.g. UPI txn id
  readonly active: boolean;
  readonly createdAt: Iso8601;
}

/** Order type: Dine-in, Takeaway, Delivery, Zomato, Swiggy... */
export interface OrderType {
  readonly id: string;
  readonly storeId: string;
  readonly name: string;
  readonly code: string;
  readonly icon: string;            // icon name from Icon atom
  readonly kotPrefix: string;       // 'D' for Dine-in, 'T' for Takeaway
  readonly chargeExtra: boolean;    // e.g. delivery fee
  readonly extraChargePercent: number;
  readonly active: boolean;
  readonly createdAt: Iso8601;
}

/** Tax slab (GST 5%, 12%, 18%; VAT 5%; Service tax). */
export interface TaxSlab {
  readonly id: string;
  readonly storeId: string;
  readonly name: string;            // "GST 5%"
  readonly percent: number;         // 5, 12, 18
  readonly inclusive: boolean;      // whether printed price already includes it
  readonly appliesTo: 'food' | 'beverage' | 'liquor' | 'all';
  readonly active: boolean;
  readonly createdAt: Iso8601;
}

/** Discount (%, flat, BOGO). */
export interface Discount {
  readonly id: string;
  readonly storeId: string;
  readonly name: string;
  readonly type: 'percent' | 'flat' | 'bogo';
  readonly value: number;
  readonly maxAmount: number | null;
  readonly requiresManagerApproval: boolean;
  readonly active: boolean;
  readonly createdAt: Iso8601;
}

/** Additional charge (Service charge, Delivery fee, Container). */
export interface AdditionalCharge {
  readonly id: string;
  readonly storeId: string;
  readonly name: string;
  readonly type: 'percent' | 'flat';
  readonly value: number;
  readonly appliesToOrderTypeCodes: readonly string[]; // empty = all
  readonly taxable: boolean;
  readonly active: boolean;
  readonly createdAt: Iso8601;
}

/** Reason master (Void, Cancel, Refund, Wastage, Manager Override). */
export interface Reason {
  readonly id: string;
  readonly storeId: string;
  readonly text: string;
  readonly category: 'void' | 'cancel' | 'refund' | 'wastage' | 'discount';
  readonly active: boolean;
  readonly createdAt: Iso8601;
}

/** Global print / terminal / round-off settings (single row per outlet). */
export interface OutletSettings {
  readonly outletId: string;
  readonly printBillHeader: string;
  readonly printBillFooter: string;
  readonly printKotHeader: string;
  readonly roundOff: 'none' | 'nearest' | 'up' | 'down';
  readonly roundOffTo: number;      // 0.5, 1, 5
  readonly billSeriesPrefix: string;
  readonly kotSeriesPrefix: string;
  readonly updatedAt: Iso8601;
}

/* -------------------------------------------------------------------------- */
/* PHASE 2  Menu Management                                                   */
/* -------------------------------------------------------------------------- */

export interface MenuCategory {
  readonly id: string;
  readonly storeId: string;
  readonly name: string;
  readonly sortOrder: number;
  readonly iconUrl: string | null;
  readonly kotStationId: string | null;  // which kitchen prints it
  readonly active: boolean;
  readonly createdAt: Iso8601;
}

/** Add-on / modifier (Extra cheese, Spice level, Sauce choice). */
export interface Modifier {
  readonly id: string;
  readonly storeId: string;
  readonly name: string;
  readonly type: 'single' | 'multi';  // radio vs checkbox
  readonly required: boolean;
  readonly options: readonly ModifierOption[];
  readonly active: boolean;
  readonly createdAt: Iso8601;
}
export interface ModifierOption {
  readonly id: string;
  readonly name: string;
  readonly priceDelta: number;
}

/** Combo meal - N items bundled at a fixed price. */
export interface Combo {
  readonly id: string;
  readonly storeId: string;
  readonly name: string;
  readonly bundlePrice: number;
  readonly itemIds: readonly string[];
  readonly active: boolean;
  readonly createdAt: Iso8601;
}

/** Variant of a menu item (Half / Full / Quarter). */
export interface Variant {
  readonly id: string;
  readonly storeId: string;
  readonly menuItemId: string;
  readonly label: string;             // "Half"
  readonly priceOverride: number;
  readonly active: boolean;
  readonly createdAt: Iso8601;
}

/* -------------------------------------------------------------------------- */
/* PHASE 3  Tables / KDS                                                      */
/* -------------------------------------------------------------------------- */

export interface FloorSection {
  readonly id: string;
  readonly storeId: string;
  readonly name: string;              // "Ground Floor", "Rooftop", "Bar"
  readonly sortOrder: number;
  readonly active: boolean;
  readonly createdAt: Iso8601;
}

export interface DiningTable {
  readonly id: string;
  readonly storeId: string;
  readonly sectionId: string;
  readonly code: string;              // "T-01"
  readonly seats: number;
  readonly status: 'free' | 'occupied' | 'reserved' | 'cleaning';
  readonly currentSaleId: string | null;
  readonly active: boolean;
  readonly createdAt: Iso8601;
}

export interface KotStation {
  readonly id: string;
  readonly storeId: string;
  readonly name: string;              // "Tandoor", "Bar", "Chinese Wok"
  readonly printer: string;           // printer name / IP
  readonly active: boolean;
  readonly createdAt: Iso8601;
}

/* -------------------------------------------------------------------------- */
/* PHASE 4  Online / Aggregators                                              */
/* -------------------------------------------------------------------------- */

export interface AggregatorConfig {
  readonly id: string;
  readonly storeId: string;
  readonly provider: 'zomato' | 'swiggy' | 'ubereats' | 'dunzo' | 'own';
  readonly enabled: boolean;
  readonly outletId: string;
  readonly commissionPercent: number;
  readonly autoAccept: boolean;
  readonly kotPrefix: string;
  readonly credentialsMasked: string;   // "***xyz1"
  readonly createdAt: Iso8601;
}

export interface DeliveryZone {
  readonly id: string;
  readonly storeId: string;
  readonly name: string;
  readonly pincodes: readonly string[];
  readonly minOrder: number;
  readonly deliveryFee: number;
  readonly etaMinutes: number;
  readonly active: boolean;
  readonly createdAt: Iso8601;
}

/* -------------------------------------------------------------------------- */
/* PHASE 6  Inventory                                                         */
/* -------------------------------------------------------------------------- */

export interface Ingredient {
  readonly id: string;
  readonly storeId: string;
  readonly name: string;              // "Basmati Rice"
  readonly unit: 'g' | 'kg' | 'ml' | 'l' | 'unit' | 'dozen';
  readonly currentStock: number;
  readonly reorderLevel: number;
  readonly costPerUnit: number;
  readonly active: boolean;
  readonly createdAt: Iso8601;
}

export interface Recipe {
  readonly id: string;
  readonly storeId: string;
  readonly menuItemId: string;
  readonly components: readonly RecipeComponent[];
  readonly yieldQty: number;
  readonly notes: string;
  readonly createdAt: Iso8601;
}
export interface RecipeComponent {
  readonly ingredientId: string;
  readonly quantity: number;
  readonly unit: Ingredient['unit'];
}

export interface Supplier {
  readonly id: string;
  readonly storeId: string;
  readonly name: string;
  readonly contact: string;
  readonly email: string;
  readonly gstin: string;
  readonly paymentTerms: string;       // "Net 30"
  readonly active: boolean;
  readonly createdAt: Iso8601;
}

export interface PurchaseOrder {
  readonly id: string;
  readonly storeId: string;
  readonly poNumber: string;
  readonly supplierId: string;
  readonly items: readonly PurchaseOrderItem[];
  readonly total: number;
  readonly status: 'draft' | 'sent' | 'received' | 'cancelled';
  readonly orderedAt: Iso8601;
  readonly receivedAt: Iso8601 | null;
  readonly notes: string;
  readonly createdAt: Iso8601;
}
export interface PurchaseOrderItem {
  readonly ingredientId: string;
  readonly quantity: number;
  readonly unitCost: number;
  readonly lineTotal: number;
}

export interface WastageEntry {
  readonly id: string;
  readonly storeId: string;
  readonly ingredientId: string;
  readonly quantity: number;
  readonly reasonId: string;
  readonly reportedBy: string;
  readonly reportedAt: Iso8601;
  readonly costImpact: number;
  readonly createdAt: Iso8601;
}

/* -------------------------------------------------------------------------- */
/* PHASE 7  CRM / Loyalty                                                     */
/* -------------------------------------------------------------------------- */

export interface CustomerGroup {
  readonly id: string;
  readonly storeId: string;
  readonly name: string;              // "VIP", "Corporate", "Regular"
  readonly discountPercent: number;
  readonly customerCount: number;
  readonly active: boolean;
  readonly createdAt: Iso8601;
}

export interface LoyaltyTier {
  readonly id: string;
  readonly storeId: string;
  readonly name: string;              // "Silver", "Gold", "Platinum"
  readonly minSpend: number;
  readonly earnRatePercent: number;   // 1% back = 1
  readonly perks: string;
  readonly active: boolean;
  readonly createdAt: Iso8601;
}

export interface Coupon {
  readonly id: string;
  readonly storeId: string;
  readonly code: string;              // "WELCOME10"
  readonly type: 'percent' | 'flat';
  readonly value: number;
  readonly minOrder: number;
  readonly maxRedeem: number;
  readonly usedCount: number;
  readonly validFrom: Iso8601;
  readonly validTo: Iso8601;
  readonly active: boolean;
  readonly createdAt: Iso8601;
}

export interface FeedbackEntry {
  readonly id: string;
  readonly storeId: string;
  readonly customerId: string | null;
  readonly customerName: string;
  readonly rating: 1 | 2 | 3 | 4 | 5;
  readonly comment: string;
  readonly saleId: string | null;
  readonly at: Iso8601;
  readonly resolved: boolean;
  readonly createdAt: Iso8601;
}
