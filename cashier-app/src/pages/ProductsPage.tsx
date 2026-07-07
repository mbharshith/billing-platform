/**
 * ProductsPage — catalog CRUD (admin only).
 * Search, list, add/edit modal, deactivate.
 */
import { useMemo, useState, type FC, type FormEvent } from 'react';
import cls from './pages.module.css';
import { Badge, Button, Field, Input, Select, Text } from '../components/atoms';
import { Modal } from '../components/organisms';
import { ProductBadge, SearchBar } from '../components/molecules';
import { ConfirmDialog } from '../components/feedback';
import { PageHeader } from '../components/layout/AppShell';
import { STRINGS } from '../domain/strings';
import { money } from '../domain/format';
import { ALL_CATEGORIES, ALL_TONES } from '../domain/catalog';
import { useProducts, type ProductInput } from '../store/ProductsContext';
import { useToast } from '../store/ToastContext';
import type { BadgeTone, Product, ProductCategory } from '../domain/types';

interface FormState extends ProductInput { id: string | null }
const emptyForm = (): FormState => ({
  id: null, sku: '', name: '', price: 0, category: 'Grocery', tone: 'sky', stock: 0,
});
const fromProduct = (p: Product): FormState => ({
  id: p.id, sku: p.sku, name: p.name, price: p.price,
  category: p.category, tone: p.tone, stock: p.stock,
});

export const ProductsPage: FC = () => {
  const { products, create, update, setActive } = useProducts();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [form, setForm] = useState<FormState | null>(null);
  const [confirming, setConfirming] = useState<Product | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) =>
      p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
  }, [products, query]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!form) return;
    if (!form.sku.trim() || !form.name.trim()) {
      toast.error('SKU and name are required.');
      return;
    }
    const payload: ProductInput = {
      sku: form.sku, name: form.name.trim(), price: Number(form.price) || 0,
      category: form.category, tone: form.tone, stock: Math.max(Math.floor(Number(form.stock) || 0), 0),
    };
    const result = form.id === null ? create(payload) : update(form.id, payload);
    if (!result.ok) {
      toast.error(STRINGS.products.duplicateSku);
      return;
    }
    toast.success(STRINGS.products.saved);
    setForm(null);
  };

  const handleToggle = (p: Product) => {
    if (p.active) setConfirming(p);
    else {
      setActive(p.id, true);
      toast.success(`${p.name} reactivated.`);
    }
  };

  return (
    <>
      <PageHeader
        title={STRINGS.products.pageTitle}
        subtitle={STRINGS.products.pageSubtitle}
        actions={<Button variant="primary" leadingIcon="plus" onClick={() => setForm(emptyForm())}>{STRINGS.products.addNew}</Button>}
      />

      <div className={cls.card}>
        <div className={cls.toolbar}>
          <div className={cls.toolbar__search}>
            <SearchBar value={query} onChange={setQuery}
                       placeholder="Search by name or SKU…" clearLabel="Clear search" />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className={cls.cardBody}>
            <Text tone="subtle" center>
              {products.length === 0 ? STRINGS.products.empty : 'No products match your search.'}
            </Text>
            {products.length === 0 && <Text size="sm" tone="subtle" center>{STRINGS.products.emptyHint}</Text>}
          </div>
        ) : (
          <div className={cls.tableWrap}>
            <table className={cls.table}>
              <thead>
                <tr>
                  <th>{STRINGS.products.columnSku}</th>
                  <th>{STRINGS.products.columnName}</th>
                  <th>Category</th>
                  <th className="numeric">{STRINGS.products.columnPrice}</th>
                  <th className="numeric">{STRINGS.products.columnStock}</th>
                  <th>{STRINGS.products.columnStatus}</th>
                  <th className="actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className={!p.active ? cls.mutedRow : undefined}>
                    <td><Text size="sm" weight="semibold">{p.sku}</Text></td>
                    <td>
                      <span className={cls.rowChip}>
                        <ProductBadge name={p.name} tone={p.tone} size="sm" />
                        <Text weight="semibold" size="sm">{p.name}</Text>
                      </span>
                    </td>
                    <td><Text size="sm" tone="subtle">{p.category}</Text></td>
                    <td className="numeric"><Text weight="semibold" size="sm">{money(p.price)}</Text></td>
                    <td className="numeric"><Text size="sm">{p.stock}</Text></td>
                    <td>
                      <Badge variant={p.active ? 'success' : 'danger'}>
                        {p.active ? STRINGS.products.active : STRINGS.products.inactive}
                      </Badge>
                    </td>
                    <td className="actions">
                      <Button variant="ghost" size="sm" onClick={() => setForm(fromProduct(p))}>
                        {STRINGS.products.edit}
                      </Button>
                      <Button variant={p.active ? 'danger' : 'secondary'} size="sm"
                              onClick={() => handleToggle(p)}>
                        {p.active ? STRINGS.products.deactivate : STRINGS.products.activate}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {form && (
        <Modal
          title={form.id === null ? STRINGS.products.createHeading : STRINGS.products.editHeading}
          onClose={() => setForm(null)}
          closeLabel={STRINGS.ariaLabels.closeModal}
          wide
          footer={
            <>
              <Button variant="secondary" onClick={() => setForm(null)}>{STRINGS.common.cancel}</Button>
              <Button variant="primary" onClick={handleSubmit} leadingIcon="check">{STRINGS.products.save}</Button>
            </>
          }
        >
          <form onSubmit={handleSubmit} className={cls.formGrid}>
            <div className={[cls.formGrid, cls['formGrid--two']].join(' ')}>
              <Field label={STRINGS.products.fieldSku} htmlFor="p-sku" required>
                <Input id="p-sku" required autoFocus value={form.sku}
                       onChange={(e) => setForm({ ...form, sku: e.target.value })} />
              </Field>
              <Field label={STRINGS.products.fieldName} htmlFor="p-name" required>
                <Input id="p-name" required value={form.name}
                       onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </Field>
            </div>
            <div className={[cls.formGrid, cls['formGrid--two']].join(' ')}>
              <Field label={STRINGS.products.fieldPrice} htmlFor="p-price" required>
                <Input id="p-price" type="number" min={0} step={0.01} value={form.price}
                       onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
              </Field>
              <Field label={STRINGS.products.fieldStock} htmlFor="p-stock">
                <Input id="p-stock" type="number" min={0} step={1} value={form.stock}
                       onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} />
              </Field>
            </div>
            <div className={[cls.formGrid, cls['formGrid--two']].join(' ')}>
              <Field label={STRINGS.products.fieldCategory} htmlFor="p-cat">
                <Select id="p-cat" value={form.category}
                        onChange={(e) => setForm({ ...form, category: e.target.value as ProductCategory })}>
                  {ALL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </Field>
              <Field label={STRINGS.products.fieldTone} htmlFor="p-tone">
                <Select id="p-tone" value={form.tone}
                        onChange={(e) => setForm({ ...form, tone: e.target.value as BadgeTone })}>
                  {ALL_TONES.map((t) => <option key={t} value={t}>{t}</option>)}
                </Select>
              </Field>
            </div>
            <button type="submit" hidden />
          </form>
        </Modal>
      )}

      {confirming && (
        <ConfirmDialog
          title="Deactivate product?"
          message={STRINGS.products.deleteConfirm}
          confirmLabel={STRINGS.products.deactivate}
          danger
          onConfirm={() => {
            setActive(confirming.id, false);
            toast.success(`${confirming.name} deactivated.`);
            setConfirming(null);
          }}
          onCancel={() => setConfirming(null)}
        />
      )}
    </>
  );
};
