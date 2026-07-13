// Error surfaces: <ErrorBoundary> for render throws, <AppSplash> for boot,
// NotFoundPage for unmatched routes. Everything else is inline (toasts + field errors).
import { Component, useEffect, useState, type FC, type ReactNode, type ErrorInfo } from 'react';
import { useNavigate } from 'react-router-dom';
import cls from './errors.module.css';
import { Button, Icon, Text } from '../atoms';
import { STRINGS } from '@billing/shared/domain/strings';

// ErrorBoundary
interface BoundaryProps {
  children: ReactNode;
  // Optional label so we can distinguish nested boundaries in logs.
  label?: string;
  // Optional custom fallback renderer. Receives error + reset callback.
  fallback?: (error: Error, reset: () => void) => ReactNode;
}
interface BoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console -- forward to Sentry once wired.
    console.error(
      `[ErrorBoundary${this.props.label ? `:${this.props.label}` : ''}]`,
      error,
      info.componentStack,
    );
  }

  reset = (): void => this.setState({ error: null });

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) return this.props.fallback(error, this.reset);

    return <BoundaryFallback onReset={this.reset} />;
  }
}

const BoundaryFallback: FC<{ onReset: () => void }> = ({ onReset }) => (
  <div className={cls.card} role="alert">
    <span className={cls.iconWrap} aria-hidden="true">
      <Icon name="shield" size={40} />
    </span>
    <Text as="h1" size="xl" weight="heavy">{STRINGS.errors.boundaryTitle}</Text>
    <Text tone="subtle" center>{STRINGS.errors.boundaryHint}</Text>

    <div className={cls.actions}>
      <Button variant="primary" leadingIcon="zap" onClick={onReset}>
        {STRINGS.errors.tryAgain}
      </Button>
      <Button variant="secondary" leadingIcon="arrow" onClick={() => { window.location.href = '/'; }}>
        {STRINGS.errors.goHome}
      </Button>
      <Button variant="ghost" onClick={() => window.location.reload()}>
        {STRINGS.errors.reload}
      </Button>
    </div>
  </div>
);

// AppSplash — boot + boot-failed screen
interface SplashProps {
  state: 'loading' | 'failed';
  onRetry?: () => void;
}

export const AppSplash: FC<SplashProps> = ({ state, onRetry }) => {
  // Only paint the loader once we've been mounted for ≥250ms. Under normal Dexie hydration boot is < 100ms and users should see nothing.
  const [visible, setVisible] = useState(state === 'failed');
  useEffect(() => {
    if (state === 'failed') { setVisible(true); return; }
    const t = window.setTimeout(() => setVisible(true), 250);
    return () => window.clearTimeout(t);
  }, [state]);

  if (!visible) return null;

  return (
    <div className={cls.splash}>
      <div className={cls.splashCard}>
        <span className={cls.brandMark} aria-hidden="true"><Icon name="spark" size={26} /></span>
        <Text size="xl" weight="heavy">{STRINGS.brand.name}</Text>

        {state === 'loading' ? (
          <>
            <div className={cls.spinner} aria-hidden="true" />
            <Text tone="subtle">{STRINGS.errors.bootLoading}</Text>
          </>
        ) : (
          <>
            <Text as="h2" size="lg" weight="bold">{STRINGS.errors.bootFailedTitle}</Text>
            <Text tone="subtle" center>{STRINGS.errors.bootFailedHint}</Text>
            <div className={cls.actions}>
              <Button variant="primary" leadingIcon="zap" onClick={onRetry ?? (() => window.location.reload())}>
                {STRINGS.errors.bootRetry}
              </Button>
              <Button variant="ghost" onClick={() => window.location.reload()}>
                {STRINGS.errors.reload}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// NotFoundPage
export const NotFoundPage: FC = () => {
  const navigate = useNavigate();
  return (
    <div className={cls.card} role="alert">
      <span className={cls.iconWrap} aria-hidden="true">
        <Icon name="shield" size={40} />
      </span>
      <Text as="h1" size="xl" weight="heavy">{STRINGS.errors.notFoundTitle}</Text>
      <Text tone="subtle" center>{STRINGS.errors.notFoundHint}</Text>
      <div className={cls.actions}>
        <Button variant="primary" leadingIcon="arrow" onClick={() => navigate('/')}>
          {STRINGS.errors.backToCashier}
        </Button>
      </div>
    </div>
  );
};
