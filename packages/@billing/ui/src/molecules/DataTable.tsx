// DataTable — generic, fully-featured data table molecule.
// Built-in: search bar, column sorting, pagination.
// Pages pass `data` + `columns` (each with a `render` function).
// External pre-filtering (date ranges, status chips, etc.) stays in the page;
// DataTable handles text search, sort, and page navigation on top of whatever
// slice the page feeds it.
import {
  useMemo,
  useState,
  type FC,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
} from 'react';
import cls from './molecules.module.css';
import { Icon, type IconName } from '../atoms/Icon';
import { Text } from '../atoms';

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

/** Column definition for the data-driven DataTable. */
export interface DataTableColumn<T = unknown> {
  /** Unique key — used as React key and sort identifier. */
  key: string;
  /** Header text or element. */
  label: ReactNode;
  /** Right-align header + cells; use for numeric values. */
  numeric?: boolean;
  /** Right-align + nowrap; use for action buttons. */
  actions?: boolean;
  /** Renders the cell content for a given row. */
  render?: (row: T) => ReactNode;
  /**
   * Accessor for sorting. Return a string or number.
   * When present, the column header becomes a sort toggle.
   */
  sortValue?: (row: T) => string | number;
}

type SortDir = 'asc' | 'desc';

const DEFAULT_PAGE_SIZES = [10, 25, 50, 100] as const;

/* -------------------------------------------------------------------------- */
/* DataTable                                                                  */
/* -------------------------------------------------------------------------- */

interface DataTableProps<T> {
  /** The (optionally pre-filtered) rows to display. */
  data: readonly T[];
  /** Column definitions including cell renderers. */
  columns: DataTableColumn<T>[];
  /** Returns a stable unique string key for each row. */
  getKey: (row: T) => string;

  // ── Click ──────────────────────────────────────────────────────────────────
  /** Row click handler — automatically adds cursor:pointer to rows. */
  onRowClick?: (row: T) => void;

  // ── Row states ─────────────────────────────────────────────────────────────
  /** Dims a row's text — use for inactive / soft-deleted records. */
  getRowMuted?: (row: T) => boolean;

  // ── Search ─────────────────────────────────────────────────────────────────
  /** Renders a search bar above the table. DataTable manages query state. */
  searchPlaceholder?: string;
  /**
   * Predicate used to filter rows by the internal search query.
   * Called with a lower-cased, trimmed query string.
   * Omit to disable the built-in search bar.
   */
  searchFn?: (row: T, query: string) => boolean;

  // ── Pagination ─────────────────────────────────────────────────────────────
  /** Initial rows-per-page value. Defaults to 25. */
  defaultPageSize?: number;
  /** Choices in the rows-per-page selector. */
  pageSizeOptions?: readonly number[];
  /** Pass true to hide pagination (e.g. for small embedded tables). */
  hidePagination?: boolean;

  // ── Empty state ────────────────────────────────────────────────────────────
  emptyIcon?: IconName;
  /** Shown when `data` is empty (and no query is active). */
  emptyTitle?: string;
  emptyHint?: string;
  /** Shown when `data` has rows but the search returns nothing. */
  emptySearchTitle?: string;
  emptySearchHint?: string;

  // ── Footer / totals row ───────────────────────────────────────────────────
  /** <tr> elements rendered inside <tfoot>. */
  footer?: ReactNode;

  // ── Style ──────────────────────────────────────────────────────────────────
  /**
   * Strip the border + border-radius from the wrapper.
   * Use when the table lives inside a .card that already provides the container.
   */
  flush?: boolean;
}

export function DataTable<T>({
  data,
  columns,
  getKey,
  onRowClick,
  getRowMuted,
  searchPlaceholder = 'Search\u2026',
  searchFn,
  defaultPageSize = 25,
  pageSizeOptions = DEFAULT_PAGE_SIZES,
  hidePagination = false,
  emptyIcon = 'search',
  emptyTitle = 'No results',
  emptyHint,
  emptySearchTitle = 'No results match your search',
  emptySearchHint = 'Try different keywords or clear the search.',
  footer,
  flush = false,
}: DataTableProps<T>): ReactElement {
  // ── Internal state ────────────────────────────────────────────────────────
  const [query, setQuery] = useState('');
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  // ── Pipeline: search → sort → paginate ───────────────────────────────────
  const searched = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !searchFn) return data;
    return data.filter((row) => searchFn(row, q));
  }, [data, query, searchFn]);

  const sorted = useMemo(() => {
    if (!sortCol) return searched;
    const col = columns.find((c) => c.key === sortCol);
    if (!col?.sortValue) return searched;
    return [...searched].sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      const cmp =
        typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av).localeCompare(String(bv), undefined, {
              numeric: true,
              sensitivity: 'base',
            });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [searched, sortCol, sortDir, columns]);

  const totalItems = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageData = hidePagination
    ? sorted
    : sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSearch = (q: string) => {
    setQuery(q);
    setPage(1);
  };

  const handleSort = (key: string) => {
    setPage(1);
    if (sortCol === key) {
      if (sortDir === 'asc') {
        setSortDir('desc');
      } else {
        setSortCol(null);
        setSortDir('asc');
      }
    } else {
      setSortCol(key);
      setSortDir('asc');
    }
  };

  const handlePageSize = (n: number) => {
    setPageSize(n);
    setPage(1);
  };

  // ── Derived empty-state decision ─────────────────────────────────────────
  const isDataEmpty = data.length === 0;
  const isSearchEmpty = !isDataEmpty && totalItems === 0;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className={[cls.dataTableWrap, flush && cls['dataTableWrap--flush']]
        .filter(Boolean)
        .join(' ')}
    >
      {/* ── Search bar ── */}
      {searchFn && (
        <div className={cls.dtSearch}>
          <span className={cls.dtSearch__icon} aria-hidden="true">
            <Icon name="search" size={15} />
          </span>
          <input
            type="search"
            className={cls.dtSearch__input}
            placeholder={searchPlaceholder}
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            aria-label={searchPlaceholder}
          />
          {query && (
            <button
              type="button"
              className={cls.dtSearch__clear}
              onClick={() => handleSearch('')}
              aria-label="Clear search"
            >
              <Icon name="close" size={14} />
            </button>
          )}
        </div>
      )}

      {/* ── Scrollable table area ── */}
      <div className={cls.dtScrollArea}>
        <table className={cls.dataTable}>
          <thead>
            <tr>
              {columns.map((col) => {
                const sortable = !!col.sortValue;
                const isActive = sortCol === col.key;
                const thClass =
                  [
                    col.actions ? 'actions' : col.numeric ? 'numeric' : undefined,
                    sortable && cls['dtTh--sortable'],
                    isActive && cls['dtTh--sorted'],
                  ]
                    .filter(Boolean)
                    .join(' ') || undefined;
                return (
                  <th
                    key={col.key}
                    className={thClass}
                    onClick={sortable ? () => handleSort(col.key) : undefined}
                    aria-sort={
                      isActive
                        ? sortDir === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : undefined
                    }
                  >
                    <span className={cls.dtThInner}>
                      {col.label}
                      {sortable && (
                        <span className={cls.dtSortIcon} aria-hidden="true">
                          {isActive ? (sortDir === 'asc' ? '\u2191' : '\u2193') : '\u2195'}
                        </span>
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {/* ── Empty state ── */}
            {(isDataEmpty || isSearchEmpty) && (
              <tr>
                <td colSpan={columns.length} className={cls.dtEmptyCell}>
                  <div className={cls.dtEmpty}>
                    <span className={cls.dtEmpty__icon} aria-hidden="true">
                      <Icon name={isSearchEmpty ? 'search' : emptyIcon} size={28} />
                    </span>
                    <Text weight="semibold">
                      {isSearchEmpty ? emptySearchTitle : emptyTitle}
                    </Text>
                    {(isSearchEmpty ? emptySearchHint : emptyHint) && (
                      <Text size="sm" tone="subtle">
                        {isSearchEmpty ? emptySearchHint : emptyHint}
                      </Text>
                    )}
                  </div>
                </td>
              </tr>
            )}

            {/* ── Data rows ── */}
            {pageData.map((row) => {
              const muted = getRowMuted?.(row) ?? false;
              const clickable = !!onRowClick;
              return (
                <tr
                  key={getKey(row)}
                  className={
                    [
                      clickable && cls['dataTableRow--clickable'],
                      muted && cls['dataTableRow--muted'],
                    ]
                      .filter(Boolean)
                      .join(' ') || undefined
                  }
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={
                        col.actions ? 'actions' : col.numeric ? 'numeric' : undefined
                      }
                    >
                      {col.render?.(row)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>

          {footer && <tfoot>{footer}</tfoot>}
        </table>
      </div>

      {/* ── Pagination bar ── */}
      {!hidePagination && totalItems > 0 && (
        <div className={cls.dtPager}>
          <Text size="sm" tone="subtle">
            {`${(safePage - 1) * pageSize + 1}\u2013${Math.min(safePage * pageSize, totalItems)} of ${totalItems}`}
          </Text>

          <div className={cls.dtPager__right}>
            <label className={cls.dtPager__sizeWrap}>
              <span className="sr-only">Rows per page</span>
              <select
                className={cls.dtPager__size}
                value={pageSize}
                onChange={(e) => handlePageSize(Number(e.target.value))}
                aria-label="Rows per page"
              >
                {pageSizeOptions.map((n) => (
                  <option key={n} value={n}>
                    {n} / page
                  </option>
                ))}
              </select>
            </label>

            <div className={cls.dtPager__pages}>
              <button
                type="button"
                className={cls.dtPager__btn}
                onClick={() => setPage(Math.max(1, safePage - 1))}
                disabled={safePage === 1}
                aria-label="Previous page"
              >
                &#8249;
              </button>
              <span className={cls.dtPager__loc}>
                {safePage} / {totalPages}
              </span>
              <button
                type="button"
                className={cls.dtPager__btn}
                onClick={() => setPage(Math.min(totalPages, safePage + 1))}
                disabled={safePage === totalPages}
                aria-label="Next page"
              >
                &#8250;
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* DataTableRow — lightweight companion for custom/structural table layouts  */
/* -------------------------------------------------------------------------- */
interface DataTableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  clickable?: boolean;
  muted?: boolean;
}

export const DataTableRow: FC<DataTableRowProps> = ({
  clickable,
  muted,
  className,
  ...rest
}) => (
  <tr
    className={
      [
        clickable && cls['dataTableRow--clickable'],
        muted && cls['dataTableRow--muted'],
        className,
      ]
        .filter(Boolean)
        .join(' ') || undefined
    }
    {...rest}
  />
);
