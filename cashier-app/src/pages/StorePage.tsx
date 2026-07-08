/**
 * StorePage — the Master's "my store" management page.
 *
 * Shows the tenant's identity (name, city, address, phone, tax, currency)
 * and lets the Master edit it in-place. Also displays quick stats about
 * the store: user count, product count, customer count, sales-to-date.
 *
 * SoD: only masters can access this route (guarded by <MasterRoute>).
 */
import { useMemo, useState, type FC, type FormEvent } from 'react';
import cls from './pages.module.css';
import { Badge, Button, Field, Icon, Input, Text } from '../components/atoms';
import { PageHeader } from '../components/layout/AppShell';
import { fmtDate } from '../domain/format';
import { useMoney } from '../hooks/useMoney';
import { useAuth } from '../store/AuthContext';
import { useCustomers } from '../store/CustomersContext';
import { useProducts } from '../store/ProductsContext';
import { useSales } from '../store/SalesContext';
import { useStores, type StoreInput } from '../store/StoresContext';
import { useToast } from '../store/ToastContext';
import { useUsers } from '../store/UsersContext';

export const StorePage: FC = () => {
  const { money } = useMoney();
  const { currentStoreId } = useAuth();
  const { byId, update } = useStores();
  const { users } = useUsers();
  const { products } = useProducts();
  const { customers } = useCustomers();
  const { sales } = useSales();
  const toast = useToast();

  const store = byId(currentStoreId);

  const [form, setForm] = useState<StoreInput | null>(null);

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
    return (
      <>
        <PageHeader title="My store" subtitle="Loading tenant…" />
      </>
    );
  }

  const openEdit = () => setForm({
    name: store.name, city: store.city, phone: store.phone,
    address: store.address, taxRate: store.taxRate, currency: store.currency,
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!form) return;
    const res = update(store.id, form);
    if (!res.ok) {
      toast.error(res.error === 'duplicateName'
        ? 'That name is already used by another tenant.'
        : 'Please fix the form and try again.');
      return;
    }
    toast.success('Store updated.');
    setForm(null);
  };

  return (
    <>
      <PageHeader
        title="My store"
        subtitle="Everything you see in this app belongs to this tenant only."
        actions={
          form
            ? null
            : <Button variant="primary" leadingIcon="shield" onClick={openEdit}>Edit store</Button>
        }
      />

      {/* --- Identity card --------------------------------------------------- */}
      <div className={cls.card}>
        <div className={cls.cardBody}>
          {form ? (
            <form onSubmit={handleSubmit} className={cls.formGrid}>
              <Field label="Store name" htmlFor="s-name" required>
                <Input id="s-name" required autoFocus value={form.name}
                       onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </Field>
              <Field label="City" htmlFor="s-city">
                <Input id="s-city" value={form.city}
                       onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </Field>
              <Field label="Phone" htmlFor="s-phone">
                <Input id="s-phone" value={form.phone}
                       onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </Field>
              <Field label="Address" htmlFor="s-addr">
                <Input id="s-addr" value={form.address}
                       onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </Field>
              <Field label="Tax rate (decimal)" htmlFor="s-tax"
                     hint="e.g. 0.18 for 18% GST, 0.0825 for 8.25% US sales tax">
                <Input id="s-tax" type="number" step="0.0001" min={0} value={form.taxRate}
                       onChange={(e) => setForm({ ...form, taxRate: Number(e.target.value) })} />
              </Field>
              <Field label="Currency (ISO 4217)" htmlFor="s-cur">
                <Input id="s-cur" value={form.currency} maxLength={3}
                       onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} />
              </Field>
              <div className={cls.formActions}>
                <Button variant="secondary" onClick={() => setForm(null)}>Cancel</Button>
                <Button variant="primary" type="submit" leadingIcon="check">Save store</Button>
              </div>
            </form>
          ) : (
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
          )}
        </div>
      </div>

      {/* --- Stats ---------------------------------------------------------- */}
      {stats && !form && (
        <div className={cls.storeStats}>
          <StatCard label="Staff"        value={String(stats.staffCount)}    hint="users in this tenant" />
          <StatCard label="Products"     value={String(stats.productCount)}  hint="items in the catalog" />
          <StatCard label="Customers"    value={String(stats.customerCount)} hint="registered shoppers" />
          <StatCard label="Revenue"      value={money(stats.revenue)}      hint="excludes voided sales" />
          <StatCard label="Lending owed" value={money(stats.lending)}      hint="buy-now-pay-later outstanding" />
        </div>
      )}

      {/* --- Isolation banner ---------------------------------------------- */}
      {!form && (
        <div className={cls.isolationBanner}>
          <Icon name="lock" size={20} />
          <div>
            <Text weight="semibold">Tenant-level isolation</Text>
            <Text size="sm" tone="subtle">
              Every product, customer, sale and staff record you see in QuickBill is
              scoped to <Badge variant="primary">{store.name}</Badge>. No other tenant
              can read or modify your data — enforced end-to-end.
            </Text>
          </div>
        </div>
      )}
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

const StatCard: FC<{ label: string; value: string; hint: string }> = ({ label, value, hint }) => (
  <div className={cls.statCard}>
    <Text tone="subtle" size="xs" upper weight="semibold">{label}</Text>
    <Text size="2xl" weight="heavy">{value}</Text>
    <Text tone="subtle" size="xs">{hint}</Text>
  </div>
);
