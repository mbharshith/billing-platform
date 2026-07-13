// Kitchen Display System - big-screen view of active orders for kitchen staff.
//
// Similar to Live Orders but designed for wall-mounted screens:
// - Bigger cards, minimal chrome
// - Optional per-station filter (dropdown of active KotStations)
// - Single primary action per order: 'Mark ready' (advances packing -> out_for_delivery)
// - Auto-updates via Dexie liveQuery on SalesContext.

import { useCallback, useMemo, useState, type FC } from 'react';
import { AdminPage } from '@billing/ui/admin';
import { Badge, Button, Text } from '@billing/ui/atoms';
import { useSales } from '@billing/shared/store/SalesContext';
import { useAuth } from '@billing/shared/store/AuthContext';
import { useTable } from '@billing/shared/hooks/useTable';
import {
  ACTIVE_ORDER_STATUSES, type OrderStatus, type Sale,
} from '@billing/shared/domain/types';
import type { KotStation } from '@billing/shared/domain/restaurant';
import cls from './admin.module.css';

const NEXT_STATUS: Readonly<Record<OrderStatus, { next: OrderStatus | null; label: string }>> = {
  placed:           { next: 'confirmed',        label: 'Confirm' },
  confirmed:        { next: 'packing',          label: 'Start cooking' },
  packing:          { next: 'out_for_delivery', label: 'Mark ready' },
  out_for_delivery: { next: 'delivered',        label: 'Mark delivered' },
  delivered:        { next: null,               label: '' },
  cancelled:        { next: null,               label: '' },
};

const timeAgo = (iso: string): string => {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h`;
};

export const KdsPage: FC = () => {
  const { sales, advanceOrderStatus } = useSales();
  const { currentUser } = useAuth();
  const stations = useTable<KotStation>('kotStations');
  const [stationFilter, setStationFilter] = useState<string>('all');
  const [busyId, setBusyId] = useState<string | null>(null);

  // KDS is most relevant to orders currently in the kitchen (confirmed / packing).
  // 'placed' orders that haven't been confirmed yet also show so cashiers can
  // acknowledge quickly.
  const active = useMemo(
    () => sales.filter((s) =>
      s.channel === 'online'
      && s.orderStatus
      && ACTIVE_ORDER_STATUSES.includes(s.orderStatus)),
    [sales],
  );

  const activeStations = useMemo(
    () => stations.rows.filter((s) => s.active !== false),
    [stations.rows],
  );

  const advance = useCallback(async (sale: Sale) => {
    const meta = NEXT_STATUS[sale.orderStatus ?? 'placed'];
    if (!meta.next) return;
    setBusyId(sale.id);
    try {
      await advanceOrderStatus(sale.id, meta.next, currentUser?.username ?? 'kitchen');
    } finally {
      setBusyId(null);
    }
  }, [advanceOrderStatus, currentUser]);

  return (
    <AdminPage
      title="Kitchen Display System"
      subtitle="Big-screen view for kitchen staff. Cards auto-update as orders progress."
      actions={
        <>
          {activeStations.length > 0 && (
            <select
              value={stationFilter}
              onChange={(e) => setStationFilter(e.target.value)}
              className={cls.filterSelect}
            >
              <option value="all">All stations</option>
              {activeStations.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}
          <Badge variant={active.length > 0 ? 'success' : 'neutral'}>
            {active.length} in queue
          </Badge>
        </>
      }
    >
      {active.length === 0 && (
        <div className={cls.kds__empty}>
          <Text tone="subtle" size="lg">Kitchen is clear. Fresh orders will pop up here.</Text>
        </div>
      )}

      <div className={cls.kdsGrid}>
        {active.map((sale) => {
          const meta = NEXT_STATUS[sale.orderStatus ?? 'placed'];
          const elapsed = timeAgo(sale.completedAt);
          const isNew  = (sale.orderStatus === 'placed');
          const isCooking = (sale.orderStatus === 'packing');
          return (
            <div
              key={sale.id}
              className={[cls.kdsCard, isNew && cls['kdsCard--new'], isCooking && cls['kdsCard--cooking']]
                .filter(Boolean).join(' ')}
            >
              <header className={cls.kdsCard__head}>
                <span className={cls.kdsCard__invoice}>#{sale.invoiceNo}</span>
                <span className={cls.kdsCard__time}>{elapsed}</span>
              </header>
              <div className={cls.kdsCard__cust}>{sale.customerName ?? 'Guest'}</div>
              <ul className={cls.kdsCard__items}>
                {sale.lines.map((ln, i) => (
                  <li key={i}>
                    <strong>{ln.quantity}x</strong> {ln.name}
                    {ln.note && <em className={cls.kdsCard__note}> - {ln.note}</em>}
                  </li>
                ))}
              </ul>
              {sale.customerNotes && (
                <div className={cls.kdsCard__specialNote}>
                  <em>&ldquo;{sale.customerNotes}&rdquo;</em>
                </div>
              )}
              {meta.next && (
                <Button
                  variant="primary" size="lg"
                  onClick={() => advance(sale)}
                  disabled={busyId === sale.id}
                >
                  {meta.label}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </AdminPage>
  );
};
