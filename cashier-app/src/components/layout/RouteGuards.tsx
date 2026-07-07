/**
 * Route guards.
 * - ProtectedRoute: redirects to /login if not signed in.
 * - AdminRoute:     ProtectedRoute + must be admin, else shows "forbidden" card.
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
  if (!isAdmin) return <ForbiddenCard />;
  return <Outlet />;
};

const ForbiddenCard: FC = () => (
  <div className={cls.accessCard}>
    <Icon name="lock" size={40} style={{ color: 'var(--wm-danger)' }} />
    <Text as="h2" size="xl" weight="bold">{STRINGS.errors.forbidden}</Text>
    <Text tone="subtle" center>Only admins can view this page.</Text>
    <Button variant="secondary" leadingIcon="arrow" onClick={() => window.history.back()}>
      {STRINGS.common.back}
    </Button>
  </div>
);
