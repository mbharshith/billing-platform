// FIXTURE - demo product catalog. Scrap when the real backend is live.

// Thematic catalogs per tenant (fashion/electronics/grocery) so multi-tenancy is obvious.
import type { Product } from '@shared/domain/types';
import {
  SEED_STORE_MAIN_ID, SEED_STORE_BRANCH_ID, SEED_STORE_THIRD_ID,
} from './stores';

const NOW = new Date().toISOString();

const p = (
  id: string, sku: string, name: string, price: number,
  category: Product['category'], tone: Product['tone'], stock: number,
  storeId: string,
): Product => ({ id, sku, name, price, category, tone, stock, active: true, createdAt: NOW, storeId });

// Myntra Mumbai - apparel (Personal / Other)
const MYNTRA: readonly Product[] = [
  p('m01', 'APP-0001', 'Cotton Kurta',        1299, 'Personal', 'sky',    40, SEED_STORE_MAIN_ID),
  p('m02', 'APP-0002', 'Denim Jeans',         1899, 'Personal', 'slate',  35, SEED_STORE_MAIN_ID),
  p('m03', 'APP-0003', 'Silk Saree',          4999, 'Personal', 'rose',   18, SEED_STORE_MAIN_ID),
  p('m04', 'APP-0004', 'Formal Shirt',        1499, 'Personal', 'sky',    50, SEED_STORE_MAIN_ID),
  p('m05', 'APP-0005', 'Sports T-Shirt',       799, 'Personal', 'yellow', 60, SEED_STORE_MAIN_ID),
  p('m06', 'APP-0006', 'Chinos',              1699, 'Personal', 'stone',  28, SEED_STORE_MAIN_ID),
  p('m07', 'ACC-0001', 'Leather Belt',         899, 'Other',    'brown',  45, SEED_STORE_MAIN_ID),
  p('m08', 'ACC-0002', 'Sunglasses',          2499, 'Other',    'amber',  20, SEED_STORE_MAIN_ID),
  p('m09', 'FTW-0001', 'Running Shoes',       3299, 'Other',    'red',    22, SEED_STORE_MAIN_ID),
  p('m10', 'FTW-0002', 'Sandals',              999, 'Other',    'orange', 30, SEED_STORE_MAIN_ID),
];

// Flipkart Bengaluru - electronics
const FLIPKART: readonly Product[] = [
  p('f01', 'ELE-0001', 'Wireless Earbuds',    2999, 'Electronics', 'slate',  40, SEED_STORE_BRANCH_ID),
  p('f02', 'ELE-0002', 'Bluetooth Speaker',   1799, 'Electronics', 'stone',  30, SEED_STORE_BRANCH_ID),
  p('f03', 'ELE-0003', 'Fast Charger 25W',     799, 'Electronics', 'sky',    80, SEED_STORE_BRANCH_ID),
  p('f04', 'ELE-0004', 'Type-C Cable',         349, 'Electronics', 'yellow', 120, SEED_STORE_BRANCH_ID),
  p('f05', 'ELE-0005', 'Power Bank 20000',    1999, 'Electronics', 'red',    45, SEED_STORE_BRANCH_ID),
  p('f06', 'ELE-0006', 'Smartwatch',          4499, 'Electronics', 'rose',   18, SEED_STORE_BRANCH_ID),
  p('f07', 'ELE-0007', 'Laptop Stand',        1299, 'Electronics', 'brown',  25, SEED_STORE_BRANCH_ID),
  p('f08', 'ELE-0008', 'Mechanical Keyboard', 3499, 'Electronics', 'amber',  15, SEED_STORE_BRANCH_ID),
  p('f09', 'ELE-0009', 'Wireless Mouse',       699, 'Electronics', 'sky',    60, SEED_STORE_BRANCH_ID),
];

// Walmart Springfield - grocery + household
const WALMART: readonly Product[] = [
  p('w01', 'GRO-0001', 'Whole Milk 1gal',      3.48, 'Grocery',   'sky',    120, SEED_STORE_THIRD_ID),
  p('w02', 'GRO-0002', 'Bread Loaf',           2.28, 'Grocery',   'amber',   60, SEED_STORE_THIRD_ID),
  p('w03', 'PRD-0001', 'Bananas per lb',       0.58, 'Produce',   'yellow', 200, SEED_STORE_THIRD_ID),
  p('w04', 'PRD-0002', 'Red Delicious Apples', 1.97, 'Produce',   'red',     80, SEED_STORE_THIRD_ID),
  p('w05', 'BEV-0001', 'Coke 12-pack',         6.98, 'Beverages', 'rose',    45, SEED_STORE_THIRD_ID),
  p('w06', 'BEV-0002', 'Orange Juice 64oz',    3.98, 'Beverages', 'orange',  35, SEED_STORE_THIRD_ID),
  p('w07', 'SNK-0001', 'Doritos Nacho',        4.28, 'Snacks',    'yellow',  50, SEED_STORE_THIRD_ID),
  p('w08', 'HSD-0001', 'Paper Towels 6-pk',   12.97, 'Household', 'stone',   22, SEED_STORE_THIRD_ID),
  p('w09', 'HSD-0002', 'Dish Soap 32oz',       4.88, 'Household', 'sky',     40, SEED_STORE_THIRD_ID),
  p('w10', 'MEA-0001', 'Ground Beef 1lb',      5.98, 'Meat',      'red',     30, SEED_STORE_THIRD_ID),
  p('w11', 'FRZ-0001', 'Frozen Pizza',         4.98, 'Frozen',    'amber',   25, SEED_STORE_THIRD_ID),
  p('w12', 'PER-0001', 'Toothpaste',           3.47, 'Personal',  'sky',     55, SEED_STORE_THIRD_ID),
];

export const SEED_PRODUCTS: readonly Product[] = [...MYNTRA, ...FLIPKART, ...WALMART];
