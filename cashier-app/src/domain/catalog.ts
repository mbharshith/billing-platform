import type { Product } from './types';

/**
 * Default seed products. Loaded on first run into ProductsContext,
 * then persisted to localStorage and mutable via Products admin page.
 */
const NOW = new Date().toISOString();

const p = (
  id: string, sku: string, name: string, price: number,
  category: Product['category'], tone: Product['tone'], stock: number,
): Product => ({ id, sku, name, price, category, tone, stock, active: true, createdAt: NOW });

export const SEED_PRODUCTS: readonly Product[] = [
  p('p01', 'GRO-0001', 'Item 1',  3.48,  'Grocery',     'sky',    42),
  p('p02', 'GRO-0002', 'Item 2',  2.28,  'Grocery',     'amber',  30),
  p('p03', 'PRD-0001', 'Item 3',  0.58,  'Produce',     'yellow', 120),
  p('p04', 'PRD-0002', 'Item 4',  4.97,  'Produce',     'red',    55),
  p('p05', 'GRO-0003', 'Item 5',  3.12,  'Grocery',     'stone',  60),
  p('p06', 'GRO-0004', 'Item 6',  5.64,  'Grocery',     'orange', 25),
  p('p07', 'GRO-0005', 'Item 7',  8.98,  'Grocery',     'brown',  18),
  p('p08', 'BEV-0001', 'Item 8',  6.48,  'Beverages',   'rose',   40),
  p('p09', 'SNK-0001', 'Item 9',  4.28,  'Snacks',      'yellow', 35),
  p('p10', 'SNK-0002', 'Item 10', 3.98,  'Snacks',      'slate',  28),
  p('p11', 'HSD-0001', 'Item 11', 12.97, 'Household',   'orange', 22),
  p('p12', 'HSD-0002', 'Item 12', 14.88, 'Household',   'sky',    20),
  p('p13', 'PER-0001', 'Item 13', 3.47,  'Personal',    'sky',    45),
  p('p14', 'PER-0002', 'Item 14', 5.98,  'Personal',    'stone',  30),
  p('p15', 'MEA-0001', 'Item 15', 3.98,  'Meat',        'rose',   40),
  p('p16', 'MEA-0002', 'Item 16', 5.47,  'Meat',        'red',    32),
  p('p17', 'FRZ-0001', 'Item 17', 4.98,  'Frozen',      'amber',  15),
  p('p18', 'FRZ-0002', 'Item 18', 3.68,  'Frozen',      'sky',    18),
  p('p19', 'ELE-0001', 'Item 19', 7.94,  'Electronics', 'slate',  24),
  p('p20', 'ELE-0002', 'Item 20', 9.88,  'Electronics', 'stone',  16),
];

/** Historical name — kept for the CashierPage import path. */
export const CATALOG = SEED_PRODUCTS;

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
