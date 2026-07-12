// FIXTURE - demo online orders. Scrap when the real backend is live.
// Seeds a mix of statuses per tenant so the Orders Kanban demo lands populated.
import type { Product, Sale, OrderStatus, DeliveryAddress, PaymentMethod } from '@billing/shared/domain/types';
import { SYSTEM_ACTOR_ID, SYSTEM_ACTOR_NAME } from '@billing/shared/domain/types';
import { nextInvoiceNo } from '@billing/shared/domain/format';
import {
  SEED_STORE_MAIN_ID, SEED_STORE_BRANCH_ID, SEED_STORE_THIRD_ID,
} from './stores';

export interface OrderSeedContext {
  readonly products: readonly Product[];
  readonly taxRateByStore: Record<string, number>;
  readonly customerIdByMobile: Map<string, string>;
}

interface SeedRow {
  readonly storeId: string;
  readonly hoursAgo: number;
  readonly status: OrderStatus;
  readonly customerName: string;
  readonly customerMobile: string;
  readonly address: DeliveryAddress;
  readonly notes: string | null;
  readonly method: PaymentMethod;
  readonly pick: readonly { readonly categoryHint: string; readonly qty: number }[];
}

const ADDR = {
  mumbai: (line1: string, land = ''): DeliveryAddress => ({
    line1, line2: 'Andheri West', city: 'Mumbai', pincode: '400058', landmark: land,
  }),
  bengaluru: (line1: string, land = ''): DeliveryAddress => ({
    line1, line2: 'HSR Layout Sector 2', city: 'Bengaluru', pincode: '560102', landmark: land,
  }),
  springfield: (line1: string, land = ''): DeliveryAddress => ({
    line1, line2: 'Apt 4B', city: 'Springfield', pincode: '65807', landmark: land,
  }),
};

const ROWS: readonly SeedRow[] = [
  // ---- Velvet Mumbai ----
  {
    storeId: SEED_STORE_MAIN_ID, hoursAgo: 0.5, status: 'placed',
    customerName: 'Zara Khan', customerMobile: '9876500001',
    address: ADDR.mumbai('12 Palm Beach Rd', 'Opposite HDFC ATM'),
    notes: 'Please leave at doorstep', method: 'cod',
    pick: [{ categoryHint: 'apparel', qty: 1 }, { categoryHint: 'apparel', qty: 2 }],
  },
  {
    storeId: SEED_STORE_MAIN_ID, hoursAgo: 2, status: 'confirmed',
    customerName: 'Ravi Kumar', customerMobile: '9876543210',
    address: ADDR.mumbai('5 Marina Heights', ''),
    notes: null, method: 'online',
    pick: [{ categoryHint: 'apparel', qty: 1 }],
  },
  {
    storeId: SEED_STORE_MAIN_ID, hoursAgo: 4, status: 'packing',
    customerName: 'Priya Sharma', customerMobile: '9123456780',
    address: ADDR.mumbai('88 Sea View', 'Next to Cafe Coffee Day'),
    notes: 'Call before delivery', method: 'online',
    pick: [{ categoryHint: 'apparel', qty: 3 }],
  },
  {
    storeId: SEED_STORE_MAIN_ID, hoursAgo: 6, status: 'out_for_delivery',
    customerName: 'Neha Patel', customerMobile: '9876500002',
    address: ADDR.mumbai('7 Bandra East'),
    notes: null, method: 'cod',
    pick: [{ categoryHint: 'apparel', qty: 2 }],
  },

  // ---- Spice Route Kitchen ----
  {
    storeId: SEED_STORE_BRANCH_ID, hoursAgo: 1, status: 'placed',
    customerName: 'Karthik Menon', customerMobile: '9012345678',
    address: ADDR.bengaluru('221B Baker St', 'Near Sony World'),
    notes: null, method: 'online',
    pick: [{ categoryHint: 'food', qty: 2 }],
  },
  {
    storeId: SEED_STORE_BRANCH_ID, hoursAgo: 3, status: 'confirmed',
    customerName: 'Deepak Rao', customerMobile: '9012345612',
    address: ADDR.bengaluru('15 Indiranagar Main Rd'),
    notes: 'Ring the bell twice', method: 'cod',
    pick: [{ categoryHint: 'food', qty: 3 }],
  },
  {
    storeId: SEED_STORE_BRANCH_ID, hoursAgo: 5, status: 'out_for_delivery',
    customerName: 'Sneha Iyer', customerMobile: '9834567890',
    address: ADDR.bengaluru('9 Whitefield Rd'),
    notes: null, method: 'online',
    pick: [{ categoryHint: 'food', qty: 2 }],
  },
  // ---- La Maison Boutique ----
  {
    storeId: SEED_STORE_THIRD_ID, hoursAgo: 0.8, status: 'placed',
    customerName: 'Emily Carter', customerMobile: '2125550101',
    address: ADDR.springfield('157 Spring St'),
    notes: 'Leave with concierge', method: 'cod',
    pick: [{ categoryHint: 'apparel', qty: 2 }],
  },
  {
    storeId: SEED_STORE_THIRD_ID, hoursAgo: 2.5, status: 'packing',
    customerName: 'James Carter', customerMobile: '2125550188',
    address: ADDR.springfield('300 W Broadway', 'Apt 4B'),
    notes: null, method: 'online',
    pick: [{ categoryHint: 'apparel', qty: 1 }],
  },
];

// Pick N products from a store matching a loose category hint (falls back to any product).
const pickProducts = (
  products: readonly Product[],
  storeId: string,
  hint: string,
  count: number,
): Product[] => {
  const inStore = products.filter((p) => p.storeId === storeId && p.active);
  if (inStore.length === 0) return [];
  const matched = inStore.filter((p) => {
    const cat = p.category.toLowerCase();
    if (hint === 'apparel')     return cat === 'other' || cat === 'personal';
    if (hint === 'electronics') return cat === 'electronics';
    if (hint === 'food')        return ['snacks', 'meat', 'beverages', 'other'].includes(cat);
    if (hint === 'grocery')     return ['grocery', 'produce', 'beverages', 'snacks', 'frozen', 'meat'].includes(cat);
    return true;
  });
  const pool = matched.length > 0 ? matched : inStore;
  const out: Product[] = [];
  for (let i = 0; i < count; i++) out.push(pool[i % pool.length]);
  return out;
};

export const buildDemoOrders = (ctx: OrderSeedContext): readonly Sale[] => {
  const now = Date.now();
  const out: Sale[] = [];

  for (const row of ROWS) {
    const taxRate = ctx.taxRateByStore[row.storeId] ?? 0;
    const picked = row.pick.flatMap((p) => pickProducts(ctx.products, row.storeId, p.categoryHint, p.qty));
    if (picked.length === 0) continue;

    const lines = picked.map((product) => ({
      productId: product.id, sku: product.sku, name: product.name, tone: product.tone,
      unitPrice: product.price, quantity: 1, lineTotal: product.price,
    }));
    const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
    const tax = subtotal * taxRate;
    const unitCount = lines.reduce((s, l) => s + l.quantity, 0);
    const placedAt = new Date(now - row.hoursAgo * 3600_000).toISOString();

    const customerId = ctx.customerIdByMobile.get(`${row.storeId}::${row.customerMobile}`) ?? null;

    // Build a status trail so the tracker view has data to show.
    const statusOrder: OrderStatus[] = ['placed', 'confirmed', 'packing', 'out_for_delivery', 'delivered'];
    const upto = statusOrder.indexOf(row.status);
    const statusHistory = statusOrder.slice(0, upto + 1).map((status, i) => ({
      status,
      at: new Date(now - (row.hoursAgo - i * 0.3) * 3600_000).toISOString(),
      by: i === 0 ? 'customer' : 'staff',
      note: i === 0 ? 'Order placed via storefront' : '',
    }));

    out.push({
      id: crypto.randomUUID(),
      invoiceNo: nextInvoiceNo(),
      completedAt: placedAt,
      lines, subtotal, tax, total: subtotal + tax, unitCount,
      paymentMethod: row.method,
      customerMobile: row.customerMobile,
      customerId,
      cashierId: SYSTEM_ACTOR_ID,
      cashierName: SYSTEM_ACTOR_NAME,
      voided: false, voidedAt: null, voidedReason: null,
      storeId: row.storeId,
      channel: 'online',
      orderStatus: row.status,
      customerName: row.customerName,
      deliveryAddress: row.address,
      customerNotes: row.notes,
      statusHistory,
    });
  }

  return out;
};
