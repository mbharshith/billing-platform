// CrudPage - configurable list+form page. The heart of DRY admin screens.
//
// Instead of copy-pasting the 200-line "list + add modal + edit modal +
// deactivate confirm + validate + toast + save" ceremony 30+ times, every
// admin page for a TMBill entity declares:
//
//   1. Column configuration for the DataTable
//   2. Form field configuration for the Add/Edit modal
//   3. Which useTable() call to bind to
//
// Everything else - selection state, modal state, validation, toast, save,
// deactivate flow - lives here once. Each concrete page ends up ~30 lines.
//
// Not to be confused with the atomic <Field> component in atoms/. This is
// an ORCHESTRATION component - only for admin CRUD list pages.

import { useState, type FC, type FormEvent, type ReactNode } from 'react';
import { Badge, Button, Field, Input, Select, Text } from '@billing/ui/atoms';
import { Modal } from '@billing/ui/organisms';
import { DataTable, type DataTableColumn } from '@billing/ui/molecules';
import { ConfirmDialog } from '@billing/ui/feedback';
import { useToast } from '@billing/shared/store/ToastContext';
import { STRINGS } from '@billing/shared/domain/strings';
import type { CrudApi, TenantRow } from '@billing/shared/hooks/useTable';
import { AdminPage } from '@billing/ui/admin';
import cls from './admin.module.css';

// Field descriptor types

type FormFieldType = 'text' | 'number' | 'boolean' | 'select' | 'textarea';

// Convert a plural Title-Case entity name to its singular form.
// Handles the common -ies → -y case (e.g. "Menu Categories" → "Menu Category").
const singularize = (title: string): string =>
  title.replace(/ies$/, 'y').replace(/s$/, '');

export interface FormFieldDescriptor<Row> {
  readonly key: keyof Row & string;
  readonly label: string;
  readonly type: FormFieldType;
  readonly required?: boolean;
  readonly options?: readonly { readonly value: string; readonly label: string }[];
  readonly hint?: string;
  readonly min?: number;
  readonly step?: number;
  readonly placeholder?: string;
}

// Field builders - hoisted from the 5+ admin pages that reinvented them.
// Callers still get full inference via the caller-side type parameter.

export const boolField = <R,>(key: keyof R & string, label: string): FormFieldDescriptor<R> =>
  ({ key, label, type: 'boolean' });

export const textField = <R,>(
  key: keyof R & string, label: string, required = false,
): FormFieldDescriptor<R> => ({ key, label, type: 'text', required });

export const numField = <R,>(
  key: keyof R & string, label: string, step = 1,
): FormFieldDescriptor<R> => ({ key, label, type: 'number', min: 0, step });

export const textareaField = <R,>(
  key: keyof R & string, label: string,
): FormFieldDescriptor<R> => ({ key, label, type: 'textarea' });

export const selectField = <R,>(
  key: keyof R & string, label: string,
  options: readonly { value: string; label: string }[],
  required = true,
): FormFieldDescriptor<R> => ({ key, label, type: 'select', required, options });

// Props

export interface CrudPageProps<Row extends TenantRow> {
  readonly title: string;
  readonly subtitle?: string;
  readonly breadcrumb?: readonly string[];
  readonly api: CrudApi<Row>;
  readonly columns: readonly DataTableColumn<Row>[];
  readonly fields: readonly FormFieldDescriptor<Row>[];
  readonly makeEmpty: () => Partial<Row>;
  // * Optional row->form projection for edit. Defaults to identity.
  readonly rowToForm?: (row: Row) => Partial<Row>;
  // * Optional validation. Return an error string to abort save; null to pass.
  readonly validate?: (form: Partial<Row>) => string | null;
  readonly searchFn?: (row: Row, q: string) => boolean;
  readonly searchPlaceholder?: string;
  readonly emptyTitle?: string;
  readonly emptyHint?: string;
  readonly addLabel?: string;
  // * Whether rows support active/inactive toggle. Default true.
  readonly hasActiveToggle?: boolean;
  // * Right-of-title actions besides the built-in Add.
  readonly extraActions?: ReactNode;
}

// Component

export const CrudPage = <Row extends TenantRow>({
  title, subtitle, breadcrumb, api, columns, fields, makeEmpty, rowToForm,
  validate, searchFn, searchPlaceholder, emptyTitle, emptyHint, addLabel,
  hasActiveToggle = true, extraActions,
}: CrudPageProps<Row>): ReturnType<FC> => {
  const toast = useToast();
  const [form, setForm] = useState<Partial<Row> | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<Row | null>(null);

  const openCreate = () => { setEditingId(null); setForm(makeEmpty()); };
  const openEdit = (row: Row) => {
    setEditingId(row.id);
    setForm(rowToForm ? rowToForm(row) : (row as Partial<Row>));
  };

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!form) return;
    const err = validate?.(form);
    if (err) { toast.error(err); return; }
    try {
      if (editingId) {
        await api.update(editingId, form);
        toast.success(`${title} updated.`);
      } else {
        await api.create(form as Omit<Row, 'id' | 'createdAt' | 'storeId' | 'outletId'>);
        toast.success(`${title} added.`);
      }
      setForm(null); setEditingId(null);
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'Save failed.');
    }
  };

  const handleDelete = async (row: Row) => {
    try {
      await api.remove(row.id);
      toast.success('Deleted.');
      setConfirming(null);
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'Delete failed.');
    }
  };

  const columnsWithActions: DataTableColumn<Row>[] = [
    ...columns,
    ...(hasActiveToggle
      ? [{
          key: '__status__',
          label: 'Status',
          render: (r: Row) => (
            <Badge variant={r.active === false ? 'danger' : 'success'}>
              {r.active === false ? 'Inactive' : 'Active'}
            </Badge>
          ),
        } as DataTableColumn<Row>]
      : []),
    {
      key: '__actions__',
      label: 'Actions',
      actions: true,
      render: (row) => (
        <>
          <Button variant="ghost" size="sm"
                  onClick={(e) => { e.stopPropagation(); openEdit(row); }}>
            Edit
          </Button>
          {hasActiveToggle && (
            // NOTE: variant stays 'ghost' regardless of active state so the
            // Actions column doesn't jump between rows. Only the LABEL flips.
            <Button variant="ghost" size="sm"
                    onClick={(e) => { e.stopPropagation();
                      void api.setActive(row.id, row.active === false); }}>
              {row.active === false ? 'Activate' : 'Deactivate'}
            </Button>
          )}
          <Button variant="ghost" size="sm" tone="danger"
                  onClick={(e) => { e.stopPropagation(); setConfirming(row); }}>
            Delete
          </Button>
        </>
      ),
    } as DataTableColumn<Row>,
  ];

  return (
    <AdminPage
      title={title}
      subtitle={subtitle}
      breadcrumb={breadcrumb}
      actions={
        <>
          {extraActions}
          <Button variant="primary" leadingIcon="plus" onClick={openCreate}>
            {addLabel ?? `Add ${singularize(title)}`}
          </Button>
        </>
      }
    >
      <DataTable
        data={api.rows as Row[]}
        getKey={(r) => r.id}
        columns={columnsWithActions}
        searchPlaceholder={searchPlaceholder}
        searchFn={searchFn}
        emptyTitle={emptyTitle ?? `No ${title.toLowerCase()} yet.`}
        emptyHint={emptyHint ?? 'Click Add to get started.'}
        getRowMuted={(r) => r.active === false}
        defaultPageSize={20}
      />

      {form && (
        <Modal
          title={editingId ? `Edit ${singularize(title)}`
                           : `Add ${singularize(title)}`}
          onClose={() => { setForm(null); setEditingId(null); }}
          closeLabel="Close"
          wide
          footer={
            <>
              <Button variant="secondary"
                      onClick={() => { setForm(null); setEditingId(null); }}>
                Cancel
              </Button>
              <Button variant="primary" leadingIcon="check" onClick={() => void handleSubmit()}>
                Save
              </Button>
            </>
          }
        >
          <form onSubmit={handleSubmit} className={cls.crudForm}>
            {fields.map((f) => renderField(f, form, setForm))}
            <button type="submit" hidden />
          </form>
        </Modal>
      )}

      {confirming && (
        <ConfirmDialog
          title={`${STRINGS.common.delete} this ${singularize(title).toLowerCase()}?`}
          message="This cannot be undone."
          confirmLabel="Delete"
          danger
          onConfirm={() => void handleDelete(confirming)}
          onCancel={() => setConfirming(null)}
        />
      )}
    </AdminPage>
  );
};

// Field renderer - switch over descriptor type

function renderField<Row>(
  field: FormFieldDescriptor<Row>,
  form: Partial<Row>,
  setForm: (patch: Partial<Row>) => void,
): ReactNode {
  const key = field.key;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const value = (form as any)[key];
  const update = (v: unknown) => setForm({ ...form, [key]: v } as Partial<Row>);
  const id = `crud-f-${key}`;

  switch (field.type) {
    case 'text':
      return (
        <Field key={key} label={field.label} htmlFor={id} required={field.required} hint={field.hint}>
          <Input id={id} value={value ?? ''} placeholder={field.placeholder}
                 onChange={(e) => update(e.target.value)} required={field.required} />
        </Field>
      );
    case 'textarea':
      return (
        <Field key={key} label={field.label} htmlFor={id} hint={field.hint}>
          <textarea id={id} value={value ?? ''} rows={3}
                    className={cls.crudTextarea}
                    onChange={(e) => update(e.target.value)} />
        </Field>
      );
    case 'number':
      return (
        <Field key={key} label={field.label} htmlFor={id} required={field.required} hint={field.hint}>
          <Input id={id} type="number" value={value ?? 0}
                 min={field.min} step={field.step ?? 1}
                 onChange={(e) => update(Number(e.target.value))} required={field.required} />
        </Field>
      );
    case 'select':
      return (
        <Field key={key} label={field.label} htmlFor={id} required={field.required} hint={field.hint}>
          <Select id={id} value={value ?? ''} onChange={(e) => update(e.target.value)}>
            {field.options?.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        </Field>
      );
    case 'boolean':
      return (
        <Field key={key} label={field.label} htmlFor={id} hint={field.hint}>
          <label className={cls.crudBoolLabel}>
            <input id={id} type="checkbox" checked={!!value}
                   onChange={(e) => update(e.target.checked)} />
            <Text size="sm">{value ? 'Yes' : 'No'}</Text>
          </label>
        </Field>
      );
  }
}
