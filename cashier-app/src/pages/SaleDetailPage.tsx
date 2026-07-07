/**
 * SaleDetailPage — full receipt view, print, and void.
 */
import { useState, type FC } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import cls from './pages.module.css';
import { Badge, Button, Field, Text, Textarea } from '../components/atoms';
import { PaymentBadge, ProductBadge } from '../components/molecules';
import { Modal } from '../components/organisms';
import { PageHeader } from '../components/layout/AppShell';
import { STRINGS } from '../domain/strings';
import { fmtDateTime, formatPhone, money } from '../domain/format';
import { useAuth } from '../store/AuthContext';
import { useCustomers } from '../store/CustomersContext';
import { useProducts } from '../store/ProductsContext';
import { useSales } from '../store/SalesContext';
import { useToast } from '../store/ToastContext';

export const SaleDetailPage: FC = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { byId, voidSale } = useSales();
  const { byId: customerById, addLending } = useCustomers();
  const { incrementStock } = useProducts();
  const { isAdmin } = useAuth();
  const toast = useToast();

  const [voidOpen, setVoidOpen] = useState(false);
  const [reason, setReason] = useState('');

  const sale = byId(id);
  if (!sale) {
    return (
      <>
        <PageHeader title="Sale not found" subtitle="It may have been deleted." />
        <Button variant="secondary" leadingIcon="arrow"
                onClick={() => navigate('/sales')}>{STRINGS.sales.backToList}</Button>
      </>
    );
  }

  const customer = sale.customerId ? customerById(sale.customerId) : undefined;

  const handleVoid = () => {
    if (!reason.trim()) return;
    voidSale(sale.id, reason.trim());
    incrementStock(sale.lines.map((l) => ({ productId: l.productId, qty: l.quantity })));
    if (sale.paymentMethod === 'lending' && sale.customerId) {
      addLending(sale.customerId, -sale.total);
    }
    toast.success(STRINGS.sales.voidSuccess);
    setVoidOpen(false);
  };

  return (
    <>
      <PageHeader
        title={STRINGS.sales.detailTitle}
        subtitle={sale.invoiceNo}
        actions={
          <>
            <Button variant="ghost" leadingIcon="arrow"
                    onClick={() => navigate('/sales')}>{STRINGS.sales.backToList}</Button>
            <Button variant="secondary" leadingIcon="print" onClick={() => window.print()}>
              {STRINGS.receipt.print}
            </Button>
            {isAdmin && !sale.voided && (
              <Button variant="danger" leadingIcon="trash" onClick={() => setVoidOpen(true)}>
                {STRINGS.sales.void}
              </Button>
            )}
          </>
        }
      />

      <div className={cls.card}>
        <div className={cls.cardHeader}>
          <Text as="h2" size="lg" weight="bold">Summary</Text>
          {sale.voided
            ? <Badge variant="danger">{STRINGS.sales.voidedBadge}</Badge>
            : <Badge variant="success">Complete</Badge>}
        </div>
        <div className={cls.cardBody}>
          <div className={cls.kvList}>
            <div className={cls.kv}>
              <Text size="xs" tone="subtle" weight="semibold" upper>{STRINGS.receipt.invoice}</Text>
              <Text weight="semibold">{sale.invoiceNo}</Text>
            </div>
            <div className={cls.kv}>
              <Text size="xs" tone="subtle" weight="semibold" upper>{STRINGS.receipt.dateLabel}</Text>
              <Text weight="semibold">{fmtDateTime(sale.completedAt)}</Text>
            </div>
            <div className={cls.kv}>
              <Text size="xs" tone="subtle" weight="semibold" upper>{STRINGS.receipt.payment}</Text>
              <PaymentBadge method={sale.paymentMethod} />
            </div>
            <div className={cls.kv}>
              <Text size="xs" tone="subtle" weight="semibold" upper>Cashier</Text>
              <Text weight="semibold">{sale.cashierName}</Text>
            </div>
            {customer && (
              <div className={cls.kv}>
                <Text size="xs" tone="subtle" weight="semibold" upper>{STRINGS.receipt.customer}</Text>
                <Text weight="semibold">
                  {customer.name} — {formatPhone(customer.mobile)}
                </Text>
              </div>
            )}
            {!customer && sale.customerMobile && (
              <div className={cls.kv}>
                <Text size="xs" tone="subtle" weight="semibold" upper>{STRINGS.receipt.customer}</Text>
                <Text weight="semibold">{formatPhone(sale.customerMobile)}</Text>
              </div>
            )}
            {sale.voided && (
              <div className={cls.kv} style={{ gridColumn: '1 / -1' }}>
                <Text size="xs" tone="danger" weight="semibold" upper>Void reason</Text>
                <Text>{sale.voidedReason ?? '—'}</Text>
                {sale.voidedAt && (
                  <Text size="xs" tone="subtle">on {fmtDateTime(sale.voidedAt)}</Text>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={cls.card}>
        <div className={cls.cardHeader}>
          <Text as="h2" size="lg" weight="bold">{STRINGS.receipt.itemsSold}</Text>
          <Badge variant="neutral">{sale.unitCount} units</Badge>
        </div>
        <div className={cls.tableWrap}>
          <table className={cls.table}>
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th className="numeric">Qty</th>
                <th className="numeric">Unit price</th>
                <th className="numeric">Line total</th>
              </tr>
            </thead>
            <tbody>
              {sale.lines.map((l) => (
                <tr key={l.productId}>
                  <td>
                    <span className={cls.rowChip}>
                      <ProductBadge name={l.name} tone={l.tone} size="sm" />
                      <Text weight="semibold" size="sm">{l.name}</Text>
                    </span>
                  </td>
                  <td><Text size="sm" tone="subtle">{l.sku}</Text></td>
                  <td className="numeric"><Text size="sm">{l.quantity}</Text></td>
                  <td className="numeric"><Text size="sm">{money(l.unitPrice)}</Text></td>
                  <td className="numeric"><Text weight="bold" size="sm">{money(l.lineTotal)}</Text></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} style={{ textAlign: 'right' }}>
                  <Text size="sm" tone="subtle">{STRINGS.cashier.subtotal}</Text>
                </td>
                <td className="numeric"><Text weight="semibold" size="sm">{money(sale.subtotal)}</Text></td>
              </tr>
              <tr>
                <td colSpan={4} style={{ textAlign: 'right' }}>
                  <Text size="sm" tone="subtle">{STRINGS.cashier.tax}</Text>
                </td>
                <td className="numeric"><Text weight="semibold" size="sm">{money(sale.tax)}</Text></td>
              </tr>
              <tr>
                <td colSpan={4} style={{ textAlign: 'right' }}>
                  <Text size="md" weight="heavy">{STRINGS.receipt.amountPaid}</Text>
                </td>
                <td className="numeric">
                  <Text size="md" weight="heavy" tone={sale.voided ? 'muted' : 'primary'}>
                    {money(sale.total)}
                  </Text>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {voidOpen && (
        <Modal
          title={STRINGS.sales.voidHeading}
          subtitle={STRINGS.sales.voidHint}
          onClose={() => setVoidOpen(false)}
          closeLabel={STRINGS.ariaLabels.closeModal}
          footer={
            <>
              <Button variant="secondary" onClick={() => setVoidOpen(false)}>{STRINGS.common.cancel}</Button>
              <Button variant="danger" leadingIcon="trash"
                      onClick={handleVoid} disabled={!reason.trim()}>
                {STRINGS.sales.voidConfirm}
              </Button>
            </>
          }
        >
          <Field label={STRINGS.sales.voidReason} required htmlFor="void-reason">
            <Textarea id="void-reason" value={reason} autoFocus
                      onChange={(e) => setReason(e.target.value)} rows={4} />
          </Field>
        </Modal>
      )}
    </>
  );
};
