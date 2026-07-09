// /vendor/audit — immutable log of every vendor action.

// Filter by action kind, paginate, clear (in production this action would
// itself be audited — here it's a demo convenience).
import { useMemo, useState, type FC } from 'react';
import cls from '../vendor.module.css';
import { Badge, Button } from '@shared/atoms';
import { ConfirmDialog } from '@shared/feedback';
import { DataTable } from '@shared/molecules';
import { fmtDateTime } from '@shared/domain/format';
import { useAudit } from '@shared/store/AuditContext';
import { useStores } from '@shared/store/StoresContext';
import { useToast } from '@shared/store/ToastContext';
import { VENDOR_SCOPE, type VendorAction } from '@shared/domain/types';

const ACTION_LABEL: Record<VendorAction, string> = {
  'tenant.create':       'Onboarded tenant',
  'tenant.edit':         'Edited tenant',
  'tenant.suspend':      'Suspended tenant',
  'tenant.reactivate':   'Reactivated tenant',
  'tenant.impersonate':  'Impersonated admin',
  'tenant.delete':       'Deleted tenant',
  'vendor.login':        'Vendor signed in',
  'vendor.logout':       'Vendor signed out',
};

const ACTION_VARIANT: Record<VendorAction, 'neutral' | 'primary' | 'danger' | 'success'> = {
  'tenant.create':       'success',
  'tenant.edit':         'primary',
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
  { key: 'tenant.edit',        label: 'Edits' },
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

      <DataTable
        data={filtered}
        getKey={(e) => e.id}
        defaultPageSize={25}
        pageSizeOptions={[10, 25, 50, 100]}
        emptyIcon="shield"
        emptyTitle="No vendor actions recorded yet"
        emptyHint="Suspend, reactivate, impersonate, or onboard a tenant to see entries here."
        columns={[
          {
            key: 'when',
            label: 'When',
            sortValue: (e) => e.at,
            render: (e) => <span className={cls.rowSub}>{fmtDateTime(e.at)}</span>,
          },
          {
            key: 'actor',
            label: 'Actor',
            render: (e) => e.actorUsername,
          },
          {
            key: 'action',
            label: 'Action',
            render: (e) => (
              <Badge variant={ACTION_VARIANT[e.action]}>{ACTION_LABEL[e.action]}</Badge>
            ),
          },
          {
            key: 'target',
            label: 'Target',
            render: (e) => storeName(e.targetStoreId),
          },
          {
            key: 'detail',
            label: 'Detail',
            render: (e) => <span className={cls.rowSub}>{e.detail ?? '—'}</span>,
          },
        ]}
      />

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
