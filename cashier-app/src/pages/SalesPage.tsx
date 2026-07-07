/**
 * SalesPage — all sales, filter by payment method / voided status.
 */
import { useMemo, useState, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import cls from './pages.module.css';
import { Badge, Button, Text } from '../components/atoms';
import { PaymentBadge, SearchBar } from '../components/molecules';
import { PageHeader } from '../components/layout/AppShell';
import { STRINGS } from '../domain/strings';
import { fmtDateTime, money } from '../domain/format';
import { useSales } from '../store/SalesContext';
import type { PaymentMethod } from '../domain/types';

type PaymentFilter = 'all' | PaymentMethod;
type StatusFilter  = 'all' | 'active' | 'voided';

export const SalesPage: FC = () => {
  const { sales } = useSales();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [payment, setPayment] = useState<PaymentFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sales.filter((s) => {
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
  }, [sales, query, payment, status]);

  const totals = useMemo(() => {
    let revenue = 0, units = 0;
    for (const s of filtered) {
      if (s.voided) continue;
      revenue += s.total;
      units += s.unitCount;
    }
    return { revenue, units, count: filtered.filter((s) => !s.voided).length };
  }, [filtered]);

  const chip = (label: string, active: boolean, onClick: () => void) => (
    <Button variant={active ? 'primary' : 'ghost'} size="sm" onClick={onClick}>
      {label}
    </Button>
  );

  return (
    <>
      <PageHeader title={STRINGS.sales.pageTitle} subtitle={STRINGS.sales.pageSubtitle} />

      <div className={cls.card}>
        <div className={cls.toolbar}>
          <div className={cls.toolbar__search}>
            <SearchBar value={query} onChange={setQuery}
                       placeholder="Search by invoice, customer mobile, cashier…"
                       clearLabel="Clear search" />
          </div>
          <div className={cls.toolbar__filters}>
            {chip(STRINGS.sales.filterAll,     payment === 'all',     () => setPayment('all'))}
            {chip(STRINGS.sales.filterCash,    payment === 'cash',    () => setPayment('cash'))}
            {chip(STRINGS.sales.filterCard,    payment === 'card',    () => setPayment('card'))}
            {chip(STRINGS.sales.filterLending, payment === 'lending', () => setPayment('lending'))}
          </div>
          <div className={cls.toolbar__filters}>
            {chip(STRINGS.sales.filterActive,  status === 'active',   () => setStatus(status === 'active' ? 'all' : 'active'))}
            {chip(STRINGS.sales.filterVoided,  status === 'voided',   () => setStatus(status === 'voided' ? 'all' : 'voided'))}
          </div>
        </div>

        <div style={{
          padding: 'var(--wm-space-4) var(--wm-space-6)',
          display: 'flex', gap: 'var(--wm-space-6)', flexWrap: 'wrap',
          borderBottom: '1px solid var(--wm-border)',
        }}>
          <Text size="sm"><b>{totals.count}</b> sales · <b>{totals.units}</b> units · <b>{money(totals.revenue)}</b> revenue</Text>
        </div>

        {filtered.length === 0 ? (
          <div className={cls.cardBody}>
            <Text tone="subtle" center>
              {sales.length === 0 ? STRINGS.sales.empty : 'No sales match your filters.'}
            </Text>
            {sales.length === 0 && <Text size="sm" tone="subtle" center>{STRINGS.sales.emptyHint}</Text>}
          </div>
        ) : (
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
                {filtered.map((s) => (
                  <tr key={s.id} className={cls.clickable}
                      onClick={() => navigate(`/sales/${s.id}`)}>
                    <td><Text weight="semibold" size="sm" tone="primary">{s.invoiceNo}</Text></td>
                    <td><Text size="sm" tone="subtle">{fmtDateTime(s.completedAt)}</Text></td>
                    <td className="numeric"><Text size="sm">{s.unitCount}</Text></td>
                    <td><PaymentBadge method={s.paymentMethod} /></td>
                    <td><Text size="sm" tone={s.customerMobile ? 'default' : 'muted'}>{s.customerMobile ?? '—'}</Text></td>
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
                      <Button variant="ghost" size="sm"
                              onClick={(e) => { e.stopPropagation(); navigate(`/sales/${s.id}`); }}>
                        {STRINGS.sales.view}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
};
