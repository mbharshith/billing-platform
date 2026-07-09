// ProductPage - rich detail: gradient hero art, rating strip, discount pricing,
// delivery date, offers, description, similar products.
import { useMemo, useState, type FC } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Icon } from '@shared/atoms';
import { CenteredMessage } from '@shared/templates';
import { useProducts } from '@shared/store/ProductsContext';
import { useStorefrontTenant } from '../state/StorefrontTenantContext';
import { useStorefrontMoney } from '../state/useStorefrontMoney';
import { useCart } from '../state/CartContext';
import { getTenantTheme } from '../lib/tenantTheme';
import { getProductMeta, formatReviewCount, friendlyDelivery } from '../lib/productMeta';
import { ProductArt } from '../components/ProductArt';
import { StorefrontProductCard } from '../components/StorefrontProductCard';
import { storeIdToSlug } from '@shared/lib/resolveTenant';
import cls from '../storefront.module.css';

/**
 * Short "spec" paragraph synthesized from the product's category + name.
 * Cheap way to look like a real ecommerce PDP without a description column
 * in the domain model.
 */
function makeDescription(name: string, category: string): string {
  const templates: Record<string, string> = {
    Personal:    `Premium quality ${name.toLowerCase()} tailored for everyday comfort. Soft-hand finish, breathable fabric, and a clean silhouette. Perfect for work, evenings out, or weekend errands.`,
    Other:       `A must-have ${name.toLowerCase()} that pairs with virtually anything in your wardrobe. Durable construction, considered detailing, and a design that lasts beyond the season.`,
    Electronics: `Feature-rich ${name.toLowerCase()} engineered for daily use. Reliable performance, thoughtful ergonomics, and a modern finish. Comes with manufacturer warranty.`,
    Grocery:     `Everyday essential ${name.toLowerCase()}, sourced fresh and delivered to your door. Ideal pantry staple - always in stock, always in season.`,
    Produce:     `Farm-fresh ${name.toLowerCase()}, hand-picked and delivered same-day. Locally sourced whenever possible for maximum freshness.`,
    Beverages:   `Chilled, ready-to-drink ${name.toLowerCase()}. Perfect for a quick refresher or a family gathering. Order for cold delivery.`,
    Snacks:      `Crunchy, satisfying ${name.toLowerCase()} for anytime cravings. Bulk-pack ready, individually sealed for freshness.`,
    Meat:        `Fresh-cut ${name.toLowerCase()}, hygienically packed and delivered chilled. Sourced from certified suppliers.`,
    Frozen:      `Frozen at peak freshness. Just heat and serve - ${name.toLowerCase()} makes weeknight meals effortless.`,
    Household:   `Practical household ${name.toLowerCase()} that gets the job done. Value pack size, gentle on surfaces.`,
  };
  return templates[category] ?? `Quality ${name.toLowerCase()} delivered to your door.`;
}

export const ProductPage: FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const tenant = useStorefrontTenant();
  const { allProducts } = useProducts();
  const { money } = useStorefrontMoney();
  const { add, quantityOf } = useCart();
  const navigate = useNavigate();
  const theme = getTenantTheme(tenant.id);
  const slug = storeIdToSlug(tenant.id);
  const [qty, setQty] = useState(1);

  const product = useMemo(
    () => allProducts.find((p) => p.id === productId && p.storeId === tenant.id && p.active),
    [allProducts, productId, tenant.id],
  );

  const similar = useMemo(() => {
    if (!product) return [];
    return allProducts
      .filter((p) => p.storeId === tenant.id && p.active && p.id !== product.id
        && p.category === product.category)
      .slice(0, 6);
  }, [allProducts, product, tenant.id]);

  if (!product) return (
    <CenteredMessage
      icon="bag" iconTone="muted"
      title="Product not found"
      body="This item may have been removed from the catalog."
      footer={<Link to={`/shop/${slug}/browse`} className={cls.hero__cta}>Back to browse</Link>}
    />
  );

  const meta = getProductMeta(product);
  const inCart = quantityOf(product.id);
  const savings = meta.originalPrice - product.price;
  const stockLabel = product.stock === 0
    ? { text: 'Out of stock', klass: cls.pdpStockOut }
    : product.stock <= 5
      ? { text: `Only ${product.stock} left - hurry!`, klass: cls.pdpStockLow }
      : { text: 'In stock', klass: cls.pdpStockOk };

  const handleAdd = () => {
    add(product.id, qty);
    navigate(`/shop/${slug}/cart`);
  };

  const description = makeDescription(product.name, product.category);
  const deliveryDate = friendlyDelivery(theme.deliveryEta);
  const couponCode = tenant.name.split(' ')[0]!.toUpperCase().slice(0, 6) + '10';

  return (
    <>
      <Link to={`/shop/${slug}/browse`} className={cls.pageBackLink}>
        <Icon name="arrow" size={14} flipX /> Back to browse
      </Link>

      <div className={cls.pdpLayout}>
        <div className={cls.pdpImage}>
          <ProductArt product={product} iconSize={120} />
        </div>

        <div className={cls.pdpDetails}>
          <div className={cls.pdpCategory}>{product.category}</div>
          <h1 className={cls.pdpTitle}>{product.name}</h1>

          <div className={cls.pdpRatingRow}>
            <span className={cls.pdpRating}>
              {'\u2605'} {meta.rating.toFixed(1)}
            </span>
            <span className={cls.pdpRatingCount}>
              {formatReviewCount(meta.reviewCount)} client reviews
            </span>
            <span className={cls.pdpDot}></span>
            <span className={cls.pdpSku}>Ref. {product.sku}</span>
          </div>

          <div className={cls.pdpPriceRow}>
            <span className={cls.pdpPrice}>{money(product.price)}</span>
            {meta.discountPct >= 10 && (
              <>
                <span className={cls.pdpPriceOrig}>{money(meta.originalPrice)}</span>
                <span className={cls.pdpDiscount}>-{meta.discountPct}%</span>
              </>
            )}
          </div>
          <div className={cls.pdpTax}>Duties &amp; taxes included</div>
          {savings > 0 && (
            <div className={cls.pdpSavings}>
              You save {money(savings)}
            </div>
          )}

          <div className={cls.pdpDeliveryCard}>
            <div className={cls.pdpDeliveryCard__icon}><Icon name="zap" size={20} /></div>
            <div>
              <div className={cls.pdpDeliveryCard__title}>Complimentary delivery by {deliveryDate}</div>
              <div className={cls.pdpDeliveryCard__sub}>Sent with care to {tenant.city}</div>
            </div>
          </div>

          <div className={cls.pdpCoupon}>
            <div className={cls.pdpCoupon__body}>
              <div className={cls.pdpCoupon__title}>Enjoy an additional 10% with <strong>{couponCode}</strong> at checkout</div>
            </div>
          </div>

          <div className={stockLabel.klass}>
            {stockLabel.text}
          </div>

          {product.stock > 0 && (
            <>
              <div className={cls.pdpQtyRow}>
                <span className={cls.pdpQtyLabel}>Quantity</span>
                <div className={cls.pdpStepper}>
                  <button type="button" className={cls.pdpStepperBtn}
                    onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease">
                    <Icon name="minus" size={16} />
                  </button>
                  <span className={cls.pdpStepperCount}>{qty}</span>
                  <button type="button" className={cls.pdpStepperBtn}
                    disabled={qty + inCart >= product.stock}
                    onClick={() => setQty((q) => q + 1)} aria-label="Increase">
                    <Icon name="plus" size={16} />
                  </button>
                </div>
                {inCart > 0 && (
                  <span className={cls.pdpQtyLabel}>({inCart} already in bag)</span>
                )}
              </div>

              <button type="button" className={cls.pdpAddBtn} onClick={handleAdd}>
                Add to bag {'\u2014'} {money(product.price * qty)}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Description */}
      <div className={cls.section}>
        <div className={cls.sectionHead}>
          <h2 className={cls.sectionHead__title}>About this item</h2>
        </div>
        <div className={cls.pdpDescription}>{description}</div>
      </div>

      {/* Similar products */}
      {similar.length > 0 && (
        <div className={cls.section}>
          <div className={cls.sectionHead}>
            <div>
              <h2 className={cls.sectionHead__title}>You may also like</h2>
              <div className={cls.sectionHead__sub}>More from {product.category}</div>
            </div>
            <Link to={`/shop/${slug}/browse?category=${encodeURIComponent(product.category)}`}
              className={cls.sectionHead__link}>
              See all <Icon name="arrow" size={12} />
            </Link>
          </div>
          <div className={cls.productGrid}>
            {similar.map((p) => <StorefrontProductCard key={p.id} product={p} />)}
          </div>
        </div>
      )}
    </>
  );
};
