// StickyCartBar - floating bottom bar that appears whenever the cart has items.
// Zomato/Swiggy signature UX — keeps checkout one tap away no matter where
// the shopper is browsing.
import { useMemo, type FC } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Icon } from '@shared/atoms';
import { useCart, priceCart } from '../state/CartContext';
import { useProducts } from '@shared/store/ProductsContext';
import { useStorefrontTenant } from '../state/StorefrontTenantContext';
import { useStorefrontMoney } from '../state/useStorefrontMoney';
import { storeIdToSlug } from '@shared/lib/resolveTenant';
import cls from '../storefront.module.css';

// Hide the bar on pages where it would be redundant/annoying.
const HIDE_ON: readonly RegExp[] = [
  /\/cart$/,
  /\/checkout$/,
  /\/order\//,
];

export const StickyCartBar: FC = () => {
  const { lines, itemCount } = useCart();
  const { allProducts } = useProducts();
  const { money, taxRate } = useStorefrontMoney();
  const tenant = useStorefrontTenant();
  const { pathname } = useLocation();
  const slug = storeIdToSlug(tenant.id);

  const tenantProducts = useMemo(
    () => allProducts.filter((p) => p.storeId === tenant.id),
    [allProducts, tenant.id],
  );
  const priced = useMemo(
    () => priceCart(lines, tenantProducts, taxRate),
    [lines, tenantProducts, taxRate],
  );

  if (itemCount === 0) return null;
  if (HIDE_ON.some((re) => re.test(pathname))) return null;

  return (
    <Link to={`/${slug}/cart`} className={cls.stickyCartBar}>
      <Icon name="cart" size={22} />
      <div className={cls.stickyCartBar__info}>
        <div className={cls.stickyCartBar__count}>
          {itemCount} {itemCount === 1 ? 'item' : 'items'} in cart
        </div>
        <div className={cls.stickyCartBar__total}>{money(priced.total)}</div>
      </div>
      <span className={cls.stickyCartBar__cta}>
        View cart <Icon name="arrow" size={14} />
      </span>
    </Link>
  );
};
