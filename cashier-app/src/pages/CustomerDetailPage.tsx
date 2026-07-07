/**
 * CustomerDetailPage — profile, lending balance, record payment, history.
 */
import { useMemo, useState, type FC, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import cls from './pages.module.css';
import { Badge, Button, Field, Icon, Input, Select, Text, Textarea } from '../components/atoms';
import { Modal } from '../components/organisms';
import { PaymentBadge } from '../components/molecules';
import { EmptyState } from '../components/molecules';
import { PageHeader } from '../components/layout/AppShell';
import { STRINGS } from '../domain/strings';
import { fmtDate, fmtDateTime, formatPhone, money } from '../domain/format';
import { useAuth } from '../store/AuthContext';
import { useCustomers } from '../store/CustomersContext';
import { useSales } from '../store/SalesContext';
import { useToast } from '../store/ToastContext';

export const CustomerDetailPage: FC = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { byId, paymentsFor, recordPayment } = useCustomers();
  const { forCustomer } = useSales();
  const { currentUser } = useAuth();
  const toast = useToast();

  const customer = byId(id);
  const payments = useMemo(() => paymentsFor(id), [paymentsFor, id]);
  const sales = useMemo(() => forCustomer(id), [forCustomer, id]);

  const [paying, setPaying] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'cash' | 'card'>('cash');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | undefined>();

  if (!customer) {
    return (
      <>
        <PageHeader title="Customer not found"
                    subtitle="It may have been deleted from this browser." />
        <Button variant="secondary" leadingIcon="arrow"
                onClick={() => navigate('/customers')}>{STRINGS.customers.backToList}</Button>
      </>
    );
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    const amt = Number(amount);
    const res = recordPayment({
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
        actions={
          <Button variant="ghost" leadingIcon="arrow"
                  onClick={() => navigate('/customers')}>{STRINGS.customers.backToList}</Button>
        }
      />

      <div className={[cls.balanceRibbon, clearBalance && cls['balanceRibbon--clear']].filter(Boolean).join(' ')}>
        <div>
          <Text size="xs" weight="semibold" tone="inverse" upper>{STRINGS.customers.balanceHeading}</Text>
          <Text size="3xl" weight="heavy" tone="inverse">{money(customer.lendingBalance)}</Text>
        </div>
        {!clearBalance && (
          <Button variant="primary" leadingIcon="coins" onClick={() => setPaying(true)}
                  style={{ background: 'var(--wm-accent)', color: 'var(--wm-primary)' }}>
            {STRINGS.customers.recordPayment}
          </Button>
        )}
      </div>

      <div className={cls.card}>
        <div className={cls.cardHeader}>
          <Text as="h2" size="lg" weight="bold">Profile</Text>
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
              <div className={cls.kv} style={{ gridColumn: '1 / -1' }}>
                <Text size="xs" tone="subtle" weight="semibold" upper>Notes</Text>
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
        {payments.length === 0 ? (
          <EmptyState icon="coins" title={STRINGS.customers.paymentEmpty} />
        ) : (
          <div className={cls.tableWrap}>
            <table className={cls.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Method</th>
                  <th>Received by</th>
                  <th>Notes</th>
                  <th className="numeric">Amount</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td><Text size="sm">{fmtDateTime(p.receivedAt)}</Text></td>
                    <td><Badge variant="primary">{p.method}</Badge></td>
                    <td><Text size="sm">{p.receivedBy}</Text></td>
                    <td><Text size="sm" tone={p.notes ? 'default' : 'muted'}>{p.notes ?? '—'}</Text></td>
                    <td className="numeric"><Text weight="bold" size="sm" tone="success">{money(p.amount)}</Text></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className={cls.card}>
        <div className={cls.cardHeader}>
          <Text as="h2" size="lg" weight="bold">{STRINGS.customers.saleHistory}</Text>
          <Badge variant="neutral">{sales.length}</Badge>
        </div>
        {sales.length === 0 ? (
          <EmptyState icon="receipt" title={STRINGS.customers.saleHistoryEmpty} />
        ) : (
          <div className={cls.tableWrap}>
            <table className={cls.table}>
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Date</th>
                  <th className="numeric">Items</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th className="numeric">Total</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <tr key={s.id} className={cls.clickable}
                      onClick={() => navigate(`/sales/${s.id}`)}>
                    <td>
                      <Link to={`/sales/${s.id}`} onClick={(e) => e.stopPropagation()}>
                        <Text weight="semibold" size="sm" tone="primary">{s.invoiceNo}</Text>
                      </Link>
                    </td>
                    <td><Text size="sm" tone="subtle">{fmtDateTime(s.completedAt)}</Text></td>
                    <td className="numeric"><Text size="sm">{s.unitCount}</Text></td>
                    <td><PaymentBadge method={s.paymentMethod} /></td>
                    <td>
                      {s.voided
                        ? <Badge variant="danger">{STRINGS.sales.voidedBadge}</Badge>
                        : <Badge variant="success">Complete</Badge>}
                    </td>
                    <td className="numeric"><Text weight="bold" size="sm">{money(s.total)}</Text></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
            <Field label="Outstanding balance">
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
    </>
  );
};

// Silence the unused import (Icon) if TS complains.
void Icon;
