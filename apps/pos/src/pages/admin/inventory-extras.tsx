// Phase 8 - Inventory depth pages. See PARITY_GAP_ANALYSIS.md for what's
// covered vs the remaining gaps.
//
// Each page is a thin wrapper over <CrudPage>. When a page needs custom UX
// (e.g. GRN line-item editor, indent approval workflow) it graduates to
// its own file.

import type { FC } from 'react';
import { CrudPage, boolField, numField, selectField, textField } from '@billing/ui/admin';
import { useTable } from '@billing/shared/hooks/useTable';
import type {
  Warehouse, RawMaterialCategory, UnitOfMeasure, StockAdjustment,
  GRN, StockTransfer, IndentRequest, ProductionBatch,
} from '@billing/shared/domain/tmbill-extras';
import type { Ingredient, Supplier } from '@billing/shared/domain/restaurant';

const fmtDate = (iso: string): string => new Date(iso).toLocaleDateString();
const fmtDateTime = (iso: string): string => new Date(iso).toLocaleString();
const fmtCurrency = (n: number): string => `Rs ${n.toLocaleString('en-IN')}`;

/* -------------------------------------------------------------------------- */

export const WarehousesPage: FC = () => {
  const api = useTable<Warehouse>('warehouses');
  return (
    <CrudPage<Warehouse>
      title="Warehouses & Locations"
      subtitle="Physical locations where inventory is stored."
      breadcrumb={['Inventory', 'Warehouses']}
      api={api}
      searchPlaceholder="Search by name..."
      searchFn={(r, q) => r.name.toLowerCase().includes(q)}
      makeEmpty={() => ({ name: '', type: 'outlet', address: '', managerName: '', active: true })}
      fields={[
        textField('name',        'Warehouse Name', true),
        selectField('type',        'Type', [
          { value: 'outlet',  label: 'Outlet Kitchen' },
          { value: 'central', label: 'Central Warehouse' },
          { value: 'transit', label: 'Transit / Cold Chain' },
        ]),
        textField('address',     'Address', true),
        textField('managerName', 'Manager Name', true),
        boolField('active',      'Active'),
      ]}
      columns={[
        { key: 'name',    label: 'Name',    sortValue: (r) => r.name, render: (r) => r.name },
        { key: 'type',    label: 'Type',    render: (r) => r.type },
        { key: 'address', label: 'Address', render: (r) => r.address },
        { key: 'mgr',     label: 'Manager', render: (r) => r.managerName },
      ]}
    />
  );
};

export const RmCategoriesPage: FC = () => {
  const api = useTable<RawMaterialCategory>('rmCategories');
  return (
    <CrudPage<RawMaterialCategory>
      title="Raw Material Categories"
      subtitle="Group ingredients (Meat, Grains, Spices)."
      breadcrumb={['Inventory', 'Raw Material Categories']}
      api={api}
      searchPlaceholder="Search categories..."
      searchFn={(r, q) => r.name.toLowerCase().includes(q)}
      makeEmpty={() => ({ name: '', sortOrder: 100, active: true })}
      fields={[
        textField('name', 'Name', true),
        numField('sortOrder', 'Sort Order'),
        boolField('active', 'Active'),
      ]}
      columns={[
        { key: 'name', label: 'Name', sortValue: (r) => r.name, render: (r) => r.name },
        { key: 'sortOrder', label: 'Sort', sortValue: (r) => r.sortOrder, render: (r) => String(r.sortOrder) },
      ]}
    />
  );
};

export const UomPage: FC = () => {
  const api = useTable<UnitOfMeasure>('uom');
  return (
    <CrudPage<UnitOfMeasure>
      title="Units of Measure"
      subtitle="KG, G, L, ML, Unit, Dozen and conversion factors."
      breadcrumb={['Inventory', 'Units of Measure']}
      api={api}
      searchPlaceholder="Search by code..."
      searchFn={(r, q) => r.code.toLowerCase().includes(q) || r.name.toLowerCase().includes(q)}
      makeEmpty={() => ({ code: '', name: '', baseUnit: 'G', factor: 1, active: true })}
      fields={[
        textField('code',     'Code', true),
        textField('name',     'Name', true),
        selectField('baseUnit', 'Base Unit', [
          { value: 'G',    label: 'Gram (G)' },
          { value: 'ML',   label: 'Millilitre (ML)' },
          { value: 'UNIT', label: 'Unit' },
        ]),
        numField('factor',   'Factor (relative to base)', 0.001),
        boolField('active',   'Active'),
      ]}
      columns={[
        { key: 'code',   label: 'Code',      sortValue: (r) => r.code, render: (r) => r.code },
        { key: 'name',   label: 'Name',      render: (r) => r.name },
        { key: 'base',   label: 'Base',      render: (r) => r.baseUnit },
        { key: 'factor', label: 'Factor',    render: (r) => String(r.factor) },
      ]}
    />
  );
};

export const StockAdjustmentsPage: FC = () => {
  const api = useTable<StockAdjustment>('stockAdjustments');
  const ing = useTable<Ingredient>('ingredients');
  const wh  = useTable<Warehouse>('warehouses');
  const ingName = (id: string) => ing.rows.find((r) => r.id === id)?.name ?? id;
  const whName  = (id: string) => wh.rows.find((r) => r.id === id)?.name ?? id;
  return (
    <CrudPage<StockAdjustment>
      title="Stock Adjustments"
      subtitle="Manual stock add/deduct: opening balance, recount, spoilage."
      breadcrumb={['Inventory', 'Stock Adjustments']}
      api={api}
      searchPlaceholder="Search notes..."
      searchFn={(r, q) => (r.notes ?? '').toLowerCase().includes(q)}
      makeEmpty={() => ({
        warehouseId: wh.rows[0]?.id ?? '', ingredientId: ing.rows[0]?.id ?? '',
        delta: 0, reason: 'recount', notes: '',
        performedBy: 'admin', performedAt: new Date().toISOString(),
      })}
      fields={[
        selectField('warehouseId',  'Warehouse',  wh.rows.map((w) => ({ value: w.id, label: w.name }))),
        selectField('ingredientId', 'Ingredient', ing.rows.map((i) => ({ value: i.id, label: i.name }))),
        numField('delta',        'Delta (+ add / - remove)', 0.01),
        selectField('reason',       'Reason', [
          { value: 'opening',    label: 'Opening balance' },
          { value: 'recount',    label: 'Recount' },
          { value: 'spoilage',   label: 'Spoilage' },
          { value: 'theft',      label: 'Theft' },
          { value: 'correction', label: 'Correction' },
        ]),
        textField('notes',        'Notes'),
      ]}
      columns={[
        { key: 'date',   label: 'Date',       sortValue: (r) => r.performedAt, render: (r) => fmtDateTime(r.performedAt) },
        { key: 'wh',     label: 'Warehouse',  render: (r) => whName(r.warehouseId) },
        { key: 'ing',    label: 'Ingredient', render: (r) => ingName(r.ingredientId) },
        { key: 'delta',  label: 'Delta',
          render: (r) => (r.delta > 0 ? `+${r.delta}` : String(r.delta)) },
        { key: 'reason', label: 'Reason',     render: (r) => r.reason },
        { key: 'notes',  label: 'Notes',      render: (r) => r.notes },
      ]}
    />
  );
};

export const GRNsPage: FC = () => {
  const api = useTable<GRN>('grns');
  const sup = useTable<Supplier>('suppliers');
  const wh  = useTable<Warehouse>('warehouses');
  return (
    <CrudPage<GRN>
      title="Goods Receipt Notes"
      subtitle="Track deliveries against Purchase Orders (or direct receipts)."
      breadcrumb={['Inventory', 'GRNs']}
      api={api}
      searchPlaceholder="Search by GRN or invoice number..."
      searchFn={(r, q) => r.grnNumber.toLowerCase().includes(q) || r.invoiceNumber.toLowerCase().includes(q)}
      makeEmpty={() => ({
        grnNumber: `GRN-${Date.now().toString(36).slice(-4).toUpperCase()}`,
        poId: null, supplierId: sup.rows[0]?.id ?? '',
        warehouseId: wh.rows[0]?.id ?? '',
        lines: [], totalValue: 0, status: 'draft',
        receivedBy: 'admin', receivedAt: new Date().toISOString(),
        invoiceNumber: '', notes: '',
      })}
      fields={[
        textField('grnNumber',     'GRN Number', true),
        textField('invoiceNumber', 'Supplier Invoice #'),
        selectField('supplierId',    'Supplier',    sup.rows.map((s) => ({ value: s.id, label: s.name }))),
        selectField('warehouseId',   'Warehouse',   wh.rows.map((w) => ({ value: w.id, label: w.name }))),
        selectField('status',        'Status', [
          { value: 'draft',        label: 'Draft' },
          { value: 'received',     label: 'Received' },
          { value: 'discrepancy',  label: 'Discrepancy' },
        ]),
        numField('totalValue',    'Total Value (Rs)'),
        textField('notes',         'Notes'),
      ]}
      columns={[
        { key: 'grn',    label: 'GRN #',      sortValue: (r) => r.grnNumber, render: (r) => r.grnNumber },
        { key: 'date',   label: 'Received',   sortValue: (r) => r.receivedAt, render: (r) => fmtDate(r.receivedAt) },
        { key: 'sup',    label: 'Supplier',   render: (r) => sup.rows.find((s) => s.id === r.supplierId)?.name ?? r.supplierId },
        { key: 'inv',    label: 'Invoice #',  render: (r) => r.invoiceNumber },
        { key: 'lines',  label: 'Lines',      render: (r) => String(r.lines.length) },
        { key: 'total',  label: 'Value',      render: (r) => fmtCurrency(r.totalValue) },
        { key: 'status', label: 'Status',     render: (r) => r.status },
      ]}
    />
  );
};

export const StockTransfersPage: FC = () => {
  const api = useTable<StockTransfer>('stockTransfers');
  const wh  = useTable<Warehouse>('warehouses');
  const whName = (id: string) => wh.rows.find((r) => r.id === id)?.name ?? id;
  return (
    <CrudPage<StockTransfer>
      title="Stock Transfers"
      subtitle="Inter-warehouse movement, dispatch and receive tracking."
      breadcrumb={['Inventory', 'Stock Transfers']}
      api={api}
      searchPlaceholder="Search transfer #..."
      searchFn={(r, q) => r.transferNumber.toLowerCase().includes(q)}
      makeEmpty={() => ({
        transferNumber: `TRF-${Date.now().toString(36).slice(-4).toUpperCase()}`,
        fromWarehouseId: wh.rows[0]?.id ?? '', toWarehouseId: wh.rows[1]?.id ?? '',
        lines: [], status: 'draft',
        requestedBy: 'admin', requestedAt: new Date().toISOString(),
        dispatchedAt: null, receivedAt: null, notes: '',
      })}
      fields={[
        textField('transferNumber', 'Transfer #', true),
        selectField('fromWarehouseId', 'From',  wh.rows.map((w) => ({ value: w.id, label: w.name }))),
        selectField('toWarehouseId',   'To',    wh.rows.map((w) => ({ value: w.id, label: w.name }))),
        selectField('status', 'Status', [
          { value: 'draft',      label: 'Draft' },
          { value: 'in-transit', label: 'In Transit' },
          { value: 'received',   label: 'Received' },
          { value: 'cancelled',  label: 'Cancelled' },
        ]),
        textField('notes', 'Notes'),
      ]}
      columns={[
        { key: 'trf',    label: 'Transfer #', sortValue: (r) => r.transferNumber, render: (r) => r.transferNumber },
        { key: 'from',   label: 'From',       render: (r) => whName(r.fromWarehouseId) },
        { key: 'to',     label: 'To',         render: (r) => whName(r.toWarehouseId) },
        { key: 'req',    label: 'Requested',  sortValue: (r) => r.requestedAt, render: (r) => fmtDate(r.requestedAt) },
        { key: 'lines',  label: 'Lines',      render: (r) => String(r.lines.length) },
        { key: 'status', label: 'Status',     render: (r) => r.status },
      ]}
    />
  );
};

export const IndentsPage: FC = () => {
  const api = useTable<IndentRequest>('indents');
  return (
    <CrudPage<IndentRequest>
      title="Indent Requests"
      subtitle="Outlet requests for raw materials from central warehouse."
      breadcrumb={['Inventory', 'Indents']}
      api={api}
      searchPlaceholder="Search indent #..."
      searchFn={(r, q) => r.indentNumber.toLowerCase().includes(q)}
      makeEmpty={() => ({
        indentNumber: `IND-${Date.now().toString(36).slice(-4).toUpperCase()}`,
        requestingOutletId: '', requestedBy: 'admin',
        requestedAt: new Date().toISOString(),
        requiredBy: new Date(Date.now() + 86400000).toISOString(),
        lines: [], status: 'pending', approvedBy: null, notes: '',
      })}
      fields={[
        textField('indentNumber', 'Indent #', true),
        selectField('status', 'Status', [
          { value: 'pending',   label: 'Pending' },
          { value: 'approved',  label: 'Approved' },
          { value: 'partial',   label: 'Partially Fulfilled' },
          { value: 'fulfilled', label: 'Fulfilled' },
          { value: 'rejected',  label: 'Rejected' },
        ]),
        textField('notes', 'Notes'),
      ]}
      columns={[
        { key: 'ind',    label: 'Indent #',   sortValue: (r) => r.indentNumber, render: (r) => r.indentNumber },
        { key: 'req',    label: 'Requested',  sortValue: (r) => r.requestedAt, render: (r) => fmtDate(r.requestedAt) },
        { key: 'need',   label: 'Required',   render: (r) => fmtDate(r.requiredBy) },
        { key: 'by',     label: 'By',         render: (r) => r.requestedBy },
        { key: 'lines',  label: 'Lines',      render: (r) => String(r.lines.length) },
        { key: 'status', label: 'Status',     render: (r) => r.status },
      ]}
    />
  );
};

export const ProductionBatchesPage: FC = () => {
  const api = useTable<ProductionBatch>('productionBatches');
  return (
    <CrudPage<ProductionBatch>
      title="Production Batches"
      subtitle="Semi-finished goods, marinades, dough prep, sauces."
      breadcrumb={['Inventory', 'Production Batches']}
      api={api}
      searchPlaceholder="Search batch #..."
      searchFn={(r, q) => r.batchNumber.toLowerCase().includes(q)}
      makeEmpty={() => ({
        batchNumber: `BATCH-${Date.now().toString(36).slice(-4).toUpperCase()}`,
        recipeId: '', yieldQty: 0, consumedIngredients: [],
        producedBy: 'admin', producedAt: new Date().toISOString(),
        expiresAt: null, status: 'in-progress',
      })}
      fields={[
        textField('batchNumber', 'Batch #', true),
        numField('yieldQty',    'Yield Qty', 0.1),
        selectField('status',      'Status', [
          { value: 'in-progress', label: 'In Progress' },
          { value: 'complete',    label: 'Complete' },
          { value: 'expired',     label: 'Expired' },
          { value: 'used',        label: 'Used' },
        ]),
      ]}
      columns={[
        { key: 'batch',  label: 'Batch #',    sortValue: (r) => r.batchNumber, render: (r) => r.batchNumber },
        { key: 'prod',   label: 'Produced',   sortValue: (r) => r.producedAt, render: (r) => fmtDateTime(r.producedAt) },
        { key: 'yield',  label: 'Yield',      render: (r) => String(r.yieldQty) },
        { key: 'by',     label: 'By',         render: (r) => r.producedBy },
        { key: 'status', label: 'Status',     render: (r) => r.status },
      ]}
    />
  );
};


