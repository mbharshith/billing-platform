/**
 * AppShell — top-level layout with header, nav, tenant badge, user menu.
 * All pages render inside via <Outlet />.
 *
 * Header composition (left → right):
 *   Brand · TenantBadge · Nav (role-scoped) · ThemeToggle · UserMenu
 *
 * The TenantBadge is the SaaS "workspace name" (like Jira's site name).
 * It's read-only for cashiers; masters can click to jump to /store.
 */
import { useEffect, useRef, useState, type FC, type ReactNode } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import cls from './layout.module.css';
import { Icon, Text } from '../atoms';
import { ToastStack } from '../feedback';
import { STRINGS } from '../../domain/strings';
import { monogramFor } from '../../domain/format';
import { useAuth } from '../../store/AuthContext';
import { useStores } from '../../store/StoresContext';
import { useToast } from '../../store/ToastContext';
import { useTheme } from '../../lib/theme';

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
/* Masters can click to jump straight to /store; cashiers see it read-only.   */
/* -------------------------------------------------------------------------- */
const TenantBadge: FC = () => {
  const { currentStoreId, isMaster } = useAuth();
  const { byId } = useStores();
  const navigate = useNavigate();
  const store = byId(currentStoreId);
  if (!store) return null;

  // Full store name goes on `title` so long tenant names still resolve on
  // hover even when the visible label ellipsises.
  const tooltip = isMaster ? `${store.name} — manage your tenant` : store.name;

  const content = (
    <>
      <Icon name="store" size={14} />
      <span className={cls.tenantBadge__name}>{store.name}</span>
      {isMaster && <Icon name="arrow" size={12} />}
    </>
  );

  if (!isMaster) {
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
  const { currentUser, isMaster, logout } = useAuth();
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
          {isMaster && (
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
  const { isMaster, can } = useAuth();
  return (
    <header className={cls.header} role="banner">
      <div className={cls.header__inner}>
        <NavLink to="/cashier" className={cls.brand}>
          <span className={cls.brand__mark} aria-hidden="true">
            <Icon name="spark" size={22} />
          </span>
          <div className={cls.brand__text}>
            <Text as="span" size="lg" weight="heavy">{STRINGS.brand.name}</Text>
            <Text as="span" size="xs" weight="semibold" tone="primary" upper>Cashier POS</Text>
          </div>
        </NavLink>

        <div className={cls.brandSeparator} aria-hidden="true" />

        <TenantBadge />

        <nav className={cls.nav} aria-label={STRINGS.ariaLabels.navigate}>
          <NavItem to="/cashier"   icon="store"   label={STRINGS.nav.cashier}>{STRINGS.nav.cashier}</NavItem>
          {isMaster && (
            <NavItem to="/dashboard" icon="chart" label={STRINGS.nav.dashboard}>{STRINGS.nav.dashboard}</NavItem>
          )}
          {(can('sale:viewAllTime') || can('sale:viewToday')) && (
            <NavItem to="/sales"     icon="receipt" label={STRINGS.nav.sales}>{STRINGS.nav.sales}</NavItem>
          )}
          <NavItem to="/customers" icon="user"    label={STRINGS.nav.customers}>{STRINGS.nav.customers}</NavItem>
          {isMaster && (
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
/* AppShell                                                                   */
/* -------------------------------------------------------------------------- */
export const AppShell: FC = () => {
  useEffect(() => {
    document.title = `${STRINGS.brand.name} · Cashier POS`;
  }, []);
  return (
    <div className={cls.appShell}>
      <Header />
      <main className={cls.appShell__main}>
        <Outlet />
      </main>
      <ToastStack />
    </div>
  );
};
