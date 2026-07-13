// Live Orders - real-time kanban of in-flight online orders.
//
// Data source: SalesContext (Dexie liveQuery -> auto-reactive when
// storefront places a new order OR staff advances one).
// Displays ACTIVE_ORDER_STATUSES ('placed' -> 'confirmed' -> 'packing'
// -> 'out_for_delivery'). Delivered and cancelled orders drop off this
// board; they live on the Online Orders history page.
//
// Each card exposes two actions: "Advance ->" (moves to next status) and
// "Cancel" (terminal). Both call advanceOrderStatus() on SalesContext.

import { useCallback, useMemo, useState, type FC } from 'react';
import { AdminPage } from '@billing/ui/admin';
import { Badge, Button, Text } from '@billing/ui/atoms';
import { useSales } from '@billing/shared/store/SalesContext';
import { useAuth } from '@billing/shared/store/AuthContext';
import { useMoney } from '@billing/shared/hooks/useMoney';
import {
  ACTIVE_ORDER_STATUSES,
  type OrderStatus,
  type Sale,
} from '@billing/shared/domain/types';
import cls from './admin.module.css';

// Status metadata

interface StatusMeta {
  readonly title: string;
  readonly next: OrderStatus | null;      // null once you're done
  readonly nextLabel: string;
}

const STATUS_META: Readonly<Record<OrderStatus, StatusMeta>> = {
  placed:           { title: 'New',              next: 'confirmed',        nextLabel: 'Confirm' },
  confirmed:        { title: 'Confirmed',        next: 'packing',          nextLabel: 'Start packing' },
  packing:          { title: 'Packing',          next: 'out_for_delivery', nextLabel: 'Dispatch' },
  out_for_delivery: { title: 'Out for delivery', next: 'delivered',        nextLabel: 'Mark delivered' },
  delivered:        { title: 'Delivered',        next: null,               nextLabel: '' },
  cancelled:        { title: 'Cancelled',        next: null,               nextLabel: '' },
};

// Time-ago helper (short form)

const timeAgo = (iso: string): string => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

// Order card

interface OrderCardProps {
  readonly sale: Sale;
  readonly money: (n: number) => string;
  readonly onAdvance: (id: string, next: OrderStatus) => void;
  readonly onCancel: (id: string) => void;
  readonly canAct: boolean;
  readonly onDragStart: (saleId: string) => void;
  readonly onDragEnd: () => void;
  readonly isDragging: boolean;
}

const OrderCard: FC<OrderCardProps> = ({
  sale, money, onAdvance, onCancel, canAct, onDragStart, onDragEnd, isDragging,
}) => {
  const meta = STATUS_META[sale.orderStatus ?? 'placed'];
  const addr = sale.deliveryAddress;
  const addrShort = addr ? `${addr.line1}, ${addr.city} - ${addr.pincode}` : 'Pickup';

  return (
    <div
      className={`${cls.orderCard}${isDragging ? ' ' + cls['orderCard--dragging'] : ''}`}
      draggable={canAct}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', sale.id);
        e.dataTransfer.effectAllowed = 'move';
        onDragStart(sale.id);
      }}
      onDragEnd={onDragEnd}
    >
      <div className={cls.orderCard__row}>
        <span className={cls.orderCard__title}>#{sale.invoiceNo}</span>
        <span className={cls.orderCard__amount}>{money(sale.total)}</span>
      </div>
      <div className={cls.orderCard__meta}>
        {sale.customerName ?? 'Guest'} &middot; {sale.customerMobile ?? 'no phone'}
      </div>
      <div className={cls.orderCard__addr}>{addrShort}</div>
      <div className={cls.orderCard__meta}>
        {sale.unitCount} item{sale.unitCount === 1 ? '' : 's'} &middot; {timeAgo(sale.completedAt)}
      </div>
      {sale.customerNotes && (
        <div className={cls.orderCard__addr}><em>&ldquo;{sale.customerNotes}&rdquo;</em></div>
      )}
      {canAct && meta.next && (
        <div className={cls.orderCard__actions}>
          <Button variant="secondary" size="sm" onClick={() => onCancel(sale.id)}>Cancel</Button>
          <Button variant="primary"   size="sm" onClick={() => onAdvance(sale.id, meta.next!)}>
            {meta.nextLabel}
          </Button>
        </div>
      )}
    </div>
  );
};

// Page

export const LiveOrdersPage: FC = () => {
  const { sales, advanceOrderStatus } = useSales();
  const { currentUser, can } = useAuth();
  const { money } = useMoney();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<OrderStatus | null>(null);

  const canAct = can('sale:record');

  const active = useMemo(() => sales.filter(
    (s) => s.channel === 'online' && s.orderStatus && ACTIVE_ORDER_STATUSES.includes(s.orderStatus),
  ), [sales]);

  const byStatus = useMemo(() => {
    const map: Record<OrderStatus, Sale[]> = {
      placed: [], confirmed: [], packing: [], out_for_delivery: [], delivered: [], cancelled: [],
    };
    for (const s of active) map[s.orderStatus ?? 'placed'].push(s);
    return map;
  }, [active]);

  const handleAdvance = useCallback(async (id: string, next: OrderStatus) => {
    setBusyId(id);
    try {
      await advanceOrderStatus(id, next, currentUser?.username ?? 'staff');
    } finally {
      setBusyId(null);
    }
  }, [advanceOrderStatus, currentUser]);

  const handleCancel = useCallback(async (id: string) => {
    if (!window.confirm('Cancel this order? This cannot be undone.')) return;
    setBusyId(id);
    try {
      await advanceOrderStatus(id, 'cancelled', currentUser?.username ?? 'staff', 'Cancelled by staff');
    } finally {
      setBusyId(null);
    }
  }, [advanceOrderStatus, currentUser]);

  // Drag-and-drop: dropping a card on another column advances (or reverts)
  // that order's status. Same-column drops are no-ops. Native HTML5 DnD
  // keeps this dependency-free.
  const handleDrop = useCallback(async (targetStatus: OrderStatus, saleId: string) => {
    setDropTarget(null);
    setDraggingId(null);
    const sale = sales.find((s) => s.id === saleId);
    if (!sale || sale.orderStatus === targetStatus) return;
    setBusyId(saleId);
    try {
      await advanceOrderStatus(saleId, targetStatus, currentUser?.username ?? 'staff', 'Moved via drag-drop');
    } finally {
      setBusyId(null);
    }
  }, [advanceOrderStatus, currentUser, sales]);

  return (
    <AdminPage
      title="Live Orders"
      subtitle={`${active.length} order${active.length === 1 ? '' : 's'} in flight - drag between columns to update status.`}
      actions={<Badge variant={active.length > 0 ? 'success' : 'neutral'}>{active.length} active</Badge>}
    >
      <div className={cls.kanban}>
        {ACTIVE_ORDER_STATUSES.map((status) => {
          const meta = STATUS_META[status];
          const rows = byStatus[status];
          const isDropTarget = dropTarget === status && draggingId !== null;
          return (
            <section
              key={status}
              className={`${cls.kanbanCol}${isDropTarget ? ' ' + cls['kanbanCol--dropTarget'] : ''}`}
              aria-label={meta.title}
              onDragOver={(e) => {
                if (!canAct || !draggingId) return;
                e.preventDefault();                     // allow drop
                e.dataTransfer.dropEffect = 'move';
                if (dropTarget !== status) setDropTarget(status);
              }}
              onDragLeave={() => { if (dropTarget === status) setDropTarget(null); }}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData('text/plain');
                if (id) void handleDrop(status, id);
              }}
            >
              <header className={cls.kanbanCol__head}>
                <span className={cls.kanbanCol__title}>{meta.title}</span>
                <span className={cls.kanbanCol__count}>{rows.length}</span>
              </header>
              {rows.length === 0 && <div className={cls.kanbanCol__empty}>Nothing here.</div>}
              {rows.map((sale) => (
                <OrderCard
                  key={sale.id}
                  sale={sale}
                  money={money}
                  canAct={canAct && busyId !== sale.id}
                  onAdvance={handleAdvance}
                  onCancel={handleCancel}
                  onDragStart={setDraggingId}
                  onDragEnd={() => { setDraggingId(null); setDropTarget(null); }}
                  isDragging={draggingId === sale.id}
                />
              ))}
            </section>
          );
        })}
      </div>
      {active.length === 0 && (
        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <Text tone="subtle">
            No live orders right now. Place one from the storefront to see it here.
          </Text>
        </div>
      )}
    </AdminPage>
  );
};
