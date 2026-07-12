// AuditContext — vendor-scope action log.

// Immutable audit log for impersonation/suspension/deletion/vendor login. Live-queried, cross-tab.

// In a real backend this table would be append-only + server-signed;
// here it's just a Dexie table that anyone with DB access can nuke.
import { createContext, useCallback, useContext, useMemo, type FC, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@billing/shared/lib/db';
import type { AuditEntry, VendorAction } from '@billing/shared/domain/types';

interface AuditContextValue {
  readonly entries: readonly AuditEntry[];
  readonly log: (params: {
    actorUsername: string;
    action: VendorAction;
    targetStoreId: string;
    detail?: string;
  }) => Promise<void>;
  readonly clear: () => Promise<void>;
}

const AuditContext = createContext<AuditContextValue | null>(null);

const uuid = (): string =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);

export const AuditProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const entries = useLiveQuery(
    async () => (await db.auditLog.orderBy('at').reverse().toArray()) ?? [],
    [],
    [] as AuditEntry[],
  ) ?? [];

  const log = useCallback<AuditContextValue['log']>(async (params) => {
    await db.auditLog.put({
      id: uuid(),
      at: new Date().toISOString(),
      ...params,
    });
  }, []);

  const clear = useCallback(async () => { await db.auditLog.clear(); }, []);

  const value = useMemo(() => ({ entries, log, clear }), [entries, log, clear]);
  return <AuditContext.Provider value={value}>{children}</AuditContext.Provider>;
};

export const useAudit = (): AuditContextValue => {
  const ctx = useContext(AuditContext);
  if (!ctx) throw new Error('useAudit must be used within AuditProvider');
  return ctx;
};
