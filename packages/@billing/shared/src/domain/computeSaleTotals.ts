// Single source of truth for cashier math.
//
// The order of operations MATTERS for both regulatory reporting and cashier
// trust. This module is deliberately pure so it can be unit-tested and reused
// across CartPanel (live preview), PaymentModal (final display), and buildSale
// (persistence).
//
//   1.  base subtotal          = sum(line.originalUnitPrice * qty) [before mods]
//   2.  variant / mod deltas   already baked into line.unitPrice
//   3.  gross subtotal         = sum(line.unitPrice * qty)   [pre-discount]
//   4.  line-discount total    = sum(line.lineDiscount)      [per-line reductions]
//   5.  after-line             = gross - lineDiscountTotal
//   6.  bill discount amount   = applied to after-line (percent -> % of it)
//   7.  after-bill-discount    = after-line - billDiscountAmount
//   8.  coupon amount          = applied to after-bill-discount
//   9.  taxable base           = after-bill-discount - couponAmount
//  10.  charges                = additional charges (some taxable, some not)
//  11.  tax                    = taxRate * (taxable base + taxable charges)
//  12.  grand total            = taxable base + non-taxable charges + tax
//
// This mirrors how TMBill / Petpooja / Toast compute their bills.

import type {
  SaleLine, SaleBillDiscount, SaleCoupon, SaleCharge,
} from './types';
import type { Discount, Coupon, AdditionalCharge, OrderType } from './restaurant';

export interface CartComputeInput {
  readonly lines: readonly SaleLine[];
  readonly taxRate: number;                          // e.g. 0.05
  readonly billDiscount?: SaleBillDiscount;
  readonly coupon?: SaleCoupon;
  readonly charges?: readonly SaleCharge[];
}

export interface CartTotals {
  readonly grossSubtotal: number;      // sum(line.unitPrice * qty)
  readonly lineDiscountTotal: number;  // sum(line.lineDiscount)
  readonly subtotalAfterLine: number;
  readonly billDiscountAmount: number;
  readonly couponAmount: number;
  readonly taxableBase: number;
  readonly chargesTaxable: number;
  readonly chargesFlat: number;
  readonly chargesTotal: number;
  readonly tax: number;
  readonly total: number;
  readonly unitCount: number;
}

// * Round money to 2 decimals to avoid float drift on the receipt.
const money = (n: number): number => Math.round(n * 100) / 100;

export const computeCartTotals = (input: CartComputeInput): CartTotals => {
  const { lines, taxRate, billDiscount, coupon, charges = [] } = input;

  const grossSubtotal = money(lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0));
  const lineDiscountTotal = money(lines.reduce((s, l) => s + (l.lineDiscount ?? 0), 0));

  const subtotalAfterLine = money(grossSubtotal - lineDiscountTotal);

  const billDiscountAmount = billDiscount
    ? money(billDiscount.type === 'percent'
        ? subtotalAfterLine * (billDiscount.value / 100)
        : billDiscount.value)
    : 0;

  const afterBillDiscount = money(subtotalAfterLine - billDiscountAmount);

  const couponAmount = coupon
    ? money(coupon.type === 'percent'
        ? afterBillDiscount * (coupon.value / 100)
        : coupon.value)
    : 0;

  const taxableBase = money(afterBillDiscount - couponAmount);

  const chargesTaxable = money(charges.filter((c) => c.taxable).reduce((s, c) => s + c.amount, 0));
  const chargesFlat = money(charges.filter((c) => !c.taxable).reduce((s, c) => s + c.amount, 0));
  const chargesTotal = money(chargesTaxable + chargesFlat);

  const tax = money((taxableBase + chargesTaxable) * taxRate);
  const total = money(taxableBase + chargesFlat + chargesTaxable + tax);
  const unitCount = lines.reduce((s, l) => s + l.quantity, 0);

  return {
    grossSubtotal, lineDiscountTotal, subtotalAfterLine,
    billDiscountAmount, couponAmount, taxableBase,
    chargesTaxable, chargesFlat, chargesTotal,
    tax, total, unitCount,
  };
};

// Snapshot builders - turn a chosen Discount/Coupon/Charge into a Sale*

export const snapshotBillDiscount = (
  discount: Discount | null,
  ad: { readonly type: 'percent' | 'flat'; readonly value: number; readonly name?: string } | null,
  after: number,
): SaleBillDiscount | undefined => {
  if (discount) {
    const raw = discount.type === 'percent'
      ? after * (discount.value / 100)
      : discount.value;
    const capped = discount.maxAmount != null ? Math.min(raw, discount.maxAmount) : raw;
    return {
      discountId: discount.id,
      name: discount.name,
      type: discount.type === 'bogo' ? 'flat' : discount.type,
      value: discount.value,
      amount: money(capped),
    };
  }
  if (ad) {
    const raw = ad.type === 'percent' ? after * (ad.value / 100) : ad.value;
    return {
      discountId: null,
      name: ad.name ?? 'Manual discount',
      type: ad.type,
      value: ad.value,
      amount: money(raw),
    };
  }
  return undefined;
};

export const snapshotCoupon = (coupon: Coupon, after: number): SaleCoupon => {
  const raw = coupon.type === 'percent'
    ? after * (coupon.value / 100)
    : coupon.value;
  const capped = coupon.maxRedeem > 0 ? Math.min(raw, coupon.maxRedeem) : raw;
  return {
    couponId: coupon.id,
    code: coupon.code,
    type: coupon.type,
    value: coupon.value,
    amount: money(capped),
  };
};

export const snapshotCharge = (
  charge: AdditionalCharge,
  after: number,
): SaleCharge => {
  const amount = charge.type === 'percent'
    ? after * (charge.value / 100)
    : charge.value;
  return {
    chargeId: charge.id,
    name: charge.name,
    amount: money(amount),
    taxable: charge.taxable,
  };
};

// Given an order type, tell the cashier whether it needs a table pick. *  Matches by code prefix `DIN` or the substring `dine` in either code or name *  so both `DIN` / `DINEIN` / `DINE_IN` fixtures work out of the box.
export const orderTypeNeedsTable = (ot: OrderType | null): boolean => {
  if (!ot) return false;
  const c = ot.code.toLowerCase();
  const n = ot.name.toLowerCase();
  return c.startsWith('din') || c.includes('dine') || n.includes('dine');
};
