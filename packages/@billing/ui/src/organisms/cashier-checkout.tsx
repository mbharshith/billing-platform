// Cashier "checkout" organism - the ONE modal that owns every context
// decision needed to finalize a sale.
//
// Design rule: no nested modals. Everything (order type, table, delivery,
// aggregator, customer attach, payment tenders) is captured inline in this
// single modal.
//
// The 5 OrderTypes seeded on a restaurant tenant (Dine-in / Takeaway /
// Delivery / Zomato / Swiggy) are consolidated at the UI into 4 abstract
// MODES (Counter / Dine-in / Delivery / Aggregator). A mode-tab is only
// rendered when at least one active OrderType maps to it. Aggregator mode
// then reveals a provider dropdown listing every aggregator-type OrderType.
//
// Contextual sections (all inline, all dropdowns for consistency):
//   - Dine-in    -> table dropdown (grouped by section)
//   - Delivery   -> recent-address dropdown + "New address" reveals inputs
//   - Aggregator -> provider dropdown + order-ref input
//   - Counter    -> nothing
//
// Then: payment tenders. Then (if lending/COD): inline customer picker.

import { useEffect, useMemo, useState, type FC } from 'react';
import cls from './cashier.module.css';
import { Icon, Input, Select, Text } from '../atoms';
import type {
  PaymentMethod, SalePayment, Customer, DeliveryAddress, Sale,
} from '@billing/shared/domain/types';
import type {
  OrderType, DiningTable, FloorSection,
} from '@billing/shared/domain/restaurant';

const fmt = (n: number) => `Rs ${n.toFixed(2)}`;

const PAYMENT_METHOD_OPTS: readonly { code: PaymentMethod; label: string }[] = [
  { code: 'cash',    label: 'Cash'    },
  { code: 'card',    label: 'Card'    },
  { code: 'online',  label: 'UPI'     },
  { code: 'lending', label: 'Lending' },
  { code: 'cod',     label: 'COD'     },
];

/* -------------------------------------------------------------------------- */
/* Mode detection - defensive against tenants that rename their order types.  */
/* -------------------------------------------------------------------------- */
type Mode = 'counter' | 'dine-in' | 'delivery' | 'aggregator';

const AGGREGATOR_KEYWORDS = [
  // Restaurant aggregators
  'swig', 'zom', 'uber', 'door',
  // Retail marketplaces
  'myntra', 'nykaa', 'amazon', 'flipkart', 'ajio', 'meesho', 'tata cliq',
  // Generic
  'aggreg', 'marketplace',
];

const detectMode = (t: OrderType): Mode => {
  const hay = `${t.code} ${t.name}`.toLowerCase();
  if (hay.includes('dine') || t.code === 'DIN') return 'dine-in';
  if (hay.includes('deliver') || t.code === 'DEL') return 'delivery';
  if (AGGREGATOR_KEYWORDS.some((k) => hay.includes(k))) return 'aggregator';
  return 'counter'; // takeaway, walk-in, quick-serve, etc.
};

const MODE_LABELS: Record<Mode, string> = {
  counter:    'Counter',
  'dine-in':  'Dine-in',
  delivery:   'Delivery',
  aggregator: 'Aggregator',
};
const MODE_ORDER: readonly Mode[] = ['counter', 'dine-in', 'delivery', 'aggregator'];

/* -------------------------------------------------------------------------- */
/* Payload emitted on Confirm. Parent turns this into a Sale via buildSale.   */
/* -------------------------------------------------------------------------- */
export interface CheckoutPayload {
  readonly payments: readonly SalePayment[];
  readonly orderTypeCode: string | null;
  readonly tableId: string | null;
  readonly tableCode: string | null;
  readonly deliveryAddress: DeliveryAddress | null;
  readonly note: string | null;               // used for aggregator order id
  readonly customerId: string | null;
  readonly customerMobile: string | null;
  readonly customerName: string | null;
}

export interface CheckoutModalProps {
  readonly total: number;
  readonly onConfirm: (payload: CheckoutPayload) => void | Promise<void>;
  readonly onClose: () => void;

  readonly orderTypes: readonly OrderType[];
  readonly tables: readonly DiningTable[];
  readonly sections: readonly FloorSection[];
  readonly customers: readonly Customer[];
  readonly recentSales: readonly Sale[];  // used to derive recent delivery addresses
  readonly onCreateCustomer: (name: string, mobile: string) => Promise<Customer | null>;
}

interface TenderRow { readonly key: string; method: PaymentMethod; amount: string; reference?: string; }

export const CheckoutModal: FC<CheckoutModalProps> = ({
  total, onConfirm, onClose,
  orderTypes, tables, sections, customers, recentSales, onCreateCustomer,
}) => {
  /* ---------- Categorize OrderTypes into modes ------------------------- */
  const typesByMode = useMemo(() => {
    const m: Record<Mode, OrderType[]> = { counter: [], 'dine-in': [], delivery: [], aggregator: [] };
    orderTypes.filter((t) => t.active).forEach((t) => { m[detectMode(t)].push(t); });
    return m;
  }, [orderTypes]);

  const availableModes: readonly Mode[] = useMemo(
    () => MODE_ORDER.filter((m) => typesByMode[m].length > 0),
    [typesByMode],
  );

  /* ---------- Mode selection ------------------------------------------- */
  const [mode, setMode] = useState<Mode>(() => availableModes[0] ?? 'counter');
  useEffect(() => {
    if (!availableModes.includes(mode) && availableModes[0]) setMode(availableModes[0]);
  }, [availableModes, mode]);

  /* ---------- OrderType selection (per mode) --------------------------- */
  // For counter/dine-in/delivery: there's usually only 1 OrderType per mode,
  // so we just pick the first. For aggregator: user picks explicitly.
  const [aggregatorTypeCode, setAggregatorTypeCode] = useState<string | null>(
    () => typesByMode.aggregator[0]?.code ?? null,
  );
  useEffect(() => {
    if (mode === 'aggregator' && !aggregatorTypeCode && typesByMode.aggregator[0]) {
      setAggregatorTypeCode(typesByMode.aggregator[0].code);
    }
  }, [mode, aggregatorTypeCode, typesByMode.aggregator]);

  const activeOrderType: OrderType | null = useMemo(() => {
    if (mode === 'aggregator') {
      return typesByMode.aggregator.find((t) => t.code === aggregatorTypeCode) ?? typesByMode.aggregator[0] ?? null;
    }
    return typesByMode[mode][0] ?? null;
  }, [mode, aggregatorTypeCode, typesByMode]);

  /* ---------- Table (Dine-in) ------------------------------------------ */
  const [tableId, setTableId] = useState<string | null>(null);
  const activeTables = useMemo(() => tables.filter((t) => t.active), [tables]);
  const tablesBySection = useMemo(() => {
    const m: Record<string, DiningTable[]> = {};
    activeTables.forEach((t) => { (m[t.sectionId] ??= []).push(t); });
    return m;
  }, [activeTables]);
  const selectedTable = tableId ? activeTables.find((t) => t.id === tableId) ?? null : null;

  /* ---------- Delivery: recent addresses dropdown + new-address form --- */
  const recentAddresses = useMemo(() => {
    const uniq = new Map<string, DeliveryAddress>();
    recentSales.forEach((s) => {
      if (s.deliveryAddress) {
        const key = `${s.deliveryAddress.line1}|${s.deliveryAddress.line2}`;
        if (!uniq.has(key)) uniq.set(key, s.deliveryAddress);
      }
    });
    return Array.from(uniq.values()).slice(0, 8);
  }, [recentSales]);

  const [addressChoice, setAddressChoice] = useState<'new' | string>('new');
  const [addressLine, setAddressLine] = useState('');
  const [deliveryPhone, setDeliveryPhone] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');

  const activeDeliveryAddress: DeliveryAddress | null = useMemo(() => {
    if (mode !== 'delivery') return null;
    if (addressChoice === 'new') {
      if (!addressLine.trim()) return null;
      return {
        line1: addressLine.trim(),
        line2: deliveryPhone,
        city: '', pincode: '', landmark: '',
      };
    }
    const picked = recentAddresses[Number(addressChoice)] ?? null;
    return picked;
  }, [mode, addressChoice, addressLine, deliveryPhone, recentAddresses]);

  /* ---------- Aggregator ref ------------------------------------------- */
  const [aggregatorRef, setAggregatorRef] = useState('');

  /* ---------- Payment tenders ------------------------------------------ */
  const [rows, setRows] = useState<TenderRow[]>([
    { key: 'p1', method: 'cash', amount: total.toFixed(2) },
  ]);
  const totalPaid = useMemo(() => rows.reduce((s, r) => s + Number(r.amount || 0), 0), [rows]);
  const remaining = total - totalPaid;
  const needsCustomer = rows.some((r) => r.method === 'lending' || r.method === 'cod');

  const addRow = () => setRows((prev) => [
    ...prev,
    { key: `p${Date.now()}`, method: 'card', amount: Math.max(0, total - totalPaid).toFixed(2) },
  ]);
  const removeRow = (key: string) => setRows((prev) => prev.filter((r) => r.key !== key));
  const patchRow = (key: string, patch: Partial<TenderRow>) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  /* ---------- Customer (inline picker) --------------------------------- */
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerQuery, setCustomerQuery] = useState('');
  const [newName, setNewName] = useState('');
  const [newMobile, setNewMobile] = useState('');
  const [creating, setCreating] = useState(false);

  const customerMatches = useMemo(() => {
    const q = customerQuery.trim().toLowerCase();
    if (!q) return customers.slice(0, 4);
    return customers.filter((c) =>
      c.name.toLowerCase().includes(q) || c.mobile.includes(q),
    ).slice(0, 6);
  }, [customers, customerQuery]);

  const canCreateNew = newName.trim().length >= 2 && /^\d{10}$/.test(newMobile);

  const handleCreate = async () => {
    if (!canCreateNew || creating) return;
    setCreating(true);
    const c = await onCreateCustomer(newName.trim(), newMobile);
    setCreating(false);
    if (c) { setSelectedCustomer(c); setNewName(''); setNewMobile(''); }
  };

  /* ---------- Validation ----------------------------------------------- */
  const contextOK =
    (mode !== 'dine-in'    || !!tableId) &&
    (mode !== 'delivery'   || !!activeDeliveryAddress) &&
    (mode !== 'aggregator' || (!!activeOrderType && aggregatorRef.trim().length > 0));
  const customerOK = !needsCustomer || !!selectedCustomer;
  const paymentOK  = Math.abs(remaining) < 0.01 && rows.every((r) => Number(r.amount) >= 0);
  const canConfirm = contextOK && customerOK && paymentOK;

  const confirm = () => {
    if (!canConfirm) return;
    const note = mode === 'aggregator' && aggregatorRef.trim()
      ? `Ref: ${aggregatorRef.trim()}`
      : mode === 'delivery' && deliveryNotes.trim()
      ? deliveryNotes.trim()
      : null;

    onConfirm({
      payments: rows.map((r) => ({
        method: r.method,
        amount: Math.round(Number(r.amount) * 100) / 100,
        ...(r.reference ? { reference: r.reference } : {}),
      })),
      orderTypeCode: activeOrderType?.code ?? null,
      tableId:       selectedTable?.id ?? null,
      tableCode:     selectedTable?.code ?? null,
      deliveryAddress: activeDeliveryAddress,
      note,
      customerId:     selectedCustomer?.id ?? null,
      customerMobile: selectedCustomer?.mobile ?? null,
      customerName:   selectedCustomer?.name ?? null,
    });
  };

  return (
    <div
      className={cls.modalOverlay}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog" aria-modal="true" aria-label="Checkout"
    >
      <div className={cls.modalPanel} style={{ maxWidth: 640 }}>
        <header className={cls.modalHeader}>
          <div>
            <Text as="h2" size="lg" weight="heavy">Collect payment</Text>
            <Text size="sm" tone="subtle">Grand total: <strong>{fmt(total)}</strong></Text>
          </div>
          <button className={cls.modalClose} onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </header>

        <div className={cls.modalBody}>

          {/* -- 1. Mode toggle ----------------------------------------- */}
          {availableModes.length > 0 && (
            <section className={cls.checkoutSection}>
              <Text size="xs" tone="subtle" weight="heavy" upper>Order type</Text>
              <div className={cls.orderTypeToggle} role="tablist" aria-label="Order type">
                {availableModes.map((m) => (
                  <button
                    key={m} type="button" role="tab"
                    aria-selected={m === mode}
                    className={`${cls.orderTypeBtn} ${m === mode ? cls['orderTypeBtn--active'] : ''}`}
                    onClick={() => { setMode(m); setTableId(null); }}
                  >
                    <span>{MODE_LABELS[m]}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* -- 2a. Table dropdown (Dine-in) --------------------------- */}
          {mode === 'dine-in' && (
            <section className={cls.checkoutSection}>
              <Text size="xs" tone="subtle" weight="heavy" upper>Table</Text>
              {activeTables.length === 0 ? (
                <Text size="sm" tone="subtle">No tables configured for this outlet.</Text>
              ) : (
                <Select
                  value={tableId ?? ''}
                  onChange={(e) => setTableId(e.target.value || null)}
                  aria-label="Table"
                >
                  <option value="">Select table...</option>
                  {sections.filter((s) => s.active).map((s) => {
                    const rowTables = tablesBySection[s.id] ?? [];
                    if (rowTables.length === 0) return null;
                    return (
                      <optgroup key={s.id} label={s.name}>
                        {rowTables.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.code}{t.seats ? ` - ${t.seats} seats` : ''}
                          </option>
                        ))}
                      </optgroup>
                    );
                  })}
                </Select>
              )}
            </section>
          )}

          {/* -- 2b. Delivery: recent-addresses dropdown + inputs ------- */}
          {mode === 'delivery' && (
            <section className={cls.checkoutSection}>
              <Text size="xs" tone="subtle" weight="heavy" upper>Delivery address</Text>
              <Select
                value={addressChoice}
                onChange={(e) => setAddressChoice(e.target.value)}
                aria-label="Delivery address"
              >
                <option value="new">+ New address</option>
                {recentAddresses.map((a, i) => (
                  <option key={i} value={String(i)}>
                    {a.line1}{a.line2 ? ` (${a.line2})` : ''}
                  </option>
                ))}
              </Select>
              {addressChoice === 'new' && (
                <>
                  <Input
                    value={addressLine}
                    onChange={(e) => setAddressLine(e.target.value)}
                    placeholder="Street address"
                    aria-label="Street address"
                  />
                  <Input
                    value={deliveryPhone}
                    onChange={(e) => setDeliveryPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="Delivery phone (10 digits)"
                    inputMode="numeric"
                    aria-label="Delivery phone"
                  />
                </>
              )}
              <Input
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                placeholder="Notes for the rider (optional)"
                aria-label="Delivery notes"
              />
            </section>
          )}

          {/* -- 2c. Aggregator: provider dropdown + order-id ----------- */}
          {mode === 'aggregator' && (
            <section className={cls.checkoutSection}>
              <Text size="xs" tone="subtle" weight="heavy" upper>Aggregator</Text>
              <Select
                value={aggregatorTypeCode ?? ''}
                onChange={(e) => setAggregatorTypeCode(e.target.value)}
                aria-label="Aggregator provider"
              >
                {typesByMode.aggregator.map((t) => (
                  <option key={t.id} value={t.code}>{t.name}</option>
                ))}
              </Select>
              <Input
                value={aggregatorRef}
                onChange={(e) => setAggregatorRef(e.target.value)}
                placeholder={`${activeOrderType?.name ?? 'Aggregator'} order id`}
                aria-label="Aggregator order id"
              />
            </section>
          )}

          {/* -- 3. Payment tenders ------------------------------------- */}
          <section className={cls.checkoutSection}>
            <Text size="xs" tone="subtle" weight="heavy" upper>Payment</Text>
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
                    type="number" min={0}
                    value={r.amount}
                    onChange={(e) => patchRow(r.key, { amount: e.target.value })}
                    placeholder="0.00" inputMode="decimal" aria-label="Amount"
                  />
                  {rows.length > 1 && (
                    <button className={cls.iconBtn} onClick={() => removeRow(r.key)}
                      aria-label={`Remove tender ${idx + 1}`}>
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
          </section>

          {/* -- 4. Customer (inline; only for lending / COD) ---------- */}
          {needsCustomer && (
            <section className={cls.checkoutSection}>
              <Text size="xs" tone="subtle" weight="heavy" upper>Customer</Text>
              <Text size="sm" tone="subtle">
                Lending or COD needs a customer so the balance can be tracked.
              </Text>

              {selectedCustomer ? (
                <div className={cls.paymentCustomerCard}>
                  <div className={cls.paymentCustomerIcon}><Icon name="user" size={18} /></div>
                  <div className={cls.paymentCustomerBody}>
                    <Text weight="bold">{selectedCustomer.name}</Text>
                    <Text size="sm" tone="subtle">{selectedCustomer.mobile}</Text>
                  </div>
                  <button className={cls.ghostBtn} onClick={() => setSelectedCustomer(null)}>Change</button>
                </div>
              ) : (
                <>
                  <div className={cls.customerSearch}>
                    <Icon name="search" size={16} />
                    <input
                      type="search"
                      value={customerQuery}
                      onChange={(e) => setCustomerQuery(e.target.value)}
                      placeholder="Search by name or mobile..."
                    />
                  </div>
                  {customerMatches.length > 0 && (
                    <div className={cls.customerList}>
                      {customerMatches.map((c) => (
                        <button key={c.id} className={cls.customerRow} onClick={() => setSelectedCustomer(c)}>
                          <span className={cls.customerAvatar}>{c.name.slice(0, 2).toUpperCase()}</span>
                          <div>
                            <Text weight="heavy">{c.name}</Text>
                            <Text size="xs" tone="subtle">
                              {c.mobile}{c.lendingBalance > 0 ? ` - lending due Rs ${c.lendingBalance.toFixed(2)}` : ''}
                            </Text>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  <div className={cls.customerCreate}>
                    <Text size="sm" weight="heavy">Or add new</Text>
                    <div className={cls.customerCreateRow}>
                      <input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Name"
                      />
                      <input
                        value={newMobile}
                        onChange={(e) => setNewMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="10-digit mobile"
                        inputMode="numeric"
                      />
                      <button
                        className={cls.primaryBtn}
                        disabled={!canCreateNew || creating}
                        onClick={handleCreate}
                      >
                        {creating ? 'Saving...' : 'Add'}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </section>
          )}

          {/* -- 5. Totals ---------------------------------------------- */}
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
