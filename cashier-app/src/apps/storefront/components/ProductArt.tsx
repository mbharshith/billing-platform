// ProductArt - the "hero" image tile shown on every product card + PDP.
// Since QuickBill has no real product images, we render a rich gradient with
// a large category icon overlay. Feels like Blinkit/Zomato placeholder art,
// not a school project.
import type { CSSProperties, FC } from 'react';
import type { Product } from '@shared/domain/types';
import { Icon } from '@shared/atoms';
import { getProductMeta } from '../lib/productMeta';
import cls from '../storefront.module.css';

interface Props {
  product: Product;
  /** Icon size in px. Product cards use 56; PDP hero uses 120. */
  iconSize?: number;
  /** Show the "X% OFF" badge (top-left). */
  showDiscount?: boolean;
}

export const ProductArt: FC<Props> = ({ product, iconSize = 56, showDiscount = true }) => {
  const meta = getProductMeta(product);
  const style: CSSProperties = {
    background: `linear-gradient(135deg, ${meta.gradientFrom} 0%, ${meta.gradientTo} 100%)`,
    color: meta.onGradient,
  };
  return (
    <div className={cls.productArt} style={style}>
      {showDiscount && meta.discountPct >= 10 && (
        <span className={cls.productArt__discount}>{meta.discountPct}% OFF</span>
      )}
      <div className={cls.productArt__iconWrap} aria-hidden="true">
        <Icon name={meta.icon} size={iconSize} />
      </div>
    </div>
  );
};
