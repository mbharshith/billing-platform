// Cashier "depth" organisms - modifier picker, held-orders drawer, KOT preview.

import { useMemo, useState, type FC } from 'react';
import cls from './cashier.module.css';
import { Icon, Text } from '../atoms';
import type { Modifier, ModifierOption, Variant } from '@billing/shared/domain/restaurant';
import type { Product, Sale, SaleLineModifier } from '@billing/shared/domain/types';

const fmt = (n: number) => `Rs ${n.toFixed(2)}`;

/* -------------------------------------------------------------------------- */
/* ModifierPickerModal - configure a menu item's variant + modifier choices   */
/* -------------------------------------------------------------------------- */

export interface ModifierPickerModalProps {
  readonly product: Product;
  readonly variants: readonly Variant[];      // filtered to this product
  readonly modifiers: readonly Modifier[];    // all-store modifiers user can pick from
  readonly onConfirm: (opts: {
    quantity: number;
    variantId: string | null;
    variantLabel: string | null;
    unitPrice: number;             // final unit price (base + variant + mods)
    modifiers: readonly SaleLineModifier[];
    note: string;
  }) => void;
  readonly onClose: () => void;
}

export const ModifierPickerModal: FC<ModifierPickerModalProps> = ({
  product, variants, modifiers, onConfirm, onClose,
}) => {
  const [variantId, setVariantId] = useState<string | null>(
    variants.length > 0 ? variants[0]!.id : null,
  );
  const [picked, setPicked] = useState<Record<string, string[]>>({});   // modifierId -> optionIds
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');

  const chosenVariant = variants.find((v) => v.id === variantId);
  const basePrice = chosenVariant?.priceOverride ?? product.price;

  const modifierDelta = useMemo(() => {
    let sum = 0;
    modifiers.forEach((m) => {
      const chosen = picked[m.id] ?? [];
      m.options.forEach((o) => {
        if (chosen.includes(o.id)) sum += o.priceDelta;
      });
    });
    return sum;
  }, [modifiers, picked]);

  const unitPrice = basePrice + modifierDelta;

  const toggle = (m: Modifier, o: ModifierOption) => {
    setPicked((prev) => {
      const current = prev[m.id] ?? [];
      if (m.type === 'single') return { ...prev, [m.id]: [o.id] };
      return { ...prev, [m.id]: current.includes(o.id)
        ? current.filter((x) => x !== o.id)
        : [...current, o.id] };
    });
  };

  const missingRequired = modifiers.filter((m) => m.required && (picked[m.id] ?? []).length === 0);
  const canConfirm = qty > 0 && missingRequired.length === 0;

  const confirm = () => {
    if (!canConfirm) return;
    const flatMods: SaleLineModifier[] = [];
    modifiers.forEach((m) => {
      (picked[m.id] ?? []).forEach((oid) => {
        const o = m.options.find((x) => x.id === oid);
        if (o) flatMods.push({
          modifierId: m.id, modifierName: m.name,
          optionId: o.id, optionName: o.name, priceDelta: o.priceDelta,
        });
      });
    });
    onConfirm({
      quantity: qty,
      variantId,
      variantLabel: chosenVariant?.label ?? null,
      unitPrice,
      modifiers: flatMods,
      note,
    });
  };

  return (
    <div className={cls.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} role="dialog" aria-modal="true" aria-label={`Configure ${product.name}`}>
      <div className={cls.modalPanel}>
        <header className={cls.modalHeader}>
          <div>
            <Text as="h2" size="lg" weight="heavy">{product.name}</Text>
            <Text size="sm" tone="subtle">Base {fmt(product.price)} - configure below</Text>
          </div>
          <button className={cls.modalClose} onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </header>
        <div className={cls.modalBody}>
          {variants.length > 0 && (
            <section>
              <Text size="sm" weight="heavy" tone="subtle">Variant</Text>
              <div className={cls.modOptions}>
                {variants.filter((v) => v.active).map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setVariantId(v.id)}
                    className={`${cls.modOption} ${variantId === v.id ? cls['modOption--active'] : ''}`}
                  >
                    <span>{v.label}</span>
                    <span className={cls.modOptionPrice}>{fmt(v.priceOverride)}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {modifiers.map((m) => (
            <section key={m.id}>
              <Text size="sm" weight="heavy" tone="subtle">
                {m.name} {m.required && <span className={cls.reqTag}>required</span>}
              </Text>
              <div className={cls.modOptions}>
                {m.options.map((o) => {
                  const isChecked = (picked[m.id] ?? []).includes(o.id);
                  return (
                    <button
                      key={o.id}
                      onClick={() => toggle(m, o)}
                      className={`${cls.modOption} ${isChecked ? cls['modOption--active'] : ''}`}
                    >
                      <span>{o.name}</span>
                      <span className={cls.modOptionPrice}>
                        {o.priceDelta > 0 ? `+${fmt(o.priceDelta)}` : o.priceDelta < 0 ? `-${fmt(-o.priceDelta)}` : 'free'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}

          <section>
            <Text size="sm" weight="heavy" tone="subtle">Note</Text>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Kitchen note (e.g. no onions, extra spicy)"
              className={cls.fullWidthInput}
            />
          </section>

          <section className={cls.qtyRow}>
            <Text size="sm" weight="heavy">Quantity</Text>
            <div className={cls.qtyStepper}>
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease">-</button>
              <span>{qty}</span>
              <button onClick={() => setQty((q) => q + 1)} aria-label="Increase">+</button>
            </div>
          </section>
        </div>
        <footer className={cls.modalFooter}>
          <div className={cls.footerLeft}>
            <Text tone="subtle" size="sm">Line total</Text>
            <Text weight="heavy" size="lg">{fmt(unitPrice * qty)}</Text>
          </div>
          <button className={cls.ghostBtn} onClick={onClose}>Cancel</button>
          <button className={cls.primaryBtn} disabled={!canConfirm} onClick={confirm}>
            {missingRequired.length > 0
              ? `Pick required: ${missingRequired.map((m) => m.name).join(', ')}`
              : 'Add to cart'}
          </button>
        </footer>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* HeldOrdersDrawer - list held sales, recall or discard                      */
/* -------------------------------------------------------------------------- */

export interface HeldOrdersDrawerProps {
  readonly held: readonly Sale[];
  readonly onRecall: (s: Sale) => void;
  readonly onDiscard: (s: Sale) => void;
  readonly onClose: () => void;
}

export const HeldOrdersDrawer: FC<HeldOrdersDrawerProps> = ({
  held, onRecall, onDiscard, onClose,
}) => (
  <div className={cls.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} role="dialog" aria-modal="true" aria-label="Held orders">
    <div className={cls.modalPanel}>
      <header className={cls.modalHeader}>
        <Text as="h2" size="lg" weight="heavy">Held orders <span className={cls.countPill}>{held.length}</span></Text>
        <button className={cls.modalClose} onClick={onClose} aria-label="Close"><Icon name="close" /></button>
      </header>
      <div className={cls.modalBody}>
        {held.length === 0 && (
          <div className={cls.emptyState}>
            <Icon name="history" size={40} tone="muted" />
            <Text tone="subtle">No held orders. Use the Hold button on the cart to park a sale for later.</Text>
          </div>
        )}
        <div className={cls.heldList}>
          {held.map((s) => (
            <div key={s.id} className={cls.heldRow}>
              <div className={cls.heldMain}>
                <Text weight="heavy">
                  {s.tableCode ? `Table ${s.tableCode}` : (s.customerName ?? 'Walk-in')}
                  {' - '}
                  {s.unitCount} item{s.unitCount === 1 ? '' : 's'}
                </Text>
                <Text size="xs" tone="subtle">
                  Held {new Date(s.heldAt ?? s.completedAt).toLocaleString()} - {fmt(s.total)}
                </Text>
              </div>
              <button className={cls.primaryBtn} onClick={() => { onRecall(s); onClose(); }}>Recall</button>
              <button className={cls.iconBtn} onClick={() => onDiscard(s)} aria-label="Discard"><Icon name="trash" size={14} /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

/* -------------------------------------------------------------------------- */
/* KotPreviewModal - one 80mm-ticket per KOT station in the sale              */
/* -------------------------------------------------------------------------- */

export interface KotPreviewModalProps {
  readonly sale: Sale;
  readonly onClose: () => void;
  readonly onPrint: () => void;
}

export const KotPreviewModal: FC<KotPreviewModalProps> = ({ sale, onClose, onPrint }) => (
  <div className={cls.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} role="dialog" aria-modal="true" aria-label="KOT preview">
    <div className={[cls.modalPanel, cls['modalPanel--narrow']].join(' ')}>
      <header className={cls.modalHeader}>
        <Text as="h2" size="lg" weight="heavy">Kitchen Ticket (KOT)</Text>
        <button className={cls.modalClose} onClick={onClose} aria-label="Close"><Icon name="close" /></button>
      </header>
      <div className={cls.modalBody}>
        <div className={cls.kotTicket}>
          <div className={cls.kotHeader}>
            <Text weight="heavy" size="lg">KOT #{sale.invoiceNo}</Text>
            <Text size="xs">{new Date(sale.completedAt).toLocaleString()}</Text>
            <Text size="xs">
              {sale.tableCode ? `Table ${sale.tableCode} - ` : ''}
              {sale.orderTypeCode ? sale.orderTypeCode.toUpperCase() : 'COUNTER'}
              {sale.customerName ? ` - ${sale.customerName}` : ''}
            </Text>
          </div>
          <div className={cls.kotDivider} />
          {sale.lines.map((l) => (
            <div key={l.productId} className={cls.kotLine}>
              <span className={cls.kotQty}>{l.quantity}x</span>
              <div className={cls.kotDetails}>
                <Text weight="heavy" size="sm">{l.name}{l.variantLabel ? ` (${l.variantLabel})` : ''}</Text>
                {l.modifiers?.map((m) => (
                  <Text key={m.optionId} size="xs" tone="subtle">- {m.optionName}</Text>
                ))}
                {l.note && <Text size="xs" tone="subtle">- {l.note}</Text>}
              </div>
            </div>
          ))}
          <div className={cls.kotDivider} />
          <Text size="xs" tone="subtle">Cashier: {sale.cashierName}</Text>
        </div>
      </div>
      <footer className={cls.modalFooter}>
        <button className={cls.ghostBtn} onClick={onClose}>Skip</button>
        <button className={cls.primaryBtn} onClick={onPrint}>
          <Icon name="print" size={14} /> Print KOT
        </button>
      </footer>
    </div>
  </div>
);
