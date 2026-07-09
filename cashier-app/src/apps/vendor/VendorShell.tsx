/**
 * VendorShell — dedicated layout for /vendor/*.
 *
 * Visually distinct from the tenant AppShell (purple gradient brand) so a
 * vendor never wonders "am I inside a tenant or above them?". Ships the
 * theme toggle (light/dark), logout, and pill-style tab nav.
 */
import { useEffect, useRef, type FC } from 'react';
import { NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom';
import cls from './vendor.module.css';
import { Icon, Text } from '@shared/atoms';
import { STRINGS } from '@shared/domain/strings';
import { VENDOR_SCOPE } from '@shared/domain/types';
import { useAuth } from '@shared/store/AuthContext';
import { useAudit } from '@shared/store/AuditContext';
import { useToast } from '@shared/store/ToastContext';
import { useTheme } from '@shared/lib/theme';

export const VendorShell: FC = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { log } = useAudit();
  const { theme, toggle } = useTheme();

  // Log vendor.login exactly once per session mount (idempotent per session).
  const loggedRef = useRef(false);
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'vendor' || loggedRef.current) return;
    loggedRef.current = true;
    void log({
      actorUsername: currentUser.username,
      action: 'vendor.login',
      targetStoreId: VENDOR_SCOPE,
    });
  }, [currentUser, log]);

  if (!currentUser) return <Navigate to="/login" replace />;

  const handleLogout = async () => {
    await log({
      actorUsername: currentUser.username,
      action: 'vendor.logout',
      targetStoreId: VENDOR_SCOPE,
    });
    logout();
    toast.info(STRINGS.auth.loggedOut);
    navigate('/login', { replace: true });
  };

  return (
    <div className={cls.shell}>
      <header className={cls.header}>
        <div className={cls.headerInner}>
          <div className={cls.brand}>
            <span className={cls.brandMark} aria-hidden="true">
              <Icon name="shield" size={22} />
            </span>
            <div className={cls.brandText}>
              <Text size="lg" weight="heavy">{STRINGS.brand.name}</Text>
              <span className={cls.brandBadge}>Vendor Console</span>
            </div>
          </div>

          <nav className={cls.nav} aria-label="Vendor navigation">
            <VNav to="/vendor/dashboard" icon="chart"  label="Overview" />
            <VNav to="/vendor/tenants"   icon="store"  label="Tenants" />
            <VNav to="/vendor/audit"     icon="shield" label="Audit log" />
          </nav>

          <div className={cls.headerRight}>
            <button
              type="button"
              className={cls.iconBtn}
              onClick={toggle}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
            </button>
            <button
              type="button"
              className={cls.userChip}
              onClick={handleLogout}
              aria-label="Log out"
              title="Log out"
            >
              <span className={cls.userAvatar}>
                {currentUser.name.slice(0, 2).toUpperCase()}
              </span>
              <span>{currentUser.name}</span>
              <Icon name="close" size={14} />
            </button>
          </div>
        </div>
      </header>

      <main className={cls.main}>
        <Outlet />
      </main>
    </div>
  );
};

const VNav: FC<{ to: string; icon: 'chart' | 'store' | 'shield'; label: string }> = ({
  to, icon, label,
}) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      [cls.navLink, isActive && cls.navLinkActive].filter(Boolean).join(' ')
    }
  >
    <Icon name={icon} size={15} />
    <span>{label}</span>
  </NavLink>
);
