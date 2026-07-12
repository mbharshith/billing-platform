// SettingsPage — receipt footer preferences + read-only store profile. Admin-only.
import { useState, type ChangeEvent, type FC, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import cls from './pages.module.css';
import { Button, Field, Icon, Text, Textarea } from '@billing/ui/atoms';
import { PageHeader } from '../CounterShell';
import { STRINGS } from '@billing/shared/domain/strings';
import { useSettings } from '@billing/shared/store/SettingsContext';
import { useStores } from '@billing/shared/store/StoresContext';
import { useCurrentStoreId } from '@billing/shared/store/AuthContext';
import { useToast } from '@billing/shared/store/ToastContext';
import { storage } from '@billing/shared/lib/storage';
import { resetDb } from '@billing/shared/lib/db';
import { resetBootstrap } from '@billing/shared/lib/db-bootstrap';

export const SettingsPage: FC = () => {
  const { settings, update } = useSettings();
  const { byId } = useStores();
  const currentStoreId = useCurrentStoreId();
  const currentStore = byId(currentStoreId);
  const toast = useToast();
  const { slug = '' } = useParams<{ slug: string }>();
  const [footer, setFooter] = useState(settings.receiptFooter);
  const [saving, setSaving] = useState(false);

  const handleFooterChange = (e: ChangeEvent<HTMLTextAreaElement>) =>
    setFooter(e.target.value);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    window.setTimeout(() => {
      update({ receiptFooter: footer });
      setSaving(false);
      toast.success(STRINGS.settings.saved);
    }, 250);
  };

  const handleWipe = async () => {
    if (!window.confirm(STRINGS.settings.wipeConfirm)) return;
    storage.clearAll();     // theme, session, migration flag
    resetBootstrap();       // let the next boot re-seed from scratch
    await resetDb();        // drop every IndexedDB table
    toast.info(STRINGS.settings.wipeDone);
    window.setTimeout(() => window.location.reload(), 800);
  };

  return (
    <>
      <PageHeader
        title={STRINGS.settings.pageTitle}
        subtitle={STRINGS.settings.pageSubtitle}
        breadcrumbs={[
          { label: STRINGS.nav.dashboard, href: `/${slug}/admin` },
          { label: STRINGS.settings.pageTitle },
        ]}
      />

      {/* Read-only store profile — mirror of /store, kept in sync via StoreContext. */}
      <div className={cls.card}>
        <div className={cls.cardHeader}>
          <Text as="h2" size="lg" weight="bold">{STRINGS.settings.profileHeading}</Text>
        </div>
        <div className={cls.cardBody}>
          <div className={cls.lockedNotice} role="note">
            <Icon name="lock" size={16} />
            <Text size="sm">{STRINGS.settings.profileLockNote}</Text>
          </div>
          <dl className={cls.readOnlyGrid}>
            <ReadOnlyField label={STRINGS.settings.storeName} value={currentStore?.name ?? '—'} />
            <ReadOnlyField label={STRINGS.settings.address}   value={currentStore?.address || currentStore?.city || '—'} />
            <ReadOnlyField label={STRINGS.settings.phone}     value={currentStore?.phone || '—'} />
            <ReadOnlyField label={STRINGS.settings.gstin}     value={settings.gstin || '—'} />
            <ReadOnlyField label={STRINGS.settings.taxRate}   value={`${((currentStore?.taxRate ?? settings.taxRate) * 100).toFixed(2)}%`} />
            <ReadOnlyField label={STRINGS.settings.currency}  value={currentStore?.currency || settings.currency} />
          </dl>
        </div>
      </div>

      {/* Editable — receipt footer (cosmetic, forward-looking only). */}
      <form className={cls.card} onSubmit={handleSubmit}>
        <div className={cls.cardHeader}>
          <Text as="h2" size="lg" weight="bold">{STRINGS.settings.receiptHeading}</Text>
          <Text size="sm" tone="subtle">{STRINGS.settings.receiptHint}</Text>
        </div>
        <div className={cls.cardBody}>
          <div className={cls.formGrid}>
            <Field label={STRINGS.settings.receiptFooter} htmlFor="s-footer">
              <Textarea id="s-footer" value={footer} onChange={handleFooterChange} rows={3} />
            </Field>
          </div>
        </div>
        <div className={cls.cardActions}>
          <Button
            type="submit"
            variant="primary"
            loading={saving}
            leadingIcon="check"
            disabled={footer === settings.receiptFooter}
          >
            {STRINGS.settings.save}
          </Button>
        </div>
      </form>

      {/* Danger zone — always tenant-controllable (browser-scoped only). */}
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

// Compact <dt>/<dd> pair for read-only display.
const ReadOnlyField: FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className={cls.readOnlyField}>
    <dt><Text size="xs" tone="subtle" upper weight="semibold">{label}</Text></dt>
    <dd><Text size="md" weight="semibold">{value}</Text></dd>
  </div>
);
