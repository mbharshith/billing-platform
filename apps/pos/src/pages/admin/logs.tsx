// Phase 11 - Logs viewer. Read-only view of the auditLog table.

import { useEffect, useState, type FC } from 'react';
import { AdminPage } from '@billing/ui/admin';
import { DataTable, type DataTableColumn } from '@billing/ui/molecules';
import { db } from '@billing/shared/lib/db';
import { fmtDateTime } from '@billing/shared/domain/format';
import cls from './admin.module.css';

interface AuditRow {
  id: string;
  at: string;
  actorUsername: string;
  targetStoreId: string;
  action: string;
  details?: string;
}

const COLUMNS: DataTableColumn<AuditRow>[] = [
  { key: 'at',            label: 'When',    sortValue: (r) => r.at,              render: (r) => fmtDateTime(r.at) },
  { key: 'actorUsername', label: 'Actor',   sortValue: (r) => r.actorUsername,   render: (r) => r.actorUsername },
  { key: 'action',        label: 'Action',  sortValue: (r) => r.action,          render: (r) => <code className={cls.actionCode}>{r.action}</code> },
  { key: 'targetStoreId', label: 'Store',   sortValue: (r) => r.targetStoreId,   render: (r) => r.targetStoreId || '—' },
  { key: 'details',       label: 'Details',                                       render: (r) => r.details ?? '' },
];

export const LogsPage: FC = () => {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [action, setAction] = useState<string>('all');

  useEffect(() => {
    let cancelled = false;
    db.auditLog.orderBy('at').reverse().limit(500).toArray().then((data) => {
      if (!cancelled) setRows(data as AuditRow[]);
    });
    return () => { cancelled = true; };
  }, []);

  const actions = Array.from(new Set(rows.map((r) => r.action))).sort();
  const actionFiltered = action === 'all' ? rows : rows.filter((r) => r.action === action);

  return (
    <AdminPage
      title="Audit Log"
      subtitle={`${rows.length} events recorded. Showing latest 500.`}
      breadcrumb={['Administration', 'Logs']}
    >
      <div className={cls.filterBar}>
        <select
          value={action} onChange={(e) => setAction(e.target.value)}
          className={cls.filterSelect}
        >
          <option value="all">All actions</option>
          {actions.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      <DataTable
        data={actionFiltered}
        columns={COLUMNS}
        getKey={(r) => r.id}
        searchPlaceholder="Search actor, action, or details…"
        searchFn={(r, q) =>
          r.actorUsername.toLowerCase().includes(q) ||
          r.action.toLowerCase().includes(q) ||
          (r.details ?? '').toLowerCase().includes(q)
        }
        emptyIcon="shield"
        emptyTitle="No audit events"
        emptyHint="Actions like login and admin changes appear here."
        emptySearchTitle="No events match"
        emptySearchHint="Try different keywords or clear the search."
      />
    </AdminPage>
  );
};
