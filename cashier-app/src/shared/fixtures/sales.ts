/**
 * FIXTURE - demo sales seeder. Scrap when the real backend is live.
 *
 * Populates a burst of realistic-looking sales history across the last
 * 60 days for each store. Runs ONCE when the sales list is empty on first
 * mount. A real backend would never fabricate history.
 *
 * Distribution:
 *   ~30 sales per store, today back to 60 days ago
 *   Mix of cash / card / lending; ~7% voided
 *   Lending sales reference existing seeded customers
 *   Basket sizes 1-4 items, quantities 1-3
 */
import type { PaymentMethod, Product, Sale, SaleLine } from '@shared/domain/types';
import { SEED_STORE_BRANCH_ID, SEED_STORE_MAIN_ID, SEED_STORE_THIRD_ID } from './stores';

/** Deterministic PRNG so demo data is stable across reloads. */
const mulberry32 = (seed: number) => (): number => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

interface SeedContext {
  readonly products: readonly Product[];
  readonly customerIdsByStore: Readonly<Record<string, readonly { id: string; mobile: string }[]>>;
  readonly taxRateByStore: Readonly<Record<string, number>>;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

const invoiceCounter = (() => {
  let n = 1001;
  return () => `INV-${String(n++).padStart(5, '0')}`;
})();

const buildLine = (p: Product, qty: number): SaleLine => ({
  productId: p.id,
  sku: p.sku,
  name: p.name,
  tone: p.tone,
  unitPrice: p.price,
  quantity: qty,
  lineTotal: round2(p.price * qty),
});

const pick = <T,>(arr: readonly T[], rand: () => number): T =>
  arr[Math.floor(rand() * arr.length)];

/**
 * Generate demo sales for a single store.
 * Returns Sale objects (id/uuid, storeId set, cashier fields populated).
 */
const seedStore = (
  storeId: string,
  ctx: SeedContext,
  rand: () => number,
): readonly Sale[] => {
  const storeProducts = ctx.products.filter((p) => p.storeId === storeId && p.active);
  if (storeProducts.length === 0) return [];

  const customers = ctx.customerIdsByStore[storeId] ?? [];
  const taxRate = ctx.taxRateByStore[storeId] ?? 0.0825;
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  const cashierByStore: Record<string, { id: string; name: string }> = {
    [SEED_STORE_MAIN_ID]:   { id: 'u-myntra-cashier',   name: 'Rohan Iyer' },
    [SEED_STORE_BRANCH_ID]: { id: 'u-flipkart-cashier', name: 'Neha Reddy' },
    [SEED_STORE_THIRD_ID]:  { id: 'u-walmart-cashier',  name: 'Sam Cashier' },
  };
  const cashier = cashierByStore[storeId] ?? { id: 'user-unknown', name: 'Cashier' };

  const paymentMix: PaymentMethod[] = [
    'cash', 'cash', 'cash', 'card', 'card', 'card', 'card', 'lending',
  ];

  const out: Sale[] = [];
  for (let i = 0; i < 30; i++) {
    const daysAgo = Math.floor(rand() * 60);
    const hoursOffset = Math.floor(rand() * 12) + 8; // 8am–8pm
    const completedAt = new Date(now - daysAgo * day)
      .setHours(hoursOffset, Math.floor(rand() * 60), 0, 0);

    const basketSize = 1 + Math.floor(rand() * 4);
    const lines: SaleLine[] = [];
    const usedIds = new Set<string>();
    for (let j = 0; j < basketSize; j++) {
      const p = pick(storeProducts, rand);
      if (usedIds.has(p.id)) continue;
      usedIds.add(p.id);
      const qty = 1 + Math.floor(rand() * 3);
      lines.push(buildLine(p, qty));
    }
    if (lines.length === 0) continue;

    const subtotal = round2(lines.reduce((s, l) => s + l.lineTotal, 0));
    const tax = round2(subtotal * taxRate);
    const total = round2(subtotal + tax);
    const unitCount = lines.reduce((s, l) => s + l.quantity, 0);

    let paymentMethod = pick(paymentMix, rand);
    let customerId: string | null = null;
    let customerMobile: string | null = null;
    if (paymentMethod === 'lending') {
      if (customers.length === 0) {
        paymentMethod = 'cash'; // no customer to lend to → downgrade
      } else {
        const c = pick(customers, rand);
        customerId = c.id;
        customerMobile = c.mobile;
      }
    }

    // ~7% of sales voided (audit trail demonstration)
    const voided = rand() < 0.07;

    out.push({
      id: crypto.randomUUID(),
      invoiceNo: invoiceCounter(),
      completedAt: new Date(completedAt).toISOString(),
      lines,
      subtotal, tax, total, unitCount,
      paymentMethod,
      customerMobile,
      customerId,
      cashierId: cashier.id,
      cashierName: cashier.name,
      voided,
      voidedAt: voided ? new Date(completedAt + 30 * 60 * 1000).toISOString() : null,
      voidedReason: voided ? 'Customer changed their mind.' : null,
      storeId,
    });
  }

  // Sort newest first, matching normal record order
  return out.sort((a, b) => b.completedAt.localeCompare(a.completedAt));
};

export const buildDemoSales = (ctx: SeedContext): readonly Sale[] => {
  const rand = mulberry32(20260707);
  return [
    ...seedStore(SEED_STORE_MAIN_ID,   ctx, rand),
    ...seedStore(SEED_STORE_BRANCH_ID, ctx, rand),
    ...seedStore(SEED_STORE_THIRD_ID,  ctx, rand),
  ];
};
