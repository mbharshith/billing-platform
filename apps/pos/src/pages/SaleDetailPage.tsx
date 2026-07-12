// SaleDetailPage — full receipt view, print, and void.
import { useState, type FC } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import cls from './pages.module.css';
import { Badge, Button, Field, Text, Textarea } from '@billing/ui/atoms';
import { DataTable, PaymentBadge, ProductBadge } from '@billing/ui/molecules';
import { Modal } from '@billing/ui/organisms';
import { PageHeader } from '@/CounterShell';
import { STRINGS } from '@billing/shared/domain/strings';
import { fmtDateTime, formatPhone } from '@billing/shared/domain/format';
import { useMoney } from '@billing/shared/hooks/useMoney';
import { useAuth } from '@billing/shared/store/AuthContext';
import { useCustomers } from '@billing/shared/store/CustomersContext';
import { useProducts } from '@billing/shared/store/ProductsContext';
import { useSales } from '@billing/shared/store/SalesContext';
import { useToast } from '@billing/shared/store/ToastContext';

export const SaleDetailPage: FC = () => {
  const { money } = useMoney();
  const { id = '', slug = '' } = useParams<{ id: string; slug: string }>();
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
        <PageHeader title={STRINGS.sales.notFound} subtitle={STRINGS.sales.notFoundHint} />
        <Button variant="secondary" leadingIcon="arrow"
                onClick={() => navigate(`/${slug}/cashier/sales`)}>{STRINGS.sales.backToList}</Button>
      </>
    );
  }

  const customer = sale.customerId ? customerById(sale.customerId) : undefined;

  const handleVoid = async () => {
    if (!reason.trim()) return;
    await voidSale(sale.id, reason.trim());
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
                    onClick={() => navigate(`/${slug}/cashier/sales`)}>{STRINGS.sales.backToList}</Button>
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
          <Text as="h2" size="lg" weight="bold">{STRINGS.sales.sectionSummary}</Text>
          {sale.voided
            ? <Badge variant="danger">{STRINGS.sales.voidedBadge}</Badge>
            : <Badge variant="success">{STRINGS.sales.complete}</Badge>}
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
              <Text size="xs" tone="subtle" weight="semibold" upper>{STRINGS.sales.labelCashier}</Text>
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
              <div className={`${cls.kv} ${cls['kv--spanAll']}`}>
                <Text size="xs" tone="danger" weight="semibold" upper>{STRINGS.sales.labelVoidReason}</Text>
                <Text>{sale.voidedReason ?? '—'}</Text>
                {sale.voidedAt && (
                  <Text size="xs" tone="subtle">{STRINGS.sales.voidedOn(fmtDateTime(sale.voidedAt))}</Text>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={cls.card}>
        <div className={cls.cardHeader}>
          <Text as="h2" size="lg" weight="bold">{STRINGS.receipt.itemsSold}</Text>
          <Badge variant="neutral">{STRINGS.sales.units(sale.unitCount)}</Badge>
        </div>
        <DataTable
          flush
          data={sale.lines}
          getKey={(l) => l.productId}
          hidePagination
          footer={
            <>
              <tr>
                <td colSpan={4} className={cls.alignRight}>
                  <Text size="sm" tone="subtle">{STRINGS.cashier.subtotal}</Text>
                </td>
                <td className="numeric"><Text weight="semibold" size="sm">{money(sale.subtotal)}</Text></td>
              </tr>
              <tr>
                <td colSpan={4} className={cls.alignRight}>
                  <Text size="sm" tone="subtle">{STRINGS.cashier.tax}</Text>
                </td>
                <td className="numeric"><Text weight="semibold" size="sm">{money(sale.tax)}</Text></td>
              </tr>
              <tr>
                <td colSpan={4} className={cls.alignRight}>
                  <Text size="md" weight="heavy">{STRINGS.receipt.amountPaid}</Text>
                </td>
                <td className="numeric">
                  <Text size="md" weight="heavy" tone={sale.voided ? 'muted' : 'primary'}>
                    {money(sale.total)}
                  </Text>
                </td>
              </tr>
            </>
          }
          columns={[
            {
              key: 'product',
              label: STRINGS.sales.columnProduct,
              render: (l) => (
                <span className={cls.rowChip}>
                  <ProductBadge name={l.name} tone={l.tone} size="sm" />
                  <Text weight="semibold" size="sm">{l.name}</Text>
                </span>
              ),
            },
            {
              key: 'sku',
              label: STRINGS.sales.columnSku,
              render: (l) => <Text size="sm" tone="subtle">{l.sku}</Text>,
            },
            {
              key: 'qty',
              label: STRINGS.sales.columnQty,
              numeric: true,
              sortValue: (l) => l.quantity,
              render: (l) => <Text size="sm">{l.quantity}</Text>,
            },
            {
              key: 'unitPrice',
              label: STRINGS.sales.columnUnitPrice,
              numeric: true,
              sortValue: (l) => l.unitPrice,
              render: (l) => <Text size="sm">{money(l.unitPrice)}</Text>,
            },
            {
              key: 'lineTotal',
              label: STRINGS.sales.columnLineTotal,
              numeric: true,
              sortValue: (l) => l.lineTotal,
              render: (l) => <Text weight="bold" size="sm">{money(l.lineTotal)}</Text>,
            },
          ]}
        />
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
