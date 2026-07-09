// OrderConfirmedPage - celebration screen with order # and next steps.
import { useMemo, type FC } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Icon } from '@shared/atoms';
import { CenteredMessage } from '@shared/templates';
import { useSales } from '@shared/store/SalesContext';
import { useStorefrontTenant } from '../state/StorefrontTenantContext';
import { useStorefrontMoney } from '../state/useStorefrontMoney';
import { getTenantTheme } from '../lib/tenantTheme';
import { storeIdToSlug } from '@shared/lib/resolveTenant';
import cls from '../storefront.module.css';

export const OrderConfirmedPage: FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const tenant = useStorefrontTenant();
  const { allSales } = useSales();
  const { money } = useStorefrontMoney();
  const theme = getTenantTheme(tenant.id);
  const slug = storeIdToSlug(tenant.id);

  const order = useMemo(
    () => allSales.find((s) => s.id === orderId),
    [allSales, orderId],
  );

  if (!order) return (
    <CenteredMessage
      icon="receipt" iconTone="muted"
      title="Order not found"
      body="This order doesn't exist or the link is broken."
      footer={<Link to={`/${slug}`} className={cls.hero__cta}>Back to shop</Link>}
    />
  );

  return (
    <div className={cls.confirmedCard}>
      <div className={cls.confirmedIcon}><Icon name="check" size={44} /></div>
      <h1 className={cls.confirmedTitle}>Order placed!</h1>
      <p className={cls.confirmedSub}>
        Thanks {order.customerName ?? 'friend'} — {tenant.name} is packing your order now.
        Delivery expected in {theme.deliveryEta}.
      </p>
      <div className={cls.confirmedOrderNo}>{order.invoiceNo}</div>
      <div className={cls.confirmedTotal}>{money(order.total)}</div>
      <div className={cls.confirmedActions}>
        <Link to={`/${slug}`} className={cls.hero__ctaGhost}
          style={{ color: 'var(--app-accent)', borderColor: 'var(--app-accent)' }}>
          Back to shop
        </Link>
        <Link to={`/${slug}/browse`} className={cls.hero__cta}>
          Shop more
        </Link>
      </div>
    </div>
  );
};
