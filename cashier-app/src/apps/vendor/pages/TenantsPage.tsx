// /vendor/tenants — the operational nerve center.

// Tenant management: search + status filter + pagination. Rows expose Impersonate + Suspend/Reactivate.
import { useMemo, useState, type FC } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import cls from '../vendor.module.css';
import { Button, Text } from '@shared/atoms';
import { ConfirmDialog } from '@shared/feedback';
import { DataTable } from '@shared/molecules';
import { StatusPill, useTenantStats } from '../hooks';
import { db } from '@shared/lib/db';
import { fmtDate, formatMoney } from '@shared/domain/format';
import { useAudit } from '@shared/store/AuditContext';
import { useAuth } from '@shared/store/AuthContext';
import { useStores } from '@shared/store/StoresContext';
import { useToast } from '@shared/store/ToastContext';
import { VENDOR_SCOPE, type Store, type User } from '@shared/domain/types';
import { CreateTenantModal } from './CreateTenantModal';
import { EditTenantModal } from './EditTenantModal';

type StatusFilter = 'all' | 'active' | 'suspended';

export const TenantsPage: FC = () => {
  const { stores, setStatus } = useStores();
  const stats = useTenantStats();
  const users = useLiveQuery(() => db.users.toArray(), [], [] as User[]) ?? [];
  const { log } = useAudit();
  const { loginAs, currentUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [confirmSuspend, setConfirmSuspend] = useState<Store | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Store | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const adminByStoreId = useMemo(() => {
    const m = new Map<string, User>();
    for (const u of users) if (u.role === 'admin') m.set(u.storeId, u);
    return m;
  }, [users]);

  // 1. exclude vendor sentinel.
  const tenantsAll = useMemo(
    () => stores.filter((s) => s.id !== VENDOR_SCOPE),
    [stores],
  );
  const activeCount    = tenantsAll.filter((s) => s.status !== 'suspended').length;
  const suspendedCount = tenantsAll.length - activeCount;

  // 2. apply status chip.
  const byStatus = useMemo(() => {
    if (statusFilter === 'all') return tenantsAll;
    return tenantsAll.filter((s) => (statusFilter === 'suspended' ? s.status === 'suspended' : s.status !== 'suspended'));
  }, [tenantsAll, statusFilter]);

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
    // Strip password to build a SessionUser.
    const { password: _pw, ...session } = admin;
    void _pw;
    loginAs(session);
    toast.info(`You are now signed in as ${admin.name} at ${store.name}.`);
    navigate('/dashboard', { replace: true });
  };

  return (
    <>
      <div className={cls.pageHead}>
        <div>
          <h1>Tenants</h1>
          <p>{tenantsAll.length} store{tenantsAll.length === 1 ? '' : 's'} · you are the only one who can onboard new ones.</p>
        </div>
        <Button variant="primary" leadingIcon="plus" onClick={() => setShowCreate(true)}>
          New tenant
        </Button>
      </div>

      <div className={cls.chipRow} role="tablist" aria-label="Filter by status">
        <FilterChip active={statusFilter === 'all'}       onClick={() => setStatusFilter('all')}       label="All"       count={tenantsAll.length} />
        <FilterChip active={statusFilter === 'active'}    onClick={() => setStatusFilter('active')}    label="Active"    count={activeCount} />
        <FilterChip active={statusFilter === 'suspended'} onClick={() => setStatusFilter('suspended')} label="Suspended" count={suspendedCount} />
      </div>

      <DataTable
        data={byStatus}
        getKey={(s) => s.id}
        searchPlaceholder="Search tenants by name, city, or admin…"
        searchFn={(s, q) => {
          const admin = adminByStoreId.get(s.id);
          return (
            s.name.toLowerCase().includes(q) ||
            s.city.toLowerCase().includes(q) ||
            (admin?.name.toLowerCase().includes(q) ?? false) ||
            (admin?.username.toLowerCase().includes(q) ?? false)
          );
        }}
        defaultPageSize={10}
        emptyIcon="store"
        emptyTitle="No tenants yet"
        emptyHint="Click 'New tenant' to onboard your first customer."
        emptySearchTitle="No tenants match your filters"
        emptySearchHint="Try clearing the search or picking a different status."
        columns={[
          {
            key: 'tenant',
            label: 'Tenant',
            sortValue: (s) => s.name,
            render: (s) => (
              <>
                <div className={cls.rowMain}>{s.name}</div>
                <div className={cls.rowSub}>{s.city} · {s.currency}</div>
              </>
            ),
          },
          {
            key: 'admin',
            label: 'Admin',
            render: (s) => {
              const admin = adminByStoreId.get(s.id);
              return admin ? (
                <>
                  <div className={cls.rowMain}>{admin.name}</div>
                  <div className={cls.rowSub}>{admin.username}</div>
                </>
              ) : (
                <Text size="xs" tone="subtle">— no admin —</Text>
              );
            },
          },
          {
            key: 'status',
            label: 'Status',
            render: (s) => <StatusPill status={s.status} />,
          },
          {
            key: 'sales',
            label: 'Sales',
            numeric: true,
            sortValue: (s) => stats.get(s.id)?.sales ?? 0,
            render: (s) => {
              const st = stats.get(s.id) ?? { revenue: 0, sales: 0 };
              return <Text size="sm">{st.sales}</Text>;
            },
          },
          {
            key: 'revenue',
            label: 'Revenue',
            numeric: true,
            sortValue: (s) => stats.get(s.id)?.revenue ?? 0,
            render: (s) => {
              const st = stats.get(s.id) ?? { revenue: 0, sales: 0 };
              return <Text size="sm">{formatMoney(st.revenue, s.currency)}</Text>;
            },
          },
          {
            key: 'joined',
            label: 'Joined',
            sortValue: (s) => s.createdAt,
            render: (s) => <span className={cls.rowSub}>{fmtDate(s.createdAt)}</span>,
          },
          {
            key: 'actions',
            label: 'Actions',
            actions: true,
            render: (store) => {
              const admin = adminByStoreId.get(store.id);
              const suspended = store.status === 'suspended';
              return (
                <>
                  <Button variant="secondary" size="sm" leadingIcon="edit"
                          onClick={(e) => { e.stopPropagation(); setEditing(store); }}>Edit</Button>
                  <Button variant="secondary" size="sm" leadingIcon="user"
                          onClick={(e) => { e.stopPropagation(); void doImpersonate(store); }}
                          disabled={!admin || suspended}>Sign in as</Button>
                  {suspended ? (
                    <Button variant="primary" size="sm" leadingIcon="check"
                            onClick={(e) => { e.stopPropagation(); void doReactivate(store); }}>Reactivate</Button>
                  ) : (
                    <Button variant="danger" size="sm" leadingIcon="lock"
                            onClick={(e) => { e.stopPropagation(); setConfirmSuspend(store); }}>Suspend</Button>
                  )}
                </>
              );
            },
          },
        ]}
      />

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

      {showCreate && <CreateTenantModal onClose={() => setShowCreate(false)} />}

      {editing && (
        <EditTenantModal
          store={editing}
          admin={adminByStoreId.get(editing.id)}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
};

const FilterChip: FC<{ active: boolean; onClick: () => void; label: string; count: number }> = ({
  active, onClick, label, count,
}) => (
  <button
    type="button"
    className={[cls.chip, active && cls.chipActive].filter(Boolean).join(' ')}
    onClick={onClick}
    aria-pressed={active}
  >
    {label}<span className={cls.chipCount}>{count}</span>
  </button>
);
