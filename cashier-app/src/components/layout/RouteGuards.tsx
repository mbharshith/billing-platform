/**
 * Route guards.
 * - ProtectedRoute: redirects to /login if no session.
 * - AdminRoute:     admin role only (SoD for tenant-management actions).
 * - VendorRoute:    vendor role only (SaaS-owner-only control plane).
 */
import type { FC } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import cls from './layout.module.css';
import { Button, Icon, Text } from '../atoms';
import { STRINGS } from '../../domain/strings';
import { useAuth } from '../../store/AuthContext';

export const ProtectedRoute: FC = () => {
  const { currentUser } = useAuth();
  const location = useLocation();
  if (!currentUser) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
};

export const AdminRoute: FC = () => {
  const { currentUser, isAdmin } = useAuth();
  if (!currentUser) return <Navigate to="/login" replace />;
  if (!isAdmin) return <ForbiddenCard message="Only a store admin can view this page." />;
  return <Outlet />;
};

export const VendorRoute: FC = () => {
  const { currentUser, isVendor } = useAuth();
  if (!currentUser) return <Navigate to="/login" replace />;
  if (!isVendor) return <ForbiddenCard message="This control plane is for the SaaS vendor only." />;
  return <Outlet />;
};

const ForbiddenCard: FC<{ message: string }> = ({ message }) => (
  <div className={cls.accessCard}>
    <Icon name="lock" size={40} style={{ color: 'var(--app-danger)' }} />
    <Text as="h2" size="xl" weight="bold">{STRINGS.errors.forbidden}</Text>
    <Text tone="subtle" center>{message}</Text>
    <Button variant="secondary" leadingIcon="arrow" onClick={() => window.history.back()}>
      {STRINGS.common.back}
    </Button>
  </div>
);
