/**
 * Route guards.
 * - ProtectedRoute: redirects to /login if no session.
 * - MasterRoute:    master role only (SoD for tenant-management actions).
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

export const MasterRoute: FC = () => {
  const { currentUser, isMaster } = useAuth();
  if (!currentUser) return <Navigate to="/login" replace />;
  if (!isMaster) return <ForbiddenCard message="Only the store master can view this page." />;
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
