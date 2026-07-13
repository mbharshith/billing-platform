// Generic Dexie CRUD hook - the foundation for every TMBill admin page.
//
// Instead of writing 22 near-identical React Context providers (one per
// restaurant entity table), we expose ONE hook that takes a Dexie table +
// tenant filter and returns { rows, create, update, remove, setActive }.
//
// This is what lets Phase 1-7 ship as ~60 pages of ~40 lines each: the
// domain shape lives in @billing/shared/domain/restaurant, the seed data
// lives in @billing/shared/fixtures/restaurant, the persistence lives in
// db.ts, and the UI/CRUD wiring collapses to one hook call per page.
//
// LIMITATION: entities requiring cross-table joins (recipes -> ingredients,
// combos -> menu items) still expose custom render logic in the page itself.
// The hook is deliberately dumb - just row lifecycle. Anything smarter
// belongs in a dedicated Context (see e.g. SalesContext / ProductsContext).

import { useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { Table } from 'dexie';
import { db } from '@billing/shared/lib/db';
import { useAuth } from '@billing/shared/store/AuthContext';

// Minimum shape every TMBill entity satisfies. Not enforced on the hook
// generic (we accept `any` shape internally) - just documented here.
export interface TenantRow {
  readonly id: string;
  readonly storeId?: string;
  readonly active?: boolean;
  readonly createdAt: string;
}

export interface CrudApi<Row extends TenantRow> {
  readonly rows: readonly Row[];
  readonly loading: boolean;
  readonly create: (partial: Omit<Row, 'id' | 'createdAt' | 'storeId'>) => Promise<Row>;
  readonly update: (id: string, patch: Partial<Row>) => Promise<void>;
  readonly remove: (id: string) => Promise<void>;
  readonly setActive: (id: string, active: boolean) => Promise<void>;
}

// * Which Dexie tables are declared in the AppDB class.
type DbKey = {
  [K in keyof typeof db]: (typeof db)[K] extends Table<infer _R, string> ? K : never;
}[keyof typeof db];

// Bind a live CRUD API to a specific Dexie table. * *   const markets = useTable<Market>('markets'); *   const menuCats = useTable<MenuCategory>('menuCategories'); * * @param tableName    Dexie table name (typed against AppDB fields). * @param scopeStore   When true (default), scopes the live query to the *                     signed-in user's storeId. Set false for cross-tenant *                     tables like markets / brands.
export const useTable = <Row extends TenantRow>(
  tableName: DbKey,
  scopeStore = true,
): CrudApi<Row> => {
  const { currentStoreId } = useAuth();
  const table = db[tableName] as unknown as Table<Row, string>;

  // Live-query. When scopeStore=true, filter by storeId; else return all.
  // Dexie treats a returned undefined as "still loading"; we normalise to [].
  const rows = useLiveQuery(async () => {
    if (scopeStore) {
      // Not every table indexes storeId — fall back to a scan when needed.
      const hasStoreIdIndex = (table.schema.indexes ?? [])
        .some((ix) => ix.keyPath === 'storeId')
        || table.schema.primKey.keyPath === 'storeId';
      if (hasStoreIdIndex && currentStoreId) {
        return await table.where('storeId').equals(currentStoreId).toArray();
      }
      // Cross-tenant OR unindexed - full table read (fine for tiny config tables).
      return await table.toArray();
    }
    return await table.toArray();
  }, [tableName, currentStoreId, scopeStore]);

  const create = useCallback(
    async (partial: Omit<Row, 'id' | 'createdAt' | 'storeId'>): Promise<Row> => {
      const row = {
        ...partial,
        id: `${tableName}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        createdAt: new Date().toISOString(),
        ...(scopeStore && currentStoreId ? { storeId: currentStoreId } : {}),
      } as unknown as Row;
      await table.put(row);
      return row;
    },
    [table, tableName, scopeStore, currentStoreId],
  );

  const update = useCallback(
    async (id: string, patch: Partial<Row>): Promise<void> => {
      // Dexie's UpdateSpec is a mapped type that TS can't infer through our
      // generic constraint - one narrow cast is cleaner than fighting the
      // full inference chain.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await table.update(id, patch as any);
    },
    [table],
  );

  const remove = useCallback(
    async (id: string): Promise<void> => {
      await table.delete(id);
    },
    [table],
  );

  const setActive = useCallback(
    async (id: string, active: boolean): Promise<void> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await table.update(id, { active } as any);
    },
    [table],
  );

  return {
    rows: rows ?? [],
    loading: rows === undefined,
    create,
    update,
    remove,
    setActive,
  };
};
