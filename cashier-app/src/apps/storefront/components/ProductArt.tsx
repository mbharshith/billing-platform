// ProductArt - the "hero" image tile shown on every product card + PDP.
//
// If the product has a real photo (Unsplash URL, uploaded image, whatever
// lives on product.image), we render the photo. Otherwise we fall back to
// the editorial line-drawing icon that matches the product's category -
// so the storefront never has a broken image, but also never wastes a
// perfectly good product photo on a generic glyph.
import { useState } from 'react';
import type { FC } from 'react';
import type { Product } from '@shared/domain/types';
import { Icon } from '@shared/atoms';
import { getProductMeta } from '../lib/productMeta';
import cls from '../storefront.module.css';

interface Props {
  product: Product;
  /** Icon size in px. Only used when we fall back to the glyph. */
  iconSize?: number;
  /** Show the discount text (top-left). */
  showDiscount?: boolean;
}

export const ProductArt: FC<Props> = ({ product, iconSize = 100, showDiscount = true }) => {
  const meta = getProductMeta(product);

  // If the URL 404s or is CORS-blocked we degrade to the icon fallback,
  // not a broken image icon. Single boolean, single re-render.
  const [imgFailed, setImgFailed] = useState(false);
  const hasImage = Boolean(product.image) && !imgFailed;

  return (
    <div className={cls.productArt}>
      {showDiscount && meta.discountPct >= 10 && (
        <span className={cls.productArt__discount}>-{meta.discountPct}%</span>
      )}

      {hasImage ? (
        <img
          className={cls.productArt__img}
          src={product.image}
          alt={product.name}
          loading="lazy"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <div className={cls.productArt__iconWrap} aria-hidden="true">
          <Icon name={meta.icon} size={iconSize} />
        </div>
      )}
    </div>
  );
};
