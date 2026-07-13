// CustomerDetailPage — customer profile, lending balance, sales history, and payment recording.
import { useMemo, useState, type FC, type FormEvent } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import cls from './pages.module.css';
import { Badge, Button, Field, Input, Select, Text, Textarea } from '@billing/ui/atoms';
import { Modal } from '@billing/ui/organisms';
import { ConfirmDialog } from '@billing/ui/feedback';
import { DataTable, PaymentBadge } from '@billing/ui/molecules';
import { PageHeader } from '../RegisterShell';
import { STRINGS } from '@billing/shared/domain/strings';
import { fmtDate, fmtDateTime, formatPhone } from '@billing/shared/domain/format';
import { useMoney } from '@billing/shared/hooks/useMoney';
import { useAuth } from '@billing/shared/store/AuthContext';
import { useCustomers } from '@billing/shared/store/CustomersContext';
import { useSales } from '@billing/shared/store/SalesContext';
import { useToast } from '@billing/shared/store/ToastContext';

export const CustomerDetailPage: FC = () => {
  const { money } = useMoney();
  const { id = '', slug = '' } = useParams<{ id: string; slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = location.pathname.includes('/admin/');
  const { byId, paymentsFor, recordPayment, remove } = useCustomers();
  const { forCustomer } = useSales();
  const { currentUser, can } = useAuth();
  const canDelete = can('customer:delete');
  const toast = useToast();

  const customer = byId(id);
  const payments = useMemo(() => paymentsFor(id), [paymentsFor, id]);
  const sales = useMemo(() => forCustomer(id), [forCustomer, id]);

  const [paying, setPaying] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'cash' | 'card'>('cash');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (!customer) {
    return (
      <>
        <PageHeader title={STRINGS.customers.notFound}
                    subtitle={STRINGS.customers.notFoundHint} />
        <Button variant="secondary" leadingIcon="arrow"
                onClick={() => navigate(`/${slug}/cashier/customers`)}>{STRINGS.customers.backToList}</Button>
      </>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    const amt = Number(amount);
    const res = await recordPayment({
      customerId: customer.id, amount: amt, method,
      receivedBy: currentUser.name, notes: notes || null,
    });
    if (!res.ok) {
      const msg = res.error === 'tooHigh'   ? STRINGS.customers.paymentTooHigh
                : res.error === 'invalid'   ? STRINGS.customers.paymentInvalid
                : STRINGS.errors.notFound;
      setError(msg);
      return;
    }
    toast.success(STRINGS.customers.paymentSuccess);
    setPaying(false);
    setAmount(''); setNotes(''); setError(undefined);
  };

  const clearBalance = customer.lendingBalance === 0;

  return (
    <>
      <PageHeader
        title={customer.name}
        subtitle={STRINGS.customers.detailTitle}
        breadcrumbs={[
          { label: isAdmin ? STRINGS.nav.dashboard : STRINGS.nav.cashier, href: isAdmin ? `/${slug}/admin` : `/${slug}/cashier` },
          { label: STRINGS.customers.pageTitle, href: isAdmin ? `/${slug}/admin/customers` : `/${slug}/cashier/customers` },
          { label: customer.name },
        ]}
        actions={
          <>
            <Button variant="ghost" leadingIcon="arrow"
                    onClick={() => navigate(`/${slug}/cashier/customers`)}>{STRINGS.customers.backToList}</Button>
            {canDelete && (
              <Button variant="danger" onClick={() => setConfirmingDelete(true)}>
                {STRINGS.common.delete}
              </Button>
            )}
          </>
        }
      />

      <div className={[cls.balanceRibbon, clearBalance && cls['balanceRibbon--clear']].filter(Boolean).join(' ')}>
        <div>
          <Text size="xs" weight="semibold" tone="inverse" upper>{STRINGS.customers.balanceHeading}</Text>
          <Text size="3xl" weight="heavy" tone="inverse">{money(customer.lendingBalance)}</Text>
        </div>
        {!clearBalance && (
          <Button variant="primary" leadingIcon="coins" onClick={() => setPaying(true)}
                  className={cls.recordPayBtn}>
            {STRINGS.customers.recordPayment}
          </Button>
        )}
      </div>

      <div className={cls.card}>
        <div className={cls.cardHeader}>
          <Text as="h2" size="lg" weight="bold">{STRINGS.customers.sectionProfile}</Text>
        </div>
        <div className={cls.cardBody}>
          <div className={cls.kvList}>
            <div className={cls.kv}>
              <Text size="xs" tone="subtle" weight="semibold" upper>{STRINGS.customers.columnMobile}</Text>
              <Text weight="semibold">{formatPhone(customer.mobile)}</Text>
            </div>
            <div className={cls.kv}>
              <Text size="xs" tone="subtle" weight="semibold" upper>{STRINGS.customers.columnEmail}</Text>
              <Text weight="semibold" tone={customer.email ? 'default' : 'muted'}>
                {customer.email ?? '—'}
              </Text>
            </div>
            <div className={cls.kv}>
              <Text size="xs" tone="subtle" weight="semibold" upper>{STRINGS.customers.columnSince}</Text>
              <Text weight="semibold">{fmtDate(customer.createdAt)}</Text>
            </div>
            {customer.notes && (
              <div className={`${cls.kv} ${cls['kv--spanAll']}`}>
                <Text size="xs" tone="subtle" weight="semibold" upper>{STRINGS.customers.columnNotes}</Text>
                <Text>{customer.notes}</Text>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={cls.card}>
        <div className={cls.cardHeader}>
          <Text as="h2" size="lg" weight="bold">{STRINGS.customers.paymentHistory}</Text>
          <Badge variant="neutral">{payments.length}</Badge>
        </div>
        <DataTable
          flush
          data={payments}
          getKey={(p) => p.id}
          hidePagination
          emptyIcon="coins"
          emptyTitle={STRINGS.customers.paymentEmpty}
          columns={[
            {
              key: 'date',
              label: STRINGS.customers.columnDate,
              sortValue: (p) => p.receivedAt,
              render: (p) => <Text size="sm">{fmtDateTime(p.receivedAt)}</Text>,
            },
            {
              key: 'method',
              label: STRINGS.customers.columnMethodLabel,
              render: (p) => <Badge variant="primary">{p.method}</Badge>,
            },
            {
              key: 'receivedBy',
              label: STRINGS.customers.columnReceivedBy,
              render: (p) => <Text size="sm">{p.receivedBy}</Text>,
            },
            {
              key: 'notes',
              label: STRINGS.customers.columnNotes,
              render: (p) => (
                <Text size="sm" tone={p.notes ? 'default' : 'muted'}>{p.notes ?? '—'}</Text>
              ),
            },
            {
              key: 'amount',
              label: STRINGS.customers.columnAmount,
              numeric: true,
              sortValue: (p) => p.amount,
              render: (p) => (
                <Text weight="bold" size="sm" tone="success">{money(p.amount)}</Text>
              ),
            },
          ]}
        />
      </div>

      <div className={cls.card}>
        <div className={cls.cardHeader}>
          <Text as="h2" size="lg" weight="bold">{STRINGS.customers.saleHistory}</Text>
          <Badge variant="neutral">{sales.length}</Badge>
        </div>
        <DataTable
          flush
          data={sales}
          getKey={(s) => s.id}
          onRowClick={(s) => navigate(`/${slug}/cashier/sales/${s.id}`)}
          hidePagination
          emptyIcon="receipt"
          emptyTitle={STRINGS.customers.saleHistoryEmpty}
          columns={[
            {
              key: 'invoice',
              label: STRINGS.customers.columnInvoice,
              sortValue: (s) => s.invoiceNo,
              render: (s) => <Text weight="semibold" size="sm" tone="primary">{s.invoiceNo}</Text>,
            },
            {
              key: 'date',
              label: STRINGS.customers.columnDate,
              sortValue: (s) => s.completedAt,
              render: (s) => <Text size="sm" tone="subtle">{fmtDateTime(s.completedAt)}</Text>,
            },
            {
              key: 'items',
              label: STRINGS.customers.columnItems,
              numeric: true,
              sortValue: (s) => s.unitCount,
              render: (s) => <Text size="sm">{s.unitCount}</Text>,
            },
            {
              key: 'payment',
              label: STRINGS.customers.columnSalePayment,
              render: (s) => <PaymentBadge method={s.paymentMethod} />,
            },
            {
              key: 'status',
              label: STRINGS.customers.columnStatus,
              render: (s) =>
                s.voided ? (
                  <Badge variant="danger">{STRINGS.sales.voidedBadge}</Badge>
                ) : (
                  <Badge variant="success">{STRINGS.customers.saleComplete}</Badge>
                ),
            },
            {
              key: 'total',
              label: STRINGS.customers.columnTotal,
              numeric: true,
              sortValue: (s) => s.total,
              render: (s) => <Text weight="bold" size="sm">{money(s.total)}</Text>,
            },
          ]}
        />
      </div>

      {paying && (
        <Modal
          title={STRINGS.customers.recordPayment}
          subtitle={STRINGS.customers.recordPaymentHint}
          onClose={() => setPaying(false)}
          closeLabel={STRINGS.ariaLabels.closeModal}
          footer={
            <>
              <Button variant="secondary" onClick={() => setPaying(false)}>{STRINGS.common.cancel}</Button>
              <Button variant="primary" onClick={handleSubmit} leadingIcon="coins">
                {STRINGS.customers.submitPayment}
              </Button>
            </>
          }
        >
          <form onSubmit={handleSubmit} className={cls.formGrid}>
            <Field label={STRINGS.customers.outstandingBalance}>
              <Input value={money(customer.lendingBalance)} readOnly leadingIcon="coins" />
            </Field>
            <Field label={STRINGS.customers.paymentAmount} htmlFor="pay-amt" required error={error}>
              <Input id="pay-amt" type="number" min={0.01} step={0.01}
                     max={customer.lendingBalance}
                     value={amount} autoFocus
                     onChange={(e) => { setAmount(e.target.value); setError(undefined); }}
                     required invalid={error !== undefined} />
            </Field>
            <Field label={STRINGS.customers.paymentMethod} htmlFor="pay-m">
              <Select id="pay-m" value={method} onChange={(e) => setMethod(e.target.value as 'cash' | 'card')}>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
              </Select>
            </Field>
            <Field label={STRINGS.customers.paymentNotes} htmlFor="pay-notes">
              <Textarea id="pay-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
            <button type="submit" hidden />
          </form>
        </Modal>
      )}

      {confirmingDelete && (
        <ConfirmDialog
          title={STRINGS.customers.deleteTitle}
          message={
            customer.lendingBalance > 0
              ? STRINGS.customers.deleteConfirmBalance(customer.name, money(customer.lendingBalance))
              : STRINGS.customers.deleteConfirmClean(customer.name)
          }
          confirmLabel={STRINGS.customers.deleteLabel}
          danger
          onConfirm={async () => {
            const res = await remove(customer.id);
            if (!res.ok) {
              toast.error(res.error === 'hasBalance'
                ? STRINGS.customers.hasBalanceError
                : STRINGS.customers.notFoundError);
              setConfirmingDelete(false);
              return;
            }
            toast.success(STRINGS.customers.deleted(customer.name));
            navigate(`/${slug}/cashier/customers`);
          }}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </>
  );
};
