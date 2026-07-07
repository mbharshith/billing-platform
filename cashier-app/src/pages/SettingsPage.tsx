/**
 * SettingsPage — edit store info, tax rate, currency, receipt footer.
 * Admin-only (enforced by <AdminRoute> at the router level).
 */
import { useState, type ChangeEvent, type FC, type FormEvent } from 'react';
import cls from './pages.module.css';
import { Button, Field, Input, Select, Text, Textarea } from '../components/atoms';
import { PageHeader } from '../components/layout/AppShell';
import { STRINGS } from '../domain/strings';
import { useSettings } from '../store/SettingsContext';
import { useToast } from '../store/ToastContext';
import { storage } from '../lib/storage';

const CURRENCIES = ['USD', 'INR', 'GBP', 'EUR', 'AUD', 'CAD', 'SGD', 'AED'] as const;

export const SettingsPage: FC = () => {
  const { settings, update } = useSettings();
  const toast = useToast();
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);

  const on = <K extends keyof typeof form>(k: K) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const v = k === 'taxRate' ? Number(e.target.value) / 100 : e.target.value;
      setForm((prev) => ({ ...prev, [k]: v as typeof prev[K] }));
    };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    window.setTimeout(() => {
      update(form);
      setSaving(false);
      toast.success(STRINGS.settings.saved);
    }, 250);
  };

  const handleWipe = () => {
    if (!window.confirm(STRINGS.settings.wipeConfirm)) return;
    storage.clearAll();
    toast.info(STRINGS.settings.wipeDone);
    window.setTimeout(() => window.location.reload(), 800);
  };

  return (
    <>
      <PageHeader title={STRINGS.settings.pageTitle} subtitle={STRINGS.settings.pageSubtitle} />

      <form className={cls.card} onSubmit={handleSubmit}>
        <div className={cls.cardHeader}>
          <Text as="h2" size="lg" weight="bold">Store profile</Text>
        </div>
        <div className={cls.cardBody}>
          <div className={cls.formGrid}>
            <Field label={STRINGS.settings.storeName} htmlFor="s-name" required>
              <Input id="s-name" value={form.storeName} onChange={on('storeName')} required />
            </Field>
            <Field label={STRINGS.settings.address} htmlFor="s-addr">
              <Input id="s-addr" value={form.address} onChange={on('address')} />
            </Field>
            <div className={[cls.formGrid, cls['formGrid--two']].join(' ')}>
              <Field label={STRINGS.settings.phone} htmlFor="s-phone">
                <Input id="s-phone" value={form.phone} onChange={on('phone')} leadingIcon="phone" />
              </Field>
              <Field label={STRINGS.settings.gstin} htmlFor="s-gstin">
                <Input id="s-gstin" value={form.gstin} onChange={on('gstin')} />
              </Field>
            </div>
            <div className={[cls.formGrid, cls['formGrid--two']].join(' ')}>
              <Field label={STRINGS.settings.taxRate} htmlFor="s-tax">
                <Input
                  id="s-tax"
                  type="number"
                  min={0}
                  max={30}
                  step={0.01}
                  value={(form.taxRate * 100).toFixed(2)}
                  onChange={on('taxRate')}
                />
              </Field>
              <Field label={STRINGS.settings.currency} htmlFor="s-cur">
                <Select id="s-cur" value={form.currency} onChange={on('currency')}>
                  {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </Field>
            </div>
            <Field label={STRINGS.settings.receiptFooter} htmlFor="s-footer">
              <Textarea id="s-footer" value={form.receiptFooter} onChange={on('receiptFooter')} rows={3} />
            </Field>
          </div>
        </div>
        <div className={cls.cardActions}>
          <Button type="submit" variant="primary" loading={saving} leadingIcon="check">
            {STRINGS.settings.save}
          </Button>
        </div>
      </form>

      <div className={[cls.card, cls.dangerCard].join(' ')}>
        <div className={cls.cardHeader}>
          <Text as="h2" size="lg" weight="bold" tone="danger">{STRINGS.settings.dangerHeading}</Text>
        </div>
        <div className={cls.cardBody}>
          <Text tone="subtle">{STRINGS.settings.dangerHint}</Text>
        </div>
        <div className={cls.cardActions}>
          <Button variant="danger" leadingIcon="trash" onClick={handleWipe}>
            {STRINGS.settings.wipeAll}
          </Button>
        </div>
      </div>
    </>
  );
};
