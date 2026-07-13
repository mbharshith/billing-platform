// Real reports with charts + tables + filters. All tabular data uses the shared DataTable molecule.

import { useEffect, useMemo, useState, type FC } from 'react';
import { AdminPage } from '@billing/ui/admin';
import {
  KPIRow, KPICard, ChartGrid, ChartFrame,
  BarChart, LineChart, DoughnutChart,
} from '@billing/ui/charts';
import { DataTable, type DataTableColumn } from '@billing/ui/molecules';
import { db } from '@billing/shared/lib/db';
import type { Sale } from '@billing/shared/domain/types';
import { STRINGS } from '@billing/shared/domain/strings';
import cls from './admin.module.css';

const money = (n: number): string => `Rs ${Math.round(n).toLocaleString('en-IN')}`;

const useSales = (): readonly Sale[] => {
  const [rows, setRows] = useState<Sale[]>([]);
  useEffect(() => {
    let cancelled = false;
    db.sales.toArray().then((s) => { if (!cancelled) setRows(s as Sale[]); });
    return () => { cancelled = true; };
  }, []);
  return rows;
};

// Sales report bill columns
const SALE_COLUMNS: DataTableColumn<Sale>[] = [
  { key: 'invoiceNo',   label: 'Bill #',    sortValue: (s) => s.invoiceNo ?? s.id,  render: (s) => s.invoiceNo ?? s.id.slice(0, 8) },
  { key: 'completedAt', label: 'Date/Time', sortValue: (s) => s.completedAt,        render: (s) => new Date(s.completedAt).toLocaleString() },
  { key: 'lines',       label: 'Items',     numeric: true,                           render: (s) => s.lines.length },
  { key: 'subtotal',    label: 'Subtotal',  numeric: true, sortValue: (s) => s.subtotal, render: (s) => money(s.subtotal) },
  { key: 'tax',         label: 'Tax',       numeric: true,                           render: (s) => money(s.tax) },
  { key: 'total',       label: 'Total',     numeric: true, sortValue: (s) => s.total,    render: (s) => <strong>{money(s.total)}</strong> },
];

// Sales Report

export const SalesReportPageV2: FC = () => {
  const sales = useSales().filter((s) => !s.voided);

  const stats = useMemo(() => {
    const total = sales.reduce((sum, s) => sum + s.total, 0);
    const byDay = new Map<string, number>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      byDay.set(d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }), 0);
    }
    sales.forEach((s) => {
      const key = new Date(s.completedAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
      if (byDay.has(key)) byDay.set(key, (byDay.get(key) ?? 0) + s.total);
    });
    return { total, byDay, orderCount: sales.length };
  }, [sales]);

  return (
    <AdminPage title="Sales Report" subtitle="Bill-wise and day-wise sales analytics."
               breadcrumb={['Reports', 'Sales']}>
      <KPIRow>
        <KPICard label="Total Sales"      value={money(stats.total)}     accentColor="var(--app-brand-violet, #8b5cf6)" />
        <KPICard label="Order Count"      value={String(stats.orderCount)} accentColor="var(--app-info, #0ea5e9)" />
        <KPICard label="Avg. Bill Value"  value={money(stats.orderCount ? stats.total / stats.orderCount : 0)} accentColor="var(--app-success, #16a34a)" />
        <KPICard label="Days in Range"    value="30" accentColor="var(--app-warning, #f59e0b)" />
      </KPIRow>

      <ChartFrame title="Daily Sales - Last 30 Days" meta="TREND">
        <LineChart size="xl" fill
          labels={Array.from(stats.byDay.keys())}
          datasets={[{ label: 'Sales', data: Array.from(stats.byDay.values()) }]}
        />
      </ChartFrame>

      <h3 className={cls.sectionHeading}>Recent bills (latest 20)</h3>
      <DataTable
        data={[...sales].sort((a, b) => b.completedAt.localeCompare(a.completedAt)).slice(0, 20)}
        columns={SALE_COLUMNS}
        getKey={(s) => s.id}
        hidePagination
        emptyIcon="receipt"
        emptyTitle="No bills recorded yet"
        searchFn={(s, q) => (s.invoiceNo ?? s.id).toLowerCase().includes(q)}
      />
    </AdminPage>
  );
};

// Product Mix Report
export const ProductMixReportPageV2: FC = () => {
  const sales = useSales().filter((s) => !s.voided);

  const stats = useMemo(() => {
    const productSales = new Map<string, { qty: number; rev: number }>();
    sales.forEach((s) => {
      s.lines.forEach((l) => {
        const cur = productSales.get(l.name) ?? { qty: 0, rev: 0 };
        cur.qty += l.quantity;
        cur.rev += l.lineTotal;
        productSales.set(l.name, cur);
      });
    });
    const sorted = Array.from(productSales.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.rev - a.rev);
    return { top: sorted.slice(0, 10), all: sorted };
  }, [sales]);

  return (
    <AdminPage title="Product Mix Report" subtitle="Which items are moving the money."
               breadcrumb={['Reports', 'Product Mix']}>
      <ChartGrid>
        <ChartFrame title="Top 10 Items by Revenue" meta="TOP SELLERS">
          <BarChart horizontal size="xl"
            labels={stats.top.map((p) => p.name)}
            datasets={[{ label: 'Revenue', data: stats.top.map((p) => p.rev) }]}
          />
        </ChartFrame>
        <ChartFrame title="Top 10 by Units Sold" meta="VOLUME">
          <BarChart horizontal size="xl"
            labels={[...stats.top].sort((a, b) => b.qty - a.qty).map((p) => p.name)}
            datasets={[{ label: 'Units', data: [...stats.top].sort((a, b) => b.qty - a.qty).map((p) => p.qty) }]}
          />
        </ChartFrame>
      </ChartGrid>

      <h3 className={cls.sectionHeading}>Full breakdown ({stats.all.length} items)</h3>
      <DataTable
        data={stats.all.map((p, i) => ({ ...p, rank: i + 1 }))}
        columns={[
          { key: 'rank',    label: 'Rank',    sortValue: (r) => r.rank,    render: (r) => `#${r.rank}` },
          { key: 'name',    label: 'Item',    sortValue: (r) => r.name,    render: (r) => r.name },
          { key: 'qty',     label: 'Units',   numeric: true, sortValue: (r) => r.qty, render: (r) => r.qty },
          { key: 'rev',     label: 'Revenue', numeric: true, sortValue: (r) => r.rev, render: (r) => <strong>{money(r.rev)}</strong> },
        ]}
        getKey={(r) => r.name}
        searchFn={(r, q) => r.name.toLowerCase().includes(q)}
        searchPlaceholder="Search items…"
        emptyIcon="bag"
        emptyTitle={STRINGS.reports.noSalesData}
      />
    </AdminPage>
  );
};

// Hourly Sales Report
export const HourlyReportPageV2: FC = () => {
  const sales = useSales().filter((s) => !s.voided);

  const stats = useMemo(() => {
    const hourly = new Array<number>(24).fill(0);
    const hourlyCount = new Array<number>(24).fill(0);
    sales.forEach((s) => {
      const h = new Date(s.completedAt).getHours();
      hourly[h] += s.total;
      hourlyCount[h] += 1;
    });
    const peakHour = hourly.indexOf(Math.max(...hourly));
    return { hourly, hourlyCount, peakHour };
  }, [sales]);

  return (
    <AdminPage title="Hourly Sales Report" subtitle="When your customers actually spend."
               breadcrumb={['Reports', 'Hourly Sales']}>
      <KPIRow>
        <KPICard label="Peak Hour"       value={`${String(stats.peakHour).padStart(2, '0')}:00`} accentColor="var(--app-brand-violet, #8b5cf6)" />
        <KPICard label="Peak Hour Sales" value={money(stats.hourly[stats.peakHour] ?? 0)}       accentColor="var(--app-info, #0ea5e9)" />
        <KPICard label="Peak Hour Orders" value={String(stats.hourlyCount[stats.peakHour] ?? 0)} accentColor="var(--app-success, #16a34a)" />
      </KPIRow>
      <ChartFrame title="Revenue by Hour of Day" meta="24-HOUR HEATMAP">
        <BarChart size="xl"
          labels={Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`)}
          datasets={[{ label: 'Revenue', data: stats.hourly }]}
        />
      </ChartFrame>
      <ChartFrame title="Order Count by Hour" meta="VOLUME">
        <LineChart size="lg" fill
          labels={Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`)}
          datasets={[{ label: 'Orders', data: stats.hourlyCount }]}
        />
      </ChartFrame>
    </AdminPage>
  );
};

// Payment Modes Report
export const PaymentModesReportPage: FC = () => {
  const sales = useSales().filter((s) => !s.voided);

  const stats = useMemo(() => {
    const byMode = new Map<string, { amount: number; count: number }>();
    sales.forEach((s) => {
      const label = s.paymentMethod ?? 'Other';
      const cur = byMode.get(label) ?? { amount: 0, count: 0 };
      cur.amount += s.total;
      cur.count += 1;
      byMode.set(label, cur);
    });
    return Array.from(byMode.entries())
      .map(([mode, v]) => ({ mode, ...v }))
      .sort((a, b) => b.amount - a.amount);
  }, [sales]);

  const total = stats.reduce((s, r) => s + r.amount, 0);

  return (
    <AdminPage title="Payment Mode Report" subtitle="Cash vs UPI vs Card vs Wallet split."
               breadcrumb={['Reports', 'Payment Modes']}>
      <ChartGrid>
        <ChartFrame title="Amount by Payment Mode" meta="SPLIT">
          {stats.length > 0 ? (
            <DoughnutChart size="xl" labels={stats.map((s) => s.mode)} data={stats.map((s) => s.amount)} />
          ) : (
            <p className={cls.emptyHint}>{STRINGS.reports.noPaymentData}.</p>
          )}
        </ChartFrame>
        <ChartFrame title="Transactions per Mode" meta="COUNT">
          {stats.length > 0 ? (
            <BarChart size="xl"
              labels={stats.map((s) => s.mode)}
              datasets={[{ label: 'Count', data: stats.map((s) => s.count) }]}
            />
          ) : (
            <p className={cls.emptyHint}>{STRINGS.reports.noPaymentData}.</p>
          )}
        </ChartFrame>
      </ChartGrid>
      <DataTable
        data={stats.map((r) => ({ ...r, share: total ? `${((r.amount / total) * 100).toFixed(1)}%` : '—' }))}
        columns={[
          { key: 'mode',   label: 'Payment Mode',   sortValue: (r) => r.mode,   render: (r) => r.mode },
          { key: 'count',  label: 'Transactions',   numeric: true, sortValue: (r) => r.count,  render: (r) => r.count },
          { key: 'amount', label: 'Amount',         numeric: true, sortValue: (r) => r.amount, render: (r) => <strong>{money(r.amount)}</strong> },
          { key: 'share',  label: 'Share',          numeric: true,                              render: (r) => r.share },
        ]}
        getKey={(r) => r.mode}
        hidePagination
        emptyIcon="card"
        emptyTitle={STRINGS.reports.noPaymentData}
      />
    </AdminPage>
  );
};

// Cashier Report
export const CashierReportPageV2: FC = () => {
  const sales = useSales().filter((s) => !s.voided);

  const stats = useMemo(() => {
    const byCashier = new Map<string, { count: number; total: number }>();
    sales.forEach((s) => {
      const label = s.cashierName ?? s.cashierId ?? 'Unknown';
      const cur = byCashier.get(label) ?? { count: 0, total: 0 };
      cur.count += 1;
      cur.total += s.total;
      byCashier.set(label, cur);
    });
    return Array.from(byCashier.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.total - a.total);
  }, [sales]);

  return (
    <AdminPage title="Sales by Staff" subtitle="Who sold what, this period."
               breadcrumb={['Reports', 'Sales by Staff']}>
      <ChartFrame title="Sales by Cashier" meta="LEADERBOARD">
        {stats.length > 0 ? (
          <BarChart horizontal size="lg"
            labels={stats.map((s) => s.name)}
            datasets={[{ label: 'Sales', data: stats.map((s) => s.total) }]}
          />
        ) : (
          <p className={cls.emptyHint}>{STRINGS.reports.noCashierData}.</p>
        )}
      </ChartFrame>
      <DataTable
        data={stats}
        columns={[
          { key: 'name',  label: 'Cashier',  sortValue: (r) => r.name,  render: (r) => r.name },
          { key: 'count', label: 'Bills',    numeric: true, sortValue: (r) => r.count, render: (r) => r.count },
          { key: 'total', label: 'Sales',    numeric: true, sortValue: (r) => r.total, render: (r) => <strong>{money(r.total)}</strong> },
          { key: 'avg',   label: 'Avg Bill', numeric: true,                             render: (r) => money(r.total / r.count) },
        ]}
        getKey={(r) => r.name}
        hidePagination
        emptyIcon="user"
        emptyTitle={STRINGS.reports.noCashierData}
      />
    </AdminPage>
  );
};

// Tax Summary Report
export const TaxReportPageV2: FC = () => {
  const sales = useSales().filter((s) => !s.voided);

  const stats = useMemo(() => {
    const total     = sales.reduce((sum, s) => sum + s.total, 0);
    const subtotal  = sales.reduce((sum, s) => sum + s.subtotal, 0);
    const tax       = sales.reduce((sum, s) => sum + s.tax, 0);
    const cgst      = tax / 2;
    const sgst      = tax / 2;
    return { total, subtotal, tax, cgst, sgst };
  }, [sales]);

  return (
    <AdminPage title="Tax Summary Report" subtitle="GST liability breakdown (CGST + SGST)."
               breadcrumb={['Reports', 'Tax Summary']}>
      <KPIRow>
        <KPICard label="Taxable Value" value={money(stats.subtotal)} accentColor="var(--app-brand-violet, #8b5cf6)" />
        <KPICard label="Total Tax"     value={money(stats.tax)}      accentColor="var(--app-danger, #f43f5e)" />
        <KPICard label="CGST @ 2.5%"   value={money(stats.cgst)}     accentColor="var(--app-info, #0ea5e9)" />
        <KPICard label="SGST @ 2.5%"   value={money(stats.sgst)}     accentColor="var(--app-success, #16a34a)" />
        <KPICard label="Total Sales"   value={money(stats.total)}    accentColor="var(--app-warning, #f59e0b)" />
      </KPIRow>
      <ChartFrame title="Tax Composition" meta="CGST vs SGST">
        <DoughnutChart size="lg" labels={['CGST', 'SGST']} data={[stats.cgst, stats.sgst]} />
      </ChartFrame>
    </AdminPage>
  );
};

// Discount Usage Report
export const DiscountReportPageV2: FC = () => {
  const sales = useSales().filter((s) => !s.voided);
  const stats = useMemo(() => {
    const totalGross    = sales.reduce((sum, s) => sum + s.subtotal, 0);
    const totalDiscount = 0;   // Sale type has no discount field yet
    const withDiscount  = 0;
    return { totalGross, totalDiscount, withDiscount, pctBills: 0 };
  }, [sales]);

  return (
    <AdminPage title="Discount Usage Report" subtitle="How much money you're leaving on the table."
               breadcrumb={['Reports', 'Discount Usage']}>
      <KPIRow>
        <KPICard label="Bills with Discount" value={String(stats.withDiscount)} accentColor="var(--app-danger, #f43f5e)" />
        <KPICard label="Total Discount"      value={money(stats.totalDiscount)}  accentColor="var(--app-brand-violet, #8b5cf6)" />
        <KPICard label="Gross Value"         value={money(stats.totalGross)}     accentColor="var(--app-info, #0ea5e9)" />
        <KPICard label="Discount Rate"       value={`${stats.pctBills.toFixed(1)}% of bills`} accentColor="var(--app-success, #16a34a)" />
      </KPIRow>
    </AdminPage>
  );
};

// Wastage Report
export const WastageReportPageV2: FC = () => {
  const [rows, setRows] = useState<Array<{
    id: string; ingredientName?: string; quantity: number; costImpact: number; reason: string; reportedAt: string;
  }>>([]);
  useEffect(() => {
    let cancelled = false;
    db.wastage.toArray().then((data) => { if (!cancelled) setRows(data as never); });
    return () => { cancelled = true; };
  }, []);

  const totalCost = rows.reduce((s, r) => s + (r.costImpact ?? 0), 0);
  const byReason = new Map<string, number>();
  rows.forEach((r) => byReason.set(r.reason, (byReason.get(r.reason) ?? 0) + (r.costImpact ?? 0)));

  return (
    <AdminPage title="Wastage Report" subtitle="Where your food cost is leaking."
               breadcrumb={['Reports', 'Wastage']}>
      <KPIRow>
        <KPICard label="Wastage Events"   value={String(rows.length)} accentColor="var(--app-danger, #f43f5e)" />
        <KPICard label="Total Cost Impact" value={money(totalCost)}   accentColor="var(--app-brand-violet, #8b5cf6)" />
      </KPIRow>
      <ChartFrame title="Wastage Cost by Reason" meta="ROOT CAUSE">
        {byReason.size > 0 ? (
          <DoughnutChart size="lg"
            labels={Array.from(byReason.keys())}
            data={Array.from(byReason.values())} />
        ) : (
          <p className={cls.emptyHint}>{STRINGS.reports.noWastageData}.</p>
        )}
      </ChartFrame>
    </AdminPage>
  );
};
