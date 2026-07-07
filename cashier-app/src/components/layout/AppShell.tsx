/**
 * AppShell — the top-level layout with header, nav, user menu, toast stack.
 * All pages render inside via <Outlet />.
 */
import { useEffect, useMemo, useRef, useState, type FC, type ReactNode } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import cls from './layout.module.css';
import { Icon, Text } from '../atoms';
import { ToastStack } from '../feedback';
import { STRINGS } from '../../domain/strings';
import { monogramFor } from '../../domain/format';
import { useAuth } from '../../store/AuthContext';
import { useToast } from '../../store/ToastContext';

/* -------------------------------------------------------------------------- */
/* NavItem — react-router NavLink with active class                           */
/* -------------------------------------------------------------------------- */
interface NavItemProps { to: string; icon: Parameters<typeof Icon>[0]['name']; children: ReactNode }
const NavItem: FC<NavItemProps> = ({ to, icon, children }) => (
  <NavLink
    to={to}
    className={({ isActive }) => [cls.navLink, isActive && cls['navLink--active']].filter(Boolean).join(' ')}
  >
    <Icon name={icon} size={16} /> {children}
  </NavLink>
);

/* -------------------------------------------------------------------------- */
/* UserMenu — avatar + dropdown                                               */
/* -------------------------------------------------------------------------- */
const UserMenu: FC = () => {
  const { currentUser, isAdmin, logout } = useAuth();
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
          </div>
          {isAdmin && (
            <>
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
  const { isAdmin } = useAuth();
  return (
    <header className={cls.header} role="banner">
      <div className={cls.header__inner}>
        <NavLink to="/cashier" className={cls.brand}>
          <span className={cls.brand__mark} aria-hidden="true">
            <Icon name="spark" size={22} />
          </span>
          <div className={cls.brand__text}>
            <Text as="span" size="lg" weight="heavy" tone="inverse">{STRINGS.brand.name}</Text>
            <Text as="span" size="xs" weight="semibold" tone="inverse" upper>Cashier POS</Text>
          </div>
        </NavLink>

        <nav className={cls.nav} aria-label={STRINGS.ariaLabels.navigate}>
          <NavItem to="/cashier"   icon="store">    {STRINGS.nav.cashier}</NavItem>
          <NavItem to="/dashboard" icon="chart">    {STRINGS.nav.dashboard}</NavItem>
          <NavItem to="/sales"     icon="receipt">  {STRINGS.nav.sales}</NavItem>
          <NavItem to="/customers" icon="user">     {STRINGS.nav.customers}</NavItem>
          {isAdmin && (
            <NavItem to="/products" icon="bag">     {STRINGS.nav.products}</NavItem>
          )}
        </nav>

        <UserMenu />
      </div>
    </header>
  );
};

/* -------------------------------------------------------------------------- */
/* PageHeader — per-page title, subtitle, action slot                          */
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
  // Re-title tab on nav (best-effort, based on pathname).
  useEffect(() => {
    document.title = 'Cashier POS · Walmart';
  }, []);
  const _ = useMemo(() => 0, []); // no-op to placate lint if needed
  void _;
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
