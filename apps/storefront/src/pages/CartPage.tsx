// CartPage - Zomato/Swiggy-style review with delivery ETA badge + savings hint.
import { useMemo, type FC } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@billing/ui/atoms';
import { ProductBadge } from '@billing/ui/molecules';
import { CenteredMessage } from '@billing/ui/templates';
import { useProducts } from '@billing/shared/store/ProductsContext';
import { useStorefrontTenant } from '../state/StorefrontTenantContext';
import { useStorefrontMoney } from '../state/useStorefrontMoney';
import { useCart, priceCart } from '../state/CartContext';
import { getTenantTheme } from '../lib/tenantTheme';
import { storeIdToSlug } from '@billing/shared/lib/resolveTenant';
import cls from '../storefront.module.css';

export const CartPage: FC = () => {
  const tenant = useStorefrontTenant();
  const { allProducts } = useProducts();
  const { money, taxRate } = useStorefrontMoney();
  const { lines, setQty, remove } = useCart();
  const theme = getTenantTheme(tenant.id);
  const slug = storeIdToSlug(tenant.id);

  const tenantProducts = useMemo(
    () => allProducts.filter((p) => p.storeId === tenant.id),
    [allProducts, tenant.id],
  );
  const priced = useMemo(
    () => priceCart(lines, tenantProducts, taxRate),
    [lines, tenantProducts, taxRate],
  );

  if (priced.lines.length === 0) return (
    <CenteredMessage
      icon="cart" iconTone="muted"
      title="Your cart is empty"
      body="Add some products first and they'll show up here."
      footer={<Link to={`/${slug}/browse`} className={cls.hero__cta}>Start shopping</Link>}
    />
  );

  return (
    <>
      <Link to={`/${slug}/browse`} className={cls.pageBackLink}>
        <Icon name="arrow" size={14} flipX /> Continue shopping
      </Link>

      <div className={cls.sectionHead}>
        <div>
          <h1 className={cls.sectionHead__title}>Your cart</h1>
          <div className={cls.sectionHead__sub}>
            {priced.unitCount} {priced.unitCount === 1 ? 'item' : 'items'} · arriving in {theme.deliveryEta}
          </div>
        </div>
      </div>

      <div className={cls.cartLayout}>
        <div>
          <div className={cls.cartCard}>
            <div className={cls.cartCard__head}>
              <Icon name="bag" size={16} /> Items ({priced.lines.length})
              <span className={cls.cartCard__eta}>
                <Icon name="zap" size={11} /> {theme.deliveryEta}
              </span>
            </div>
            {priced.lines.map((l) => (
              <div key={l.product.id} className={cls.cartLine}>
                <ProductBadge name={l.product.name} tone={l.product.tone} size="sm" />
                <div className={cls.cartLine__info}>
                  <div className={cls.cartLine__name}>{l.product.name}</div>
                  <div className={cls.cartLine__meta}>{money(l.product.price)} each</div>
                </div>
                <div className={cls.cartLine__actions}>
                  <div className={cls.cartLine__stepper}>
                    <button
                      type="button"
                      className={cls.cartLine__stepBtn}
                      onClick={() => (l.quantity === 1 ? remove(l.product.id) : setQty(l.product.id, l.quantity - 1))}
                      aria-label={l.quantity === 1 ? 'Remove' : 'Decrease'}
                    >
                      {l.quantity === 1
                        ? <Icon name="trash" size={13} />
                        : <Icon name="minus" size={13} />}
                    </button>
                    <span className={cls.cartLine__stepN}>{l.quantity}</span>
                    <button
                      type="button"
                      className={cls.cartLine__stepBtn}
                      disabled={l.quantity >= l.product.stock}
                      onClick={() => setQty(l.product.id, l.quantity + 1)}
                      aria-label="Increase"
                    >
                      <Icon name="plus" size={13} />
                    </button>
                  </div>
                  <div className={cls.cartLine__total}>{money(l.lineTotal)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className={cls.summaryCard} aria-label="Order summary">
          <h2 className={cls.summaryCard__title}>Bill details</h2>
          <div className={cls.summaryRow}>
            <span>Item total</span>
            <span>{money(priced.subtotal)}</span>
          </div>
          <div className={cls.summaryRow}>
            <span>Tax & fees</span>
            <span>{money(priced.tax)}</span>
          </div>
          <div className={`${cls.summaryRow} ${cls['summaryRow--free']}`}>
            <span>Delivery</span>
            <span>FREE</span>
          </div>
          <div className={`${cls.summaryRow} ${cls['summaryRow--total']}`}>
            <span>To pay</span>
            <span>{money(priced.total)}</span>
          </div>
          <div className={cls.summarySavings}>
            <Icon name="spark" size={12} /> You saved delivery charges
          </div>
          <Link to={`/${slug}/checkout`} className={cls.summaryCta}>
            Proceed to checkout <Icon name="arrow" size={16} />
          </Link>
        </aside>
      </div>
    </>
  );
};
