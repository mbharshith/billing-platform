// CounterShell — top-level layout for the counter sub-app.
// Header, nav, tenant badge, user menu; all counter pages render via <Outlet />.

// Header composition (left → right):
//   Brand · TenantBadge · Nav (role-scoped) · ThemeToggle · UserMenu

// The TenantBadge is the SaaS "workspace name" (like Jira's site name).
// It's read-only for cashiers; admins can click to jump to /store.
import { useEffect, useRef, useState, type FC, type ReactNode } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import cls from './layout.module.css';
import { Icon, Text } from '@shared/atoms';
import { ToastStack } from '@shared/feedback';
import { STRINGS } from '@shared/domain/strings';
import { monogramFor } from '@shared/domain/format';
import { useAuth } from '@shared/store/AuthContext';
import { useStores } from '@shared/store/StoresContext';
import { useToast } from '@shared/store/ToastContext';
import { useTheme } from '@shared/lib/theme';

/* -------------------------------------------------------------------------- */
/* NavItem — react-router NavLink with active class                           */
/* -------------------------------------------------------------------------- */
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

/* -------------------------------------------------------------------------- */
/* ThemeToggle                                                                */
/* -------------------------------------------------------------------------- */
const ThemeToggle: FC = () => {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={toggle}
      className={cls.themeToggle}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Light mode' : 'Dark mode'}
    >
      <Icon name={isDark ? 'sun' : 'moon'} size={18} />
    </button>
  );
};

/* -------------------------------------------------------------------------- */
/* TenantBadge — shows the current tenant name in the header.                 */
/* Admins can click to jump straight to /store; cashiers see it read-only.   */
/* -------------------------------------------------------------------------- */
const TenantBadge: FC = () => {
  const { currentStoreId, isAdmin } = useAuth();
  const { byId } = useStores();
  const navigate = useNavigate();
  const store = byId(currentStoreId);
  if (!store) return null;

  // Full store name goes on `title` so long tenant names still resolve on
  // hover even when the visible label ellipsises.
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
      onClick={() => navigate('/store')}
      title={tooltip}
      aria-label={tooltip}
    >
      {content}
    </button>
  );
};

/* -------------------------------------------------------------------------- */
/* UserMenu                                                                   */
/* -------------------------------------------------------------------------- */
const UserMenu: FC = () => {
  const { currentUser, isAdmin, logout } = useAuth();
  const { byId: storeById } = useStores();
  const toast = useToast();
  const navigate = useNavigate();
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
                      onClick={() => go('/store')}>
                <Icon name="store" size={16} /> My store
              </button>
              <button type="button" role="menuitem" className={cls.userDropdown__item}
                      onClick={() => go('/users')}>
                <Icon name="user" size={16} /> {STRINGS.nav.users}
              </button>
              <button type="button" role="menuitem" className={cls.userDropdown__item}
                      onClick={() => go('/settings')}>
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

/* -------------------------------------------------------------------------- */
/* Header                                                                     */
/* -------------------------------------------------------------------------- */
const Header: FC = () => {
  const { isAdmin, can } = useAuth();
  return (
    <header className={cls.header} role="banner">
      <div className={cls.header__inner}>
        <NavLink to="/cashier" className={cls.brand}>
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
          <NavItem to="/cashier"   icon="store"   label={STRINGS.nav.cashier}>{STRINGS.nav.cashier}</NavItem>
          {isAdmin && (
            <NavItem to="/dashboard" icon="chart" label={STRINGS.nav.dashboard}>{STRINGS.nav.dashboard}</NavItem>
          )}
          {(can('sale:viewAllTime') || can('sale:viewToday')) && (
            <NavItem to="/sales"     icon="receipt" label={STRINGS.nav.sales}>{STRINGS.nav.sales}</NavItem>
          )}
          <NavItem to="/customers" icon="user"    label={STRINGS.nav.customers}>{STRINGS.nav.customers}</NavItem>
          {isAdmin && (
            <NavItem to="/products" icon="bag"    label={STRINGS.nav.products}>{STRINGS.nav.products}</NavItem>
          )}
        </nav>

        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
};

/* -------------------------------------------------------------------------- */
/* PageHeader                                                                 */
/* -------------------------------------------------------------------------- */
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}
export const PageHeader: FC<PageHeaderProps> = ({ title, subtitle, actions }) => (
  <div className={cls.pageHeader}>
    <div className={cls.pageHeader__intro}>
      <Text as="h1" size="2xl" weight="heavy">{title}</Text>
      {subtitle && <Text tone="subtle">{subtitle}</Text>}
    </div>
    {actions && <div className={cls.pageHeader__actions}>{actions}</div>}
  </div>
);

/* -------------------------------------------------------------------------- */
/* BottomNav — mobile-only sticky tab bar (POS-native pattern)                */
/* Hidden above 768px via CSS. Mirrors the top nav's role-scoped items so     */
/* thumb-reachable navigation works on phones, which is the ergonomic sweet   */
/* spot for handheld POS use.                                                 */
/* -------------------------------------------------------------------------- */
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
  const { isAdmin, can } = useAuth();
  return (
    <nav className={cls.bottomNav} aria-label={STRINGS.ariaLabels.navigate}>
      <BottomNavItem to="/cashier"   icon="store"   label={STRINGS.nav.cashier}>{STRINGS.nav.cashier}</BottomNavItem>
      {isAdmin && (
        <BottomNavItem to="/dashboard" icon="chart" label={STRINGS.nav.dashboard}>{STRINGS.nav.dashboard}</BottomNavItem>
      )}
      {(can('sale:viewAllTime') || can('sale:viewToday')) && (
        <BottomNavItem to="/sales"    icon="receipt" label={STRINGS.nav.sales}>{STRINGS.nav.sales}</BottomNavItem>
      )}
      <BottomNavItem to="/customers" icon="user"    label={STRINGS.nav.customers}>{STRINGS.nav.customers}</BottomNavItem>
      {isAdmin && (
        <BottomNavItem to="/products" icon="bag"    label={STRINGS.nav.products}>{STRINGS.nav.products}</BottomNavItem>
      )}
    </nav>
  );
};

/* -------------------------------------------------------------------------- */
/* CounterShell                                                               */
/* -------------------------------------------------------------------------- */
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
