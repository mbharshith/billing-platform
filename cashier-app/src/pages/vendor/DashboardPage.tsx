/**
 * /vendor/dashboard — fleet overview.
 *
 * Four color-accented KPI cards, revenue split by currency (we don't FX-
 * convert — mixing currencies would lie to the vendor), top tenants
 * leaderboard, and latest signups.
 */
import { useMemo, type FC } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import cls from './vendor.module.css';
import { Icon, Text } from '../../components/atoms';
import { db } from '../../lib/db';
import { fmtDate, fmtDateTime, formatMoney, formatMoneyCompact, formatNumberCompact, num } from '../../domain/format';
import { useStores } from '../../store/StoresContext';
import { VENDOR_SCOPE } from '../../domain/types';
import { EmptyState, SectionCard, StatusPill, useTenantStats } from './hooks';

export const DashboardPage: FC = () => {
  const { stores } = useStores();
  const stats = useTenantStats();
  const usersCount     = useLiveQuery(() => db.users.count(),     [], 0) ?? 0;
  const customersCount = useLiveQuery(() => db.customers.count(), [], 0) ?? 0;

  const tenants = stores.filter((s) => s.id !== VENDOR_SCOPE);
  const active    = tenants.filter((s) => s.status !== 'suspended').length;
  const suspended = tenants.length - active;

  const totalSales = Array.from(stats.values()).reduce((acc, v) => acc + v.sales, 0);

  const revenueByCurrency = useMemo(() => {
    const byCur = new Map<string, number>();
    for (const s of tenants) {
      const st = stats.get(s.id);
      if (!st) continue;
      byCur.set(s.currency, (byCur.get(s.currency) ?? 0) + st.revenue);
    }
    return byCur;
  }, [tenants, stats]);

  const topTenants = useMemo(
    () => [...tenants]
      .map((s) => ({ store: s, ...(stats.get(s.id) ?? { revenue: 0, sales: 0, lastSaleAt: null }) }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5),
    [tenants, stats],
  );

  const recentSignups = useMemo(
    () => [...tenants].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 5),
    [tenants],
  );

  return (
    <>
      <div className={cls.pageHead}>
        <div>
          <h1>Fleet overview</h1>
          <p>Cross-tenant metrics for the entire QuickBill SaaS.</p>
        </div>
      </div>

      <div className={cls.kpiGrid}>
        <KpiCard tone="indigo"  label="Active tenants"
                 value={formatNumberCompact(active)}       fullValue={num(active)}
                 hint={`${suspended} suspended`} icon="store" />
        <KpiCard tone="emerald" label="Total sales"
                 value={formatNumberCompact(totalSales)}   fullValue={num(totalSales)}
                 hint="fleet-wide, excl. voided" icon="chart" />
        <KpiCard tone="amber"   label="Users"
                 value={formatNumberCompact(usersCount)}   fullValue={num(usersCount)}
                 hint="admins + cashiers + vendor" icon="user" />
        <KpiCard tone="purple"  label="Customers on file"
                 value={formatNumberCompact(customersCount)} fullValue={num(customersCount)}
                 hint="fleet-wide" icon="user" />
      </div>

      <SectionCard title="Revenue processed" subtitle="Grouped by tenant currency — we don't FX-convert.">
        {revenueByCurrency.size === 0 ? (
          <Text tone="subtle">No sales recorded yet.</Text>
        ) : (
          <div className={cls.pillRow}>
            {[...revenueByCurrency.entries()].map(([cur, amount]) => (
              <div
                key={cur} className={cls.pill}
                title={formatMoney(amount, cur)}
                aria-label={`${cur} revenue: ${formatMoney(amount, cur)}`}
              >
                <div className={cls.pillLabel}>{cur}</div>
                <div className={cls.pillValue}>{formatMoneyCompact(amount, cur)}</div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Top tenants by revenue" subtitle="Ranked in each tenant's native currency.">
        {topTenants.length === 0 ? (
          <EmptyState title="No tenants yet" hint="Onboard your first customer from the Tenants tab." />
        ) : (
          <div className={cls.tableWrap} style={{ border: 'none' }}>
            <table className={cls.table}>
              <thead>
                <tr>
                  <th>Tenant</th>
                  <th>Status</th>
                  <th className={cls.numeric}>Sales</th>
                  <th className={cls.numeric}>Revenue</th>
                  <th>Last sale</th>
                </tr>
              </thead>
              <tbody>
                {topTenants.map(({ store, revenue, sales, lastSaleAt }) => (
                  <tr key={store.id}>
                    <td>
                      <div className={cls.rowMain}>{store.name}</div>
                      <div className={cls.rowSub}>{store.city} · {store.currency}</div>
                    </td>
                    <td><StatusPill status={store.status} /></td>
                    <td className={cls.numeric}>{sales}</td>
                    <td className={cls.numeric}>{formatMoney(revenue, store.currency)}</td>
                    <td className={cls.rowSub}>
                      {lastSaleAt ? fmtDateTime(lastSaleAt) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Recent signups" subtitle="Latest tenants provisioned by you.">
        {recentSignups.length === 0 ? (
          <Text tone="subtle">No tenants yet.</Text>
        ) : (
          <ul className={cls.signupList}>
            {recentSignups.map((s) => (
              <li key={s.id} className={cls.signupItem}>
                <div>
                  <strong>{s.name}</strong>{' '}
                  <Text size="xs" tone="subtle">· {s.city} · {s.currency}</Text>
                </div>
                <Text size="xs" tone="subtle">joined {fmtDate(s.createdAt)}</Text>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </>
  );
};

interface KpiCardProps {
  readonly tone: 'indigo' | 'emerald' | 'amber' | 'rose' | 'purple';
  readonly label: string;
  readonly value: number | string;
  /** Optional exact value shown on hover (title + aria-label) when `value` is compacted. */
  readonly fullValue?: string;
  readonly hint?: string;
  readonly icon?: 'store' | 'chart' | 'user' | 'shield';
}

const KpiCard: FC<KpiCardProps> = ({ tone, label, value, fullValue, hint, icon }) => (
  <div className={[cls.kpi, cls[`kpi--${tone}`]].join(' ')}>
    {icon && (
      <span className={cls.kpiIcon} aria-hidden="true">
        <Icon name={icon} size={20} />
      </span>
    )}
    <div className={cls.kpiLabel}>{label}</div>
    <div
      className={cls.kpiValue}
      title={fullValue}
      aria-label={fullValue ? `${label}: ${fullValue}` : undefined}
    >
      {value}
    </div>
    {hint && <div className={cls.kpiHint}>{hint}</div>}
  </div>
);
