// catalog.ts - product-domain enums and constants.

// PRODUCTION - source-of-truth vocabulary for Product's category+tone unions.

// If you're looking for the demo product list, it moved to
// @shared/fixtures/products.ts along with the rest of the seed data.
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


export const TAX_RATE = 0.0825;
