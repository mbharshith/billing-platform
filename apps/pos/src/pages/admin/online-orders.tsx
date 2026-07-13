// Online Orders - history + filter view of every online-channel sale.
//
// Complements Live Orders (in-flight kanban). This page lists ALL orders
// including delivered / cancelled with status + date + customer filters.
// Clicking a row expands an inline detail panel with status timeline
// + delivery address + line items.

import { useMemo, useState, type FC } from 'react';
import { AdminPage } from '@billing/ui/admin';
import { Badge, Button } from '@billing/ui/atoms';
import {
  DataTable, SearchBar, DateRangeFilter,
  type DataTableColumn, type DateRangeKey,
} from '@billing/ui/molecules';
import { useSales } from '@billing/shared/store/SalesContext';
import { useMoney } from '@billing/shared/hooks/useMoney';
import { fmtDateTime } from '@billing/shared/domain/format';
import { resolveDateWindow } from '@billing/shared/domain/dateRange';
import type { OrderStatus, Sale } from '@billing/shared/domain/types';
import cls from './admin.module.css';


const STATUS_LABELS: Readonly<Record<OrderStatus, string>> = {
  placed: 'New',
  confirmed: 'Confirmed',
  packing: 'Packing',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const STATUS_VARIANT: Readonly<Record<OrderStatus, 'neutral' | 'primary' | 'accent' | 'success' | 'danger'>> = {
  placed: 'primary',
  confirmed: 'primary',
  packing: 'accent',
  out_for_delivery: 'accent',
  delivered: 'success',
  cancelled: 'danger',
};

type StatusFilter = 'all' | OrderStatus;

// Detail panel - expanded row content

interface DetailProps { readonly sale: Sale; readonly money: (n: number) => string }

const OrderDetail: FC<DetailProps> = ({ sale, money }) => {
  const addr = sale.deliveryAddress;
  const history = sale.statusHistory ?? [];
  return (
    <div className={cls.detailPanel}>
      <div className={cls.detailPanel__section}>
        <span className={cls.detailPanel__label}>Customer</span>
        <span className={cls.detailPanel__value}>
          {sale.customerName ?? 'Guest'} &middot; {sale.customerMobile ?? 'no phone'}
        </span>
        {addr && (
          <>
            <span className={cls.detailPanel__label} style={{ marginTop: 8 }}>Delivery to</span>
            <span className={cls.detailPanel__value}>
              {addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}<br />
              {addr.city} - {addr.pincode}
              {addr.landmark && <><br /><em>Near {addr.landmark}</em></>}
            </span>
          </>
        )}
        {sale.customerNotes && (
          <>
            <span className={cls.detailPanel__label} style={{ marginTop: 8 }}>Notes from customer</span>
            <span className={cls.detailPanel__value}><em>{sale.customerNotes}</em></span>
          </>
        )}
      </div>
      <div className={cls.detailPanel__section}>
        <span className={cls.detailPanel__label}>Items ({sale.unitCount})</span>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
          {sale.lines.map((ln, i) => (
            <li key={i}>{ln.quantity} x {ln.name} - {money(ln.lineTotal)}</li>
          ))}
        </ul>
        <span className={cls.detailPanel__label} style={{ marginTop: 8 }}>Status timeline</span>
        <div className={cls.detailPanel__timeline}>
          {history.length === 0 && <em style={{ fontSize: 12 }}>No timeline recorded.</em>}
          {history.map((ev, i) => (
            <div key={i} className={cls.detailPanel__timelineRow}>
              <strong>{STATUS_LABELS[ev.status]}</strong>
              <span>{fmtDateTime(ev.at)}</span>
              <span>&middot; {ev.by}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Page

export const OnlineOrdersPage: FC = () => {
  const { sales } = useSales();
  const { money } = useMoney();

  const [query, setQuery]         = useState('');
  const [status, setStatus]       = useState<StatusFilter>('all');
  const [dateRange, setDateRange] = useState<DateRangeKey>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo,   setCustomTo]   = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const window = resolveDateWindow(dateRange, new Date(), customFrom, customTo);
    return sales.filter((s) => {
      if (s.channel !== 'online') return false;
      if (status !== 'all' && s.orderStatus !== status) return false;
      if (window) {
        const t = new Date(s.completedAt).getTime();
        if (t < window.from || t >= window.to) return false;
      }
      if (q) {
        const hay = `${s.invoiceNo} ${s.customerName ?? ''} ${s.customerMobile ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [sales, query, status, dateRange, customFrom, customTo]);

  const totals = useMemo(() => {
    const t = { count: filtered.length, revenue: 0 };
    for (const s of filtered) t.revenue += s.total;
    return t;
  }, [filtered]);

  const columns: DataTableColumn<Sale>[] = [
    { key: 'invoiceNo',   label: 'Order #',   sortValue: (s) => s.invoiceNo, render: (s) => s.invoiceNo },
    { key: 'completedAt', label: 'Placed',    sortValue: (s) => s.completedAt, render: (s) => fmtDateTime(s.completedAt) },
    { key: 'customer',    label: 'Customer',  render: (s) => s.customerName ?? 'Guest' },
    { key: 'mobile',      label: 'Phone',     render: (s) => s.customerMobile ?? '-' },
    { key: 'status',      label: 'Status',
      render: (s) => (
        <Badge variant={STATUS_VARIANT[s.orderStatus ?? 'placed']}>
          {STATUS_LABELS[s.orderStatus ?? 'placed']}
        </Badge>
      ),
    },
    { key: 'total', label: 'Total', numeric: true, sortValue: (s) => s.total, render: (s) => money(s.total) },
    { key: 'expand', label: '', actions: true,
      render: (s) => (
        <Button variant="ghost" size="sm"
          onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}>
          {expandedId === s.id ? 'Hide' : 'Details'}
        </Button>
      ),
    },
  ];

  return (
    <AdminPage
      title="Online Orders"
      subtitle="Every order placed through the customer storefront - filter, inspect, export."
      actions={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Badge variant="neutral">{totals.count} orders</Badge>
          <Badge variant="success">{money(totals.revenue)}</Badge>
        </div>
      }
    >
      <div className={cls.filterBar}>
        <SearchBar value={query} onChange={setQuery}
          placeholder="Search order #, name or phone"
          clearLabel="Clear search" />
        <select className={cls.filterSelect}
          value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)}>
          <option value="all">All statuses</option>
          {(Object.keys(STATUS_LABELS) as OrderStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
        <DateRangeFilter
          value={dateRange} onChange={setDateRange}
          customFrom={customFrom} customTo={customTo}
          onCustomFromChange={setCustomFrom} onCustomToChange={setCustomTo}
        />
      </div>

      {expandedId && (() => {
        const sale = filtered.find((s) => s.id === expandedId);
        return sale ? <OrderDetail sale={sale} money={money} /> : null;
      })()}

      <DataTable
        data={filtered}
        columns={columns}
        getKey={(s) => s.id}
        emptyTitle="No online orders yet"
        emptyHint="Once customers place orders from the storefront they'll show up here."
        emptySearchTitle="No matches"
        emptySearchHint="Try clearing filters or expanding the date range."
      />
    </AdminPage>
  );
};
