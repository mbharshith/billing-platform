/**
 * LoginPage — full-screen sign-in card.
 * Uses AuthContext. Redirects to /cashier (or the intended path) on success.
 */
import { useState, type FC, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import cls from './LoginPage.module.css';
import { Button, Field, Icon, Input, Text } from '../components/atoms';
import { STRINGS } from '../domain/strings';
import { useAuth } from '../store/AuthContext';
import { useToast } from '../store/ToastContext';

interface LocationState { from?: string }

export const LoginPage: FC = () => {
  const { currentUser, login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Already signed in? Bounce vendors to their console, everyone else to cashier.
  if (currentUser) {
    return <Navigate to={currentUser.role === 'vendor' ? '/vendor/dashboard' : '/cashier'} replace />;
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError(STRINGS.auth.invalid);
      return;
    }
    setSubmitting(true);
    setError(null);
    window.setTimeout(async () => {
      const result = await login(username, password);
      if (!result.ok) {
        setSubmitting(false);
        setError(
          result.reason === 'inactive'  ? STRINGS.auth.inactive :
          result.reason === 'suspended' ? STRINGS.auth.suspended :
                                          STRINGS.auth.invalid,
        );
        return;
      }
      toast.success(STRINGS.auth.welcome(username));
      // Vendor accounts land on the vendor console; everyone else on cashier.
      const fallback = result.user.role === 'vendor' ? '/vendor/dashboard' : '/cashier';
      const dest = (location.state as LocationState | null)?.from ?? fallback;
      navigate(dest, { replace: true });
    }, 350);
  };

  return (
    <div className={cls.loginPage}>
      <div className={cls.loginCard}>
        <div className={cls.loginBrand}>
          <span className={cls.loginBrand__mark}><Icon name="spark" size={26} /></span>
          <div className={cls.loginBrand__text}>
            <Text size="xl" weight="heavy">{STRINGS.brand.name}</Text>
            <Text size="xs" weight="semibold" tone="primary" upper>Cashier POS</Text>
          </div>
        </div>

        <div>
          <Text as="h1" size="2xl" weight="heavy">{STRINGS.auth.loginTitle}</Text>
          <Text tone="subtle">{STRINGS.auth.loginSubtitle}</Text>
        </div>

        <form className={cls.loginForm} onSubmit={handleSubmit}>
          <Field label={STRINGS.auth.username} htmlFor="login-username" required>
            <Input
              id="login-username"
              autoComplete="username"
              autoFocus
              leadingIcon="user"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={submitting}
              required
            />
          </Field>
          <Field label={STRINGS.auth.password} htmlFor="login-password" required
                 error={error ?? undefined}>
            <Input
              id="login-password"
              type="password"
              autoComplete="current-password"
              leadingIcon="lock"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              invalid={error !== null}
              required
            />
          </Field>

          <div className={cls.loginActions}>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={submitting}
              trailingIcon={submitting ? undefined : 'arrow'}
              block
            >
              {submitting ? STRINGS.auth.signingIn : STRINGS.auth.signIn}
            </Button>
            <div className={cls.loginHint}>{STRINGS.auth.demoHint}</div>
            <div className={cls.loginHint} style={{ textAlign: 'center' }}>
              New here? <Link to="/signup" className={cls.authLink}>Create your tenant</Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
