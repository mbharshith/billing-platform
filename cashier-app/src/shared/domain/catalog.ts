/**
 * catalog.ts - product-domain enums and constants.
 *
 * PRODUCTION CODE, not fixture data. Kept here because Product's category
 * and tone unions are the source-of-truth vocabulary the form dropdowns
 * (ProductsPage, CashierPage) need to render.
 *
 * If you're looking for the demo product list, it moved to
 * @shared/fixtures/products.ts along with the rest of the seed data.
 */
import type { Product } from './types';

export const CATEGORY_FILTERS: readonly ('All' | Product['category'])[] = [
  'All', 'Grocery', 'Produce', 'Beverages', 'Snacks',
  'Household', 'Personal', 'Meat', 'Frozen', 'Electronics', 'Other',
];

export const ALL_CATEGORIES: readonly Product['category'][] = [
  'Grocery', 'Produce', 'Beverages', 'Snacks',
  'Household', 'Personal', 'Meat', 'Frozen', 'Electronics', 'Other',
];

export const ALL_TONES: readonly Product['tone'][] = [
  'sky', 'amber', 'yellow', 'red', 'stone', 'orange', 'brown', 'rose', 'slate',
];

/** Fallback tax rate when a Store has no per-tenant rate configured.
 *  The cashier UI reads this from the current store's `taxRate` first;
 *  this constant is the tie-breaker for legacy code paths. */
export const TAX_RATE = 0.0825;
