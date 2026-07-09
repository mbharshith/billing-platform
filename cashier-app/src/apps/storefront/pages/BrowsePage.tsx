// BrowsePage - full catalog with search + chip filter + product grid.
import { useMemo, type FC } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Icon } from '@shared/atoms';
import { useProducts } from '@shared/store/ProductsContext';
import { useStorefrontTenant } from '../state/StorefrontTenantContext';
import { StorefrontProductCard } from '../components/StorefrontProductCard';
import { storeIdToSlug } from '@shared/lib/resolveTenant';
import cls from '../storefront.module.css';

export const BrowsePage: FC = () => {
  const tenant = useStorefrontTenant();
  const { allProducts } = useProducts();
  const slug = storeIdToSlug(tenant.id);
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const category = params.get('category') ?? '';

  const tenantProducts = useMemo(
    () => allProducts.filter((p) => p.storeId === tenant.id && p.active),
    [allProducts, tenant.id],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tenantProducts.filter((p) => {
      if (category && p.category !== category) return false;
      if (q && !p.name.toLowerCase().includes(q) && !p.sku.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [tenantProducts, query, category]);

  const stockedCategories = useMemo(
    () => [...new Set(tenantProducts.map((p) => p.category))].sort(),
    [tenantProducts],
  );

  const setCategory = (c: string) => {
    const next = new URLSearchParams(params);
    if (c) next.set('category', c); else next.delete('category');
    setParams(next);
  };

  return (
    <>
      <Link to={`/shop/${slug}`} className={cls.pageBackLink}>
        <Icon name="arrow" size={14} flipX /> Back to home
      </Link>

      <div className={cls.sectionHead}>
        <div>
          <h1 className={cls.sectionHead__title}>
            {query ? `Results for "${query}"` : category || 'All products'}
          </h1>
          <div className={cls.sectionHead__sub}>
            {filtered.length} {filtered.length === 1 ? 'item' : 'items'}
          </div>
        </div>
      </div>

      {/* Category chip row */}
      <div className={cls.chipRow}>
        <button
          type="button"
          className={`${cls.chip} ${!category ? cls['chip--active'] : ''}`}
          onClick={() => setCategory('')}
        >
          All
        </button>
        {stockedCategories.map((c) => (
          <button
            key={c}
            type="button"
            className={`${cls.chip} ${category === c ? cls['chip--active'] : ''}`}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className={cls.emptyState}>
          <div className={cls.emptyState__illustration}>
            <Icon name="search" size={40} />
          </div>
          <div className={cls.emptyState__title}>No matches</div>
          <div className={cls.emptyState__body}>
            Try a different search or clear the filter.
          </div>
          {(query || category) && (
            <button
              type="button"
              className={cls.hero__cta}
              onClick={() => setParams(new URLSearchParams())}
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className={cls.productGrid}>
          {filtered.map((p) => <StorefrontProductCard key={p.id} product={p} />)}
        </div>
      )}
    </>
  );
};
