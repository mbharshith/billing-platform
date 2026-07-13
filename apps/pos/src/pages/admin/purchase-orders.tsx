// Purchase Orders - track supplier orders for raw ingredients.
//
// PO lifecycle: draft -> sent -> received (or cancelled). Each PO has a
// supplier, PO number, N line items (ingredient x quantity x unitCost)
// and an auto-computed total.
//
// Like Recipes, uses CrudPage's list surface but owns a custom modal for
// the nested items array.

import { useCallback, useMemo, useState, type FC } from 'react';
import { AdminPage, LineItemsEditor, type LineItemColumn } from '@billing/ui/admin';
import { Badge, Button, Text } from '@billing/ui/atoms';
import { DataTable, type DataTableColumn } from '@billing/ui/molecules';
import { Modal } from '@billing/ui/organisms';
import { useTable } from '@billing/shared/hooks/useTable';
import { useToast } from '@billing/shared/store/ToastContext';
import { useMoney } from '@billing/shared/hooks/useMoney';
import type {
  PurchaseOrder, PurchaseOrderItem, Supplier, Ingredient,
} from '@billing/shared/domain/restaurant';

type PoStatus = PurchaseOrder['status'];

const STATUS_LABELS: Readonly<Record<PoStatus, string>> = {
  draft: 'Draft', sent: 'Sent', received: 'Received', cancelled: 'Cancelled',
};
const STATUS_VARIANT: Readonly<Record<PoStatus, 'neutral' | 'primary' | 'success' | 'danger'>> = {
  draft: 'neutral', sent: 'primary', received: 'success', cancelled: 'danger',
};

interface PoForm {
  readonly poNumber: string;
  readonly supplierId: string;
  readonly status: PoStatus;
  readonly notes: string;
  readonly items: readonly PurchaseOrderItem[];
}

const emptyForm = (): PoForm => ({
  poNumber: `PO-${Date.now().toString().slice(-6)}`,
  supplierId: '', status: 'draft', notes: '', items: [],
});
const emptyItem = (): PurchaseOrderItem => ({
  ingredientId: '', quantity: 0, unitCost: 0, lineTotal: 0,
});
const reconcileItem = (row: PurchaseOrderItem): PurchaseOrderItem => ({
  ...row, lineTotal: Math.round(row.quantity * row.unitCost * 100) / 100,
});
const orderTotal = (items: readonly PurchaseOrderItem[]): number =>
  Math.round(items.reduce((s, i) => s + i.lineTotal, 0) * 100) / 100;

/* -------------------------------------------------------------------------- */

export const PurchaseOrdersPage: FC = () => {
  const pos         = useTable<PurchaseOrder>('purchaseOrders');
  const suppliers   = useTable<Supplier>('suppliers');
  const ingredients = useTable<Ingredient>('ingredients');
  const toast = useToast();
  const { money } = useMoney();

  const [editing, setEditing]   = useState<{ id: string | null; form: PoForm } | null>(null);
  const [saving, setSaving]     = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | PoStatus>('all');

  const supplierMap = useMemo(
    () => new Map(suppliers.rows.map((s) => [s.id, s.name])),
    [suppliers.rows],
  );
  const supplierOptions = useMemo(
    () => suppliers.rows.filter((s) => s.active !== false)
      .map((s) => ({ value: s.id, label: s.name })),
    [suppliers.rows],
  );
  const ingOptions = useMemo(
    () => ingredients.rows.filter((i) => i.active !== false)
      .map((i) => ({ value: i.id, label: `${i.name} (${i.unit})` })),
    [ingredients.rows],
  );

  const filtered = useMemo(() => (
    statusFilter === 'all' ? pos.rows : pos.rows.filter((p) => p.status === statusFilter)
  ), [pos.rows, statusFilter]);

  const openNew  = () => setEditing({ id: null, form: emptyForm() });
  const openEdit = (p: PurchaseOrder) => setEditing({
    id: p.id,
    form: {
      poNumber: p.poNumber, supplierId: p.supplierId,
      status: p.status, notes: p.notes, items: [...p.items],
    },
  });
  const close = () => setEditing(null);

  const patch = useCallback(<K extends keyof PoForm>(k: K, v: PoForm[K]) => {
    setEditing((e) => (e ? { ...e, form: { ...e.form, [k]: v } } : e));
  }, []);

  const itemColumns: readonly LineItemColumn<PurchaseOrderItem>[] = [
    { key: 'ingredientId', label: 'Ingredient', kind: 'select', options: ingOptions, width: '2fr' },
    { key: 'quantity',     label: 'Qty',        kind: 'number', step: 0.1, width: '110px' },
    { key: 'unitCost',     label: 'Unit cost',  kind: 'number', step: 0.01, width: '130px' },
    { key: 'lineTotal',    label: 'Line total', kind: 'readonly', width: '130px',
      compute: (r) => money(r.lineTotal) },
  ];

  const currentTotal = editing ? orderTotal(editing.form.items) : 0;

  const save = async () => {
    if (!editing) return;
    const { id, form } = editing;
    if (!form.supplierId)           { toast.error('Pick a supplier.');       return; }
    if (form.items.length === 0)    { toast.error('Add at least one item.'); return; }
    if (form.items.some((i) => !i.ingredientId || i.quantity <= 0 || i.unitCost < 0)) {
      toast.error('Every item needs an ingredient, quantity > 0, cost >= 0.');
      return;
    }
    setSaving(true);
    try {
      const total = orderTotal(form.items);
      if (id) {
        await pos.update(id, {
          poNumber: form.poNumber, supplierId: form.supplierId, status: form.status,
          notes: form.notes, items: form.items, total,
          receivedAt: form.status === 'received' ? new Date().toISOString() : null,
        });
        toast.success('PO updated.');
      } else {
        await pos.create({
          poNumber: form.poNumber, supplierId: form.supplierId, status: form.status,
          notes: form.notes, items: form.items, total,
          orderedAt: new Date().toISOString(), receivedAt: null,
        } as Omit<PurchaseOrder, 'id' | 'createdAt' | 'storeId'>);
        toast.success('PO added.');
      }
      close();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: PurchaseOrder) => {
    if (!window.confirm(`Delete PO ${row.poNumber}?`)) return;
    try {
      await pos.remove(row.id);
      toast.success('PO deleted.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed.');
    }
  };

  const columns: DataTableColumn<PurchaseOrder>[] = [
    { key: 'poNumber', label: 'PO #',   sortValue: (p) => p.poNumber,       render: (p) => p.poNumber },
    { key: 'supplier', label: 'Supplier', render: (p) => supplierMap.get(p.supplierId) ?? <em>unknown</em>,
      sortValue: (p) => supplierMap.get(p.supplierId) ?? '' },
    { key: 'status',   label: 'Status',
      render: (p) => <Badge variant={STATUS_VARIANT[p.status]}>{STATUS_LABELS[p.status]}</Badge>,
      sortValue: (p) => p.status },
    { key: 'items',    label: 'Items', numeric: true, sortValue: (p) => p.items.length,
      render: (p) => p.items.length },
    { key: 'total',    label: 'Total', numeric: true, sortValue: (p) => p.total,
      render: (p) => <strong>{money(p.total)}</strong> },
    { key: 'ordered',  label: 'Ordered', sortValue: (p) => p.orderedAt,
      render: (p) => new Date(p.orderedAt).toLocaleDateString() },
    { key: 'actions',  label: '', actions: true,
      render: (p) => (
        <>
          <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>Edit</Button>
          <Button variant="ghost" size="sm" onClick={() => remove(p)}>Delete</Button>
        </>
      ) },
  ];

  const totalOpen = useMemo(
    () => pos.rows.filter((p) => p.status !== 'cancelled' && p.status !== 'received')
      .reduce((s, p) => s + p.total, 0),
    [pos.rows],
  );

  return (
    <AdminPage
      title="Purchase Orders"
      subtitle="Track supplier orders for raw ingredients."
      actions={
        <>
          <Badge variant="neutral">Open: {money(totalOpen)}</Badge>
          <Button variant="primary" leadingIcon="plus" onClick={openNew}>New PO</Button>
        </>
      }
    >
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
        <Text size="sm" tone="subtle">Status:</Text>
        <select value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | PoStatus)}
                style={selectStyle}>
          <option value="all">All</option>
          {(Object.keys(STATUS_LABELS) as PoStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>

      <DataTable
        data={filtered}
        columns={columns}
        getKey={(p) => p.id}
        emptyTitle="No purchase orders yet"
        emptyHint="Click 'New PO' to record your first supplier order."
      />

      {editing && (
        <Modal
          title={editing.id ? `Edit ${editing.form.poNumber}` : 'New Purchase Order'}
          subtitle={`Order total: ${money(currentTotal)}`}
          onClose={close}
          wide
          closeLabel="Close"
          footer={
            <>
              <Button variant="secondary" onClick={close}>Cancel</Button>
              <Button variant="primary" loading={saving} onClick={save}>Save PO</Button>
            </>
          }
        >
          <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={labelStyle}>PO number</span>
                <input type="text" value={editing.form.poNumber}
                       onChange={(e) => patch('poNumber', e.target.value)}
                       style={selectStyle} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={labelStyle}>Supplier</span>
                <select value={editing.form.supplierId}
                        onChange={(e) => patch('supplierId', e.target.value)}
                        style={selectStyle}>
                  <option value="">- pick a supplier -</option>
                  {supplierOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={labelStyle}>Status</span>
                <select value={editing.form.status}
                        onChange={(e) => patch('status', e.target.value as PoStatus)}
                        style={selectStyle}>
                  {(Object.keys(STATUS_LABELS) as PoStatus[]).map((s) => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </label>
            </div>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={labelStyle}>Notes</span>
              <input type="text" value={editing.form.notes}
                     onChange={(e) => patch('notes', e.target.value)}
                     placeholder="Special instructions, urgency, etc."
                     style={selectStyle} />
            </label>

            <div>
              <Text size="sm" weight="semibold" as="div">Items</Text>
              <Text size="xs" tone="subtle" as="div">
                Line total = quantity x unit cost (auto).
              </Text>
            </div>
            <LineItemsEditor<PurchaseOrderItem>
              items={editing.form.items}
              onChange={(next) => patch('items', next)}
              columns={itemColumns}
              makeEmpty={emptyItem}
              reconcile={reconcileItem}
              addLabel="Add item"
              emptyLabel="No items yet."
            />
          </div>
        </Modal>
      )}
    </AdminPage>
  );
};

const labelStyle: React.CSSProperties = { fontWeight: 600, fontSize: 13 };
const selectStyle: React.CSSProperties = {
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid var(--app-border)',
  background: 'var(--app-surface)',
  color: 'var(--app-text)',
  font: 'inherit',
  fontSize: 13,
};
