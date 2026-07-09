// DataTable - shared scrollable table molecule. Pages just declare columns + render <tr> children.
import type { FC, HTMLAttributes, ReactNode } from 'react';
import cls from './molecules.module.css';

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */
export interface DataTableColumn {
  /** Unique key used as React key for the <th>. */
  key: string;
  /** Header label — accepts a string or any ReactNode. */
  label: ReactNode;
  /** Right-align column and use tabular numerals. */
  numeric?: boolean;
  /** Right-align column and suppress wrapping (for action buttons). */
  actions?: boolean;
}

interface DataTableProps {
  /** Column definitions — rendered as <th> in the header row. */
  columns: DataTableColumn[];
  /** The <tr> elements for the <tbody>. Wrap each in <DataTableRow> for row-state support. */
  children: ReactNode;
  /** Optional <tr> elements for the <tfoot> (e.g. totals rows). */
  footer?: ReactNode;
  /**
   * Remove border + border-radius from the wrapper.
   * Use when the table lives inside a `.card` that already provides the container chrome.
   */
  flush?: boolean;
}

/* -------------------------------------------------------------------------- */
/* DataTable                                                                  */
/* -------------------------------------------------------------------------- */
export const DataTable: FC<DataTableProps> = ({ columns, children, footer, flush }) => (
  <div
    className={[
      cls.dataTableWrap,
      flush && cls['dataTableWrap--flush'],
    ].filter(Boolean).join(' ')}
  >
    <table className={cls.dataTable}>
      <thead>
        <tr>
          {columns.map((col) => (
            <th
              key={col.key}
              className={col.actions ? 'actions' : col.numeric ? 'numeric' : undefined}
            >
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
      {footer && <tfoot>{footer}</tfoot>}
    </table>
  </div>
);

/* -------------------------------------------------------------------------- */
/* DataTableRow                                                               */
/* -------------------------------------------------------------------------- */
interface DataTableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  /** Makes the row look and act like a button (cursor: pointer). */
  clickable?: boolean;
  /** Dims all cells — use for inactive / soft-deleted records. */
  muted?: boolean;
}

export const DataTableRow: FC<DataTableRowProps> = ({
  clickable, muted, className, ...rest
}) => (
  <tr
    className={[
      clickable && cls['dataTableRow--clickable'],
      muted     && cls['dataTableRow--muted'],
      className,
    ].filter(Boolean).join(' ')}
    {...rest}
  />
);
