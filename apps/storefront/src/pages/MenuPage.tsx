// MenuPage - public shareable menu for a single outlet.
// URL:
//   /:slug/menu               -> primary outlet
//   /:slug/menu/:outletSlug   -> named outlet
//   ?order=1                  -> enables the cart / "add to bag" affordance
//
// Design notes:
//   * PUBLIC by design: no auth check, no login redirect. Anyone with the
//     link sees the menu (that's the whole point of "shareable").
//   * READ-ONLY by default: cart controls hidden unless ?order=1 is present.
//     Rationale: 90% of shares are "here's what we serve"; the remaining 10%
//     that want to accept orders opt in explicitly via a URL flag so the
//     restaurant chooses when it's ready for pre-orders.
//   * Groups items by category with a sticky category jump-list on top
//     (a la Zomato / Swiggy menu). Feels native on mobile.
//   * Sets a document.title so the tab shows something meaningful when
//     someone opens 8 menu links in different tabs.
//   * Sets Open Graph + Twitter card meta so pastes into WhatsApp /
//     Instagram DMs preview correctly. Meta lives inside a small helper
//     effect - not react-helmet - because we're not SSR-ing today, and
//     the client-side head mutation is enough for share crawlers that
//     do JS execution (WhatsApp, Slack, iMessage all do).

import { useEffect, useMemo, useState, type FC } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Icon } from '@billing/ui/atoms';
import { ShareMenuDialog } from '@billing/ui/organisms';
import { useProducts } from '@billing/shared/store/ProductsContext';
import { storeIdToSlug } from '@billing/shared/lib/resolveTenant';
import { resolveOutlet, outletSlug, listOutletsWithSlug } from '@billing/shared/lib/resolveOutlet';
import type { Product } from '@billing/shared/domain/types';
import type { Outlet } from '@billing/shared/domain/restaurant';
import { CenteredMessage } from '@billing/ui/templates';
import { AppSplash } from '@billing/ui/errors';
import { useStorefrontTenant } from '../state/StorefrontTenantContext';
import { useStorefrontMoney } from '../state/useStorefrontMoney';
import { useCart } from '../state/CartContext';
import { MenuOutletHeader } from '../components/MenuOutletHeader';
import { ProductArt } from '../components/ProductArt';
import cls from '../storefront.module.css';

// Helper: set/replace a meta tag by (attr, key).
const setMeta = (attr: 'name' | 'property', key: string, value: string): void => {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', value);
};

interface MenuItemRowProps {
  readonly product: Product;
  readonly orderMode: boolean;
}

const MenuItemRow: FC<MenuItemRowProps> = ({ product, orderMode }) => {
  const { money } = useStorefrontMoney();
  const { add, setQty, quantityOf } = useCart();
  const qty = quantityOf(product.id);
  const outOfStock = product.stock === 0;

  return (
    <article className={cls.menuItem}>
      <div className={cls.menuItem__body}>
        <div className={cls.menuItem__name}>
          {product.name}
          {outOfStock && <span className={cls.menuItem__oos}>Sold out</span>}
        </div>
        <div className={cls.menuItem__price}>{money(product.price)}</div>
        <div className={cls.menuItem__meta}>{product.category} - SKU {product.sku}</div>
      </div>

      <div className={cls.menuItem__art}>
        <ProductArt product={product} iconSize={72} />
      </div>

      {orderMode && (
        <div className={cls.menuItem__cta}>
          {qty === 0 ? (
            <button
              type="button"
              className={cls.menuItem__addBtn}
              disabled={outOfStock}
              onClick={() => add(product.id)}
              aria-label={`Add ${product.name}`}
            >
              {outOfStock ? 'Sold out' : 'Add'}
            </button>
          ) : (
            <div className={cls.menuItem__stepper}>
              <button type="button" onClick={() => setQty(product.id, qty - 1)} aria-label="Decrease">
                <Icon name="minus" size={12} />
              </button>
              <span>{qty}</span>
              <button
                type="button"
                disabled={qty >= product.stock}
                onClick={() => setQty(product.id, qty + 1)}
                aria-label="Increase"
              >
                <Icon name="plus" size={12} />
              </button>
            </div>
          )}
        </div>
      )}
    </article>
  );
};

export const MenuPage: FC = () => {
  const tenant = useStorefrontTenant();
  const { allProducts } = useProducts();
  const { outletSlug: outletSlugParam } = useParams<{ outletSlug?: string }>();
  const [params] = useSearchParams();
  const orderMode = params.get('order') === '1';
  const slug = storeIdToSlug(tenant.id);

  const [outletState, setOutletState] = useState<
    | { kind: 'loading' }
    | { kind: 'ready'; outlet: Outlet; siblings: readonly Outlet[] }
    | { kind: 'notFound' }
  >({ kind: 'loading' });
  const [showShare, setShowShare] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const outlet = await resolveOutlet(tenant, outletSlugParam);
      if (cancelled) return;
      if (!outlet) { setOutletState({ kind: 'notFound' }); return; }
      const withSlug = await listOutletsWithSlug(tenant);
      setOutletState({
        kind: 'ready',
        outlet,
        siblings: withSlug.map((x) => x.outlet),
      });
    })();
    return () => { cancelled = true; };
  }, [tenant, outletSlugParam]);

  // Products filtered to this outlet.
  const items = useMemo(() => {
    if (outletState.kind !== 'ready') return [] as readonly Product[];
    const outletId = outletState.outlet.id;
    return allProducts.filter(
      (p) => p.storeId === tenant.id
          && p.active
          && (p.outletId ?? tenant.id) === outletId,
    );
  }, [allProducts, tenant.id, outletState]);

  const byCategory = useMemo(() => {
    const groups = new Map<string, Product[]>();
    for (const p of items) {
      const list = groups.get(p.category) ?? [];
      list.push(p);
      groups.set(p.category, list);
    }
    return [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([category, ps]) => ({
        category,
        products: ps.sort((a, b) => a.name.localeCompare(b.name)),
      }));
  }, [items]);

  // Update document title + OG tags whenever the outlet resolves.
  useEffect(() => {
    if (outletState.kind !== 'ready') return;
    const o = outletState.outlet;
    const title = `${o.name} - Menu | ${tenant.name}`;
    const description = `Browse the ${o.name} menu (${o.city}). Fresh, tasty, and served hot.`;
    const shareUrl = `${window.location.origin}${window.location.pathname}`;
    document.title = title;
    setMeta('name', 'description', description);
    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:type', 'restaurant.menu');
    setMeta('property', 'og:url', shareUrl);
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', title);
    setMeta('name', 'twitter:description', description);
  }, [outletState, tenant.name]);

  if (outletState.kind === 'loading') {
    return <AppSplash state="loading" onRetry={() => window.location.reload()} />;
  }
  if (outletState.kind === 'notFound') {
    return (
      <CenteredMessage
        full
        icon="store"
        iconTone="muted"
        title="Outlet not found"
        body={`We couldn't find a "${outletSlugParam}" outlet at ${tenant.name}. Try the main menu?`}
        footer={
          <Link to={`/${slug}/menu`} className={cls.menuFooterCta__link}>
            <Icon name="store" size={14} /> Go to main menu
          </Link>
        }
      />
    );
  }

  const { outlet, siblings } = outletState;
  const shareUrl = `${window.location.origin}/${slug}/menu/${outletSlug(outlet, tenant)}`;

  return (
    <>
      <MenuOutletHeader
        tenant={tenant}
        outlet={outlet}
        siblings={siblings}
        orderMode={orderMode}
        onShare={() => setShowShare(true)}
      />

      {byCategory.length === 0 ? (
        <div className={cls.emptyState}>
          <div className={cls.emptyState__illustration}>
            <Icon name="store" size={40} />
          </div>
          <div className={cls.emptyState__title}>Menu coming soon</div>
          <div className={cls.emptyState__body}>
            This outlet hasn't published any items yet. Check back shortly.
          </div>
        </div>
      ) : (
        <>
          {/* Sticky category jump-list */}
          <nav className={cls.menuCategoryNav} aria-label="Menu categories">
            {byCategory.map(({ category }) => (
              <a key={category} href={`#cat-${category}`} className={cls.menuCategoryNav__chip}>
                {category}
              </a>
            ))}
          </nav>

          {byCategory.map(({ category, products }) => (
            <section key={category} id={`cat-${category}`} className={cls.menuSection}>
              <h2 className={cls.menuSection__title}>{category}</h2>
              <div className={cls.menuList}>
                {products.map((p) => (
                  <MenuItemRow key={p.id} product={p} orderMode={orderMode} />
                ))}
              </div>
            </section>
          ))}
        </>
      )}

      {!orderMode && (
        <div className={cls.menuFooterCta}>
          <Link to={`/${slug}/menu/${outletSlug(outlet, tenant)}?order=1`} className={cls.menuFooterCta__link}>
            <Icon name="cart" size={14} /> Order online
          </Link>
        </div>
      )}

      {showShare && (
        <ShareMenuDialog
          title={`Share ${outlet.name} menu`}
          subtitle="Anyone with the link can view this menu"
          url={shareUrl}
          whatsappMessage={`Check out our menu at ${outlet.name}:`}
          footerNote="Tip: add ?order=1 to the URL to let customers order directly."
          onClose={() => setShowShare(false)}
        />
      )}
    </>
  );
};
