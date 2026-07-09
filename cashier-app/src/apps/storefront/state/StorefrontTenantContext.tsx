// StorefrontTenantContext - resolves the tenant for a customer-facing shop request.
// Reads the :tenantSlug URL param (path-based today, subdomain later) and hands
// the resolved Store to every storefront page. Renders a "not found" state when
// the slug matches nothing (never leak that a slug is unclaimed via a 302).
import { createContext, useContext, useEffect, useState, type FC, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { AppSplash } from '@shared/errors';
import { CenteredMessage } from '@shared/templates';
import { resolveTenant } from '@shared/lib/resolveTenant';
import type { Store } from '@shared/domain/types';

interface StorefrontTenantContextValue {
  readonly tenant: Store;
}

const Ctx = createContext<StorefrontTenantContextValue | null>(null);

export const StorefrontTenantProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const [state, setState] = useState<
    | { kind: 'loading' }
    | { kind: 'ready';    tenant: Store }
    | { kind: 'notFound' }
  >({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const tenant = await resolveTenant(tenantSlug, window.location.hostname);
      if (cancelled) return;
      setState(tenant ? { kind: 'ready', tenant } : { kind: 'notFound' });
    })();
    return () => { cancelled = true; };
  }, [tenantSlug]);

  if (state.kind === 'loading') return <AppSplash state="loading" onRetry={() => window.location.reload()} />;
  if (state.kind === 'notFound') return (
    <CenteredMessage
      full
      icon="store"
      iconTone="muted"
      title="Shop not found"
      body={`We couldn't find a shop called "${tenantSlug ?? 'unknown'}". Check the link and try again.`}
    />
  );
  return <Ctx.Provider value={{ tenant: state.tenant }}>{children}</Ctx.Provider>;
};

export const useStorefrontTenant = (): Store => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useStorefrontTenant must be used within <StorefrontTenantProvider>');
  return ctx.tenant;
};
