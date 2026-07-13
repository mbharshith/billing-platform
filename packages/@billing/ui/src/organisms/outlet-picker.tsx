// OutletPicker - dropdown chip that lets the cashier pick which physical
// outlet the current sale belongs to. Persists selection per-user via
// AuthContext.setCurrentOutletId (localStorage under 'active-outlet:<userId>').
//
// Reads:  useTable<Outlet>('outlets') scoped to the current storeId.
// Writes: AuthContext.setCurrentOutletId(outletId).
//
// UX rules:
//   - Chip shows a live dot + current outlet name + optional city tag.
//   - Click opens a popover listing all active outlets under the tenant.
//   - Single-outlet tenants render as a plain read-only chip (no arrow, no
//     dropdown) - no point disorienting the cashier with a menu-of-one.
//   - Closes on outside-click or Escape.
//   - Cross-tab safe: AuthContext is the source of truth, so multiple
//     browser tabs stay in lock-step when the user picks a new outlet.

import { useEffect, useMemo, useRef, useState, type FC } from 'react';
import cls from './organisms.module.css';
import { Icon } from '../atoms';
import { useAuth } from '@billing/shared/store/AuthContext';
import { useTable } from '@billing/shared/hooks/useTable';
import type { Outlet } from '@billing/shared/domain/restaurant';

export const OutletPicker: FC = () => {
  const { currentStoreId, currentOutletId, setCurrentOutletId } = useAuth();
  const { rows: outlets } = useTable<Outlet>('outlets');
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Only show outlets in the current tenant that are active. If the seeded
  // storeId matches (single-outlet tenant), we still render the chip.
  const available = useMemo(
    () => outlets.filter((o) => o.storeId === currentStoreId && o.active),
    [outlets, currentStoreId],
  );
  const active = useMemo(
    () => available.find((o) => o.id === currentOutletId) ?? available[0],
    [available, currentOutletId],
  );

  // Outside-click + Esc close.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!currentStoreId || available.length === 0 || !active) return null;

  const label = active.name;
  const single = available.length === 1;

  return (
    <div className={cls.outletPicker} ref={rootRef}>
      <button
        type="button"
        className={cls.outletPicker__chip}
        onClick={() => !single && setOpen((v) => !v)}
        aria-haspopup={single ? undefined : 'listbox'}
        aria-expanded={single ? undefined : open}
        aria-label={single ? `Current outlet: ${label}` : `Change outlet (currently ${label})`}
        title={active.address}
      >
        <span className={cls.outletPicker__dot} aria-hidden />
        <span className={cls.outletPicker__body}>
          <span className={cls.outletPicker__name}>{label}</span>
          {active.address && (
            <span className={cls.outletPicker__addr}>{active.address}</span>
          )}
        </span>
        {!single && <Icon name="arrow" size={12} />}
      </button>

      {open && !single && (
        <div className={cls.outletPicker__menu} role="listbox" aria-label="Outlets">
          {available.map((o) => {
            const selected = o.id === active.id;
            return (
              <button
                key={o.id}
                type="button"
                role="option"
                aria-selected={selected}
                className={[
                  cls.outletPicker__option,
                  selected && cls['outletPicker__option--selected'],
                ].filter(Boolean).join(' ')}
                onClick={() => { setCurrentOutletId(o.id); setOpen(false); }}
              >
                <span className={cls.outletPicker__optionMark} aria-hidden>
                  {selected && <Icon name="check" size={12} />}
                </span>
                <span className={cls.outletPicker__optionBody}>
                  <span className={cls.outletPicker__optionName}>{o.name}</span>
                  <span className={cls.outletPicker__optionAddr}>{o.address}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
