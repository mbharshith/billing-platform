/**
 * Vendor console shared primitives.
 *
 * Kept dead-simple:
 *   - `useTenantStats()` rolls per-tenant sales into one Map for KPIs.
 *   - `usePagination()` slices any readonly array into pages + resets to
 *     page 1 whenever the source array shrinks below the current page.
 *   - `Pagination` renders the standard bar (info + prev/next + numbered).
 *   - `StatusPill` and `SectionCard` keep JSX terse in the page files.
 *
 * Why a dedicated hook for pagination? Two pages need it (tenants +
 * audit) and the "clamp page when data shrinks" logic is easy to get
 * subtly wrong — DRY wins.
 */
import { useEffect, useMemo, useState, type FC, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import cls from './vendor.module.css';
import { Badge, Icon, Text } from '@shared/atoms';
import { db } from '@shared/lib/db';
import type { Sale } from '@shared/domain/types';

/* -------------------------------------------------------------------------- */
/* Cross-tenant sales roll-up                                                 */
/* -------------------------------------------------------------------------- */
export interface TenantStat {
  readonly revenue: number;
  readonly sales: number;
  readonly lastSaleAt: string | null;
}

/** Live per-tenant totals. Excludes voided sales; multiplies nothing. */
export const useTenantStats = (): ReadonlyMap<string, TenantStat> => {
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
/* Pagination                                                                 */
/* -------------------------------------------------------------------------- */
export interface PaginationState<T> {
  readonly page: number;
  readonly pageSize: number;
  readonly totalPages: number;
  readonly total: number;
  readonly startIdx: number;
  readonly endIdx: number;
  readonly slice: readonly T[];
  readonly setPage: (n: number) => void;
  readonly setPageSize: (n: number) => void;
}

export const usePagination = <T,>(
  items: readonly T[],
  initialPageSize = 10,
): PaginationState<T> => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // If the source shrinks below the current page (e.g. a filter narrowed
  // the results), snap back to a valid page rather than showing "empty".
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  // Also reset to page 1 when page size changes so users don't jump into
  // a page that no longer exists at the new size.
  const handleSetPageSize = (n: number) => {
    setPageSize(n);
    setPage(1);
  };

  const startIdx = total === 0 ? 0 : (page - 1) * pageSize;
  const endIdx   = Math.min(startIdx + pageSize, total);
  const slice    = useMemo(() => items.slice(startIdx, endIdx), [items, startIdx, endIdx]);

  return { page, pageSize, totalPages, total, startIdx, endIdx, slice, setPage, setPageSize: handleSetPageSize };
};

interface PaginationProps {
  readonly state: PaginationState<unknown>;
  readonly noun?: string;   // e.g. "tenants", "entries"
  readonly pageSizes?: readonly number[];
}

export const Pagination: FC<PaginationProps> = ({
  state, noun = 'rows', pageSizes = [10, 25, 50, 100],
}) => {
  const { page, pageSize, totalPages, total, startIdx, endIdx, setPage, setPageSize } = state;
  if (total === 0) return null;

  // Build a compact page number list: 1 … around-current … totalPages.
  const nums = pageWindow(page, totalPages);

  return (
    <div className={cls.pagination}>
      <div className={cls.paginationInfo}>
        Showing <strong>{startIdx + 1}</strong>&ndash;<strong>{endIdx}</strong>{' '}
        of <strong>{total}</strong> {noun}
      </div>
      <div className={cls.paginationCtrls}>
        <select
          className={cls.pageSize}
          value={pageSize}
          onChange={(e) => setPageSize(Number(e.target.value))}
          aria-label="Rows per page"
        >
          {pageSizes.map((n) => <option key={n} value={n}>{n} / page</option>)}
        </select>
        <button
          className={cls.pageBtn}
          onClick={() => setPage(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <Icon name="arrow" size={14} style={{ transform: 'scaleX(-1)' }} />
        </button>
        {nums.map((n, i) =>
          n === '…' ? (
            <span key={`ellipsis-${i}`} className={cls.pageBtn} style={{ border: 'none', cursor: 'default', pointerEvents: 'none' }}>…</span>
          ) : (
            <button
              key={n}
              className={[cls.pageBtn, n === page && cls.pageBtnActive].filter(Boolean).join(' ')}
              onClick={() => setPage(n)}
              aria-current={n === page ? 'page' : undefined}
            >
              {n}
            </button>
          ),
        )}
        <button
          className={cls.pageBtn}
          onClick={() => setPage(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
        >
          <Icon name="arrow" size={14} />
        </button>
      </div>
    </div>
  );
};

/** Return numbers + ellipses for the pagination bar. Max ~7 slots. */
const pageWindow = (page: number, totalPages: number): readonly (number | '…')[] => {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const out: (number | '…')[] = [1];
  const start = Math.max(2, page - 1);
  const end   = Math.min(totalPages - 1, page + 1);
  if (start > 2) out.push('…');
  for (let i = start; i <= end; i += 1) out.push(i);
  if (end < totalPages - 1) out.push('…');
  out.push(totalPages);
  return out;
};

/* -------------------------------------------------------------------------- */
/* Small shared UI atoms                                                      */
/* -------------------------------------------------------------------------- */
export const StatusPill: FC<{ status: 'active' | 'suspended' }> = ({ status }) => (
  <Badge variant={status === 'active' ? 'success' : 'danger'}>
    {status === 'active' ? 'Active' : 'Suspended'}
  </Badge>
);

interface SectionCardProps {
  readonly title: string;
  readonly subtitle?: string;
  readonly action?: ReactNode;
  readonly children: ReactNode;
}
export const SectionCard: FC<SectionCardProps> = ({ title, subtitle, action, children }) => (
  <section className={cls.section}>
    <div className={cls.sectionHead}>
      <div>
        <h2 className={cls.sectionTitle}>{title}</h2>
        {subtitle && <p className={cls.sectionSub}>{subtitle}</p>}
      </div>
      {action}
    </div>
    {children}
  </section>
);

interface EmptyProps {
  readonly icon?: 'store' | 'shield' | 'search';
  readonly title: string;
  readonly hint?: string;
}
export const EmptyState: FC<EmptyProps> = ({ icon = 'store', title, hint }) => (
  <div className={cls.empty}>
    <div className={cls.emptyIcon}><Icon name={icon} size={22} /></div>
    <Text weight="semibold">{title}</Text>
    {hint && (
      <div style={{ marginTop: '0.25rem' }}>
        <Text size="sm" tone="subtle">{hint}</Text>
      </div>
    )}
  </div>
);
