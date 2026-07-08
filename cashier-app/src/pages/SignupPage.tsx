/**
 * SignupPage — self-serve tenant onboarding.
 *
 * A new company (tenant) creates their store + first Master account in ONE
 * form. On success they are auto-logged-in as the tenant owner and dropped
 * into the app. Same pattern Jira / Notion / Shopify use for signup.
 *
 * Shares CSS with LoginPage (LoginPage.module.css) since both live in the
 * pre-auth realm and should feel identical.
 */
import { useState, type FC, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import cls from './LoginPage.module.css';
import { Button, Field, Icon, Input, Text } from '../components/atoms';
import { STRINGS } from '../domain/strings';
import { useAuth } from '../store/AuthContext';
import { useStores } from '../store/StoresContext';
import { useToast } from '../store/ToastContext';
import { toSessionUser, useUsers } from '../store/UsersContext';

interface FormState {
  storeName: string;
  city: string;
  phone: string;
  address: string;
  taxRate: string;
  currency: string;
  ownerName: string;
  ownerUsername: string;
  ownerPassword: string;
  ownerPasswordConfirm: string;
}

const initial: FormState = {
  storeName: '', city: '', phone: '', address: '',
  taxRate: '0.0825', currency: 'USD',
  ownerName: '', ownerUsername: '', ownerPassword: '', ownerPasswordConfirm: '',
};

export const SignupPage: FC = () => {
  const [form, setForm] = useState<FormState>(initial);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { create: createStore } = useStores();
  const { create: createUser, users } = useUsers();
  const { loginAs } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const set = <K extends keyof FormState,>(k: K, v: FormState[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (form.ownerPassword !== form.ownerPasswordConfirm) {
      setError('Passwords do not match.'); return;
    }
    if (form.ownerPassword.length < 8) {
      setError('Password must be at least 8 characters.'); return;
    }
    if (users.some((u) => u.username.toLowerCase() === form.ownerUsername.trim().toLowerCase())) {
      setError('That username is already taken — pick another.'); return;
    }
    const tax = Number(form.taxRate);
    if (!Number.isFinite(tax) || tax < 0) {
      setError('Tax rate must be a positive number (e.g. 0.18).'); return;
    }

    setSubmitting(true);
    const storeRes = await createStore({
      name: form.storeName, city: form.city, phone: form.phone,
      address: form.address, taxRate: tax, currency: form.currency,
    });
    if (!storeRes.ok) {
      setSubmitting(false);
      setError(storeRes.error === 'duplicateName'
        ? 'A tenant with that name already exists.'
        : 'Store details are invalid.');
      return;
    }

    const userRes = await createUser({
      name: form.ownerName,
      username: form.ownerUsername.trim(),
      password: form.ownerPassword,
      role: 'master',
      storeId: storeRes.store.id,
    });
    if (!userRes.ok) {
      setSubmitting(false);
      setError(userRes.error === 'duplicate'
        ? 'That username is already taken.'
        : 'Password must be at least 8 characters.');
      return;
    }

    loginAs(toSessionUser(userRes.user));
    toast.success(`Welcome to ${storeRes.store.name}!`);
    navigate('/cashier', { replace: true });
  };

  return (
    <div className={cls.loginPage}>
      <div className={[cls.loginCard, cls['loginCard--wide']].join(' ')}>
        <div className={cls.loginBrand}>
          <span className={cls.loginBrand__mark} aria-hidden="true">
            <Icon name="spark" size={24} />
          </span>
          <div className={cls.loginBrand__text}>
            <Text as="span" size="lg" weight="heavy">{STRINGS.brand.name}</Text>
            <Text as="span" size="xs" weight="semibold" tone="primary" upper>Cashier POS</Text>
          </div>
        </div>

        <div className={cls.signupIntro}>
          <Text as="h1" size="2xl" weight="heavy">Create your tenant</Text>
          <Text tone="subtle">
            Spin up a brand-new QuickBill workspace for your company. You'll be its
            Master and can invite cashiers once you're in.
          </Text>
        </div>

        <form onSubmit={handleSubmit} className={cls.loginForm} noValidate>
          {/* -------- Store details -------- */}
          <div className={cls.signupSection}>
            <Text weight="heavy" size="sm" upper tone="primary">Your store</Text>
            <Field label="Store name" htmlFor="s-name" required>
              <Input id="s-name" required value={form.storeName}
                     placeholder="e.g. Bright Bazaar Delhi"
                     onChange={(e) => set('storeName', e.target.value)} />
            </Field>
            <div className={cls.signupRow2}>
              <Field label="City" htmlFor="s-city">
                <Input id="s-city" value={form.city}
                       onChange={(e) => set('city', e.target.value)} />
              </Field>
              <Field label="Phone" htmlFor="s-phone">
                <Input id="s-phone" value={form.phone}
                       onChange={(e) => set('phone', e.target.value)} />
              </Field>
            </div>
            <Field label="Address" htmlFor="s-addr">
              <Input id="s-addr" value={form.address}
                     onChange={(e) => set('address', e.target.value)} />
            </Field>
            <div className={cls.signupRow2}>
              <Field label="Tax rate" htmlFor="s-tax" hint="Decimal, e.g. 0.18 = 18%">
                <Input id="s-tax" type="number" step="0.0001" min={0} required
                       value={form.taxRate}
                       onChange={(e) => set('taxRate', e.target.value)} />
              </Field>
              <Field label="Currency" htmlFor="s-cur">
                <Input id="s-cur" maxLength={3} required value={form.currency}
                       onChange={(e) => set('currency', e.target.value.toUpperCase())} />
              </Field>
            </div>
          </div>

          {/* -------- Master account -------- */}
          <div className={cls.signupSection}>
            <Text weight="heavy" size="sm" upper tone="primary">Master account</Text>
            <Field label="Full name" htmlFor="u-name" required>
              <Input id="u-name" required value={form.ownerName}
                     onChange={(e) => set('ownerName', e.target.value)} />
            </Field>
            <Field label="Username" htmlFor="u-user" required
                   hint="You'll sign in with this — must be unique across QuickBill.">
              <Input id="u-user" required autoComplete="username" value={form.ownerUsername}
                     onChange={(e) => set('ownerUsername', e.target.value)} />
            </Field>
            <div className={cls.signupRow2}>
              <Field label="Password" htmlFor="u-pass" required hint="Min. 8 characters.">
                <Input id="u-pass" type="password" required minLength={8}
                       autoComplete="new-password"
                       value={form.ownerPassword}
                       onChange={(e) => set('ownerPassword', e.target.value)} />
              </Field>
              <Field label="Confirm" htmlFor="u-pass2" required>
                <Input id="u-pass2" type="password" required minLength={8}
                       autoComplete="new-password"
                       value={form.ownerPasswordConfirm}
                       onChange={(e) => set('ownerPasswordConfirm', e.target.value)} />
              </Field>
            </div>
          </div>

          {error && (
            <div className={cls.authError} role="alert">
              <Icon name="lock" size={16} /> {error}
            </div>
          )}

          <div className={cls.loginActions}>
            <Button variant="primary" size="lg" type="submit" trailingIcon="arrow" block
                    disabled={submitting}>
              {submitting ? 'Creating…' : 'Create tenant & sign in'}
            </Button>
            <Text size="sm" tone="subtle" center>
              Already have an account? <Link to="/login" className={cls.authLink}>Sign in</Link>
            </Text>
          </div>
        </form>
      </div>
    </div>
  );
};
