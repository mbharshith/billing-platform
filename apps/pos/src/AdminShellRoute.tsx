// AdminShellRoute - wraps AdminShell with the tenant slug from URL params.
// The outlet chip that used to live in the top bar is now the OutletPicker
// organism (packages/@billing/ui/src/organisms/outlet-picker.tsx), which
// reads active outlet + list directly from AuthContext + Dexie. Nothing to
// wire through here.
import { type FC } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AdminShell } from '@billing/ui/admin';
import { UserMenu } from './CounterShell';

export const AdminShellRoute: FC = () => {
  const { slug = '' } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  return (
    <AdminShell
      slug={slug}
      onQuickAdd={() => navigate(`/${slug}/cashier`)}
      topbar={<UserMenu />}
    />
  );
};
