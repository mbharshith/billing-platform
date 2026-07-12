// ProductsPage — catalog CRUD (admin only).
import { useState, type FC, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import cls from './pages.module.css';
import { Badge, Button, Field, Input, Select, Text } from '@billing/ui/atoms';
import { Modal } from '@billing/ui/organisms';
import { DataTable, ProductBadge } from '@billing/ui/molecules';
import { ConfirmDialog } from '@billing/ui/feedback';
import { PageHeader } from '../CounterShell';
import { STRINGS } from '@billing/shared/domain/strings';
import { useMoney } from '@billing/shared/hooks/useMoney';
import { ALL_CATEGORIES, ALL_TONES } from '@billing/shared/domain/catalog';
import { useProducts, type ProductInput } from '@billing/shared/store/ProductsContext';
import { useToast } from '@billing/shared/store/ToastContext';
import type { BadgeTone, Product, ProductCategory } from '@billing/shared/domain/types';

interface FormState extends ProductInput { id: string | null }
const emptyForm = (): FormState => ({
  id: null, sku: '', name: '', price: 0, category: 'Grocery', tone: 'sky', stock: 0,
});
const fromProduct = (p: Product): FormState => ({
  id: p.id, sku: p.sku, name: p.name, price: p.price,
  category: p.category, tone: p.tone, stock: p.stock,
});

export const ProductsPage: FC = () => {
  const { money } = useMoney();
  const { slug = '' } = useParams<{ slug: string }>();
  const { products, create, update, setActive } = useProducts();
  const toast = useToast();
  const [form, setForm] = useState<FormState | null>(null);
  const [confirming, setConfirming] = useState<Product | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form) return;
    if (!form.sku.trim() || !form.name.trim()) {
      toast.error(STRINGS.products.skuNameRequired);
      return;
    }
    const payload: ProductInput = {
      sku: form.sku, name: form.name.trim(), price: Number(form.price) || 0,
      category: form.category, tone: form.tone,
      stock: Math.max(Math.floor(Number(form.stock) || 0), 0),
    };
    const result = form.id === null ? await create(payload) : await update(form.id, payload);
    if (!result.ok) {
      toast.error(STRINGS.products.duplicateSku);
      return;
    }
    toast.success(STRINGS.products.saved);
    setForm(null);
  };

  const handleToggle = async (p: Product) => {
    if (p.active) setConfirming(p);
    else {
      await setActive(p.id, true);
      toast.success(STRINGS.products.reactivated(p.name));
    }
  };

  return (
    <>
      <PageHeader
        title={STRINGS.products.pageTitle}
        subtitle={STRINGS.products.pageSubtitle}
        breadcrumbs={[
          { label: STRINGS.nav.dashboard, href: `/${slug}/admin` },
          { label: STRINGS.products.pageTitle },
        ]}
        actions={
          <Button variant="primary" leadingIcon="plus" onClick={() => setForm(emptyForm())}>
            {STRINGS.products.addNew}
          </Button>
        }
      />

      <DataTable
        data={products}
        getKey={(p) => p.id}
        searchPlaceholder={STRINGS.products.searchPlaceholder}
        searchFn={(p, q) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)}
        getRowMuted={(p) => !p.active}
        emptyIcon="bag"
        emptyTitle={STRINGS.products.empty}
        emptyHint={STRINGS.products.emptyHint}
        emptySearchTitle={STRINGS.products.emptySearch}
        emptySearchHint={STRINGS.products.emptySearchHint}
        defaultPageSize={25}
        columns={[
          {
            key: 'sku',
            label: STRINGS.products.columnSku,
            sortValue: (p) => p.sku,
            render: (p) => <Text size="sm" weight="semibold">{p.sku}</Text>,
          },
          {
            key: 'name',
            label: STRINGS.products.columnName,
            sortValue: (p) => p.name,
            render: (p) => (
              <span className={cls.rowChip}>
                <ProductBadge name={p.name} tone={p.tone} size="sm" />
                <Text weight="semibold" size="sm">{p.name}</Text>
              </span>
            ),
          },
          {
            key: 'category',
            label: 'Category',
            sortValue: (p) => p.category,
            render: (p) => <Text size="sm" tone="subtle">{p.category}</Text>,
          },
          {
            key: 'price',
            label: STRINGS.products.columnPrice,
            numeric: true,
            sortValue: (p) => p.price,
            render: (p) => <Text weight="semibold" size="sm">{money(p.price)}</Text>,
          },
          {
            key: 'stock',
            label: STRINGS.products.columnStock,
            numeric: true,
            sortValue: (p) => p.stock,
            render: (p) => <Text size="sm">{p.stock}</Text>,
          },
          {
            key: 'status',
            label: STRINGS.products.columnStatus,
            render: (p) => (
              <Badge variant={p.active ? 'success' : 'danger'}>
                {p.active ? STRINGS.products.active : STRINGS.products.inactive}
              </Badge>
            ),
          },
          {
            key: 'actions',
            label: 'Actions',
            actions: true,
            render: (p) => (
              <>
                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setForm(fromProduct(p)); }}>
                  {STRINGS.products.edit}
                </Button>
                <Button
                  variant={p.active ? 'danger' : 'secondary'}
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); void handleToggle(p); }}
                >
                  {p.active ? STRINGS.products.deactivate : STRINGS.products.activate}
                </Button>
              </>
            ),
          },
        ]}
      />

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
          onConfirm={async () => {
            await setActive(confirming.id, false);
            toast.success(`${confirming.name} deactivated.`);
            setConfirming(null);
          }}
          onCancel={() => setConfirming(null)}
        />
      )}
    </>
  );
};
