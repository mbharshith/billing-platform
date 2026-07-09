// HomePage - delivery-app landing: trust strip, hero, category rail, sections.
import { useMemo, type FC } from 'react';
import { Link } from 'react-router-dom';
import { Icon, type IconName } from '@shared/atoms';
import { useProducts } from '@shared/store/ProductsContext';
import { useStorefrontTenant } from '../state/StorefrontTenantContext';
import { getTenantTheme } from '../lib/tenantTheme';
import { StorefrontProductCard } from '../components/StorefrontProductCard';
import { storeIdToSlug } from '@shared/lib/resolveTenant';
import type { ProductCategory } from '@shared/domain/types';
import cls from '../storefront.module.css';

// Delivery-friendly labels + distinct icons per category.
const CATEGORY_META: Record<ProductCategory, { label: string; icon: IconName }> = {
  Grocery:     { label: 'Grocery',     icon: 'store' },
  Produce:     { label: 'Fresh',       icon: 'spark' },
  Beverages:   { label: 'Drinks',      icon: 'coins' },
  Snacks:      { label: 'Snacks',      icon: 'bag' },
  Meat:        { label: 'Meat',        icon: 'chart' },
  Frozen:      { label: 'Frozen',      icon: 'zap' },
  Household:   { label: 'Home',        icon: 'shield' },
  Personal:    { label: 'Apparel',     icon: 'user' },
  Electronics: { label: 'Electronics', icon: 'card' },
  Other:       { label: 'Accessories', icon: 'spark' },
};

export const HomePage: FC = () => {
  const tenant = useStorefrontTenant();
  const { allProducts } = useProducts();
  const theme = getTenantTheme(tenant.id);
  const slug = storeIdToSlug(tenant.id);

  const tenantProducts = useMemo(
    () => allProducts.filter((p) => p.storeId === tenant.id && p.active),
    [allProducts, tenant.id],
  );

  const bestsellers = useMemo(
    () => [...tenantProducts].filter((p) => p.stock > 0)
      .sort((a, b) => b.price - a.price).slice(0, 8),
    [tenantProducts],
  );

  const newArrivals = useMemo(
    () => [...tenantProducts].filter((p) => p.stock > 0)
      .sort((a, b) => a.name.localeCompare(b.name)).slice(0, 8),
    [tenantProducts],
  );

  const stockedCategories = useMemo(
    () => [...new Set(tenantProducts.map((p) => p.category))]
      .map((id) => ({ id, ...CATEGORY_META[id] })),
    [tenantProducts],
  );

  return (
    <>
      {/* Trust strip */}
      <div className={cls.trustStrip}>
        <div className={cls.trustBadge}>
          <div className={cls.trustBadge__icon}><Icon name="zap" size={18} /></div>
          <div>
            <div className={cls.trustBadge__text}>{theme.deliveryEta}</div>
            <div className={cls.trustBadge__sub}>To your doorstep</div>
          </div>
        </div>
        <div className={cls.trustBadge}>
          <div className={cls.trustBadge__icon}><Icon name="shield" size={18} /></div>
          <div>
            <div className={cls.trustBadge__text}>100% authentic</div>
            <div className={cls.trustBadge__sub}>Direct from the store</div>
          </div>
        </div>
        <div className={cls.trustBadge}>
          <div className={cls.trustBadge__icon}><Icon name="cash" size={18} /></div>
          <div>
            <div className={cls.trustBadge__text}>Cash on delivery</div>
            <div className={cls.trustBadge__sub}>Or pay online</div>
          </div>
        </div>
        <div className={cls.trustBadge}>
          <div className={cls.trustBadge__icon}><Icon name="receipt" size={18} /></div>
          <div>
            <div className={cls.trustBadge__text}>Easy returns</div>
            <div className={cls.trustBadge__sub}>Within 7 days</div>
          </div>
        </div>
      </div>

      {/* Hero */}
      <section className={cls.hero}>
        <div className={cls.hero__inner}>
          <div className={cls.hero__eyebrow}>{theme.tagline}</div>
          <h1 className={cls.hero__title}>Get everything you need. Fast.</h1>
          <p className={cls.hero__sub}>
            {tenant.name} online — browse thousands of items, checkout in seconds,
            and get it delivered in {theme.deliveryEta.toLowerCase()}.
          </p>
          <div className={cls.hero__ctaRow}>
            <Link to={`/shop/${slug}/browse`} className={cls.hero__cta}>
              <Icon name="bag" size={16} /> Start shopping
            </Link>
            <Link to={`/shop/${slug}/track`} className={cls.hero__ctaGhost}>
              <Icon name="receipt" size={16} /> Track my order
            </Link>
          </div>
        </div>
      </section>

      {/* Category rail */}
      {stockedCategories.length > 0 && (
        <div className={cls.section}>
          <div className={cls.sectionHead}>
            <div>
              <h2 className={cls.sectionHead__title}>Shop by category</h2>
              <div className={cls.sectionHead__sub}>Find exactly what you're after</div>
            </div>
          </div>
          <div className={cls.categoryRail}>
            {stockedCategories.map((cat) => (
              <Link
                key={cat.id}
                to={`/shop/${slug}/browse?category=${encodeURIComponent(cat.id)}`}
                className={cls.categoryTile}
              >
                <div className={cls.categoryTile__icon}><Icon name={cat.icon} size={26} /></div>
                <div className={cls.categoryTile__label}>{cat.label}</div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Bestsellers */}
      {bestsellers.length > 0 && (
        <div className={cls.section}>
          <div className={cls.sectionHead}>
            <div>
              <h2 className={cls.sectionHead__title}>Bestsellers</h2>
              <div className={cls.sectionHead__sub}>What everyone's adding to cart</div>
            </div>
            <Link to={`/shop/${slug}/browse`} className={cls.sectionHead__link}>
              See all <Icon name="arrow" size={12} />
            </Link>
          </div>
          <div className={cls.productGrid}>
            {bestsellers.map((p) => <StorefrontProductCard key={p.id} product={p} />)}
          </div>
        </div>
      )}

      {/* New arrivals */}
      {newArrivals.length > 0 && (
        <div className={cls.section}>
          <div className={cls.sectionHead}>
            <div>
              <h2 className={cls.sectionHead__title}>Fresh picks</h2>
              <div className={cls.sectionHead__sub}>Just added to the shelf</div>
            </div>
            <Link to={`/shop/${slug}/browse`} className={cls.sectionHead__link}>
              See all <Icon name="arrow" size={12} />
            </Link>
          </div>
          <div className={cls.productGrid}>
            {newArrivals.map((p) => <StorefrontProductCard key={p.id} product={p} />)}
          </div>
        </div>
      )}
    </>
  );
};
