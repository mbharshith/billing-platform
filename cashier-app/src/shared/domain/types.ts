// Domain types - shared vocabulary. Every entity carries id+createdAt; add tenantId once backend arrives.

/* -------------------------------------------------------------------------- */
/* Shared primitives                                                          */
/* -------------------------------------------------------------------------- */
export type Iso8601 = string;
export type PaymentMethod = 'cash' | 'card' | 'lending';

/* -------------------------------------------------------------------------- */
/* Stores (multi-tenant)                                                      */
/* -------------------------------------------------------------------------- */
export interface Store {
  readonly id: string;
  readonly name: string;
  readonly city: string;
  readonly phone: string;
  readonly address: string;
  // Sales tax rate as a decimal (e.g. 0.0825 = 8.25%).
  readonly taxRate: number;
  // ISO 4217 currency code.
  readonly currency: string;
  readonly active: boolean;
  // Vendor-controlled lifecycle: 'suspended' stores can't log in. Defaults to 'active'.
  readonly status: 'active' | 'suspended';
  readonly createdAt: Iso8601;
}

// All non-store entities carry a storeId (required, never null).
//  Users too — every user belongs to exactly one store.
export type StoreScope = string;

// Discriminated status union for async state — enforces "handle all 4 states".
// (§2 RULE — never render on data alone; render on state.)
export type AsyncStatus<T, E = string> =
  | { readonly kind: 'idle' }
  | { readonly kind: 'loading' }
  | { readonly kind: 'success'; readonly data: T }
  | { readonly kind: 'error';   readonly error: E };

/* -------------------------------------------------------------------------- */
/* Products                                                                   */
/* -------------------------------------------------------------------------- */
export type ProductCategory =
  | 'Grocery' | 'Produce' | 'Beverages' | 'Snacks'
  | 'Household' | 'Personal' | 'Meat' | 'Frozen' | 'Electronics' | 'Other';

// Tone controls the pastel colour tile behind each product monogram.
export type BadgeTone =
  | 'sky' | 'amber' | 'yellow' | 'red' | 'stone'
  | 'orange' | 'brown' | 'rose' | 'slate';

export interface Product {
  readonly id: string;
  readonly sku: string;
  readonly name: string;
  readonly price: number;
  readonly category: ProductCategory;
  readonly tone: BadgeTone;
  // Total stock available (unit count).
  readonly stock: number;
  readonly active: boolean;
  readonly createdAt: Iso8601;
  // Store that owns this product.
  readonly storeId: string;
}

/* -------------------------------------------------------------------------- */
/* Sales                                                                      */
/* -------------------------------------------------------------------------- */
export interface SaleLine {
  readonly productId: string;
  readonly sku: string;
  readonly name: string;
  readonly tone: BadgeTone;
  readonly unitPrice: number;
  readonly quantity: number;
  readonly lineTotal: number;
}

export interface Sale {
  readonly id: string;
  readonly invoiceNo: string;
  readonly completedAt: Iso8601;
  readonly lines: readonly SaleLine[];
  readonly subtotal: number;
  readonly tax: number;
  readonly total: number;
  readonly unitCount: number;
  readonly paymentMethod: PaymentMethod;
  // Set when payment method === 'lending'.
  readonly customerMobile: string | null;
  // FK to customer entity — set for lending sales.
  readonly customerId: string | null;
  // Who rang up the sale.
  readonly cashierId: string;
  readonly cashierName: string;
  // Voided sales stay in history for audit.
  readonly voided: boolean;
  readonly voidedAt: Iso8601 | null;
  readonly voidedReason: string | null;
  // Store where the sale happened.
  readonly storeId: string;
}

/* -------------------------------------------------------------------------- */
/* Customers                                                                  */
/* -------------------------------------------------------------------------- */
export interface Customer {
  readonly id: string;
  readonly name: string;
  // 10-digit mobile (digits only). Unique per tenant.
  readonly mobile: string;
  readonly email: string | null;
  readonly notes: string | null;
  // Outstanding lending balance in currency units.
  readonly lendingBalance: number;
  readonly createdAt: Iso8601;
  // Store that owns this customer record.
  readonly storeId: string;
}

export interface CustomerPayment {
  readonly id: string;
  readonly customerId: string;
  readonly amount: number;
  readonly method: 'cash' | 'card';
  readonly receivedAt: Iso8601;
  readonly receivedBy: string;
  readonly notes: string | null;
}

/* -------------------------------------------------------------------------- */
// Users (staff). Role capabilities live in permissions.ts, not here.
export type UserRole = 'vendor' | 'admin' | 'cashier';

// Sentinel storeId for vendor accounts — they don't belong to any tenant.
export const VENDOR_SCOPE = '__vendor__';

export interface User {
  readonly id: string;
  readonly username: string;
  readonly name: string;
  readonly role: UserRole;
  readonly active: boolean;
  readonly createdAt: Iso8601;
  // Every user belongs to exactly one store.
  readonly storeId: string;
  // Password lives here only because this is a mock/frontend-only build.
  //  When a backend arrives this MUST be moved server-side + hashed (§6).
  readonly password: string;
}

// Subset of User safe to keep in the browser session.
export type SessionUser = Omit<User, 'password'>;

/* -------------------------------------------------------------------------- */
/* Settings                                                                   */
/* -------------------------------------------------------------------------- */
export interface StoreSettings {
  readonly storeName: string;
  readonly address: string;
  readonly phone: string;
  readonly gstin: string;
  readonly taxRate: number;
  // ISO 4217 currency code, e.g. USD, INR.
  readonly currency: string;
  readonly receiptFooter: string;
}

/* -------------------------------------------------------------------------- */
/* Vendor audit log                                                           */
/* -------------------------------------------------------------------------- */
// Immutable record of a vendor action across the tenant fleet.
//  Written server-side in production; here we append to a Dexie table.
export type VendorAction =
  | 'tenant.create'
  | 'tenant.edit'
  | 'tenant.suspend'
  | 'tenant.reactivate'
  | 'tenant.impersonate'
  | 'tenant.delete'
  | 'vendor.login'
  | 'vendor.logout';

export interface AuditEntry {
  readonly id: string;
  readonly at: Iso8601;
  readonly actorUsername: string;
  readonly action: VendorAction;
  // storeId the action targeted (may be VENDOR_SCOPE for self-actions).
  readonly targetStoreId: string;
  readonly detail?: string;
}
