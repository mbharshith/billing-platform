// StorefrontProductCard - Blinkit-style tile with in-card ADD button + rating,
// discount price, gradient hero art. Used by HomePage and BrowsePage; DRY.
import type { FC } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@billing/ui/atoms';
import type { Product } from '@billing/shared/domain/types';
import { useCart } from '../state/CartContext';
import { useStorefrontMoney } from '../state/useStorefrontMoney';
import { useStorefrontTenant } from '../state/StorefrontTenantContext';
import { storeIdToSlug } from '@billing/shared/lib/resolveTenant';
import { getProductMeta, formatReviewCount } from '../lib/productMeta';
import { ProductArt } from './ProductArt';
import cls from '../storefront.module.css';

interface Props {
  product: Product;
  /** Optional extra label shown under the name (e.g. "500g", "Pack of 6"). */
  meta?: string;
}

export const StorefrontProductCard: FC<Props> = ({ product, meta }) => {
  const { add, setQty, quantityOf } = useCart();
  const { money } = useStorefrontMoney();
  const tenant = useStorefrontTenant();
  const slug = storeIdToSlug(tenant.id);
  const inCart = quantityOf(product.id);
  const outOfStock = product.stock === 0;
  const productMeta = getProductMeta(product);

  return (
    <article className={cls.productCard}>
      {outOfStock && <span className={cls.productCard__oos}>Sold out</span>}
      <div className={cls.productCard__tile}>
        <div className={cls.productCard__monoWrap}>
          <ProductArt product={product} iconSize={110} />
        </div>
      </div>

      <Link to={`/${slug}/product/${product.id}`} className={cls.productCard__body}>
        <div className={cls.productCard__ratingRow}>
          <span className={cls.productCard__rating}>
            {'\u2605'} {productMeta.rating.toFixed(1)}
          </span>
          <span className={cls.productCard__ratingCount}>
            ({formatReviewCount(productMeta.reviewCount)})
          </span>
        </div>
        <div className={cls.productCard__name}>{product.name}</div>
        {meta && <div className={cls.productCard__meta}>{meta}</div>}
        <div className={cls.productCard__price}>
          <span>{money(product.price)}</span>
          {productMeta.discountPct >= 10 && (
            <span className={cls.productCard__priceOrig}>
              {money(productMeta.originalPrice)}
            </span>
          )}
        </div>
      </Link>

      {inCart === 0 ? (
        <button
          type="button"
          className={cls.productCard__addBtn}
          disabled={outOfStock}
          onClick={() => add(product.id)}
          aria-label={`Add ${product.name} to cart`}
        >
          {outOfStock ? 'Sold out' : 'Add to bag'}
        </button>
      ) : (
        <div className={cls.productCard__stepper} aria-label={`${product.name} quantity`}>
          <button
            type="button"
            className={cls.productCard__stepperBtn}
            onClick={() => setQty(product.id, inCart - 1)}
            aria-label="Decrease"
          >
            <Icon name="minus" size={14} />
          </button>
          <span className={cls.productCard__stepperCount}>{inCart} in bag</span>
          <button
            type="button"
            className={cls.productCard__stepperBtn}
            disabled={inCart >= product.stock}
            onClick={() => setQty(product.id, inCart + 1)}
            aria-label="Increase"
          >
            <Icon name="plus" size={14} />
          </button>
        </div>
      )}
    </article>
  );
};
