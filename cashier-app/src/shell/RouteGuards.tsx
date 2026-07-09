// Route guards — auth + role checks. Shell concern; sub-apps assume a valid session.
import type { FC } from 'react';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Button } from '@shared/atoms';
import { CenteredMessage } from '@shared/templates';
import { STRINGS } from '@shared/domain/strings';
import { useAuth } from '@shared/store/AuthContext';

export const ProtectedRoute: FC = () => {
  const { currentUser } = useAuth();
  const location = useLocation();
  if (!currentUser) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
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
  <CenteredMessage
    plain
    icon="lock"
    iconTone="danger"
    title={STRINGS.errors.forbidden}
    body={message}
    footer={
      <>
        <Button variant="secondary" leadingIcon="arrow" onClick={() => window.history.back()}>
          {STRINGS.common.back}
        </Button>
        <Link to="/">
          <Button variant="ghost">Go to home</Button>
        </Link>
      </>
    }
  />
);
