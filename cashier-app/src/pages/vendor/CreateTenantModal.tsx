/**
 * CreateTenantModal — vendor-only tenant provisioning.
 *
 * SINGLE SOURCE OF TRUTH for tenant creation. There is no /signup path —
 * new customers are onboarded by us (the SaaS owner). This mirrors how
 * every real B2B SaaS works: Stripe, Salesforce, Jira Cloud Enterprise,
 * Shopify Plus. Self-serve signup would be a separate GTM decision.
 *
 * On confirm we create BOTH:
 *   1. the Store row (with the vendor-supplied metadata)
 *   2. the first admin User for that store (so they can immediately log in)
 * plus an audit log entry (tenant.create).
 *
 * If step 2 fails (e.g. duplicate username) we roll back step 1 by hand —
 * Dexie doesn't span our contexts in a transaction, so we compensate.
 */
import { useState, type FC, type FormEvent } from 'react';
import { Button, Field, Icon, Input, Text } from '../../components/atoms';
import { Modal } from '../../components/organisms';
import { db } from '../../lib/db';
import { STRINGS } from '../../domain/strings';
import { useAudit } from '../../store/AuditContext';
import { useAuth } from '../../store/AuthContext';
import { useStores } from '../../store/StoresContext';
import { useToast } from '../../store/ToastContext';
import { useUsers } from '../../store/UsersContext';

interface CreateTenantModalProps {
  readonly onClose: () => void;
  readonly onCreated?: () => void;
}

/** Currencies we ship with. Vendor can still type any 3-letter ISO code. */
const CURRENCIES = [
  { code: 'INR', label: '₹ Indian Rupee', tax: 0.18 },
  { code: 'USD', label: '$ US Dollar',    tax: 0.0825 },
  { code: 'EUR', label: '€ Euro',         tax: 0.20 },
  { code: 'GBP', label: '£ British Pound', tax: 0.20 },
  { code: 'AED', label: 'د.إ UAE Dirham', tax: 0.05 },
] as const;

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

  /** Bump defaults when currency changes — nice UX touch. */
  const handleCurrency = (code: string) => {
    setCurrency(code);
    const preset = CURRENCIES.find((c) => c.code === code);
    if (preset && taxRate === '' + (CURRENCIES.find((c) => c.code === currency)?.tax ?? 0) * 100) {
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
      name:    name.trim(),
      city:    city.trim(),
      phone:   phone.trim(),
      address: address.trim(),
      taxRate: Number(taxRate) / 100,
      currency: currency.trim().toUpperCase(),
    });

    if (!storeRes.ok) {
      setSubmitting(false);
      const msg = storeRes.error === 'duplicateName'
        ? 'A tenant with this name already exists.'
        : 'Invalid tenant details.';
      setErrors({ name: msg });
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
      // Compensate: remove the store we just created so we don't leave a
      // "ghost tenant" with no admin. Real backend would use a transaction.
      await removeStore(storeRes.store.id);
      setSubmitting(false);
      const msg = userRes.error === 'duplicate'
        ? 'That admin username is already taken. Try another.'
        : 'Password too weak. Use 8+ characters.';
      setErrors(userRes.error === 'duplicate'
        ? { adminUsername: msg }
        : { adminPassword: msg });
      return;
    }

    // 3. Audit.
    await log({
      actorUsername: currentUser?.username ?? 'unknown',
      action: 'tenant.create',
      targetStoreId: storeRes.store.id,
      detail: `${storeRes.store.name} · admin: ${adminUsername.trim()}`,
    });

    // Dexie put-events fire on their own — no manual refresh needed.
    void db;
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
            {submitting ? 'Onboarding…' : 'Create tenant'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <section>
          <Text as="h3" size="sm" weight="bold" upper tone="subtle">Store details</Text>
          <div style={twoCol}>
            <Field label="Store name" required htmlFor="tt-name" error={errors.name}>
              <Input
                id="tt-name" leadingIcon="store"
                value={name} onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Nike Andheri West"
                autoFocus invalid={!!errors.name}
              />
            </Field>
            <Field label="City" required htmlFor="tt-city" error={errors.city}>
              <Input
                id="tt-city"
                value={city} onChange={(e) => setCity(e.target.value)}
                placeholder="Mumbai"
                invalid={!!errors.city}
              />
            </Field>
          </div>

          <Field label="Full address" required htmlFor="tt-addr" error={errors.address}>
            <Input
              id="tt-addr"
              value={address} onChange={(e) => setAddress(e.target.value)}
              placeholder="Shop 12, Infiniti Mall, Andheri West, Mumbai 400053"
              invalid={!!errors.address}
            />
          </Field>

          <div style={twoCol}>
            <Field label="Phone" htmlFor="tt-phone" hint="Optional">
              <Input
                id="tt-phone" leadingIcon="phone"
                value={phone} onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 22 4000 5000"
              />
            </Field>
            <Field label="Currency" required htmlFor="tt-currency">
              <select
                id="tt-currency"
                value={currency}
                onChange={(e) => handleCurrency(e.target.value)}
                style={selectStyle}
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Tax rate (%)" required htmlFor="tt-tax" error={errors.taxRate}
            hint="e.g. 18 for GST, 8.25 for MO sales tax"
          >
            <Input
              id="tt-tax" type="number" step="0.01" min="0" max="100"
              value={taxRate} onChange={(e) => setTaxRate(e.target.value)}
              invalid={!!errors.taxRate}
            />
          </Field>
        </section>

        <hr style={{ border: 0, borderTop: '1px solid var(--app-border)', margin: '0.5rem 0' }} />

        <section>
          <Text as="h3" size="sm" weight="bold" upper tone="subtle">Initial admin</Text>
          <Text size="xs" tone="subtle">
            The tenant will sign in with these credentials. They can create additional users after logging in.
          </Text>

          <div style={twoCol}>
            <Field label="Admin full name" required htmlFor="tt-aname" error={errors.adminName}>
              <Input
                id="tt-aname" leadingIcon="user"
                value={adminName} onChange={(e) => setAdminName(e.target.value)}
                placeholder="e.g. Priya Sharma"
                invalid={!!errors.adminName}
              />
            </Field>
            <Field label="Username" required htmlFor="tt-auser" error={errors.adminUsername}
              hint="letters/digits/._-"
            >
              <Input
                id="tt-auser"
                value={adminUsername} onChange={(e) => setAdminUsername(e.target.value)}
                placeholder="nike"
                autoComplete="off"
                invalid={!!errors.adminUsername}
              />
            </Field>
          </div>

          <Field label="Initial password" required htmlFor="tt-apass" error={errors.adminPassword}
            hint="8+ chars. Tenant should change on first login."
          >
            <Input
              id="tt-apass" type="password" leadingIcon="lock"
              value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="••••••"
              autoComplete="new-password"
              invalid={!!errors.adminPassword}
            />
          </Field>
        </section>

        {/* Reveal-only sanity check so the vendor sees the resolved data. */}
        <div style={previewStyle}>
          <Icon name="shield" size={14} />
          <Text size="xs" tone="subtle">
            Creating tenant <strong>{name || '—'}</strong> in <strong>{currency}</strong>.
            First login: <strong>{adminUsername || '—'}</strong>.
          </Text>
        </div>
      </form>
    </Modal>
  );
};

const twoCol: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '0.75rem',
  marginTop: '0.5rem',
};

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.625rem 0.75rem',
  border: '1px solid var(--app-border)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--app-surface)',
  color: 'var(--app-text)',
  font: 'inherit',
};

const previewStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.5rem 0.75rem',
  background: 'var(--app-blue-5, #eff6ff)',
  border: '1px solid var(--app-blue-10, #dbeafe)',
  borderRadius: 'var(--radius-md)',
};
