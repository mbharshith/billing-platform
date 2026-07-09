// StorefrontShell - delivery-app style layout.
// - Thin gradient delivery bar showing ETA at the top
// - Sticky header with brand + search + track + cart
// - Injects per-tenant theme CSS variables at the root so every child
//   accent (buttons, chips, hero) matches the store's brand color
import { useState, type FC, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Icon, ThemeToggle } from '@shared/atoms';
import { useStorefrontTenant } from './state/StorefrontTenantContext';
import { useCart } from './state/CartContext';
import { getTenantTheme, themeVars } from './lib/tenantTheme';
import { storeIdToSlug } from '@shared/lib/resolveTenant';
import { StickyCartBar } from './components/StickyCartBar';
import { BRAND } from '@shared/brand';
import cls from './storefront.module.css';

// Pages where the header search bar makes no sense.
const HIDE_SEARCH_ON: readonly RegExp[] = [/\/checkout$/, /\/order\//];

export const StorefrontShell: FC<{ children: ReactNode }> = ({ children }) => {
  const tenant = useStorefrontTenant();
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const slug = storeIdToSlug(tenant.id);
  const home = `/shop/${slug}`;
  const theme = getTenantTheme(tenant.id);
  const monogram = tenant.name.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const showSearch = !HIDE_SEARCH_ON.some((re) => re.test(pathname));

  const [query, setQuery] = useState('');
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    navigate(`${home}/browse?q=${encodeURIComponent(q)}`);
  };

  return (
    <div className={cls.shell} style={themeVars(theme)}>
      <div className={cls.deliveryBar}>
        Complimentary delivery in <strong>{theme.deliveryEta}</strong> to {tenant.city}
      </div>

      <header className={cls.header}>
        <div className={cls.headerInner}>
          <Link to={home} className={cls.brand} aria-label={`${tenant.name} home`}>
            <span className={cls.brand__mark} aria-hidden="true">{monogram}</span>
            <div className={cls.brand__text}>
              <div className={cls.brand__name}>{tenant.name}</div>
              <div className={cls.brand__loc}>
                <Icon name="store" size={11} />
                {tenant.city} · <span className={cls.brand__locEta}>{theme.deliveryEtaShort}</span>
              </div>
            </div>
          </Link>

          {showSearch ? (
            <form className={cls.headerSearch} onSubmit={handleSubmit} role="search">
              <span className={cls.headerSearch__icon}><Icon name="search" size={16} /></span>
              <input
                className={cls.headerSearch__input}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search in ${tenant.name}…`}
                aria-label="Search products"
              />
            </form>
          ) : <div />}

          <nav className={cls.headerNav} aria-label="Storefront">
            <ThemeToggle />
            <Link to={`${home}/track`} className={cls.headerNav__btn} aria-label="Track your order">
              <Icon name="receipt" size={18} />
              <span className={cls.headerNav__btnLabel}>Track</span>
            </Link>
            <Link to={`${home}/cart`} className={cls.headerNav__btn} aria-label={`Cart (${itemCount})`}>
              <Icon name="cart" size={18} />
              <span className={cls.headerNav__btnLabel}>Cart</span>
              {itemCount > 0 && <span className={cls.cartBadge} aria-hidden="true">{itemCount}</span>}
            </Link>
          </nav>
        </div>
      </header>

      <main className={cls.main}>{children}</main>

      <footer className={cls.footer}>
        <div>{tenant.name} · {tenant.city} · {tenant.phone}</div>
        <div className={cls.footer__brand}>Powered by {BRAND.name}</div>
      </footer>

      <StickyCartBar />
    </div>
  );
};
