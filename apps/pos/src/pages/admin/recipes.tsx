// Recipes - link a menu item to the ingredient components it consumes.
//
// Each Recipe belongs to a Product (menu item) and has 0..N components
// (ingredientId x quantity + unit). The recipe drives inventory deduction
// when the product is sold (future wiring - table + edit surface first).
//
// Uses CrudPage for the base list + LineItemsEditor inside a custom modal
// for the nested components. CrudPage's schema-based form can't do nested
// arrays so we own the modal here.

import { useCallback, useMemo, useState, type FC } from 'react';
import { AdminPage, LineItemsEditor, type LineItemColumn } from '@billing/ui/admin';
import { Badge, Button, Text } from '@billing/ui/atoms';
import { DataTable, type DataTableColumn } from '@billing/ui/molecules';
import { Modal } from '@billing/ui/organisms';
import { useTable } from '@billing/shared/hooks/useTable';
import { useToast } from '@billing/shared/store/ToastContext';
import { useProducts } from '@billing/shared/store/ProductsContext';
import type { Recipe, RecipeComponent, Ingredient } from '@billing/shared/domain/restaurant';

const UNIT_OPTIONS: readonly { value: Ingredient['unit']; label: string }[] = [
  { value: 'g',     label: 'grams' },
  { value: 'kg',    label: 'kg' },
  { value: 'ml',    label: 'ml' },
  { value: 'l',     label: 'litres' },
  { value: 'unit',  label: 'units' },
  { value: 'dozen', label: 'dozen' },
];

interface RecipeForm {
  readonly menuItemId: string;
  readonly yieldQty: number;
  readonly notes: string;
  readonly components: readonly RecipeComponent[];
}

const emptyForm = (): RecipeForm => ({
  menuItemId: '', yieldQty: 1, notes: '', components: [],
});

const emptyComponent = (): RecipeComponent => ({
  ingredientId: '', quantity: 0, unit: 'g',
});


export const RecipesPage: FC = () => {
  const recipes     = useTable<Recipe>('recipes');
  const ingredients = useTable<Ingredient>('ingredients');
  const { products } = useProducts();
  const toast = useToast();

  const [editing, setEditing] = useState<{ id: string | null; form: RecipeForm } | null>(null);
  const [saving, setSaving]   = useState(false);

  const ingByIdName = useMemo(
    () => new Map(ingredients.rows.map((i) => [i.id, i.name])),
    [ingredients.rows],
  );
  const prodByIdName = useMemo(
    () => new Map(products.map((p) => [p.id, p.name])),
    [products],
  );

  const ingOptions = useMemo(
    () => ingredients.rows
      .filter((i) => i.active !== false)
      .map((i) => ({ value: i.id, label: `${i.name} (${i.unit})` })),
    [ingredients.rows],
  );
  const prodOptions = useMemo(
    () => products.map((p) => ({ value: p.id, label: p.name })),
    [products],
  );

  const openNew  = () => setEditing({ id: null, form: emptyForm() });
  const openEdit = (r: Recipe) => setEditing({
    id: r.id,
    form: { menuItemId: r.menuItemId, yieldQty: r.yieldQty, notes: r.notes, components: [...r.components] },
  });
  const close = () => setEditing(null);

  const patch = useCallback(<K extends keyof RecipeForm>(k: K, v: RecipeForm[K]) => {
    setEditing((e) => (e ? { ...e, form: { ...e.form, [k]: v } } : e));
  }, []);

  const componentColumns: readonly LineItemColumn<RecipeComponent>[] = [
    { key: 'ingredientId', label: 'Ingredient', kind: 'select', options: ingOptions, width: '2fr' },
    { key: 'quantity',     label: 'Quantity',   kind: 'number', step: 0.1, width: '110px' },
    { key: 'unit',         label: 'Unit',       kind: 'select',
      options: UNIT_OPTIONS.map((u) => ({ value: u.value, label: u.label })), width: '110px' },
  ];

  const save = async () => {
    if (!editing) return;
    const { id, form } = editing;
    if (!form.menuItemId)                   { toast.error('Pick a menu item.');            return; }
    if (form.components.length === 0)       { toast.error('Add at least one component.');  return; }
    if (form.components.some((c) => !c.ingredientId || c.quantity <= 0)) {
      toast.error('Every component needs an ingredient and a positive quantity.');
      return;
    }
    setSaving(true);
    try {
      if (id) {
        await recipes.update(id, {
          menuItemId: form.menuItemId, yieldQty: form.yieldQty,
          notes: form.notes, components: form.components,
        });
        toast.success('Recipe updated.');
      } else {
        await recipes.create({
          menuItemId: form.menuItemId, yieldQty: form.yieldQty,
          notes: form.notes, components: form.components,
        } as Omit<Recipe, 'id' | 'createdAt' | 'storeId'>);
        toast.success('Recipe added.');
      }
      close();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: Recipe) => {
    if (!window.confirm(`Delete recipe for "${prodByIdName.get(row.menuItemId) ?? row.menuItemId}"?`)) return;
    try {
      await recipes.remove(row.id);
      toast.success('Recipe deleted.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed.');
    }
  };

  const columns: DataTableColumn<Recipe>[] = [
    { key: 'menuItem', label: 'Menu item',  render: (r) => prodByIdName.get(r.menuItemId) ?? <em>unknown</em>,
      sortValue: (r) => prodByIdName.get(r.menuItemId) ?? '' },
    { key: 'comps',    label: 'Components', numeric: true,
      render: (r) => <Badge variant="neutral">{r.components.length}</Badge> },
    { key: 'yield',    label: 'Yield',      numeric: true, sortValue: (r) => r.yieldQty,
      render: (r) => r.yieldQty },
    { key: 'summary',  label: 'Summary',
      render: (r) => r.components.length === 0
        ? <Text tone="subtle">-</Text>
        : (
          <Text tone="subtle" size="sm">
            {r.components.slice(0, 3).map((c) => `${c.quantity}${c.unit} ${ingByIdName.get(c.ingredientId) ?? '?'}`).join(', ')}
            {r.components.length > 3 && `, +${r.components.length - 3} more`}
          </Text>
        ) },
    { key: 'actions',  label: '', actions: true,
      render: (r) => (
        <>
          <Button variant="ghost"     size="sm" onClick={() => openEdit(r)}>Edit</Button>
          <Button variant="ghost"     size="sm" onClick={() => remove(r)}>Delete</Button>
        </>
      ) },
  ];

  return (
    <AdminPage
      title="Recipes"
      subtitle="Link menu items to the ingredients they consume."
      actions={<Button variant="primary" leadingIcon="plus" onClick={openNew}>New recipe</Button>}
    >
      <DataTable
        data={recipes.rows}
        columns={columns}
        getKey={(r) => r.id}
        emptyTitle="No recipes yet"
        emptyHint="Click 'New recipe' to link a menu item to its ingredients."
      />

      {editing && (
        <Modal
          title={editing.id ? 'Edit recipe' : 'New recipe'}
          subtitle="Menu items -> ingredient consumption (used for inventory deduction on sale)."
          onClose={close}
          wide
          closeLabel="Close"
          footer={
            <>
              <Button variant="secondary" onClick={close}>Cancel</Button>
              <Button variant="primary" loading={saving} onClick={save}>Save recipe</Button>
            </>
          }
        >
          <div style={{ display: 'grid', gap: 16 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>Menu item</span>
              <select value={editing.form.menuItemId}
                      onChange={(e) => patch('menuItemId', e.target.value)}
                      style={selectStyle}>
                <option value="">- pick a menu item -</option>
                {prodOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>Yield (portions produced)</span>
                <input type="number" min={1} step={1} value={editing.form.yieldQty}
                       onChange={(e) => patch('yieldQty', Number(e.target.value) || 1)}
                       style={selectStyle} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>Notes</span>
                <input type="text" value={editing.form.notes}
                       onChange={(e) => patch('notes', e.target.value)}
                       placeholder="e.g. Vegan variant" style={selectStyle} />
              </label>
            </div>

            <div>
              <Text size="sm" weight="semibold" as="div">Components</Text>
              <Text size="xs" tone="subtle" as="div">
                One row per ingredient consumed by a single yield unit.
              </Text>
            </div>
            <LineItemsEditor<RecipeComponent>
              items={editing.form.components}
              onChange={(next) => patch('components', next)}
              columns={componentColumns}
              makeEmpty={emptyComponent}
              addLabel="Add ingredient"
              emptyLabel="No components yet."
            />
          </div>
        </Modal>
      )}
    </AdminPage>
  );
};

const selectStyle: React.CSSProperties = {
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid var(--app-border)',
  background: 'var(--app-surface)',
  color: 'var(--app-text)',
  font: 'inherit',
  fontSize: 13,
};
