// AdminShellRoute - wraps AdminShell with the tenant slug + outlet name
// pulled from URL params + AuthContext.
//
// This is the top-level layout element for /:slug/admin/*.  Handles the
// tenant lookup so the sidebar links generate correctly and the top-bar
// shows the outlet name.

import { type FC } from 'react';
import { useParams } from 'react-router-dom';
import { AdminShell } from '@billing/ui/admin';
import { useAuth } from '@billing/shared/store/AuthContext';
import { useStores } from '@billing/shared/store/StoresContext';
import { UserMenu } from './CounterShell';

export const AdminShellRoute: FC = () => {
  const { slug = '' } = useParams<{ slug: string }>();
  const { currentStoreId } = useAuth();
  const { byId } = useStores();
  const outlet = byId(currentStoreId);
  return (
    <AdminShell
      slug={slug}
      outletName={outlet?.name ?? 'Admin console'}
      topbar={<UserMenu />}
    />
  );
};
