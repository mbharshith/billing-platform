// AdminShellRoute - wraps AdminShell with the tenant slug + outlet name from URL params + AuthContext.
// Also computes a location tag (city / channel) for the top-bar outlet chip and
// wires the Quick-Add button to navigate to the cashier.
import { type FC } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AdminShell } from '@billing/ui/admin';
import { useAuth } from '@billing/shared/store/AuthContext';
import { useStores } from '@billing/shared/store/StoresContext';
import { UserMenu } from './CounterShell';

export const AdminShellRoute: FC = () => {
  const { slug = '' } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { currentStoreId } = useAuth();
  const { byId } = useStores();
  const outlet = byId(currentStoreId);

  // Cheap location chip: grab city from outlet address if present, else 'LIVE'.
  const parts = outlet?.address?.split(',') ?? [];
  const rawCity = parts.length >= 2 ? parts[parts.length - 2]?.trim() : undefined;
  const tag = rawCity ? rawCity.toUpperCase() : 'LIVE';

  return (
    <AdminShell
      slug={slug}
      outletName={outlet?.name ?? 'Admin console'}
      outletTag={tag}
      onQuickAdd={() => navigate(`/${slug}/cashier`)}
      topbar={<UserMenu />}
    />
  );
};
