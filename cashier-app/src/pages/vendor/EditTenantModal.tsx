/**
 * EditTenantModal — vendor-only edit of a tenant's store metadata and,
 * optionally, its admin's name + password.
 *
 * Kept as a peer of CreateTenantModal (not a shared component) because:
 *   - Edit doesn't need currency defaults / password-required semantics
 *   - Prefilled state + admin reset flow diverge enough that abstracting
 *     would tangle the two more than it would DRY them.
 *
 * Password reset is intentionally OPT-IN: leaving the field blank means
 * "don't change it". Vendors edit metadata far more often than they
 * touch credentials, and silent password churn is a footgun.
 */
import { useMemo, useState, type FC, type FormEvent } from 'react';
import { Button, Field, Icon, Input, Text } from '../../components/atoms';
import { Modal } from '../../components/organisms';
import { STRINGS } from '../../domain/strings';
import type { Store, User } from '../../domain/types';
import { useAudit } from '../../store/AuditContext';
import { useAuth } from '../../store/AuthContext';
import { useStores } from '../../store/StoresContext';
import { useToast } from '../../store/ToastContext';
import { useUsers } from '../../store/UsersContext';

interface EditTenantModalProps {
  readonly store: Store;
  readonly admin: User | undefined;
  readonly onClose: () => void;
}

type FormErrors = Partial<Record<
  | 'name' | 'city' | 'phone' | 'address' | 'taxRate' | 'currency'
  | 'adminName' | 'adminPassword',
  string
>>;

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED'] as const;

export const EditTenantModal: FC<EditTenantModalProps> = ({ store, admin, onClose }) => {
  const { update: updateStore } = useStores();
  const { update: updateUser } = useUsers();
  const { log } = useAudit();
  const { currentUser } = useAuth();
  const toast = useToast();

  // Store fields — seed from current values.
  const [name, setName]         = useState(store.name);
  const [city, setCity]         = useState(store.city);
  const [phone, setPhone]       = useState(store.phone ?? '');
  const [address, setAddress]   = useState(store.address ?? '');
  const [currency, setCurrency] = useState(store.currency);
  const [taxRate, setTaxRate]   = useState(String(Math.round(store.taxRate * 10000) / 100));

  // Admin fields — password is opt-in; blank = don't change.
  const [adminName, setAdminName]         = useState(admin?.name ?? '');
  const [resetPassword, setResetPassword] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  /** Track what will change so we can show a helpful summary + skip no-op writes. */
  const diff = useMemo(() => {
    const patch: Partial<{
      name: string; city: string; phone: string; address: string;
      currency: string; taxRate: number;
    }> = {};
    if (name.trim()          !== store.name)             patch.name     = name.trim();
    if (city.trim()          !== store.city)             patch.city     = city.trim();
    if (phone.trim()         !== (store.phone ?? ''))    patch.phone    = phone.trim();
    if (address.trim()       !== (store.address ?? ''))  patch.address  = address.trim();
    if (currency.toUpperCase() !== store.currency)       patch.currency = currency.toUpperCase();
    const t = Number(taxRate) / 100;
    if (Number.isFinite(t) && Math.abs(t - store.taxRate) > 1e-9) patch.taxRate = t;

    const adminNameChanged = admin && adminName.trim() !== admin.name;
    const passwordChanging = resetPassword && adminPassword.length > 0;
    return { patch, adminNameChanged: Boolean(adminNameChanged), passwordChanging };
  }, [name, city, phone, address, currency, taxRate, adminName, resetPassword, adminPassword, store, admin]);

  const nothingToDo = Object.keys(diff.patch).length === 0
    && !diff.adminNameChanged
    && !diff.passwordChanging;

  const validate = (): FormErrors => {
    const next: FormErrors = {};
    if (!name.trim())    next.name    = 'Store name is required.';
    if (!city.trim())    next.city    = 'City is required.';
    if (!address.trim()) next.address = 'Address is required.';
    if (!currency.trim()) next.currency = 'Currency is required.';
    const tax = Number(taxRate);
    if (!Number.isFinite(tax) || tax < 0 || tax > 100) {
      next.taxRate = 'Tax rate must be between 0 and 100.';
    }
    if (admin && !adminName.trim()) next.adminName = 'Admin name is required.';
    if (resetPassword && adminPassword.length < 8) {
      next.adminPassword = 'Password must be at least 8 characters.';
    }
    return next;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length > 0) return;
    if (nothingToDo) { onClose(); return; }

    setSubmitting(true);
    const changes: string[] = [];

    // 1. Store patch (only if there's something to change).
    if (Object.keys(diff.patch).length > 0) {
      const res = await updateStore(store.id, diff.patch);
      if (!res.ok) {
        setSubmitting(false);
        setErrors({ name: res.error === 'duplicateName'
          ? 'Another tenant already uses that name.'
          : 'Invalid tenant details.' });
        return;
      }
      changes.push(`store: ${Object.keys(diff.patch).join(', ')}`);
    }

    // 2. Admin patch — name + optional password.
    if (admin && (diff.adminNameChanged || diff.passwordChanging)) {
      const patch: { name?: string; password?: string } = {};
      if (diff.adminNameChanged) patch.name = adminName.trim();
      if (diff.passwordChanging) patch.password = adminPassword;
      await updateUser(admin.id, patch);
      const parts: string[] = [];
      if (diff.adminNameChanged) parts.push('name');
      if (diff.passwordChanging) parts.push('password');
      changes.push(`admin: ${parts.join(' + ')}`);
    }

    // 3. Audit.
    await log({
      actorUsername: currentUser?.username ?? 'unknown',
      action: 'tenant.edit',
      targetStoreId: store.id,
      detail: `${store.name} · ${changes.join(' · ')}`,
    });

    toast.success(
      diff.passwordChanging
        ? `${name.trim()} updated. Admin must sign in with the new password.`
        : `${name.trim()} updated.`,
    );
    setSubmitting(false);
    onClose();
  };

  return (
    <Modal
      title={`Edit ${store.name}`}
      subtitle="Update tenant metadata and (optionally) reset the admin credentials."
      wide
      onClose={onClose}
      closeLabel={STRINGS.ariaLabels.closeModal}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={submitting || nothingToDo}
            leadingIcon="check"
          >
            {submitting ? 'Saving…' : nothingToDo ? 'No changes' : 'Save changes'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <section>
          <Text as="h3" size="sm" weight="bold" upper tone="subtle">Store details</Text>
          <div style={twoCol}>
            <Field label="Store name" required htmlFor="et-name" error={errors.name}>
              <Input
                id="et-name" leadingIcon="store"
                value={name} onChange={(e) => setName(e.target.value)}
                invalid={!!errors.name} autoFocus
              />
            </Field>
            <Field label="City" required htmlFor="et-city" error={errors.city}>
              <Input
                id="et-city"
                value={city} onChange={(e) => setCity(e.target.value)}
                invalid={!!errors.city}
              />
            </Field>
          </div>

          <Field label="Full address" required htmlFor="et-addr" error={errors.address}>
            <Input
              id="et-addr"
              value={address} onChange={(e) => setAddress(e.target.value)}
              invalid={!!errors.address}
            />
          </Field>

          <div style={twoCol}>
            <Field label="Phone" htmlFor="et-phone" hint="Optional">
              <Input
                id="et-phone" leadingIcon="phone"
                value={phone} onChange={(e) => setPhone(e.target.value)}
              />
            </Field>
            <Field label="Currency" required htmlFor="et-currency">
              <select
                id="et-currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                style={selectStyle}
              >
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                {/* Also allow the current currency if it's a custom one */}
                {!CURRENCIES.includes(store.currency as typeof CURRENCIES[number]) && (
                  <option value={store.currency}>{store.currency} (current)</option>
                )}
              </select>
            </Field>
          </div>

          <Field label="Tax rate (%)" required htmlFor="et-tax" error={errors.taxRate}>
            <Input
              id="et-tax" type="number" step="0.01" min="0" max="100"
              value={taxRate} onChange={(e) => setTaxRate(e.target.value)}
              invalid={!!errors.taxRate}
            />
          </Field>
        </section>

        {admin && (
          <>
            <hr style={{ border: 0, borderTop: '1px solid var(--app-border)', margin: '0.5rem 0' }} />
            <section>
              <Text as="h3" size="sm" weight="bold" upper tone="subtle">Admin</Text>
              <div style={twoCol}>
                <Field label="Admin full name" required htmlFor="et-aname" error={errors.adminName}>
                  <Input
                    id="et-aname" leadingIcon="user"
                    value={adminName} onChange={(e) => setAdminName(e.target.value)}
                    invalid={!!errors.adminName}
                  />
                </Field>
                <Field label="Username" htmlFor="et-auser" hint="Read-only">
                  <Input id="et-auser" value={admin.username} disabled readOnly />
                </Field>
              </div>

              <label style={checkboxRow}>
                <input
                  type="checkbox"
                  checked={resetPassword}
                  onChange={(e) => {
                    setResetPassword(e.target.checked);
                    if (!e.target.checked) setAdminPassword('');
                  }}
                />
                <Text size="sm">Reset the admin's password</Text>
              </label>

              {resetPassword && (
                <Field
                  label="New password" required htmlFor="et-apass" error={errors.adminPassword}
                  hint="8+ chars. Admin will need to use this next time they sign in."
                >
                  <Input
                    id="et-apass" type="password" leadingIcon="lock"
                    value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)}
                    autoComplete="new-password"
                    invalid={!!errors.adminPassword}
                  />
                </Field>
              )}
            </section>
          </>
        )}

        {/* Change summary — reassures the vendor exactly what will happen. */}
        <div style={previewStyle}>
          <Icon name="shield" size={14} />
          <Text size="xs" tone="subtle">
            {nothingToDo
              ? 'No pending changes.'
              : `Will update: ${[
                  Object.keys(diff.patch).length > 0 && `store (${Object.keys(diff.patch).join(', ')})`,
                  diff.adminNameChanged && 'admin name',
                  diff.passwordChanging && 'admin password',
                ].filter(Boolean).join(' · ')}.`}
          </Text>
        </div>
      </form>
    </Modal>
  );
};

const twoCol: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem',
};
const selectStyle: React.CSSProperties = {
  width: '100%', padding: '0.625rem 0.75rem',
  border: '1px solid var(--app-border)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--app-surface)', color: 'var(--app-text)', font: 'inherit',
};
const checkboxRow: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '0.5rem',
  padding: '0.5rem 0', cursor: 'pointer',
};
const previewStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '0.5rem',
  padding: '0.5rem 0.75rem',
  background: 'var(--app-blue-5, #eff6ff)',
  border: '1px solid var(--app-blue-10, #dbeafe)',
  borderRadius: 'var(--radius-md)',
};
