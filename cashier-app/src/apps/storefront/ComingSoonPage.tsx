/**
 * ComingSoonPage — placeholder for the customer-facing storefront.
 * Replaces itself with a real catalog/cart/checkout in Phase 1 of PLAN_V2.
 * Kept intentionally dependency-light so the storefront chunk stays under
 * budget while the pivot code lands.
 */
import type { FC } from 'react';
import { BRAND } from '@shared/brand';
import { Text, Icon } from '@shared/atoms';

interface Props { tenantSlug: string; }

export const ComingSoonPage: FC<Props> = ({ tenantSlug }) => (
  <main
    style={{
      minHeight: '100vh',
      display: 'grid',
      placeItems: 'center',
      padding: 'var(--app-space-8)',
      background: 'var(--app-bg)',
    }}
  >
    <div
      style={{
        maxWidth: 480,
        textAlign: 'center',
        display: 'grid',
        gap: 'var(--app-space-4)',
        padding: 'var(--app-space-8)',
        background: 'var(--app-surface)',
        borderRadius: 'var(--app-radius-lg)',
        boxShadow: 'var(--app-shadow-md)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Icon name="spark" size={48} style={{ color: 'var(--app-primary)' }} />
      </div>
      <Text as="h1" size="2xl" weight="heavy">{BRAND.name} Shop</Text>
      <Text tone="subtle">
        The customer storefront for <strong>{tenantSlug}</strong> is being built.
        Come back soon to browse the catalog, place delivery orders, and track
        your basket in real time.
      </Text>
      <Text size="xs" tone="muted">
        Meanwhile, the shop still takes walk-in orders at the counter.
      </Text>
    </div>
  </main>
);
