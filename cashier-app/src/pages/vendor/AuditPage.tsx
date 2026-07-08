/**
 * /vendor/audit — immutable log of every vendor action.
 *
 * Filter by action kind, paginate, clear (in production this action would
 * itself be audited — here it's a demo convenience).
 */
import { useMemo, useState, type FC } from 'react';
import cls from './vendor.module.css';
import { Badge, Button } from '../../components/atoms';
import { ConfirmDialog } from '../../components/feedback';
import { fmtDateTime } from '../../domain/format';
import { useAudit } from '../../store/AuditContext';
import { useStores } from '../../store/StoresContext';
import { useToast } from '../../store/ToastContext';
import { VENDOR_SCOPE, type AuditEntry, type VendorAction } from '../../domain/types';
import { EmptyState, Pagination, usePagination } from './hooks';

const ACTION_LABEL: Record<VendorAction, string> = {
  'tenant.create':       'Onboarded tenant',
  'tenant.suspend':      'Suspended tenant',
  'tenant.reactivate':   'Reactivated tenant',
  'tenant.impersonate':  'Impersonated admin',
  'tenant.delete':       'Deleted tenant',
  'vendor.login':        'Vendor signed in',
  'vendor.logout':       'Vendor signed out',
};

const ACTION_VARIANT: Record<VendorAction, 'neutral' | 'primary' | 'danger' | 'success'> = {
  'tenant.create':       'success',
  'tenant.suspend':      'danger',
  'tenant.reactivate':   'success',
  'tenant.impersonate':  'primary',
  'tenant.delete':       'danger',
  'vendor.login':        'neutral',
  'vendor.logout':       'neutral',
};

type ActionFilter = 'all' | VendorAction;

const FILTER_CHIPS: readonly { key: ActionFilter; label: string }[] = [
  { key: 'all',                label: 'All' },
  { key: 'tenant.create',      label: 'Onboards' },
  { key: 'tenant.suspend',     label: 'Suspends' },
  { key: 'tenant.reactivate',  label: 'Reactivates' },
  { key: 'tenant.impersonate', label: 'Impersonations' },
  { key: 'vendor.login',       label: 'Sign-ins' },
];

export const AuditPage: FC = () => {
  const { entries, clear } = useAudit();
  const { stores } = useStores();
  const toast = useToast();

  const [filter, setFilter] = useState<ActionFilter>('all');
  const [confirmClear, setConfirmClear] = useState(false);

  const storeName = (id: string): string => {
    if (id === VENDOR_SCOPE) return '(vendor self)';
    return stores.find((s) => s.id === id)?.name ?? `<deleted store ${id.slice(0, 6)}>`;
  };

  const filtered = useMemo(() => {
    if (filter === 'all') return entries;
    return entries.filter((e) => e.action === filter);
  }, [entries, filter]);

  const pager = usePagination(filtered, 25);

  // Chip counts for the toolbar (cheap to compute even at 10k entries).
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: entries.length };
    for (const e of entries) c[e.action] = (c[e.action] ?? 0) + 1;
    return c;
  }, [entries]);

  return (
    <>
      <div className={cls.pageHead}>
        <div>
          <h1>Audit log</h1>
          <p>Every vendor action, newest first. Immutable in production; local-only in this demo.</p>
        </div>
        <Button
          variant="secondary"
          leadingIcon="trash"
          onClick={() => setConfirmClear(true)}
          disabled={entries.length === 0}
        >
          Clear log
        </Button>
      </div>

      {entries.length === 0 ? (
        <EmptyState
          icon="shield"
          title="No vendor actions recorded yet"
          hint="Suspend, reactivate, impersonate, or onboard a tenant to see entries here."
        />
      ) : (
        <>
          <div className={cls.toolbar}>
            <div className={cls.chipRow} role="tablist" aria-label="Filter by action">
              {FILTER_CHIPS.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  className={[cls.chip, filter === chip.key && cls.chipActive].filter(Boolean).join(' ')}
                  onClick={() => setFilter(chip.key)}
                  aria-pressed={filter === chip.key}
                >
                  {chip.label}
                  <span className={cls.chipCount}>{counts[chip.key] ?? 0}</span>
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon="search"
              title="No entries match that filter"
              hint="Try 'All' to see everything."
            />
          ) : (
            <div className={cls.tableWrap}>
              <table className={cls.table}>
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
                  {pager.slice.map((e: AuditEntry) => (
                    <tr key={e.id}>
                      <td className={cls.rowSub}>{fmtDateTime(e.at)}</td>
                      <td>{e.actorUsername}</td>
                      <td><Badge variant={ACTION_VARIANT[e.action]}>{ACTION_LABEL[e.action]}</Badge></td>
                      <td>{storeName(e.targetStoreId)}</td>
                      <td className={cls.rowSub}>{e.detail ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination state={pager} noun="entries" pageSizes={[10, 25, 50, 100]} />
            </div>
          )}
        </>
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
