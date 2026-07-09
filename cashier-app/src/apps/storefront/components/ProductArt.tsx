// ProductArt - the "hero" image tile shown on every product card + PDP.
// Luxury aesthetic: cream background with a subtle, oversized category glyph
// (like an editorial line-drawing) instead of loud pastel gradients.
import type { FC } from 'react';
import type { Product } from '@shared/domain/types';
import { Icon } from '@shared/atoms';
import { getProductMeta } from '../lib/productMeta';
import cls from '../storefront.module.css';

interface Props {
  product: Product;
  /** Icon size in px. Product cards use 100; PDP hero uses 180. */
  iconSize?: number;
  /** Show the discount text (top-left). */
  showDiscount?: boolean;
}

export const ProductArt: FC<Props> = ({ product, iconSize = 100, showDiscount = true }) => {
  const meta = getProductMeta(product);
  return (
    <div className={cls.productArt}>
      {showDiscount && meta.discountPct >= 10 && (
        <span className={cls.productArt__discount}>-{meta.discountPct}%</span>
      )}
      <div className={cls.productArt__iconWrap} aria-hidden="true">
        <Icon name={meta.icon} size={iconSize} />
      </div>
    </div>
  );
};
