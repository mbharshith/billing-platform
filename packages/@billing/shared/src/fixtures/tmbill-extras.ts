// Seed data for tmbill-extras entities. Same conventions as restaurant.ts.

import type {
  Warehouse, RawMaterialCategory, UnitOfMeasure, StockAdjustment,
  GRN, StockTransfer, IndentRequest, ProductionBatch,
  Account, ExpenseCategory, Expense, VendorBill,
  WhatsAppTemplate, CustomerSegment, MarketingCampaign,
} from '@billing/shared/domain/tmbill-extras';
import { SEED_STORE_BRANCH_ID } from './stores';

const NOW = new Date().toISOString();
const S = SEED_STORE_BRANCH_ID;
const DAY_MS = 86400_000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY_MS).toISOString();
const daysFromNow = (n: number) => new Date(Date.now() + n * DAY_MS).toISOString();

/* -------------------------------------------------------------------------- */
/* INVENTORY DEPTH                                                            */
/* -------------------------------------------------------------------------- */

export const SEED_WAREHOUSES: readonly Warehouse[] = [
  { id: 'wh-outlet',  storeId: S, name: 'Outlet Kitchen (Spice Route)', type: 'outlet',  address: 'Indiranagar, Bengaluru', managerName: 'Vikram Shetty',   active: true, createdAt: NOW },
  { id: 'wh-central', storeId: S, name: 'Central Warehouse - HSR',       type: 'central', address: 'HSR Layout, Bengaluru', managerName: 'Rakesh Sharma',   active: true, createdAt: NOW },
  { id: 'wh-cold',    storeId: S, name: 'Cold Storage - Whitefield',     type: 'central', address: 'Whitefield, Bengaluru', managerName: 'Anita D',         active: true, createdAt: NOW },
];

export const SEED_RM_CATEGORIES: readonly RawMaterialCategory[] = [
  { id: 'rmc-meat',   storeId: S, name: 'Meat & Poultry', sortOrder: 1, active: true, createdAt: NOW },
  { id: 'rmc-grain',  storeId: S, name: 'Grains & Flours', sortOrder: 2, active: true, createdAt: NOW },
  { id: 'rmc-veg',    storeId: S, name: 'Vegetables',     sortOrder: 3, active: true, createdAt: NOW },
  { id: 'rmc-dairy',  storeId: S, name: 'Dairy',          sortOrder: 4, active: true, createdAt: NOW },
  { id: 'rmc-spice',  storeId: S, name: 'Spices & Masalas', sortOrder: 5, active: true, createdAt: NOW },
  { id: 'rmc-oil',    storeId: S, name: 'Oils & Fats',    sortOrder: 6, active: true, createdAt: NOW },
];

export const SEED_UOM: readonly UnitOfMeasure[] = [
  { id: 'uom-g',   storeId: S, code: 'G',    name: 'Gram',       baseUnit: 'G',    factor: 1,    active: true, createdAt: NOW },
  { id: 'uom-kg',  storeId: S, code: 'KG',   name: 'Kilogram',   baseUnit: 'G',    factor: 1000, active: true, createdAt: NOW },
  { id: 'uom-ml',  storeId: S, code: 'ML',   name: 'Millilitre', baseUnit: 'ML',   factor: 1,    active: true, createdAt: NOW },
  { id: 'uom-l',   storeId: S, code: 'L',    name: 'Litre',      baseUnit: 'ML',   factor: 1000, active: true, createdAt: NOW },
  { id: 'uom-u',   storeId: S, code: 'UNIT', name: 'Unit',       baseUnit: 'UNIT', factor: 1,    active: true, createdAt: NOW },
  { id: 'uom-dz',  storeId: S, code: 'DZ',   name: 'Dozen',      baseUnit: 'UNIT', factor: 12,   active: true, createdAt: NOW },
];

export const SEED_STOCK_ADJUSTMENTS: readonly StockAdjustment[] = [
  { id: 'sa-1', storeId: S, warehouseId: 'wh-outlet', ingredientId: 'ing-rice',  delta:  50, reason: 'opening',   notes: 'Opening balance', performedBy: 'spiceroute', performedAt: daysAgo(30), createdAt: daysAgo(30) },
  { id: 'sa-2', storeId: S, warehouseId: 'wh-outlet', ingredientId: 'ing-chick', delta: -2,  reason: 'spoilage',  notes: 'Freezer failure',  performedBy: 'spiceroute', performedAt: daysAgo(7),  createdAt: daysAgo(7) },
  { id: 'sa-3', storeId: S, warehouseId: 'wh-outlet', ingredientId: 'ing-milk',  delta: -1,  reason: 'correction', notes: 'Recount off by 1',performedBy: 'admin',       performedAt: daysAgo(3),  createdAt: daysAgo(3) },
];

export const SEED_GRNS: readonly GRN[] = [
  { id: 'grn-1', storeId: S, grnNumber: 'GRN-0001', poId: 'po-1', supplierId: 'sup-freshm',
    warehouseId: 'wh-outlet', invoiceNumber: 'FM-24567', receivedBy: 'spiceroute',
    receivedAt: daysAgo(2), status: 'received', totalValue: 15600, notes: '', createdAt: daysAgo(2),
    lines: [
      { ingredientId: 'ing-chick', orderedQty: 30, receivedQty: 30, unitCost: 260, lineTotal: 7800 },
      { ingredientId: 'ing-mutton', orderedQty: 8, receivedQty: 8, unitCost: 720, lineTotal: 5760 },
      { ingredientId: 'ing-fish',  orderedQty: 6, receivedQty: 6, unitCost: 380, lineTotal: 2040 },
    ] },
  { id: 'grn-2', storeId: S, grnNumber: 'GRN-0002', poId: null,   supplierId: 'sup-vegwal',
    warehouseId: 'wh-outlet', invoiceNumber: 'VW-8891',  receivedBy: 'spiceroute',
    receivedAt: daysAgo(1), status: 'received', totalValue: 3200, notes: 'Direct receipt', createdAt: daysAgo(1),
    lines: [
      { ingredientId: 'ing-onion',  orderedQty: 50, receivedQty: 50, unitCost: 35, lineTotal: 1750 },
      { ingredientId: 'ing-tomato', orderedQty: 30, receivedQty: 30, unitCost: 45, lineTotal: 1350 },
    ] },
];

export const SEED_STOCK_TRANSFERS: readonly StockTransfer[] = [
  { id: 'trf-1', storeId: S, transferNumber: 'TRF-0001',
    fromWarehouseId: 'wh-central', toWarehouseId: 'wh-outlet',
    status: 'received', requestedBy: 'spiceroute', requestedAt: daysAgo(5),
    dispatchedAt: daysAgo(4), receivedAt: daysAgo(4), notes: 'Weekly restock', createdAt: daysAgo(5),
    lines: [
      { ingredientId: 'ing-rice',  quantity: 25, unit: 'kg' },
      { ingredientId: 'ing-flour', quantity: 15, unit: 'kg' },
    ] },
  { id: 'trf-2', storeId: S, transferNumber: 'TRF-0002',
    fromWarehouseId: 'wh-cold',    toWarehouseId: 'wh-outlet',
    status: 'in-transit', requestedBy: 'spiceroute', requestedAt: daysAgo(1),
    dispatchedAt: daysAgo(1), receivedAt: null, notes: '', createdAt: daysAgo(1),
    lines: [
      { ingredientId: 'ing-mutton', quantity: 5, unit: 'kg' },
      { ingredientId: 'ing-prawn',  quantity: 3, unit: 'kg' },
    ] },
];

export const SEED_INDENTS: readonly IndentRequest[] = [
  { id: 'ind-1', storeId: S, indentNumber: 'IND-0001', requestingOutletId: S,
    requestedBy: 'spiceroute', requestedAt: daysAgo(3), requiredBy: daysFromNow(1),
    status: 'approved', approvedBy: 'admin', notes: '', createdAt: daysAgo(3),
    lines: [
      { ingredientId: 'ing-chick', requestedQty: 20, approvedQty: 20, unit: 'kg' },
      { ingredientId: 'ing-rice',  requestedQty: 30, approvedQty: 25, unit: 'kg' },
    ] },
  { id: 'ind-2', storeId: S, indentNumber: 'IND-0002', requestingOutletId: S,
    requestedBy: 'spiceroute', requestedAt: daysAgo(1), requiredBy: daysFromNow(2),
    status: 'pending', approvedBy: null, notes: 'Weekend rush prep', createdAt: daysAgo(1),
    lines: [
      { ingredientId: 'ing-mutton', requestedQty: 10, approvedQty: 0, unit: 'kg' },
    ] },
];

export const SEED_PRODUCTION_BATCHES: readonly ProductionBatch[] = [
  { id: 'pb-1', storeId: S, batchNumber: 'BATCH-0001', recipeId: 'rec-bir',
    yieldQty: 20, producedBy: 'spiceroute', producedAt: daysAgo(1),
    expiresAt: daysFromNow(1), status: 'complete', createdAt: daysAgo(1),
    consumedIngredients: [
      { ingredientId: 'ing-rice',  quantity: 4,   unit: 'kg' },
      { ingredientId: 'ing-chick', quantity: 4.4, unit: 'kg' },
    ] },
  { id: 'pb-2', storeId: S, batchNumber: 'BATCH-0002', recipeId: 'rec-butter',
    yieldQty: 15, producedBy: 'spiceroute', producedAt: NOW,
    expiresAt: daysFromNow(1), status: 'in-progress', createdAt: NOW,
    consumedIngredients: [
      { ingredientId: 'ing-chick',  quantity: 3.75, unit: 'kg' },
      { ingredientId: 'ing-butter', quantity: 0.6,  unit: 'kg' },
    ] },
];

/* -------------------------------------------------------------------------- */
/* ACCOUNTING                                                                 */
/* -------------------------------------------------------------------------- */

export const SEED_ACCOUNTS: readonly Account[] = [
  // Assets
  { id: 'acc-1000', storeId: S, code: '1000', name: 'Cash on Hand',      type: 'asset',    parentId: null, openingBalance: 25000, currentBalance: 42500, active: true, createdAt: NOW },
  { id: 'acc-1010', storeId: S, code: '1010', name: 'Bank - HDFC',       type: 'asset',    parentId: null, openingBalance: 180000,currentBalance: 245600,active: true, createdAt: NOW },
  { id: 'acc-1020', storeId: S, code: '1020', name: 'Accounts Receivable',type: 'asset',   parentId: null, openingBalance: 0,     currentBalance: 12800, active: true, createdAt: NOW },
  { id: 'acc-1100', storeId: S, code: '1100', name: 'Inventory - Raw Materials', type: 'asset', parentId: null, openingBalance: 45000, currentBalance: 68400, active: true, createdAt: NOW },
  // Liabilities
  { id: 'acc-2000', storeId: S, code: '2000', name: 'Accounts Payable',  type: 'liability',parentId: null, openingBalance: 0,     currentBalance: 32400, active: true, createdAt: NOW },
  { id: 'acc-2100', storeId: S, code: '2100', name: 'GST Payable',       type: 'liability',parentId: null, openingBalance: 0,     currentBalance: 8600,  active: true, createdAt: NOW },
  // Equity
  { id: 'acc-3000', storeId: S, code: '3000', name: 'Owner Capital',     type: 'equity',   parentId: null, openingBalance: 250000,currentBalance: 250000,active: true, createdAt: NOW },
  { id: 'acc-3100', storeId: S, code: '3100', name: 'Retained Earnings', type: 'equity',   parentId: null, openingBalance: 0,     currentBalance: 78300, active: true, createdAt: NOW },
  // Revenue
  { id: 'acc-4000', storeId: S, code: '4000', name: 'Sales - Food',      type: 'revenue',  parentId: null, openingBalance: 0,     currentBalance: 425000,active: true, createdAt: NOW },
  { id: 'acc-4010', storeId: S, code: '4010', name: 'Sales - Beverages', type: 'revenue',  parentId: null, openingBalance: 0,     currentBalance: 68000, active: true, createdAt: NOW },
  { id: 'acc-4020', storeId: S, code: '4020', name: 'Sales - Aggregators', type: 'revenue',parentId: null, openingBalance: 0,     currentBalance: 156000,active: true, createdAt: NOW },
  // Expenses
  { id: 'acc-5000', storeId: S, code: '5000', name: 'Cost of Goods Sold',type: 'expense',  parentId: null, openingBalance: 0,     currentBalance: 178000,active: true, createdAt: NOW },
  { id: 'acc-5100', storeId: S, code: '5100', name: 'Rent Expense',      type: 'expense',  parentId: null, openingBalance: 0,     currentBalance: 45000, active: true, createdAt: NOW },
  { id: 'acc-5110', storeId: S, code: '5110', name: 'Salaries & Wages',  type: 'expense',  parentId: null, openingBalance: 0,     currentBalance: 92000, active: true, createdAt: NOW },
  { id: 'acc-5120', storeId: S, code: '5120', name: 'Utilities',         type: 'expense',  parentId: null, openingBalance: 0,     currentBalance: 12800, active: true, createdAt: NOW },
  { id: 'acc-5130', storeId: S, code: '5130', name: 'Marketing',         type: 'expense',  parentId: null, openingBalance: 0,     currentBalance: 18500, active: true, createdAt: NOW },
];

export const SEED_EXP_CATEGORIES: readonly ExpenseCategory[] = [
  { id: 'ec-rent',  storeId: S, name: 'Rent',         accountId: 'acc-5100', active: true, createdAt: NOW },
  { id: 'ec-sal',   storeId: S, name: 'Salaries',     accountId: 'acc-5110', active: true, createdAt: NOW },
  { id: 'ec-util',  storeId: S, name: 'Utilities',    accountId: 'acc-5120', active: true, createdAt: NOW },
  { id: 'ec-mkt',   storeId: S, name: 'Marketing',    accountId: 'acc-5130', active: true, createdAt: NOW },
  { id: 'ec-repair',storeId: S, name: 'Repairs & Maintenance', accountId: 'acc-5120', active: true, createdAt: NOW },
];

export const SEED_EXPENSES: readonly Expense[] = [
  { id: 'exp-1', storeId: S, voucherNumber: 'EXP-0001', categoryId: 'ec-rent',
    amount: 45000, paidTo: 'Kamala Mills Properties', paidBy: 'bank',
    incurredAt: daysAgo(5), billImageUrl: null, notes: 'July rent', createdAt: daysAgo(5) },
  { id: 'exp-2', storeId: S, voucherNumber: 'EXP-0002', categoryId: 'ec-sal',
    amount: 92000, paidTo: 'Payroll - July', paidBy: 'bank',
    incurredAt: daysAgo(3), billImageUrl: null, notes: 'Monthly payroll for 8 staff', createdAt: daysAgo(3) },
  { id: 'exp-3', storeId: S, voucherNumber: 'EXP-0003', categoryId: 'ec-util',
    amount: 12800, paidTo: 'BESCOM', paidBy: 'cash',
    incurredAt: daysAgo(2), billImageUrl: null, notes: 'Electricity July', createdAt: daysAgo(2) },
  { id: 'exp-4', storeId: S, voucherNumber: 'EXP-0004', categoryId: 'ec-mkt',
    amount: 8500, paidTo: 'Meta Ads', paidBy: 'card',
    incurredAt: daysAgo(1), billImageUrl: null, notes: 'Diwali campaign', createdAt: daysAgo(1) },
  { id: 'exp-5', storeId: S, voucherNumber: 'EXP-0005', categoryId: 'ec-repair',
    amount: 4200, paidTo: 'Cool Tech Refrigeration', paidBy: 'cash',
    incurredAt: NOW, billImageUrl: null, notes: 'Walk-in freezer service', createdAt: NOW },
];

export const SEED_VENDOR_BILLS: readonly VendorBill[] = [
  { id: 'vb-1', storeId: S, billNumber: 'FM-24567', supplierId: 'sup-freshm',
    grnId: 'grn-1', totalAmount: 15600, paidAmount: 15600,
    dueDate: daysAgo(-10), status: 'paid', notes: '', createdAt: daysAgo(2) },
  { id: 'vb-2', storeId: S, billNumber: 'VW-8891',  supplierId: 'sup-vegwal',
    grnId: 'grn-2', totalAmount: 3200, paidAmount: 0,
    dueDate: daysFromNow(5), status: 'unpaid', notes: '', createdAt: daysAgo(1) },
  { id: 'vb-3', storeId: S, billNumber: 'ND-77112', supplierId: 'sup-dairy',
    grnId: null, totalAmount: 6800, paidAmount: 3000,
    dueDate: daysFromNow(15), status: 'partial', notes: 'Split payment', createdAt: daysAgo(10) },
];

/* -------------------------------------------------------------------------- */
/* MARKETING                                                                  */
/* -------------------------------------------------------------------------- */

export const SEED_WA_TEMPLATES: readonly WhatsAppTemplate[] = [
  { id: 'wat-welcome', storeId: S, name: 'Welcome Offer', category: 'promotional', language: 'en',
    body: 'Hey {{name}}! Welcome to Spice Route. Enjoy 10% off your first order with code WELCOME10.',
    variables: ['name'], approved: true, active: true, createdAt: NOW },
  { id: 'wat-bill', storeId: S, name: 'Bill Sent', category: 'transactional', language: 'en',
    body: 'Hi {{name}}, your bill of Rs {{amount}} at Spice Route. View: {{link}}',
    variables: ['name', 'amount', 'link'], approved: true, active: true, createdAt: NOW },
  { id: 'wat-bday', storeId: S, name: 'Birthday Greeting', category: 'promotional', language: 'en',
    body: 'Happy Birthday {{name}}! A complimentary dessert is on us next time you dine in.',
    variables: ['name'], approved: true, active: true, createdAt: NOW },
  { id: 'wat-comeback', storeId: S, name: 'We Miss You', category: 'promotional', language: 'en',
    body: 'Hi {{name}}, it has been a while. Come back for our chef-special biryani, 15% off with COMEBACK15.',
    variables: ['name'], approved: false, active: true, createdAt: NOW },
];

export const SEED_SEGMENTS: readonly CustomerSegment[] = [
  { id: 'seg-vip',    storeId: S, name: 'VIP - 10+ orders',        rule: 'orderCount >= 10',                memberCount: 12,  refreshedAt: NOW, active: true, createdAt: NOW },
  { id: 'seg-reg',    storeId: S, name: 'Regulars - Last 30 days', rule: 'lastOrderAt within 30d',           memberCount: 87,  refreshedAt: NOW, active: true, createdAt: NOW },
  { id: 'seg-lapsed', storeId: S, name: 'Lapsed - 90+ days',       rule: 'lastOrderAt > 90d',                memberCount: 34,  refreshedAt: NOW, active: true, createdAt: NOW },
  { id: 'seg-hival',  storeId: S, name: 'High Value - Rs 5000+',   rule: 'lifetimeValue >= 5000',            memberCount: 18,  refreshedAt: NOW, active: true, createdAt: NOW },
  { id: 'seg-bday',   storeId: S, name: 'Birthdays This Month',    rule: 'MONTH(birthday) == CURRENT_MONTH', memberCount: 9,   refreshedAt: NOW, active: true, createdAt: NOW },
];

export const SEED_CAMPAIGNS: readonly MarketingCampaign[] = [
  { id: 'cmp-1', storeId: S, name: 'Diwali Launch',       channel: 'whatsapp',
    templateId: 'wat-welcome', segmentId: 'seg-reg',   scheduledAt: daysAgo(10),
    sentCount: 87, deliveredCount: 84, readCount: 61, conversionCount: 12,
    status: 'complete', createdAt: daysAgo(11) },
  { id: 'cmp-2', storeId: S, name: 'Comeback Push - Lapsed', channel: 'whatsapp',
    templateId: 'wat-comeback', segmentId: 'seg-lapsed', scheduledAt: daysAgo(5),
    sentCount: 34, deliveredCount: 30, readCount: 18, conversionCount: 4,
    status: 'complete', createdAt: daysAgo(6) },
  { id: 'cmp-3', storeId: S, name: 'VIP Preview - New Menu', channel: 'sms',
    templateId: null, segmentId: 'seg-vip', scheduledAt: daysFromNow(2),
    sentCount: 0, deliveredCount: 0, readCount: 0, conversionCount: 0,
    status: 'scheduled', createdAt: NOW },
  { id: 'cmp-4', storeId: S, name: 'Birthday Auto-blast', channel: 'whatsapp',
    templateId: 'wat-bday', segmentId: 'seg-bday', scheduledAt: daysFromNow(1),
    sentCount: 0, deliveredCount: 0, readCount: 0, conversionCount: 0,
    status: 'scheduled', createdAt: NOW },
];
