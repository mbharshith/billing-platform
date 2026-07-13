// Print & Terminal Settings - per-outlet configuration.
//
// Unlike other admin pages this is a SINGLE-ROW form, not a CRUD list.
// The row is keyed by outletId (from AuthContext.currentOutletId) and lives
// in db.outletSettings (primary key = outletId, not id). On first open we
// synthesise a default record and save it on Save.

import { useCallback, useEffect, useState, type FC } from 'react';
import { AdminPage } from '@billing/ui/admin';
import { Badge, Button, Text } from '@billing/ui/atoms';
import { useToast } from '@billing/shared/store/ToastContext';
import { useCurrentOutletId } from '@billing/shared/store/AuthContext';
import { db } from '@billing/shared/lib/db';
import type { OutletSettings } from '@billing/shared/domain/restaurant';
import cls from './admin.module.css';

const ROUND_MODES: readonly { value: OutletSettings['roundOff']; label: string }[] = [
  { value: 'none',    label: 'No rounding' },
  { value: 'nearest', label: 'Round to nearest' },
  { value: 'up',      label: 'Always round up' },
  { value: 'down',    label: 'Always round down' },
];

const ROUND_STEPS: readonly { value: number; label: string }[] = [
  { value: 0.5, label: '0.50' },
  { value: 1,   label: '1.00' },
  { value: 5,   label: '5.00' },
];

const emptySettings = (outletId: string): OutletSettings => ({
  outletId,
  printBillHeader:  '',
  printBillFooter:  'Thank you for dining with us!',
  printKotHeader:   '',
  roundOff:         'nearest',
  roundOffTo:       1,
  billSeriesPrefix: 'INV',
  kotSeriesPrefix:  'KOT',
  updatedAt:        new Date().toISOString(),
});

export const OutletSettingsPage: FC = () => {
  const outletId = useCurrentOutletId();
  const toast = useToast();
  const [form, setForm]       = useState<OutletSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!outletId) { setLoading(false); return; }
      const row = await db.outletSettings.get(outletId);
      if (!cancelled) {
        setForm(row ?? emptySettings(outletId));
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [outletId]);

  const patch = useCallback(<K extends keyof OutletSettings>(k: K, v: OutletSettings[K]) => {
    setForm((f) => (f ? { ...f, [k]: v } : f));
  }, []);

  const handleSave = useCallback(async () => {
    if (!form) return;
    setSaving(true);
    try {
      const next: OutletSettings = { ...form, updatedAt: new Date().toISOString() };
      await db.outletSettings.put(next);
      setForm(next);
      toast.success('Print settings saved.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  }, [form, toast]);

  if (!outletId) {
    return (
      <AdminPage title="Print & Terminal Settings">
        <Text tone="subtle">Pick an outlet from the header first.</Text>
      </AdminPage>
    );
  }
  if (loading || !form) {
    return <AdminPage title="Print & Terminal Settings"><Text tone="subtle">Loading&hellip;</Text></AdminPage>;
  }

  return (
    <AdminPage
      title="Print & Terminal Settings"
      subtitle="Per-outlet print headers, footers, invoice / KOT prefixes and rounding."
      actions={
        <>
          <Badge variant="neutral">Outlet: {outletId.slice(0, 8)}</Badge>
          <Button variant="primary" size="sm" loading={saving} onClick={handleSave}>Save settings</Button>
        </>
      }
    >
      <div className={cls.settingsForm}>
        <FormRow label="Bill header (printed on top of every invoice)" hint="Restaurant name, address, GSTIN">
          <textarea
            rows={3}
            value={form.printBillHeader}
            onChange={(e) => patch('printBillHeader', e.target.value)}
          />
        </FormRow>
        <FormRow label="Bill footer (printed at the bottom)" hint="Thank-you note, refund policy, QR link">
          <textarea
            rows={3}
            value={form.printBillFooter}
            onChange={(e) => patch('printBillFooter', e.target.value)}
          />
        </FormRow>
        <FormRow label="KOT header (printed on kitchen tickets)">
          <textarea
            rows={2}
            value={form.printKotHeader}
            onChange={(e) => patch('printKotHeader', e.target.value)}
          />
        </FormRow>

        <div className={cls.settingsGrid}>
          <FormRow label="Invoice number prefix">
            <input
              type="text" maxLength={10}
              value={form.billSeriesPrefix}
              onChange={(e) => patch('billSeriesPrefix', e.target.value.toUpperCase())}
            />
          </FormRow>
          <FormRow label="KOT number prefix">
            <input
              type="text" maxLength={10}
              value={form.kotSeriesPrefix}
              onChange={(e) => patch('kotSeriesPrefix', e.target.value.toUpperCase())}
            />
          </FormRow>
          <FormRow label="Rounding mode">
            <select
              value={form.roundOff}
              onChange={(e) => patch('roundOff', e.target.value as OutletSettings['roundOff'])}
            >
              {ROUND_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </FormRow>
          <FormRow label="Round to">
            <select
              value={form.roundOffTo}
              onChange={(e) => patch('roundOffTo', Number(e.target.value))}
              disabled={form.roundOff === 'none'}
            >
              {ROUND_STEPS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </FormRow>
        </div>

        <Text tone="subtle" size="sm">
          Last updated: {new Date(form.updatedAt).toLocaleString()}
        </Text>
      </div>
    </AdminPage>
  );
};

// Local FormRow molecule - kept private to this page

interface FormRowProps {
  readonly label: string;
  readonly hint?: string;
  readonly children: React.ReactNode;
}
const FormRow: FC<FormRowProps> = ({ label, hint, children }) => (
  <label className={cls.settingsRow}>
    <span className={cls.settingsRow__label}>{label}</span>
    {hint && <span className={cls.settingsRow__hint}>{hint}</span>}
    {children}
  </label>
);
