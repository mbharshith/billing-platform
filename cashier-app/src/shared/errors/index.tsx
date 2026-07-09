/**
 * Error surfaces — the pages/cards we show when things go sideways.
 *
 * There are three completely separate failure modes and each gets its
 * own visual treatment so users always know what to do:
 *
 *   1) <ErrorBoundary>   React render/lifecycle throw → in-place fallback
 *                        card + "Try again" that resets the boundary's key.
 *   2) <AppSplash>       Boot is still running or bootstrapDb() rejected.
 *                        Full-screen splash with an optional retry button.
 *   3) NotFoundPage      Router matched no route → friendly 404 with a link
 *                        back to the cashier.
 *
 * Everything else (validation, forbidden, not-found records) is handled
 * inline by the individual pages via inline error text or toasts.
 */
import { Component, useEffect, useState, type FC, type ReactNode, type ErrorInfo } from 'react';
import { useNavigate } from 'react-router-dom';
import cls from './errors.module.css';
import { Button, Icon, Text } from '../atoms';
import { STRINGS } from '@shared/domain/strings';

/* ------------------------------------------------------------------------- */
/* ErrorBoundary                                                             */
/* ------------------------------------------------------------------------- */
interface BoundaryProps {
  children: ReactNode;
  /** Optional label so we can distinguish nested boundaries in logs. */
  label?: string;
  /** Optional custom fallback renderer. Receives error + reset callback. */
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
    // Log loudly to the console. When Sentry (or equivalent) is wired in,
    // forward `error` and `info.componentStack` there before this line.
    // eslint-disable-next-line no-console
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

    return <BoundaryFallback error={error} onReset={this.reset} />;
  }
}

const BoundaryFallback: FC<{ error: Error; onReset: () => void }> = ({ error, onReset }) => (
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
      <Button variant="secondary" leadingIcon="arrow" onClick={() => { window.location.href = '/cashier'; }}>
        {STRINGS.errors.goHome}
      </Button>
      <Button variant="ghost" onClick={() => window.location.reload()}>
        {STRINGS.errors.reload}
      </Button>
    </div>

    {import.meta.env.DEV && (
      <details className={cls.details}>
        <summary>{STRINGS.errors.technicalDetails}</summary>
        <pre className={cls.pre}>{error.stack ?? error.message}</pre>
      </details>
    )}
  </div>
);

/* ------------------------------------------------------------------------- */
/* AppSplash — boot + boot-failed screen                                     */
/* ------------------------------------------------------------------------- */
interface SplashProps {
  state: 'loading' | 'failed';
  onRetry?: () => void;
}

export const AppSplash: FC<SplashProps> = ({ state, onRetry }) => {
  /* Only paint the loader once we've been mounted for ≥250ms. Under
     normal Dexie hydration boot is < 100ms and users should see nothing. */
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

/* ------------------------------------------------------------------------- */
/* NotFoundPage                                                              */
/* ------------------------------------------------------------------------- */
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
        <Button variant="primary" leadingIcon="arrow" onClick={() => navigate('/cashier')}>
          {STRINGS.errors.backToCashier}
        </Button>
      </div>
    </div>
  );
};
