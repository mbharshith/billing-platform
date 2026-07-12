// Phase 9 - Accounting bootstrap.
// Chart of Accounts + Expense Categories + Expenses + Vendor Bills.
// Full double-entry ledger is future work - for now these are register-only.

import type { FC } from 'react';
import { CrudPage, type FormFieldDescriptor } from '@billing/ui/admin';
import { useTable } from '@billing/shared/hooks/useTable';
import type {
  Account, ExpenseCategory, Expense, VendorBill,
} from '@billing/shared/domain/tmbill-extras';
import type { Supplier } from '@billing/shared/domain/restaurant';

const T = <R,>(key: keyof R & string, label: string, required = false): FormFieldDescriptor<R> =>
  ({ key, label, type: 'text', required });
const N = <R,>(key: keyof R & string, label: string, step = 1): FormFieldDescriptor<R> =>
  ({ key, label, type: 'number', min: 0, step });
const B = <R,>(key: keyof R & string, label: string): FormFieldDescriptor<R> =>
  ({ key, label, type: 'boolean' });
const S = <R,>(
  key: keyof R & string, label: string,
  options: readonly { value: string; label: string }[],
  required = true,
): FormFieldDescriptor<R> => ({ key, label, type: 'select', required, options });

const fmtCurrency = (n: number): string => `Rs ${n.toLocaleString('en-IN')}`;
const fmtDate = (iso: string): string => new Date(iso).toLocaleDateString();

export const ChartOfAccountsPage: FC = () => {
  const api = useTable<Account>('accounts');
  return (
    <CrudPage<Account>
      title="Chart of Accounts"
      subtitle="Ledger accounts grouped by type (Asset / Liability / Equity / Revenue / Expense)."
      breadcrumb={['Accounting', 'Chart of Accounts']}
      api={api}
      searchPlaceholder="Search by name or code..."
      searchFn={(r, q) => r.code.toLowerCase().includes(q) || r.name.toLowerCase().includes(q)}
      makeEmpty={() => ({
        code: '', name: '', type: 'asset', parentId: null,
        openingBalance: 0, currentBalance: 0, active: true,
      })}
      fields={[
        T('code',           'Code',           true),
        T('name',           'Account Name',   true),
        S('type',           'Type', [
          { value: 'asset',     label: 'Asset' },
          { value: 'liability', label: 'Liability' },
          { value: 'equity',    label: 'Equity' },
          { value: 'revenue',   label: 'Revenue' },
          { value: 'expense',   label: 'Expense' },
        ]),
        N('openingBalance', 'Opening Balance'),
        N('currentBalance', 'Current Balance'),
        B('active',         'Active'),
      ]}
      columns={[
        { key: 'code',    label: 'Code',    sortValue: (r) => r.code, render: (r) => r.code },
        { key: 'name',    label: 'Name',    sortValue: (r) => r.name, render: (r) => r.name },
        { key: 'type',    label: 'Type',    sortValue: (r) => r.type, render: (r) => r.type },
        { key: 'opening', label: 'Opening', sortValue: (r) => r.openingBalance, render: (r) => fmtCurrency(r.openingBalance) },
        { key: 'current', label: 'Current', sortValue: (r) => r.currentBalance, render: (r) => fmtCurrency(r.currentBalance) },
      ]}
    />
  );
};

export const ExpenseCategoriesPage: FC = () => {
  const api = useTable<ExpenseCategory>('expenseCategories');
  const accts = useTable<Account>('accounts');
  const expenseAccts = accts.rows.filter((a) => a.type === 'expense');
  return (
    <CrudPage<ExpenseCategory>
      title="Expense Categories"
      subtitle="Buckets for classifying expenses (Rent, Salaries, Marketing)."
      breadcrumb={['Accounting', 'Expense Categories']}
      api={api}
      searchPlaceholder="Search..."
      searchFn={(r, q) => r.name.toLowerCase().includes(q)}
      makeEmpty={() => ({ name: '', accountId: expenseAccts[0]?.id ?? '', active: true })}
      fields={[
        T('name',      'Category Name', true),
        S('accountId', 'Ledger Account',
          expenseAccts.map((a) => ({ value: a.id, label: `${a.code} - ${a.name}` }))),
        B('active',    'Active'),
      ]}
      columns={[
        { key: 'name', label: 'Name', sortValue: (r) => r.name, render: (r) => r.name },
        { key: 'acct', label: 'Ledger Account',
          render: (r) => accts.rows.find((a) => a.id === r.accountId)?.name ?? r.accountId },
      ]}
    />
  );
};

export const ExpensesPage: FC = () => {
  const api  = useTable<Expense>('expenses');
  const cats = useTable<ExpenseCategory>('expenseCategories');
  return (
    <CrudPage<Expense>
      title="Expenses"
      subtitle="Recorded operational expenses (voucher register)."
      breadcrumb={['Accounting', 'Expenses']}
      api={api}
      searchPlaceholder="Search voucher # or vendor..."
      searchFn={(r, q) =>
        r.voucherNumber.toLowerCase().includes(q) || r.paidTo.toLowerCase().includes(q)}
      makeEmpty={() => ({
        voucherNumber: `EXP-${Date.now().toString(36).slice(-4).toUpperCase()}`,
        categoryId: cats.rows[0]?.id ?? '', amount: 0, paidTo: '',
        paidBy: 'cash', incurredAt: new Date().toISOString(),
        billImageUrl: null, notes: '',
      })}
      fields={[
        T('voucherNumber', 'Voucher #', true),
        S('categoryId',    'Category',   cats.rows.map((c) => ({ value: c.id, label: c.name }))),
        N('amount',        'Amount (Rs)', 0.01),
        T('paidTo',        'Paid To',    true),
        S('paidBy',        'Paid By', [
          { value: 'cash', label: 'Cash' },
          { value: 'bank', label: 'Bank Transfer' },
          { value: 'card', label: 'Card' },
        ]),
        T('notes',         'Notes'),
      ]}
      columns={[
        { key: 'vch',    label: 'Voucher #', sortValue: (r) => r.voucherNumber, render: (r) => r.voucherNumber },
        { key: 'date',   label: 'Date',      sortValue: (r) => r.incurredAt, render: (r) => fmtDate(r.incurredAt) },
        { key: 'cat',    label: 'Category',
          render: (r) => cats.rows.find((c) => c.id === r.categoryId)?.name ?? r.categoryId },
        { key: 'amount', label: 'Amount',    sortValue: (r) => r.amount, render: (r) => fmtCurrency(r.amount) },
        { key: 'to',     label: 'Paid To',   render: (r) => r.paidTo },
        { key: 'via',    label: 'Method',    render: (r) => r.paidBy },
      ]}
    />
  );
};

export const VendorBillsPage: FC = () => {
  const api = useTable<VendorBill>('vendorBills');
  const sup = useTable<Supplier>('suppliers');
  return (
    <CrudPage<VendorBill>
      title="Vendor Bills"
      subtitle="Payables ledger - what you owe suppliers."
      breadcrumb={['Accounting', 'Vendor Bills']}
      api={api}
      searchPlaceholder="Search bill number..."
      searchFn={(r, q) => r.billNumber.toLowerCase().includes(q)}
      makeEmpty={() => ({
        billNumber: '', supplierId: sup.rows[0]?.id ?? '', grnId: null,
        totalAmount: 0, paidAmount: 0,
        dueDate: new Date(Date.now() + 15 * 86400000).toISOString(),
        status: 'unpaid', notes: '',
      })}
      fields={[
        T('billNumber',  'Bill #', true),
        S('supplierId',  'Supplier', sup.rows.map((s) => ({ value: s.id, label: s.name }))),
        N('totalAmount', 'Total (Rs)', 0.01),
        N('paidAmount',  'Paid so far (Rs)', 0.01),
        S('status', 'Status', [
          { value: 'unpaid',  label: 'Unpaid' },
          { value: 'partial', label: 'Partially paid' },
          { value: 'paid',    label: 'Paid' },
          { value: 'overdue', label: 'Overdue' },
        ]),
        T('notes', 'Notes'),
      ]}
      columns={[
        { key: 'bill',   label: 'Bill #',   sortValue: (r) => r.billNumber, render: (r) => r.billNumber },
        { key: 'sup',    label: 'Supplier',
          render: (r) => sup.rows.find((s) => s.id === r.supplierId)?.name ?? r.supplierId },
        { key: 'total',  label: 'Total',    sortValue: (r) => r.totalAmount, render: (r) => fmtCurrency(r.totalAmount) },
        { key: 'paid',   label: 'Paid',     render: (r) => fmtCurrency(r.paidAmount) },
        { key: 'bal',    label: 'Balance',
          render: (r) => fmtCurrency(r.totalAmount - r.paidAmount) },
        { key: 'due',    label: 'Due Date', sortValue: (r) => r.dueDate, render: (r) => fmtDate(r.dueDate) },
        { key: 'status', label: 'Status',   render: (r) => r.status },
      ]}
    />
  );
};
