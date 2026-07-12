// Phase 8+ domain types - Inventory depth, Accounting, Marketing, Logs.
//
// Extends packages/@billing/shared/src/domain/restaurant.ts with the entities
// TMBill exposes that we hadn't scaffolded yet:
//
//   INV     Warehouse, RawMaterialCategory, UoM, StockAdjustment, GRN,
//           StockTransfer, IndentRequest, ProductionBatch
//   ACCT    Account, ExpenseCategory, Expense, VendorBill, JournalEntry
//   MKT     WhatsAppTemplate, MarketingCampaign, CustomerSegment
//
// Same rules as restaurant.ts:
//   - Every entity has id + storeId? + active? + createdAt
//   - Immutable readonly fields
//   - No behavioural methods (pure data)

import type { Iso8601 } from './types';

/* ========================================================================== */
/* INVENTORY DEPTH                                                            */
/* ========================================================================== */

/** Physical location where inventory can live (outlet kitchen, central warehouse). */
export interface Warehouse {
  readonly id: string;
  readonly storeId: string;
  readonly name: string;              // "Central Warehouse - Bengaluru"
  readonly type: 'outlet' | 'central' | 'transit';
  readonly address: string;
  readonly managerName: string;
  readonly active: boolean;
  readonly createdAt: Iso8601;
}

export interface RawMaterialCategory {
  readonly id: string;
  readonly storeId: string;
  readonly name: string;              // "Meat & Poultry", "Grains", "Dairy"
  readonly sortOrder: number;
  readonly active: boolean;
  readonly createdAt: Iso8601;
}

/** Unit of Measure with conversion factor to a canonical base. */
export interface UnitOfMeasure {
  readonly id: string;
  readonly storeId: string;
  readonly code: string;              // "KG", "G", "L", "ML"
  readonly name: string;              // "Kilogram"
  readonly baseUnit: string;          // "G" or "ML" or "UNIT"
  readonly factor: number;            // 1 KG = 1000 G -> factor 1000
  readonly active: boolean;
  readonly createdAt: Iso8601;
}

/** Manual stock add/deduct entry - opening balance, correction, spoilage. */
export interface StockAdjustment {
  readonly id: string;
  readonly storeId: string;
  readonly warehouseId: string;
  readonly ingredientId: string;
  readonly delta: number;             // positive = added, negative = removed
  readonly reason: 'opening' | 'recount' | 'spoilage' | 'theft' | 'correction';
  readonly notes: string;
  readonly performedBy: string;
  readonly performedAt: Iso8601;
  readonly createdAt: Iso8601;
}

/** Goods Receipt Note - matches a PO on arrival, tracks partial fulfilment. */
export interface GRN {
  readonly id: string;
  readonly storeId: string;
  readonly grnNumber: string;         // "GRN-0001"
  readonly poId: string | null;       // may be null for direct receipts
  readonly supplierId: string;
  readonly warehouseId: string;
  readonly lines: readonly GRNLine[];
  readonly totalValue: number;
  readonly status: 'draft' | 'received' | 'discrepancy';
  readonly receivedBy: string;
  readonly receivedAt: Iso8601;
  readonly invoiceNumber: string;
  readonly notes: string;
  readonly createdAt: Iso8601;
}
export interface GRNLine {
  readonly ingredientId: string;
  readonly orderedQty: number;
  readonly receivedQty: number;
  readonly unitCost: number;
  readonly lineTotal: number;
}

/** Inter-warehouse or inter-outlet transfer. */
export interface StockTransfer {
  readonly id: string;
  readonly storeId: string;
  readonly transferNumber: string;    // "TRF-0001"
  readonly fromWarehouseId: string;
  readonly toWarehouseId: string;
  readonly lines: readonly StockTransferLine[];
  readonly status: 'draft' | 'in-transit' | 'received' | 'cancelled';
  readonly requestedBy: string;
  readonly requestedAt: Iso8601;
  readonly dispatchedAt: Iso8601 | null;
  readonly receivedAt: Iso8601 | null;
  readonly notes: string;
  readonly createdAt: Iso8601;
}
export interface StockTransferLine {
  readonly ingredientId: string;
  readonly quantity: number;
  readonly unit: string;
}

/** Outlet -> HQ ingredient request (indent). */
export interface IndentRequest {
  readonly id: string;
  readonly storeId: string;
  readonly indentNumber: string;      // "IND-0001"
  readonly requestingOutletId: string;
  readonly requestedBy: string;
  readonly requestedAt: Iso8601;
  readonly requiredBy: Iso8601;
  readonly lines: readonly IndentLine[];
  readonly status: 'pending' | 'approved' | 'partial' | 'fulfilled' | 'rejected';
  readonly approvedBy: string | null;
  readonly notes: string;
  readonly createdAt: Iso8601;
}
export interface IndentLine {
  readonly ingredientId: string;
  readonly requestedQty: number;
  readonly approvedQty: number;
  readonly unit: string;
}

/** Semi-finished / production batch (e.g. daily marinade prep). */
export interface ProductionBatch {
  readonly id: string;
  readonly storeId: string;
  readonly batchNumber: string;       // "BATCH-0001"
  readonly recipeId: string;
  readonly yieldQty: number;
  readonly consumedIngredients: readonly ProductionConsumption[];
  readonly producedBy: string;
  readonly producedAt: Iso8601;
  readonly expiresAt: Iso8601 | null;
  readonly status: 'in-progress' | 'complete' | 'expired' | 'used';
  readonly createdAt: Iso8601;
}
export interface ProductionConsumption {
  readonly ingredientId: string;
  readonly quantity: number;
  readonly unit: string;
}

/* ========================================================================== */
/* ACCOUNTING                                                                 */
/* ========================================================================== */

/** Ledger account (Chart of Accounts entry). */
export interface Account {
  readonly id: string;
  readonly storeId: string;
  readonly code: string;              // "1000", "2000"
  readonly name: string;              // "Cash", "Sales Revenue"
  readonly type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  readonly parentId: string | null;
  readonly openingBalance: number;
  readonly currentBalance: number;
  readonly active: boolean;
  readonly createdAt: Iso8601;
}

export interface ExpenseCategory {
  readonly id: string;
  readonly storeId: string;
  readonly name: string;              // "Rent", "Salaries", "Marketing"
  readonly accountId: string;         // links to Chart of Accounts
  readonly active: boolean;
  readonly createdAt: Iso8601;
}

export interface Expense {
  readonly id: string;
  readonly storeId: string;
  readonly voucherNumber: string;     // "EXP-0001"
  readonly categoryId: string;
  readonly amount: number;
  readonly paidTo: string;            // Vendor / Employee name
  readonly paidBy: 'cash' | 'bank' | 'card';
  readonly incurredAt: Iso8601;
  readonly billImageUrl: string | null;
  readonly notes: string;
  readonly createdAt: Iso8601;
}

export interface VendorBill {
  readonly id: string;
  readonly storeId: string;
  readonly billNumber: string;        // vendor's own invoice number
  readonly supplierId: string;
  readonly grnId: string | null;
  readonly totalAmount: number;
  readonly paidAmount: number;
  readonly dueDate: Iso8601;
  readonly status: 'unpaid' | 'partial' | 'paid' | 'overdue';
  readonly notes: string;
  readonly createdAt: Iso8601;
}

/* ========================================================================== */
/* MARKETING (WhatsApp / SMS / Segments / Campaigns)                          */
/* ========================================================================== */

export interface WhatsAppTemplate {
  readonly id: string;
  readonly storeId: string;
  readonly name: string;              // "Welcome offer", "Bill sent"
  readonly category: 'transactional' | 'promotional' | 'utility';
  readonly language: string;          // "en", "hi"
  readonly body: string;              // may include {{name}}, {{amount}} placeholders
  readonly variables: readonly string[];
  readonly approved: boolean;         // Meta-side approval
  readonly active: boolean;
  readonly createdAt: Iso8601;
}

export interface CustomerSegment {
  readonly id: string;
  readonly storeId: string;
  readonly name: string;              // "VIP - 5+ orders", "Dormant 90 days"
  readonly rule: string;              // simple DSL / description
  readonly memberCount: number;
  readonly refreshedAt: Iso8601;
  readonly active: boolean;
  readonly createdAt: Iso8601;
}

export interface MarketingCampaign {
  readonly id: string;
  readonly storeId: string;
  readonly name: string;
  readonly channel: 'whatsapp' | 'sms' | 'email';
  readonly templateId: string | null;
  readonly segmentId: string | null;
  readonly scheduledAt: Iso8601;
  readonly sentCount: number;
  readonly deliveredCount: number;
  readonly readCount: number;
  readonly conversionCount: number;
  readonly status: 'draft' | 'scheduled' | 'sending' | 'complete' | 'failed';
  readonly createdAt: Iso8601;
}
