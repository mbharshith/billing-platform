// StorePage — admin's read-only outlet info view. Store metadata is vendor-managed only.
import { useMemo, type FC } from 'react';
import { useParams } from 'react-router-dom';
import cls from './pages.module.css';
import { Badge, Icon, Text } from '@billing/ui/atoms';
import { BRAND } from '@billing/shared/brand';
import { PageHeader } from '../CounterShell';
import { STRINGS } from '@billing/shared/domain/strings';
import { fmtDate, formatNumberCompact, num } from '@billing/shared/domain/format';
import { useMoney } from '@billing/shared/hooks/useMoney';
import { useAuth } from '@billing/shared/store/AuthContext';
import { useCustomers } from '@billing/shared/store/CustomersContext';
import { useProducts } from '@billing/shared/store/ProductsContext';
import { useSales } from '@billing/shared/store/SalesContext';
import { useStores } from '@billing/shared/store/StoresContext';
import { useUsers } from '@billing/shared/store/UsersContext';

export const StorePage: FC = () => {
  const { money, moneyCompact } = useMoney();
  const { currentStoreId } = useAuth();
  const { byId } = useStores();
  const { slug = '' } = useParams<{ slug: string }>();
  const { users } = useUsers();
  const { products } = useProducts();
  const { customers } = useCustomers();
  const { sales } = useSales();

  const store = byId(currentStoreId);

  // Derive quick stats for THIS tenant only (contexts already scope by store).
  const stats = useMemo(() => {
    if (!store) return null;
    const staffCount    = users.filter((u) => u.storeId === store.id).length;
    const productCount  = products.length;
    const customerCount = customers.length;
    const revenue       = sales
      .filter((s) => !s.voided)
      .reduce((sum, s) => sum + s.total, 0);
    const lending       = customers.reduce((sum, c) => sum + c.lendingBalance, 0);
    return { staffCount, productCount, customerCount, revenue, lending };
  }, [store, users, products, customers, sales]);

  if (!store) {
    return <PageHeader title={STRINGS.store.pageTitle} subtitle={STRINGS.store.loadingTenant} />;
  }

  return (
    <>
      <PageHeader
        title={STRINGS.store.pageTitle}
        subtitle={STRINGS.store.pageSubtitle}
        breadcrumbs={[
          { label: STRINGS.nav.dashboard, href: `/${slug}/admin` },
          { label: STRINGS.store.pageTitle },
        ]}
      />

      {/* --- Identity card --------------------------------------------------- */}
      <div className={cls.card}>
        <div className={cls.cardBody}>
          <div className={cls.storeIdentity}>
            <div className={cls.storeIdentity__row}>
              <Text tone="subtle" size="xs" upper weight="semibold">Tenant name</Text>
              <Text size="xl" weight="heavy">{store.name}</Text>
            </div>
            <div className={cls.storeIdentity__grid}>
              <IdentityField label="City"      value={store.city    || '—'} icon="store" />
              <IdentityField label="Phone"     value={store.phone   || '—'} icon="user" />
              <IdentityField label="Address"   value={store.address || '—'} icon="store" />
              <IdentityField label="Tax rate"  value={`${(store.taxRate * 100).toFixed(2)}%`} icon="chart" />
              <IdentityField label="Currency"  value={store.currency} icon="coins" />
              <IdentityField label="Opened"    value={fmtDate(store.createdAt)} icon="receipt" />
            </div>
          </div>
        </div>
      </div>

      {/* --- Stats ---------------------------------------------------------- */}
      {stats && (
        <div className={cls.storeStats}>
          <StatCard label="Staff"        value={formatNumberCompact(stats.staffCount)}   fullValue={num(stats.staffCount)}   hint="users in this tenant" />
          <StatCard label="Products"     value={formatNumberCompact(stats.productCount)} fullValue={num(stats.productCount)} hint="items in the catalog" />
          <StatCard label="Customers"    value={formatNumberCompact(stats.customerCount)} fullValue={num(stats.customerCount)} hint="registered shoppers" />
          <StatCard label="Revenue"      value={moneyCompact(stats.revenue)}             fullValue={money(stats.revenue)}    hint="excludes voided sales" />
          <StatCard label="Lending owed" value={moneyCompact(stats.lending)}             fullValue={money(stats.lending)}    hint="buy-now-pay-later outstanding" />
        </div>
      )}

      {/* --- Vendor-owned notice ------------------------------------------- */}
      <div className={cls.isolationBanner}>
        <Icon name="lock" size={20} />
        <div>
          <Text weight="semibold">Store details are managed by your SaaS provider</Text>
          <Text size="sm" tone="subtle">
            Store name, address, tax rate, and currency changes ripple through
            every past invoice and analytic. To avoid silent data drift, only
            your provider can edit these. Ping them via the contact channel
            they gave you at onboarding.
          </Text>
        </div>
      </div>

      {/* --- Isolation banner ---------------------------------------------- */}
      <div className={cls.isolationBanner}>
        <Icon name="shield" size={20} />
        <div>
          <Text weight="semibold">Tenant-level isolation</Text>
          <Text size="sm" tone="subtle">
            Every product, customer, sale and staff record you see in {BRAND.name} is
            scoped to <Badge variant="primary">{store.name}</Badge>. No other tenant
            can read or modify your data — enforced end-to-end.
          </Text>
        </div>
      </div>
    </>
  );
};

/* -------------------------------------------------------------------------- */
/* Small local components                                                     */
/* -------------------------------------------------------------------------- */
const IdentityField: FC<{ label: string; value: string; icon: Parameters<typeof Icon>[0]['name'] }> =
  ({ label, value, icon }) => (
  <div className={cls.identityField}>
    <div className={cls.identityField__icon}><Icon name={icon} size={16} /></div>
    <div className={cls.identityField__body}>
      <Text tone="subtle" size="xs" upper weight="semibold">{label}</Text>
      <Text size="md">{value}</Text>
    </div>
  </div>
);

const StatCard: FC<{ label: string; value: string; hint: string; fullValue?: string }> = ({ label, value, hint, fullValue }) => (
  <div className={cls.statCard}>
    <Text tone="subtle" size="xs" upper weight="semibold">{label}</Text>
    <div
      className={cls.storeStat__value}
      title={fullValue}
      aria-label={fullValue ? `${label}: ${fullValue}` : undefined}
    >
      {value}
    </div>
    <Text tone="subtle" size="xs">{hint}</Text>
  </div>
);
