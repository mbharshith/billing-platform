// SalesPage — all sales, filterable by date range / payment / status,
// with pagination for large datasets.
import { useEffect, useMemo, useState, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import cls from './pages.module.css';
import { Badge, Button, Text } from '@shared/atoms';
import {
  DateRangeFilter, EmptyState, Pagination, PaymentBadge, SearchBar,
  type DateRangeKey,
} from '@shared/molecules';
import { PageHeader } from '@apps/counter/CounterShell';
import { STRINGS } from '@shared/domain/strings';
import { fmtDateTime } from '@shared/domain/format';
import { useMoney } from '@shared/hooks/useMoney';
import { resolveDateWindow } from '@shared/domain/dateRange';
import { useAuth } from '@shared/store/AuthContext';
import { useSales } from '@shared/store/SalesContext';
import type { PaymentMethod } from '@shared/domain/types';

type PaymentFilter = 'all' | PaymentMethod;
type StatusFilter  = 'all' | 'active' | 'voided';

const DEFAULT_PAGE_SIZE = 25;

export const SalesPage: FC = () => {
  const { money } = useMoney();
  const { sales } = useSales();
  const { can } = useAuth();
  const canSeeAllTime = can('sale:viewAllTime');
  const navigate = useNavigate();

  const [query,   setQuery]   = useState('');
  const [payment, setPayment] = useState<PaymentFilter>('all');
  const [status,  setStatus]  = useState<StatusFilter>('all');
  // Cashiers are locked to today — they never see other days' revenue.
  const [dateRange, setDateRange] = useState<DateRangeKey>(canSeeAllTime ? 'all' : 'today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo,   setCustomTo]   = useState('');

  const [page,     setPage]     = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  // Any filter change resets to page 1 so users don't get stranded on empty pages.
  useEffect(() => { setPage(1); }, [query, payment, status, dateRange, customFrom, customTo, pageSize]);

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

  const pageItems = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize],
  );

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
            {' · '}<b>{totals.units.toLocaleString()}</b> units
            {' · '}<b>{money(totals.revenue)}</b> revenue
          </Text>
        </div>

        {filtered.length === 0 ? (
          sales.length === 0 ? (
            <EmptyState
              icon="receipt"
              title={STRINGS.sales.empty}
              hint={STRINGS.sales.emptyHint}
            />
          ) : (
            <EmptyState
              icon="search"
              title="No sales match your filters"
              hint="Try widening the date range or payment filters."
            />
          )
        ) : (
          <>
            <div className={cls.tableWrap}>
              <table className={cls.table}>
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Date &amp; time</th>
                    <th className="numeric">Items</th>
                    <th>Payment</th>
                    <th>Customer</th>
                    <th>Cashier</th>
                    <th>Status</th>
                    <th className="numeric">Total</th>
                    <th className="actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((s) => (
                    <tr
                      key={s.id}
                      className={cls.clickable}
                      onClick={() => navigate(`/sales/${s.id}`)}
                    >
                      <td><Text weight="semibold" size="sm" tone="primary">{s.invoiceNo}</Text></td>
                      <td><Text size="sm" tone="subtle">{fmtDateTime(s.completedAt)}</Text></td>
                      <td className="numeric"><Text size="sm">{s.unitCount}</Text></td>
                      <td><PaymentBadge method={s.paymentMethod} /></td>
                      <td><Text size="sm" tone={s.customerMobile ? 'default' : 'muted'}>{s.customerMobile ?? 'Walk-in'}</Text></td>
                      <td><Text size="sm" tone="subtle">{s.cashierName}</Text></td>
                      <td>
                        {s.voided
                          ? <Badge variant="danger">{STRINGS.sales.voidedBadge}</Badge>
                          : <Badge variant="success">Complete</Badge>}
                      </td>
                      <td className="numeric">
                        <Text weight="bold" size="sm" tone={s.voided ? 'muted' : 'default'}>
                          {money(s.total)}
                        </Text>
                      </td>
                      <td className="actions">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); navigate(`/sales/${s.id}`); }}
                        >
                          {STRINGS.sales.view}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              page={page}
              pageSize={pageSize}
              totalItems={filtered.length}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </>
        )}
      </div>
    </>
  );
};
