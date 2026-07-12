// ComingSoonPage - placeholder for the customer-facing storefront.
// Replaced with a real catalog/cart/checkout in Phase 1 of PLAN_V2.
import type { FC } from 'react';
import { BRAND } from '@billing/shared/brand';
import { Text } from '@billing/ui/atoms';
import { CenteredMessage } from '@billing/ui/templates';

interface Props { tenantSlug: string; }

export const ComingSoonPage: FC<Props> = ({ tenantSlug }) => (
  <CenteredMessage
    full
    icon="spark"
    iconTone="primary"
    title={`${BRAND.name} Shop`}
    body={
      <>
        <Text tone="subtle">
          The customer storefront for <strong>{tenantSlug}</strong> is being built.
          Come back soon to browse the catalog, place delivery orders, and track
          your basket in real time.
        </Text>
        <Text size="xs" tone="muted">
          Meanwhile, the shop still takes walk-in orders at the counter.
        </Text>
      </>
    }
  />
);
