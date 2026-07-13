// LineItemsEditor - controlled editor for a variable-length list of rows.
//
// Used by Recipes (ingredient components) and Purchase Orders (line items).
// Schema-driven: consumers describe columns (select / number / readonly),
// the editor renders inputs + add/remove UI. Auto-computes cells via the
// optional `compute` callback (used for PO lineTotal = qty x unitCost).
//
// Kept intentionally generic - no domain assumptions.

import { useCallback, type FC, type ReactNode } from 'react';
import { Button, IconButton } from '@billing/ui/atoms';
import cls from './admin.module.css';

export type LineItemColumnKind = 'select' | 'number' | 'text' | 'readonly';

export interface LineItemColumn<T> {
  readonly key: keyof T & string;
  readonly label: string;
  readonly kind: LineItemColumnKind;
  readonly options?: readonly { value: string; label: string }[];
  readonly step?: number;
  readonly min?: number;
  /** For 'readonly': how to derive the cell value from the row. */
  readonly compute?: (row: T) => number | string;
  /** CSS width for the column. Defaults let flex do its thing. */
  readonly width?: string;
}

interface LineItemsEditorProps<T> {
  readonly items: readonly T[];
  readonly onChange: (next: T[]) => void;
  readonly columns: readonly LineItemColumn<T>[];
  readonly makeEmpty: () => T;
  readonly addLabel?: string;
  readonly emptyLabel?: string;
  /** Called after each row edit; return the (possibly re-derived) row.
   *  Handy for auto-computing lineTotal when qty or unitCost changes. */
  readonly reconcile?: (row: T) => T;
}

const asString = (v: unknown): string =>
  v === null || v === undefined ? '' : String(v);

export const LineItemsEditor = <T,>({
  items, onChange, columns, makeEmpty, addLabel = 'Add line',
  emptyLabel = 'No lines yet - click Add.', reconcile,
}: LineItemsEditorProps<T>): ReturnType<FC> => {

  const patchRow = useCallback((idx: number, key: keyof T, value: unknown) => {
    const next = items.map((r, i) => (i === idx ? { ...r, [key]: value } : r));
    if (reconcile) next[idx] = reconcile(next[idx]);
    onChange(next);
  }, [items, onChange, reconcile]);

  const remove = useCallback((idx: number) => {
    onChange(items.filter((_, i) => i !== idx));
  }, [items, onChange]);

  const add = useCallback(() => {
    const row = reconcile ? reconcile(makeEmpty()) : makeEmpty();
    onChange([...items, row]);
  }, [items, onChange, makeEmpty, reconcile]);

  return (
    <div className={cls.lineEditor}>
      {items.length === 0 && <div className={cls.lineEditor__empty}>{emptyLabel}</div>}

      {items.map((row, idx) => (
        <div key={idx} className={cls.lineEditor__row}
             style={{ gridTemplateColumns: gridTemplate(columns) }}>
          {columns.map((col) => renderCell(col, row, idx, patchRow))}
          <IconButton icon="close" a11yLabel="Remove line" onClick={() => remove(idx)} size="sm" danger />
        </div>
      ))}

      <Button className={cls.lineEditor__addBtn} variant="secondary" size="sm"
              leadingIcon="plus" onClick={add}>
        {addLabel}
      </Button>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Cell renderer                                                              */
/* -------------------------------------------------------------------------- */

const renderCell = <T,>(
  col: LineItemColumn<T>, row: T, idx: number,
  patch: (idx: number, key: keyof T, value: unknown) => void,
): ReactNode => {
  const value = (row as Record<string, unknown>)[col.key];

  if (col.kind === 'readonly') {
    const derived = col.compute ? col.compute(row) : value;
    return <span key={col.key} className={cls.lineEditor__readonly}>{asString(derived)}</span>;
  }
  if (col.kind === 'select') {
    return (
      <select key={col.key} value={asString(value)}
              onChange={(e) => patch(idx, col.key, e.target.value)}>
        <option value="">- pick -</option>
        {(col.options ?? []).map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    );
  }
  if (col.kind === 'number') {
    return (
      <input key={col.key} type="number" min={col.min ?? 0} step={col.step ?? 1}
             value={asString(value)}
             onChange={(e) => patch(idx, col.key, Number(e.target.value))} />
    );
  }
  return (
    <input key={col.key} type="text" value={asString(value)}
           onChange={(e) => patch(idx, col.key, e.target.value)} />
  );
};

const gridTemplate = <T,>(columns: readonly LineItemColumn<T>[]): string =>
  [...columns.map((c) => c.width ?? '1fr'), '40px'].join(' ');
