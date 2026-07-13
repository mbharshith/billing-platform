// HomePage - delivery-app landing: trust strip, hero, category rail, sections.
import { useMemo, type FC } from 'react';
import { Link } from 'react-router-dom';
import { Icon, type IconName } from '@billing/ui/atoms';
import { useProducts } from '@billing/shared/store/ProductsContext';
import { useStorefrontTenant } from '../state/StorefrontTenantContext';
import { getTenantTheme } from '../lib/tenantTheme';
import { StorefrontProductCard } from '../components/StorefrontProductCard';
import { storeIdToSlug } from '@billing/shared/lib/resolveTenant';
import type { ProductCategory } from '@billing/shared/domain/types';
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
      {/* Hero */}
      <section className={cls.hero}>
        <div className={cls.hero__inner}>
          <div className={cls.hero__eyebrow}>Welcome to {tenant.name}</div>
          <h1 className={cls.hero__title}>
            {theme.tagline.split(',')[0]},<br />
            <em>{theme.tagline.split(',').slice(1).join(',').trim() || 'delivered.'}</em>
          </h1>
          <p className={cls.hero__sub}>
            Browse the full catalog, add to cart, and check out in seconds.
            Same order lands in the shop’s Sales Register in real time.
          </p>
          <div className={cls.hero__ctaRow}>
            <Link to={`/${slug}/browse`} className={cls.hero__cta}>
              Shop the catalog
            </Link>
            <Link to={`/${slug}/cart`} className={cls.hero__ctaGhost}>
              View cart
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
              <div className={cls.sectionHead__sub}>Find your next favourite</div>
            </div>
          </div>
          <div className={cls.categoryRail}>
            {stockedCategories.map((cat) => (
              <Link
                key={cat.id}
                to={`/${slug}/browse?category=${encodeURIComponent(cat.id)}`}
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
              <h2 className={cls.sectionHead__title}>Popular right now</h2>
              <div className={cls.sectionHead__sub}>Top sellers this season</div>
            </div>
            <Link to={`/${slug}/browse`} className={cls.sectionHead__link}>
              View all
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
              <h2 className={cls.sectionHead__title}>Latest additions</h2>
              <div className={cls.sectionHead__sub}>Just added to the catalog</div>
            </div>
            <Link to={`/${slug}/browse`} className={cls.sectionHead__link}>
              View all
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
