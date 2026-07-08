/**
 * VendorConsole — SaaS-owner control plane.
 *
 * NEVER shown to tenant users (guarded by <VendorRoute>). Ships the three
 * cross-tenant screens every SaaS ops team needs before day one:
 *
 *   /vendor/dashboard  — cross-tenant KPIs (tenants, revenue processed,
 *                        top tenants by GMV, latest signups).
 *   /vendor/tenants    — every store. Suspend/reactivate, impersonate,
 *                        see per-store stats at a glance.
 *   /vendor/audit      — immutable log of every vendor action.
 *
 * These pages live in ONE file because they share a tiny custom shell
 * and each individual page is small. Splitting would trade file count
 * for readability, and the total is still comfortably under 600 lines.
 */
import { useEffect, useMemo, useRef, useState, type FC } from 'react';
import { NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import cls from '../components/layout/layout.module.css';
import { Badge, Button, Icon, Text } from '../components/atoms';
import { PageHeader } from '../components/layout/AppShell';
import { ConfirmDialog } from '../components/feedback';
import { STRINGS } from '../domain/strings';
import { fmtDate, fmtDateTime, formatMoney } from '../domain/format';
import { useAuth } from '../store/AuthContext';
import { useAudit } from '../store/AuditContext';
import { useStores } from '../store/StoresContext';
import { useToast } from '../store/ToastContext';
import type { AuditEntry, Sale, Store, User, VendorAction } from '../domain/types';
import { VENDOR_SCOPE } from '../domain/types';

/* -------------------------------------------------------------------------- */
/* Shell                                                                      */
/* -------------------------------------------------------------------------- */
/** Slim layout: brand + vendor nav + user menu. Deliberately visually
 *  distinct from the tenant shell (no store switcher, purple accent on the
 *  brand mark) so vendors always know they're in the control plane. */
export const VendorShell: FC = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { log } = useAudit();

  // Log vendor.login exactly once per session mount — tracks every time a
  // vendor lands in the console, whether via /login or a saved session.
  const loggedLoginRef = useRef(false);
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'vendor' || loggedLoginRef.current) return;
    loggedLoginRef.current = true;
    void log({
      actorUsername: currentUser.username,
      action: 'vendor.login',
      targetStoreId: VENDOR_SCOPE,
    });
  }, [currentUser, log]);

  if (!currentUser) return <Navigate to="/login" replace />;

  const handleLogout = async () => {
    await log({
      actorUsername: currentUser.username,
      action: 'vendor.logout',
      targetStoreId: VENDOR_SCOPE,
    });
    logout();
    toast.info(STRINGS.auth.loggedOut);
    navigate('/login', { replace: true });
  };

  return (
    <div className={cls.appShell}>
      <header className={cls.header}>
        <div className={cls.header__inner}>
          <div className={cls.brand}>
            <span
              className={cls.brand__mark}
              style={{ background: 'var(--app-purple, #6d28d9)' }}
              aria-hidden="true"
            >
              <Icon name="shield" size={20} />
            </span>
            <div className={cls.brand__text}>
              <Text size="lg" weight="heavy">{STRINGS.brand.name}</Text>
              <Text size="xs" weight="semibold" tone="primary" upper>Vendor Console</Text>
            </div>
          </div>

          <nav className={cls.nav} aria-label="Vendor navigation">
            <VNav to="/vendor/dashboard" icon="chart" label="Overview" />
            <VNav to="/vendor/tenants"   icon="store" label="Tenants" />
            <VNav to="/vendor/audit"     icon="shield" label="Audit log" />
          </nav>

          <button
            type="button"
            className={cls.userTrigger}
            onClick={handleLogout}
            aria-label="Log out"
          >
            <span className={cls.userAvatar} style={{ background: 'var(--app-purple, #6d28d9)' }}>
              {currentUser.name.slice(0, 2).toUpperCase()}
            </span>
            <span className={cls.userName}>{currentUser.name}</span>
            <Icon name="close" size={14} />
          </button>
        </div>
      </header>

      <main className={cls.appShell__main}><Outlet /></main>
    </div>
  );
};

const VNav: FC<{ to: string; icon: 'chart' | 'store' | 'shield'; label: string }> = ({
  to, icon, label,
}) => (
  <NavLink
    to={to}
    className={({ isActive }) => [cls.navLink, isActive && cls['navLink--active']].filter(Boolean).join(' ')}
  >
    <Icon name={icon} size={16} />
    <span>{label}</span>
  </NavLink>
);

/* -------------------------------------------------------------------------- */
/* Shared: cross-tenant queries                                               */
/* -------------------------------------------------------------------------- */
/** Roll up sales into per-tenant stats. Live-queried so KPIs stay fresh. */
const useTenantStats = (): ReadonlyMap<string, { revenue: number; sales: number; lastSaleAt: string | null }> => {
  const sales = useLiveQuery(() => db.sales.toArray(), [], [] as Sale[]) ?? [];

  return useMemo(() => {
    const map = new Map<string, { revenue: number; sales: number; lastSaleAt: string | null }>();
    for (const s of sales) {
      if (s.voided) continue;
      const cur = map.get(s.storeId) ?? { revenue: 0, sales: 0, lastSaleAt: null };
      cur.revenue += s.total ?? 0;
      cur.sales += 1;
      if (!cur.lastSaleAt || s.completedAt > cur.lastSaleAt) cur.lastSaleAt = s.completedAt;
      map.set(s.storeId, cur);
    }
    return map;
  }, [sales]);
};

/* -------------------------------------------------------------------------- */
/* /vendor/dashboard                                                          */
/* -------------------------------------------------------------------------- */
export const VendorDashboardPage: FC = () => {
  const { stores } = useStores();
  const stats = useTenantStats();
  const usersCount = useLiveQuery(() => db.users.count(), [], 0) ?? 0;
  const customersCount = useLiveQuery(() => db.customers.count(), [], 0) ?? 0;

  const tenantsExVendor = stores.filter((s) => s.id !== VENDOR_SCOPE);
  const activeTenants = tenantsExVendor.filter((s) => s.status !== 'suspended').length;
  const suspendedTenants = tenantsExVendor.length - activeTenants;

  // Revenue processed across the whole fleet (mixed currencies — we count units,
  // not FX-converted totals. Good enough for a demo KPI; real ops would convert.)
  const totalRevenueByCurrency = useMemo(() => {
    const byCur = new Map<string, number>();
    for (const s of tenantsExVendor) {
      const st = stats.get(s.id);
      if (!st) continue;
      byCur.set(s.currency, (byCur.get(s.currency) ?? 0) + st.revenue);
    }
    return byCur;
  }, [tenantsExVendor, stats]);

  const totalSales = Array.from(stats.values()).reduce((acc, v) => acc + v.sales, 0);

  const topTenants = useMemo(
    () => [...tenantsExVendor]
      .map((s) => ({ store: s, ...(stats.get(s.id) ?? { revenue: 0, sales: 0, lastSaleAt: null }) }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5),
    [tenantsExVendor, stats],
  );

  const recentSignups = useMemo(
    () => [...tenantsExVendor].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 5),
    [tenantsExVendor],
  );

  return (
    <>
      <PageHeader
        title="Fleet overview"
        subtitle="Cross-tenant metrics for the entire QuickBill SaaS."
      />

      <div className={cls['dash-grid'] ?? 'vendor-grid'} style={vendorGridStyle}>
        <Kpi label="Active tenants"    value={String(activeTenants)}    hint={`${suspendedTenants} suspended`} />
        <Kpi label="Total sales"       value={String(totalSales)}       hint="fleet-wide, excl. voided" />
        <Kpi label="Users"             value={String(usersCount)}       hint="admins + cashiers + vendor" />
        <Kpi label="Customers on file" value={String(customersCount)}   hint="fleet-wide" />
      </div>

      <section style={sectionStyle}>
        <Text as="h2" size="lg" weight="bold">Revenue processed (by currency)</Text>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
          {totalRevenueByCurrency.size === 0 && (
            <Text tone="subtle">No sales recorded yet.</Text>
          )}
          {[...totalRevenueByCurrency.entries()].map(([cur, amount]) => (
            <div key={cur} style={pillStyle}>
              <Text size="xs" tone="subtle" weight="semibold" upper>{cur}</Text>
              <Text size="xl" weight="heavy">{formatMoney(amount, cur)}</Text>
            </div>
          ))}
        </div>
      </section>

      <section style={sectionStyle}>
        <Text as="h2" size="lg" weight="bold">Top tenants by revenue</Text>
        {topTenants.length === 0 ? (
          <Text tone="subtle">No tenants yet.</Text>
        ) : (
          <table className="pt-2" style={tableStyle}>
            <thead>
              <tr>
                <th>Tenant</th>
                <th>Status</th>
                <th className="numeric">Sales</th>
                <th className="numeric">Revenue</th>
                <th>Last sale</th>
              </tr>
            </thead>
            <tbody>
              {topTenants.map(({ store, revenue, sales, lastSaleAt }) => (
                <tr key={store.id}>
                  <td><strong>{store.name}</strong><br/><Text size="xs" tone="subtle">{store.city}</Text></td>
                  <td><StatusPill status={store.status} /></td>
                  <td className="numeric">{sales}</td>
                  <td className="numeric">{formatMoney(revenue, store.currency)}</td>
                  <td>{lastSaleAt ? fmtDateTime(lastSaleAt) : <Text tone="subtle">—</Text>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section style={sectionStyle}>
        <Text as="h2" size="lg" weight="bold">Recent signups</Text>
        {recentSignups.length === 0 ? (
          <Text tone="subtle">No tenants have signed up yet.</Text>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: '0.5rem 0 0', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {recentSignups.map((s) => (
              <li key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', border: '1px solid var(--app-border)', borderRadius: 'var(--radius-md)' }}>
                <div>
                  <strong>{s.name}</strong>{' '}
                  <Text size="xs" tone="subtle">· {s.city} · {s.currency}</Text>
                </div>
                <Text size="xs" tone="subtle">joined {fmtDate(s.createdAt)}</Text>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
};

/* -------------------------------------------------------------------------- */
/* /vendor/tenants                                                            */
/* -------------------------------------------------------------------------- */
export const VendorTenantsPage: FC = () => {
  const { stores, setStatus } = useStores();
  const stats = useTenantStats();
  const users = useLiveQuery(() => db.users.toArray(), [], [] as User[]) ?? [];
  const { log } = useAudit();
  const { loginAs, currentUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [confirmSuspend, setConfirmSuspend] = useState<Store | null>(null);

  const tenantsExVendor = stores.filter((s) => s.id !== VENDOR_SCOPE);
  const adminByStoreId = useMemo(() => {
    const m = new Map<string, User>();
    for (const u of users) if (u.role === 'admin') m.set(u.storeId, u);
    return m;
  }, [users]);

  const doSuspend = async (store: Store) => {
    await setStatus(store.id, 'suspended');
    await log({
      actorUsername: currentUser?.username ?? 'unknown',
      action: 'tenant.suspend',
      targetStoreId: store.id,
      detail: store.name,
    });
    toast.success(`${store.name} suspended. Their users can no longer sign in.`);
    setConfirmSuspend(null);
  };

  const doReactivate = async (store: Store) => {
    await setStatus(store.id, 'active');
    await log({
      actorUsername: currentUser?.username ?? 'unknown',
      action: 'tenant.reactivate',
      targetStoreId: store.id,
      detail: store.name,
    });
    toast.success(`${store.name} reactivated.`);
  };

  const doImpersonate = async (store: Store) => {
    const admin = adminByStoreId.get(store.id);
    if (!admin) {
      toast.error(`No admin found for ${store.name} — cannot impersonate.`);
      return;
    }
    await log({
      actorUsername: currentUser?.username ?? 'unknown',
      action: 'tenant.impersonate',
      targetStoreId: store.id,
      detail: `as ${admin.username} (${admin.name})`,
    });
    // Strip password from the User to build a SessionUser.
    const { password: _pw, ...session } = admin;
    void _pw;
    loginAs(session);
    toast.info(`You are now signed in as ${admin.name} at ${store.name}.`);
    navigate('/dashboard', { replace: true });
  };

  return (
    <>
      <PageHeader
        title="Tenants"
        subtitle={`${tenantsExVendor.length} store${tenantsExVendor.length === 1 ? '' : 's'} \u00b7 suspend, reactivate, or impersonate as their admin`}
      />

      {tenantsExVendor.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center' }}>
          <Text tone="subtle">No tenants have signed up yet.</Text>
        </div>
      ) : (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th>Tenant</th>
              <th>Admin</th>
              <th>Status</th>
              <th className="numeric">Sales</th>
              <th className="numeric">Revenue</th>
              <th>Joined</th>
              <th className="actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tenantsExVendor.map((store) => {
              const st = stats.get(store.id) ?? { revenue: 0, sales: 0, lastSaleAt: null };
              const admin = adminByStoreId.get(store.id);
              const suspended = store.status === 'suspended';
              return (
                <tr key={store.id}>
                  <td>
                    <strong>{store.name}</strong>
                    <br />
                    <Text size="xs" tone="subtle">{store.city} · {store.currency}</Text>
                  </td>
                  <td>
                    {admin ? (
                      <><strong>{admin.name}</strong><br/><Text size="xs" tone="subtle">{admin.username}</Text></>
                    ) : (
                      <Text size="xs" tone="subtle">— no admin —</Text>
                    )}
                  </td>
                  <td><StatusPill status={store.status} /></td>
                  <td className="numeric">{st.sales}</td>
                  <td className="numeric">{formatMoney(st.revenue, store.currency)}</td>
                  <td>{fmtDate(store.createdAt)}</td>
                  <td className="actions" style={{ whiteSpace: 'nowrap' }}>
                    <Button
                      variant="secondary"
                      size="sm"
                      leadingIcon="user"
                      onClick={() => doImpersonate(store)}
                      disabled={!admin || suspended}
                    >
                      Impersonate
                    </Button>{' '}
                    {suspended ? (
                      <Button variant="primary" size="sm" leadingIcon="check" onClick={() => doReactivate(store)}>
                        Reactivate
                      </Button>
                    ) : (
                      <Button variant="danger" size="sm" leadingIcon="lock" onClick={() => setConfirmSuspend(store)}>
                        Suspend
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {confirmSuspend && (
        <ConfirmDialog
          title={`Suspend ${confirmSuspend.name}?`}
          message="All users of this tenant will be blocked from signing in until you reactivate. Their data is preserved."
          confirmLabel="Suspend"
          danger
          onConfirm={() => void doSuspend(confirmSuspend)}
          onCancel={() => setConfirmSuspend(null)}
        />
      )}
    </>
  );
};

/* -------------------------------------------------------------------------- */
/* /vendor/audit                                                              */
/* -------------------------------------------------------------------------- */
const ACTION_LABEL: Record<VendorAction, string> = {
  'tenant.suspend':      'Suspended tenant',
  'tenant.reactivate':   'Reactivated tenant',
  'tenant.impersonate':  'Impersonated tenant admin',
  'tenant.delete':       'Deleted tenant',
  'vendor.login':        'Vendor signed in',
  'vendor.logout':       'Vendor signed out',
};

const ACTION_VARIANT: Record<VendorAction, 'neutral' | 'primary' | 'danger' | 'success'> = {
  'tenant.suspend':      'danger',
  'tenant.reactivate':   'success',
  'tenant.impersonate':  'primary',
  'tenant.delete':       'danger',
  'vendor.login':        'neutral',
  'vendor.logout':       'neutral',
};

export const VendorAuditPage: FC = () => {
  const { entries, clear } = useAudit();
  const { stores } = useStores();
  const [confirmClear, setConfirmClear] = useState(false);
  const toast = useToast();

  const storeName = (id: string): string => {
    if (id === VENDOR_SCOPE) return '(vendor self)';
    return stores.find((s) => s.id === id)?.name ?? `<deleted store ${id.slice(0, 6)}>`;
  };

  return (
    <>
      <PageHeader
        title="Audit log"
        subtitle="Every vendor action, newest first. Immutable in production; local-only in this demo."
        actions={
          <Button
            variant="secondary"
            leadingIcon="trash"
            onClick={() => setConfirmClear(true)}
            disabled={entries.length === 0}
          >
            Clear log
          </Button>
        }
      />

      {entries.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center' }}>
          <Text tone="subtle">No vendor actions recorded yet.</Text>
        </div>
      ) : (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th>When</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Target</th>
              <th>Detail</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e: AuditEntry) => (
              <tr key={e.id}>
                <td>{fmtDateTime(e.at)}</td>
                <td>{e.actorUsername}</td>
                <td><Badge variant={ACTION_VARIANT[e.action]}>{ACTION_LABEL[e.action]}</Badge></td>
                <td>{storeName(e.targetStoreId)}</td>
                <td>{e.detail ?? <Text tone="subtle">—</Text>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {confirmClear && (
        <ConfirmDialog
          title="Clear the entire audit log?"
          message="This will delete every recorded vendor action. In production this action would itself be audited — here it's a demo convenience."
          confirmLabel="Clear log"
          danger
          onConfirm={async () => {
            await clear();
            setConfirmClear(false);
            toast.info('Audit log cleared.');
          }}
          onCancel={() => setConfirmClear(false)}
        />
      )}
    </>
  );
};

/* -------------------------------------------------------------------------- */
/* Local UI primitives                                                        */
/* -------------------------------------------------------------------------- */
const Kpi: FC<{ label: string; value: string; hint?: string }> = ({ label, value, hint }) => (
  <div style={kpiStyle}>
    <Text size="xs" tone="subtle" weight="semibold" upper>{label}</Text>
    <Text size="2xl" weight="heavy">{value}</Text>
    {hint && <Text size="xs" tone="subtle">{hint}</Text>}
  </div>
);

const StatusPill: FC<{ status: 'active' | 'suspended' }> = ({ status }) => (
  <Badge variant={status === 'active' ? 'success' : 'danger'}>
    {status === 'active' ? 'Active' : 'Suspended'}
  </Badge>
);

/* Inline styles — Vendor console is small enough that a module.css would
   be more ceremony than clarity. All values pull from design tokens. */
const vendorGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: '0.75rem',
  marginBottom: '1.5rem',
};

const kpiStyle: React.CSSProperties = {
  padding: '1rem 1.25rem',
  background: 'var(--app-surface)',
  border: '1px solid var(--app-border)',
  borderRadius: 'var(--radius-md)',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
};

const sectionStyle: React.CSSProperties = {
  marginTop: '1.5rem',
  padding: '1rem 1.25rem',
  background: 'var(--app-surface)',
  border: '1px solid var(--app-border)',
  borderRadius: 'var(--radius-md)',
};

const pillStyle: React.CSSProperties = {
  padding: '0.75rem 1rem',
  background: 'var(--app-bg-alt)',
  border: '1px solid var(--app-border)',
  borderRadius: 'var(--radius-md)',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
  minWidth: '140px',
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  marginTop: '0.75rem',
  borderCollapse: 'collapse',
};
