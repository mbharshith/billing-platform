// SalesPage — all sales, filterable by date range / payment / status.
import { useMemo, useState, type FC } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import cls from './pages.module.css';
import { Badge, Button, Text } from '@billing/ui/atoms';
import {
  DataTable,
  DateRangeFilter,
  PaymentBadge,
  SearchBar,
  type DateRangeKey,
} from '@billing/ui/molecules';
import { PageHeader } from '@/CounterShell';
import { STRINGS } from '@billing/shared/domain/strings';
import { fmtDateTime } from '@billing/shared/domain/format';
import { useMoney } from '@billing/shared/hooks/useMoney';
import { resolveDateWindow } from '@billing/shared/domain/dateRange';
import { useAuth } from '@billing/shared/store/AuthContext';
import { useSales } from '@billing/shared/store/SalesContext';
import type { PaymentMethod } from '@billing/shared/domain/types';

type PaymentFilter = 'all' | PaymentMethod;
type StatusFilter  = 'all' | 'active' | 'voided';

export const SalesPage: FC = () => {
  const { slug = '' } = useParams<{ slug: string }>();
  const { money } = useMoney();
  const { sales } = useSales();
  const { can } = useAuth();
  const canSeeAllTime = can('sale:viewAllTime');
  const navigate = useNavigate();

  const [query,   setQuery]   = useState('');
  const [payment, setPayment] = useState<PaymentFilter>('all');
  const [status,  setStatus]  = useState<StatusFilter>('all');
  const [dateRange, setDateRange] = useState<DateRangeKey>(canSeeAllTime ? 'all' : 'today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo,   setCustomTo]   = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const window = resolveDateWindow(dateRange, new Date(), customFrom, customTo);

    return sales.filter((s) => {
      if (window) {
        const t = new Date(s.completedAt).getTime();
        if (t < window.from || t >= window.to) return false;
      }
      if (payment !== 'all' && s.paymentMethod !== payment) return false;
      if (status === 'active' && s.voided) return false;
      if (status === 'voided' && !s.voided) return false;
      if (q) {
        const hit =
          s.invoiceNo.toLowerCase().includes(q) ||
          (s.customerMobile ?? '').includes(q) ||
          s.cashierName.toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [sales, query, payment, status, dateRange, customFrom, customTo]);

  const totals = useMemo(() => {
    let revenue = 0, units = 0;
    for (const s of filtered) {
      if (s.voided) continue;
      revenue += s.total;
      units   += s.unitCount;
    }
    return { revenue, units, count: filtered.filter((s) => !s.voided).length };
  }, [filtered]);

  const chip = (label: string, active: boolean, onClick: () => void) => (
    <Button variant={active ? 'primary' : 'secondary'} size="sm" onClick={onClick}>
      {label}
    </Button>
  );

  return (
    <>
      <PageHeader
        title={STRINGS.sales.pageTitle}
        subtitle={canSeeAllTime ? STRINGS.sales.pageSubtitle : "Today's sales rung up at your terminal."}
      />

      <div className={cls.card}>
        <div className={cls.toolbar}>
          <div className={cls.toolbar__search}>
            <SearchBar
              value={query}
              onChange={setQuery}
              placeholder="Search by invoice, customer mobile, cashier…"
              clearLabel="Clear search"
            />
          </div>

          {canSeeAllTime && (
            <DateRangeFilter
              value={dateRange}
              onChange={setDateRange}
              customFrom={customFrom}
              customTo={customTo}
              onCustomFromChange={setCustomFrom}
              onCustomToChange={setCustomTo}
            />
          )}

          <div className={cls.toolbar__filters}>
            {chip(STRINGS.sales.filterAll,     payment === 'all',     () => setPayment('all'))}
            {chip(STRINGS.sales.filterCash,    payment === 'cash',    () => setPayment('cash'))}
            {chip(STRINGS.sales.filterCard,    payment === 'card',    () => setPayment('card'))}
            {chip(STRINGS.sales.filterLending, payment === 'lending', () => setPayment('lending'))}
      {chip(STRINGS.sales.filterActive,  status  === 'active',  () => setStatus(status === 'active' ? 'all' : 'active'))}
            {chip(STRINGS.sales.filterVoided,  status  === 'voided',  () => setStatus(status === 'voided' ? 'all' : 'voided'))}
          </div>
        </div>

        <div className={cls.statsBar}>
          <Text size="sm">
            <b>{totals.count.toLocaleString()}</b> sales
            {' \u00b7 '}<b>{totals.units.toLocaleString()}</b> units
            {' \u00b7 '}<b>{money(totals.revenue)}</b> revenue
          </Text>
        </div>

        <DataTable
          flush
          data={filtered}
          getKey={(s) => s.id}
          onRowClick={(s) => navigate(`/${slug}/cashier/sales/${s.id}`)}
          defaultPageSize={25}
          emptyIcon="receipt"
          emptyTitle={sales.length === 0 ? STRINGS.sales.empty : 'No sales match your filters'}
          emptyHint={sales.length === 0 ? STRINGS.sales.emptyHint : 'Try widening the date range or payment filters.'}
          columns={[
            {
              key: 'invoice',
              label: 'Invoice',
              sortValue: (s) => s.invoiceNo,
              render: (s) => <Text weight="semibold" size="sm" tone="primary">{s.invoiceNo}</Text>,
            },
            {
              key: 'date',
              label: 'Date & time',
              sortValue: (s) => s.completedAt,
              render: (s) => <Text size="sm" tone="subtle">{fmtDateTime(s.completedAt)}</Text>,
            },
            {
              key: 'items',
              label: 'Items',
              numeric: true,
              sortValue: (s) => s.unitCount,
              render: (s) => <Text size="sm">{s.unitCount}</Text>,
            },
            {
              key: 'payment',
              label: 'Payment',
              render: (s) => <PaymentBadge method={s.paymentMethod} />,
            },
            {
              key: 'customer',
              label: 'Customer',
              render: (s) => (
                <Text size="sm" tone={s.customerMobile ? 'default' : 'muted'}>
                  {s.customerMobile ?? 'Walk-in'}
                </Text>
              ),
            },
            {
              key: 'cashier',
              label: 'Cashier',
              render: (s) => <Text size="sm" tone="subtle">{s.cashierName}</Text>,
            },
            {
              key: 'status',
              label: 'Status',
              render: (s) =>
                s.voided ? (
                  <Badge variant="danger">{STRINGS.sales.voidedBadge}</Badge>
                ) : (
                  <Badge variant="success">Complete</Badge>
                ),
            },
            {
              key: 'total',
              label: 'Total',
              numeric: true,
              sortValue: (s) => s.total,
              render: (s) => (
                <Text weight="bold" size="sm" tone={s.voided ? 'muted' : 'default'}>
                  {money(s.total)}
                </Text>
              ),
            },
            {
              key: 'actions',
              label: 'Actions',
              actions: true,
              render: (s) => (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); navigate(`/${slug}/cashier/sales/${s.id}`); }}
                >
                  {STRINGS.sales.view}
                </Button>
              ),
            },
          ]}
        />
      </div>
    </>
  );
};
