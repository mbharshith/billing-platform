// CreateTenantModal - vendor-only tenant provisioning. Creates Store + first admin User
// + audit entry; if admin creation fails, rolls back the store (Dexie doesn't span contexts).
import { useState, type FC, type FormEvent } from 'react';
import { Button, Field, Input } from '@shared/atoms';
import { Modal } from '@shared/organisms';
import { db } from '@shared/lib/db';
import { STRINGS } from '@shared/domain/strings';
import { useAudit } from '@shared/store/AuditContext';
import { useAuth } from '@shared/store/AuthContext';
import { useStores } from '@shared/store/StoresContext';
import { useToast } from '@shared/store/ToastContext';
import { useUsers } from '@shared/store/UsersContext';
import {
  CURRENCY_PRESETS, TenantForm, TenantFormDivider, TenantPreview, TenantSection,
  TenantStoreFields, TenantTwoCol,
} from './tenantForm';

interface CreateTenantModalProps {
  readonly onClose: () => void;
  readonly onCreated?: () => void;
}

type FormErrors = Partial<Record<
  | 'name' | 'city' | 'phone' | 'address' | 'taxRate' | 'currency'
  | 'adminName' | 'adminUsername' | 'adminPassword',
  string
>>;

export const CreateTenantModal: FC<CreateTenantModalProps> = ({ onClose, onCreated }) => {
  const { create: createStore, remove: removeStore } = useStores();
  const { create: createUser } = useUsers();
  const { log } = useAudit();
  const { currentUser } = useAuth();
  const toast = useToast();

  // Store fields
  const [name, setName]         = useState('');
  const [city, setCity]         = useState('');
  const [phone, setPhone]       = useState('');
  const [address, setAddress]   = useState('');
  const [currency, setCurrency] = useState<string>('INR');
  const [taxRate, setTaxRate]   = useState<string>('18');

  // Initial admin fields
  const [adminName, setAdminName]         = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  // Bump the tax default when currency changes - but only if the user hasn't
  // already customized it away from the previous currency's default.
  const handleCurrency = (code: string) => {
    setCurrency(code);
    const preset = CURRENCY_PRESETS.find((c) => c.code === code);
    const prev   = CURRENCY_PRESETS.find((c) => c.code === currency);
    if (preset && prev && taxRate === String(prev.tax * 100)) {
      setTaxRate(String(preset.tax * 100));
    }
  };

  const validate = (): FormErrors => {
    const next: FormErrors = {};
    if (!name.trim())          next.name          = 'Store name is required.';
    if (!city.trim())          next.city          = 'City is required.';
    if (!address.trim())       next.address       = 'Address is required.';
    if (!currency.trim())      next.currency      = 'Currency is required.';
    const tax = Number(taxRate);
    if (!Number.isFinite(tax) || tax < 0 || tax > 100) {
      next.taxRate = 'Tax rate must be a percentage between 0 and 100.';
    }
    if (!adminName.trim())     next.adminName     = 'Admin name is required.';
    if (!adminUsername.trim()) next.adminUsername = 'Admin username is required.';
    if (!/^[a-z0-9._-]{3,}$/i.test(adminUsername.trim())) {
      next.adminUsername = 'Username must be 3+ chars, letters/digits/._- only.';
    }
    if (adminPassword.length < 8) {
      next.adminPassword = 'Password must be at least 8 characters.';
    }
    return next;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length > 0) return;

    setSubmitting(true);

    // 1. Create the store.
    const storeRes = await createStore({
      name: name.trim(), city: city.trim(), phone: phone.trim(),
      address: address.trim(),
      taxRate: Number(taxRate) / 100,
      currency: currency.trim().toUpperCase(),
    });
    if (!storeRes.ok) {
      setSubmitting(false);
      setErrors({ name: storeRes.error === 'duplicateName'
        ? 'A tenant with this name already exists.' : 'Invalid tenant details.' });
      return;
    }

    // 2. Create the initial admin user for that store.
    const userRes = await createUser({
      name:     adminName.trim(),
      username: adminUsername.trim(),
      password: adminPassword,
      role:     'admin',
      storeId:  storeRes.store.id,
    });
    if (!userRes.ok) {
      // Compensate: remove the ghost store. Real backend would use a transaction.
      await removeStore(storeRes.store.id);
      setSubmitting(false);
      const msg = userRes.error === 'duplicate'
        ? 'That admin username is already taken. Try another.'
        : 'Password too weak. Use 8+ characters.';
      setErrors(userRes.error === 'duplicate'
        ? { adminUsername: msg } : { adminPassword: msg });
      return;
    }

    // 3. Audit.
    await log({
      actorUsername: currentUser?.username ?? 'unknown',
      action: 'tenant.create',
      targetStoreId: storeRes.store.id,
      detail: `${storeRes.store.name} - admin: ${adminUsername.trim()}`,
    });

    void db; // Dexie put-events fire on their own - no manual refresh needed.
    toast.success(`${storeRes.store.name} onboarded. Admin '${adminUsername.trim()}' can now sign in.`);
    setSubmitting(false);
    onCreated?.();
    onClose();
  };

  return (
    <Modal
      title="Onboard a new tenant"
      subtitle="You are the only one who can create a store. Capture the tenant metadata + their first admin."
      wide
      onClose={onClose}
      closeLabel={STRINGS.ariaLabels.closeModal}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting} leadingIcon="plus">
            {submitting ? 'Onboarding\u2026' : 'Create tenant'}
          </Button>
        </>
      }
    >
      <TenantForm onSubmit={handleSubmit}>
        <TenantStoreFields
          idPrefix="tt" autoFocusName
          name={name} onName={setName}
          city={city} onCity={setCity}
          phone={phone} onPhone={setPhone}
          address={address} onAddress={setAddress}
          currency={currency} onCurrency={handleCurrency}
          taxRate={taxRate} onTaxRate={setTaxRate}
          errors={errors}
          taxHint="e.g. 18 for GST, 8.25 for MO sales tax"
          namePlaceholder="e.g. Nike Andheri West"
          cityPlaceholder="Mumbai"
          addressPlaceholder="Shop 12, Infiniti Mall, Andheri West, Mumbai 400053"
          phonePlaceholder="+91 22 4000 5000"
        />

        <TenantFormDivider />

        <TenantSection heading="Initial admin"
          caption="The tenant will sign in with these credentials. They can create additional users after logging in.">
          <TenantTwoCol>
            <Field label="Admin full name" required htmlFor="tt-aname" error={errors.adminName}>
              <Input id="tt-aname" leadingIcon="user"
                value={adminName} onChange={(e) => setAdminName(e.target.value)}
                placeholder="e.g. Priya Sharma" invalid={!!errors.adminName} />
            </Field>
            <Field label="Username" required htmlFor="tt-auser" error={errors.adminUsername}
              hint="letters/digits/._-">
              <Input id="tt-auser"
                value={adminUsername} onChange={(e) => setAdminUsername(e.target.value)}
                placeholder="nike" autoComplete="off" invalid={!!errors.adminUsername} />
            </Field>
          </TenantTwoCol>
          <Field label="Initial password" required htmlFor="tt-apass" error={errors.adminPassword}
            hint="8+ chars. Tenant should change on first login.">
            <Input id="tt-apass" type="password" leadingIcon="lock"
              value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="\u2022\u2022\u2022\u2022\u2022\u2022"
              autoComplete="new-password" invalid={!!errors.adminPassword} />
          </Field>
        </TenantSection>

        <TenantPreview>
          Creating tenant <strong>{name || '\u2014'}</strong> in <strong>{currency}</strong>.
          First login: <strong>{adminUsername || '\u2014'}</strong>.
        </TenantPreview>
      </TenantForm>
    </Modal>
  );
};
