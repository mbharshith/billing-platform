// Cashier organisms - order type toggle, table picker, customer picker.
// Kept in one file since they share styling + are cashier-scoped.
// Split further if any single organism grows past ~200 lines.

import { useMemo, useState, type FC } from 'react';
import cls from './cashier.module.css';
import { Icon, Text, type IconName } from '../atoms';
import type { OrderType, DiningTable, FloorSection } from '@billing/shared/domain/restaurant';
import type { Customer } from '@billing/shared/domain/types';

// OrderTypeToggle - 2-6 button horizontal toggle

export interface OrderTypeToggleProps {
  readonly types: readonly OrderType[];
  readonly selectedCode: string | null;
  readonly onSelect: (code: string) => void;
}

export const OrderTypeToggle: FC<OrderTypeToggleProps> = ({
  types, selectedCode, onSelect,
}) => (
  <div className={cls.orderTypeToggle} role="tablist" aria-label="Order type">
    {types.filter((t) => t.active).map((t) => (
      <button
        key={t.id}
        role="tab"
        aria-selected={t.code === selectedCode}
        onClick={() => onSelect(t.code)}
        className={`${cls.orderTypeBtn} ${t.code === selectedCode ? cls['orderTypeBtn--active'] : ''}`}
        title={t.name}
      >
        <Icon name={(t.icon as IconName) || 'bag'} size={14} />
        <span>{t.name}</span>
      </button>
    ))}
  </div>
);

// TablePickerModal - grid of sections + tables, colour-coded by status

export interface TablePickerModalProps {
  readonly sections: readonly FloorSection[];
  readonly tables: readonly DiningTable[];
  readonly selectedTableId: string | null;
  readonly onSelect: (t: DiningTable) => void;
  readonly onClose: () => void;
}

export const TablePickerModal: FC<TablePickerModalProps> = ({
  sections, tables, selectedTableId, onSelect, onClose,
}) => {
  const bySection = useMemo(() => {
    const map: Record<string, DiningTable[]> = {};
    tables.filter((t) => t.active).forEach((t) => {
      if (!map[t.sectionId]) map[t.sectionId] = [];
      map[t.sectionId]!.push(t);
    });
    return map;
  }, [tables]);

  return (
    <div className={cls.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} role="dialog" aria-modal="true" aria-label="Pick table">
      <div className={cls.modalPanel}>
        <header className={cls.modalHeader}>
          <Text as="h2" size="lg" weight="heavy">Pick a table</Text>
          <button className={cls.modalClose} onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </header>
        <div className={cls.modalBody}>
          {sections.filter((s) => s.active).length === 0 && (
            <div className={cls.emptyState}>
              <Icon name="store" size={40} tone="muted" />
              <Text tone="subtle">No floor sections configured. Add them in Admin &gt; Tables &amp; KDS.</Text>
            </div>
          )}
          {sections.filter((s) => s.active).sort((a, b) => a.sortOrder - b.sortOrder).map((section) => (
            <section key={section.id} className={cls.tableSection}>
              <Text as="h3" size="sm" weight="heavy" className={cls.tableSectionTitle}>{section.name}</Text>
              <div className={cls.tableGrid}>
                {(bySection[section.id] ?? []).length === 0 && (
                  <Text tone="subtle" size="sm">No tables in this section.</Text>
                )}
                {(bySection[section.id] ?? []).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { onSelect(t); onClose(); }}
                    disabled={t.status === 'reserved' || t.status === 'cleaning'}
                    className={`${cls.tableChip} ${cls[`tableChip--${t.status}`]} ${selectedTableId === t.id ? cls['tableChip--selected'] : ''}`}
                    title={`${t.code} - ${t.status} - ${t.seats} seats`}
                  >
                    <span className={cls.tableChipCode}>{t.code}</span>
                    <span className={cls.tableChipMeta}>{t.seats} <Icon name="user" size={10} /></span>
                    <span className={cls.tableChipStatus}>{t.status}</span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};

// CustomerPickerModal - search customers, add new, or walk-in

export interface CustomerPickerModalProps {
  readonly customers: readonly Customer[];
  readonly onSelect: (c: Customer | null) => void;   // null = walk-in
  readonly onCreate: (name: string, mobile: string) => Promise<Customer>;
  readonly onClose: () => void;
}

export const CustomerPickerModal: FC<CustomerPickerModalProps> = ({
  customers, onSelect, onCreate, onClose,
}) => {
  const [q, setQ] = useState('');
  const [creatingName, setCreatingName] = useState('');
  const [creatingMobile, setCreatingMobile] = useState('');
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    if (!q.trim()) return customers.slice(0, 20);
    const needle = q.trim().toLowerCase();
    return customers
      .filter((c) => c.name.toLowerCase().includes(needle) || c.mobile.includes(needle))
      .slice(0, 20);
  }, [customers, q]);

  const canCreate = /^\d{10}$/.test(creatingMobile) && creatingName.trim().length > 0;

  const handleCreate = async () => {
    if (!canCreate) return;
    setBusy(true);
    try {
      const c = await onCreate(creatingName.trim(), creatingMobile);
      onSelect(c);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={cls.modalOverlay}
      // CustomerPickerModal can be stacked on top of the SplitPaymentModal
      // (via the 'Pick or add customer' button on the lending prompt) - bump
      // its z-index above the shared cashier .modalOverlay (900) so it wins.
      style={{ zIndex: 950 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog" aria-modal="true" aria-label="Pick customer"
    >
      <div className={cls.modalPanel}>
        <header className={cls.modalHeader}>
          <Text as="h2" size="lg" weight="heavy">Attach customer</Text>
          <button className={cls.modalClose} onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </header>
        <div className={cls.modalBody}>
          <div className={cls.customerSearch}>
            <Icon name="search" size={16} />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name or mobile..."
              autoFocus
            />
          </div>

          <div className={cls.customerList}>
            <button className={cls.customerRow} onClick={() => { onSelect(null); onClose(); }}>
              <span className={cls.customerAvatar}><Icon name="user" size={14} /></span>
              <div>
                <Text weight="heavy">Walk-in customer</Text>
                <Text size="xs" tone="subtle">No profile attached</Text>
              </div>
            </button>

            {filtered.map((c) => (
              <button key={c.id} className={cls.customerRow} onClick={() => { onSelect(c); onClose(); }}>
                <span className={cls.customerAvatar}>{c.name.slice(0, 2).toUpperCase()}</span>
                <div>
                  <Text weight="heavy">{c.name}</Text>
                  <Text size="xs" tone="subtle">{c.mobile}{c.lendingBalance > 0 ? ` - lending due Rs ${c.lendingBalance.toFixed(2)}` : ''}</Text>
                </div>
              </button>
            ))}

            {filtered.length === 0 && q.trim() && (
              <Text size="sm" tone="subtle" className={cls.emptyRow}>No matches.</Text>
            )}
          </div>

          <div className={cls.customerCreate}>
            <Text as="h3" size="sm" weight="heavy">Or add new</Text>
            <div className={cls.customerCreateRow}>
              <input
                value={creatingName}
                onChange={(e) => setCreatingName(e.target.value)}
                placeholder="Name"
              />
              <input
                value={creatingMobile}
                onChange={(e) => setCreatingMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="10-digit mobile"
                inputMode="numeric"
              />
              <button
                className={cls.primaryBtn}
                disabled={!canCreate || busy}
                onClick={handleCreate}
              >
                {busy ? 'Saving...' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
