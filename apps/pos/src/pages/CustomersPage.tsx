// CustomersPage — list, search, and create customers. Row click navigates to /customers/:id.
//
// SCOPING (real-world model):
//  * Customer records are STORE-scoped (chain-wide). A customer registered at
//    outlet A can be recognised by phone at outlet B, and their loyalty /
//    lending balance follows them. This is how QSR chains actually work.
//  * BUT outlet managers care about "their" customers day-to-day, so this
//    page defaults to "This outlet" - customers who have at least one sale
//    from the currently-selected outlet, PLUS anyone with an outstanding
//    lending balance (financial obligation must never be hidden).
//  * A "All outlets" toggle exposes the full chain customer list.
import { useMemo, useState, type FC, type FormEvent } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import cls from './pages.module.css';
import { Badge, Button, Field, Input, Text, Textarea } from '@billing/ui/atoms';
import { Modal } from '@billing/ui/organisms';
import { ConfirmDialog } from '@billing/ui/feedback';
import { DataTable, MobileNumberField } from '@billing/ui/molecules';
import { PageHeader } from '../RegisterShell';
import { STRINGS } from '@billing/shared/domain/strings';
import { digitsOnly, fmtDate, formatPhone } from '@billing/shared/domain/format';
import { useMoney } from '@billing/shared/hooks/useMoney';
import { useAuth, useCurrentOutletId } from '@billing/shared/store/AuthContext';
import { useCustomers } from '@billing/shared/store/CustomersContext';
import { useSales } from '@billing/shared/store/SalesContext';
import { useToast } from '@billing/shared/store/ToastContext';
import type { Customer } from '@billing/shared/domain/types';

interface FormState {
  name: string;
  mobile: string;
  email: string;
  notes: string;
}
const emptyForm = (): FormState => ({ name: '', mobile: '', email: '', notes: '' });

export const CustomersPage: FC = () => {
  const { slug = '' } = useParams<{ slug: string }>();
  const { money } = useMoney();
  const { customers, create, remove } = useCustomers();
  const { sales } = useSales();
  const currentOutletId = useCurrentOutletId();
  const { can } = useAuth();
  const canDelete = can('customer:delete');
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = location.pathname.includes('/admin/');
  const toast = useToast();
  const [form, setForm] = useState<FormState | null>(null);
  const [mobileError, setMobileError] = useState<string | undefined>();
  const [confirmingDelete, setConfirmingDelete] = useState<Customer | null>(null);
  const [scope, setScope] = useState<'outlet' | 'chain'>('outlet');

  // Customer IDs that have at least one sale from the currently-selected outlet.
  // Recomputed only when sales list or outlet changes.
  const outletCustomerIds = useMemo(() => {
    if (!currentOutletId) return new Set<string>();
    const ids = new Set<string>();
    for (const s of sales) {
      if (s.outletId === currentOutletId && s.customerId) ids.add(s.customerId);
    }
    return ids;
  }, [sales, currentOutletId]);

  // "This outlet" view = customers who ordered here + anyone with a live
  // lending balance (obligations follow the chain, never hide them).
  const visibleCustomers = useMemo(() => {
    if (scope === 'chain' || !currentOutletId) return customers;
    return customers.filter(
      (c) => outletCustomerIds.has(c.id) || c.lendingBalance > 0.001,
    );
  }, [customers, scope, currentOutletId, outletCustomerIds]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form) return;
    const mobile = digitsOnly(form.mobile);
    if (mobile.length !== 10) {
      setMobileError(STRINGS.payment.mobileError);
      return;
    }
    if (!form.name.trim()) {
      toast.error(STRINGS.customers.nameRequired);
      return;
    }
    const res = await create({
      name: form.name,
      mobile,
      email: form.email.trim() || null,
      notes: form.notes.trim() || null,
    });
    if (!res.ok) {
      toast.error(STRINGS.customers.duplicateMobile);
      return;
    }
    toast.success(STRINGS.customers.added);
    setForm(null);
    navigate(`/${slug}/cashier/customers/${res.customer.id}`);
  };

  return (
    <>
      <PageHeader
        title={STRINGS.customers.pageTitle}
        subtitle={STRINGS.customers.pageSubtitle}
        breadcrumbs={[
          { label: isAdmin ? STRINGS.nav.dashboard : STRINGS.nav.cashier, href: isAdmin ? `/${slug}/admin` : `/${slug}/cashier` },
          { label: STRINGS.customers.pageTitle },
        ]}
        actions={
          <>
            {currentOutletId && (
              // Chain vs outlet scope toggle. Keeps managers focused on their
              // outlet's customers by default but exposes the full chain.
              <div className={cls.customerScopeToggle} role="group" aria-label="Customer scope">
                <Button
                  variant={scope === 'outlet' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setScope('outlet')}
                >
                  This outlet
                </Button>
                <Button
                  variant={scope === 'chain' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setScope('chain')}
                >
                  All outlets
                </Button>
              </div>
            )}
            <Button
              variant="primary"
              leadingIcon="plus"
              onClick={() => { setMobileError(undefined); setForm(emptyForm()); }}
            >
              {STRINGS.customers.addNew}
            </Button>
          </>
        }
      />

      <DataTable
        data={visibleCustomers}
        getKey={(c) => c.id}
        searchPlaceholder={STRINGS.customers.searchPlaceholder}
        searchFn={(c, q) => c.name.toLowerCase().includes(q) || c.mobile.includes(q)}
        onRowClick={(c) => navigate(`/${slug}/cashier/customers/${c.id}`)}
        emptyIcon="user"
        emptyTitle={scope === 'outlet' ? 'No customers at this outlet yet' : STRINGS.customers.empty}
        emptyHint={
          scope === 'outlet'
            ? 'Switch to "All outlets" to see the full chain, or add a new customer.'
            : STRINGS.customers.emptyHint
        }
        emptySearchTitle={STRINGS.customers.emptySearch}
        emptySearchHint={STRINGS.customers.emptySearchHint}
        defaultPageSize={25}
        columns={[
          {
            key: 'name',
            label: STRINGS.customers.columnName,
            sortValue: (c) => c.name,
            render: (c) => <Text weight="semibold" size="sm">{c.name}</Text>,
          },
          {
            key: 'mobile',
            label: STRINGS.customers.columnMobile,
            render: (c) => <Text size="sm">{formatPhone(c.mobile)}</Text>,
          },
          {
            key: 'email',
            label: STRINGS.customers.columnEmail,
            render: (c) => (
              <Text size="sm" tone={c.email ? 'default' : 'muted'}>{c.email ?? '—'}</Text>
            ),
          },
          {
            key: 'balance',
            label: STRINGS.customers.columnBalance,
            numeric: true,
            sortValue: (c) => c.lendingBalance,
            render: (c) =>
              c.lendingBalance > 0 ? (
                <Badge variant="danger">{money(c.lendingBalance)}</Badge>
              ) : (
                <Badge variant="success">Clear</Badge>
              ),
          },
          {
            key: 'since',
            label: STRINGS.customers.columnSince,
            sortValue: (c) => c.createdAt,
            render: (c) => <Text size="sm" tone="subtle">{fmtDate(c.createdAt)}</Text>,
          },
          {
            key: 'actions',
            label: STRINGS.customers.columnActions,
            actions: true,
            render: (c) => (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); navigate(`/${slug}/cashier/customers/${c.id}`); }}
                >
                  {STRINGS.customers.view}
                </Button>
                {canDelete && (
                  <Button
                    variant="ghost"
                    tone="danger"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); setConfirmingDelete(c); }}
                  >
                    Delete
                  </Button>
                )}
              </>
            ),
          },
        ]}
      />

      {form && (
        <Modal
          title={STRINGS.customers.createHeading}
          onClose={() => setForm(null)}
          closeLabel={STRINGS.ariaLabels.closeModal}
          footer={
            <>
              <Button variant="secondary" onClick={() => setForm(null)}>
                {STRINGS.common.cancel}
              </Button>
              <Button variant="primary" onClick={handleSubmit} leadingIcon="check">
                {STRINGS.customers.save}
              </Button>
            </>
          }
        >
          <form onSubmit={handleSubmit} className={cls.formGrid}>
            <Field label={STRINGS.customers.fieldName} htmlFor="c-name" required>
              <Input id="c-name" required autoFocus value={form.name}
                     onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <MobileNumberField
              id="c-mobile"
              value={form.mobile}
              onChange={(v) => { setForm({ ...form, mobile: v }); setMobileError(undefined); }}
              error={mobileError}
              required
            />
            <Field label={STRINGS.customers.fieldEmail} htmlFor="c-email">
              <Input id="c-email" type="email" value={form.email}
                     onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label={STRINGS.customers.fieldNotes} htmlFor="c-notes">
              <Textarea id="c-notes" value={form.notes}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
            <button type="submit" hidden />
          </form>
        </Modal>
      )}

      {confirmingDelete && (
        <ConfirmDialog
          title="Delete customer?"
          message={
            confirmingDelete.lendingBalance > 0
              ? `${confirmingDelete.name} has an outstanding lending balance of ${money(confirmingDelete.lendingBalance)}. Clear it before deleting.`
              : `${confirmingDelete.name} and all their payment history will be permanently removed. This can't be undone.`
          }
          confirmLabel="Delete customer"
          danger
          onConfirm={async () => {
            const res = await remove(confirmingDelete.id);
            if (!res.ok) {
              toast.error(
                res.error === 'hasBalance'
                  ? 'Cannot delete — outstanding balance.'
                  : 'Customer not found.',
              );
            } else {
              toast.success(`${confirmingDelete.name} deleted.`);
            }
            setConfirmingDelete(null);
          }}
          onCancel={() => setConfirmingDelete(null)}
        />
      )}
    </>
  );
};
