// Cashier "money" organisms - discount/coupon/charges/split-payment modals.

import { useMemo, useState, type FC } from 'react';
import cls from './cashier.module.css';
import { Icon, Input, Select, Text } from '../atoms';
import type { Discount, Coupon, AdditionalCharge } from '@billing/shared/domain/restaurant';
import type { PaymentMethod, SalePayment } from '@billing/shared/domain/types';

/* -------------------------------------------------------------------------- */
/* Currency helper                                                            */
/* -------------------------------------------------------------------------- */
const fmt = (n: number) => `Rs ${n.toFixed(2)}`;

/* -------------------------------------------------------------------------- */
/* BillDiscountModal - pick from catalog OR enter ad-hoc                      */
/* -------------------------------------------------------------------------- */

export interface BillDiscountModalProps {
  readonly discounts: readonly Discount[];
  readonly subtotalAfterLine: number;
  readonly onApply: (d: Discount | null, adhoc: { type: 'percent' | 'flat'; value: number; name: string } | null) => void;
  readonly onClear: () => void;
  readonly onClose: () => void;
}

export const BillDiscountModal: FC<BillDiscountModalProps> = ({
  discounts, subtotalAfterLine, onApply, onClear, onClose,
}) => {
  const [adhocType, setAdhocType] = useState<'percent' | 'flat'>('percent');
  const [adhocValue, setAdhocValue] = useState('');

  const preview = (d: Discount) => {
    const raw = d.type === 'percent' ? subtotalAfterLine * (d.value / 100) : d.value;
    return d.maxAmount != null ? Math.min(raw, d.maxAmount) : raw;
  };

  const adhocPreview = adhocType === 'percent'
    ? subtotalAfterLine * (Number(adhocValue || 0) / 100)
    : Number(adhocValue || 0);

  const canApplyAdhoc = Number(adhocValue) > 0;

  return (
    <div className={cls.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} role="dialog" aria-modal="true" aria-label="Apply discount">
      <div className={cls.modalPanel}>
        <header className={cls.modalHeader}>
          <Text as="h2" size="lg" weight="heavy">Apply bill discount</Text>
          <button className={cls.modalClose} onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </header>
        <div className={cls.modalBody}>
          {discounts.filter((d) => d.active).length > 0 && (
            <section>
              <Text size="sm" weight="heavy" tone="subtle">From catalog</Text>
              <div className={cls.pickerList}>
                {discounts.filter((d) => d.active).map((d) => (
                  <button key={d.id} className={cls.pickerRow} onClick={() => { onApply(d, null); onClose(); }}>
                    <div className={cls.pickerRowMain}>
                      <Text weight="heavy">{d.name}</Text>
                      <Text size="xs" tone="subtle">
                        {d.type === 'percent' ? `${d.value}%` : fmt(d.value)}
                        {d.maxAmount != null ? ` - max ${fmt(d.maxAmount)}` : ''}
                        {d.requiresManagerApproval ? ' - manager approval' : ''}
                      </Text>
                    </div>
                    <Text weight="heavy" className={cls.pickerRowAmount}>-{fmt(preview(d))}</Text>
                  </button>
                ))}
              </div>
            </section>
          )}

          <section>
            <Text size="sm" weight="heavy" tone="subtle">Or ad-hoc</Text>
            <div className={cls.adhocRow}>
              <div className={cls.segControl}>
                <button
                  className={`${cls.segBtn} ${adhocType === 'percent' ? cls['segBtn--active'] : ''}`}
                  onClick={() => setAdhocType('percent')}
                >%</button>
                <button
                  className={`${cls.segBtn} ${adhocType === 'flat' ? cls['segBtn--active'] : ''}`}
                  onClick={() => setAdhocType('flat')}
                >Rs</button>
              </div>
              <input
                type="number"
                value={adhocValue}
                onChange={(e) => setAdhocValue(e.target.value)}
                placeholder="0"
                min={0}
                inputMode="decimal"
              />
              <Text tone="subtle" size="sm">= {fmt(Math.max(0, adhocPreview))}</Text>
              <button
                className={cls.primaryBtn}
                disabled={!canApplyAdhoc}
                onClick={() => { onApply(null, { type: adhocType, value: Number(adhocValue), name: 'Manual discount' }); onClose(); }}
              >Apply</button>
            </div>
          </section>
        </div>
        <footer className={cls.modalFooter}>
          <button className={cls.ghostBtn} onClick={() => { onClear(); onClose(); }}>Clear discount</button>
        </footer>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* CouponInput - inline code entry with validate                              */
/* -------------------------------------------------------------------------- */

export interface CouponInputProps {
  readonly coupons: readonly Coupon[];
  readonly subtotalAfterBillDiscount: number;
  readonly currentCouponCode: string | null;
  readonly onApply: (c: Coupon) => void;
  readonly onClear: () => void;
  readonly onError: (msg: string) => void;
}

export const CouponInput: FC<CouponInputProps> = ({
  coupons, subtotalAfterBillDiscount, currentCouponCode, onApply, onClear, onError,
}) => {
  const [code, setCode] = useState('');

  const validate = () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    const c = coupons.find((x) => x.code.toUpperCase() === trimmed && x.active);
    if (!c) { onError(`Coupon "${trimmed}" is invalid or expired.`); return; }
    const now = new Date().toISOString();
    if (c.validTo && c.validTo < now) { onError(`Coupon "${trimmed}" has expired.`); return; }
    if (c.validFrom && c.validFrom > now) { onError(`Coupon "${trimmed}" is not yet active.`); return; }
    if (c.minOrder > 0 && subtotalAfterBillDiscount < c.minOrder) {
      onError(`Coupon requires a minimum bill of ${fmt(c.minOrder)}.`);
      return;
    }
    onApply(c);
    setCode('');
  };

  if (currentCouponCode) {
    return (
      <div className={cls.couponApplied}>
        <Icon name="tag" size={14} />
        <Text size="sm" weight="heavy">{currentCouponCode}</Text>
        <button onClick={onClear} className={cls.linkBtn} aria-label="Remove coupon">Remove</button>
      </div>
    );
  }

  return (
    <div className={cls.couponInput}>
      <Icon name="tag" size={14} />
      <input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="Coupon code"
        onKeyDown={(e) => { if (e.key === 'Enter') validate(); }}
      />
      <button onClick={validate} className={cls.linkBtn} disabled={!code.trim()}>Apply</button>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* ChargesPickerModal - pick from AdditionalCharge catalog                    */
/* -------------------------------------------------------------------------- */

export interface ChargesPickerModalProps {
  readonly charges: readonly AdditionalCharge[];
  readonly orderTypeCode: string | null;
  readonly appliedChargeIds: readonly string[];
  readonly subtotalAfterCoupon: number;
  readonly onToggle: (c: AdditionalCharge) => void;
  readonly onClose: () => void;
}

export const ChargesPickerModal: FC<ChargesPickerModalProps> = ({
  charges, orderTypeCode, appliedChargeIds, subtotalAfterCoupon, onToggle, onClose,
}) => {
  const applicable = useMemo(() =>
    charges.filter((c) => c.active && (
      c.appliesToOrderTypeCodes.length === 0
      || (orderTypeCode && c.appliesToOrderTypeCodes.includes(orderTypeCode))
    )),
  [charges, orderTypeCode]);

  const preview = (c: AdditionalCharge) =>
    c.type === 'percent' ? subtotalAfterCoupon * (c.value / 100) : c.value;

  return (
    <div className={cls.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} role="dialog" aria-modal="true" aria-label="Additional charges">
      <div className={cls.modalPanel}>
        <header className={cls.modalHeader}>
          <Text as="h2" size="lg" weight="heavy">Additional charges</Text>
          <button className={cls.modalClose} onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </header>
        <div className={cls.modalBody}>
          {applicable.length === 0 && (
            <div className={cls.emptyState}>
              <Icon name="plus" size={40} tone="muted" />
              <Text tone="subtle">No charges applicable to this order type. Add them in Admin &gt; POS Config &gt; Charges.</Text>
            </div>
          )}
          <div className={cls.pickerList}>
            {applicable.map((c) => {
              const isApplied = appliedChargeIds.includes(c.id);
              return (
                <button key={c.id} className={`${cls.pickerRow} ${isApplied ? cls['pickerRow--applied'] : ''}`} onClick={() => onToggle(c)}>
                  <div className={cls.pickerRowMain}>
                    <Text weight="heavy">{c.name}</Text>
                    <Text size="xs" tone="subtle">
                      {c.type === 'percent' ? `${c.value}%` : fmt(c.value)}{c.taxable ? ' - taxable' : ''}
                    </Text>
                  </div>
                  <Text weight="heavy" className={cls.pickerRowAmount}>{isApplied ? '- Remove' : `+ ${fmt(preview(c))}`}</Text>
                </button>
              );
            })}
          </div>
        </div>
        <footer className={cls.modalFooter}>
          <button className={cls.primaryBtn} onClick={onClose}>Done</button>
        </footer>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* SplitPaymentModal - N tenders that must sum to grand total                 */
/* -------------------------------------------------------------------------- */

const PAYMENT_METHOD_OPTS: readonly { code: PaymentMethod; label: string; icon: string }[] = [
  { code: 'cash',    label: 'Cash',    icon: 'coins' },
  { code: 'card',    label: 'Card',    icon: 'card'  },
  { code: 'online',  label: 'UPI',     icon: 'phone' },
  { code: 'lending', label: 'Lending', icon: 'user'  },
  { code: 'cod',     label: 'COD',     icon: 'truck' },
];

export interface SplitPaymentModalProps {
  readonly total: number;
  readonly onConfirm: (payments: readonly SalePayment[], customerMobile: string | null) => void;
  readonly onClose: () => void;
  /** Customer already attached to the sale (chip in the cashier header). *
   *  When present + a lending/COD tender is picked, the modal skips the   *
   *  mobile input and shows a read-only 'Charge to' card instead.        */
  readonly attachedCustomer?: { readonly name: string; readonly mobile: string } | null;
  /** If provided, the modal shows a 'Pick or add customer' button when   *
   *  lending/COD is picked without a customer, delegating to the parent. */
  readonly onAttachCustomer?: () => void;
}

interface Row { readonly key: string; method: PaymentMethod; amount: string; reference?: string; }

export const SplitPaymentModal: FC<SplitPaymentModalProps> = ({
  total, onConfirm, onClose, attachedCustomer, onAttachCustomer,
}) => {
  const [rows, setRows] = useState<Row[]>([{ key: 'p1', method: 'cash', amount: total.toFixed(2) }]);
  const [mobile, setMobile] = useState('');

  const totalPaid = useMemo(() => rows.reduce((s, r) => s + Number(r.amount || 0), 0), [rows]);
  const remaining = total - totalPaid;
  const needsCustomer = rows.some((r) => r.method === 'lending' || r.method === 'cod');
  // Only fall back to the raw mobile input when the parent didn't wire in
  // a picker delegate. Keeps the modal usable in isolation.
  const usePickerFlow  = needsCustomer && !!onAttachCustomer;
  const useManualMobile = needsCustomer && !onAttachCustomer;
  const customerOK = !needsCustomer
    || !!attachedCustomer
    || (useManualMobile && /^\d{10}$/.test(mobile));
  const canConfirm = Math.abs(remaining) < 0.01 && customerOK && rows.every((r) => Number(r.amount) >= 0);

  const addRow = () => setRows((prev) => [
    ...prev,
    { key: `p${Date.now()}`, method: 'card', amount: Math.max(0, total - totalPaid).toFixed(2) },
  ]);
  const removeRow = (key: string) => setRows((prev) => prev.filter((r) => r.key !== key));
  const patchRow = (key: string, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const confirm = () => {
    if (!canConfirm) return;
    onConfirm(
      rows.map((r) => ({
        method: r.method,
        amount: Math.round(Number(r.amount) * 100) / 100,
        ...(r.reference ? { reference: r.reference } : {}),
      })),
      needsCustomer ? (attachedCustomer?.mobile ?? mobile) : null,
    );
  };

  return (
    <div className={cls.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} role="dialog" aria-modal="true" aria-label="Payment">
      <div className={cls.modalPanel}>
        <header className={cls.modalHeader}>
          <div>
            <Text as="h2" size="lg" weight="heavy">Collect payment</Text>
            <Text size="sm" tone="subtle">Grand total: <strong>{fmt(total)}</strong></Text>
          </div>
          <button className={cls.modalClose} onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </header>
        <div className={cls.modalBody}>
          {rows.map((r, idx) => (
            <div key={r.key} className={cls.splitRow}>
              <div className={cls.splitRowTop}>
                <Select
                  value={r.method}
                  onChange={(e) => patchRow(r.key, { method: e.target.value as PaymentMethod })}
                  aria-label="Payment method"
                >
                  {PAYMENT_METHOD_OPTS.map((o) => (
                    <option key={o.code} value={o.code}>{o.label}</option>
                  ))}
                </Select>
                <Input
                  type="number"
                  min={0}
                  value={r.amount}
                  onChange={(e) => patchRow(r.key, { amount: e.target.value })}
                  placeholder="0.00"
                  inputMode="decimal"
                  aria-label="Amount"
                />
                {rows.length > 1 && (
                  <button className={cls.iconBtn} onClick={() => removeRow(r.key)} aria-label={`Remove tender ${idx + 1}`}>
                    <Icon name="trash" size={14} />
                  </button>
                )}
              </div>
              <Input
                value={r.reference ?? ''}
                onChange={(e) => patchRow(r.key, { reference: e.target.value })}
                placeholder="Reference (optional)"
                aria-label="Reference"
              />
            </div>
          ))}

          <button className={cls.ghostBtn} onClick={addRow}>
            <Icon name="plus" size={12} /> Add split tender
          </button>

          {needsCustomer && attachedCustomer && (
            <div className={cls.paymentCustomerCard}>
              <div className={cls.paymentCustomerIcon}><Icon name="user" size={18} /></div>
              <div className={cls.paymentCustomerBody}>
                <Text size="xs" tone="subtle" weight="semibold" upper>Charge to</Text>
                <Text weight="bold">{attachedCustomer.name}</Text>
                <Text size="sm" tone="subtle">{attachedCustomer.mobile}</Text>
              </div>
              {onAttachCustomer && (
                <button className={cls.ghostBtn} onClick={onAttachCustomer}>
                  Change
                </button>
              )}
            </div>
          )}

          {needsCustomer && !attachedCustomer && usePickerFlow && (
            <div className={cls.paymentCustomerPrompt}>
              <Text size="sm" tone="subtle">
                Lending or COD needs a customer so the balance can be tracked.
              </Text>
              <button className={cls.primaryBtn} onClick={onAttachCustomer}>
                <Icon name="user" size={14} /> Pick or add customer
              </button>
            </div>
          )}

          {needsCustomer && !attachedCustomer && useManualMobile && (
            <div>
              <Text size="sm" weight="heavy">Customer mobile (required for lending / COD)</Text>
              <input
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="10-digit mobile"
                className={cls.fullWidthInput}
                inputMode="numeric"
              />
            </div>
          )}

          <div className={cls.splitTotals}>
            <div><Text tone="subtle">Grand total</Text> <Text weight="heavy">{fmt(total)}</Text></div>
            <div><Text tone="subtle">Collected</Text> <Text weight="heavy">{fmt(totalPaid)}</Text></div>
            <div className={remaining > 0.01 ? cls.remainingUnder : remaining < -0.01 ? cls.remainingOver : cls.remainingOK}>
              <Text tone="subtle">Remaining</Text>
              <Text weight="heavy">{fmt(remaining)}</Text>
            </div>
          </div>
        </div>
        <footer className={cls.modalFooter}>
          <button className={cls.ghostBtn} onClick={onClose}>Cancel</button>
          <button className={cls.primaryBtn} disabled={!canConfirm} onClick={confirm}>
            Confirm sale
          </button>
        </footer>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* LineDiscountModal - simple per-line discount                               */
/* -------------------------------------------------------------------------- */

export interface LineDiscountModalProps {
  readonly lineName: string;
  readonly maxAmount: number;
  readonly current: number;
  readonly onApply: (amount: number, reason: string) => void;
  readonly onClose: () => void;
}

export const LineDiscountModal: FC<LineDiscountModalProps> = ({
  lineName, maxAmount, current, onApply, onClose,
}) => {
  const [type, setType] = useState<'percent' | 'flat'>('percent');
  const [value, setValue] = useState(current > 0 ? String(current) : '');
  const [reason, setReason] = useState('');

  const preview = Math.min(
    type === 'percent' ? maxAmount * (Number(value || 0) / 100) : Number(value || 0),
    maxAmount,
  );
  const canApply = Number(value) >= 0;

  return (
    <div className={cls.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} role="dialog" aria-modal="true" aria-label="Line discount">
      <div className={[cls.modalPanel, cls['modalPanel--medium']].join(' ')}>
        <header className={cls.modalHeader}>
          <div>
            <Text as="h2" size="lg" weight="heavy">Discount line</Text>
            <Text size="sm" tone="subtle">{lineName} - max {fmt(maxAmount)}</Text>
          </div>
          <button className={cls.modalClose} onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </header>
        <div className={cls.modalBody}>
          <div className={cls.adhocRow}>
            <div className={cls.segControl}>
              <button className={`${cls.segBtn} ${type === 'percent' ? cls['segBtn--active'] : ''}`} onClick={() => setType('percent')}>%</button>
              <button className={`${cls.segBtn} ${type === 'flat' ? cls['segBtn--active'] : ''}`} onClick={() => setType('flat')}>Rs</button>
            </div>
            <input type="number" min={0} value={value} onChange={(e) => setValue(e.target.value)} placeholder="0" inputMode="decimal" />
            <Text tone="subtle" size="sm">= {fmt(preview)}</Text>
          </div>
          <div>
            <Text size="sm" weight="heavy">Reason (optional)</Text>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Damaged packaging"
              className={cls.fullWidthInput}
            />
          </div>
        </div>
        <footer className={cls.modalFooter}>
          <button className={cls.ghostBtn} onClick={() => { onApply(0, ''); onClose(); }}>Clear</button>
          <button className={cls.primaryBtn} disabled={!canApply} onClick={() => { onApply(preview, reason); onClose(); }}>Apply</button>
        </footer>
      </div>
    </div>
  );
};
