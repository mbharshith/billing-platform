// CounterShell — top-level layout: Header, nav, TenantBadge, and UserMenu. Renders pages via <Outlet />.
import { useEffect, useRef, useState, type FC, type ReactNode } from 'react';
import { NavLink, Outlet, useNavigate, useParams } from 'react-router-dom';
import cls from './layout.module.css';
import { Icon, Text, ThemeToggle } from '@billing/ui/atoms';
import { ToastStack } from '@billing/ui/feedback';
import { STRINGS } from '@billing/shared/domain/strings';
import { monogramFor } from '@billing/shared/domain/format';
import { useAuth } from '@billing/shared/store/AuthContext';
import { useStores } from '@billing/shared/store/StoresContext';
import { useToast } from '@billing/shared/store/ToastContext';
import { storeIdToSlug } from '@billing/shared/lib/resolveTenant';

// NavItem — react-router NavLink with active class
interface NavItemProps { to: string; icon: Parameters<typeof Icon>[0]['name']; children: ReactNode; label: string }
const NavItem: FC<NavItemProps> = ({ to, icon, children, label }) => (
  <NavLink
    to={to}
    className={({ isActive }) => [cls.navLink, isActive && cls['navLink--active']].filter(Boolean).join(' ')}
    title={label}
    aria-label={label}
  >
    <Icon name={icon} size={16} />
    <span className={cls.navLink__label}>{children}</span>
  </NavLink>
);

// TenantBadge — shows the tenant name; admins can click to jump to /store.
const TenantBadge: FC = () => {
  const { currentStoreId, isAdmin } = useAuth();
  const { byId } = useStores();
  const navigate = useNavigate();
  const store = byId(currentStoreId);
  if (!store) return null;

  // Full store name in tooltip for long tenant names.
  const tooltip = isAdmin ? `${store.name} — manage your tenant` : store.name;

  const content = (
    <>
      <Icon name="store" size={14} />
      <span className={cls.tenantBadge__name}>{store.name}</span>
      {isAdmin && <Icon name="arrow" size={12} />}
    </>
  );

  if (!isAdmin) {
    return (
      <div
        className={cls.tenantBadge}
        aria-label={`Tenant: ${store.name}`}
        title={tooltip}
      >
        {content}
      </div>
    );
  }
  return (
    <button
      type="button"
      className={[cls.tenantBadge, cls['tenantBadge--interactive']].join(' ')}
      onClick={() => navigate(`/${storeIdToSlug(store.id)}/admin/store`)}
      title={tooltip}
      aria-label={tooltip}
    >
      {content}
    </button>
  );
};

// UserMenu - exported so AdminShellRoute can reuse it in the sidebar topbar.
export const UserMenu: FC = () => {
  const { currentUser, isAdmin, logout } = useAuth();
  const { byId: storeById } = useStores();
  const toast = useToast();
  const navigate = useNavigate();
  // Tenant slug for building absolute nav targets.
  const { slug = '' } = useParams<{ slug: string }>();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  if (!currentUser) return null;

  const handleLogout = () => {
    logout();
    toast.info(STRINGS.auth.loggedOut);
    navigate('/login', { replace: true });
  };

  const go = (path: string) => { setOpen(false); navigate(path); };
  const myStore = storeById(currentUser.storeId);

  return (
    <div className={cls.userMenu} ref={ref}>
      <button
        type="button"
        className={cls.userTrigger}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={STRINGS.ariaLabels.userMenu}
      >
        <span className={cls.userAvatar} aria-hidden="true">
          {monogramFor(currentUser.name)}
        </span>
        <span className={cls.userName}>{currentUser.name}</span>
        <Icon name="arrow" size={12} />
      </button>

      {open && (
        <div className={cls.userDropdown} role="menu">
          <div className={cls.userDropdown__header}>
            <Text weight="semibold" size="sm">{currentUser.name}</Text>
            <Text size="xs" tone="subtle" upper>{currentUser.role}</Text>
            {myStore && <Text size="xs" tone="primary">{myStore.name}</Text>}
          </div>
          {isAdmin && (
            <>
              <button type="button" role="menuitem" className={cls.userDropdown__item}
                      onClick={() => go(`/${slug}/admin/store`)}>
                <Icon name="store" size={16} /> {STRINGS.nav.myStore}
              </button>
              <button type="button" role="menuitem" className={cls.userDropdown__item}
                      onClick={() => go(`/${slug}/admin/users`)}>
                <Icon name="user" size={16} /> {STRINGS.nav.users}
              </button>
              <button type="button" role="menuitem" className={cls.userDropdown__item}
                      onClick={() => go(`/${slug}/admin/settings`)}>
                <Icon name="shield" size={16} /> {STRINGS.nav.settings}
              </button>
              <hr className={cls.userDropdown__divider} />
            </>
          )}
          <button
            type="button" role="menuitem"
            className={[cls.userDropdown__item, cls['userDropdown__item--danger']].join(' ')}
            onClick={handleLogout}
          >
            <Icon name="close" size={16} /> {STRINGS.nav.logout}
          </button>
        </div>
      )}
    </div>
  );
};

// Header
const Header: FC = () => {
  const { slug = '' } = useParams<{ slug: string }>();
  const { isAdmin, can } = useAuth();
  return (
    <header className={cls.header} role="banner">
      <div className={cls.header__inner}>
        <NavLink to={`/${slug}/cashier`} className={cls.brand}>
          <span className={cls.brand__mark} aria-hidden="true">
            <Icon name="spark" size={22} />
          </span>
          <div className={cls.brand__text}>
            <Text as="span" size="lg" weight="heavy">{STRINGS.brand.name}</Text>
            <Text as="span" size="xs" weight="semibold" tone="primary" upper>{STRINGS.brand.productLabel}</Text>
          </div>
        </NavLink>

        <div className={cls.brandSeparator} aria-hidden="true" />

        <TenantBadge />

        <nav className={cls.nav} aria-label={STRINGS.ariaLabels.navigate}>
          <NavItem to={`/${slug}/cashier`}   icon="store"   label={STRINGS.nav.cashier}>{STRINGS.nav.cashier}</NavItem>
          {isAdmin && (
            <NavItem to={`/${slug}/admin`} icon="chart" label={STRINGS.nav.dashboard}>{STRINGS.nav.dashboard}</NavItem>
          )}
          {(can('sale:viewAllTime') || can('sale:viewToday')) && (
            <NavItem to={`/${slug}/cashier/sales`}     icon="receipt" label={STRINGS.nav.sales}>{STRINGS.nav.sales}</NavItem>
          )}
          <NavItem to={`/${slug}/cashier/customers`} icon="user"    label={STRINGS.nav.customers}>{STRINGS.nav.customers}</NavItem>
          {isAdmin && (
            <NavItem to={`/${slug}/admin/products`} icon="bag"    label={STRINGS.nav.products}>{STRINGS.nav.products}</NavItem>
          )}
        </nav>

        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
};

// PageHeader
interface BreadcrumbItem { label: string; href?: string }
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  breadcrumbs?: readonly BreadcrumbItem[];
}
export const PageHeader: FC<PageHeaderProps> = ({ title, subtitle, actions, breadcrumbs }) => (
  <div className={cls.pageHeader}>
    <div className={cls.pageHeader__intro}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className={cls.breadcrumb} aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.label} className={cls.breadcrumb__item}>
              {i > 0 && <span className={cls.breadcrumb__sep} aria-hidden="true">/</span>}
              {crumb.href
                ? <NavLink to={crumb.href} className={cls.breadcrumb__link}>{crumb.label}</NavLink>
                : <span className={cls.breadcrumb__current} aria-current="page">{crumb.label}</span>}
            </span>
          ))}
        </nav>
      )}
      <Text as="h1" size="2xl" weight="heavy">{title}</Text>
      {subtitle && <Text tone="subtle">{subtitle}</Text>}
    </div>
    {actions && <div className={cls.pageHeader__actions}>{actions}</div>}
  </div>
);

// BottomNav — mobile-only sticky tab bar; mirrors top nav for handheld POS.
const BottomNavItem: FC<NavItemProps> = ({ to, icon, children, label }) => (
  <NavLink
    to={to}
    className={({ isActive }) => [cls.bottomNav__item, isActive && cls['bottomNav__item--active']].filter(Boolean).join(' ')}
    aria-label={label}
  >
    <Icon name={icon} size={22} />
    <span className={cls.bottomNav__label}>{children}</span>
  </NavLink>
);

const BottomNav: FC = () => {
  const { slug = '' } = useParams<{ slug: string }>();
  const { isAdmin, can } = useAuth();
  return (
    <nav className={cls.bottomNav} aria-label={STRINGS.ariaLabels.navigate}>
      <BottomNavItem to={`/${slug}/cashier`}   icon="store"   label={STRINGS.nav.cashier}>{STRINGS.nav.cashier}</BottomNavItem>
      {isAdmin && (
        <BottomNavItem to={`/${slug}/admin`} icon="chart" label={STRINGS.nav.dashboard}>{STRINGS.nav.dashboard}</BottomNavItem>
      )}
      {(can('sale:viewAllTime') || can('sale:viewToday')) && (
        <BottomNavItem to={`/${slug}/cashier/sales`}    icon="receipt" label={STRINGS.nav.sales}>{STRINGS.nav.sales}</BottomNavItem>
      )}
      <BottomNavItem to={`/${slug}/cashier/customers`} icon="user"    label={STRINGS.nav.customers}>{STRINGS.nav.customers}</BottomNavItem>
      {isAdmin && (
        <BottomNavItem to={`/${slug}/admin/products`} icon="bag"    label={STRINGS.nav.products}>{STRINGS.nav.products}</BottomNavItem>
      )}
    </nav>
  );
};

// CounterShell
export const CounterShell: FC = () => {
  useEffect(() => {
    document.title = STRINGS.brand.fullTitle;
  }, []);
  return (
    <div className={cls.appShell}>
      <Header />
      <main className={cls.appShell__main}>
        <Outlet />
      </main>
      <BottomNav />
      <ToastStack />
    </div>
  );
};
