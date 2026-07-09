// EditTenantModal - vendor-only edit of store metadata + optional admin name/password.
// Peer (not merged) with Create: diff-tracking and opt-in password reset would tangle both.
import { useMemo, useState, type FC, type FormEvent } from 'react';
import { Button, Field, Input } from '@shared/atoms';
import { Modal } from '@shared/organisms';
import { STRINGS } from '@shared/domain/strings';
import type { Store, User } from '@shared/domain/types';
import { useAudit } from '@shared/store/AuditContext';
import { useAuth } from '@shared/store/AuthContext';
import { useStores } from '@shared/store/StoresContext';
import { useToast } from '@shared/store/ToastContext';
import { useUsers } from '@shared/store/UsersContext';
import {
  CURRENCY_CODES, TenantCheckboxRow, TenantForm, TenantFormDivider, TenantPreview,
  TenantSection, TenantStoreFields, TenantTwoCol,
} from './tenantForm';

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

export const EditTenantModal: FC<EditTenantModalProps> = ({ store, admin, onClose }) => {
  const { update: updateStore } = useStores();
  const { update: updateUser } = useUsers();
  const { log } = useAudit();
  const { currentUser } = useAuth();
  const toast = useToast();

  // Store fields - seed from current values.
  const [name, setName]         = useState(store.name);
  const [city, setCity]         = useState(store.city);
  const [phone, setPhone]       = useState(store.phone ?? '');
  const [address, setAddress]   = useState(store.address ?? '');
  const [currency, setCurrency] = useState(store.currency);
  const [taxRate, setTaxRate]   = useState(String(Math.round(store.taxRate * 10000) / 100));

  // Admin fields - password is opt-in; blank = don't change.
  const [adminName, setAdminName]         = useState(admin?.name ?? '');
  const [resetPassword, setResetPassword] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  // Track what will change so we can show a helpful summary + skip no-op writes.
  const diff = useMemo(() => {
    const patch: Partial<{
      name: string; city: string; phone: string; address: string;
      currency: string; taxRate: number;
    }> = {};
    if (name.trim()            !== store.name)             patch.name     = name.trim();
    if (city.trim()            !== store.city)             patch.city     = city.trim();
    if (phone.trim()           !== (store.phone ?? ''))    patch.phone    = phone.trim();
    if (address.trim()         !== (store.address ?? ''))  patch.address  = address.trim();
    if (currency.toUpperCase() !== store.currency)         patch.currency = currency.toUpperCase();
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
    if (!name.trim())     next.name     = 'Store name is required.';
    if (!city.trim())     next.city     = 'City is required.';
    if (!address.trim())  next.address  = 'Address is required.';
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
          ? 'Another tenant already uses that name.' : 'Invalid tenant details.' });
        return;
      }
      changes.push(`store: ${Object.keys(diff.patch).join(', ')}`);
    }

    // 2. Admin patch - name + optional password.
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
      detail: `${store.name} - ${changes.join(' | ')}`,
    });

    toast.success(diff.passwordChanging
      ? `${name.trim()} updated. Admin must sign in with the new password.`
      : `${name.trim()} updated.`);
    setSubmitting(false);
    onClose();
  };

  // Currency options: standard set + the current store's currency if it's exotic.
  const currencyOptions = useMemo(() => {
    const base: { code: string; label: string }[] = CURRENCY_CODES.map((c) => ({ code: c, label: c }));
    if (!CURRENCY_CODES.includes(store.currency as (typeof CURRENCY_CODES)[number])) {
      base.push({ code: store.currency, label: `${store.currency} (current)` });
    }
    return base;
  }, [store.currency]);

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
          <Button variant="primary" onClick={handleSubmit}
            disabled={submitting || nothingToDo} leadingIcon="check">
            {submitting ? 'Saving\u2026' : nothingToDo ? 'No changes' : 'Save changes'}
          </Button>
        </>
      }
    >
      <TenantForm onSubmit={handleSubmit}>
        <TenantStoreFields
          idPrefix="et" autoFocusName
          name={name} onName={setName}
          city={city} onCity={setCity}
          phone={phone} onPhone={setPhone}
          address={address} onAddress={setAddress}
          currency={currency} onCurrency={setCurrency}
          taxRate={taxRate} onTaxRate={setTaxRate}
          errors={errors}
          currencyOptions={currencyOptions}
        />

        {admin && (
          <>
            <TenantFormDivider />
            <TenantSection heading="Admin">
              <TenantTwoCol>
                <Field label="Admin full name" required htmlFor="et-aname" error={errors.adminName}>
                  <Input id="et-aname" leadingIcon="user"
                    value={adminName} onChange={(e) => setAdminName(e.target.value)}
                    invalid={!!errors.adminName} />
                </Field>
                <Field label="Username" htmlFor="et-auser" hint="Read-only">
                  <Input id="et-auser" value={admin.username} disabled readOnly />
                </Field>
              </TenantTwoCol>

              <TenantCheckboxRow
                checked={resetPassword}
                onChange={(next) => {
                  setResetPassword(next);
                  if (!next) setAdminPassword('');
                }}
                label="Reset the admin's password"
              />

              {resetPassword && (
                <Field label="New password" required htmlFor="et-apass" error={errors.adminPassword}
                  hint="8+ chars. Admin will need to use this next time they sign in.">
                  <Input id="et-apass" type="password" leadingIcon="lock"
                    value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)}
                    autoComplete="new-password" invalid={!!errors.adminPassword} />
                </Field>
              )}
            </TenantSection>
          </>
        )}

        <TenantPreview>
          {nothingToDo
            ? 'No pending changes.'
            : `Will update: ${[
                Object.keys(diff.patch).length > 0 && `store (${Object.keys(diff.patch).join(', ')})`,
                diff.adminNameChanged && 'admin name',
                diff.passwordChanging && 'admin password',
              ].filter(Boolean).join(' | ')}.`}
        </TenantPreview>
      </TenantForm>
    </Modal>
  );
};
