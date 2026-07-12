// Phase 11 - Logs viewer. Read-only view of the auditLog table.
// The audit log is populated by the auth flow + any admin action (planned).

import { useEffect, useState, type FC } from 'react';
import { AdminPage } from '@billing/ui/admin';
import { db } from '@billing/shared/lib/db';

interface AuditRow {
  id: string;
  at: string;
  actorUsername: string;
  targetStoreId: string;
  action: string;
  details?: string;
}

const fmtDateTime = (iso: string): string => new Date(iso).toLocaleString();

export const LogsPage: FC = () => {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [q, setQ] = useState('');
  const [action, setAction] = useState<string>('all');

  useEffect(() => {
    let cancelled = false;
    db.auditLog.orderBy('at').reverse().limit(500).toArray().then((data) => {
      if (!cancelled) setRows(data as AuditRow[]);
    });
    return () => { cancelled = true; };
  }, []);

  const actions = Array.from(new Set(rows.map((r) => r.action))).sort();
  const filtered = rows.filter((r) => {
    if (action !== 'all' && r.action !== action) return false;
    if (!q) return true;
    const qq = q.toLowerCase();
    return r.actorUsername.toLowerCase().includes(qq)
        || r.action.toLowerCase().includes(qq)
        || (r.details ?? '').toLowerCase().includes(qq);
  });

  return (
    <AdminPage
      title="Audit Log"
      subtitle={`${rows.length} events recorded. Showing latest 500.`}
      breadcrumb={['Administration', 'Logs']}
    >
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          type="search" value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Search actor / action / details..."
          style={{ flex: 1, minWidth: 220, padding: '8px 12px', borderRadius: 8,
                   border: '1px solid var(--border)', background: 'var(--surface)' }}
        />
        <select
          value={action} onChange={(e) => setAction(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8,
                   border: '1px solid var(--border)', background: 'var(--surface)' }}
        >
          <option value="all">All actions</option>
          {actions.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead style={{ background: 'var(--surface-sunken, #f8fafc)' }}>
            <tr>
              <th style={th}>When</th>
              <th style={th}>Actor</th>
              <th style={th}>Action</th>
              <th style={th}>Store</th>
              <th style={th}>Details</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} style={{ ...td, textAlign: 'center', color: 'var(--text-subtle)', padding: '32px' }}>
                No audit events match your filter.
              </td></tr>
            ) : filtered.map((r) => (
              <tr key={r.id} style={{ borderTop: '1px solid var(--border)' }}>
                <td style={td}>{fmtDateTime(r.at)}</td>
                <td style={td}>{r.actorUsername}</td>
                <td style={{ ...td, fontFamily: 'monospace', fontSize: 12 }}>{r.action}</td>
                <td style={td}>{r.targetStoreId || '-'}</td>
                <td style={{ ...td, color: 'var(--text-subtle)' }}>{r.details ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminPage>
  );
};

const th: React.CSSProperties = { textAlign: 'left', padding: '10px 12px', fontSize: 11, fontWeight: 700,
  letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-subtle)' };
const td: React.CSSProperties = { padding: '10px 12px', verticalAlign: 'top' };
